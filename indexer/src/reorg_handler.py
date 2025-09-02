"""Blockchain reorganization detection and handling.

Handles chain reorganizations (reorgs) by detecting conflicts,
rolling back affected data, and re-indexing the canonical chain.
"""

import asyncio
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import json

import structlog
from sqlalchemy import select, delete, and_, text
from sqlalchemy.orm import sessionmaker

from src.config import settings
from src.database import db
from src.models import Block, Deployment, Transfer, ValidatorBond, BalanceState
from src.rust_cli_client import RustCLIClient
from src.event_system import event_bus, create_event, EventType, Priority
from src.resilience import db_executor

logger = structlog.get_logger(__name__)


@dataclass
class ReorgDetection:
    """Details of a detected reorganization."""
    fork_point: int  # Block number where chains diverge
    orphaned_blocks: List[str]  # Block hashes that are no longer canonical
    canonical_blocks: List[Dict]  # New canonical blocks
    affected_deployments: int
    affected_transfers: int
    depth: int  # Reorg depth
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        return {
            "fork_point": self.fork_point,
            "orphaned_blocks": self.orphaned_blocks,
            "canonical_blocks_count": len(self.canonical_blocks),
            "affected_deployments": self.affected_deployments,
            "affected_transfers": self.affected_transfers,
            "depth": self.depth,
            "timestamp": self.timestamp.isoformat()
        }


class ReorgHandler:
    """Handles blockchain reorganizations."""
    
    def __init__(self, client: RustCLIClient):
        self.client = client
        self.max_reorg_depth = getattr(settings, 'max_reorg_depth', 100)
        self.confirmation_depth = getattr(settings, 'confirmation_depth', 10)
        self.reorg_check_interval = getattr(settings, 'reorg_check_interval', 30)
        self.last_verified_block = 0
        
    async def start_monitoring(self):
        """Start continuous reorg monitoring."""
        logger.info(
            "Starting reorg monitoring",
            max_depth=self.max_reorg_depth,
            confirmation_depth=self.confirmation_depth,
            check_interval=self.reorg_check_interval
        )
        
        while True:
            try:
                await self.check_for_reorgs()
                await asyncio.sleep(self.reorg_check_interval)
            except Exception as e:
                logger.error("Reorg monitoring error", error=str(e))
                await asyncio.sleep(self.reorg_check_interval)
    
    async def check_for_reorgs(self) -> Optional[ReorgDetection]:
        """Check for reorganizations by comparing local and canonical chains."""
        try:
            # Get the latest indexed block
            latest_local = await db.get_last_indexed_block()
            
            if latest_local < self.confirmation_depth:
                return None
            
            # Check blocks within confirmation depth for consistency
            check_from = max(
                self.last_verified_block,
                latest_local - self.max_reorg_depth
            )
            check_to = latest_local - self.confirmation_depth
            
            if check_from >= check_to:
                return None
            
            logger.debug(
                "Checking for reorgs",
                check_from=check_from,
                check_to=check_to,
                latest_local=latest_local
            )
            
            # Get canonical chain from node
            canonical_blocks = await self.client.get_blocks_by_height(
                check_from, check_to
            )
            
            if not canonical_blocks:
                logger.warning("Could not fetch canonical blocks for reorg check")
                return None
            
            # Compare with local blocks
            reorg = await self._detect_reorg(canonical_blocks, check_from, check_to)
            
            if reorg:
                logger.warning(
                    "Blockchain reorganization detected",
                    fork_point=reorg.fork_point,
                    depth=reorg.depth,
                    orphaned_blocks=len(reorg.orphaned_blocks)
                )
                
                # Handle the reorg
                await self._handle_reorg(reorg)
                
                # Publish reorg event
                reorg_event = create_event(
                    EventType.REORG_DETECTED,
                    reorg.to_dict(),
                    Priority.CRITICAL
                )
                await event_bus.publish(reorg_event)
                
            else:
                # Update last verified block
                self.last_verified_block = check_to
                
            return reorg
            
        except Exception as e:
            logger.error("Failed to check for reorgs", error=str(e))
            return None
    
    async def _detect_reorg(
        self,
        canonical_blocks: List[Dict],
        start_block: int,
        end_block: int
    ) -> Optional[ReorgDetection]:
        """Detect reorg by comparing canonical chain with local data."""
        
        # Get local blocks in the range
        async with db.session() as session:
            result = await session.execute(
                select(Block.block_number, Block.block_hash, Block.parent_hash)
                .where(
                    and_(
                        Block.block_number >= start_block,
                        Block.block_number <= end_block
                    )
                )
                .order_by(Block.block_number)
            )
            local_blocks = {row.block_number: row for row in result}
        
        # Build canonical hash map
        canonical_hashes = {
            block["blockNumber"]: block["blockHash"]
            for block in canonical_blocks
        }
        
        # Find first mismatch
        fork_point = None
        orphaned_blocks = []
        
        for block_num in range(start_block, end_block + 1):
            local_block = local_blocks.get(block_num)
            canonical_hash = canonical_hashes.get(block_num)
            
            if not local_block or not canonical_hash:
                continue
                
            if local_block.block_hash != canonical_hash:
                fork_point = block_num
                break
        
        if fork_point is None:
            return None  # No reorg detected
        
        # Collect orphaned blocks from fork point onwards
        for block_num in range(fork_point, end_block + 1):
            local_block = local_blocks.get(block_num)
            if local_block:
                orphaned_blocks.append(local_block.block_hash)
        
        # Get canonical blocks from fork point
        canonical_from_fork = [
            block for block in canonical_blocks
            if block["blockNumber"] >= fork_point
        ]
        
        # Count affected data
        async with db.session() as session:
            # Count affected deployments
            deploy_result = await session.execute(
                select(Deployment.deploy_id).where(
                    Deployment.block_number >= fork_point
                )
            )
            affected_deployments = len(deploy_result.all())
            
            # Count affected transfers
            transfer_result = await session.execute(
                select(Transfer.id).where(
                    Transfer.block_number >= fork_point
                )
            )
            affected_transfers = len(transfer_result.all())
        
        return ReorgDetection(
            fork_point=fork_point,
            orphaned_blocks=orphaned_blocks,
            canonical_blocks=canonical_from_fork,
            affected_deployments=affected_deployments,
            affected_transfers=affected_transfers,
            depth=end_block - fork_point + 1,
            timestamp=datetime.utcnow()
        )
    
    async def _handle_reorg(self, reorg: ReorgDetection):
        """Handle a detected reorganization."""
        logger.info(
            "Handling blockchain reorganization",
            fork_point=reorg.fork_point,
            depth=reorg.depth
        )
        
        try:
            # Step 1: Rollback orphaned data
            await self._rollback_orphaned_data(reorg.fork_point)
            
            # Step 2: Re-index canonical blocks
            await self._reindex_canonical_blocks(reorg.canonical_blocks)
            
            # Step 3: Update indexer state
            await db.set_last_indexed_block(reorg.fork_point - 1)
            
            # Step 4: Record reorg in database
            await self._record_reorg(reorg)
            
            logger.info(
                "Reorganization handled successfully",
                fork_point=reorg.fork_point,
                blocks_reindexed=len(reorg.canonical_blocks)
            )
            
        except Exception as e:
            logger.error(
                "Failed to handle reorganization",
                fork_point=reorg.fork_point,
                error=str(e)
            )
            raise
    
    async def _rollback_orphaned_data(self, fork_point: int):
        """Rollback all data from the fork point onwards."""
        logger.info("Rolling back orphaned data", fork_point=fork_point)
        
        async with db.session() as session:
            # Delete in dependency order to avoid foreign key violations
            
            # 1. Delete balance states
            await session.execute(
                delete(BalanceState).where(
                    BalanceState.block_number >= fork_point
                )
            )
            
            # 2. Delete transfers
            await session.execute(
                delete(Transfer).where(
                    Transfer.block_number >= fork_point
                )
            )
            
            # 3. Delete deployments
            await session.execute(
                delete(Deployment).where(
                    Deployment.block_number >= fork_point
                )
            )
            
            # 4. Delete validator bonds
            await session.execute(
                delete(ValidatorBond).where(
                    ValidatorBond.block_number >= fork_point
                )
            )
            
            # 5. Delete block validators relationships
            await session.execute(
                text("""
                    DELETE FROM block_validators 
                    WHERE block_hash IN (
                        SELECT block_hash FROM blocks 
                        WHERE block_number >= :fork_point
                    )
                """),
                {"fork_point": fork_point}
            )
            
            # 6. Delete blocks
            await session.execute(
                delete(Block).where(
                    Block.block_number >= fork_point
                )
            )
            
            await session.commit()
            
        logger.info("Orphaned data rolled back successfully")
    
    async def _reindex_canonical_blocks(self, canonical_blocks: List[Dict]):
        """Re-index the canonical blocks."""
        if not canonical_blocks:
            return
            
        logger.info(
            "Re-indexing canonical blocks",
            count=len(canonical_blocks),
            start_block=canonical_blocks[0]["blockNumber"],
            end_block=canonical_blocks[-1]["blockNumber"]
        )
        
        # This would typically trigger the normal indexing process
        # For now, we'll just log that it needs to be done
        # The actual re-indexing will happen in the next sync cycle
        
        for block_summary in canonical_blocks:
            block_hash = block_summary.get("blockHash")
            if block_hash:
                # Get full block details and process
                try:
                    full_block = await self.client.get_block_details(block_hash)
                    if full_block:
                        # This would call the normal block processing logic
                        # await self.indexer._process_block(full_block)
                        logger.debug(
                            "Would re-index block",
                            block_number=block_summary["blockNumber"],
                            block_hash=block_hash[:16] + "..."
                        )
                except Exception as e:
                    logger.error(
                        "Failed to re-index block",
                        block_hash=block_hash,
                        error=str(e)
                    )
    
    async def _record_reorg(self, reorg: ReorgDetection):
        """Record the reorganization in the database for audit purposes."""
        async with db.session() as session:
            await session.execute(
                text("""
                    INSERT INTO reorgs (
                        fork_point, depth, orphaned_blocks, 
                        affected_deployments, affected_transfers,
                        detected_at, handled_at
                    ) VALUES (
                        :fork_point, :depth, :orphaned_blocks,
                        :affected_deployments, :affected_transfers,
                        :detected_at, :handled_at
                    )
                """),
                {
                    "fork_point": reorg.fork_point,
                    "depth": reorg.depth,
                    "orphaned_blocks": json.dumps(reorg.orphaned_blocks),
                    "affected_deployments": reorg.affected_deployments,
                    "affected_transfers": reorg.affected_transfers,
                    "detected_at": reorg.timestamp,
                    "handled_at": datetime.utcnow()
                }
            )
            await session.commit()
    
    async def get_reorg_history(self, limit: int = 10) -> List[Dict]:
        """Get recent reorganization history."""
        async with db.session() as session:
            result = await session.execute(
                text("""
                    SELECT * FROM reorgs 
                    ORDER BY detected_at DESC 
                    LIMIT :limit
                """),
                {"limit": limit}
            )
            
            return [dict(row) for row in result]
    
    async def validate_chain_integrity(
        self,
        start_block: int,
        end_block: int
    ) -> Dict[str, Any]:
        """Validate chain integrity in a given range."""
        logger.info(
            "Validating chain integrity",
            start_block=start_block,
            end_block=end_block
        )
        
        issues = []
        
        async with db.session() as session:
            # Check for missing blocks
            result = await session.execute(
                text("""
                    SELECT generate_series(:start_block, :end_block) as expected_block
                    EXCEPT
                    SELECT block_number FROM blocks 
                    WHERE block_number BETWEEN :start_block AND :end_block
                """),
                {"start_block": start_block, "end_block": end_block}
            )
            
            missing_blocks = [row.expected_block for row in result]
            if missing_blocks:
                issues.append({
                    "type": "missing_blocks",
                    "blocks": missing_blocks
                })
            
            # Check parent-child relationships
            result = await session.execute(
                text("""
                    SELECT b1.block_number, b1.block_hash, b1.parent_hash, b2.block_hash as parent_exists
                    FROM blocks b1
                    LEFT JOIN blocks b2 ON b1.parent_hash = b2.block_hash
                    WHERE b1.block_number BETWEEN :start_block AND :end_block
                    AND b1.block_number > 0
                    AND b2.block_hash IS NULL
                """),
                {"start_block": start_block, "end_block": end_block}
            )
            
            orphaned_refs = [dict(row) for row in result]
            if orphaned_refs:
                issues.append({
                    "type": "orphaned_parent_references",
                    "blocks": orphaned_refs
                })
        
        return {
            "start_block": start_block,
            "end_block": end_block,
            "valid": len(issues) == 0,
            "issues": issues,
            "checked_at": datetime.utcnow().isoformat()
        }

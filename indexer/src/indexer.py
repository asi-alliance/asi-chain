"""Core indexer logic for synchronizing blockchain data."""

import asyncio
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from decimal import Decimal

import structlog
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from src.config import settings
from src.database import db
from src.models import Block, Deployment, Transfer, Validator, ValidatorBond, IndexerState
from src.rchain_client import RChainClient

logger = structlog.get_logger(__name__)


class BlockIndexer:
    """Main indexer class for processing blockchain data."""
    
    # Pattern for extracting REV transfers from Rholang terms
    TRANSFER_PATTERNS = [
        # Standard transfer pattern
        r'@vault!\("transfer",\s*"([^"]+)",\s*(\d+),',
        # Match pattern (older style)
        r'match\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\)',
        # Transfer with different formatting
        r'transfer.*?"([^"]+)".*?(\d{8,})',
    ]
    
    
    @staticmethod
    def classify_deployment(term: str) -> str:
        """Classify deployment type based on Rholang term content."""
        if 'RevVault' in term and 'transfer' in term:
            return 'rev_transfer'
        elif 'validator' in term or 'bond' in term:
            return 'validator_operation'
        elif 'finalizer' in term:
            return 'finalizer_contract'
        elif 'registry' in term and 'lookup' in term:
            return 'registry_lookup'
        elif 'auction' in term:
            return 'auction_contract'
        else:
            return 'smart_contract'
    
    def __init__(self):
        self.client = None
        self.running = False
        
    async def start(self):
        """Start the indexer."""
        self.running = True
        logger.info("Starting blockchain indexer", node_url=settings.node_url)
        
        # Initialize database
        await db.connect()
        await db.create_tables()
        
        # Start indexing loop
        async with RChainClient() as client:
            self.client = client
            
            # Check node health
            if not await self.client.health_check():
                logger.error("RChain node is not healthy")
                raise RuntimeError("Cannot connect to RChain node")
            
            # Run sync loop
            while self.running:
                try:
                    await self._sync_blocks()
                except Exception as e:
                    logger.error("Sync cycle failed", error=str(e))
                
                await asyncio.sleep(settings.sync_interval)
    
    async def stop(self):
        """Stop the indexer."""
        logger.info("Stopping blockchain indexer")
        self.running = False
        await db.disconnect()
    
    async def _sync_blocks(self):
        """Sync blocks from the chain."""
        try:
            # Get last indexed block
            last_indexed = await db.get_last_indexed_block()
            
            # Get current chain height
            latest_block_number = await self.client.get_latest_block_number()
            if not latest_block_number:
                logger.warning("Could not get latest block number")
                return
            
            if last_indexed >= latest_block_number:
                logger.debug("Already up to date", last_indexed=last_indexed, latest=latest_block_number)
                return
            
            # Calculate batch range
            start = last_indexed + 1
            end = min(start + settings.batch_size - 1, latest_block_number)
            
            logger.info(
                "Syncing blocks",
                start=start,
                end=end,
                behind=latest_block_number - last_indexed
            )
            
            # Fetch and process blocks
            blocks = await self.client.get_blocks_range(start, end)
            
            if not blocks:
                logger.warning("No blocks returned for range", start=start, end=end)
                return
            
            logger.info(f"Processing {len(blocks)} blocks from range {start}-{end}")
            
            processed_count = 0
            for i, block_summary in enumerate(blocks):
                try:
                    await self._process_block(block_summary)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Failed to process block {i}", error=str(e), block=block_summary)
            
            # Update last indexed block
            if processed_count > 0 and blocks:
                # Find the last successfully processed block
                last_processed_block = None
                for block in reversed(blocks[:processed_count]):
                    if "blockNumber" in block:
                        last_processed_block = block
                        break
                
                if last_processed_block:
                    await db.set_last_indexed_block(last_processed_block["blockNumber"])
                    logger.info("Sync cycle complete", last_block=last_processed_block["blockNumber"], processed=processed_count)
                else:
                    logger.error("No valid blocks found to update last indexed")
                    
        except Exception as e:
            logger.error(f"Sync cycle error: {e}", exc_info=True)
    
    async def _process_block(self, block_summary: Dict):
        """Process a single block."""
        try:
            block_hash = block_summary["blockHash"]
            block_number = block_summary["blockNumber"]
        except KeyError as e:
            logger.error(f"Missing required field in block summary: {e}", block_summary=block_summary)
            return
        
        # Check if already processed
        async with db.session() as session:
            exists = await session.scalar(
                select(Block).where(Block.block_hash == block_hash).limit(1)
            )
            if exists:
                logger.debug("Block already indexed", block_number=block_number)
                return
        
        # Get full block details
        try:
            response = await self.client.get_block(block_hash)
            # The API returns {blockInfo: {...}, deploys: [...]}
            block_data = response.get("blockInfo", {})
            deployments = response.get("deploys", [])
        except Exception as e:
            logger.error(
                "Failed to get block details",
                block_number=block_number,
                block_hash=block_hash,
                error=str(e)
            )
            return
        
        # Process block in transaction
        async with db.session() as session:
            # Extract additional block data
            parent_hash = block_data["parentsHashList"][0] if block_data.get("parentsHashList") else ""
            state_root_hash = block_data.get("postStateHash", "")
            bonds_map = block_data.get("bonds", [])
            
            # Insert block with new fields
            block = Block(
                block_number=block_data["blockNumber"],
                block_hash=block_data["blockHash"],
                parent_hash=parent_hash,
                timestamp=block_data["timestamp"],
                proposer=block_data["sender"],
                state_hash=state_root_hash,
                state_root_hash=state_root_hash,  # New field
                finalization_status="finalized",  # All blocks from API are finalized
                bonds_map=bonds_map,  # Store as JSONB
                seq_num=block_data.get("seqNum"),
                sig=block_data.get("sig"),
                sig_algorithm=block_data.get("sigAlgorithm"),
                shard_id=block_data.get("shardId"),
                extra_bytes=block_data.get("extraBytes"),
                version=block_data.get("version"),
                deployment_count=len(block_data.get("deploys", []))
            )
            session.add(block)
            
            # Process validators
            await self._process_validators(session, block_data)
            
            # Process deployments (already extracted above)
            for deploy_data in deployments:
                await self._process_deployment(session, block_data, deploy_data)
            
            await session.commit()
            
            # Process block validators from justifications AFTER commit
            justifications = block_data.get("justifications", [])
            if justifications:
                async with db.session() as validator_session:
                    for justification in justifications:
                        validator_key = justification.get("validator", "")
                        if validator_key:
                            # Add to block_validators table
                            await validator_session.execute(
                                text("""
                                    INSERT INTO block_validators (block_hash, validator_public_key)
                                    VALUES (:block_hash, :validator_key)
                                    ON CONFLICT DO NOTHING
                                """),
                                {"block_hash": block_data["blockHash"], "validator_key": validator_key}
                            )
                    await validator_session.commit()
            
        logger.info(
            "Indexed block",
            block_number=block_number,
            deployments=len(deployments),
            timestamp=datetime.fromtimestamp(block_data["timestamp"] / 1000)
        )
    
    async def _process_validators(self, session, block_data: Dict):
        """Process validator bonds for a block."""
        bonds = block_data.get("bonds", [])
        
        for bond_data in bonds:
            validator_key = bond_data["validator"]
            stake = bond_data["stake"]
            
            # Upsert validator
            stmt = insert(Validator).values(
                public_key=validator_key,
                name=validator_key,  # Use public key as name
                total_stake=stake,
                first_seen_block=block_data["blockNumber"],
                last_seen_block=block_data["blockNumber"]
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["public_key"],
                set_={
                    "total_stake": stake,
                    "last_seen_block": block_data["blockNumber"],
                    "updated_at": datetime.utcnow()
                }
            )
            await session.execute(stmt)
            
            # Add validator bond
            bond = ValidatorBond(
                block_hash=block_data["blockHash"],
                block_number=block_data["blockNumber"],
                validator_public_key=validator_key,
                stake=stake
            )
            session.add(bond)
    
    async def _process_deployment(self, session, block_data: Dict, deploy_data: Dict):
        """Process a single deployment."""
        # Classify deployment type
        term = deploy_data.get("term", "")
        deployment_type = self.classify_deployment(term)
        
        # Create deployment record
        # Check for error message and set errored flag appropriately
        error_message = deploy_data.get("systemDeployError")
        errored = deploy_data.get("errored", False) or bool(error_message)
        
        deployment = Deployment(
            deploy_id=deploy_data["sig"],
            block_hash=block_data["blockHash"],
            block_number=block_data["blockNumber"],
            deployer=deploy_data["deployer"],
            term=term,
            timestamp=deploy_data.get("timestamp", block_data["timestamp"]),
            sig=deploy_data["sig"],
            sig_algorithm=deploy_data.get("sigAlgorithm", "secp256k1"),
            phlo_price=deploy_data.get("phloPrice", 1),
            phlo_limit=deploy_data.get("phloLimit", 1000000),
            phlo_cost=deploy_data.get("cost", 0),
            valid_after_block_number=deploy_data.get("validAfterBlockNumber"),
            errored=errored,
            error_message=error_message,
            deployment_type=deployment_type  # New field
        )
        session.add(deployment)
        
        # Extract REV transfers if enabled
        if settings.enable_rev_transfer_extraction:
            transfers = self._extract_transfers(deploy_data, block_data["blockNumber"])
            for transfer in transfers:
                session.add(transfer)
    
    def _extract_transfers(self, deploy_data: Dict, block_number: int) -> List[Transfer]:
        """Extract REV transfers from deployment term."""
        transfers = []
        term = deploy_data.get("term", "")
        
        # Check if term contains RevVault operations
        if "RevVault" not in term and "transfer" not in term:
            return transfers
        
        # Try each pattern
        for pattern in self.TRANSFER_PATTERNS:
            matches = re.findall(pattern, term)
            
            for match in matches:
                try:
                    if len(match) == 2:
                        # Pattern with just recipient and amount
                        to_address, amount_str = match
                        from_address = deploy_data["deployer"]  # Assume deployer is sender
                    elif len(match) == 3:
                        # Pattern with sender, recipient, and amount
                        from_address, to_address, amount_str = match
                    else:
                        continue
                    
                    # Parse amount
                    amount_dust = int(amount_str)
                    if amount_dust <= 0:
                        continue
                    
                    amount_rev = Decimal(amount_dust) / Decimal(100_000_000)
                    
                    # Create transfer record
                    transfer = Transfer(
                        deploy_id=deploy_data["sig"],
                        block_number=block_number,
                        from_address=from_address,
                        to_address=to_address,
                        amount_dust=amount_dust,
                        amount_rev=amount_rev,
                        status="success" if not deploy_data.get("errored") else "failed"
                    )
                    transfers.append(transfer)
                    
                    logger.debug(
                        "Found REV transfer",
                        from_address=from_address[:20],
                        to_address=to_address[:20],
                        amount_rev=float(amount_rev)
                    )
                    
                except (ValueError, IndexError) as e:
                    logger.warning(
                        "Failed to parse transfer",
                        pattern=pattern,
                        match=match,
                        error=str(e)
                    )
        
        return transfers
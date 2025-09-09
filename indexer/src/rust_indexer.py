"""Enhanced indexer using Rust CLI for comprehensive blockchain synchronization."""

import asyncio
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from decimal import Decimal

import structlog
from sqlalchemy import select, text, and_
from sqlalchemy.dialects.postgresql import insert

from src.config import settings
from src.database import db
from src.models import (
    Block, Deployment, Transfer, Validator, ValidatorBond, 
    IndexerState, EpochTransition, NetworkStats, BalanceState
)
from src.rust_cli_client import RustCLIClient

logger = structlog.get_logger(__name__)


class RustBlockIndexer:
    """Enhanced indexer using Rust CLI for full blockchain data extraction."""
    
    # Pattern for extracting REV transfers from Rholang terms
    TRANSFER_PATTERNS = [
        # Standard RevVault transfer pattern with literal address: @vault!("transfer", "address", amount,
        r'@vault!\s*\(\s*"transfer"\s*,\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*(\d+)\s*,',
        # Variable-based transfer pattern: @vault!("transfer", recipient, amount,
        r'@vault!\s*\(\s*"transfer"\s*,\s*(\w+)\s*,\s*(\d+)\s*,',
        # Match pattern with REV addresses: match ("from", "to", amount)
        r'match\s*\(\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*(\d+)\s*\)',
        # RevVault findOrCreate pattern
        r'RevVault!\s*\(\s*"findOrCreate"\s*,\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*(\d+)\s*\)',
    ]
    
    # New pattern specifically for the transfer deployments in blocks 365, 377
    # Simplified pattern that works with the actual Rholang format
    DIRECT_TRANSFER_PATTERN = r'match \("(1111[^"]+)", "(1111[^"]+)", (\d+)\)'
    
    # Pattern to extract address assignments from match statements
    ADDRESS_BINDING_PATTERNS = [
        # match "address" { varName =>
        r'match\s*"([0-9a-zA-Z0-9]{54,56})"\s*\{\s*(\w+)\s*=>',
        # varName = "address"
        r'(\w+)\s*=\s*"([0-9a-zA-Z0-9]{54,56})"',
        # match ("from", "to", amount) { (varFrom, varTo, varAmount) =>
        r'match\s*\(\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*"([0-9a-zA-Z0-9]{54,56})"\s*,\s*\d+\s*\)\s*\{\s*\((\w+)\s*,\s*(\w+)\s*,\s*\w+\)\s*=>',
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
        self.last_epoch_check_block = 0
        self.last_consensus_check_block = 0
        self._genesis_data_cache = None  # Cache genesis data to avoid multiple extractions
        
    async def start(self):
        """Start the enhanced indexer."""
        self.running = True
        print("🚀 Starting enhanced Rust CLI blockchain indexer", flush=True)
        logger.info("🚀 Starting enhanced Rust CLI blockchain indexer")
        
        # Initialize database
        logger.info("📊 Connecting to database...")
        await db.connect()
        await db.create_tables()
        logger.info("✅ Database connected and tables ready")
        
        # Initialize Rust CLI client
        logger.info("🔧 Initializing Rust CLI client...")
        self.client = RustCLIClient()
        
        # Check node health
        logger.info("🔍 Checking ASI-Chain node health...")
        if not await self.client.health_check():
            logger.error("❌ Node is not healthy - cannot connect to ASI-Chain node")
            raise RuntimeError("Cannot connect to node via Rust CLI")
        
        logger.info("✅ ASI-Chain node connection established")
        
        # Get current indexer state
        last_indexed = await db.get_last_indexed_block()
        logger.info("📈 Current indexer state", last_indexed_block=last_indexed)
        
        # Run sync loop
        logger.info("🔄 Starting continuous sync loop...")
        sync_cycles = 0
        while self.running:
            try:
                await self._sync_blocks()
                await self._update_validator_states()
                await self._check_epoch_transitions()
                await self._update_network_stats()
                await self._verify_main_chain()
                
                # Log status every 10 sync cycles
                sync_cycles += 1
                if sync_cycles % 10 == 0:
                    current_block = await db.get_last_indexed_block()
                    logger.info("📊 Indexer status update", 
                               current_block=current_block,
                               sync_cycles_completed=sync_cycles,
                               status="running_normally")
                    
            except Exception as e:
                logger.error("❌ Sync cycle failed", error=str(e), exc_info=True)
            
            await asyncio.sleep(settings.sync_interval)
    
    async def stop(self):
        """Stop the indexer."""
        logger.info("Stopping enhanced indexer")
        self.running = False
        await db.disconnect()
    
    async def _sync_blocks(self):
        """Sync blocks using Rust CLI get-blocks-by-height command."""
        try:
            # Get last indexed block
            last_indexed = await db.get_last_indexed_block()
            
            # Get latest finalized block
            last_finalized_data = await self.client.get_last_finalized_block()
            if not last_finalized_data:
                logger.warning("Could not get last finalized block")
                return
            
            latest_block_number = last_finalized_data.get("blockNumber")
            if not latest_block_number:
                logger.warning("No block number in finalized block data")
                return
            
            if last_indexed >= latest_block_number:
                logger.debug("Already up to date", last_indexed=last_indexed, latest=latest_block_number)
                return
            
            # Calculate batch range - can handle larger batches with CLI
            # Check if we need to start from genesis
            async with db.session() as session:
                # Check if ANY blocks exist
                block_count = await session.scalar(
                    text("SELECT COUNT(*) FROM blocks")
                )
                
            if block_count == 0 and settings.start_from_block == 0:
                # No blocks indexed yet, start from genesis
                start = 0
            else:
                # Continue from last indexed
                start = last_indexed + 1
            batch_size = settings.batch_size  # Use configured batch size
            end = min(start + batch_size - 1, latest_block_number)
            
            logger.info(
                "🔄 Syncing blocks via Rust CLI",
                start_block=start,
                end_block=end,
                blocks_behind=latest_block_number - last_indexed,
                latest_block=latest_block_number
            )
            
            # Fetch blocks using CLI
            block_summaries = await self.client.get_blocks_by_height(start, end)
            
            if not block_summaries:
                logger.warning("No blocks returned for range", start=start, end=end)
                return
            
            logger.info(f"Retrieved {len(block_summaries)} blocks, fetching details...")
            
            # Process each block
            processed_count = 0
            for block_summary in block_summaries:
                try:
                    # Get full block details
                    block_hash = block_summary.get("blockHash")
                    if not block_hash:
                        logger.warning("Block summary missing hash", block=block_summary)
                        continue
                    
                    full_block = await self.client.get_block_details(block_hash)
                    if not full_block:
                        logger.warning(f"Could not get details for block {block_hash}")
                        continue
                    
                    await self._process_block(full_block)
                    processed_count += 1
                    
                    # Small delay to avoid overwhelming the node
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Failed to process block", error=str(e), block=block_summary)
            
            # Update last indexed block
            if processed_count > 0:
                last_block_num = start + processed_count - 1
                await db.set_last_indexed_block(last_block_num)
                logger.info("✅ Sync cycle complete", 
                           last_indexed_block=last_block_num, 
                           blocks_processed=processed_count,
                           remaining_blocks=latest_block_number - last_block_num)
                    
        except Exception as e:
            logger.error(f"Sync blocks error: {e}", exc_info=True)
    
    async def _process_block(self, block_data: Dict):
        """Process a single block with full details."""
        block_info = block_data.get("blockInfo", {})
        deployments = block_data.get("deploys", [])
        
        block_hash = block_info.get("blockHash")
        block_number = block_info.get("blockNumber")
        
        if not block_hash or block_number is None:
            logger.error("Block missing required fields", block_data=block_data)
            return
        
        # Check if already processed
        async with db.session() as session:
            exists = await session.scalar(
                select(Block).where(Block.block_hash == block_hash).limit(1)
            )
            if exists:
                logger.debug("Block already indexed", block_number=block_number)
                return
        
        # Process block in transaction
        async with db.session() as session:
            # Extract block data
            parent_hash = block_info.get("parentsHashList", [""])[0] if block_info.get("parentsHashList") else ""
            state_root_hash = block_info.get("postStateHash", "")
            bonds_map = block_info.get("bonds", [])
            justifications = block_info.get("justifications", [])
            
            # Insert block
            block = Block(
                block_number=block_number,
                block_hash=block_hash,
                parent_hash=parent_hash,
                timestamp=block_info.get("timestamp", 0),
                proposer=block_info.get("sender", ""),
                state_hash=state_root_hash,
                state_root_hash=state_root_hash,
                finalization_status="finalized",
                bonds_map=bonds_map,
                seq_num=block_info.get("seqNum"),
                sig=block_info.get("sig"),
                sig_algorithm=block_info.get("sigAlgorithm"),
                shard_id=block_info.get("shardId"),
                extra_bytes=block_info.get("extraBytes"),
                version=block_info.get("version"),
                deployment_count=len(deployments),
                fault_tolerance=block_info.get("faultTolerance", 0.0),
                pre_state_hash=block_info.get("preStateHash"),
                justifications=justifications  # Store full justifications
            )
            session.add(block)
            
            # Process validators from bonds
            await self._process_validators(session, block_info)
            
            # Process deployments with enhanced data
            for deploy_data in deployments:
                await self._process_deployment_enhanced(session, block_info, deploy_data)
            
            # Process genesis transfers if this is block 0
            if block_number == 0:
                # Ensure bonds are included in the block_info for genesis processing
                genesis_block_info = dict(block_info)
                genesis_block_info['bonds'] = bonds_map
                await self._process_genesis_transfers(session, genesis_block_info)
                await self._process_genesis_balance_states(session, genesis_block_info)
            
            await session.commit()
            
            # Process block validators from justifications
            if justifications:
                async with db.session() as validator_session:
                    for justification in justifications:
                        validator_key = justification.get("validator", "")
                        if validator_key:
                            await validator_session.execute(
                                text("""
                                    INSERT INTO block_validators (block_hash, validator_public_key)
                                    VALUES (:block_hash, :validator_key)
                                    ON CONFLICT DO NOTHING
                                """),
                                {"block_hash": block_hash, "validator_key": validator_key}
                            )
                    await validator_session.commit()
        
        # Special logging for genesis block
        if block_number == 0:
            logger.info(
                "🎯 Genesis block indexed with enhanced features",
                block_number=block_number,
                deployments=len(deployments),
                genesis_transfers="Created",
                genesis_balances="Initialized",
                timestamp=datetime.fromtimestamp(block_info.get("timestamp", 0) / 1000)
            )
        else:
            logger.info(
                "📦 Block indexed",
                block_number=block_number,
                deployments=len(deployments),
                timestamp=datetime.fromtimestamp(block_info.get("timestamp", 0) / 1000)
            )
    
    async def _process_deployment_enhanced(self, session, block_data: Dict, deploy_data: Dict):
        """Process deployment with enhanced data from get-deploy command."""
        deploy_id = deploy_data.get("sig")
        if not deploy_id:
            return
        
        # Try to get enhanced deployment info
        enhanced_info = None
        try:
            enhanced_info = await self.client.get_deploy_info(deploy_id)
            await asyncio.sleep(0.05)  # Small delay to avoid overwhelming
        except Exception as e:
            logger.debug(f"Could not get enhanced deploy info for {deploy_id}: {e}")
        
        # Merge enhanced info if available
        if enhanced_info and isinstance(enhanced_info, dict):
            deploy_info = enhanced_info.get("deployInfo", {})
            if deploy_info:
                # Update deploy_data with enhanced info
                deploy_data.update({
                    "blockHash": deploy_info.get("blockHash", deploy_data.get("blockHash")),
                    "sender": deploy_info.get("sender", deploy_data.get("deployer")),
                    "seqNum": deploy_info.get("seqNum"),
                    "sig": deploy_info.get("sig", deploy_data.get("sig")),
                    "sigAlgorithm": deploy_info.get("sigAlgorithm", deploy_data.get("sigAlgorithm")),
                    "shardId": deploy_info.get("shardId"),
                    "version": deploy_info.get("version"),
                    "timestamp": deploy_info.get("timestamp", deploy_data.get("timestamp")),
                    "status": enhanced_info.get("status", "included")
                })
        
        # Process deployment
        term = deploy_data.get("term", "")
        deployment_type = self.classify_deployment(term)
        
        error_message = deploy_data.get("systemDeployError")
        # Only set error_message if it's not None and not empty string
        if error_message == "":
            error_message = None
        errored = deploy_data.get("errored", False) or bool(error_message)
        
        deployment = Deployment(
            deploy_id=deploy_data.get("sig"),
            block_hash=block_data.get("blockHash"),
            block_number=block_data.get("blockNumber"),
            deployer=deploy_data.get("deployer", deploy_data.get("sender", "")),
            term=term,
            timestamp=deploy_data.get("timestamp", block_data.get("timestamp")),
            sig=deploy_data.get("sig"),
            sig_algorithm=deploy_data.get("sigAlgorithm", "secp256k1"),
            phlo_price=deploy_data.get("phloPrice", 1),
            phlo_limit=deploy_data.get("phloLimit", 1000000),
            phlo_cost=deploy_data.get("cost", 0),
            valid_after_block_number=deploy_data.get("validAfterBlockNumber"),
            errored=errored,
            error_message=error_message,
            deployment_type=deployment_type,
            seq_num=deploy_data.get("seqNum"),
            shard_id=deploy_data.get("shardId"),
            status=deploy_data.get("status", "included")
        )
        session.add(deployment)
        
        # Extract REV transfers if enabled
        if settings.enable_rev_transfer_extraction:
            transfers = self._extract_transfers(deploy_data, block_data.get("blockNumber"))
            if transfers:
                logger.info(f"📤 Found {len(transfers)} transfers in deploy {deploy_data.get('deployId', 'unknown')[:16]}...")
            for transfer in transfers:
                session.add(transfer)
    
    async def _update_validator_states(self):
        """Update validator states using bonds and active-validators commands."""
        try:
            # Get current bonds
            bonds_data = await self.client.get_bonds()
            if not bonds_data:
                return
            
            bonds = bonds_data.get("bonds", [])
            
            # Get active validators
            active_validators = await self.client.get_active_validators()
            if active_validators is None:
                active_validators = []
            
            async with db.session() as session:
                # Update validator records
                for bond in bonds:
                    validator_key = bond["validator"]
                    stake = bond["stake"]
                    is_active = validator_key in active_validators
                    
                    # Get current block number for tracking
                    current_block = await db.get_last_indexed_block()
                    
                    stmt = insert(Validator).values(
                        public_key=validator_key,
                        name=validator_key,
                        total_stake=stake,
                        first_seen_block=current_block,
                        last_seen_block=current_block,
                        status="active" if is_active else "bonded",
                        updated_at=datetime.utcnow()
                    )
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["public_key"],
                        set_={
                            "total_stake": stake,
                            "last_seen_block": current_block,
                            "status": "active" if is_active else "bonded",
                            "updated_at": datetime.utcnow()
                        }
                    )
                    await session.execute(stmt)
                
                await session.commit()
                
            logger.info(
                "Updated validator states",
                total_bonded=len(bonds),
                active=len(active_validators)
            )
            
        except Exception as e:
            logger.error(f"Failed to update validator states: {e}")
    
    async def _check_epoch_transitions(self):
        """Check and record epoch transitions."""
        try:
            # Get current block
            current_block = await db.get_last_indexed_block()
            
            # Only check every 100 blocks to avoid too many CLI calls
            if current_block - self.last_epoch_check_block < 100:
                return
            
            self.last_epoch_check_block = current_block
            
            # Get epoch info
            epoch_info = await self.client.get_epoch_info()
            if not epoch_info:
                return
            
            current_epoch = epoch_info.get("current_epoch")
            epoch_length = epoch_info.get("epoch_length", 10000)
            quarantine_length = epoch_info.get("quarantine_length", 50000)
            blocks_until_next = epoch_info.get("blocks_until_next_epoch")
            
            if current_epoch is None:
                return
            
            # Check if we need to record this epoch
            async with db.session() as session:
                # Check if epoch already recorded
                exists = await session.scalar(
                    select(EpochTransition).where(
                        EpochTransition.epoch_number == current_epoch
                    ).limit(1)
                )
                
                if not exists and blocks_until_next is not None:
                    # Calculate epoch boundaries
                    epoch_start = current_block - (epoch_length - blocks_until_next)
                    epoch_end = epoch_start + epoch_length - 1
                    
                    # Get active validators for this epoch
                    active_validators = await self.client.get_active_validators()
                    active_count = len(active_validators) if active_validators else 0
                    
                    epoch_transition = EpochTransition(
                        epoch_number=current_epoch,
                        start_block=epoch_start,
                        end_block=epoch_end,
                        active_validators=active_count,
                        quarantine_length=quarantine_length,
                        timestamp=datetime.utcnow()
                    )
                    session.add(epoch_transition)
                    await session.commit()
                    
                    logger.info(
                        "Recorded epoch transition",
                        epoch=current_epoch,
                        start=epoch_start,
                        end=epoch_end,
                        validators=active_count
                    )
                    
        except Exception as e:
            logger.error(f"Failed to check epoch transitions: {e}")
    
    async def _update_network_stats(self):
        """Update network statistics using network-consensus command."""
        try:
            # Only update every 50 blocks
            current_block = await db.get_last_indexed_block()
            if current_block - self.last_consensus_check_block < 50:
                return
            
            self.last_consensus_check_block = current_block
            
            # Get network consensus data
            consensus = await self.client.get_network_consensus()
            if not consensus:
                return
            
            async with db.session() as session:
                network_stat = NetworkStats(
                    block_number=consensus.get("current_block", current_block),
                    total_validators=consensus.get("total_bonded_validators", 0),
                    active_validators=consensus.get("active_validators", 0),
                    validators_in_quarantine=consensus.get("validators_in_quarantine", 0),
                    consensus_participation=consensus.get("participation_rate", 0.0),
                    consensus_status=consensus.get("status", "unknown"),
                    timestamp=datetime.utcnow()
                )
                session.add(network_stat)
                await session.commit()
                
                logger.info(
                    "Updated network stats",
                    block=current_block,
                    participation=consensus.get("participation_rate", 0.0),
                    status=consensus.get("status", "unknown")
                )
                
        except Exception as e:
            logger.error(f"Failed to update network stats: {e}")
    
    async def _verify_main_chain(self):
        """Periodically verify main chain integrity."""
        try:
            # Only verify every 500 blocks
            current_block = await db.get_last_indexed_block()
            if current_block % 500 != 0:
                return
            
            # Get recent main chain blocks
            main_chain = await self.client.show_main_chain(depth=20)
            if not main_chain:
                return
            
            # Verify we have these blocks and they match
            async with db.session() as session:
                for block_info in main_chain:
                    block_num = block_info.get("blockNumber")
                    block_hash = block_info.get("blockHash")
                    
                    if block_num is None or not block_hash:
                        continue
                    
                    # Check if we have this block with matching hash
                    stored_block = await session.scalar(
                        select(Block).where(
                            and_(
                                Block.block_number == block_num,
                                Block.block_hash == block_hash
                            )
                        ).limit(1)
                    )
                    
                    if not stored_block:
                        logger.warning(
                            "Main chain mismatch detected",
                            block_number=block_num,
                            expected_hash=block_hash
                        )
                        # Could trigger a re-sync here if needed
            
            logger.info("Main chain verification complete", blocks_checked=len(main_chain))
            
        except Exception as e:
            logger.error(f"Failed to verify main chain: {e}")
    
    async def _process_validators(self, session, block_data: Dict):
        """Process validator bonds for a block."""
        bonds = block_data.get("bonds", [])
        
        for bond_data in bonds:
            validator_key = bond_data["validator"]
            stake = bond_data["stake"]
            
            # First ensure validator exists in validators table
            result = await session.execute(
                text("""
                    INSERT INTO validators (public_key, name, total_stake, status, first_seen_block, last_seen_block)
                    VALUES (:public_key, :name, :stake, 'active', :block_number, :block_number)
                    ON CONFLICT (public_key) DO UPDATE SET
                        total_stake = GREATEST(validators.total_stake, :stake),
                        last_seen_block = :block_number,
                        status = 'active'
                """),
                {
                    "public_key": validator_key,
                    "name": validator_key[:20] + "...",  # Short name for display
                    "stake": stake,
                    "block_number": block_data["blockNumber"]
                }
            )
            
            # Add validator bond record
            bond = ValidatorBond(
                block_hash=block_data["blockHash"],
                block_number=block_data["blockNumber"],
                validator_public_key=validator_key,
                stake=stake
            )
            session.add(bond)
    
    def _extract_transfers(self, deploy_data: Dict, block_number: int) -> List[Transfer]:
        """Extract REV transfers from deployment term."""
        transfers = []
        term = deploy_data.get("term", "")
        
        # Log first 200 chars of term for debugging
        if term and block_number < 10:  # Only log first few blocks
            logger.debug(f"Deploy term preview: {term[:200]}...")
        
        # Check if term contains RevVault operations or match statements with addresses
        if not term:
            return transfers
        
        # Check for direct transfer pattern first (blocks 365, 377 style)
        direct_matches = re.findall(self.DIRECT_TRANSFER_PATTERN, term)
        if block_number in [365, 377]:
            logger.info(f"Block {block_number}: Pattern search result: {len(direct_matches)} matches found")
        if direct_matches:
            for match in direct_matches:
                try:
                    from_address, to_address, amount_str = match
                    # Validate addresses (REV addresses can be 53-56 characters)
                    if (from_address.startswith('1111') and len(from_address) in range(53, 57) and
                        to_address.startswith('1111') and len(to_address) in range(53, 57)):
                        
                        amount_dust = int(amount_str)
                        if amount_dust > 0:
                            amount_rev = Decimal(amount_dust) / Decimal(100_000_000)
                            
                            transfer = Transfer(
                                deploy_id=deploy_data.get("sig"),
                                block_number=block_number,
                                from_address=from_address[:150],
                                to_address=to_address[:150],
                                amount_dust=amount_dust,
                                amount_rev=amount_rev,
                                status="success" if not deploy_data.get("errored") else "failed"
                            )
                            transfers.append(transfer)
                            
                            logger.info(
                                "💸 Found direct REV transfer",
                                block=block_number,
                                from_address=from_address[:20] + "...",
                                to_address=to_address[:20] + "...",
                                amount_rev=float(amount_rev)
                            )
                except (ValueError, IndexError) as e:
                    logger.warning(f"Failed to parse direct transfer: {e}")
        
        # If we found direct transfers, return them immediately
        if transfers:
            return transfers
        
        # Otherwise check other patterns if the term contains RevVault operations
        if (("RevVault" not in term and "transfer" not in term) and ("vault" not in term.lower())):
            return transfers
        
        # First, extract address bindings from the term
        address_bindings = {}
        
        # Debug logging for block 334
        if block_number == 334:
            logger.info("Analyzing block 334 deployment", term_length=len(term))
        
        for pattern in self.ADDRESS_BINDING_PATTERNS:
            matches = re.findall(pattern, term)
            for match in matches:
                if len(match) == 2:
                    # Could be (address, var) or (var, address) depending on pattern
                    if match[0].startswith('1111') and len(match[0]) in range(54, 57):
                        # First element is address
                        address_bindings[match[1]] = match[0]
                    elif match[1].startswith('1111') and len(match[1]) in range(54, 57):
                        # Second element is address
                        address_bindings[match[0]] = match[1]
                elif len(match) == 4:
                    # New pattern: (fromAddr, toAddr, fromVar, toVar)
                    if match[0].startswith('1111') and match[1].startswith('1111'):
                        address_bindings[match[2]] = match[0]  # fromVar = fromAddr
                        address_bindings[match[3]] = match[1]  # toVar = toAddr
                        if block_number == 334:
                            logger.info("Found address bindings in block 334", bindings=address_bindings)
        
        # Try each transfer pattern
        for pattern in self.TRANSFER_PATTERNS:
            matches = re.findall(pattern, term)
            
            # Log pattern matches for debugging
            if matches and block_number > 330:
                logger.info(f"Pattern match found", pattern=pattern[:50], matches=matches[:2])
            
            for match in matches:
                try:
                    if len(match) == 2:
                        # Pattern with just recipient and amount
                        to_identifier, amount_str = match
                        from_address = deploy_data.get("deployer", deploy_data.get("sender", ""))
                        
                        # Check if to_identifier is a variable that we have a binding for
                        if to_identifier in address_bindings:
                            to_address = address_bindings[to_identifier]
                        elif to_identifier.startswith('1111') and len(to_identifier) in range(54, 57):
                            # It's already an address
                            to_address = to_identifier
                        else:
                            # Skip if we can't resolve the address
                            continue
                            
                    elif len(match) == 3:
                        # Pattern with sender, recipient, and amount
                        from_identifier, to_identifier, amount_str = match
                        
                        # Resolve from address
                        if from_identifier in address_bindings:
                            from_address = address_bindings[from_identifier]
                        elif from_identifier.startswith('1111') and len(from_identifier) in range(54, 57):
                            from_address = from_identifier
                        else:
                            from_address = deploy_data.get("deployer", deploy_data.get("sender", ""))
                        
                        # Resolve to address
                        if to_identifier in address_bindings:
                            to_address = address_bindings[to_identifier]
                        elif to_identifier.startswith('1111') and len(to_identifier) in range(54, 57):
                            to_address = to_identifier
                        else:
                            continue
                    else:
                        continue
                    
                    # Validate addresses
                    if not from_address or not to_address:
                        continue
                        
                    if len(from_address) > 150 or len(to_address) > 150:
                        logger.debug(
                            "Skipping transfer with invalid address length",
                            from_len=len(from_address),
                            to_len=len(to_address)
                        )
                        continue
                    
                    # Parse amount
                    amount_dust = int(amount_str)
                    if amount_dust <= 0:
                        continue
                    
                    amount_rev = Decimal(amount_dust) / Decimal(100_000_000)
                    
                    # Create transfer record
                    transfer = Transfer(
                        deploy_id=deploy_data.get("sig"),
                        block_number=block_number,
                        from_address=from_address[:150],  # Use 150 char limit as per schema
                        to_address=to_address[:150],      
                        amount_dust=amount_dust,
                        amount_rev=amount_rev,
                        status="success" if not deploy_data.get("errored") else "failed"
                    )
                    transfers.append(transfer)
                    
                    logger.info(
                        "💸 Found REV transfer",
                        from_address=from_address[:20] + "...",
                        to_address=to_address[:20] + "...",
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
    
    async def _extract_genesis_data(self, block_info: Dict) -> Optional[Dict]:
        """Extract genesis allocations and bonds from the genesis block dynamically."""
        # Use cached data if available
        if self._genesis_data_cache is not None:
            return self._genesis_data_cache
            
        try:
            logger.info("🔍 Extracting genesis data from blockchain...")
            
            # For network-agnostic approach, we extract from blockchain state
            # rather than parsing deployments which may vary by network
            return await self._extract_genesis_from_state(block_info)
            
            allocations = []
            bonds = []
            
            # Parse each deployment to extract initial allocations and bonds
            for deploy in genesis_deployments:
                deploy_term = deploy.get('term', '')
                
                # Look for RevVault initialization patterns
                if 'initVault' in deploy_term or 'RevVault' in deploy_term:
                    # Extract REV address and amount using regex
                    # Pattern: initVault!("address", amount)
                    import re
                    vault_pattern = r'initVault!\s*\(\s*"([^"]+)"\s*,\s*(\d+)\s*\)'
                    matches = re.findall(vault_pattern, deploy_term)
                    
                    for address, amount_str in matches:
                        if address.startswith('1111'):  # REV addresses start with 1111
                            amount_dust = int(amount_str)
                            amount_rev = amount_dust / 100000000  # Convert dust to REV
                            allocations.append((address, amount_dust, amount_rev))
                            logger.info(f"Found genesis allocation: {address} -> {amount_rev} REV")
                
                # Look for PoS initialization patterns for bonds
                elif 'PoS' in deploy_term or 'bond' in deploy_term.lower():
                    # Extract validator public key and bond amount
                    # Look for patterns like: (pubkey, amount) in the deployment
                    bond_pattern = r'\(([0-9a-fA-F]{130}),\s*(\d+)\)'
                    matches = re.findall(bond_pattern, deploy_term)
                    
                    for pubkey, amount_str in matches:
                        amount_dust = int(amount_str)
                        amount_rev = amount_dust / 100000000
                        bonds.append((pubkey, amount_dust, amount_rev))
                        logger.info(f"Found genesis bond: {pubkey[:20]}... -> {amount_rev} REV")
            
            # If we couldn't parse from deployments, try to get from initial state
            if not allocations and not bonds:
                logger.warning("Could not parse genesis data from deployments, trying alternative method...")
                
                # Get initial validator bonds from the blockchain state
                initial_bonds = await self.client.get_active_validators()
                if initial_bonds:
                    for validator in initial_bonds:
                        pubkey = validator.get('validator')
                        stake = validator.get('stake', 0)
                        if pubkey and stake > 0:
                            bonds.append((pubkey, stake, stake / 100000000))
                            logger.info(f"Found validator bond: {pubkey[:20]}... -> {stake / 100000000} REV")
                
                # For allocations, we might need to query initial balances
                # This is network-specific and might require additional logic
                logger.info("Note: Initial REV allocations may need to be discovered through balance queries")
            
            # Cache the result
            self._genesis_data_cache = {
                'allocations': allocations,
                'bonds': bonds
            }
            return self._genesis_data_cache
            
        except Exception as e:
            logger.error(f"Failed to extract genesis data: {e}")
            return None
    
    async def _extract_genesis_from_state(self, block_info: Dict) -> Optional[Dict]:
        """Extract genesis data from blockchain state as fallback."""
        try:
            logger.info("📊 Extracting genesis data from blockchain state...")
            
            allocations = []
            bonds = []
            
            # Step 1: Get bonds from the block_info passed to us (which has bonds_map)
            if 'bonds' in block_info:
                # bonds is already parsed from bonds_map JSONB column
                for bond in block_info['bonds']:
                    validator_key = bond.get('validator')
                    stake = bond.get('stake', 0)
                    if validator_key and stake > 0:
                        bonds.append((validator_key, stake, stake / 100000000))
                        logger.info(f"Found validator bond: {validator_key[:20]}... -> {stake / 100000000} REV")
            else:
                # Try to get from client if not in block_info
                try:
                    blocks = await self.client.get_blocks_by_height(0, 0)
                    if blocks and len(blocks) > 0:
                        genesis_block = blocks[0]
                        if 'bonds' in genesis_block:
                            for bond in genesis_block['bonds']:
                                validator_key = bond.get('validator')
                                stake = bond.get('stake', 0)
                                if validator_key and stake > 0:
                                    bonds.append((validator_key, stake, stake / 100000000))
                                    logger.info(f"Found validator bond: {validator_key[:20]}... -> {stake / 100000000} REV")
                except Exception as e:
                    logger.warning(f"Could not get bonds from genesis block: {e}")
            
            # Step 2: If no bonds in genesis block, try to get from active validators
            if not bonds:
                # Get initial validator bonds from read-only node
                # Temporarily switch to read-only port
                original_port = self.client.http_port
                self.client.http_port = 40453  # Read-only node port
                
                try:
                    # First try to get the first few blocks to extract full validator keys from proposers
                    validator_full_keys = {}
                    for block_num in range(1, min(20, 100)):  # Check first 20 blocks
                        blocks = await self.client.get_blocks_by_height(block_num, block_num)
                        if blocks and len(blocks) > 0:
                            block_info = blocks[0]
                            if 'proposer' in block_info:
                                proposer = block_info['proposer']
                                if proposer and len(proposer) > 100:  # Full key
                                    # Store mapping of abbreviated to full key
                                    abbreviated = proposer[:8] + "..." + proposer[-8:]
                                    validator_full_keys[abbreviated] = proposer
                    
                    # Get bonds (which shows abbreviated keys with stakes)
                    stdout, _ = await self.client._run_command([
                        "bonds",
                        "-H", self.client.node_host,
                        "-p", str(self.client.http_port)
                    ])
                    
                    # Restore original port
                    self.client.http_port = original_port
            
                    # Parse bonds output to get stakes
                    if stdout:
                        lines = stdout.strip().split('\n')
                        for line in lines:
                            # Match lines like: 1. 04837a4c...b2df065f (stake: 50000000000000)
                            match = re.search(r'([0-9a-fA-F]{8}\.\.\.?[0-9a-fA-F]{8})\s*\(stake:\s*(\d+)\)', line)
                            if match:
                                abbreviated = match.group(1)
                                stake = int(match.group(2))
                                
                                # Find the full key from our validator_full_keys mapping
                                full_key = validator_full_keys.get(abbreviated)
                                if full_key:
                                    bonds.append((full_key, stake, stake / 100000000))
                                    logger.info(f"Found validator bond: {full_key[:20]}... -> {stake / 100000000} REV")
                                else:
                                    # If we couldn't find full key, use abbreviated for now
                                    # The full key will be discovered when processing blocks
                                    logger.warning(f"Could not find full key for validator: {abbreviated}, will discover from blocks")
                                    bonds.append((abbreviated, stake, stake / 100000000))
                except Exception as e:
                    logger.error(f"Error getting validator bonds: {e}")
                finally:
                    # Restore original port
                    self.client.http_port = original_port
            
            # For a network-agnostic approach, we can try to detect initial allocations
            # by looking at the first few blocks for large transfers from genesis
            logger.info("Note: Initial REV allocations will be discovered as transfers are processed")
            
            # Cache the result
            self._genesis_data_cache = {
                'allocations': allocations,
                'bonds': bonds
            }
            return self._genesis_data_cache
            
        except Exception as e:
            logger.error(f"Failed to extract genesis from state: {e}", exc_info=True)
            return None
    
    async def _process_genesis_transfers(self, session, block_info: Dict):
        """Process genesis transfers for initial REV allocations and validator bonds."""
        logger.info("💰 Processing genesis transfers and validator bonds")
        
        # Extract genesis data dynamically
        genesis_data = await self._extract_genesis_data(block_info)
        
        if not genesis_data:
            logger.warning("⚠️ Could not extract genesis data dynamically, skipping genesis transfers")
            return
        
        # Genesis REV wallet allocations (minting from genesis)
        genesis_allocations = genesis_data['allocations']
        
        # Create genesis allocation deployments and transfers
        for i, (address, amount_dust, amount_rev) in enumerate(genesis_allocations, 1):
            deploy_id = f"genesis_allocation_{i}"
            
            # Create genesis allocation deployment
            deployment = Deployment(
                deploy_id=deploy_id,
                block_number=0,
                block_hash=block_info.get("blockHash"),
                deployer="0000000000000000000000000000000000000000000000000000000000000000",
                term=f"Genesis REV allocation to {address}: {amount_rev:,.0f} REV",
                timestamp=block_info.get("timestamp"),
                sig=deploy_id,
                deployment_type="genesis_mint",
                errored=False,
                status="included"
            )
            session.add(deployment)
            
            # Create genesis allocation transfer
            transfer = Transfer(
                deploy_id=deploy_id,
                block_number=0,
                from_address="0000000000000000000000000000000000000000000000000000000000000000",  # Genesis mint
                to_address=address,
                amount_dust=amount_dust,
                amount_rev=amount_rev,
                status="genesis_mint"
            )
            session.add(transfer)
        
        # Genesis validator bonds (staking transactions)
        validator_bonds = genesis_data['bonds']
        
        # Create genesis bond deployments and transfers
        for i, (validator_pubkey, amount_dust, amount_rev) in enumerate(validator_bonds, 1):
            deploy_id = f"genesis_bond_{i}"
            
            # Create genesis bond deployment
            deployment = Deployment(
                deploy_id=deploy_id,
                block_number=0,
                block_hash=block_info.get("blockHash"),
                deployer=validator_pubkey,
                term=f"Genesis validator bond: {amount_rev:,.0f} REV staked",
                timestamp=block_info.get("timestamp"),
                sig=deploy_id,
                deployment_type="genesis_bond",
                errored=False,
                status="included"
            )
            session.add(deployment)
            
            # Create genesis bond transfer (validator -> PoS contract)
            transfer = Transfer(
                deploy_id=deploy_id,
                block_number=0,
                from_address=validator_pubkey,
                to_address="1111gW5kkGxHg7xDg6dRkZx2f7qxTizJzaCH9VEM1oJKWRvSX9Sk5",  # PoS contract address
                amount_dust=amount_dust,
                amount_rev=amount_rev,
                status="genesis_bond"
            )
            session.add(transfer)
        
        logger.info("✅ Genesis transfers created", 
                   wallet_allocations=len(genesis_allocations), 
                   validator_bonds=len(validator_bonds),
                   total_transfers=len(genesis_allocations) + len(validator_bonds))
    
    async def _process_genesis_balance_states(self, session, block_info: Dict):
        """Process genesis balance states for initial allocations and validator bonds."""
        logger.info("⚖️ Processing genesis balance states")
        
        # Extract genesis data dynamically
        genesis_data = await self._extract_genesis_data(block_info)
        
        if not genesis_data:
            logger.warning("⚠️ Could not extract genesis data dynamically, skipping balance states")
            return
        
        # Genesis REV wallet allocations (all unbonded initially)
        genesis_allocations = genesis_data['allocations']
        
        # Add genesis wallet balance states
        for address, amount_dust, amount_rev in genesis_allocations:
            balance_state = BalanceState(
                address=address,
                block_number=0,
                unbonded_balance_dust=amount_dust,
                unbonded_balance_rev=amount_rev,
                bonded_balance_dust=0,
                bonded_balance_rev=0
            )
            session.add(balance_state)
        
        # Validator balance states (they staked at genesis, so all bonded)
        validator_bonds = genesis_data['bonds']
        
        # Add validator balance states
        for validator_pubkey, amount_dust, amount_rev in validator_bonds:
            balance_state = BalanceState(
                address=validator_pubkey,
                block_number=0,
                unbonded_balance_dust=0,
                unbonded_balance_rev=0,
                bonded_balance_dust=amount_dust,
                bonded_balance_rev=amount_rev
            )
            session.add(balance_state)
        
        # PoS contract balance state (holds all bonded REV)
        total_bonded_dust = sum(bond[1] for bond in validator_bonds)
        total_bonded_rev = sum(bond[2] for bond in validator_bonds)
        
        pos_balance_state = BalanceState(
            address="1111gW5kkGxHg7xDg6dRkZx2f7qxTizJzaCH9VEM1oJKWRvSX9Sk5",
            block_number=0,
            unbonded_balance_dust=0,
            unbonded_balance_rev=0,
            bonded_balance_dust=total_bonded_dust,
            bonded_balance_rev=total_bonded_rev
        )
        session.add(pos_balance_state)
        
        logger.info("✅ Genesis balance states created", 
                   wallet_balances=len(genesis_allocations), 
                   validator_balances=len(validator_bonds),
                   total_states=len(genesis_allocations) + len(validator_bonds) + 1)
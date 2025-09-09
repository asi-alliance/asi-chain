#!/usr/bin/env python3
"""
F1R3FLY/RChain Blockchain Indexer
Indexes blocks, transactions, and deploys from F1R3FLY nodes
Replaces Ethereum block indexing
"""

import os
import sys
import time
import json
import logging
import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from typing import Dict, List, Optional, Any
import requests
import redis
from contextlib import contextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class F1R3FlyClient:
    """Client for interacting with F1R3FLY node API"""
    
    def __init__(self, node_url: str):
        self.node_url = node_url
        self.session = requests.Session()
        
    def get_latest_block_number(self) -> Optional[int]:
        """Get the latest block number"""
        try:
            response = self.session.get(
                f"{self.node_url}/api/blocks/latest",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('blockNumber')
        except Exception as e:
            logger.error(f"Failed to get latest block: {e}")
        return None
    
    def get_block(self, block_number: int) -> Optional[Dict]:
        """Get block by number"""
        try:
            response = self.session.get(
                f"{self.node_url}/api/block/{block_number}",
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get block {block_number}: {e}")
        return None
    
    def get_block_by_hash(self, block_hash: str) -> Optional[Dict]:
        """Get block by hash"""
        try:
            response = self.session.get(
                f"{self.node_url}/api/block-hash/{block_hash}",
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get block by hash {block_hash}: {e}")
        return None
    
    def get_deploys_in_block(self, block_hash: str) -> List[Dict]:
        """Get all deploys in a block"""
        try:
            response = self.session.get(
                f"{self.node_url}/api/block/{block_hash}/deploys",
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get('deploys', [])
        except Exception as e:
            logger.error(f"Failed to get deploys for block {block_hash}: {e}")
        return []
    
    def get_validators(self) -> List[Dict]:
        """Get current validators"""
        try:
            response = self.session.get(
                f"{self.node_url}/api/validators",
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get('validators', [])
        except Exception as e:
            logger.error(f"Failed to get validators: {e}")
        return []

class Database:
    """PostgreSQL database for storing indexed data"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.init_schema()
    
    @contextmanager
    def get_connection(self):
        """Get database connection context manager"""
        conn = psycopg2.connect(self.connection_string)
        try:
            yield conn
        finally:
            conn.close()
    
    def init_schema(self):
        """Initialize database schema for F1R3FLY"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Blocks table
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS blocks (
                        block_number BIGINT PRIMARY KEY,
                        block_hash VARCHAR(64) UNIQUE NOT NULL,
                        parent_hash VARCHAR(64),
                        creator VARCHAR(128),
                        timestamp_millis BIGINT,
                        timestamp TIMESTAMP,
                        deploy_count INTEGER,
                        justification_count INTEGER,
                        fault_tolerance FLOAT,
                        height_map JSONB,
                        bonds_cache JSONB,
                        raw_data JSONB,
                        indexed_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                
                # Deploys table (F1R3FLY transactions)
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS deploys (
                        deploy_id VARCHAR(64) PRIMARY KEY,
                        block_hash VARCHAR(64) REFERENCES blocks(block_hash),
                        block_number BIGINT,
                        deployer VARCHAR(128),
                        term TEXT,
                        timestamp_millis BIGINT,
                        timestamp TIMESTAMP,
                        sig VARCHAR(256),
                        sig_algorithm VARCHAR(32),
                        phlo_price BIGINT,
                        phlo_limit BIGINT,
                        validity_start_epoch BIGINT,
                        cost BIGINT,
                        error_message TEXT,
                        system_deploy_error TEXT,
                        raw_data JSONB,
                        indexed_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                
                # REV transfers table
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS rev_transfers (
                        id SERIAL PRIMARY KEY,
                        deploy_id VARCHAR(64) REFERENCES deploys(deploy_id),
                        block_number BIGINT,
                        from_address VARCHAR(128),
                        to_address VARCHAR(128),
                        amount BIGINT,
                        timestamp TIMESTAMP,
                        status VARCHAR(32),
                        indexed_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                
                # Validators table
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS validators (
                        public_key VARCHAR(256) PRIMARY KEY,
                        stake BIGINT,
                        rev_address VARCHAR(128),
                        first_seen_block BIGINT,
                        last_seen_block BIGINT,
                        total_blocks_created INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT TRUE,
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                
                # Indexer state table
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS indexer_state (
                        key VARCHAR(64) PRIMARY KEY,
                        value TEXT,
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                ''')
                
                # Create indexes
                cur.execute('CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp)')
                cur.execute('CREATE INDEX IF NOT EXISTS idx_deploys_block ON deploys(block_hash)')
                cur.execute('CREATE INDEX IF NOT EXISTS idx_deploys_deployer ON deploys(deployer)')
                cur.execute('CREATE INDEX IF NOT EXISTS idx_transfers_from ON rev_transfers(from_address)')
                cur.execute('CREATE INDEX IF NOT EXISTS idx_transfers_to ON rev_transfers(to_address)')
                cur.execute('CREATE INDEX IF NOT EXISTS idx_validators_active ON validators(is_active)')
                
                conn.commit()
                logger.info("Database schema initialized")
    
    def get_last_indexed_block(self) -> int:
        """Get the last indexed block number"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT value FROM indexer_state WHERE key = 'last_block'")
                result = cur.fetchone()
                return int(result[0]) if result else 0
    
    def update_last_indexed_block(self, block_number: int):
        """Update the last indexed block number"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO indexer_state (key, value)
                    VALUES ('last_block', %s)
                    ON CONFLICT (key)
                    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                ''', (str(block_number),))
                conn.commit()
    
    def save_block(self, block: Dict):
        """Save block to database"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO blocks (
                        block_number, block_hash, parent_hash, creator,
                        timestamp_millis, timestamp, deploy_count,
                        justification_count, fault_tolerance,
                        height_map, bonds_cache, raw_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (block_number) DO NOTHING
                ''', (
                    block['blockNumber'],
                    block['blockHash'],
                    block.get('parentsHashList', [None])[0],
                    block.get('creator'),
                    block.get('timestampMillis'),
                    datetime.fromtimestamp(block.get('timestampMillis', 0) / 1000),
                    block.get('deployCount', 0),
                    len(block.get('justifications', [])),
                    block.get('faultTolerance'),
                    json.dumps(block.get('heightMap', {})),
                    json.dumps(block.get('bondsCache', [])),
                    json.dumps(block)
                ))
                conn.commit()
    
    def save_deploy(self, deploy: Dict, block_hash: str, block_number: int):
        """Save deploy to database"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO deploys (
                        deploy_id, block_hash, block_number, deployer,
                        term, timestamp_millis, timestamp, sig,
                        sig_algorithm, phlo_price, phlo_limit,
                        validity_start_epoch, cost, error_message,
                        system_deploy_error, raw_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (deploy_id) DO NOTHING
                ''', (
                    deploy.get('sig', '')[:64],  # Use signature as deploy ID
                    block_hash,
                    block_number,
                    deploy.get('deployer'),
                    deploy.get('term'),
                    deploy.get('timestampMillis'),
                    datetime.fromtimestamp(deploy.get('timestampMillis', 0) / 1000),
                    deploy.get('sig'),
                    deploy.get('sigAlgorithm'),
                    deploy.get('phloPrice', 1),
                    deploy.get('phloLimit', 100000),
                    deploy.get('validAfterBlockNumber', 0),
                    deploy.get('cost', 0),
                    deploy.get('errored'),
                    deploy.get('systemDeployError'),
                    json.dumps(deploy)
                ))
                
                # Extract and save REV transfers if present
                self.extract_rev_transfers(deploy, block_number, conn)
                
                conn.commit()
    
    def extract_rev_transfers(self, deploy: Dict, block_number: int, conn):
        """Extract REV transfer from deploy term"""
        term = deploy.get('term', '')
        
        # Look for RevVault transfer pattern
        if 'RevVault' in term and 'transfer' in term:
            try:
                # Parse Rholang to extract transfer details
                # This is simplified - real implementation would need proper Rholang parsing
                import re
                
                # Pattern to match transfer("address", amount)
                pattern = r'transfer\s*\(\s*"([^"]+)"\s*,\s*(\d+)'
                match = re.search(pattern, term)
                
                if match:
                    to_address = match.group(1)
                    amount = int(match.group(2))
                    
                    with conn.cursor() as cur:
                        cur.execute('''
                            INSERT INTO rev_transfers (
                                deploy_id, block_number, from_address,
                                to_address, amount, timestamp, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ''', (
                            deploy.get('sig', '')[:64],
                            block_number,
                            deploy.get('deployer'),
                            to_address,
                            amount,
                            datetime.fromtimestamp(deploy.get('timestampMillis', 0) / 1000),
                            'success' if not deploy.get('errored') else 'failed'
                        ))
            except Exception as e:
                logger.error(f"Failed to extract REV transfer: {e}")
    
    def save_validator(self, validator: Dict):
        """Save or update validator"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO validators (public_key, stake, rev_address)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (public_key)
                    DO UPDATE SET
                        stake = EXCLUDED.stake,
                        is_active = TRUE,
                        updated_at = NOW()
                ''', (
                    validator.get('publicKey'),
                    validator.get('stake', 0),
                    validator.get('revAddress')
                ))
                conn.commit()

class RedisCache:
    """Redis cache for indexer"""
    
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url)
    
    def set_processing(self, block_number: int):
        """Mark block as being processed"""
        self.redis_client.setex(f"processing:{block_number}", 300, "1")
    
    def is_processing(self, block_number: int) -> bool:
        """Check if block is being processed"""
        return self.redis_client.exists(f"processing:{block_number}") > 0
    
    def clear_processing(self, block_number: int):
        """Clear processing flag"""
        self.redis_client.delete(f"processing:{block_number}")
    
    def cache_block(self, block_number: int, block_data: Dict):
        """Cache block data"""
        self.redis_client.setex(
            f"block:{block_number}",
            3600,
            json.dumps(block_data)
        )

class F1R3FlyIndexer:
    """Main indexer class"""
    
    def __init__(self, node_url: str, db_url: str, redis_url: str):
        self.client = F1R3FlyClient(node_url)
        self.db = Database(db_url)
        self.cache = RedisCache(redis_url)
        self.running = False
    
    async def index_block(self, block_number: int) -> bool:
        """Index a single block"""
        try:
            # Check if already processing
            if self.cache.is_processing(block_number):
                logger.info(f"Block {block_number} already being processed")
                return False
            
            # Mark as processing
            self.cache.set_processing(block_number)
            
            # Get block data
            block = self.client.get_block(block_number)
            if not block:
                logger.error(f"Failed to get block {block_number}")
                return False
            
            # Save block
            self.db.save_block(block)
            logger.info(f"Indexed block {block_number} ({block.get('blockHash', '')[:8]}...)")
            
            # Get and save deploys
            deploys = self.client.get_deploys_in_block(block['blockHash'])
            for deploy in deploys:
                self.db.save_deploy(deploy, block['blockHash'], block_number)
            
            if deploys:
                logger.info(f"Indexed {len(deploys)} deploys in block {block_number}")
            
            # Update last indexed block
            self.db.update_last_indexed_block(block_number)
            
            # Cache block data
            self.cache.cache_block(block_number, block)
            
            # Clear processing flag
            self.cache.clear_processing(block_number)
            
            return True
            
        except Exception as e:
            logger.error(f"Error indexing block {block_number}: {e}")
            self.cache.clear_processing(block_number)
            return False
    
    async def index_validators(self):
        """Index current validators"""
        try:
            validators = self.client.get_validators()
            for validator in validators:
                self.db.save_validator(validator)
            logger.info(f"Updated {len(validators)} validators")
        except Exception as e:
            logger.error(f"Error indexing validators: {e}")
    
    async def run(self):
        """Main indexer loop"""
        self.running = True
        logger.info("F1R3FLY Indexer starting...")
        
        while self.running:
            try:
                # Get last indexed block
                last_indexed = self.db.get_last_indexed_block()
                
                # Get latest block from node
                latest_block = self.client.get_latest_block_number()
                if latest_block is None:
                    logger.error("Failed to get latest block, retrying...")
                    await asyncio.sleep(10)
                    continue
                
                # Index missing blocks
                if last_indexed < latest_block:
                    logger.info(f"Indexing blocks {last_indexed + 1} to {latest_block}")
                    
                    for block_num in range(last_indexed + 1, latest_block + 1):
                        success = await self.index_block(block_num)
                        if not success:
                            logger.error(f"Failed to index block {block_num}, retrying later")
                            await asyncio.sleep(1)
                    
                    # Update validators periodically
                    if latest_block % 10 == 0:
                        await self.index_validators()
                else:
                    logger.debug(f"No new blocks (current: {last_indexed})")
                    await asyncio.sleep(5)
                    
            except KeyboardInterrupt:
                logger.info("Received interrupt, shutting down...")
                self.running = False
            except Exception as e:
                logger.error(f"Indexer error: {e}")
                await asyncio.sleep(10)
    
    def stop(self):
        """Stop the indexer"""
        self.running = False

async def main():
    """Main entry point"""
    # Configuration from environment
    node_url = os.getenv('F1R3FLY_NODE_URL', 'http://localhost:40403')
    db_url = os.getenv('DATABASE_URL', 'postgresql://asichain:asichain@localhost:5432/asichain')
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # Create and run indexer
    indexer = F1R3FlyIndexer(node_url, db_url, redis_url)
    
    try:
        await indexer.run()
    except KeyboardInterrupt:
        indexer.stop()
        logger.info("Indexer stopped")

if __name__ == '__main__':
    asyncio.run(main())
#!/usr/bin/env python3
"""
Enhanced parser that works from within a Docker container.
Accesses other Docker containers via the Docker socket.
"""

import os
import re
import sqlite3
import time
import json
import logging
from datetime import datetime
import docker
from typing import List, Dict, Any, Optional, Tuple

# Configuration from environment variables
RNODE_CONTAINER_NAME = os.getenv('RNODE_CONTAINER_NAME', 'rnode.readonly')
RNODE_NETWORK = os.getenv('RNODE_NETWORK', 'finalizer-bot_default')
DB_PATH = os.getenv('DB_PATH', '/app/data/asi-chain.db')
UPDATE_INTERVAL = int(os.getenv('UPDATE_INTERVAL', '5'))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/enhanced_parser.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DockerNodeParser:
    def __init__(self):
        # Connect to Docker daemon via socket
        self.docker_client = docker.from_env()
        self.db_path = DB_PATH
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database with required tables."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Create tables (same schema as before)
        c.execute('''CREATE TABLE IF NOT EXISTS blocks
                     (block_number INTEGER PRIMARY KEY,
                      block_hash TEXT UNIQUE NOT NULL,
                      parent_hash TEXT NOT NULL,
                      state_hash TEXT NOT NULL,
                      proposer_pub_key TEXT NOT NULL,
                      created_at TIMESTAMP NOT NULL)''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS validators
                     (public_key TEXT PRIMARY KEY,
                      name TEXT NOT NULL)''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS block_validators
                     (block_hash TEXT NOT NULL,
                      validator_pub_key TEXT NOT NULL,
                      PRIMARY KEY (block_hash, validator_pub_key),
                      FOREIGN KEY (block_hash) REFERENCES blocks(block_hash),
                      FOREIGN KEY (validator_pub_key) REFERENCES validators(public_key))''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS deployments
                     (deploy_id TEXT PRIMARY KEY,
                      block_hash TEXT NOT NULL,
                      deployer_pub_key TEXT NOT NULL,
                      term TEXT NOT NULL,
                      cost INTEGER NOT NULL,
                      errors TEXT,
                      created_at TIMESTAMP NOT NULL,
                      FOREIGN KEY (block_hash) REFERENCES blocks(block_hash))''')
        
        # Create indexes
        c.execute('''CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC)''')
        c.execute('''CREATE INDEX IF NOT EXISTS idx_deployments_block_hash ON deployments(block_hash)''')
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {self.db_path}")

    def get_container(self, name: str) -> Optional[docker.models.containers.Container]:
        """Get a container by name, searching across all networks."""
        try:
            # First try direct lookup
            return self.docker_client.containers.get(name)
        except docker.errors.NotFound:
            # Search in all containers
            for container in self.docker_client.containers.list():
                if container.name == name or f"/{name}" in container.attrs['Name']:
                    return container
            logger.error(f"Container {name} not found")
            return None

    def execute_in_container(self, container_name: str, command: str) -> Optional[str]:
        """Execute a command in a container and return output."""
        container = self.get_container(container_name)
        if not container:
            return None
            
        try:
            result = container.exec_run(command, demux=True)
            if result.exit_code == 0:
                stdout, stderr = result.output
                return stdout.decode('utf-8') if stdout else ""
            else:
                logger.error(f"Command failed in {container_name}: {result.output}")
                return None
        except Exception as e:
            logger.error(f"Error executing command in {container_name}: {e}")
            return None

    def parse_blocks(self):
        """Parse blocks from RNode container."""
        logger.info(f"Executing show-blocks on container: {RNODE_CONTAINER_NAME}")
        output = self.execute_in_container(RNODE_CONTAINER_NAME, "/opt/docker/bin/rnode show-blocks")
        if not output:
            logger.warning("No output from show-blocks command")
            return
        
        logger.info(f"Got output from show-blocks, length: {len(output)} chars")
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Parse blocks - handle new ASI Chain format
        blocks = output.strip().split('------------- block ')
        
        for block_data in blocks[1:]:  # Skip first empty element
            try:
                # Extract block number from first line
                lines = block_data.strip().split('\n')
                if not lines:
                    continue
                    
                block_number_match = re.match(r'(\d+) -+', lines[0])
                if not block_number_match:
                    continue
                    
                block_number = int(block_number_match.group(1))
                
                # Parse block fields
                block_hash = ""
                sender = ""
                parent_hash = ""
                timestamp = None
                post_state_hash = ""
                pre_state_hash = ""
                
                for line in lines[1:]:
                    if line.startswith('blockHash:'):
                        block_hash = line.split('"')[1]
                    elif line.startswith('sender:'):
                        sender = line.split('"')[1]
                    elif line.startswith('parentsHashList:'):
                        parent_hash = line.split('"')[1] if '"' in line else ""
                    elif line.startswith('timestamp:'):
                        timestamp_str = line.split(':')[1].strip()
                        timestamp = int(timestamp_str) if timestamp_str.isdigit() else None
                    elif line.startswith('postStateHash:'):
                        post_state_hash = line.split('"')[1]
                    elif line.startswith('preStateHash:'):
                        pre_state_hash = line.split('"')[1]
                
                # Convert timestamp to datetime
                if timestamp:
                    created_at = datetime.fromtimestamp(timestamp / 1000)  # Convert from milliseconds
                else:
                    created_at = datetime.now()
                
                # Insert block
                if block_hash and sender:
                    try:
                        c.execute('''INSERT OR IGNORE INTO blocks 
                                   (block_number, block_hash, parent_hash, state_hash, proposer_pub_key, created_at)
                                   VALUES (?, ?, ?, ?, ?, ?)''',
                                (block_number, block_hash, parent_hash, post_state_hash, sender, created_at))
                        
                        if c.rowcount > 0:
                            logger.info(f"Processed block #{block_number}")
                            # Fetch deployments for this block
                            self.parse_block_deployments(block_hash, c)
                        
                    except sqlite3.IntegrityError as e:
                        logger.debug(f"Block #{block_number} already exists")
                    except Exception as e:
                        logger.error(f"Error inserting block #{block_number}: {e}")
                        
            except Exception as e:
                logger.error(f"Error parsing block data: {e}")
                continue
        
        conn.commit()
        conn.close()

    def parse_block_deployments(self, block_hash: str, cursor):
        """Parse deployments for a specific block."""
        try:
            # Get detailed block info with deployments
            output = self.execute_in_container(RNODE_CONTAINER_NAME, f"/opt/docker/bin/rnode show-block {block_hash}")
            if not output:
                return
            
            # Parse deployments from the output
            lines = output.strip().split('\n')
            in_deploy = False
            deploy_data = {}
            
            for i, line in enumerate(lines):
                if line.startswith('deploys {'):
                    in_deploy = True
                    deploy_data = {}
                elif in_deploy and line == '}':
                    # End of deploy, save it
                    if deploy_data.get('deployer') and deploy_data.get('term'):
                        try:
                            # Use the actual signature as deploy_id, fallback to generated ID if not found
                            deploy_id = deploy_data.get('sig')
                            if not deploy_id:
                                # Fallback to generated ID if signature not found
                                deploy_id = f"{deploy_data.get('deployer', '')[:16]}_{deploy_data.get('timestamp', '0')}"
                                logger.warning(f"No signature found for deployment, using generated ID: {deploy_id}")
                            
                            cursor.execute('''INSERT OR IGNORE INTO deployments 
                                           (deploy_id, block_hash, deployer_pub_key, term, cost, errors, created_at)
                                           VALUES (?, ?, ?, ?, ?, ?, ?)''',
                                        (deploy_id, 
                                         block_hash, 
                                         deploy_data.get('deployer', ''),
                                         deploy_data.get('term', ''),
                                         deploy_data.get('cost', 0),
                                         deploy_data.get('systemDeployError'),
                                         datetime.now()))
                            
                            if cursor.rowcount > 0:
                                logger.debug(f"Added deployment {deploy_id[:64]}... to block {block_hash[:8]}...")
                                
                        except Exception as e:
                            logger.error(f"Error inserting deployment: {e}")
                    
                    in_deploy = False
                    deploy_data = {}
                elif in_deploy:
                    # Parse deployment fields
                    if line.strip().startswith('deployer:'):
                        deploy_data['deployer'] = line.split('"')[1] if '"' in line else ''
                    elif line.strip().startswith('term:'):
                        # Term can be multiline, grab everything after 'term: '
                        term_start = line.find('term:') + 6
                        deploy_data['term'] = line[term_start:].strip().strip('"')
                    elif line.strip().startswith('timestamp:'):
                        deploy_data['timestamp'] = line.split(':')[1].strip()
                    elif line.strip().startswith('sig:'):
                        # Extract the signature (deployment ID)
                        deploy_data['sig'] = line.split('"')[1] if '"' in line else ''
                    elif line.strip().startswith('cost:'):
                        deploy_data['cost'] = int(line.split(':')[1].strip())
                    elif line.strip().startswith('systemDeployError:'):
                        error_start = line.find('systemDeployError:') + 18
                        deploy_data['systemDeployError'] = line[error_start:].strip().strip('"')
                        
        except Exception as e:
            logger.error(f"Error parsing deployments for block {block_hash}: {e}")

    def parse_validators(self):
        """Parse validator information from bonds file."""
        # Try to get validator info from validator1 container
        validator_container = os.getenv('VALIDATOR_CONTAINER_NAME', 'rnode.validator1')
        output = self.execute_in_container(validator_container, "cat /var/lib/rnode/genesis/bonds.txt")
        if not output:
            logger.warning("Could not read bonds.txt")
            return
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        for line in output.strip().split('\n'):
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    pub_key = parts[0]
                    # Simple name generation
                    validator_num = len(parts[0]) % 10
                    name = f"Validator {validator_num}"
                    
                    c.execute('''INSERT OR IGNORE INTO validators (public_key, name) 
                               VALUES (?, ?)''', (pub_key, name))
        
        conn.commit()
        conn.close()

    def run(self):
        """Main loop to continuously parse blockchain data."""
        logger.info(f"Starting blockchain parser for {RNODE_CONTAINER_NAME}")
        logger.info(f"Database: {DB_PATH}")
        logger.info(f"Update interval: {UPDATE_INTERVAL} seconds")
        
        # Initial validator parsing
        self.parse_validators()
        
        while True:
            try:
                logger.info("Starting block parsing cycle...")
                self.parse_blocks()
                logger.info("Block parsing cycle completed")
                time.sleep(UPDATE_INTERVAL)
            except KeyboardInterrupt:
                logger.info("Parser stopped by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                time.sleep(UPDATE_INTERVAL)

if __name__ == "__main__":
    parser = DockerNodeParser()
    parser.run()
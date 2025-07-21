#!/usr/bin/env python3
"""
Enhanced log parser for ASI-Chain Block Explorer.
Combines log parsing with RPC queries to get full block hashes.
"""

import docker
import sqlite3
import time
import re
import os
import json
import subprocess
from datetime import datetime
from collections import defaultdict

# Configuration
RNODE_CONTAINER_NAME = "rnode.readonly"
DB_PATH = "../data/asi-chain.db"
UPDATE_INTERVAL = 5  # seconds between RPC queries

def setup_database(conn):
    """Creates the necessary tables in the SQLite database if they don't exist."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blocks (
            block_number        INTEGER PRIMARY KEY,
            block_hash          TEXT NOT NULL UNIQUE,
            parent_hash         TEXT NOT NULL,
            state_hash          TEXT,
            content_hash        TEXT,
            proposer_pub_key    TEXT,
            created_at          TEXT NOT NULL
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS validators (
            public_key          TEXT PRIMARY KEY,
            name                TEXT
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS block_validators (
            block_hash          TEXT NOT NULL,
            validator_pub_key   TEXT NOT NULL,
            PRIMARY KEY (block_hash, validator_pub_key),
            FOREIGN KEY (block_hash) REFERENCES blocks (block_hash),
            FOREIGN KEY (validator_pub_key) REFERENCES validators (public_key)
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deployments (
            deploy_id           TEXT PRIMARY KEY,
            block_hash          TEXT NOT NULL,
            deployer            TEXT NOT NULL,
            term                TEXT NOT NULL,
            timestamp           INTEGER NOT NULL,
            sig                 TEXT NOT NULL,
            sig_algorithm       TEXT NOT NULL,
            phlo_price          INTEGER NOT NULL,
            phlo_limit          INTEGER NOT NULL,
            phlo_cost           INTEGER,
            valid_after_block   INTEGER,
            errored             BOOLEAN DEFAULT FALSE,
            error_message       TEXT,
            created_at          TEXT NOT NULL,
            FOREIGN KEY (block_hash) REFERENCES blocks (block_hash)
        );
    ''')
    conn.commit()
    print("Database setup complete.")

def get_full_blocks_via_rpc(container_name, depth=10):
    """Query full block data via RPC."""
    try:
        cmd = f"docker exec {container_name} ./bin/rnode show-blocks --depth {depth}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"RPC error: {result.stderr}")
            return []
        
        # Parse the output
        blocks = []
        current_block = {}
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            
            if line.startswith('------------- block'):
                if current_block:
                    blocks.append(current_block)
                current_block = {}
                block_num_match = re.search(r'block (\d+)', line)
                if block_num_match:
                    current_block['block_number'] = int(block_num_match.group(1))
            
            elif line.startswith('blockHash:'):
                current_block['block_hash'] = line.split('"')[1]
            elif line.startswith('sender:'):
                current_block['proposer_pub_key'] = line.split('"')[1]
            elif line.startswith('timestamp:'):
                current_block['timestamp'] = int(line.split(':')[1].strip())
            elif line.startswith('parentsHashList:'):
                current_block['parent_hash'] = line.split('"')[1]
            elif line.startswith('postStateHash:'):
                current_block['state_hash'] = line.split('"')[1]
        
        if current_block:
            blocks.append(current_block)
        
        return blocks
    
    except Exception as e:
        print(f"Error getting blocks via RPC: {e}")
        return []

def get_block_with_deployments(container_name, block_hash):
    """Get detailed block data including deployments."""
    try:
        cmd = f"docker exec {container_name} ./bin/rnode show-block {block_hash}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"RPC error getting block details: {result.stderr}")
            return None
        
        # Parse the block and deployment data
        block_data = {}
        deployments = []
        current_deploy = None
        in_deploy = False
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            
            # Block data
            if line.startswith('blockHash:'):
                block_data['block_hash'] = line.split('"')[1]
            elif line.startswith('deployCount:'):
                block_data['deploy_count'] = int(line.split(':')[1].strip())
            
            # Deployment data
            elif line.startswith('deploys {'):
                if current_deploy:
                    deployments.append(current_deploy)
                current_deploy = {}
                in_deploy = True
            elif in_deploy and line == '}':
                if current_deploy:
                    deployments.append(current_deploy)
                    current_deploy = None
                in_deploy = False
            elif in_deploy and current_deploy is not None:
                if line.startswith('deployer:'):
                    current_deploy['deployer'] = line.split('"')[1]
                elif line.startswith('term:'):
                    # Extract the Rholang term (everything after 'term: "' until the closing '"')
                    term_start = line.find('"') + 1
                    term_end = line.rfind('"')
                    current_deploy['term'] = line[term_start:term_end]
                elif line.startswith('timestamp:'):
                    current_deploy['timestamp'] = int(line.split(':')[1].strip())
                elif line.startswith('sig:'):
                    current_deploy['sig'] = line.split('"')[1]
                elif line.startswith('sigAlgorithm:'):
                    current_deploy['sig_algorithm'] = line.split('"')[1]
                elif line.startswith('phloPrice:'):
                    current_deploy['phlo_price'] = int(line.split(':')[1].strip())
                elif line.startswith('phloLimit:'):
                    current_deploy['phlo_limit'] = int(line.split(':')[1].strip())
                elif line.startswith('validAfterBlockNumber:'):
                    current_deploy['valid_after_block'] = int(line.split(':')[1].strip())
                elif line.startswith('cost:'):
                    current_deploy['phlo_cost'] = int(line.split(':')[1].strip())
                elif line.startswith('errored:'):
                    current_deploy['errored'] = line.split(':')[1].strip().lower() == 'true'
                elif line.startswith('systemDeployError:'):
                    error_msg = line.split('"')[1] if '"' in line else ''
                    current_deploy['error_message'] = error_msg if error_msg else None
        
        return {
            'block': block_data,
            'deployments': deployments
        }
    
    except Exception as e:
        print(f"Error getting block details: {e}")
        return None

def parse_validators_from_logs(container_name, block_numbers):
    """Parse validator information from logs for specific blocks."""
    try:
        client = docker.from_env()
        container = client.containers.get(container_name)
        
        # Get recent logs
        logs = container.logs(tail=5000).decode('utf-8').split('\n')
        
        # Track validators for each block
        block_validators = defaultdict(list)
        current_block = None
        parsing_validators = False
        
        for line in logs:
            # Look for validator list
            if 'ACTIVE VALIDATORS FOR StateHash' in line:
                parsing_validators = True
                continue
            
            # Look for block processing to link validators
            block_match = re.search(r'Block #(\d+)', line)
            if block_match:
                current_block = int(block_match.group(1))
            
            # Parse validator keys
            if parsing_validators and current_block:
                key_match = re.search(r'([0-9a-f]{130})', line)
                if key_match:
                    validator_key = key_match.group(1)
                    if current_block in block_numbers:
                        block_validators[current_block].append(validator_key)
                
                if '***' in line:
                    parsing_validators = False
        
        return block_validators
    
    except Exception as e:
        print(f"Error parsing validators: {e}")
        return {}

def store_blocks_and_validators(conn, blocks, validators_map, container_name):
    """Store blocks, their validators, and deployments in the database."""
    cursor = conn.cursor()
    
    for block in blocks:
        # Convert timestamp to ISO format
        timestamp = datetime.fromtimestamp(block['timestamp'] / 1000).isoformat()
        
        # Store block
        cursor.execute("""
            INSERT OR REPLACE INTO blocks 
            (block_number, block_hash, parent_hash, state_hash, proposer_pub_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            block['block_number'],
            block['block_hash'],
            block.get('parent_hash', ''),
            block.get('state_hash', ''),
            block.get('proposer_pub_key', ''),
            timestamp
        ))
        
        print(f"Stored Block #{block['block_number']} ({block['block_hash'][:20]}...)")
        
        # Store validators for this block
        if block['block_number'] in validators_map:
            for validator_key in validators_map[block['block_number']]:
                # Ensure validator exists
                cursor.execute("INSERT OR IGNORE INTO validators (public_key) VALUES (?)", (validator_key,))
                
                # Link to block
                cursor.execute("""
                    INSERT OR IGNORE INTO block_validators (block_hash, validator_pub_key)
                    VALUES (?, ?)
                """, (block['block_hash'], validator_key))
            
            print(f"  -> Linked {len(validators_map[block['block_number']])} validators")
        
        # Fetch and store deployments for this block
        block_details = get_block_with_deployments(container_name, block['block_hash'])
        if block_details and block_details['deployments']:
            for deploy in block_details['deployments']:
                # Use full signature as deploy ID
                deploy_id = deploy['sig']  # Use complete signature as ID
                
                # Create timestamp for deployment
                deploy_timestamp = datetime.fromtimestamp(deploy['timestamp'] / 1000).isoformat()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO deployments 
                    (deploy_id, block_hash, deployer, term, timestamp, sig, sig_algorithm, 
                     phlo_price, phlo_limit, phlo_cost, valid_after_block, errored, error_message, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    deploy_id,
                    block['block_hash'],
                    deploy['deployer'],
                    deploy['term'],
                    deploy['timestamp'],
                    deploy['sig'],
                    deploy['sig_algorithm'],
                    deploy['phlo_price'],
                    deploy['phlo_limit'],
                    deploy.get('phlo_cost', 0),
                    deploy.get('valid_after_block', 0),
                    deploy.get('errored', False),
                    deploy.get('error_message'),
                    deploy_timestamp
                ))
            
            print(f"  -> Stored {len(block_details['deployments'])} deployments")
    
    conn.commit()

def main():
    """Main function to continuously update block data."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    db_conn = sqlite3.connect(DB_PATH)
    setup_database(db_conn)
    
    print(f"Enhanced parser started. Updating every {UPDATE_INTERVAL} seconds...")
    
    while True:
        try:
            # Get full block data via RPC
            blocks = get_full_blocks_via_rpc(RNODE_CONTAINER_NAME, depth=25)
            
            if blocks:
                print(f"\nFetched {len(blocks)} blocks via RPC")
                
                # Get validator data from logs
                block_numbers = [b['block_number'] for b in blocks]
                validators_map = parse_validators_from_logs(RNODE_CONTAINER_NAME, block_numbers)
                
                # Store everything
                store_blocks_and_validators(db_conn, blocks, validators_map, RNODE_CONTAINER_NAME)
            else:
                print("No blocks fetched. Is the node running?")
            
            time.sleep(UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            print("\nShutting down enhanced parser.")
            db_conn.close()
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(UPDATE_INTERVAL)

if __name__ == "__main__":
    main()
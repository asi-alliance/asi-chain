#!/usr/bin/env python3
"""
Simple fix for truncated deploy IDs by recreating the deployments table with full signatures.
"""

import sqlite3
import subprocess
import os

DB_PATH = "../data/asi-chain.db"
RNODE_CONTAINER_NAME = "rnode.readonly"

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
                elif line.startswith('sig:'):
                    current_deploy['sig'] = line.split('"')[1]
                elif line.startswith('term:'):
                    # Extract the Rholang term (everything after 'term: "' until the closing '"')
                    term_start = line.find('"') + 1
                    term_end = line.rfind('"')
                    current_deploy['term'] = line[term_start:term_end]
                elif line.startswith('timestamp:'):
                    current_deploy['timestamp'] = int(line.split(':')[1].strip())
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

def fix_deploy_ids():
    """Fix all truncated deploy IDs by recreating deployment data."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create a backup table
    cursor.execute("CREATE TABLE IF NOT EXISTS deployments_backup AS SELECT * FROM deployments")
    
    # Get all blocks that have deployments with truncated IDs
    cursor.execute("""
        SELECT DISTINCT block_hash FROM deployments 
        WHERE LENGTH(deploy_id) = 64
        ORDER BY created_at DESC
    """)
    
    blocks_to_fix = cursor.fetchall()
    print(f"Found {len(blocks_to_fix)} blocks with truncated deploy IDs")
    
    # Store updated deployments
    updated_deployments = []
    
    for (block_hash,) in blocks_to_fix:
        print(f"Processing block {block_hash[:20]}...")
        
        # Get the full deployment data from RNode
        block_details = get_block_with_deployments(RNODE_CONTAINER_NAME, block_hash)
        if not block_details or not block_details['deployments']:
            print(f"  -> No deployment data available for block {block_hash[:20]}")
            continue
            
        # Get existing deployments for this block
        cursor.execute("""
            SELECT * FROM deployments 
            WHERE block_hash = ? AND LENGTH(deploy_id) = 64
        """, (block_hash,))
        existing_deployments = cursor.fetchall()
        
        # Match deployments by deployer and first 64 chars of signature
        for deploy in block_details['deployments']:
            full_sig = deploy['sig']
            truncated_sig = full_sig[:64]
            deployer = deploy['deployer']
            
            # Find matching deployment in database
            for existing_row in existing_deployments:
                existing_deploy_id = existing_row[0]
                existing_deployer = existing_row[2]
                existing_sig = existing_row[5]
                
                if (existing_deployer == deployer and 
                    existing_sig.startswith(truncated_sig) and 
                    existing_deploy_id == truncated_sig):
                    
                    # Create updated deployment with full signature
                    updated_deployment = (
                        full_sig,  # deploy_id (full signature)
                        existing_row[1],  # block_hash
                        existing_row[2],  # deployer
                        existing_row[3],  # term
                        existing_row[4],  # timestamp
                        full_sig,  # sig (full signature)
                        existing_row[6],  # sig_algorithm
                        existing_row[7],  # phlo_price
                        existing_row[8],  # phlo_limit
                        existing_row[9],  # phlo_cost
                        existing_row[10], # valid_after_block
                        existing_row[11], # errored
                        existing_row[12], # error_message
                        existing_row[13]  # created_at
                    )
                    updated_deployments.append(updated_deployment)
                    print(f"  -> Updated deploy ID: {existing_deploy_id} -> {full_sig}")
                    break
    
    # Delete old deployments and insert new ones
    print(f"Updating {len(updated_deployments)} deployments...")
    
    # Delete all truncated deployments
    cursor.execute("DELETE FROM deployments WHERE LENGTH(deploy_id) = 64")
    
    # Insert updated deployments
    cursor.executemany("""
        INSERT INTO deployments 
        (deploy_id, block_hash, deployer, term, timestamp, sig, sig_algorithm, 
         phlo_price, phlo_limit, phlo_cost, valid_after_block, errored, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, updated_deployments)
    
    conn.commit()
    conn.close()
    print("Deploy ID fix completed!")

if __name__ == "__main__":
    fix_deploy_ids()
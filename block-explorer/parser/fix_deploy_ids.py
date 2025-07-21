#!/usr/bin/env python3
"""
Fix truncated deploy IDs in the database by updating them with full signatures.
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
        
        return {
            'block': block_data,
            'deployments': deployments
        }
    
    except Exception as e:
        print(f"Error getting block details: {e}")
        return None

def fix_deploy_ids():
    """Fix all truncated deploy IDs in the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all blocks that have deployments
    cursor.execute("""
        SELECT DISTINCT block_hash FROM deployments 
        WHERE LENGTH(deploy_id) = 64
        ORDER BY created_at DESC
    """)
    
    blocks_to_fix = cursor.fetchall()
    print(f"Found {len(blocks_to_fix)} blocks with truncated deploy IDs")
    
    for (block_hash,) in blocks_to_fix:
        print(f"Fixing deployments for block {block_hash[:20]}...")
        
        # Get the full deployment data from RNode
        block_details = get_block_with_deployments(RNODE_CONTAINER_NAME, block_hash)
        if not block_details or not block_details['deployments']:
            print(f"  -> No deployment data available for block {block_hash[:20]}")
            continue
            
        # Get existing deployments for this block
        cursor.execute("""
            SELECT deploy_id, deployer, sig FROM deployments 
            WHERE block_hash = ?
        """, (block_hash,))
        existing_deployments = cursor.fetchall()
        
        # Match deployments by deployer and first 64 chars of signature
        for deploy in block_details['deployments']:
            full_sig = deploy['sig']
            truncated_sig = full_sig[:64]
            deployer = deploy['deployer']
            
            # Find matching deployment in database
            for existing_deploy_id, existing_deployer, existing_sig in existing_deployments:
                if (existing_deployer == deployer and 
                    existing_sig.startswith(truncated_sig) and 
                    existing_deploy_id == truncated_sig):
                    
                    # Since deploy_id is a primary key, we need to delete and re-insert
                    # First, get all the existing data for this deployment
                    cursor.execute("""
                        SELECT * FROM deployments 
                        WHERE deploy_id = ? AND block_hash = ?
                    """, (existing_deploy_id, block_hash))
                    
                    existing_data = cursor.fetchone()
                    if existing_data:
                        # Delete the old record
                        cursor.execute("""
                            DELETE FROM deployments 
                            WHERE deploy_id = ? AND block_hash = ?
                        """, (existing_deploy_id, block_hash))
                        
                        # Insert with new deploy_id (full signature)
                        cursor.execute("""
                            INSERT INTO deployments 
                            (deploy_id, block_hash, deployer, term, timestamp, sig, sig_algorithm, 
                             phlo_price, phlo_limit, phlo_cost, valid_after_block, errored, error_message, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            full_sig,  # New deploy_id (full signature)
                            existing_data[1],  # block_hash
                            existing_data[2],  # deployer
                            existing_data[3],  # term
                            existing_data[4],  # timestamp
                            full_sig,  # sig (full signature)
                            existing_data[6],  # sig_algorithm
                            existing_data[7],  # phlo_price
                            existing_data[8],  # phlo_limit
                            existing_data[9],  # phlo_cost
                            existing_data[10], # valid_after_block
                            existing_data[11], # errored
                            existing_data[12], # error_message
                            existing_data[13]  # created_at
                        ))
                    
                    print(f"  -> Updated deploy ID: {existing_deploy_id} -> {full_sig}")
                    break
        
        conn.commit()
    
    conn.close()
    print("Deploy ID fix completed!")

if __name__ == "__main__":
    fix_deploy_ids()
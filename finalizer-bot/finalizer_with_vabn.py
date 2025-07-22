#!/usr/bin/env python3
"""
Finalizer Bot with validAfterBlockNumber Support

This version uses the patched CLI to set validAfterBlockNumber dynamically,
ensuring deploys remain valid even past block 50.
"""

import subprocess
import time
import os
import random
import string
import re

# Configuration
RETRY_INTERVAL = int(os.environ.get("RETRY_INTERVAL", "2"))
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "10"))

# List of validators with their ports
VALIDATORS = [
    {
        "name": "rnode.bootstrap",
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator1", 
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator2",
        "deploy_port": 40401,
        "propose_port": 40402
    },
    {
        "name": "rnode.validator3",
        "deploy_port": 40401,
        "propose_port": 40402
    }
]

# Observer node configuration
OBSERVER_PORT = 40403

def run_command(cmd, description="", retries=MAX_RETRIES):
    """Execute a command with retry logic."""
    for attempt in range(retries):
        try:
            print(f"\n[Attempt {attempt + 1}/{retries}] {description}")
            print(f"Running: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"Success: {result.stdout}")
            return result.stdout
            
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr or e.stdout or str(e)
            print(f"Error: {error_msg}")
            
            if any(err in error_msg for err in [
                "Connection refused",
                "Error: Could not deploy, casper instance was not available yet",
                "casper instance was not available yet"
            ]):
                if attempt < retries - 1:
                    print(f"Node not ready, waiting {RETRY_INTERVAL} seconds before retry...")
                    time.sleep(RETRY_INTERVAL)
                    continue
            
            raise
    
    raise Exception(f"Failed after {retries} attempts")

def get_current_block_number():
    """Query the observer node to get the current block height."""
    try:
        cmd = [
            "./node_cli",
            "last-finalized-block",
            "--host", "rnode.readonly",
            "--port", str(OBSERVER_PORT)
        ]
        
        output = run_command(cmd, "Getting current block number", retries=3)
        
        # Parse block number from output
        match = re.search(r'"blockNumber":\s*(\d+)', output)
        if match:
            return int(match.group(1))
        
        print("Warning: Could not parse block number, using 0")
        return 0
        
    except Exception as e:
        print(f"Error getting block number: {e}")
        return 0

def generate_unique_deploy(validator_name, block_num):
    """Generate a unique Rholang contract for deployment."""
    timestamp = int(time.time() * 1000)
    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    contract = f'new ch_{timestamp}_{nonce} in {{ ch_{timestamp}_{nonce}!({{ "validator": "{validator_name}", "block": {block_num}, "timestamp": {timestamp}, "nonce": "{nonce}" }}) }}'
    
    print(f"Generated deploy for block {block_num}: {contract[:80]}...")
    return contract

def deploy_contract(validator, current_block_number):
    """Deploy a contract with validAfterBlockNumber set to current block."""
    contract = generate_unique_deploy(validator['name'], current_block_number)
    
    # Create temporary file for the contract
    deploy_file = f"deploy_{int(time.time() * 1000)}.rho"
    with open(deploy_file, "w") as f:
        f.write(contract)
    
    try:
        # Deploy with validAfterBlockNumber set to current block
        deploy_cmd = [
            "./node_cli",
            "deploy",
            "--host", validator['name'],
            "--port", str(validator['deploy_port']),
            "--file", deploy_file,
            "--private-key", "aebb63dc0d50e4dd29ddd94fb52103bfe0dc4941fa0c2c8a9082a191af35ffa1",
            "--valid-after-block-number", str(current_block_number)
        ]
        
        output = run_command(
            deploy_cmd, 
            f"Deploying to {validator['name']} with VABN={current_block_number}"
        )
        
        print(f"✅ Deploy valid from block {current_block_number} to {current_block_number + 50}")
        
        return output
        
    finally:
        # Always clean up the file
        if os.path.exists(deploy_file):
            os.remove(deploy_file)

def propose_block(validator):
    """Propose a block on the specified validator."""
    propose_cmd = [
        "./node_cli",
        "propose", 
        "--host", validator['name'],
        "--port", str(validator['propose_port'])
    ]
    
    return run_command(
        propose_cmd,
        f"Proposing on {validator['name']} on port {validator['propose_port']}"
    )

def main():
    """Main loop to continuously deploy and propose blocks."""
    print("=== Finalizer Bot with validAfterBlockNumber Support ===")
    print(f"Retry interval: {RETRY_INTERVAL} seconds")
    print(f"Max retries: {MAX_RETRIES}")
    print(f"Validators: {[v['name'] for v in VALIDATORS]}")
    print("\nThis version sets validAfterBlockNumber dynamically to ensure")
    print("deploys remain valid even past block 50!\n")
    
    # Ensure keys directory exists
    os.makedirs("keys", exist_ok=True)
    
    # Track iterations
    iteration = 0
    validator_index = 0
    blocks_past_50 = 0
    
    # Wait a bit for nodes to be ready
    print("Waiting 30 seconds for nodes to initialize...")
    time.sleep(30)
    
    while True:
        iteration += 1
        print(f"\n{'='*60}")
        print(f"Iteration {iteration}")
        print(f"{'='*60}")
        
        # Get current validator
        validator = VALIDATORS[validator_index]
        print(f"\n🔌 Working with {validator['name']}")
        
        # Move to next validator (happens regardless of success/failure)
        validator_index = (validator_index + 1) % len(VALIDATORS)
        
        try:
            # Get current block number
            current_block = get_current_block_number()
            print(f"📊 Current block: {current_block}")
            
            # Check if we've passed block 50
            if current_block >= 50:
                blocks_past_50 = current_block - 50
                print(f"🎉 Network has produced {blocks_past_50} blocks past the original limit!")
                print(f"✅ validAfterBlockNumber feature is working!")
            elif current_block >= 45:
                print(f"⚠️  Approaching block 50 (currently at {current_block})")
            
            # Deploy contract with current block as validAfterBlockNumber
            deploy_output = deploy_contract(validator, current_block)
            
            # Small delay between deploy and propose
            time.sleep(2)
            
            # Propose block
            propose_output = propose_block(validator)
            
            # Print summary
            print(f"\n📈 Summary:")
            print(f"- Current block: {current_block}")
            print(f"- Deploy valid from: {current_block} to {current_block + 50}")
            if blocks_past_50 > 0:
                print(f"- Blocks past original limit: {blocks_past_50}")
            
        except Exception as e:
            print(f"\n❌ Error in main loop: {e}")
            print("Continuing to next iteration...")
        
        # Wait before next iteration
        print(f"\nWaiting {RETRY_INTERVAL} seconds before next iteration...")
        time.sleep(RETRY_INTERVAL)

if __name__ == "__main__":
    main()
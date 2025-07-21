#!/usr/bin/env python3
"""
Extract REV transfers from ASI-Chain blocks.
This script demonstrates how to identify and extract REV transfer data.
"""

import re
import json
import subprocess
import requests
from typing import Dict, List, Optional, Tuple

class RevTransferExtractor:
    def __init__(self, rnode_host: str = "rnode.readonly", rnode_port: int = 40403):
        self.rnode_host = rnode_host
        self.rnode_port = rnode_port
        self.api_base = f"http://{rnode_host}:{rnode_port}/api"
        
    def get_block_details(self, block_hash: str) -> Optional[Dict]:
        """Get full block details via RNode CLI."""
        try:
            cmd = f"docker exec {self.rnode_host} ./bin/rnode show-block {block_hash}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Error getting block details: {result.stderr}")
                return None
            return self._parse_block_output(result.stdout)
        except Exception as e:
            print(f"Error getting block details: {e}")
            return None
    
    def get_block_transactions(self, block_hash: str) -> Optional[Dict]:
        """Get transaction data via the Transaction API."""
        try:
            url = f"{self.api_base}/transaction/{block_hash}"
            response = requests.get(url)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Transaction API error: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error getting transactions: {e}")
            return None
    
    def _parse_block_output(self, output: str) -> Dict:
        """Parse the text output from show-block command."""
        block_data = {
            'deploys': [],
            'systemDeploys': []
        }
        
        current_deploy = None
        in_deploy = False
        in_system_deploy = False
        
        for line in output.split('\n'):
            line = line.strip()
            
            # Deploy section markers
            if line.startswith('deploys {'):
                in_deploy = True
                current_deploy = {}
            elif line == '}' and in_deploy and current_deploy:
                block_data['deploys'].append(current_deploy)
                current_deploy = None
                in_deploy = False
            
            # System deploy markers
            elif line.startswith('systemDeploys {'):
                in_system_deploy = True
                current_deploy = {'type': 'system'}
            elif line == '}' and in_system_deploy and current_deploy:
                block_data['systemDeploys'].append(current_deploy)
                current_deploy = None
                in_system_deploy = False
            
            # Parse deploy fields
            elif (in_deploy or in_system_deploy) and current_deploy is not None:
                if line.startswith('term:'):
                    # Extract the Rholang term
                    term_match = re.search(r'term:\s*"(.+)"', line)
                    if term_match:
                        current_deploy['term'] = term_match.group(1)
                elif line.startswith('deployer:'):
                    deployer_match = re.search(r'deployer:\s*"([^"]+)"', line)
                    if deployer_match:
                        current_deploy['deployer'] = deployer_match.group(1)
                elif line.startswith('sig:'):
                    sig_match = re.search(r'sig:\s*"([^"]+)"', line)
                    if sig_match:
                        current_deploy['sig'] = sig_match.group(1)
                elif line.startswith('cost:'):
                    cost_match = re.search(r'cost:\s*(\d+)', line)
                    if cost_match:
                        current_deploy['cost'] = int(cost_match.group(1))
        
        return block_data
    
    def is_rev_transfer(self, deploy_term: str) -> bool:
        """Check if a deploy contains a REV transfer."""
        patterns = [
            r'@RevVault!\s*\(\s*"transfer"',
            r'revVault!\s*\(\s*"transfer"',
            r'@\w+Vault!\s*\(\s*"transfer"',
            r'vault!\s*\(\s*"transfer"'
        ]
        return any(re.search(pattern, deploy_term, re.IGNORECASE) for pattern in patterns)
    
    def extract_transfer_params(self, deploy_term: str) -> Optional[Dict]:
        """Extract transfer parameters from Rholang term."""
        # Pattern to match various transfer formats
        patterns = [
            # @vault!("transfer", toAddress, amount, *key, *ret)
            r'vault!\s*\(\s*"transfer"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,',
            # @vault!("transfer", toAddress, amount, authKey, *ret)
            r'vault!\s*\(\s*"transfer"\s*,\s*([^,]+)\s*,\s*(\d+)\s*,',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, deploy_term, re.IGNORECASE)
            if match:
                to_address = match.group(1).strip('"')
                amount = int(match.group(2))
                return {
                    'to_address': to_address,
                    'amount': amount
                }
        return None
    
    def extract_deployer_address(self, deploy: Dict) -> Optional[str]:
        """Extract deployer's REV address from deploy data."""
        # In a real implementation, this would convert the public key to REV address
        # For now, return the deployer public key
        return deploy.get('deployer')
    
    def analyze_block_for_transfers(self, block_hash: str) -> List[Dict]:
        """Analyze a block and extract all REV transfers."""
        transfers = []
        
        # Get block details
        block_data = self.get_block_details(block_hash)
        if not block_data:
            return transfers
        
        # Get transaction data from API (if available)
        tx_data = self.get_block_transactions(block_hash)
        
        # Process user deploys
        for deploy in block_data.get('deploys', []):
            term = deploy.get('term', '')
            if self.is_rev_transfer(term):
                transfer_params = self.extract_transfer_params(term)
                if transfer_params:
                    transfer = {
                        'type': 'REV_TRANSFER',
                        'deploy_id': deploy.get('sig'),
                        'from_address': self.extract_deployer_address(deploy),
                        'to_address': transfer_params['to_address'],
                        'amount': transfer_params['amount'],
                        'gas_cost': deploy.get('cost', 0),
                        'status': 'failed' if deploy.get('errored') else 'success',
                        'error_message': deploy.get('systemDeployError'),
                        'term': term
                    }
                    transfers.append(transfer)
                    print(f"Found REV transfer: {transfer_params['amount']} to {transfer_params['to_address']}")
        
        # Process system deploys for additional info
        for sys_deploy in block_data.get('systemDeploys', []):
            # System deploys like PreCharge and Refund are related to transfers
            pass
        
        return transfers
    
    def query_rev_vault_logs(self, rev_address: str, depth: int = 10) -> Optional[List]:
        """Query RevVault logs for a specific address."""
        # This would use the data-at-name API to query vault logs
        # Implementation depends on knowing the vault's unforgeable name
        pass

def main():
    """Example usage of the RevTransferExtractor."""
    extractor = RevTransferExtractor()
    
    # Example: Get recent blocks and check for transfers
    print("REV Transfer Extractor")
    print("=" * 50)
    
    # Get recent blocks (would normally query for block hashes)
    # For demo, you would provide actual block hashes
    example_block_hashes = [
        # Add your block hashes here
    ]
    
    for block_hash in example_block_hashes:
        print(f"\nAnalyzing block: {block_hash}")
        transfers = extractor.analyze_block_for_transfers(block_hash)
        
        if transfers:
            print(f"Found {len(transfers)} REV transfers:")
            for transfer in transfers:
                print(f"  - {transfer['amount']} REV from {transfer['from_address'][:10]}... to {transfer['to_address']}")
                print(f"    Gas cost: {transfer['gas_cost']}, Status: {transfer['status']}")
        else:
            print("  No REV transfers found")
    
    # Example: Check a specific deploy term
    example_deploy_term = '''
    new return, rl(`rho:registry:lookup`), RevVaultCh, vaultCh, revAddrCh, deployerId(`rho:rchain:deployerId`), stdout(`rho:io:stdout`) in {
        rl!(`rho:rchain:revVault`, *RevVaultCh) |
        for (@(_, RevVault) <- RevVaultCh) {
            @RevVault!("findOrCreate", "11112Eso3ipGQ6bmibhiHbUdpE6fPgVpPMSwfqLHYvgXyVLwbKGiAL", *vaultCh) |
            for (@(true, vault) <- vaultCh) {
                @vault!("transfer", "1111K9MczqzZrNkUNmNGrNFyz7F7LiCUgaCHXd28g2k5PxiaNusjS", 50000000, *deployerId, *return)
            }
        }
    }
    '''
    
    print("\n" + "=" * 50)
    print("Analyzing example deploy term:")
    if extractor.is_rev_transfer(example_deploy_term):
        params = extractor.extract_transfer_params(example_deploy_term)
        if params:
            print(f"Transfer found: {params['amount']} REV to {params['to_address']}")
    else:
        print("No transfer found in deploy term")

if __name__ == "__main__":
    main()
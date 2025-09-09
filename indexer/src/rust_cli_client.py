"""Rust CLI client for interacting with ASI-Chain nodes."""

import asyncio
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import structlog
from pathlib import Path

from src.config import settings

logger = structlog.get_logger(__name__)


class RustCLIClient:
    """Client for interacting with ASI-Chain using rust-client CLI."""
    
    def __init__(self, cli_path: str = None, node_host: str = None, grpc_port: int = None, http_port: int = None):
        """Initialize the Rust CLI client.
        
        Args:
            cli_path: Path to the node_cli executable
            node_host: Host of the node (default from settings)
            grpc_port: gRPC port for blockchain operations
            http_port: HTTP port for status queries
        """
        self.cli_path = cli_path or settings.rust_cli_path or "/rust-client/target/release/node_cli"
        self.node_host = node_host or settings.node_host or "localhost"
        self.grpc_port = grpc_port or settings.grpc_port or 40412
        self.http_port = http_port or settings.http_port or 40413
        
        # Verify CLI exists
        if not Path(self.cli_path).exists():
            raise FileNotFoundError(f"Rust CLI not found at {self.cli_path}")
    
    async def _run_command(self, command: List[str], timeout: int = 30) -> Tuple[str, str]:
        """Run a CLI command and return stdout and stderr.
        
        Args:
            command: Command arguments (without the CLI path)
            timeout: Command timeout in seconds
            
        Returns:
            Tuple of (stdout, stderr)
        """
        full_command = [self.cli_path] + command
        
        logger.debug(f"Running command: {' '.join(full_command)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *full_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            stdout_str = stdout.decode('utf-8')
            stderr_str = stderr.decode('utf-8')
            
            if process.returncode != 0:
                logger.error(f"Command failed: {stderr_str}")
                raise RuntimeError(f"CLI command failed: {stderr_str}")
            
            return stdout_str, stderr_str
            
        except asyncio.TimeoutError:
            logger.error(f"Command timed out after {timeout}s")
            raise
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            raise
    
    def _parse_json_from_output(self, output: str) -> Dict[str, Any]:
        """Extract JSON from CLI output.
        
        Many commands output status messages before the JSON.
        This finds and parses the JSON portion.
        """
        # Find JSON by looking for opening brace
        json_start = output.find('{')
        if json_start == -1:
            # Try to find JSON array
            json_start = output.find('[')
            if json_start == -1:
                raise ValueError("No JSON found in output")
        
        json_str = output[json_start:]
        
        # Handle case where there might be text after JSON
        # Try to parse progressively smaller strings until successful
        for i in range(len(json_str), 0, -1):
            try:
                return json.loads(json_str[:i])
            except json.JSONDecodeError:
                continue
        
        raise ValueError(f"Could not parse JSON from output: {output}")
    
    async def get_last_finalized_block(self) -> Optional[Dict[str, Any]]:
        """Get the last finalized block.
        
        Returns:
            Block info dict or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "last-finalized-block",
                "-H", self.node_host,
                "-p", str(self.http_port)
            ])
            
            # Parse the text output for last-finalized-block
            block_info = {}
            lines = stdout.strip().split('\n')
            
            for line in lines:
                # Parse block number
                if "Block Number:" in line:
                    match = re.search(r'Block Number:\s*(\d+)', line)
                    if match:
                        block_info["blockNumber"] = int(match.group(1))
                
                # Parse block hash
                elif "Block Hash:" in line:
                    match = re.search(r'Block Hash:\s*([a-f0-9]+)', line)
                    if match:
                        block_info["blockHash"] = match.group(1)
                
                # Parse timestamp
                elif "Timestamp:" in line:
                    match = re.search(r'Timestamp:\s*(\d+)', line)
                    if match:
                        block_info["timestamp"] = int(match.group(1))
                
                # Parse deploy count
                elif "Deploy Count:" in line:
                    match = re.search(r'Deploy Count:\s*(\d+)', line)
                    if match:
                        block_info["deployCount"] = int(match.group(1))
            
            return block_info if block_info else None
            
        except Exception as e:
            logger.error(f"Failed to get last finalized block: {e}")
            return None
    
    async def get_blocks_by_height(self, start: int, end: int) -> List[Dict[str, Any]]:
        """Get blocks within a height range.
        
        Args:
            start: Starting block number (inclusive)
            end: Ending block number (inclusive)
            
        Returns:
            List of block summaries
        """
        try:
            stdout, _ = await self._run_command([
                "get-blocks-by-height",
                "-s", str(start),
                "-e", str(end),
                "-H", self.node_host,
                "-p", str(self.grpc_port)
            ], timeout=60)  # Longer timeout for potentially many blocks
            
            # Extract blocks from output
            # The output contains status messages and then block info
            blocks = []
            lines = stdout.strip().split('\n')
            
            # Look for block entries
            current_block = {}
            for line in lines:
                # Parse block number
                if "Block #" in line:
                    if current_block:
                        blocks.append(current_block)
                    match = re.search(r'Block #(\d+):', line)
                    if match:
                        current_block = {"blockNumber": int(match.group(1))}
                
                # Parse other fields
                elif "🔗 Hash:" in line or "Hash:" in line:
                    match = re.search(r'Hash:\s*([a-f0-9]+)', line)
                    if match and current_block:
                        current_block["blockHash"] = match.group(1)
                
                elif "👤 Sender:" in line or "Sender:" in line:
                    match = re.search(r'Sender:\s*([a-f0-9]+)', line)
                    if match and current_block:
                        current_block["sender"] = match.group(1)
                
                elif "⏰ Timestamp:" in line or "Timestamp:" in line:
                    match = re.search(r'Timestamp:\s*(\d+)', line)
                    if match and current_block:
                        current_block["timestamp"] = int(match.group(1))
                
                elif "📦 Deploy Count:" in line or "Deploy Count:" in line:
                    match = re.search(r'Deploy Count:\s*(\d+)', line)
                    if match and current_block:
                        current_block["deployCount"] = int(match.group(1))
                
                elif "⚖️  Fault Tolerance:" in line or "Fault Tolerance:" in line:
                    match = re.search(r'Fault Tolerance:\s*([\d.]+)', line)
                    if match and current_block:
                        current_block["faultTolerance"] = float(match.group(1))
            
            # Don't forget the last block
            if current_block:
                blocks.append(current_block)
            
            return blocks
            
        except Exception as e:
            logger.error(f"Failed to get blocks by height {start}-{end}: {e}")
            return []
    
    async def get_block_details(self, block_hash: str) -> Optional[Dict[str, Any]]:
        """Get detailed block information including deployments.
        
        Args:
            block_hash: Block hash
            
        Returns:
            Complete block data with deployments
        """
        try:
            stdout, _ = await self._run_command([
                "blocks",
                "--block-hash", block_hash,
                "-H", self.node_host,
                "-p", str(self.http_port)
            ], timeout=30)
            
            # Parse the JSON response
            return self._parse_json_from_output(stdout)
            
        except Exception as e:
            logger.error(f"Failed to get block details for {block_hash}: {e}")
            return None
    
    async def get_deploy_info(self, deploy_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment information by ID.
        
        Args:
            deploy_id: Deployment signature/ID
            
        Returns:
            Deployment data or None if not found
        """
        try:
            stdout, _ = await self._run_command([
                "get-deploy",
                "-d", deploy_id,
                "--format", "json",
                "-H", self.node_host,
                "--http-port", str(self.http_port)
            ])
            
            # Parse the JSON response
            return self._parse_json_from_output(stdout)
            
        except Exception as e:
            logger.error(f"Failed to get deploy {deploy_id}: {e}")
            return None
    
    async def get_bonds(self) -> Optional[Dict[str, Any]]:
        """Get current validator bonds.
        
        Returns:
            Bonds data or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "bonds",
                "-H", self.node_host,
                "-p", str(self.http_port)
            ])
            
            # Parse bonds from output
            bonds = []
            lines = stdout.strip().split('\n')
            
            for line in lines:
                # Look for lines with validator info
                # New format: "1. 04837a4c...b2df065f (stake: 1000)"
                # Old format: "Validator: <pubkey> | Stake: <amount> REV"
                
                # Try new format first (abbreviated keys with stake in parentheses)
                match = re.search(r'([a-f0-9]{8})\.\.\.([a-f0-9]{8})\s*\(stake:\s*([\d,]+)\)', line)
                if match:
                    # Reconstruct a partial key (we don't have the full key in this format)
                    # For now, use the abbreviated form as the identifier
                    validator_key = f"{match.group(1)}...{match.group(2)}"
                    stake = int(match.group(3).replace(',', ''))
                    bonds.append({
                        "validator": validator_key,
                        "stake": stake
                    })
                else:
                    # Try old format
                    match = re.search(r'Validator:\s*([a-f0-9]+)\s*\|\s*Stake:\s*([\d,]+)\s*REV', line)
                    if match:
                        bonds.append({
                            "validator": match.group(1),
                            "stake": int(match.group(2).replace(',', ''))
                        })
            
            return {"bonds": bonds}
            
        except Exception as e:
            logger.error(f"Failed to get bonds: {e}")
            return None
    
    async def get_active_validators(self) -> Optional[List[Dict[str, Any]]]:
        """Get list of active validators with their stake.
        
        Returns:
            List of validator dicts with 'validator' and 'stake' keys or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "active-validators",
                "-H", self.node_host,
                "-p", str(self.http_port)
            ])
            
            # Parse validator list from output
            validators = []
            lines = stdout.strip().split('\n')
            
            for line in lines:
                # Look for lines with validator info like:
                # 1. 04837a4c...b2df065f (stake: 50000000000000)
                match = re.search(r'([0-9a-fA-F]{8}\.\.\.?[0-9a-fA-F]{8})\s*\(stake:\s*(\d+)\)', line)
                if match:
                    # This is abbreviated, need to find full key in previous lines
                    abbreviated = match.group(1)
                    stake = int(match.group(2))
                    
                    # Look for full key that matches the abbreviation
                    prefix = abbreviated.split('...')[0]
                    suffix = abbreviated.split('...')[-1]
                    
                    # Search all lines for full key
                    for check_line in lines:
                        full_match = re.search(r'([0-9a-fA-F]{130})', check_line)
                        if full_match:
                            full_key = full_match.group(1)
                            if full_key.startswith(prefix) and full_key.endswith(suffix):
                                validators.append({
                                    'validator': full_key,
                                    'stake': stake
                                })
                                break
                else:
                    # Try to match full format with stake on same line
                    match = re.search(r'([0-9a-fA-F]{130})\s*\(stake:\s*(\d+)\)', line)
                    if match:
                        validators.append({
                            'validator': match.group(1),
                            'stake': int(match.group(2))
                        })
            
            return validators if validators else None
            
        except Exception as e:
            logger.error(f"Failed to get active validators: {e}")
            return None
    
    async def get_epoch_info(self) -> Optional[Dict[str, Any]]:
        """Get current epoch information.
        
        Returns:
            Epoch data or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "epoch-info",
                "-H", self.node_host,
                "-p", str(40452)  # Observer port for PoS queries
            ])
            
            # Parse epoch info from output
            epoch_info = {}
            lines = stdout.strip().split('\n')
            
            for line in lines:
                # Current Epoch: X
                match = re.search(r'Current Epoch:\s*(\d+)', line)
                if match:
                    epoch_info["current_epoch"] = int(match.group(1))
                
                # Epoch Length: X blocks
                match = re.search(r'Epoch Length:\s*(\d+)\s*blocks', line)
                if match:
                    epoch_info["epoch_length"] = int(match.group(1))
                
                # Quarantine Length: X blocks
                match = re.search(r'Quarantine Length:\s*(\d+)\s*blocks', line)
                if match:
                    epoch_info["quarantine_length"] = int(match.group(1))
                
                # Blocks Until Next Epoch: X
                match = re.search(r'Blocks Until Next Epoch:\s*(\d+)', line)
                if match:
                    epoch_info["blocks_until_next_epoch"] = int(match.group(1))
            
            return epoch_info
            
        except Exception as e:
            logger.error(f"Failed to get epoch info: {e}")
            return None
    
    async def show_block_deploys(self, block_number: int) -> Optional[List[Dict[str, Any]]]:
        """Get deployments from a specific block.
        
        Args:
            block_number: The block number to query
            
        Returns:
            List of deployment dicts or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "show-deploys",
                "-b", str(block_number),
                "-H", self.node_host,
                "-p", str(self.http_port)
            ])
            
            # Parse deployments from output
            deploys = []
            current_deploy = {}
            in_term = False
            
            for line in stdout.strip().split('\n'):
                if "Deploy ID:" in line:
                    # Save previous deploy if exists
                    if current_deploy:
                        deploys.append(current_deploy)
                    current_deploy = {}
                    in_term = False
                    match = re.search(r'Deploy ID:\s*([a-f0-9]+)', line)
                    if match:
                        current_deploy['deployId'] = match.group(1)
                elif "Deployer:" in line:
                    match = re.search(r'Deployer:\s*([a-f0-9]+)', line)
                    if match:
                        current_deploy['deployer'] = match.group(1)
                elif "Term:" in line:
                    # The term starts after "Term:"
                    current_deploy['term'] = line.split("Term:", 1)[1].strip()
                    in_term = True
                elif in_term and line.strip() and not any(x in line for x in ["Deploy ID:", "Deployer:", "Timestamp:"]):
                    # Continue adding to term if it's multi-line
                    current_deploy['term'] = current_deploy.get('term', '') + '\n' + line
                elif "Timestamp:" in line:
                    in_term = False
                    match = re.search(r'Timestamp:\s*(\d+)', line)
                    if match:
                        current_deploy['timestamp'] = int(match.group(1))
            
            # Don't forget the last deployment
            if current_deploy:
                deploys.append(current_deploy)
            
            return deploys if deploys else None
                
        except Exception as e:
            logger.error(f"Failed to get block deploys: {e}")
            return None
    
    async def get_network_consensus(self) -> Optional[Dict[str, Any]]:
        """Get network consensus overview.
        
        Returns:
            Consensus data or None if request fails
        """
        try:
            stdout, _ = await self._run_command([
                "network-consensus",
                "-H", self.node_host,
                "-p", str(40452)  # Observer port
            ])
            
            # Parse consensus info from output
            consensus = {}
            lines = stdout.strip().split('\n')
            
            for line in lines:
                # Current Block: X
                match = re.search(r'Current Block:\s*(\d+)', line)
                if match:
                    consensus["current_block"] = int(match.group(1))
                
                # Total Bonded Validators: X
                match = re.search(r'Total Bonded Validators:\s*(\d+)', line)
                if match:
                    consensus["total_bonded_validators"] = int(match.group(1))
                
                # Active Validators: X
                match = re.search(r'Active Validators:\s*(\d+)', line)
                if match:
                    consensus["active_validators"] = int(match.group(1))
                
                # Validators in Quarantine: X
                match = re.search(r'Validators in Quarantine:\s*(\d+)', line)
                if match:
                    consensus["validators_in_quarantine"] = int(match.group(1))
                
                # Participation Rate: X%
                match = re.search(r'Participation Rate:\s*([\d.]+)%', line)
                if match:
                    consensus["participation_rate"] = float(match.group(1))
                
                # Consensus Status: Healthy/Degraded
                if "🟢 Healthy" in line:
                    consensus["status"] = "healthy"
                elif "🟡 Degraded" in line:
                    consensus["status"] = "degraded"
                elif "🔴 Critical" in line:
                    consensus["status"] = "critical"
            
            return consensus
            
        except Exception as e:
            logger.error(f"Failed to get network consensus: {e}")
            return None
    
    async def show_main_chain(self, depth: int = 10) -> Optional[List[Dict[str, Any]]]:
        """Get blocks from the main chain for verification.
        
        Args:
            depth: Number of blocks to fetch
            
        Returns:
            List of main chain blocks or None
        """
        try:
            stdout, _ = await self._run_command([
                "show-main-chain",
                "-d", str(depth),
                "-H", self.node_host,
                "-p", str(self.grpc_port)
            ])
            
            # Parse similar to get_blocks_by_height
            blocks = []
            lines = stdout.strip().split('\n')
            
            current_block = {}
            for line in lines:
                if "Block #" in line:
                    if current_block:
                        blocks.append(current_block)
                    match = re.search(r'Block #(\d+):', line)
                    if match:
                        current_block = {"blockNumber": int(match.group(1))}
                
                elif "Hash:" in line:
                    match = re.search(r'Hash:\s*([a-f0-9]+)', line)
                    if match and current_block:
                        current_block["blockHash"] = match.group(1)
                
                elif "Parent:" in line:
                    match = re.search(r'Parent:\s*([a-f0-9]+)', line)
                    if match and current_block:
                        current_block["parentHash"] = match.group(1)
            
            if current_block:
                blocks.append(current_block)
            
            return blocks
            
        except Exception as e:
            logger.error(f"Failed to get main chain: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check if the node is healthy and responding.
        
        Returns:
            True if node is healthy, False otherwise
        """
        try:
            last_block = await self.get_last_finalized_block()
            return last_block is not None
        except Exception:
            return False
"""RChain node HTTP API client."""

import asyncio
from typing import Dict, List, Optional, Any
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import settings
import structlog

logger = structlog.get_logger(__name__)


class RChainClient:
    """Client for interacting with RChain node HTTP API."""
    
    def __init__(self, node_url: str = None, timeout: int = None):
        self.node_url = node_url or settings.node_url
        self.timeout = timeout or settings.node_timeout
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        """Make HTTP request with retry logic."""
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        url = f"{self.node_url}{endpoint}"
        try:
            async with self.session.request(method, url, **kwargs) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error("RChain API request failed", url=url, error=str(e))
            raise
    
    async def get_status(self) -> Dict[str, Any]:
        """Get node status information."""
        return await self._request("GET", "/status")
    
    async def get_blocks(self, depth: int = 1) -> List[Dict[str, Any]]:
        """Get recent blocks.
        
        Args:
            depth: Number of blocks to retrieve
            
        Returns:
            List of block summaries
        """
        return await self._request("GET", f"/api/blocks/{depth}")
    
    async def get_blocks_range(self, start: int, end: int) -> List[Dict[str, Any]]:
        """Get blocks in a specific range.
        
        Args:
            start: Starting block number
            end: Ending block number
            
        Returns:
            List of blocks in range
        """
        # RChain API returns blocks newest-first, so we need to fetch enough blocks
        # to potentially include our range
        try:
            # Get the latest block number first
            latest_block_num = await self.get_latest_block_number()
            if not latest_block_num:
                return []
            
            # Calculate how many blocks back we need to go
            blocks_back = latest_block_num - start + 1
            
            # Limit the depth to avoid overwhelming the API
            depth = min(50, blocks_back)
            
            # If our start block is too old, we might not get it
            if blocks_back > 50:
                logger.warning(f"Requested range {start}-{end} might be incomplete, blocks are too old")
            
            blocks = await self._request("GET", f"/api/blocks/{depth}")
            
            # Filter blocks within the requested range and sort by block number
            filtered_blocks = [
                block for block in blocks
                if start <= block.get("blockNumber", 0) <= end
            ]
            
            # Sort by block number ascending (oldest first)
            filtered_blocks.sort(key=lambda b: b.get("blockNumber", 0))
            
            logger.info(f"Returning {len(filtered_blocks)} filtered blocks from {len(blocks)} total blocks")
            if filtered_blocks:
                logger.debug(f"First block: {filtered_blocks[0].get('blockNumber')}, Last block: {filtered_blocks[-1].get('blockNumber')}")
            
            return filtered_blocks
            
        except Exception as e:
            logger.error(f"Failed to get blocks range {start}-{end}", error=str(e))
            return []
    
    async def get_block(self, block_hash: str) -> Dict[str, Any]:
        """Get full block details including deployments.
        
        Args:
            block_hash: Block hash
            
        Returns:
            Complete block data with deployments
        """
        return await self._request("GET", f"/api/block/{block_hash}")
    
    async def get_deploy(self, deploy_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment by ID.
        
        Args:
            deploy_id: Deployment signature/ID
            
        Returns:
            Deployment data or None if not found
        """
        try:
            return await self._request("GET", f"/api/deploy/{deploy_id}")
        except aiohttp.ClientResponseError as e:
            if e.status == 404:
                return None
            raise
    
    async def explore_deploy(self, term: str) -> Dict[str, Any]:
        """Execute explore-deploy query.
        
        Args:
            term: Rholang term to execute
            
        Returns:
            Query result
        """
        headers = {"Content-Type": "text/plain"}
        return await self._request(
            "POST",
            "/api/explore-deploy",
            data=term,
            headers=headers
        )
    
    async def query_wallet_balance(self, address: str) -> Optional[int]:
        """Query wallet balance.
        
        Args:
            address: Wallet address
            
        Returns:
            Balance in dust or None if query fails
        """
        query = f'''
        new return, vaultCh, balanceCh in {{
            @RevVault!("findOrCreate", "{address}", *vaultCh) |
            for (@(true, vault) <- vaultCh) {{
                @vault!("balance", *balanceCh) |
                for (@balance <- balanceCh) {{
                    return!(balance)
                }}
            }} |
            for (@(false, reason) <- vaultCh) {{
                return!(reason)
            }}
        }}
        '''
        
        try:
            result = await self.explore_deploy(query)
            if "expr" in result and result["expr"]:
                expr = result["expr"][0]
                if "ExprInt" in expr:
                    return expr["ExprInt"]["data"]
                else:
                    logger.warning(
                        "Wallet balance query returned non-integer",
                        address=address,
                        result=result
                    )
        except Exception as e:
            logger.error(
                "Failed to query wallet balance",
                address=address,
                error=str(e)
            )
        
        return None
    
    async def get_latest_block_number(self) -> Optional[int]:
        """Get the latest block number.
        
        Returns:
            Latest block number or None if request fails
        """
        try:
            blocks = await self.get_blocks(1)
            if blocks:
                return blocks[0].get("blockNumber")
        except Exception as e:
            logger.error("Failed to get latest block number", error=str(e))
        
        return None
    
    async def get_metrics(self) -> str:
        """Get Prometheus metrics.
        
        Returns:
            Metrics in Prometheus format
        """
        if not self.session:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        url = f"{self.node_url}/metrics"
        async with self.session.get(url) as response:
            response.raise_for_status()
            return await response.text()
    
    async def health_check(self) -> bool:
        """Check if the node is healthy and responding.
        
        Returns:
            True if node is healthy, False otherwise
        """
        try:
            status = await self.get_status()
            return bool(status.get("version"))
        except Exception:
            return False
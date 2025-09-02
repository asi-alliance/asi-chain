"""Redis cache implementation for ASI Chain indexer."""

import json
import asyncio
from typing import Any, Optional, Union, Dict, List
from datetime import datetime, timedelta

import redis.asyncio as redis
import structlog
from src.config import settings

logger = structlog.get_logger(__name__)


class RedisCache:
    """Redis cache client with production optimizations."""
    
    def __init__(self):
        self.redis_pool = None
        self.redis_client = None
        self._connected = False
        
    async def connect(self):
        """Connect to Redis with connection pooling."""
        try:
            # Create connection pool for optimal performance
            self.redis_pool = redis.ConnectionPool.from_url(
                settings.redis_url,
                max_connections=50,
                retry_on_timeout=True,
                retry_on_error=[redis.BusyLoadingError, redis.ConnectionError],
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            self.redis_client = redis.Redis(
                connection_pool=self.redis_pool,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            await self.redis_client.ping()
            self._connected = True
            
            logger.info("Connected to Redis cache", url=settings.redis_url)
            
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            self._connected = False
            raise
    
    async def disconnect(self):
        """Close Redis connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.redis_pool:
            await self.redis_pool.disconnect()
        self._connected = False
        logger.info("Disconnected from Redis cache")
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self._connected:
            return None
            
        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning("Cache get failed", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache with optional TTL."""
        if not self._connected:
            return False
            
        try:
            serialized = json.dumps(value, default=str)
            if ttl:
                await self.redis_client.setex(key, ttl, serialized)
            else:
                await self.redis_client.set(key, serialized)
            return True
        except Exception as e:
            logger.warning("Cache set failed", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self._connected:
            return False
            
        try:
            result = await self.redis_client.delete(key)
            return bool(result)
        except Exception as e:
            logger.warning("Cache delete failed", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self._connected:
            return False
            
        try:
            result = await self.redis_client.exists(key)
            return bool(result)
        except Exception as e:
            logger.warning("Cache exists check failed", key=key, error=str(e))
            return False
    
    async def mget(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache."""
        if not self._connected:
            return {}
            
        try:
            values = await self.redis_client.mget(keys)
            result = {}
            for i, value in enumerate(values):
                if value:
                    try:
                        result[keys[i]] = json.loads(value)
                    except json.JSONDecodeError:
                        logger.warning("Failed to decode cached value", key=keys[i])
            return result
        except Exception as e:
            logger.warning("Cache mget failed", keys=keys, error=str(e))
            return {}
    
    async def mset(self, mapping: Dict[str, Any], ttl: int = None) -> bool:
        """Set multiple values in cache."""
        if not self._connected:
            return False
            
        try:
            serialized_mapping = {}
            for key, value in mapping.items():
                serialized_mapping[key] = json.dumps(value, default=str)
            
            await self.redis_client.mset(serialized_mapping)
            
            if ttl:
                # Set TTL for each key
                pipeline = self.redis_client.pipeline()
                for key in mapping.keys():
                    pipeline.expire(key, ttl)
                await pipeline.execute()
            
            return True
        except Exception as e:
            logger.warning("Cache mset failed", mapping_keys=list(mapping.keys()), error=str(e))
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        if not self._connected:
            return 0
            
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning("Cache pattern invalidation failed", pattern=pattern, error=str(e))
            return 0
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter."""
        if not self._connected:
            return None
            
        try:
            return await self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.warning("Cache increment failed", key=key, error=str(e))
            return None
    
    async def set_add(self, key: str, *values) -> int:
        """Add values to a set."""
        if not self._connected:
            return 0
            
        try:
            return await self.redis_client.sadd(key, *values)
        except Exception as e:
            logger.warning("Cache set add failed", key=key, error=str(e))
            return 0
    
    async def set_members(self, key: str) -> set:
        """Get all members of a set."""
        if not self._connected:
            return set()
            
        try:
            return await self.redis_client.smembers(key)
        except Exception as e:
            logger.warning("Cache set members failed", key=key, error=str(e))
            return set()
    
    async def health_check(self) -> bool:
        """Check Redis health."""
        try:
            if not self._connected:
                return False
            pong = await self.redis_client.ping()
            return pong == True
        except Exception:
            return False


class CacheKeyBuilder:
    """Build consistent cache keys for different data types."""
    
    PREFIX = "asi"
    SEPARATOR = ":"
    
    @classmethod
    def block(cls, block_number: int) -> str:
        """Cache key for block data."""
        return f"{cls.PREFIX}{cls.SEPARATOR}block{cls.SEPARATOR}{block_number}"
    
    @classmethod
    def block_hash(cls, block_hash: str) -> str:
        """Cache key for block by hash."""
        return f"{cls.PREFIX}{cls.SEPARATOR}block_hash{cls.SEPARATOR}{block_hash}"
    
    @classmethod
    def latest_block(cls) -> str:
        """Cache key for latest block number."""
        return f"{cls.PREFIX}{cls.SEPARATOR}latest_block"
    
    @classmethod
    def deployment(cls, deploy_id: str) -> str:
        """Cache key for deployment data."""
        return f"{cls.PREFIX}{cls.SEPARATOR}deploy{cls.SEPARATOR}{deploy_id}"
    
    @classmethod
    def transfer(cls, deploy_id: str) -> str:
        """Cache key for transfer data."""
        return f"{cls.PREFIX}{cls.SEPARATOR}transfer{cls.SEPARATOR}{deploy_id}"
    
    @classmethod
    def validator(cls, public_key: str) -> str:
        """Cache key for validator data."""
        return f"{cls.PREFIX}{cls.SEPARATOR}validator{cls.SEPARATOR}{public_key[:16]}"
    
    @classmethod
    def stats(cls, stat_type: str) -> str:
        """Cache key for statistics."""
        return f"{cls.PREFIX}{cls.SEPARATOR}stats{cls.SEPARATOR}{stat_type}"
    
    @classmethod
    def graphql_query(cls, query_hash: str) -> str:
        """Cache key for GraphQL query results."""
        return f"{cls.PREFIX}{cls.SEPARATOR}gql{cls.SEPARATOR}{query_hash}"
    
    @classmethod
    def block_range(cls, start: int, end: int) -> str:
        """Cache key for block ranges."""
        return f"{cls.PREFIX}{cls.SEPARATOR}range{cls.SEPARATOR}{start}_{end}"


class CachedIndexer:
    """Mixin to add caching capabilities to indexer operations."""
    
    def __init__(self):
        self.cache = RedisCache()
        
    async def start_cache(self):
        """Initialize cache connection."""
        await self.cache.connect()
        
    async def stop_cache(self):
        """Close cache connection."""
        await self.cache.disconnect()
        
    async def get_cached_block(self, block_number: int) -> Optional[Dict]:
        """Get block from cache."""
        key = CacheKeyBuilder.block(block_number)
        return await self.cache.get(key)
        
    async def cache_block(self, block_data: Dict, ttl: int = 3600):
        """Cache block data."""
        block_number = block_data.get("blockNumber")
        if block_number:
            key = CacheKeyBuilder.block(block_number)
            await self.cache.set(key, block_data, ttl)
            
    async def invalidate_block_cache(self, block_number: int):
        """Invalidate cached block data."""
        key = CacheKeyBuilder.block(block_number)
        await self.cache.delete(key)
        
    async def get_cached_latest_block(self) -> Optional[int]:
        """Get latest block number from cache."""
        key = CacheKeyBuilder.latest_block()
        return await self.cache.get(key)
        
    async def cache_latest_block(self, block_number: int, ttl: int = 30):
        """Cache latest block number."""
        key = CacheKeyBuilder.latest_block()
        await self.cache.set(key, block_number, ttl)
        
    async def cache_stats(self, stats: Dict, ttl: int = 300):
        """Cache blockchain statistics."""
        for stat_type, value in stats.items():
            key = CacheKeyBuilder.stats(stat_type)
            await self.cache.set(key, value, ttl)
            
    async def get_cached_stats(self, stat_types: List[str]) -> Dict:
        """Get cached statistics."""
        keys = [CacheKeyBuilder.stats(stat_type) for stat_type in stat_types]
        return await self.cache.mget(keys)


# Global cache instance
cache = RedisCache()
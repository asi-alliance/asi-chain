"""Event-driven architecture for the ASI Chain Indexer.

Provides message queue integration, event handling, and scalable processing
for production blockchain indexing.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time

import structlog
import redis.asyncio as redis
from redis.asyncio import Redis
from pydantic import BaseModel

from src.config import settings

logger = structlog.get_logger(__name__)


class EventType(str, Enum):
    """Event types for the indexer."""
    BLOCK_DISCOVERED = "block_discovered"
    BLOCK_PROCESSED = "block_processed"
    DEPLOYMENT_FOUND = "deployment_found"
    TRANSFER_EXTRACTED = "transfer_extracted"
    REORG_DETECTED = "reorg_detected"
    SYNC_CHECKPOINT = "sync_checkpoint"
    ERROR_OCCURRED = "error_occurred"
    HEALTH_CHECK = "health_check"
    METRICS_UPDATE = "metrics_update"


class Priority(int, Enum):
    """Event processing priorities."""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4


@dataclass
class Event:
    """Base event class."""
    id: str
    type: EventType
    priority: Priority
    data: Dict[str, Any]
    timestamp: float
    retry_count: int = 0
    max_retries: int = 3
    source: str = "indexer"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "id": self.id,
            "type": self.type.value,
            "priority": self.priority.value,
            "data": self.data,
            "timestamp": self.timestamp,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "source": self.source
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create event from dictionary."""
        return cls(
            id=data["id"],
            type=EventType(data["type"]),
            priority=Priority(data["priority"]),
            data=data["data"],
            timestamp=data["timestamp"],
            retry_count=data.get("retry_count", 0),
            max_retries=data.get("max_retries", 3),
            source=data.get("source", "indexer")
        )


class EventBus:
    """Redis-based event bus for distributed processing."""
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or getattr(settings, 'redis_url', 'redis://localhost:6379')
        self.redis: Optional[Redis] = None
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.running = False
        self.worker_tasks: List[asyncio.Task] = []
        
        # Queue names
        self.event_queue = "asi_indexer:events"
        self.priority_queue = "asi_indexer:priority_events"
        self.dead_letter_queue = "asi_indexer:dead_letters"
        self.processing_queue = "asi_indexer:processing"
        
    async def connect(self):
        """Connect to Redis."""
        try:
            self.redis = redis.from_url(self.redis_url, decode_responses=True)
            await self.redis.ping()
            logger.info("Connected to Redis event bus", url=self.redis_url)
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            raise
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")
    
    async def publish(self, event: Event):
        """Publish an event to the queue."""
        if not self.redis:
            await self.connect()
        
        try:
            # Choose queue based on priority
            queue = self.priority_queue if event.priority <= Priority.HIGH else self.event_queue
            
            event_data = json.dumps(event.to_dict())
            await self.redis.lpush(queue, event_data)
            
            logger.debug(
                "Event published",
                event_id=event.id,
                event_type=event.type.value,
                priority=event.priority.value,
                queue=queue
            )
            
        except Exception as e:
            logger.error("Failed to publish event", event_id=event.id, error=str(e))
            raise
    
    async def subscribe(self, event_type: EventType, handler: Callable):
        """Subscribe to event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        logger.info("Subscribed to event type", event_type=event_type.value)
    
    async def start_workers(self, num_workers: int = 4):
        """Start worker processes for event handling."""
        if not self.redis:
            await self.connect()
        
        self.running = True
        
        # Start priority workers
        for i in range(min(2, num_workers)):
            task = asyncio.create_task(
                self._worker(f"priority_worker_{i}", self.priority_queue)
            )
            self.worker_tasks.append(task)
        
        # Start normal workers
        for i in range(num_workers - 2):
            task = asyncio.create_task(
                self._worker(f"worker_{i}", self.event_queue)
            )
            self.worker_tasks.append(task)
        
        # Start cleanup worker
        cleanup_task = asyncio.create_task(self._cleanup_worker())
        self.worker_tasks.append(cleanup_task)
        
        logger.info("Event workers started", num_workers=num_workers)
    
    async def stop_workers(self):
        """Stop all workers."""
        self.running = False
        
        # Cancel all worker tasks
        for task in self.worker_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.worker_tasks:
            await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        
        self.worker_tasks.clear()
        logger.info("Event workers stopped")
    
    async def _worker(self, worker_id: str, queue: str):
        """Worker process for handling events."""
        logger.info("Worker started", worker_id=worker_id, queue=queue)
        
        while self.running:
            try:
                # Use blocking pop with timeout
                result = await self.redis.brpop(queue, timeout=1)
                
                if not result:
                    continue
                
                _, event_data = result
                event_dict = json.loads(event_data)
                event = Event.from_dict(event_dict)
                
                # Move to processing queue for tracking
                processing_key = f"{self.processing_queue}:{event.id}"
                await self.redis.setex(
                    processing_key, 
                    300,  # 5 minute timeout
                    json.dumps(event.to_dict())
                )
                
                # Process event
                success = await self._handle_event(event, worker_id)
                
                if success:
                    # Remove from processing queue
                    await self.redis.delete(processing_key)
                else:
                    # Handle failure
                    await self._handle_failed_event(event)
                    await self.redis.delete(processing_key)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Worker error", worker_id=worker_id, error=str(e))
                await asyncio.sleep(1)
        
        logger.info("Worker stopped", worker_id=worker_id)
    
    async def _handle_event(self, event: Event, worker_id: str) -> bool:
        """Handle a single event."""
        try:
            handlers = self.subscribers.get(event.type, [])
            
            if not handlers:
                logger.warning(
                    "No handlers for event type",
                    event_type=event.type.value,
                    event_id=event.id
                )
                return True
            
            logger.debug(
                "Processing event",
                event_id=event.id,
                event_type=event.type.value,
                worker_id=worker_id,
                handlers=len(handlers)
            )
            
            # Execute all handlers
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(
                        "Event handler failed",
                        event_id=event.id,
                        handler=handler.__name__,
                        error=str(e)
                    )
                    return False
            
            logger.debug(
                "Event processed successfully",
                event_id=event.id,
                event_type=event.type.value
            )
            return True
            
        except Exception as e:
            logger.error(
                "Event processing failed",
                event_id=event.id,
                error=str(e)
            )
            return False
    
    async def _handle_failed_event(self, event: Event):
        """Handle failed event processing."""
        event.retry_count += 1
        
        if event.retry_count <= event.max_retries:
            # Calculate backoff delay
            delay = min(60, 2 ** event.retry_count)
            
            logger.warning(
                "Event failed, retrying",
                event_id=event.id,
                retry_count=event.retry_count,
                delay=delay
            )
            
            # Schedule retry
            await asyncio.sleep(delay)
            await self.publish(event)
        else:
            # Move to dead letter queue
            logger.error(
                "Event exceeded max retries, moving to dead letter queue",
                event_id=event.id,
                retry_count=event.retry_count
            )
            
            dead_letter_data = {
                **event.to_dict(),
                "failed_at": time.time(),
                "reason": "max_retries_exceeded"
            }
            
            await self.redis.lpush(
                self.dead_letter_queue,
                json.dumps(dead_letter_data)
            )
    
    async def _cleanup_worker(self):
        """Cleanup expired processing entries."""
        while self.running:
            try:
                # Clean up expired processing entries
                pattern = f"{self.processing_queue}:*"
                keys = await self.redis.keys(pattern)
                
                if keys:
                    # Check TTL and clean up expired keys
                    expired_count = 0
                    for key in keys:
                        ttl = await self.redis.ttl(key)
                        if ttl == -1:  # No expiration set
                            await self.redis.delete(key)
                            expired_count += 1
                    
                    if expired_count > 0:
                        logger.info(
                            "Cleaned up expired processing entries",
                            count=expired_count
                        )
                
                await asyncio.sleep(60)  # Run every minute
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Cleanup worker error", error=str(e))
                await asyncio.sleep(60)
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        if not self.redis:
            return {}
        
        try:
            stats = {
                "event_queue_length": await self.redis.llen(self.event_queue),
                "priority_queue_length": await self.redis.llen(self.priority_queue),
                "dead_letter_queue_length": await self.redis.llen(self.dead_letter_queue),
                "processing_count": len(await self.redis.keys(f"{self.processing_queue}:*")),
                "workers_running": len(self.worker_tasks),
                "connected": True
            }
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get queue stats", error=str(e))
            return {"connected": False, "error": str(e)}


def create_event(
    event_type: EventType,
    data: Dict[str, Any],
    priority: Priority = Priority.NORMAL,
    source: str = "indexer"
) -> Event:
    """Create a new event."""
    return Event(
        id=str(uuid.uuid4()),
        type=event_type,
        priority=priority,
        data=data,
        timestamp=time.time(),
        source=source
    )


# Global event bus instance
event_bus = EventBus()

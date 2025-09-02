"""Resilience patterns for production-grade blockchain indexing.

Implements retry mechanisms, circuit breakers, bulkheads, and timeouts
for handling failures gracefully in a distributed system.
"""

import asyncio
import time
import random
from typing import Callable, Any, Optional, Dict, List
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import functools

import structlog

logger = structlog.get_logger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    backoff_multiplier: float = 1.0
    retriable_exceptions: tuple = (Exception,)
    

@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    expected_exception: type = Exception
    success_threshold: int = 2  # For half-open state
    

@dataclass
class BulkheadConfig:
    """Configuration for bulkhead pattern."""
    max_concurrent: int = 10
    queue_size: int = 100
    timeout: float = 30.0
    

class RetryExhaustedException(Exception):
    """Raised when all retry attempts are exhausted."""
    pass


class CircuitOpenException(Exception):
    """Raised when circuit breaker is open."""
    pass


class BulkheadFullException(Exception):
    """Raised when bulkhead capacity is exceeded."""
    pass


class RetryMechanism:
    """Implements exponential backoff retry with jitter."""
    
    def __init__(self, config: RetryConfig):
        self.config = config
        self.attempt_count = 0
        
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt."""
        delay = (
            self.config.base_delay * 
            (self.config.exponential_base ** attempt) * 
            self.config.backoff_multiplier
        )
        
        # Apply jitter
        if self.config.jitter:
            delay = delay * (0.5 + random.random() * 0.5)
        
        return min(delay, self.config.max_delay)
    
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry logic."""
        last_exception = None
        
        for attempt in range(self.config.max_attempts):
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                if attempt > 0:
                    logger.info(
                        "Function succeeded after retry",
                        function=func.__name__,
                        attempt=attempt + 1
                    )
                
                return result
                
            except self.config.retriable_exceptions as e:
                last_exception = e
                
                if attempt < self.config.max_attempts - 1:
                    delay = self.calculate_delay(attempt)
                    
                    logger.warning(
                        "Function failed, retrying",
                        function=func.__name__,
                        attempt=attempt + 1,
                        error=str(e),
                        delay=delay
                    )
                    
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Function failed after all retries",
                        function=func.__name__,
                        attempts=self.config.max_attempts,
                        error=str(e)
                    )
        
        raise RetryExhaustedException(
            f"Failed after {self.config.max_attempts} attempts. Last error: {last_exception}"
        )


class CircuitBreaker:
    """Implements circuit breaker pattern."""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.next_attempt_time: Optional[float] = None
        
    def _should_attempt_reset(self) -> bool:
        """Check if circuit should attempt to reset."""
        return (
            self.state == CircuitState.OPEN and
            self.next_attempt_time is not None and
            time.time() >= self.next_attempt_time
        )
    
    def _record_success(self):
        """Record successful operation."""
        self.failure_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                logger.info("Circuit breaker reset to CLOSED")
        
    def _record_failure(self, exception: Exception):
        """Record failed operation."""
        if isinstance(exception, self.config.expected_exception):
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                self.success_count = 0
                self.next_attempt_time = time.time() + self.config.recovery_timeout
                logger.warning("Circuit breaker opened from HALF_OPEN")
                
            elif self.failure_count >= self.config.failure_threshold:
                self.state = CircuitState.OPEN
                self.next_attempt_time = time.time() + self.config.recovery_timeout
                logger.warning(
                    "Circuit breaker OPENED",
                    failure_count=self.failure_count,
                    threshold=self.config.failure_threshold
                )
    
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit breaker set to HALF_OPEN")
            else:
                raise CircuitOpenException(
                    f"Circuit breaker is OPEN. Next attempt in "
                    f"{self.next_attempt_time - time.time():.1f} seconds"
                )
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._record_success()
            return result
            
        except Exception as e:
            self._record_failure(e)
            raise
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state."""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "next_attempt_time": self.next_attempt_time
        }


class Bulkhead:
    """Implements bulkhead pattern for resource isolation."""
    
    def __init__(self, config: BulkheadConfig):
        self.config = config
        self.semaphore = asyncio.Semaphore(config.max_concurrent)
        self.queue = asyncio.Queue(maxsize=config.queue_size)
        self.active_count = 0
        
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with bulkhead protection."""
        # Check if we can acquire immediately
        if self.semaphore.locked() and self.queue.full():
            raise BulkheadFullException(
                f"Bulkhead capacity exceeded. Active: {self.active_count}, "
                f"Queue: {self.queue.qsize()}"
            )
        
        try:
            # Wait for availability with timeout
            await asyncio.wait_for(
                self.semaphore.acquire(),
                timeout=self.config.timeout
            )
            
            self.active_count += 1
            
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                return result
            finally:
                self.active_count -= 1
                self.semaphore.release()
                
        except asyncio.TimeoutError:
            raise BulkheadFullException(
                f"Timeout waiting for bulkhead availability after {self.config.timeout}s"
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get bulkhead statistics."""
        return {
            "active_count": self.active_count,
            "queue_size": self.queue.qsize(),
            "max_concurrent": self.config.max_concurrent,
            "queue_capacity": self.config.queue_size
        }


class ResilientExecutor:
    """Combines retry, circuit breaker, and bulkhead patterns."""
    
    def __init__(
        self,
        retry_config: Optional[RetryConfig] = None,
        circuit_config: Optional[CircuitBreakerConfig] = None,
        bulkhead_config: Optional[BulkheadConfig] = None,
        name: str = "executor"
    ):
        self.name = name
        self.retry = RetryMechanism(retry_config) if retry_config else None
        self.circuit_breaker = CircuitBreaker(circuit_config) if circuit_config else None
        self.bulkhead = Bulkhead(bulkhead_config) if bulkhead_config else None
        
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with all resilience patterns."""
        async def _execute():
            # Apply bulkhead if configured
            if self.bulkhead:
                return await self.bulkhead.execute(func, *args, **kwargs)
            else:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
        
        # Apply circuit breaker if configured
        if self.circuit_breaker:
            circuit_func = lambda: self.circuit_breaker.execute(_execute)
        else:
            circuit_func = _execute
        
        # Apply retry if configured
        if self.retry:
            return await self.retry.execute(circuit_func)
        else:
            return await circuit_func()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get executor statistics."""
        stats = {"name": self.name}
        
        if self.circuit_breaker:
            stats["circuit_breaker"] = self.circuit_breaker.get_state()
        
        if self.bulkhead:
            stats["bulkhead"] = self.bulkhead.get_stats()
        
        if self.retry:
            stats["retry"] = {
                "max_attempts": self.retry.config.max_attempts,
                "base_delay": self.retry.config.base_delay,
                "max_delay": self.retry.config.max_delay
            }
        
        return stats


def resilient(
    retry_config: Optional[RetryConfig] = None,
    circuit_config: Optional[CircuitBreakerConfig] = None,
    bulkhead_config: Optional[BulkheadConfig] = None,
    name: Optional[str] = None
):
    """Decorator for adding resilience patterns to functions."""
    def decorator(func: Callable) -> Callable:
        executor_name = name or func.__name__
        executor = ResilientExecutor(
            retry_config=retry_config,
            circuit_config=circuit_config,
            bulkhead_config=bulkhead_config,
            name=executor_name
        )
        
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await executor.execute(func, *args, **kwargs)
        
        # Attach executor for monitoring
        wrapper._resilient_executor = executor
        return wrapper
    
    return decorator


# Pre-configured executors for common use cases
node_retry_config = RetryConfig(
    max_attempts=3,
    base_delay=0.5,
    max_delay=10.0,
    exponential_base=2.0,
    jitter=True
)

node_circuit_config = CircuitBreakerConfig(
    failure_threshold=5,
    recovery_timeout=30.0,
    success_threshold=2
)

node_bulkhead_config = BulkheadConfig(
    max_concurrent=10,
    queue_size=50,
    timeout=30.0
)

db_retry_config = RetryConfig(
    max_attempts=5,
    base_delay=0.1,
    max_delay=5.0,
    exponential_base=1.5
)

db_circuit_config = CircuitBreakerConfig(
    failure_threshold=10,
    recovery_timeout=15.0,
    success_threshold=3
)

# Global executors
node_executor = ResilientExecutor(
    retry_config=node_retry_config,
    circuit_config=node_circuit_config,
    bulkhead_config=node_bulkhead_config,
    name="node_operations"
)

db_executor = ResilientExecutor(
    retry_config=db_retry_config,
    circuit_config=db_circuit_config,
    name="database_operations"
)

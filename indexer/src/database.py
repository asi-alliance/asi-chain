"""Database connection and session management."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.config import settings
from src.models import Base


class Database:
    """Database connection manager."""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or str(settings.database_url)
        # Convert postgresql:// to postgresql+asyncpg:// for async support
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        self.engine = None
        self.session_factory = None
        self.pool = None
    
    async def connect(self):
        """Initialize database connections."""
        # Create async engine
        self.engine = create_async_engine(
            self.database_url,
            echo=False,
            pool_size=settings.database_pool_size,
            pool_timeout=settings.database_pool_timeout,
            pool_pre_ping=True,
        )
        
        # Create session factory
        self.session_factory = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        
        # Create asyncpg pool for raw queries
        self.pool = await asyncpg.create_pool(
            self.database_url.replace("postgresql+asyncpg://", "postgresql://"),
            min_size=5,
            max_size=settings.database_pool_size,
            timeout=settings.database_pool_timeout,
        )
    
    async def disconnect(self):
        """Close database connections."""
        if self.pool:
            await self.pool.close()
        if self.engine:
            await self.engine.dispose()
    
    async def create_tables(self):
        """Create all database tables."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def drop_tables(self):
        """Drop all database tables (use with caution!)."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session."""
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def execute_raw(self, query: str, *args):
        """Execute a raw SQL query."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def get_last_indexed_block(self) -> int:
        """Get the last indexed block number."""
        query = """
            SELECT value::bigint as block_number
            FROM indexer_state
            WHERE key = 'last_indexed_block'
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query)
            return row["block_number"] if row else 0
    
    async def set_last_indexed_block(self, block_number: int):
        """Update the last indexed block number."""
        query = """
            INSERT INTO indexer_state (key, value, updated_at)
            VALUES ('last_indexed_block', $1, NOW())
            ON CONFLICT (key) DO UPDATE
            SET value = $1, updated_at = NOW()
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, str(block_number))


# Global database instance
db = Database()
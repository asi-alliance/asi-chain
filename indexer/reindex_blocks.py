#!/usr/bin/env python3
"""Script to manually re-index specific blocks to test transfer extraction."""

import asyncio
import sys
import os
sys.path.insert(0, '/app')  # For Docker environment

from src.rust_cli_client import RustCLIClient
from src.rust_indexer import RustBlockIndexer
from src.database import db
from src.config import settings

async def reindex_blocks(block_numbers):
    """Re-index specific blocks."""
    print(f"🔄 Re-indexing blocks: {block_numbers}")
    
    # Initialize database
    await db.connect()
    await db.create_tables()
    
    # Initialize indexer
    indexer = RustBlockIndexer()
    indexer.client = RustCLIClient()
    
    # Check node health
    if not await indexer.client.health_check():
        print("❌ Cannot connect to node")
        return
    
    for block_num in block_numbers:
        print(f"\n📦 Processing block {block_num}...")
        
        # Get block by height
        blocks = await indexer.client.get_blocks_by_height(block_num, block_num)
        if not blocks:
            print(f"❌ Block {block_num} not found")
            continue
            
        block_summary = blocks[0]
        block_hash = block_summary.get("blockHash")
        
        # Get full block details
        full_block = await indexer.client.get_block_details(block_hash)
        if not full_block:
            print(f"❌ Could not get details for block {block_hash}")
            continue
        
        # Process the block
        await indexer._process_block(full_block)
        print(f"✅ Block {block_num} processed")
        
        # Check for transfers
        async with db.session() as session:
            from sqlalchemy import text
            result = await session.execute(
                text("SELECT COUNT(*) FROM transfers WHERE block_number = :block"),
                {"block": block_num}
            )
            count = result.scalar()
            print(f"💸 Found {count} transfers in block {block_num}")
    
    await db.disconnect()
    print("\n✅ Re-indexing complete!")

if __name__ == "__main__":
    # Re-index blocks 365 and 377 which contain REV transfers
    asyncio.run(reindex_blocks([365, 377]))
# Python Indexer Component Guide

## 🔄 Component Overview

The ASI Chain Indexer (v2.1.1) is a Python-based service that synchronizes blockchain data from F1R3FLY nodes into PostgreSQL, providing REST APIs and enabling GraphQL queries through Hasura. It features zero-touch deployment with automatic relationship configuration.

```
indexer/
├── src/
│   ├── rust_indexer.py        # Main indexing orchestrator
│   ├── db/
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── connection.py      # Database connection pool
│   │   └── queries.py         # Query builders
│   ├── api/
│   │   ├── server.py          # FastAPI application
│   │   ├── routes.py          # API endpoints
│   │   └── schemas.py         # Pydantic models
│   └── utils/
│       ├── parser.py          # Block/transaction parsing
│       └── logger.py          # Logging configuration
├── migrations/
│   └── 000_comprehensive_initial_schema.sql
├── scripts/
│   ├── setup-hasura-relationships.sh
│   └── test-relationships.sh
├── deploy.sh                  # Zero-touch deployment
├── docker-compose.rust.yml    # Docker configuration
└── Dockerfile.rust-builder    # Rust CLI builder
```

## 🏗️ Architecture

### System Flow

```
F1R3FLY Node (gRPC)
    ↓
Rust CLI (node_cli)
    ↓
Python Indexer (asyncio)
    ↓
PostgreSQL Database
    ↓
Hasura GraphQL Engine
    ↓
REST API (FastAPI)
```

### Key Design Decisions

1. **Rust CLI Bridge**: All blockchain communication through `node_cli` binary
2. **Async Python**: Uses asyncio for concurrent processing
3. **Zero-Touch Deployment**: Automatic Hasura relationship setup
4. **Comprehensive Schema**: Single migration with 10 tables
5. **Observer Node Usage**: Connects to read-only node for optimal performance

## 💻 Core Components

### 1. Main Indexer (`src/rust_indexer.py`)

```python
import asyncio
import subprocess
import json
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

class RustIndexer:
    def __init__(self):
        self.node_cli_path = "/usr/local/bin/node_cli"
        self.node_host = os.getenv("NODE_HOST", "13.251.66.61")
        self.grpc_port = int(os.getenv("GRPC_PORT", "40452"))  # Observer node
        self.http_port = int(os.getenv("HTTP_PORT", "40453"))
        self.db_conn = self._get_db_connection()
        self.sync_interval = int(os.getenv("SYNC_INTERVAL", "5"))
        
    async def _run_command(self, cmd: List[str]) -> str:
        """Execute Rust CLI command"""
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Command failed: {stderr.decode()}")
                
            return stdout.decode()
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            raise
    
    async def get_latest_block(self) -> int:
        """Get latest block from blockchain"""
        cmd = [
            self.node_cli_path,
            "show-blocks",
            "--host", self.node_host,
            "--port", str(self.grpc_port),
            "--depth", "1"
        ]
        
        output = await self._run_command(cmd)
        # Parse block number from output
        return self._parse_block_number(output)
    
    async def get_block(self, block_number: int) -> Dict:
        """Fetch complete block data"""
        cmd = [
            self.node_cli_path,
            "show-block",
            "--host", self.node_host,
            "--port", str(self.grpc_port),
            "--block-hash", await self.get_block_hash(block_number)
        ]
        
        output = await self._run_command(cmd)
        return self._parse_block_data(output)
    
    async def sync_blocks(self):
        """Main synchronization loop"""
        while True:
            try:
                # Get latest indexed block
                with self.db_conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT COALESCE(MAX(block_number), -1) FROM blocks"
                    )
                    latest_indexed = cursor.fetchone()[0]
                
                # Get latest chain block
                latest_chain = await self.get_latest_block()
                
                # Sync missing blocks
                if latest_indexed < latest_chain:
                    logger.info(f"Syncing blocks {latest_indexed + 1} to {latest_chain}")
                    
                    for block_num in range(latest_indexed + 1, min(latest_chain + 1, latest_indexed + 101)):
                        await self.process_block(block_num)
                        
                await asyncio.sleep(self.sync_interval)
                
            except Exception as e:
                logger.error(f"Sync error: {e}")
                await asyncio.sleep(30)  # Wait before retry
    
    async def process_block(self, block_number: int):
        """Process single block"""
        try:
            # Fetch block data
            block_data = await self.get_block(block_number)
            
            # Begin transaction
            with self.db_conn.cursor() as cursor:
                cursor.execute("BEGIN")
                
                # Insert block
                cursor.execute("""
                    INSERT INTO blocks (
                        block_number, block_hash, parent_hash, 
                        timestamp, validator, deployments_count
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (block_number) DO NOTHING
                """, (
                    block_data['number'],
                    block_data['hash'],
                    block_data['parent_hash'],
                    block_data['timestamp'],
                    block_data['validator'],
                    len(block_data.get('deployments', []))
                ))
                
                # Process deployments
                for deploy in block_data.get('deployments', []):
                    await self.process_deployment(cursor, block_number, deploy)
                
                # Process validator bonds
                for bond in block_data.get('bonds', []):
                    await self.process_bond(cursor, block_number, bond)
                
                # Update balance snapshots
                await self.update_balances(cursor, block_number)
                
                cursor.execute("COMMIT")
                logger.info(f"Processed block {block_number}")
                
        except Exception as e:
            cursor.execute("ROLLBACK")
            logger.error(f"Failed to process block {block_number}: {e}")
            raise
    
    async def process_deployment(self, cursor, block_number: int, deploy: Dict):
        """Process deployment/transaction"""
        cursor.execute("""
            INSERT INTO deployments (
                deploy_id, block_number, deployer, term,
                phlo_limit, phlo_price, cost, error_message, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (deploy_id) DO NOTHING
        """, (
            deploy['deploy_id'],
            block_number,
            deploy['deployer'],
            deploy.get('term', ''),
            deploy.get('phlo_limit', 0),
            deploy.get('phlo_price', 1),
            deploy.get('cost', 0),
            deploy.get('error_message'),  # NULL if successful
            deploy['timestamp']
        ))
        
        # Extract REV transfers if present
        if 'transfer' in deploy.get('term', ''):
            await self.extract_transfer(cursor, deploy)
    
    async def extract_transfer(self, cursor, deploy: Dict):
        """Extract REV transfer from deployment"""
        # Parse Rholang for transfer details
        transfer_data = self._parse_transfer(deploy['term'])
        if transfer_data:
            cursor.execute("""
                INSERT INTO rev_transfers (
                    deploy_id, from_address, to_address, amount, timestamp
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                deploy['deploy_id'],
                transfer_data['from'],
                transfer_data['to'],
                transfer_data['amount'],
                deploy['timestamp']
            ))
    
    async def process_bond(self, cursor, block_number: int, bond: Dict):
        """Process validator bond"""
        cursor.execute("""
            INSERT INTO validator_bonds (
                block_number, validator, stake
            ) VALUES (%s, %s, %s)
            ON CONFLICT (block_number, validator) 
            DO UPDATE SET stake = EXCLUDED.stake
        """, (
            block_number,
            bond['validator'],
            bond['stake']
        ))
    
    def _parse_block_number(self, output: str) -> int:
        """Parse block number from CLI output"""
        # Handle new CLI format (v2.1.1 fix)
        import re
        match = re.search(r'blockNumber:\s*(\d+)', output)
        if match:
            return int(match.group(1))
        raise ValueError(f"Could not parse block number from: {output}")
    
    def _parse_transfer(self, rholang: str) -> Optional[Dict]:
        """Parse REV transfer from Rholang code"""
        import re
        # Match transfer pattern
        pattern = r'transfer\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\)'
        match = re.search(pattern, rholang)
        if match:
            return {
                'from': match.group(1),
                'to': match.group(2),
                'amount': int(match.group(3))
            }
        return None
```

### 2. Database Models (`src/db/models.py`)

```python
from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Block(Base):
    __tablename__ = 'blocks'
    
    block_number = Column(BigInteger, primary_key=True)
    block_hash = Column(String(64), unique=True, nullable=False)
    parent_hash = Column(String(64))
    timestamp = Column(DateTime, nullable=False)
    validator = Column(String(150))
    deployments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deployments = relationship("Deployment", back_populates="block")
    validator_bonds = relationship("ValidatorBond", back_populates="block")

class Deployment(Base):
    __tablename__ = 'deployments'
    
    deploy_id = Column(String(64), primary_key=True)
    block_number = Column(BigInteger, ForeignKey('blocks.block_number'))
    deployer = Column(String(150), nullable=False)
    term = Column(Text)
    phlo_limit = Column(BigInteger)
    phlo_price = Column(BigInteger)
    cost = Column(BigInteger)
    error_message = Column(Text)  # NULL if successful
    timestamp = Column(DateTime)
    
    # Relationships
    block = relationship("Block", back_populates="deployments")

class ValidatorBond(Base):
    __tablename__ = 'validator_bonds'
    
    id = Column(Integer, primary_key=True)
    block_number = Column(BigInteger, ForeignKey('blocks.block_number'))
    validator = Column(String(150), nullable=False)
    stake = Column(BigInteger, nullable=False)
    
    # Relationships
    block = relationship("Block", back_populates="validator_bonds")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('block_number', 'validator'),
    )

class BalanceSnapshot(Base):
    __tablename__ = 'balance_snapshots'
    
    id = Column(Integer, primary_key=True)
    address = Column(String(150), nullable=False, index=True)
    balance = Column(BigInteger, nullable=False)
    block_number = Column(BigInteger, ForeignKey('blocks.block_number'))
    timestamp = Column(DateTime, nullable=False)
    
    # Composite index for efficient queries
    __table_args__ = (
        Index('idx_address_timestamp', 'address', 'timestamp'),
    )

class REVTransfer(Base):
    __tablename__ = 'rev_transfers'
    
    id = Column(Integer, primary_key=True)
    deploy_id = Column(String(64), ForeignKey('deployments.deploy_id'))
    from_address = Column(String(150), nullable=False)
    to_address = Column(String(150), nullable=False)
    amount = Column(BigInteger, nullable=False)
    timestamp = Column(DateTime)

class NetworkState(Base):
    __tablename__ = 'network_state'
    
    id = Column(Integer, primary_key=True)
    block_number = Column(BigInteger, ForeignKey('blocks.block_number'))
    total_supply = Column(BigInteger)
    active_validators = Column(Integer)
    total_stake = Column(BigInteger)
    metrics = Column(JSON)  # Additional metrics
    updated_at = Column(DateTime, default=datetime.utcnow)
```

### 3. REST API (`src/api/server.py`)

```python
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import asyncpg

app = FastAPI(title="ASI Chain Indexer API", version="2.1.1")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Database pool
db_pool = None

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(
        os.getenv("DATABASE_URL"),
        min_size=10,
        max_size=20
    )

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy"}
    except:
        raise HTTPException(status_code=503, detail="Database unhealthy")

@app.get("/status")
async def status():
    """Get indexer status"""
    async with db_pool.acquire() as conn:
        latest_block = await conn.fetchval(
            "SELECT MAX(block_number) FROM blocks"
        )
        
        # Get chain latest
        chain_latest = await get_chain_latest()
        
        return {
            "latest_indexed_block": latest_block,
            "latest_chain_block": chain_latest,
            "blocks_behind": chain_latest - latest_block if latest_block else chain_latest,
            "indexer_version": "2.1.1",
            "status": "syncing" if chain_latest > latest_block else "synced"
        }

@app.get("/blocks")
async def get_blocks(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Get blocks with pagination"""
    async with db_pool.acquire() as conn:
        blocks = await conn.fetch("""
            SELECT 
                block_number, block_hash, timestamp, 
                validator, deployments_count
            FROM blocks
            ORDER BY block_number DESC
            LIMIT $1 OFFSET $2
        """, limit, offset)
        
        return [dict(b) for b in blocks]

@app.get("/blocks/{block_number}")
async def get_block(block_number: int):
    """Get block details"""
    async with db_pool.acquire() as conn:
        block = await conn.fetchrow("""
            SELECT * FROM blocks WHERE block_number = $1
        """, block_number)
        
        if not block:
            raise HTTPException(status_code=404, detail="Block not found")
        
        # Get deployments
        deployments = await conn.fetch("""
            SELECT * FROM deployments WHERE block_number = $1
        """, block_number)
        
        # Get bonds
        bonds = await conn.fetch("""
            SELECT * FROM validator_bonds WHERE block_number = $1
        """, block_number)
        
        return {
            **dict(block),
            "deployments": [dict(d) for d in deployments],
            "validator_bonds": [dict(b) for b in bonds]
        }

@app.get("/transactions/{deploy_id}")
async def get_transaction(deploy_id: str):
    """Get transaction details"""
    async with db_pool.acquire() as conn:
        tx = await conn.fetchrow("""
            SELECT d.*, b.timestamp as block_timestamp
            FROM deployments d
            JOIN blocks b ON d.block_number = b.block_number
            WHERE d.deploy_id = $1
        """, deploy_id)
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return dict(tx)

@app.get("/address/{address}")
async def get_address(address: str):
    """Get address information"""
    async with db_pool.acquire() as conn:
        # Get latest balance
        balance = await conn.fetchval("""
            SELECT balance FROM balance_snapshots
            WHERE address = $1
            ORDER BY timestamp DESC
            LIMIT 1
        """, address)
        
        # Get transaction count
        tx_count = await conn.fetchval("""
            SELECT COUNT(*) FROM deployments
            WHERE deployer = $1
        """, address)
        
        # Get recent transactions
        recent_txs = await conn.fetch("""
            SELECT * FROM deployments
            WHERE deployer = $1
            ORDER BY timestamp DESC
            LIMIT 10
        """, address)
        
        return {
            "address": address,
            "balance": balance or 0,
            "transaction_count": tx_count,
            "recent_transactions": [dict(tx) for tx in recent_txs]
        }

@app.get("/validators")
async def get_validators():
    """Get active validators"""
    async with db_pool.acquire() as conn:
        validators = await conn.fetch("""
            WITH latest_bonds AS (
                SELECT DISTINCT ON (validator) 
                    validator, stake, block_number
                FROM validator_bonds
                ORDER BY validator, block_number DESC
            )
            SELECT 
                validator,
                stake,
                COUNT(DISTINCT b.block_number) as blocks_proposed
            FROM latest_bonds lb
            LEFT JOIN blocks b ON b.validator = lb.validator
            GROUP BY lb.validator, lb.stake
            ORDER BY stake DESC
        """)
        
        return [dict(v) for v in validators]

@app.get("/stats")
async def get_stats():
    """Get network statistics"""
    async with db_pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(DISTINCT block_number) as total_blocks,
                COUNT(DISTINCT deploy_id) as total_transactions,
                COUNT(DISTINCT validator) as validator_count,
                SUM(stake) as total_stake
            FROM (
                SELECT block_number FROM blocks
            ) b
            CROSS JOIN LATERAL (
                SELECT deploy_id FROM deployments
            ) d
            CROSS JOIN LATERAL (
                SELECT DISTINCT validator, stake 
                FROM validator_bonds
                WHERE block_number = (
                    SELECT MAX(block_number) FROM validator_bonds
                )
            ) v
        """)
        
        return dict(stats)

@app.get("/balance/{address}")
async def get_balance(address: str):
    """Get address balance"""
    # Use Rust CLI for real-time balance
    balance = await query_balance_via_cli(address)
    
    # Cache in database
    async with db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO balance_snapshots (address, balance, block_number, timestamp)
            VALUES ($1, $2, 
                (SELECT MAX(block_number) FROM blocks),
                NOW()
            )
        """, address, balance)
    
    return {"address": address, "balance": balance}

async def query_balance_via_cli(address: str) -> int:
    """Query balance using Rust CLI"""
    cmd = [
        "/usr/local/bin/node_cli",
        "wallet-balance",
        "--address", address,
        "--host", os.getenv("NODE_HOST"),
        "--port", os.getenv("GRPC_PORT")
    ]
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    # Parse balance from output
    import re
    match = re.search(r'balance:\s*(\d+)', stdout.decode())
    if match:
        return int(match.group(1))
    return 0
```

### 4. Deployment Scripts (`deploy.sh`)

```bash
#!/bin/bash
# deploy.sh - Zero-touch deployment script

echo "ASI Chain Indexer Deployment v2.1.1"
echo "===================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.template .env
fi

# Deployment options
echo "Select deployment option:"
echo "1) Connect to remote F1R3FLY node (13.251.66.61)"
echo "2) Skip local F1R3FLY (for AWS/remote deployments)"
read -p "Choice: " choice

case $choice in
    1)
        echo "Using remote F1R3FLY configuration..."
        cp .env.remote-observer .env
        ;;
    2)
        echo "Using existing .env configuration..."
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Start services
echo "Starting Docker services..."
docker-compose -f docker-compose.rust.yml down -v
docker-compose -f docker-compose.rust.yml up -d

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until docker exec asi-indexer-db pg_isready; do
    sleep 2
done

# Run migrations
echo "Running database migrations..."
docker exec asi-indexer-db psql -U indexer -d asichain < migrations/000_comprehensive_initial_schema.sql

# Wait for Hasura
echo "Waiting for Hasura..."
until curl -f http://localhost:8080/healthz > /dev/null 2>&1; do
    sleep 2
done

# Configure Hasura relationships
echo "Setting up Hasura relationships..."
bash scripts/setup-hasura-relationships.sh

# Verify deployment
echo "Verifying deployment..."
curl http://localhost:9090/health
curl http://localhost:8080/v1/version

echo "Deployment complete!"
echo "Services available at:"
echo "  - Indexer API: http://localhost:9090"
echo "  - GraphQL Console: http://localhost:8080/console"
echo "  - PostgreSQL: localhost:5432"
```

### 5. Hasura Configuration (`scripts/setup-hasura-relationships.sh`)

```bash
#!/bin/bash
# setup-hasura-relationships.sh

HASURA_URL="http://localhost:8080/v1/metadata"
HASURA_SECRET="myadminsecretkey"

echo "Configuring Hasura relationships..."

# Track all tables
curl -X POST $HASURA_URL \
  -H "x-hasura-admin-secret: $HASURA_SECRET" \
  -d '{
    "type": "bulk",
    "args": [
      {"type": "track_table", "args": {"table": "blocks"}},
      {"type": "track_table", "args": {"table": "deployments"}},
      {"type": "track_table", "args": {"table": "validator_bonds"}},
      {"type": "track_table", "args": {"table": "balance_snapshots"}},
      {"type": "track_table", "args": {"table": "rev_transfers"}}
    ]
  }'

# Create relationships
curl -X POST $HASURA_URL \
  -H "x-hasura-admin-secret: $HASURA_SECRET" \
  -d '{
    "type": "create_array_relationship",
    "args": {
      "table": "blocks",
      "name": "deployments",
      "using": {
        "foreign_key_constraint_on": {
          "table": "deployments",
          "column": "block_number"
        }
      }
    }
  }'

curl -X POST $HASURA_URL \
  -H "x-hasura-admin-secret: $HASURA_SECRET" \
  -d '{
    "type": "create_array_relationship",
    "args": {
      "table": "blocks",
      "name": "validator_bonds",
      "using": {
        "foreign_key_constraint_on": {
          "table": "validator_bonds",
          "column": "block_number"
        }
      }
    }
  }'

echo "Hasura configuration complete!"
```

## 🐳 Docker Configuration

### Docker Compose (`docker-compose.rust.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: asi-indexer-db
    environment:
      POSTGRES_DB: asichain
      POSTGRES_USER: indexer
      POSTGRES_PASSWORD: indexer_pass
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U indexer"]
      interval: 10s
      timeout: 5s
      retries: 5

  hasura:
    image: hasura/graphql-engine:v2.35.0
    container_name: asi-hasura
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://indexer:indexer_pass@postgres:5432/asichain
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: myadminsecretkey
      HASURA_GRAPHQL_ENABLE_TELEMETRY: "false"
      HASURA_GRAPHQL_UNAUTHORIZED_ROLE: public
      HASURA_GRAPHQL_CORS_DOMAIN: "*"

  rust-indexer:
    build:
      context: .
      dockerfile: Dockerfile.rust-builder
    container_name: asi-rust-indexer
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    ports:
      - "9090:9090"
    volumes:
      - ./src:/app/src
      - ./migrations:/app/migrations
    restart: unless-stopped
    command: python -m src.main

volumes:
  postgres-data:
```

### Dockerfile (`Dockerfile.rust-builder`)

```dockerfile
# Build Rust CLI from source
FROM rust:1.70 as rust-builder

# Install protobuf compiler
RUN apt-get update && apt-get install -y protobuf-compiler

# Clone and build rust-client
WORKDIR /build
RUN git clone https://github.com/F1R3FLY-io/rust-client.git
WORKDIR /build/rust-client
RUN cargo build --release

# Python runtime
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust CLI binary
COPY --from=rust-builder /build/rust-client/target/release/node_cli /usr/local/bin/

# Set up Python environment
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run indexer
CMD ["python", "-m", "src.main"]
```

## 🧪 Testing

### Unit Tests

```python
# tests/test_parser.py
import pytest
from src.utils.parser import parse_block_number, parse_validator_bond

def test_parse_block_number():
    """Test block number parsing with new format"""
    output = """
    blockNumber: 12345
    blockHash: abc123...
    """
    assert parse_block_number(output) == 12345

def test_parse_validator_bond():
    """Test validator bond parsing"""
    output = """
    Validator: 1111...
    Stake: 1000000000000
    """
    bond = parse_validator_bond(output)
    assert bond['validator'].startswith('1111')
    assert bond['stake'] == 1000000000000
```

### Integration Tests

```python
# tests/test_integration.py
import asyncio
import pytest
from src.rust_indexer import RustIndexer

@pytest.mark.asyncio
async def test_block_sync():
    """Test block synchronization"""
    indexer = RustIndexer()
    
    # Get latest block
    latest = await indexer.get_latest_block()
    assert latest > 0
    
    # Process block
    await indexer.process_block(latest)
    
    # Verify in database
    with indexer.db_conn.cursor() as cursor:
        cursor.execute(
            "SELECT * FROM blocks WHERE block_number = %s",
            (latest,)
        )
        block = cursor.fetchone()
        assert block is not None
```

## 🐛 Known Issues & Fixes

### v2.1.1 Fixes

```python
# Issue: Validator bonds showing as 0
# Fix: Updated regex pattern for new CLI output format
def parse_validator_bond(output: str) -> Dict:
    # Old pattern (broken)
    # pattern = r'validator:\s*(\S+).*stake:\s*(\d+)'
    
    # New pattern (fixed)
    pattern = r'Validator:\s*(\S+).*Stake:\s*(\d+)'
    match = re.search(pattern, output, re.IGNORECASE | re.DOTALL)
    if match:
        return {
            'validator': match.group(1),
            'stake': int(match.group(2))
        }

# Issue: Empty error_message causing false positives
# Fix: Proper NULL handling
cursor.execute("""
    INSERT INTO deployments (..., error_message, ...)
    VALUES (..., %s, ...)
""", (
    deploy.get('error_message'),  # Returns None if not present
))

# Issue: GraphQL relationships not configured
# Fix: Automatic setup in deploy.sh
bash scripts/setup-hasura-relationships.sh
```

## 📋 Maintenance Tasks

### Daily Tasks
- Monitor sync status: `curl http://localhost:9090/status`
- Check error logs: `docker logs asi-rust-indexer --tail 100`
- Verify block production: Compare with chain

### Weekly Tasks
- Database vacuum: `docker exec asi-indexer-db vacuumdb -U indexer -d asichain -z`
- Clear old snapshots: `DELETE FROM balance_snapshots WHERE timestamp < NOW() - INTERVAL '30 days'`
- Backup database: `pg_dump` to S3

### Monthly Tasks
- Update Rust CLI if new version available
- Review and optimize slow queries
- Archive old data to cold storage

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Component Version**: 2.1.1
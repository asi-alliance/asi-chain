# ASI-Chain Indexer

A high-performance blockchain indexer for ASI-Chain that synchronizes data from RChain nodes using the Rust CLI client and stores it in PostgreSQL for efficient querying.

## 🚀 Major Update: Enhanced REV Transfer Detection

The indexer now features complete network-agnostic operation with improved transfer detection:
- **Automatic genesis data extraction** - validator bonds and REV allocations
- **Full blockchain sync from genesis (block 0)** - no API limitations
- **Enhanced REV transfer detection** - supports match-based Rholang patterns
- **Network-agnostic design** - works with any ASI-Chain network
- **Enhanced balance tracking** - bonded vs unbonded REV balances
- **GraphQL API via Hasura** - automatic configuration with bash script
- **Zero-dependency Hasura setup** - uses curl instead of Python requests

## Current Status

✅ **Working Features:**
- **Genesis block processing** with automatic extraction of validator bonds and initial allocations
- **Full blockchain synchronization from block 0** using Rust CLI
- **Enhanced REV transfer detection** - now supports match-based Rholang patterns
- **Balance state tracking** - separate bonded and unbonded balances per address
- **GraphQL API** via Hasura with automatic bash-based configuration
- Enhanced block metadata extraction (state roots, bonds, validators, justifications)
- PostgreSQL storage with 150-char address fields (supports both REV addresses and validator keys)
- Deployment extraction with full Rholang code
- Smart contract type classification (REV transfers, validator ops, etc.)
- REV transfer extraction with both variable-based and match-based pattern matching
- Address validation supporting 53-56 character REV addresses
- Validator tracking with full public keys (130+ characters)
- Network consensus monitoring
- Advanced search capabilities (blocks by hash, deployments by ID/deployer)
- Network statistics and analytics
- Prometheus metrics endpoint
- Health and readiness checks
- One-command deployment with automatic Hasura configuration (no Python dependencies)
- Complete REST API and GraphQL interface

⚠️ **Known Limitations:**
- **Epoch transitions tracking** - Table exists but data not populated (epoch rewards not tracked)
- **Validator rewards** - Not tracked in current implementation
- **indexer_state table** - Referenced in queries but not created in schema

✅ **Recently Fixed:**
- **GraphQL relationships** - All Hasura relationships now properly configured using `scripts/setup-hasura-relationships.sh`

📊 **Performance:**
- Syncs up to 50 blocks per batch
- Processes blocks from genesis without limitations
- Sub-second block processing time
- Handles complex block metadata including justifications
- **240+ blocks indexed in initial sync**
- **148+ deployments tracked with full metadata**
- **732+ validator bond records maintained**

🔧 **Technical Improvements:**
- Uses native Rust CLI for blockchain interaction
- Cross-compiled from macOS ARM64 to Linux x86_64
- Enhanced database schema for additional data types
- Removed dependency on limited HTTP APIs

## Architecture

```
┌─────────────────┐     Rust CLI       ┌─────────────────┐
│   RChain Node   │ ←────────────────→ │  Rust Indexer   │
│  (gRPC/HTTP)    │                    │ (Python/asyncio)|
└─────────────────┘                    └────────┬────────┘
                                               │
                                               ▼
                                       ┌─────────────────┐
                                       │   PostgreSQL    │
                                       │   (indexed)     │
                                       └────────┬────────┘
                                               │
                                               ▼
                                       ┌─────────────────┐
                                       │ Hasura GraphQL  │
                                       │   (optional)    │
                                       └─────────────────┘
```

## Rust CLI Commands Used

The indexer leverages these Rust CLI commands for comprehensive data extraction:

1. **last-finalized-block** - Get the latest finalized block information
2. **get-blocks-by-height** - Fetch blocks within a height range (supports large batches)
3. **blocks** - Get detailed block information including deployments
4. **get-deploy** - Retrieve specific deployment details
5. **bonds** - Get current validator bonds and stakes
6. **active-validators** - List currently active validators
7. **epoch-info** - Get epoch transitions and timing
8. **network-consensus** - Monitor network health and participation
9. **show-main-chain** - Verify main chain consistency

## Quick Start

```bash
# Deploy with automatic setup (recommended)
cd indexer
./deploy.sh

# The deployment script will:
# - Pre-pull required Docker images with retry logic
# - Check Docker and network connectivity
# - Build and start all services
# - Wait for services to be healthy
# - Configure Hasura GraphQL automatically using bash/curl
# - Setup all GraphQL relationships between tables
# - Verify genesis block processing
# - Optional: Run functionality tests

# When prompted, choose 'y' to flush database for clean start

# Check status
curl http://localhost:9090/status | jq .

# Query all REV transfers via GraphQL
curl http://localhost:8080/v1/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query":"{ transfers { block_number from_address to_address amount_rev } }"}'

# Run comprehensive transfer analysis
python3 analyze_transfers.py
```

## Requirements

- Docker and Docker Compose (recommended)
- OR Python 3.9+ and PostgreSQL 14+
- Running RChain node (gRPC port 40412, HTTP port 40413)
- Pre-compiled Rust CLI binary (included for Linux x86_64)

## Installation

### Docker Installation (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd indexer

# Start services with Rust indexer
docker-compose -f docker-compose.rust.yml up -d

# Verify it's working
curl http://localhost:9090/status | jq .
```

### Building Rust CLI (Optional)

If you need to build the Rust CLI for a different platform:

```bash
# Clone rust-client repository
cd ../rust-client

# For Linux (cross-compilation from macOS)
rustup target add x86_64-unknown-linux-musl
brew install filosottile/musl-cross/musl-cross
CC=x86_64-linux-musl-gcc cargo build --release --target x86_64-unknown-linux-musl

# Copy to indexer
cp target/x86_64-unknown-linux-musl/release/node_cli ../indexer/node_cli_linux
```

## Configuration

Environment variables for Rust indexer:

- `RUST_CLI_PATH`: Path to node_cli binary (default: /usr/local/bin/node_cli)
- `NODE_HOST`: RChain node hostname (default: host.docker.internal)
- `GRPC_PORT`: gRPC port for blockchain operations (default: 40412)
- `HTTP_PORT`: HTTP port for status queries (default: 40413)
- `DATABASE_URL`: PostgreSQL connection string
- `SYNC_INTERVAL`: Seconds between sync cycles (default: 5)
- `BATCH_SIZE`: Number of blocks per batch (default: 50)
- `START_FROM_BLOCK`: Initial block to sync from (default: 0)
- `LOG_LEVEL`: Logging level (default: INFO)
- `MONITORING_PORT`: API server port (default: 9090)
- `ENABLE_REV_TRANSFER_EXTRACTION`: Extract REV transfers (default: true)

## Database Schema

### Core Tables

- **blocks**: Blockchain blocks with comprehensive metadata
  - Enhanced with JSONB fields for `bonds_map` and `justifications`
  - Tracks finalization status and fault tolerance metrics
  - 150-char proposer field for full validator keys

- **deployments**: Smart contract deployments
  - Full Rholang term storage
  - Automatic type classification
  - Error tracking and status management

- **transfers**: REV token transfers
  - Supports both REV addresses (54-56 chars) and validator public keys (130+ chars)
  - Tracks amounts in both dust and REV (8 decimal precision)
  - Links to deployments and blocks

- **balance_states**: Address balance tracking
  - Separate bonded and unbonded balances
  - Point-in-time balance snapshots per block
  - Supports both validator keys and REV addresses

- **validators**: Validator registry
  - Full public key storage (up to 200 chars)
  - Status tracking (active/bonded/quarantine/inactive)
  - First/last seen block tracking

- **validator_bonds**: Stake records per block
  - Genesis bonds automatically extracted
  - Links to blocks for historical tracking

- **block_validators**: Block signers/justifications
  - Many-to-many relationship between blocks and validators

- **network_stats**: Network health snapshots
  - Consensus participation rates
  - Active validator counts
  - Quarantine metrics

- **epoch_transitions**: Epoch boundaries
  - Start/end blocks per epoch
  - Active validator counts

- **indexer_state**: Indexer metadata (⚠️ Not implemented)
  - Intended for key-value store for indexer state
  - Currently not created in schema

## API Endpoints

### Status and Health

```bash
# Detailed sync status
curl http://localhost:9090/status | jq .

# Health check
curl http://localhost:9090/health

# Readiness check
curl http://localhost:9090/ready
```

### Data Endpoints

All existing endpoints continue to work with enhanced data:

```bash
# Blocks with enhanced metadata
curl http://localhost:9090/api/blocks | jq .

# Network statistics
curl http://localhost:9090/api/stats/network | jq .

# Epoch information
curl http://localhost:9090/api/epochs | jq .

# Validator performance
curl http://localhost:9090/api/validators | jq .
```

## Monitoring

The Rust indexer provides enhanced metrics:

- `indexer_blocks_indexed_total`: Total blocks processed
- `indexer_sync_lag_blocks`: Blocks behind chain head
- `indexer_cli_commands_total`: CLI commands executed
- `indexer_cli_errors_total`: CLI command failures
- `indexer_epoch_transitions_total`: Epoch changes detected
- `indexer_network_health_score`: Network consensus health (0-1)

## Troubleshooting

### Common Issues

1. **CLI binary not found**
   - Ensure `node_cli_linux` is in the indexer directory
   - Check binary has execute permissions: `chmod +x node_cli_linux`

2. **Cannot connect to node**
   - Verify node is running and ports are accessible
   - Check `NODE_HOST` is set correctly (use `host.docker.internal` for Docker)

3. **Database schema errors**
   - Run migrations: `docker exec asi-indexer-db psql -U indexer -d asichain < migrations/002_add_enhanced_tables.sql`

### Reset and Start Fresh

```bash
# Stop services and remove data
docker-compose -f docker-compose.rust.yml down -v

# Start fresh sync from block 0
docker-compose -f docker-compose.rust.yml up -d
```

## Performance Characteristics

- **Memory Usage**: ~80MB (indexer) + ~50MB (database)
- **CPU Usage**: <5% during sync, <1% when caught up
- **Sync Performance**: 100 blocks in ~2 seconds
- **Database Growth**: ~100KB per 100 blocks (with enhanced data)
- **CLI Command Latency**: 10-50ms per command
- **Full Chain Sync**: Capable of syncing entire blockchain

## Migration from HTTP Indexer

To migrate from the HTTP-based indexer:

1. **Export existing data** (optional):
   ```bash
   docker exec asi-indexer-db pg_dump -U indexer asichain > backup.sql
   ```

2. **Stop old indexer**:
   ```bash
   docker-compose down
   ```

3. **Start Rust indexer**:
   ```bash
   docker-compose -f docker-compose.rust.yml up -d
   ```

The Rust indexer will start syncing from block 0 by default, building a complete chain history.

## Development

### Project Structure

```
indexer/
├── src/
│   ├── rust_cli_client.py    # Rust CLI wrapper
│   ├── rust_indexer.py        # Enhanced indexer implementation
│   ├── models.py              # Updated database models
│   └── main.py                # Entry point with CLI detection
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_add_enhanced_tables.sql
├── node_cli_linux             # Pre-compiled Rust CLI
├── docker-compose.rust.yml    # Rust indexer deployment
└── Dockerfile.rust-simple     # Simplified Docker build
```

### Adding New CLI Commands

To add support for new CLI commands:

1. Add method to `RustCLIClient` in `rust_cli_client.py`
2. Parse command output (text or JSON)
3. Update indexer logic in `rust_indexer.py`
4. Add database models if needed
5. Create migration for schema changes

## License

MIT
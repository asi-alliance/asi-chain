# ASI-Chain Indexer

A high-performance blockchain indexer for ASI-Chain that synchronizes data from RChain nodes using the Rust CLI client and stores it in PostgreSQL for efficient querying.

## 🚀 Major Update: Zero-Touch Deployment (v2.1.1)

The indexer now features complete automation with zero manual configuration:
- ⚡ **Fully automatic Hasura relationships** - no manual GraphQL setup required
- **Automatic genesis data extraction** - validator bonds and REV allocations
- **Full blockchain sync from genesis (block 0)** - no API limitations
- **Enhanced REV transfer detection** - supports match-based Rholang patterns
- **Comprehensive database schema** - single migration with all enhancements
- **Enhanced balance tracking** - bonded vs unbonded REV balances with computed totals
- **Network-agnostic design** - works with any ASI-Chain network
- **One-command deployment** - `echo "Yes" | ./deploy.sh` for complete setup

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
- **Zero-touch deployment** - complete automation with automatic Hasura relationships
- **Complete REST API and GraphQL interface** with working nested queries

⚠️ **Known Limitations:**
- **Epoch transitions tracking** - Table exists but data not populated (epoch rewards not tracked)
- **Validator rewards** - Not tracked in current implementation

✅ **Recently Fixed (v2.1.1):**
- **Manual Hasura configuration eliminated** - relationships setup automatically during deployment
- **Deployment script enhanced** - relationship setup moved before interactive prompts
- **Timeout protection** - prevents hanging during GraphQL relationship configuration
- **Comprehensive migration** - single `000_comprehensive_initial_schema.sql` includes all enhancements
- **Data quality improvements** - proper NULL handling for deployment error messages
- **Enhanced error tracking** - prevents false positives in failed deployment counts

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
- Cross-compiled from macOS ARM64 to Linux x86_64 in Docker
- Enhanced database schema for additional data types
- Removed dependency on limited HTTP APIs
- Proper NULL handling in error_message fields
- Multi-stage Docker builds for optimized images

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

## ⚡ Quick Start (v2.1.1)

```bash
# One-command deployment with zero manual configuration
cd indexer
echo "Yes" | ./deploy.sh

# What happens automatically:
# ✅ Pre-pull Docker images with retry logic
# ✅ Cross-platform Rust CLI build from source (10-15 min first time, cached thereafter)
# ✅ Complete database schema with enhancements (single migration)
# ✅ All services started and health-checked
# ✅ Hasura GraphQL relationships configured automatically
# ✅ Nested query capabilities verified in real-time
# ✅ Blockchain sync from genesis starts immediately
# ✅ Data quality validation with proper NULL handling

# Check deployment status
curl http://localhost:9090/status | jq .

# Test enhanced nested GraphQL queries (work immediately!)
curl http://localhost:8080/v1/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query":"{ blocks(limit: 1) { block_number deployments { deploy_id deployment_type } validator_bonds { stake } } }"}'

# Access GraphQL Console with working relationships
open http://localhost:8080/console

# Comprehensive relationship testing
./scripts/test-relationships.sh
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

# Option 1: Use automated deployment script (recommended)
echo "1" | ./deploy.sh  # Chooses remote F1R3FLY node configuration

# Option 2: Manual Docker Compose
docker-compose -f docker-compose.rust.yml up -d

# Verify it's working
curl http://localhost:9090/status | jq .
```

### Docker Configuration Files

#### Dockerfiles

1. **Dockerfile.rust-builder** (Default - Build from source)
   - Builds Rust CLI from rust-client submodule
   - Multi-stage build: Rust → Python → Runtime
   - Takes 10-15 minutes first build, cached thereafter
   - Cross-platform compatible
   - Used by: `docker-compose.rust.yml`

2. **Dockerfile.rust-simple** (Pre-compiled binary)
   - Uses pre-compiled `node_cli_linux` binary
   - Faster deployment (no Rust compilation)
   - Requires binary at `indexer/node_cli_linux`
   - Single-stage Python build

3. **Dockerfile** (Legacy HTTP indexer)
   - Original HTTP-based indexer
   - Deprecated - use Rust CLI versions instead

#### Docker Compose Files

1. **docker-compose.rust.yml** (Production)
   - Uses Dockerfile.rust-builder by default
   - Services included:
     - `postgres`: PostgreSQL 14 Alpine (port 5432)
     - `rust-indexer`: Python indexer with Rust CLI (port 9090)
     - `hasura`: Hasura GraphQL Engine (port 8080)
   - Network: Custom bridge network `indexer-network`
   - Volumes: 
     - `postgres_data`: Persistent database storage
     - `./migrations:/docker-entrypoint-initdb.d`: Auto-run SQL migrations
   - Health checks configured for all services

2. **docker-compose.yml** (Legacy)
   - Original HTTP-based configuration
   - Deprecated - use rust.yml version

### Environment Configuration Files

#### Available .env Templates

1. **.env.remote-observer** (Recommended for production)
   ```bash
   NODE_HOST=13.251.66.61  # Remote F1R3FLY server
   GRPC_PORT=40452         # Observer gRPC port
   HTTP_PORT=40453         # Observer HTTP port
   ```
   - Connects to production F1R3FLY network
   - Read-only observer node (best for indexing)

2. **.env.rust** (Local F1R3FLY)
   ```bash
   NODE_HOST=host.docker.internal  # Docker host
   GRPC_PORT=40412                # Local validator gRPC
   HTTP_PORT=40413                # Local validator HTTP
   ```
   - For local F1R3FLY development

3. **.env.template** (Manual configuration)
   - Blank template for custom setup
   - Copy and modify as needed

4. **.env.example** (Reference)
   - Shows all available configuration options
   - Includes descriptions

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

### Switching Between Configurations

```bash
# Switch to remote F1R3FLY (production)
cp .env.remote-observer .env
docker-compose -f docker-compose.rust.yml restart rust-indexer

# Switch to local F1R3FLY (development)
cp .env.rust .env
docker-compose -f docker-compose.rust.yml restart rust-indexer

# Use pre-compiled binary instead of building from source
# 1. Edit docker-compose.rust.yml
# 2. Change: dockerfile: indexer/Dockerfile.rust-builder
#    To: dockerfile: indexer/Dockerfile.rust-simple
# 3. Ensure node_cli_linux exists in indexer directory
# 4. Rebuild: docker-compose -f docker-compose.rust.yml build
```

### Environment Variables

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
   - Check `NODE_HOST` is set correctly (use `host.docker.internal` for Docker on Mac/Windows)
   - For Linux Docker hosts, use actual IP address instead of `host.docker.internal`

3. **Database schema errors**
   - Run migrations: `docker exec asi-indexer-db psql -U indexer -d asichain < migrations/000_comprehensive_initial_schema.sql`

### Docker-Specific Issues

1. **Build fails with Dockerfile.rust-builder**
   - Ensure Docker has at least 8GB RAM allocated
   - Check disk space (need ~20GB free for Rust compilation)
   - Try cleaning Docker cache: `docker system prune -a`
   - Switch to pre-compiled binary method (Dockerfile.rust-simple)

2. **Container health checks failing**
   ```bash
   # Check container logs
   docker-compose -f docker-compose.rust.yml logs rust-indexer
   
   # Verify all services are running
   docker-compose -f docker-compose.rust.yml ps
   
   # Check network connectivity between containers
   docker exec asi-rust-indexer ping postgres
   ```

3. **Permission errors with volumes**
   ```bash
   # Fix PostgreSQL volume permissions
   sudo chown -R 999:999 ./postgres_data
   
   # Or remove and recreate volumes
   docker-compose -f docker-compose.rust.yml down -v
   docker-compose -f docker-compose.rust.yml up -d
   ```

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
│   ├── rust_cli_client.py    # Rust CLI wrapper with bond detection fix
│   ├── rust_indexer.py        # Enhanced indexer with NULL handling
│   ├── models.py              # Database models (10 tables)
│   ├── main.py                # Entry point with CLI detection
│   └── monitoring.py          # REST API and metrics endpoints
├── migrations/
│   ├── 000_comprehensive_initial_schema.sql  # Complete v2.1.1 schema
│   ├── 001_initial_schema.sql               # Legacy
│   └── 002_add_enhanced_tables.sql          # Legacy
├── scripts/
│   ├── deploy.sh                    # One-command deployment script
│   ├── configure-hasura.sh          # Bash-based Hasura setup
│   ├── setup-hasura-relationships.sh # Automatic relationship config
│   └── test-relationships.sh         # GraphQL relationship tests
├── examples/
│   └── graphql-queries.md           # Sample GraphQL queries
├── Docker Configuration:
│   ├── Dockerfile                   # Legacy HTTP indexer
│   ├── Dockerfile.rust-builder      # Build from source (default)
│   ├── Dockerfile.rust-simple       # Pre-compiled binary
│   ├── Dockerfile.rust              # Alternative Rust build
│   ├── docker-compose.yml           # Legacy HTTP compose
│   └── docker-compose.rust.yml      # Production Rust compose
├── Environment Templates:
│   ├── .env                         # Active configuration
│   ├── .env.remote-observer         # Remote F1R3FLY (production)
│   ├── .env.rust                    # Local F1R3FLY setup
│   ├── .env.template                # Blank template
│   └── .env.example                 # Reference with all options
├── Documentation:
│   ├── README.md                    # This file (v2.1.1)
│   ├── API.md                       # REST API documentation
│   ├── CHANGELOG.md                 # Version history
│   ├── DEPLOYMENT.md                # Deployment scenarios
│   ├── DEPLOYMENT_GUIDE.md          # Quick deployment guide
│   ├── DEPLOYMENT_DOCUMENTATION.md  # Comprehensive deployment
│   ├── GRAPHQL_GUIDE.md             # GraphQL usage guide
│   └── GRAPHQL_SCHEMA.md            # Database schema reference
└── node_cli_linux                   # Pre-compiled Rust CLI (optional)
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
# ASI-Chain Indexer Deployment Guide

**Version**: 2.1.1 | **Updated**: January 2025  
**Features**: Automatic Hasura relationships, Cross-platform Docker builds, Smart configuration templates, Remote F1R3FLY node support, Enhanced data quality

## Overview

The ASI-Chain Indexer is a high-performance blockchain data synchronization service that uses the Rust CLI (`node_cli`) to extract comprehensive data from F1R3FLY blockchain nodes. It stores this data in PostgreSQL and provides both REST and GraphQL APIs for efficient querying.

## Architecture

```
┌─────────────────┐     Rust CLI       ┌─────────────────┐
│  F1R3FLY Node   │ ←────────────────→ │  Rust Indexer   │
│  (gRPC/HTTP)    │                    │ (Python/asyncio)│
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

## Prerequisites

1. **F1R3FLY blockchain network**
   - Can use local nodes or remote nodes
   - Observer node recommended for indexing (ports 40452/40453)
   - Validator nodes for transactions (ports 40412/40413)
   - Example remote node: 13.251.66.61

2. **Rust CLI binary**
   - **Option A**: Pre-compiled binary (`node_cli_linux`) in indexer directory
   - **Option B**: Build from source in Docker (recommended for cross-platform)
   - **Option C**: Use local binary for development

3. **Docker and Docker Compose**
   - Docker Engine 20.10+
   - Docker Compose v2+

4. **System Requirements**
   - 4GB+ RAM (8GB recommended for building Rust CLI)
   - 20GB+ disk space
   - Network access to F1R3FLY node

## ⚡ Quick Start (v2.1.1)

**One command deployment with automatic Hasura relationships:**

```bash
cd /path/to/asi-chain/indexer
echo "Yes" | ./deploy.sh
```

**What you get:**
- ✅ Complete indexer deployment (10-15 minutes first time with Rust build, 2-3 minutes thereafter)
- ✅ Comprehensive database schema with enhanced features
- ✅ **Automatic GraphQL relationships** - no manual configuration
- ✅ Real-time blockchain synchronization from genesis block
- ✅ Working REST API (port 9090) and GraphQL API (port 8080)
- ✅ Enhanced data quality with proper NULL handling

**Immediately test complex nested queries:**
```graphql
{ 
  blocks(limit: 5) { 
    block_number 
    deployments { deploy_id deployment_type }
    validator_bonds { stake }
  }
}
```

## Deployment Methods

### Method 1: Automated Deploy Script (Recommended)

The deploy script handles the entire deployment process with comprehensive error handling, build method detection, and interactive configuration.

```bash
cd /path/to/asi-chain/indexer
./deploy.sh
```

#### What the Deploy Script Does (v2.1.1)

1. **System & Build Method Detection**
   - Detects build-from-source vs pre-compiled binary deployment
   - Checks system requirements (RAM, disk space) for Rust builds
   - Pre-pulls Docker images including Rust compiler if needed
   - Sets appropriate timeouts (3min for builds, 1min for pre-compiled)

2. **Smart Configuration Management**
   - Interactive configuration template selection:
     - Remote F1R3FLY node (13.251.66.61) - **recommended**
     - Local F1R3FLY node (host.docker.internal)
     - Manual configuration
   - Creates optimized `.env` files from templates
   - Validates Rust CLI availability (binary exists or will be built)

3. **Enhanced Connectivity Testing**
   - Tests F1R3FLY node connectivity with proper host resolution
   - Validates F1R3FLY API endpoints (not just port connectivity)
   - Provides detailed troubleshooting guidance for connection failures
   - Supports both local and remote node configurations

4. **Intelligent Deployment Process**
   - Build-from-source: Shows progress, estimates time, checks resources
   - Pre-compiled binary: Fast deployment with validation
   - Extended health check timeouts for build processes
   - Comprehensive error handling with recovery suggestions

5. **Fully Automatic Hasura Configuration** ⚡
   - **Zero manual configuration required** - relationships setup automatically
   - Tracks all database tables (blocks, deployments, transfers, validators, etc.)
   - Creates bidirectional GraphQL relationships between all tables
   - Manual relationships for validator tables (no foreign key dependency)
   - Configures public read permissions for all tables
   - **Real-time verification** - tests nested queries immediately after setup
   - **60-second timeout protection** - never hangs during relationship setup
   - **Detailed error reporting** - shows specific issues if setup fails

6. **Comprehensive Verification**
   - Real-time sync progress monitoring
   - API endpoint health checks (REST + GraphQL)
   - Database initialization validation
   - Final deployment summary with configuration details
   - Next steps guidance and monitoring commands

### Method 2: Docker Compose with Built-in Rust CLI Building

Build the Rust CLI from source inside Docker (recommended for cross-platform compatibility):

```bash
# 1. Ensure you're in the indexer directory
cd indexer

# 2. Create/update environment file
cp .env.example .env
# Or use the remote observer configuration
cp .env.remote-observer .env

# 3. Build and deploy with Rust CLI compilation
docker-compose -f docker-compose.rust.yml up -d --build

# This will:
# - Build the Rust CLI from source inside Docker
# - Set up PostgreSQL database
# - Deploy the indexer with the compiled CLI
# - Start Hasura GraphQL engine
```

**Note**: Building the Rust CLI requires ~10-15 minutes on first run and ~8GB RAM.

### Method 3: Docker Compose with Pre-compiled Binary

For faster deployment using a pre-compiled binary:

```bash
# 1. Ensure node_cli_linux binary exists
ls -la node_cli_linux  # Should be executable

# 2. Deploy using the simple Dockerfile
docker-compose -f docker-compose.rust.yml up -d
```

#### Environment Configuration

**For Remote F1R3FLY Node (Recommended):**
```env
NODE_HOST=13.251.66.61  # Or your F1R3FLY node IP
GRPC_PORT=40452         # Observer node gRPC
HTTP_PORT=40453         # Observer node HTTP
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain
RUST_CLI_PATH=/usr/local/bin/node_cli
```

**For Local F1R3FLY Node on Mac/Windows:**
```env
NODE_HOST=host.docker.internal
GRPC_PORT=40452
HTTP_PORT=40453
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain
RUST_CLI_PATH=/usr/local/bin/node_cli
```

**Additional Settings:**
```env
# Sync Configuration
SYNC_INTERVAL=5              # Seconds between sync cycles
BATCH_SIZE=50               # Blocks per batch
START_FROM_BLOCK=0          # Starting block (0 for genesis)

# Features
ENABLE_REV_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true

# Monitoring
MONITORING_PORT=9090
LOG_LEVEL=INFO
LOG_FORMAT=json

# Hasura
HASURA_ADMIN_SECRET=myadminsecretkey
```

```bash
# 3. Deploy services
docker-compose -f docker-compose.rust.yml up -d

# 4. Configure Hasura (if not auto-configured)
bash scripts/configure-hasura.sh
```

## Docker Build Options

The indexer supports multiple Docker build configurations:

### 1. Dockerfile.rust-builder (Recommended)
Builds the Rust CLI from source inside Docker - best for cross-platform compatibility:

```bash
# Uses rust:latest to compile node_cli from rust-client source
# Context: .. (parent directory to access rust-client)
# Dockerfile: indexer/Dockerfile.rust-builder
docker-compose -f docker-compose.rust.yml up -d --build
```

**Pros**: 
- Works on any platform (macOS ARM64, Linux x86_64, etc.)
- Always uses latest Rust CLI code
- No pre-compiled binary required

**Cons**: 
- Longer build time (10-15 minutes first time)
- Requires more RAM (8GB recommended)

### 2. Dockerfile.rust-simple (Fast)
Uses pre-compiled `node_cli_linux` binary:

```bash
# Uses existing node_cli_linux binary in indexer directory
# Context: . (indexer directory)
# Dockerfile: indexer/Dockerfile.rust-simple
docker-compose -f docker-compose.rust.yml up -d
```

**Pros**: 
- Fast deployment (2-3 minutes)
- Lower resource requirements

**Cons**: 
- Requires pre-compiled binary
- Architecture specific (Linux x86_64)
- Binary must be manually updated

### Method 4: Local Development Setup

For development and testing without Docker:

```bash
# 1. Use rust environment configuration
cp .env.rust .env

# 2. Edit for local paths
vim .env
# Set RUST_CLI_PATH to your local rust client path
# Set NODE_HOST to localhost or node IP
# Update DATABASE_URL to use localhost instead of postgres container name

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start PostgreSQL
docker run -d \
  --name indexer-db \
  -e POSTGRES_DB=asichain \
  -e POSTGRES_USER=indexer \
  -e POSTGRES_PASSWORD=indexer_pass \
  -p 5432:5432 \
  postgres:14-alpine

# 5. Run database migrations (single comprehensive schema)
psql -U indexer -d asichain -h localhost < migrations/000_comprehensive_initial_schema.sql

# This single migration includes:
# - Core blockchain tables (blocks, deployments, transfers)  
# - Extended validator names (VARCHAR(160) for full public keys)
# - Balance tracking with bonded/unbonded separation
# - Network statistics and epoch transition tracking
# - All indexes, triggers, and constraints

# 6. Build Rust CLI (if not already built)
cd ../rust-client
cargo build --release
cd ../indexer

# 7. Run indexer
python -m src.main

# Optional: Run with specific starting block
python -m src.main --start-from 100

# Optional: Reset database before starting
python -m src.main --reset
```

## Successful Deployment Verification

After deployment, verify all services are running correctly:

```bash
# Check service status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check indexer status
curl -s http://localhost:9090/status | jq .

# Expected output shows:
# - indexer.running: true
# - indexer.last_indexed_block: increasing number
# - node.connected: true
# - database.total_blocks: growing number
# - sync_percentage: approaching 100.0
```

**Healthy deployment indicators:**
- All containers show "healthy" status
- Indexer logs show "Block indexed" messages  
- REST API responds with sync progress
- Database contains growing number of blocks
- GraphQL API returns data for blocks query
- Sync percentage reaches 100% when caught up

**Example healthy status response:**
```json
{
  "indexer": {
    "version": "2.0.0",
    "indexer_type": "rust_cli", 
    "running": true,
    "last_indexed_block": 140,
    "sync_lag": 0,
    "sync_percentage": 100.0,
    "syncing_from_genesis": true
  },
  "node": {
    "connected": true,
    "host": "13.251.66.61",
    "latest_block": 140
  }
}
```

## Service Endpoints

### REST API (Port 9090)

- **Status**: `http://localhost:9090/status`
  ```bash
  curl http://localhost:9090/status | jq .
  ```

- **Health Check**: `http://localhost:9090/health`
  ```bash
  curl http://localhost:9090/health
  ```

- **Metrics**: `http://localhost:9090/metrics`
  ```bash
  curl http://localhost:9090/metrics
  ```

- **Block Data**: `http://localhost:9090/api/blocks`
  ```bash
  curl http://localhost:9090/api/blocks?limit=10 | jq .
  ```

- **Validators**: `http://localhost:9090/api/validators`
  ```bash
  curl http://localhost:9090/api/validators | jq .
  ```

- **Network Stats**: `http://localhost:9090/api/stats/network`
  ```bash
  curl http://localhost:9090/api/stats/network | jq .
  ```

### GraphQL API (Port 8080)

- **GraphQL Endpoint**: `http://localhost:8080/v1/graphql`
- **Hasura Console**: `http://localhost:8080/console`
- **Admin Secret**: `myadminsecretkey` (configure in production)
- **Available Tables**: blocks, deployments, transfers, validators, validator_bonds, balance_states, network_stats, epoch_transitions

#### Example GraphQL Queries

```bash
# Query latest blocks (basic)
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks(limit: 5) { block_number block_hash timestamp } }"}'

# Query blocks with deployments relationship
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks(limit: 1) { block_number deployments { deploy_id } } }"}'

# Query REV transfers (with admin secret)
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ transfers(limit: 10) { block_number from_address to_address amount_rev timestamp } }"
  }'

# Query validators
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ validators { public_key stake_amount is_active first_seen_block } }"
  }'
```

### PostgreSQL Database (Port 5432)

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `asichain`
- **Username**: `indexer`
- **Password**: `indexer_pass`

```bash
# Connect with psql
psql -h localhost -U indexer -d asichain

# Example queries
SELECT COUNT(*) FROM blocks;
SELECT * FROM transfers ORDER BY block_number DESC LIMIT 10;
SELECT * FROM validators WHERE is_active = true;
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.rust.yml logs -f

# Specific service
docker-compose -f docker-compose.rust.yml logs -f rust-indexer
docker-compose -f docker-compose.rust.yml logs -f postgres
docker-compose -f docker-compose.rust.yml logs -f hasura

# Last 100 lines
docker-compose -f docker-compose.rust.yml logs --tail=100 rust-indexer
```

### Check Service Status

```bash
# Service health
docker-compose -f docker-compose.rust.yml ps

# Indexer sync status
curl http://localhost:9090/status | jq .

# Database statistics
docker exec asi-indexer-db psql -U indexer -d asichain -c "
  SELECT 
    (SELECT COUNT(*) FROM blocks) as blocks,
    (SELECT COUNT(*) FROM deployments) as deployments,
    (SELECT COUNT(*) FROM transfers) as transfers,
    (SELECT COUNT(*) FROM validators) as validators;
"
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.rust.yml restart

# Restart specific service
docker-compose -f docker-compose.rust.yml restart rust-indexer

# Stop and start fresh
docker-compose -f docker-compose.rust.yml down
docker-compose -f docker-compose.rust.yml up -d
```

### Reset Database

```bash
# Stop services and remove volumes
docker-compose -f docker-compose.rust.yml down -v

# Start fresh
./deploy.sh
# Choose 'y' when prompted to reset database
```

## Troubleshooting

### Common Issues

#### 1. Cannot Connect to Node

**Symptom**: Indexer logs show "Cannot connect to ASI-Chain node"

**Solutions**:
- Verify F1R3FLY network is running: `docker ps | grep rnode`
- Check node ports are accessible: `nc -zv localhost 40412`
- Update NODE_HOST in .env file
- For Docker Desktop: use `host.docker.internal`
- For Linux: use actual IP address or `172.17.0.1`

#### 2. Database Connection Errors

**Symptom**: "could not connect to database"

**Solutions**:
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify credentials in .env match docker-compose.yml
- Check database exists: `docker exec asi-indexer-db psql -U indexer -l`
- Reset database: `docker-compose -f docker-compose.rust.yml down -v`

#### 3. Rust CLI Not Found

**Symptom**: "Rust CLI not found at /usr/local/bin/node_cli"

**Solutions**:
- **For Dockerfile.rust-simple**: Ensure `node_cli_linux` exists in indexer directory: `ls -la node_cli_linux`
- **For Dockerfile.rust-simple**: Check file permissions: `chmod +x node_cli_linux`
- **For Dockerfile.rust-builder**: Check Docker build logs for Rust compilation errors
- **Alternative**: Switch to `Dockerfile.rust-builder` to build from source

#### 4. GraphQL Not Working

**Symptom**: Hasura console shows no tables

**Solutions**:
- Run configuration script: `bash scripts/configure-hasura.sh`
- Check Hasura logs: `docker logs asi-hasura`
- Verify admin secret in requests
- Manually track tables in Hasura console

#### 5. Docker Build Failures

**Symptom**: "failed to solve" or Rust compilation errors during build

**Solutions**:
- **Insufficient RAM**: Ensure 8GB+ available for Rust compilation
- **Disk space**: Ensure 20GB+ free space for Docker layers
- **Rust version**: Build uses `rust:latest`, may need specific version
- **Network issues**: Check internet connection for crate downloads
- **Architecture issues**: Use `Dockerfile.rust-builder` for cross-platform builds
- **Clean rebuild**: `docker system prune -a && docker-compose up -d --build --no-cache`

#### 6. Architecture Compatibility

**Symptom**: "rosetta error" or "failed to open elf" when using pre-compiled binary

**Solutions**:
- **macOS ARM64**: Use `Dockerfile.rust-builder` to build from source
- **Different architectures**: Always use `Dockerfile.rust-builder` for cross-platform
- **Emulation errors**: Build natively instead of using pre-compiled x86_64 binary

#### 7. Duplicate Key Constraint Errors

**Symptom**: PostgreSQL duplicate key errors in indexer logs during sync

**Example Error**: `duplicate key value violates unique constraint "blocks_pkey"`

**Solutions**:
- **Normal behavior**: Indexer recovers gracefully and continues syncing
- **No action required**: These errors don't impact functionality
- **Root cause**: Race conditions during batch block processing
- **Monitoring**: Verify `sync_percentage` continues to increase despite errors
- **If persistent**: Restart indexer with database reset: `docker-compose down -v`

#### 8. Slow Synchronization

**Symptom**: Indexer processing blocks slowly

**Solutions**:
- Increase BATCH_SIZE in .env (default: 50, max: 100)
- Check node performance and network latency
- Verify sufficient system resources
- Consider starting from recent block instead of genesis
- Use Observer node (40452/40453) instead of Validator for better read performance
- **Monitor progress**: `curl http://localhost:9090/status | jq .indexer.sync_percentage`

### Debug Commands

```bash
# Check Docker network
docker network ls
docker network inspect indexer_indexer-network

# Test node connectivity from container
docker exec asi-rust-indexer curl -v http://host.docker.internal:40413/status

# Check Rust CLI functionality
docker exec asi-rust-indexer /usr/local/bin/node_cli --version

# Test Rust CLI connection to F1R3FLY node
docker exec asi-rust-indexer /usr/local/bin/node_cli last-finalized-block \
  --host 13.251.66.61 --port 40452

# Database connection test
docker exec asi-indexer-db pg_isready -U indexer -d asichain

# View environment variables
docker exec asi-rust-indexer env | grep -E "NODE_|DATABASE_|RUST_"

# Check Docker build details
docker image inspect indexer-rust-indexer:latest | jq '.[0].Config.Labels'

# Verify Rust CLI architecture
docker exec asi-rust-indexer file /usr/local/bin/node_cli
```

## Recent Deployment Success Stories

### v2.1.1 Deployment - Full Automation with Data Quality (January 2025)

**Environment**: macOS ARM64 → Docker Linux x86_64  
**Build Method**: build-from-source (Dockerfile.rust-builder)  
**F1R3FLY Node**: Remote observer (13.251.66.61:40453)  
**Key Enhancements**: 
- ⚡ **Zero-touch Hasura relationship setup**
- 🔧 **Enhanced data quality** - proper NULL handling for error messages
- 📊 **Improved deployment classification**

**Results**:
- ✅ **Build Time**: 10-15 minutes for initial Rust CLI compilation (cached thereafter)  
- ✅ **Full Deployment**: Complete automation including relationship setup  
- ✅ **GraphQL Relationships**: **Configured automatically** - no manual steps  
- ✅ **Sync Performance**: Processes 50 blocks per batch from genesis  
- ✅ **Zero Downtime**: All services healthy with working relationships  
- ✅ **Cross-platform**: Seamless macOS → Linux Docker compilation  
- ✅ **Data Quality**: Proper NULL handling prevents false error reports  

**Automatic Hasura Setup Output**:
```
--- Setting up Hasura GraphQL relationships... ---
Running Hasura relationship setup...
Setting up GraphQL relationships for nested queries...
✅ Hasura relationships configured successfully!
Testing nested GraphQL query...
✅ Nested queries working! You can now use relationships like blocks->deployments
```

**Enhanced GraphQL Capabilities**:
```graphql
# Complex nested queries work immediately after deployment
{
  blocks(limit: 1) { 
    block_number 
    deployments { deploy_id deployment_type }
    validator_bonds { stake }
  }
  validators { 
    name              # VARCHAR(160) for full public keys
    validator_bonds { stake block { block_number } }
  }
  balance_states { 
    total_balance_rev # Auto-computed from bonded + unbonded
    block { block_number }
  }
}
```

**Key Metrics**:
```json
{
  "indexer": {
    "sync_percentage": 100.0,
    "sync_lag": 0,
    "last_indexed_block": 172
  },
  "database": {
    "total_blocks": 172,
    "total_deployments": 185,
    "total_transfers": 3,
    "total_validators": 3
  }
}
```

**What Changed in v2.1.1**:
- ✅ **No more manual Hasura configuration** required (v2.1.0)
- ✅ **Relationship setup moved** before interactive prompts (v2.1.0)
- ✅ **Timeout protection** prevents deployment hanging (v2.1.0)
- ✅ **Immediate verification** tests relationships automatically (v2.1.0)
- ✅ **Better error handling** with detailed troubleshooting (v2.1.0)
- ✅ **Data quality improvements** - empty error messages converted to NULL (v2.1.1)
- ✅ **Enhanced deployment monitoring** - better progress tracking (v2.1.1)

This demonstrates the enhanced automation and reliability of the v2.1.1 deployment system with improved data quality handling.

## Performance Tuning

### Indexer Configuration

```env
# Increase for faster sync (more memory usage)
BATCH_SIZE=100

# Decrease for more frequent updates
SYNC_INTERVAL=2

# Increase for better connection pooling
DATABASE_POOL_SIZE=30

# Adjust based on your starting point
START_FROM_BLOCK=1000
```

### PostgreSQL Optimization

```sql
-- Add custom indexes for common queries
CREATE INDEX idx_transfers_timestamp ON transfers(timestamp DESC);
CREATE INDEX idx_blocks_proposer ON blocks(proposer);
CREATE INDEX idx_deployments_type ON deployments(deployment_type);

-- Analyze tables for query optimization
ANALYZE blocks;
ANALYZE deployments;
ANALYZE transfers;
```

### Docker Resource Limits

```yaml
# In docker-compose.rust.yml, add resource limits:
services:
  rust-indexer:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

## Security Considerations

1. **Change Default Passwords**
   - Update PostgreSQL password in production
   - Change Hasura admin secret
   - Use strong, unique passwords

2. **Network Security**
   - Use firewall rules to restrict access
   - Consider VPN for remote node connections
   - Enable SSL/TLS for production deployments

3. **Access Control**
   - Limit database user permissions
   - Configure Hasura role-based access
   - Use read-only credentials where possible

4. **Monitoring**
   - Set up alerts for service failures
   - Monitor disk space usage
   - Track API request patterns

## Support and Resources

- **Documentation**: [ASI-Chain Docs](https://docs.superintelligence.io)
- **GitHub Issues**: Report bugs and request features
- **Logs Location**: `/var/log/indexer/` (in container)
- **Configuration**: `/app/.env` (in container)

## License

MIT License - See LICENSE file for details
# ASI-Chain Indexer Deployment Guide

**Version**: 2.1.1 | **Updated**: January 2025

This guide covers various deployment scenarios for the ASI-Chain Indexer with network-agnostic genesis support and zero-touch deployment.

## ✨ v2.1.1 Features (Latest - Data Quality & Bond Detection)

- **Zero-Touch Deployment**: One-command setup with automatic configuration
- **Validator Bond Detection**: Fixed regex pattern for new CLI output format
- **Data Quality**: Proper NULL handling for deployment error messages
- **Network-Agnostic Genesis Processing**: Automatic validator bond and REV allocation extraction
- **Full Blockchain Sync**: Index from genesis (block 0) without limitations
- **Enhanced REV Transfer Detection**: Supports both variable-based and match-based Rholang patterns
- **Balance State Tracking**: Separate bonded and unbonded balances per address
- **GraphQL API Integration**: Automatic Hasura relationship configuration
- **Rust CLI Integration**: Built from source inside Docker (cross-platform)
- **Address Validation**: Supports 53-56 character REV addresses
- **10 Comprehensive Tables**: Complete blockchain data model

## Key Capabilities

- **Genesis Data Extraction**: Automatically processes validator bonds from block 0
- **REV Balance Tracking**: Monitors bonded vs unbonded balances for all addresses
- **GraphQL API**: Query all data via Hasura at http://localhost:8080
- **Advanced Transfer Detection**: Handles both variable (@fromAddr) and match-based Rholang patterns
- **Full Validator Keys**: Supports 130+ character validator public keys
- **Comprehensive Metrics**: Prometheus-compatible monitoring endpoint
- **Zero-dependency Hasura Setup**: Uses curl-based configuration script

## Table of Contents
- [Quick Start](#quick-start)
- [Rust CLI Setup](#rust-cli-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Migration from HTTP Indexer](#migration-from-http-indexer)
- [Multi-Node Setup](#multi-node-setup)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Quick Start

Deploy with the automated deployment script:

```bash
# Clone repository
git clone <repository-url>
cd indexer

# One-command deployment (recommended)
echo "1" | ./deploy.sh  # Choose option 1 for remote F1R3FLY node

# The script will:
# - Pre-pull Docker images with retry logic
# - Build Rust CLI from source (10-15 min first time, cached thereafter)
# - Check Docker and network connectivity
# - Build and start all services (PostgreSQL, Indexer, Hasura)
# - Configure Hasura relationships automatically
# - Verify genesis block processing with validator bonds
# - Display service URLs and status
# - Run functionality tests

# When prompted for fresh database, choose 'y' for clean start
```

Or deploy manually:

```bash
# Start services manually
docker-compose -f docker-compose.rust.yml up -d

# Configure Hasura (if not using deploy.sh)
bash scripts/configure-hasura.sh
# Or if you have Python dependencies installed:
# python3 scripts/configure-hasura.py
```

## Rust CLI Setup

### Build from Source (Default - Cross-platform)

The indexer now builds the Rust CLI from source inside Docker:

```bash
# Automatic build with docker-compose.rust.yml
# Uses Dockerfile.rust-builder which:
# - Builds Rust CLI from rust-client submodule
# - Cross-compiles for Linux inside container
# - Takes 10-15 minutes first time, cached thereafter
# - No manual Rust setup required
```

### Using Pre-compiled Binary (Alternative)

```bash
# If you have a pre-compiled binary:
# 1. Place it at: indexer/node_cli_linux
# 2. Update docker-compose.rust.yml to use Dockerfile.rust-simple
# 3. Deploy normally
```

### Building from Source

If you need to build for a different platform:

```bash
# Clone rust-client
cd ../rust-client

# For Linux (from macOS)
rustup target add x86_64-unknown-linux-musl
brew install filosottile/musl-cross/musl-cross

# Configure cargo
cat > .cargo/config.toml << EOF
[target.x86_64-unknown-linux-musl]
linker = "x86_64-linux-musl-gcc"
EOF

# Build
CC=x86_64-linux-musl-gcc cargo build --release --target x86_64-unknown-linux-musl

# Copy to indexer
cp target/x86_64-unknown-linux-musl/release/node_cli ../indexer/node_cli_linux
```

## Development Deployment

For local development with the Rust indexer:

```bash
# Create Python environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL with migrations
docker run -d \
  --name postgres-dev \
  -e POSTGRES_USER=indexer \
  -e POSTGRES_PASSWORD=indexer_pass \
  -e POSTGRES_DB=asichain \
  -p 5432:5432 \
  -v $(pwd)/migrations:/docker-entrypoint-initdb.d \
  postgres:14-alpine

# Configure environment for remote F1R3FLY node
export RUST_CLI_PATH=/path/to/rust-client/target/release/node_cli
export NODE_HOST=13.251.66.61  # Remote F1R3FLY node
export GRPC_PORT=40452          # Observer gRPC port
export HTTP_PORT=40453          # Observer HTTP port
export DATABASE_URL=postgresql://indexer:indexer_pass@localhost:5432/asichain

# Run indexer
python -m src.main
```

## Production Deployment

### Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  rust-indexer:
    build:
      context: .
      dockerfile: Dockerfile.rust-simple
    environment:
      - NODE_HOST=${NODE_HOST:-your-rchain-node}
      - GRPC_PORT=${GRPC_PORT:-40412}
      - HTTP_PORT=${HTTP_PORT:-40413}
      - DATABASE_URL=postgresql://indexer:${DB_PASSWORD}@postgres:5432/asichain
      - BATCH_SIZE=50
      - START_FROM_BLOCK=${START_FROM_BLOCK:-0}
      - LOG_LEVEL=INFO
    ports:
      - "9090:9090"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=indexer
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=asichain
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U indexer"]
      interval: 10s
      timeout: 5s
      retries: 5

  hasura:
    image: hasura/graphql-engine:v2.36.0
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgresql://indexer:${DB_PASSWORD}@postgres:5432/asichain
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_SECRET}
    restart: unless-stopped

volumes:
  postgres_data:
```

Deploy:
```bash
# Set secure passwords
export DB_PASSWORD=$(openssl rand -base64 32)
export HASURA_SECRET=$(openssl rand -base64 32)

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-rust-indexer
spec:
  replicas: 1
  selector:
    matchLabels:
      app: asi-rust-indexer
  template:
    metadata:
      labels:
        app: asi-rust-indexer
    spec:
      containers:
      - name: indexer
        image: asi-rust-indexer:v2.0
        ports:
        - containerPort: 9090
        env:
        - name: NODE_HOST
          value: "rchain-node-service"
        - name: GRPC_PORT
          value: "40412"
        - name: HTTP_PORT
          value: "40413"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: indexer-db-secret
              key: connection-string
        - name: BATCH_SIZE
          value: "100"
        livenessProbe:
          httpGet:
            path: /health
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
```

## Migration from HTTP Indexer

### Step 1: Backup Existing Data (Optional)

```bash
# Export current data
docker exec asi-indexer-db pg_dump -U indexer asichain > backup_http_indexer.sql
```

### Step 2: Stop HTTP Indexer

```bash
# Stop old indexer
docker-compose down

# Remove old images (optional)
docker rmi indexer:latest
```

### Step 3: Deploy Rust Indexer

```bash
# Start new Rust indexer
docker-compose -f docker-compose.rust.yml up -d

# The indexer will automatically:
# 1. Apply schema migrations
# 2. Start syncing from block 0
# 3. Build complete chain history
```

### Step 4: Verify Migration

```bash
# Check sync status
curl http://localhost:9090/status | jq .

# Monitor progress
docker logs -f asi-rust-indexer

# Query enhanced data
curl http://localhost:9090/api/blocks | jq '.blocks[0]'
```

## Multi-Node Setup

Index multiple networks or nodes:

```bash
# Mainnet configuration
cat > .env.mainnet << EOF
NODE_HOST=mainnet.rchain.coop
GRPC_PORT=40412
HTTP_PORT=40413
DATABASE_URL=postgresql://indexer:pass@postgres-mainnet:5432/mainnet
MONITORING_PORT=9091
EOF

# Testnet configuration
cat > .env.testnet << EOF
NODE_HOST=testnet.rchain.coop
GRPC_PORT=40412
HTTP_PORT=40413
DATABASE_URL=postgresql://indexer:pass@postgres-testnet:5432/testnet
MONITORING_PORT=9092
EOF

# Start multiple indexers
docker-compose -f docker-compose.rust.yml --env-file .env.mainnet -p mainnet up -d
docker-compose -f docker-compose.rust.yml --env-file .env.testnet -p testnet up -d
```

## Cloud Deployment

### AWS ECS with Fargate

```json
{
  "family": "asi-rust-indexer",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "rust-indexer",
      "image": "your-ecr-repo/asi-rust-indexer:v2.0",
      "essential": true,
      "environment": [
        {"name": "NODE_HOST", "value": "your-rchain-node"},
        {"name": "GRPC_PORT", "value": "40412"},
        {"name": "HTTP_PORT", "value": "40413"},
        {"name": "BATCH_SIZE", "value": "50"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        }
      ],
      "portMappings": [
        {"containerPort": 9090}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:9090/health"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/asi-rust-indexer",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/asi-rust-indexer:v2.0

# Deploy with proper resources
gcloud run deploy asi-rust-indexer \
  --image gcr.io/PROJECT-ID/asi-rust-indexer:v2.0 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 900 \
  --set-env-vars="NODE_HOST=your-rchain-node,GRPC_PORT=40412,HTTP_PORT=40413,BATCH_SIZE=50" \
  --set-secrets="DATABASE_URL=db-connection:latest" \
  --allow-unauthenticated
```

## Monitoring Setup

### Enhanced Metrics for Rust Indexer

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'asi-rust-indexer'
    static_configs:
      - targets: ['asi-rust-indexer:9090']
    scrape_interval: 15s
```

### Grafana Dashboard

Key metrics to monitor:

- `indexer_blocks_indexed_total` - Total blocks processed
- `indexer_sync_lag_blocks` - Blocks behind chain
- `indexer_cli_commands_total` - CLI commands executed
- `indexer_cli_errors_total` - CLI command failures
- `indexer_epoch_transitions_total` - Epoch changes
- `indexer_network_health_score` - Network consensus health

### Alerting Rules

```yaml
groups:
  - name: rust-indexer
    rules:
      - alert: CLICommandFailures
        expr: rate(indexer_cli_errors_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High CLI command failure rate"
      
      - alert: SlowSync
        expr: rate(indexer_blocks_indexed_total[5m]) < 1
        for: 10m
        annotations:
          summary: "Indexer sync rate too slow"
      
      - alert: NetworkUnhealthy
        expr: indexer_network_health_score < 0.5
        for: 5m
        annotations:
          summary: "Network consensus unhealthy"
```

## Backup and Recovery

### Automated Backups

```bash
#!/bin/bash
# backup-rust-indexer.sh

BACKUP_DIR=/backups
DB_NAME=asichain
CONTAINER=asi-indexer-db

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec $CONTAINER pg_dump -U indexer $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Backup CLI binary (for disaster recovery)
cp node_cli_linux $BACKUP_DIR/node_cli_linux_$TIMESTAMP
```

### Recovery Process

```bash
# Restore database
gunzip -c backup_20250806_120000.sql.gz | docker exec -i asi-indexer-db psql -U indexer asichain

# Update last indexed block if needed
docker exec asi-indexer-db psql -U indexer -d asichain \
  -c "UPDATE indexer_state SET value = '1000' WHERE key = 'last_indexed_block'"

# Restart indexer
docker restart asi-rust-indexer
```

## Troubleshooting

### Common Issues

1. **CLI Binary Not Found**
   ```bash
   # Check binary exists
   docker exec asi-rust-indexer ls -la /usr/local/bin/node_cli
   
   # Fix permissions
   docker exec asi-rust-indexer chmod +x /usr/local/bin/node_cli
   ```

2. **Cannot Connect to Node**
   ```bash
   # Test connectivity
   docker exec asi-rust-indexer /usr/local/bin/node_cli last-finalized-block \
     -H host.docker.internal -p 40413
   
   # Check Docker host access
   docker exec asi-rust-indexer ping host.docker.internal
   ```

3. **Schema Migration Errors**
   ```bash
   # Manually apply migrations
   docker exec -i asi-indexer-db psql -U indexer -d asichain < migrations/000_comprehensive_initial_schema.sql
   
   # Check schema
   docker exec asi-indexer-db psql -U indexer -d asichain -c "\dt"
   ```

4. **Slow Sync Performance**
   ```bash
   # Increase batch size
   docker exec asi-rust-indexer env | grep BATCH_SIZE
   
   # Monitor CLI performance
   docker logs asi-rust-indexer | grep "CLI command took"
   ```

5. **Foreign Key Constraint Errors**
   ```sql
   -- Drop problematic constraint
   ALTER TABLE validator_bonds 
   DROP CONSTRAINT IF EXISTS validator_bonds_validator_public_key_fkey;
   ```

### Performance Tuning

```bash
# Environment optimizations
BATCH_SIZE=200              # Larger batches for faster sync
SYNC_INTERVAL=2             # More frequent checks
DATABASE_POOL_SIZE=20       # More connections
CLI_TIMEOUT=60              # Longer timeout for large batches

# PostgreSQL tuning
shared_buffers = 512MB
work_mem = 8MB
maintenance_work_mem = 128MB
effective_cache_size = 2GB
```

### Debug Mode

```bash
# Enable debug logging
docker run -e LOG_LEVEL=DEBUG -e RUST_LOG=debug asi-rust-indexer

# Monitor CLI commands
docker logs -f asi-rust-indexer | grep "Running command"

# Check database queries
docker exec asi-indexer-db psql -U indexer -d asichain \
  -c "SELECT query, calls FROM pg_stat_statements ORDER BY calls DESC LIMIT 10"
```

## Security Considerations

1. **CLI Binary Security**
   - Verify binary checksum before deployment
   - Run with minimal privileges
   - Mount as read-only in container

2. **Network Security**
   - Use private networks for node communication
   - Enable TLS for external connections
   - Restrict gRPC/HTTP ports with firewall rules

3. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Regular security updates
   - Limit connection sources

4. **Container Security**
   - Run as non-root user
   - Use minimal base images
   - Regular vulnerability scanning
   - Resource limits enforced

## Maintenance

### Regular Tasks

```bash
# Weekly: Vacuum database
docker exec asi-indexer-db psql -U indexer -d asichain -c "VACUUM ANALYZE"

# Monthly: Update statistics
docker exec asi-indexer-db psql -U indexer -d asichain -c "ANALYZE"

# Quarterly: Reindex
docker exec asi-indexer-db psql -U indexer -d asichain -c "REINDEX DATABASE asichain"
```

### Monitoring Checklist

- [ ] Sync lag < 10 blocks
- [ ] CLI error rate < 1%
- [ ] Database size growth normal
- [ ] API response times < 100ms
- [ ] Network health score > 0.8
- [ ] No missing blocks in recent range

## Support

For issues specific to the Rust CLI indexer:
1. Check logs: `docker logs asi-rust-indexer`
2. Verify CLI works: `docker exec asi-rust-indexer /usr/local/bin/node_cli --help`
3. Review enhanced schema: `docker exec asi-indexer-db psql -U indexer -d asichain -c "\d+"`
4. Check GitHub issues for similar problems
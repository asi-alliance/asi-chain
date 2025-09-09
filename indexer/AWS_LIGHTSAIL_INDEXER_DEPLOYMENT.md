# ASI Chain Indexer - AWS Lightsail Deployment Guide

**Version**: 2.1.1 | **Updated**: January 2025  
**Status**: ✅ DEPLOYED | **Server**: `13.251.66.61` (Singapore)

This guide documents the deployment of the ASI Chain Indexer v2.1.1 on AWS Lightsail, connecting to an existing F1R3FLY network.

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
- [Service Endpoints](#service-endpoints)
- [Verification](#verification)
- [Management](#management)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Overview

The ASI Chain Indexer deployment on AWS Lightsail provides:
- **Zero-touch deployment** with automatic configuration
- **Full blockchain synchronization** from genesis (block 0)
- **PostgreSQL database** for indexed data
- **Hasura GraphQL** API with automatic relationships
- **REST API** for monitoring and health checks
- **Cross-platform Rust CLI** built from source

### Current Deployment Status
- **Server IP**: `13.251.66.61`
- **Services**: All running ✅
- **Sync Status**: Active, processing from genesis
- **GraphQL**: Operational with nested queries
- **Database**: PostgreSQL with 10 tables

## Prerequisites

### AWS Lightsail Instance
- **Existing F1R3FLY network** running on the server
- **Minimum RAM**: 4GB (8GB recommended)
- **OS**: Ubuntu 24.04 LTS
- **Docker & Docker Compose** installed
- **Ports**: 5432, 8080, 9090 open in firewall

### Local Machine
- SSH access with key (`XXXXX.pem`)
- Git for cloning repository
- Terminal/command line

## Deployment Steps

### 1. Prepare Deployment Package (Local)

```bash
# Navigate to asi-chain directory
cd /path/to/asi-chain

# Create deployment archive
tar -czf indexer-deployment.tar.gz \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='rust-client/target' \
  indexer/deploy.sh \
  indexer/docker-compose.rust.yml \
  indexer/Dockerfile.rust-builder \
  indexer/Dockerfile.rust-simple \
  indexer/src/ \
  indexer/migrations/ \
  indexer/scripts/ \
  indexer/requirements.txt \
  indexer/.env \
  indexer/.env.remote-observer \
  indexer/Makefile \
  rust-client/
```

### 2. Transfer to Server

```bash
# Copy deployment package to Lightsail
scp -i ~/path/to/XXXXXX.pem \
  indexer-deployment.tar.gz \
  ubuntu@13.251.66.61:~/
```

### 3. SSH and Deploy

```bash
# SSH into server
ssh -i ~/path/to/XXXXXX.pem ubuntu@13.251.66.61

# Extract deployment files
tar -xzf indexer-deployment.tar.gz

# Navigate to indexer directory
cd indexer

# Make deploy script executable
chmod +x deploy.sh

# Run deployment (Option 2: Skip local F1R3FLY)
echo "2" | ./deploy.sh
```

### 4. Environment Configuration

The deployment uses `.env` with these key settings:

```env
# Remote Observer Node (Best for Indexing)
NODE_HOST=13.251.66.61
GRPC_PORT=40452  # Observer gRPC
HTTP_PORT=40453  # Observer HTTP

# Database (Docker Internal)
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain

# Sync Settings
SYNC_INTERVAL=5
BATCH_SIZE=50
START_FROM_BLOCK=0  # Start from genesis

# API Settings
MONITORING_PORT=9090
HASURA_ADMIN_SECRET=myadminsecretkey
```

## Service Endpoints

### Public Endpoints (After Deployment)

| Service | Local Port | Public URL | Purpose |
|---------|------------|------------|---------|
| **Indexer API** | 9090 | `http://13.251.66.61:9090` | REST API, health, status |
| **GraphQL API** | 8080 | `http://13.251.66.61:8080/v1/graphql` | Hasura GraphQL queries |
| **GraphQL Console** | 8080 | `http://13.251.66.61:8080/console` | Hasura admin interface |
| **PostgreSQL** | 5432 | `13.251.66.61:5432` | Direct database access |

### API Examples

#### Check Indexer Status
```bash
curl http://13.251.66.61:9090/status | jq .
```

#### GraphQL Query
```bash
curl -X POST http://13.251.66.61:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query": "{ blocks(limit: 5, order_by: {block_number: desc}) { block_number timestamp } }"}'
```

#### Health Check
```bash
curl http://13.251.66.61:9090/health
```

## Verification

### 1. Check Container Status
```bash
docker ps | grep -E "asi|indexer|hasura|postgres"

# Expected output:
# asi-rust-indexer   - Running (healthy)
# asi-hasura         - Running (healthy)  
# asi-indexer-db     - Running (healthy)
```

### 2. Verify Sync Progress
```bash
curl -s http://localhost:9090/status | jq '.indexer'

# Expected fields:
# - last_indexed_block: Current sync position
# - sync_percentage: Progress percentage
# - sync_lag: Blocks behind latest
```

### 3. Test GraphQL Relationships
```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{
    "query": "{ 
      blocks(limit: 1) { 
        block_number 
        deployments { deploy_id } 
        validator_bonds { stake } 
      } 
    }"
  }'
```

## Management

### Service Control

```bash
# Stop all indexer services
cd ~/indexer
docker-compose -f docker-compose.rust.yml down

# Start services
docker-compose -f docker-compose.rust.yml up -d

# Restart specific service
docker restart asi-rust-indexer
docker restart asi-hasura
docker restart asi-indexer-db

# View logs
docker logs -f asi-rust-indexer --tail 100
docker logs asi-hasura --tail 50
```

### Monitoring

```bash
# Real-time sync monitoring
watch -n 5 'curl -s http://localhost:9090/status | jq ".indexer"'

# Check database growth
docker exec asi-indexer-db psql -U indexer -d asichain -c "
  SELECT 
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as size,
    n_live_tup as rows
  FROM pg_stat_user_tables 
  ORDER BY pg_total_relation_size(relid) DESC;"

# View error logs
docker logs asi-rust-indexer 2>&1 | grep ERROR | tail -20
```

### Backup Database

```bash
# Create backup
docker exec asi-indexer-db pg_dump -U indexer asichain > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i asi-indexer-db psql -U indexer asichain < backup_20250109.sql
```

## Troubleshooting

### Issue: Indexer Not Syncing

```bash
# Check Rust CLI is present
docker exec asi-rust-indexer ls -la /usr/local/bin/node_cli

# Verify connection to F1R3FLY
docker exec asi-rust-indexer /usr/local/bin/node_cli bonds \
  --host 13.251.66.61 --port 40453

# Check logs for errors
docker logs asi-rust-indexer --tail 100 | grep ERROR
```

### Issue: GraphQL Relationships Missing

```bash
# Re-run relationship setup
cd ~/indexer
bash scripts/setup-hasura-relationships.sh

# Test relationships
bash scripts/test-relationships.sh
```

### Issue: Out of Memory

```bash
# Check memory usage
free -h
docker stats --no-stream

# Reduce batch size if needed
# Edit .env: BATCH_SIZE=25
docker-compose -f docker-compose.rust.yml restart rust-indexer
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it asi-indexer-db psql -U indexer -d asichain -c "SELECT 1;"

# Restart if needed
docker restart asi-indexer-db
```

## Architecture

```
Internet
    |
    ├── Port 9090 ──→ Indexer REST API
    ├── Port 8080 ──→ Hasura GraphQL
    └── Port 5432 ──→ PostgreSQL
    
AWS Lightsail Instance (13.251.66.61)
    |
    ├── F1R3FLY Network (Existing)
    │   ├── Bootstrap (40403)
    │   ├── Validator1 (40413)
    │   ├── Validator2 (40423)
    │   └── Observer (40453) ←─┐
    │                          │
    └── Indexer Stack          │
        ├── asi-rust-indexer ──┘ (connects to Observer)
        │   └── Rust CLI (built from source)
        ├── asi-hasura (GraphQL API)
        └── asi-indexer-db (PostgreSQL)
```

### Data Flow

1. **Rust CLI** queries Observer node (40453) for blockchain data
2. **Python Indexer** processes blocks and stores in PostgreSQL
3. **Hasura** provides GraphQL API over PostgreSQL
4. **REST API** serves health checks and monitoring data

## Performance Metrics

### Current Performance (v2.1.1)
- **Sync Rate**: 50 blocks per batch
- **Processing Time**: ~1-2 seconds per batch
- **Memory Usage**: ~80MB (indexer) + ~50MB (database)
- **API Response**: <100ms for queries
- **GraphQL Nested Queries**: <200ms

### Resource Usage
- **CPU**: ~5% during sync, <1% when idle
- **Memory**: ~200MB total for all services
- **Disk**: ~100KB per 100 blocks
- **Network**: Minimal (only blockchain queries)

## Security Considerations

### Production Recommendations

1. **Change default passwords**:
   ```bash
   # Update in .env before deployment
   HASURA_ADMIN_SECRET=<strong-password>
   DATABASE_PASSWORD=<strong-password>
   ```

2. **Restrict firewall rules**:
   - Only open necessary ports
   - Consider IP whitelisting for admin access

3. **Enable HTTPS**:
   - Use nginx reverse proxy with SSL
   - Configure Let's Encrypt certificates

4. **Regular backups**:
   - Automated PostgreSQL backups
   - Store backups off-server

5. **Monitor logs**:
   - Set up log aggregation
   - Configure alerts for errors

## Next Steps

After successful deployment:

1. **Monitor sync progress** until caught up
2. **Configure external access** if needed (update firewall)
3. **Set up monitoring alerts** for service health
4. **Document API endpoints** for consumers
5. **Plan backup strategy** for production data
6. **Consider horizontal scaling** for high load

## Support

For issues:
- **Indexer specific**: Check `indexer/README.md`
- **F1R3FLY network**: See `F1R3FLY_DEPLOYMENT_GUIDE.md`
- **AWS Lightsail**: AWS Support documentation
- **Docker issues**: Check container logs

## Version History

- **v2.1.1** (Current): Validator bond detection fix, data quality improvements
- **v2.1.0**: Enhanced transfer detection, zero-touch deployment
- **v2.0.0**: Rust CLI integration, genesis sync support
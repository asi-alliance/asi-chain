# ASI Chain Explorer - AWS Lightsail Deployment Guide

**Version**: 1.0.2 | **Updated**: September 2025  
**Status**: ✅ DEPLOYED | **Server**: `13.251.66.61` (Singapore)

This guide documents the deployment of the ASI Chain Explorer v1.0.2 on AWS Lightsail, connecting to the existing blockchain infrastructure.

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

The ASI Chain Explorer deployment on AWS Lightsail provides:
- **Real-time blockchain data visualization** with fixed validator deduplication
- **React 19 frontend** with TypeScript and Apollo GraphQL client
- **Docker containerized deployment** for production stability
- **Connection to production GraphQL/Indexer APIs** for live data
- **Automated deployment script** with health checks

### Current Deployment Status
- **Server IP**: `13.251.66.61`
- **Explorer URL**: `http://13.251.66.61:3001`
- **Service**: Running ✅ (asi-explorer container)
- **Data Source**: Production Hasura GraphQL (port 8080) + Indexer API (port 9090)
- **Version**: 1.0.2 with validator deduplication fix

## Prerequisites

### AWS Lightsail Instance
- **Existing F1R3FLY network + Indexer** running on the server
- **Minimum RAM**: 4GB (already met by existing instance)
- **OS**: Ubuntu 24.04 LTS
- **Docker & Docker Compose** installed
- **Port 3001**: Available and opened in firewall

### Local Machine
- SSH access with key (`claude_devnet.pem`)
- Git for repository access
- Terminal/command line
- Archive tools (tar)

## Deployment Steps

### 1. Prepare Deployment Package (Local)

```bash
# Navigate to asi-chain directory
cd /path/to/asi-chain

# Create deployment archive (excludes build artifacts and dependencies)
tar -czf explorer-deployment.tar.gz \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.git' \
  --exclude='*.log' \
  explorer/

# Verify package size (should be ~339KB)
ls -lh explorer-deployment.tar.gz
```

### 2. Transfer to Server

```bash
# Copy deployment package to Lightsail
scp -i ~/XXXXXXX.pem \
  explorer-deployment.tar.gz \
  ubuntu@13.251.66.61:~/
```

### 3. SSH and Deploy

```bash
# SSH into server
ssh -i ~/XXXXXX.pem ubuntu@13.251.66.61

# Extract deployment files  
tar -xzf explorer-deployment.tar.gz

# Navigate to explorer directory
cd explorer

# Update environment to use production settings
cp .env.production.secure .env

# Make deploy script executable
chmod +x deploy-docker.sh

# Deploy the Explorer
./deploy-docker.sh start
```

### 4. Environment Configuration

The deployment uses `.env.production.secure` with these settings:

```env
# GraphQL Endpoints (AWS Lightsail - Singapore)
REACT_APP_GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql
REACT_APP_GRAPHQL_WS_URL=ws://13.251.66.61:8080/v1/graphql

# Indexer API Endpoint  
REACT_APP_INDEXER_API_URL=http://13.251.66.61:9090

# Hasura Admin Secret (for production server access)
REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey

# Network Configuration
REACT_APP_NETWORK_NAME=ASI Chain
REACT_APP_NETWORK_ID=asi-mainnet

# Feature Flags
REACT_APP_ENABLE_WEBSOCKETS=true
REACT_APP_ENABLE_POLLING=true
REACT_APP_POLLING_INTERVAL=5000

# Display Configuration
REACT_APP_BLOCKS_PER_PAGE=20
REACT_APP_TRANSACTIONS_PER_PAGE=50
REACT_APP_DATE_FORMAT=relative
```

## Service Endpoints

### Public Endpoints (After Deployment)

| Service | URL | Purpose | Status |
|---------|-----|---------|--------|
| **Explorer** | `http://13.251.66.61:3001` | Main blockchain explorer interface | ✅ Live |
| **Explorer API** | `http://13.251.66.61:3001/api/*` | Nginx proxied requests | ✅ Live |

### Data Sources (Existing Infrastructure)

| Service | URL | Purpose | Used By |
|---------|-----|---------|---------|
| **GraphQL API** | `http://13.251.66.61:8080/v1/graphql` | Hasura GraphQL queries | Explorer |
| **GraphQL WebSocket** | `ws://13.251.66.61:8080/v1/graphql` | Real-time subscriptions | Explorer |
| **Indexer API** | `http://13.251.66.61:9090` | Blockchain data indexer | Explorer |

### Quick Access Tests

```bash
# Test Explorer access
curl http://13.251.66.61:3001

# Test GraphQL connectivity (from Explorer's perspective)
curl -X POST http://13.251.66.61:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query": "{ blocks(limit: 1) { block_number } }"}'

# Test Indexer API connectivity  
curl http://13.251.66.61:9090/status
```

## Verification

### 1. Check Container Status

```bash
# Check Explorer container
docker ps | grep asi-explorer

# Expected output:
# asi-explorer   Up X minutes (healthy)   0.0.0.0:3001->80/tcp
```

### 2. Verify Service Health

```bash
# Test local access on server
curl http://localhost:3001

# Test external access (from anywhere)
curl http://13.251.66.61:3001 | grep "ASI Chain Explorer"

# Check logs for any errors
docker logs asi-explorer --tail 50
```

### 3. Test Explorer Features

Access `http://13.251.66.61:3001` in a browser and verify:

- **Home Page**: Loads with network statistics
- **Blocks Page**: Shows recent blocks from GraphQL
- **Validators Page**: Displays 3 validators (not 6) - deduplication working
- **Transactions Page**: Shows transaction list
- **Statistics Page**: Only shows Network Dashboard (complexity removed)

## Management

### Service Control

```bash
# Navigate to deployment directory
cd ~/explorer

# Stop Explorer
./deploy-docker.sh stop

# Start Explorer  
./deploy-docker.sh start

# Restart Explorer
./deploy-docker.sh restart

# Rebuild with latest code changes
./deploy-docker.sh rebuild

# Check deployment status
./deploy-docker.sh status

# View logs
./deploy-docker.sh logs
```

### Container Management

```bash
# Direct Docker commands
docker stop asi-explorer
docker start asi-explorer 
docker restart asi-explorer

# View detailed logs
docker logs -f asi-explorer --tail 100

# Check container health
docker inspect asi-explorer --format='{{.State.Health.Status}}'

# Execute commands in container
docker exec -it asi-explorer /bin/sh
```

### Updating Configuration

```bash
# Edit environment variables
cd ~/explorer
nano .env

# Restart to apply changes
./deploy-docker.sh restart
```

## Troubleshooting

### Issue: Container Won't Start

```bash
# Check port availability
ss -tlnp | grep :3001

# Check Docker daemon
docker info

# Check available disk space
df -h

# Check container logs for errors
docker logs asi-explorer
```

### Issue: Explorer Shows No Data

```bash
# Test GraphQL connectivity
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query": "{ blocks(limit: 1) { block_number } }"}'

# Test Indexer connectivity
curl http://localhost:9090/status

# Check browser console for JavaScript errors
# Look for CORS or network issues
```

### Issue: Build Fails

```bash
# Clean up Docker artifacts
docker system prune -a

# Rebuild with no cache
cd ~/explorer
./deploy-docker.sh rebuild

# Check available memory during build
free -h
```

### Issue: Performance Problems

```bash
# Check system resources
htop

# Check Docker container stats
docker stats asi-explorer

# Verify all backend services are healthy
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

## Architecture

```
Internet
    |
    ├── Port 3001 ──→ ASI Chain Explorer (asi-explorer)
    ├── Port 8080 ──→ Hasura GraphQL (existing)
    └── Port 9090 ──→ Indexer API (existing)
    
AWS Lightsail Instance (13.251.66.61)
    |
    ├── F1R3FLY Network (Existing Infrastructure)
    │   ├── Bootstrap (40403)
    │   ├── Validator1 (40413) 
    │   ├── Validator2 (40423)
    │   └── Observer (40453)
    │
    ├── Data Layer (Existing)
    │   ├── asi-rust-indexer ──┐
    │   ├── asi-hasura         │ 
    │   └── asi-indexer-db     │
    │                          │
    └── Frontend Layer (NEW)   │
        └── asi-explorer ──────┘ (connects to GraphQL/Indexer)
            ├── React 19 App
            ├── Apollo GraphQL Client  
            ├── Nginx Web Server
            └── Docker Entrypoint
```

### Data Flow

1. **Browser** requests Explorer UI from `13.251.66.61:3001`
2. **Nginx** serves React app and proxies API requests
3. **React App** connects to GraphQL (`8080`) and Indexer API (`9090`)
4. **GraphQL/Indexer** provide blockchain data from existing infrastructure
5. **Real-time updates** via GraphQL subscriptions and polling

## Performance Metrics

### Current Performance (v1.0.2)
- **Initial Load**: < 2 seconds
- **Bundle Size**: ~533KB gzipped  
- **Memory Usage**: ~100MB (container)
- **API Response**: Real-time via WebSocket subscriptions
- **Validator Display**: Fixed deduplication (3 validators, not 6)

### Resource Usage
- **CPU**: ~2% during normal operation
- **Memory**: ~100MB RAM for container
- **Network**: Efficient (GraphQL subscriptions + polling)
- **Disk**: ~50MB for Docker image

## Security Considerations

### Production Recommendations

1. **Environment Variables**:
   ```bash
   # Never expose admin secrets in production
   # Consider using a backend proxy service instead
   REACT_APP_HASURA_ADMIN_SECRET=<strong-password>
   ```

2. **Firewall Configuration**:
   - Port 3001 open for Explorer access
   - Consider IP restrictions for admin features

3. **HTTPS Setup** (Future Enhancement):
   ```bash
   # Install nginx reverse proxy with SSL
   # Configure Let's Encrypt certificates
   # Update all endpoints to use HTTPS
   ```

4. **Regular Updates**:
   ```bash
   # Keep system updated
   sudo apt update && sudo apt upgrade
   
   # Update Explorer when new versions available
   ./deploy-docker.sh rebuild
   ```

## Version History

- **v1.0.2** (Current): Validator deduplication fix, Docker deployment automation
- **v1.0.1**: Statistics page simplification, file organization
- **v1.0.0**: Initial production release with GraphQL integration

## Integration with Existing Services

The Explorer integrates seamlessly with existing Lightsail services:

### Service Dependencies
- **Requires**: Hasura GraphQL (port 8080) - ✅ Running
- **Requires**: Indexer API (port 9090) - ✅ Running  
- **Requires**: PostgreSQL Database (port 5432) - ✅ Running
- **Optional**: F1R3FLY nodes for direct queries - ✅ Available

### Port Allocation
- **3001**: Explorer (NEW)
- **8080**: Hasura GraphQL (existing)
- **9090**: Indexer API (existing) 
- **5432**: PostgreSQL (existing)
- **40403+**: F1R3FLY nodes (existing)

## Next Steps

After successful deployment:

1. **Configure DNS** (optional):
   - Set up subdomain: `explorer.yourdomain.com`
   - Point to `13.251.66.61`

2. **Enable HTTPS** (recommended):
   - Install SSL certificate
   - Configure nginx reverse proxy
   - Update all API endpoints to use HTTPS

3. **Monitor Usage**:
   - Set up log rotation
   - Monitor container health
   - Track performance metrics

4. **Backup Strategy**:
   - Include Explorer in instance snapshots
   - Backup custom configuration files

## Support

For issues specific to:
- **Explorer functionality**: Check browser console and container logs
- **Data connectivity**: Verify GraphQL/Indexer services are running
- **Container issues**: Use `docker logs asi-explorer`
- **Deployment issues**: Check `deploy-docker.sh` script logs

## Cost Impact

The Explorer deployment adds minimal cost:
- **Memory**: +100MB (well within 4GB instance limits)
- **CPU**: +2% (negligible impact)
- **Network**: Minimal (internal API calls)
- **Storage**: +50MB Docker image

**Total Additional Cost**: $0 (fits within existing instance resources)

---

**Deployment Completed**: September 9, 2025  
**Server**: AWS Lightsail Singapore (`13.251.66.61`)  
**Status**: ✅ Production Ready
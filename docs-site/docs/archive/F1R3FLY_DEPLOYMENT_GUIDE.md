# F1R3FLY Complete Network Deployment Guide

This guide covers how to use the `deploy-f1r3fly-complete-v2.sh` script to deploy a complete F1R3FLY blockchain network with autopropose functionality and validator bonding.

## Overview

The deployment script creates a complete F1R3FLY network with:
- **Bootstrap node** (genesis coordinator)
- **Validator1 & Validator2** (genesis validators)
- **Autopropose service** (automated block production every 30 seconds)
- **Observer node** (read-only access)
- **Validator4** (dynamically bonded after network startup)

**Note**: Validator3 is intentionally disabled to prevent genesis ceremony timing conflicts.

## Prerequisites

Before running the deployment script, ensure you have:

- Docker and Docker Compose installed
- Rust toolchain (for building the node CLI)
- At least 8GB available RAM
- Sufficient disk space (recommend 10GB+ free)

## Quick Start

```bash
# Navigate to the project root
cd /path/to/asi-chain

# Run the complete deployment (recommended)
./scripts/deploy-f1r3fly-complete-v2.sh --cleanup --reset
```

## Script Options

### Basic Usage
```bash
./scripts/deploy-f1r3fly-complete-v2.sh [OPTIONS]
```

### Available Options

| Option | Description | Recommended |
|--------|-------------|-------------|
| `--cleanup` | Purge all Docker containers/images before deployment | ✅ Yes |
| `--reset` | Reset all node data directories | ✅ Yes |
| `--help` | Show help information | - |

### Recommended Command
```bash
./scripts/deploy-f1r3fly-complete-v2.sh --cleanup --reset
```

This ensures a completely clean deployment environment.

## Deployment Phases

The script executes the following phases automatically:

### Phase 1: Prerequisites (30-60 seconds)
- ✅ Checks Docker availability
- ✅ Builds Rust node CLI client
- ✅ Applies F1R3FLY patches (including validator3 disabling)

### Phase 2: Environment Cleanup (30-60 seconds)
- ✅ Stops existing containers
- ✅ Removes previous node data
- ✅ Prunes Docker system

### Phase 3: Core Network Deployment (2-3 minutes)
- ✅ Deploys bootstrap node (ports 40400-40405)
- ✅ Deploys validator1 (ports 40410-40415)  
- ✅ Deploys validator2 (ports 40420-40425)
- ✅ Builds and starts autopropose service
- ✅ Waits for network initialization (60 seconds)

### Phase 4: Network Stabilization (4-5 minutes)
- ✅ Verifies all validator health
- ✅ Confirms autopropose is running
- ✅ Waits for network stabilization (240 seconds)

### Phase 5: Observer & Validator4 (1-2 minutes)
- ✅ Deploys observer node (read-only access)
- ✅ Deploys validator4 (ports 40440-40445)

### Phase 6: Dynamic Validator Bonding (2-3 minutes)
- ✅ Transfers 2000 REV to validator4
- ✅ Bonds validator4 with 1000 REV stake
- ✅ Verifies final network state

**Total deployment time: ~10-15 minutes**

## Service Ports

Once deployed, the following services are available:

| Service | HTTP Port | gRPC Port | Protocol Port | Metrics |
|---------|-----------|-----------|---------------|---------|
| Bootstrap | 40401 | 40402 | 40400 | 40405 |
| Validator1 | 40411 | 40412 | 40410 | 40415 |
| Validator2 | 40421 | 40422 | 40420 | 40425 |
| Validator4 | 40441 | 40442 | 40440 | 40445 |
| Observer | 40451 | 40452 | 40450 | 40455 |

### API Access Examples

```bash
# Check bootstrap node status
curl http://localhost:40401/api/status | jq .

# Check validator1 status  
curl http://localhost:40411/api/status | jq .

# Check network blocks
curl http://localhost:40401/api/blocks | jq .

# Deploy a simple Rholang contract
curl -X POST http://localhost:40401/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "term": "new out(\`rho:io:stdout\`) in { out!(\"Hello F1R3FLY!\") }",
    "phloLimit": 100000,
    "phloPrice": 1,
    "deployer": "your-deploy-key-here"
  }'
```

## Monitoring and Verification

### Check Container Status
```bash
# View all running containers
docker ps

# Check specific service logs
docker logs rnode.bootstrap
docker logs rnode.validator1
docker logs autopropose
```

### Verify Network Health
```bash
# Using the rust client
cd rust-client
./target/release/node_cli status --port 40412 --http-port 40411
./target/release/node_cli status --port 40422 --http-port 40421
```

### Check Validator Bonding Status
```bash
# Check bonded validators
curl http://localhost:40401/api/status | jq '.bonded_validators'
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the ports
sudo lsof -i :40401
sudo lsof -i :40402

# Kill processes if needed
sudo pkill -f rnode
```

#### 2. Docker Build Failures
```bash
# Clean Docker completely
docker system prune --all --volumes --force

# Restart Docker service
sudo systemctl restart docker  # Linux
# or restart Docker Desktop on Mac/Windows
```

#### 3. Rust Client Build Failures
```bash
# Clean and rebuild
cd rust-client
cargo clean
cargo build --release
```

#### 4. Network Not Stabilizing
```bash
# Check autopropose logs
docker logs autopropose

# Verify validator health
docker logs rnode.validator1
docker logs rnode.validator2
```

### Log Locations
- **Container logs**: `docker logs <container_name>`
- **Node data**: `./f1r3fly/docker/data/<node_name>/`
- **Autopropose config**: `./f1r3fly/docker/autopropose/config.yml`

## Advanced Configuration

### Autopropose Settings
The autopropose service can be configured in `f1r3fly/docker/autopropose/config.yml`:

```yaml
autopropose:
  period: 30                    # Block proposal interval (seconds)
  enabled: true                 # Master enable/disable

validators:
  - name: validator1
    host: rnode.validator1
    grpc_port: 40402
    enabled: true               # Participate in rotation
    
  - name: validator2  
    host: rnode.validator2
    grpc_port: 40402
    enabled: true
    
  - name: validator4
    host: rnode.validator4  
    grpc_port: 40402
    enabled: true               # Now enabled for bonded validator
```

### Custom Network Topology
To modify the network setup:

1. Edit `f1r3fly/docker/shard-with-autopropose.yml`
2. Update port mappings as needed
3. Modify autopropose configuration accordingly
4. Re-run deployment script

## Cleanup

### Stop All Services
```bash
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml down
```

### Complete Cleanup
```bash
# Stop and remove everything
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker rmi $(docker images -q) --force
docker volume rm $(docker volume ls -q)
docker system prune --all --volumes --force
```

## Network Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Bootstrap  │    │ Validator1  │    │ Validator2  │
│   :40401    │◄──►│   :40411    │◄──►│   :40421    │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Autopropose Service                    │
│           (30-second block intervals)               │
└─────────────────────────────────────────────────────┘
       ▲                                       ▲
       │                                       │
       ▼                                       ▼
┌─────────────┐                       ┌─────────────┐
│  Observer   │                       │ Validator4  │
│   :40451    │                       │   :40441    │
│ (Read-only) │                       │ (Bonded)    │
└─────────────┘                       └─────────────┘
```

## Success Indicators

A successful deployment will show:
- ✅ All validator health checks pass
- ✅ Autopropose service running and proposing blocks
- ✅ Observer node accessible
- ✅ Validator4 successfully funded and bonded
- ✅ Network showing 4 bonded validators total

The script provides clear progress indicators and will report any failures during deployment.
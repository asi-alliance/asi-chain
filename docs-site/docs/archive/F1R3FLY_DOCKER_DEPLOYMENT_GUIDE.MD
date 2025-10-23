# F1R3FLY Docker Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Deployment Configurations](#deployment-configurations)
5. [Network Components](#network-components)
6. [Advanced Operations](#advanced-operations)
7. [Monitoring & Debugging](#monitoring--debugging)
8. [Security Considerations](#security-considerations)

## Overview

F1R3FLY provides a comprehensive Docker-based deployment system for running blockchain networks with multiple validators, observers, and automated block proposing. The system supports various network topologies from simple single-validator setups to complex multi-validator shards with automatic proposing.

### Key Features
- **Multi-validator support** with configurable genesis validators
- **Automatic block proposing** with round-robin validator rotation
- **Observer nodes** for read-only blockchain access
- **Helm charts** for Kubernetes deployments
- **Pre-configured certificates** and wallet keys for testing
- **Flexible network configurations** via docker-compose

## Architecture

### Network Topology
```
┌─────────────────┐
│   Bootstrap     │ ← Genesis ceremony master
│   Node          │   (coordinates network startup)
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    │         │         │         │
┌───▼──┐ ┌───▼──┐ ┌───▼──┐ ┌────▼────┐
│ Val1 │ │ Val2 │ │ Val3 │ │Observer │
│      │ │      │ │      │ │(ReadOnly)│
└──────┘ └──────┘ └──────┘ └─────────┘
    ↑         ↑         ↑
    └─────────┴─────────┘
           │
    ┌──────▼──────┐
    │ AutoPropose │ ← Automated block proposing
    │   Service   │   with validator rotation
    └─────────────┘
```

### Port Mappings

| Service | Internal Ports | External Ports | Purpose |
|---------|---------------|----------------|---------|
| Bootstrap | 40400-40405 | 40400-40405 | P2P, gRPC, HTTP API |
| Validator1 | 40400-40405 | 40410-40415 | P2P, gRPC, HTTP API |
| Validator2 | 40400-40405 | 40420-40425 | P2P, gRPC, HTTP API |
| Validator3 | 40400-40405 | 40430-40435 | P2P, gRPC, HTTP API |
| Validator4 | 40400-40405 | 40440-40445 | P2P, gRPC, HTTP API |
| Observer | 40401-40403 | 40451-40453 | gRPC, HTTP API (no P2P) |

### Port Functions
- **40400**: P2P protocol communication
- **40401**: gRPC external API
- **40402**: gRPC internal API (for proposing)
- **40403**: HTTP API
- **40404**: P2P discovery
- **40405**: Admin HTTP API

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum
- 20GB free disk space

### Basic Network Launch

1. **Navigate to Docker directory**:
```bash
cd f1r3fly/docker
```

2. **Start the network with auto-proposing**:
```bash
docker-compose -f shard-with-autopropose.yml up
```

3. **Verify network is running**:
```bash
# Check container status
docker-compose -f shard-with-autopropose.yml ps

# View logs
docker-compose -f shard-with-autopropose.yml logs -f
```

4. **Stop the network**:
```bash
docker-compose -f shard-with-autopropose.yml down
```

### Fresh Network Reset
```bash
# Stop network
docker-compose -f shard-with-autopropose.yml down

# Remove all blockchain data
rm -rf data/

# Start fresh
docker-compose -f shard-with-autopropose.yml up
```

## Deployment Configurations

### 1. Shard with Auto-Propose (Recommended)

**File**: `shard-with-autopropose.yml`

This configuration launches:
- 1 Bootstrap node
- 3 Validators (bonded in genesis)
- 1 AutoPropose service

**Features**:
- Automatic block proposing every 30 seconds
- Round-robin validator rotation
- Contract deployment before proposing
- Health monitoring

**Usage**:
```bash
docker-compose -f shard-with-autopropose.yml up -d
```

### 2. Observer Node

**File**: `observer.yml`

Launches a read-only node for:
- API queries
- Blockchain monitoring
- Application integration
- No consensus participation

**Usage** (requires running network):
```bash
# First ensure main network is running
docker-compose -f shard-with-autopropose.yml up -d

# Then start observer
docker-compose -f observer.yml up -d
```

### 3. Additional Validator (Validator4)

**File**: `validator4.yml`

Adds a 4th validator to running network:
- Not in genesis bonds
- Requires bonding process
- Can become active validator

**Usage**:
```bash
# Start validator4
docker-compose -f validator4.yml up -d

# Bond validator4 (see bonding guide)
# Use rust-client or gRPC API
```

## Network Components

### Bootstrap Node

**Role**: Genesis ceremony master and network coordinator

**Configuration**:
- Uses `bootstrap-ceremony.conf`
- Has validator key (but typically doesn't propose)
- Coordinates initial network formation

**Key Parameters**:
```yaml
command:
  - "run"
  - "--host=$BOOTSTRAP_HOST"
  - "--allow-private-addresses"
  - "--validator-private-key=$BOOTSTRAP_PRIVATE_KEY"
```

### Validators

**Role**: Consensus participants that validate and propose blocks

**Genesis Validators** (in bonds.txt):
- Validator1: 1000 stake
- Validator2: 1000 stake  
- Validator3: 1000 stake

**Configuration per validator**:
```yaml
command:
  - "run"
  - "--host=$VALIDATOR_HOST"
  - "--bootstrap=rnode://$BOOTSTRAP_NODE_ID@$BOOTSTRAP_HOST"
  - "--validator-public-key=$VALIDATOR_PUBLIC_KEY"
  - "--validator-private-key=$VALIDATOR_PRIVATE_KEY"
  - "--genesis-validator"
```

### AutoPropose Service

**Role**: Automated block proposing with intelligent rotation

**Features**:
- **Time-based proposing**: Every 30 seconds (configurable)
- **Validator rotation**: Round-robin between active validators
- **Deploy-before-propose**: Deploys contracts before proposing
- **Failure handling**: Retries and rotates on failures
- **Health monitoring**: Built-in health checks

**Configuration** (`autopropose/config.yml`):
```yaml
autopropose:
  period: 30           # Propose interval in seconds
  enabled: true        # Master switch

rotation:
  enabled: true        # Enable round-robin
  rotate_on_success: true
  max_failures_per_validator: 3

deploy:
  enabled: true
  contract: /contracts/simpleInsertLookup.rho
  phlo_limit: 100000
  phlo_price: 1
```

### Observer Node

**Role**: Read-only access to blockchain

**Use Cases**:
- API endpoint for applications
- Blockchain explorer backend
- Monitoring and analytics
- Load balancing read queries

**Configuration**:
```yaml
command:
  - run
  - --host=$READONLY_HOST
  - --bootstrap=rnode://<bootstrap_id>@$BOOTSTRAP_HOST
  - --no-upnp
  - --allow-private-addresses
```

## Advanced Operations

### Adding a New Validator

1. **Generate validator keys**:
```bash
# Use F1R3FLY key generation tool
docker run -it f1r3flyindustries/f1r3fly-scala-node keygen
```

2. **Create docker-compose override**:
```yaml
services:
  validator5:
    image: f1r3flyindustries/f1r3fly-scala-node
    # ... configuration
```

3. **Start validator**:
```bash
docker-compose -f validator5.yml up -d
```

4. **Bond validator** (if not in genesis):
```bash
# Use rust-client or gRPC API for bonding
```

### Custom Network Configuration

1. **Modify genesis files**:
   - `genesis/bonds.txt`: Initial validators and stakes
   - `genesis/wallets.txt`: Funded accounts

2. **Update environment variables** (`.env`):
```bash
VALIDATOR1_PUBLIC_KEY=<new_public_key>
VALIDATOR1_PRIVATE_KEY=<new_private_key>
```

3. **Adjust autopropose settings**:
```yaml
# autopropose/config.yml
autopropose:
  period: 60  # Slower proposing
validators:
  - name: custom_validator
    host: custom.host
    enabled: true
```

### Kubernetes Deployment (Helm)

1. **Configure values**:
```bash
cd docker/helm/f1r3fly
vi values.yaml
```

2. **Deploy to Kubernetes**:
```bash
helm install f1r3fly-network .
```

3. **Scale validators**:
```yaml
shardConfig:
  deployableReplicas: 5  # 5 validators
  readOnlyReplicas: 3    # 3 observers
```

## Monitoring & Debugging

### View Logs

**All services**:
```bash
docker-compose -f shard-with-autopropose.yml logs -f
```

**Specific service**:
```bash
docker-compose -f shard-with-autopropose.yml logs -f validator1
```

**AutoPropose logs**:
```bash
docker-compose -f shard-with-autopropose.yml logs -f autopropose
```

### Check Node Status

**Via gRPC API**:
```bash
# Get node status
curl http://localhost:40403/api/status

# Get block info
curl http://localhost:40403/api/blocks
```

**Via Docker**:
```bash
# Execute commands in container
docker exec -it rnode.validator1 /bin/bash
./bin/rnode show-blocks
```

### Common Issues

**Network not forming**:
- Check bootstrap node is running
- Verify network bridge exists: `docker network ls`
- Check firewall rules for ports 40400-40445

**AutoPropose not working**:
- Check startup delay (default 240s)
- Verify validators are ready
- Check deploy wallet has funds
- Review autopropose logs

**High memory usage**:
- Adjust JVM heap in config files
- Monitor with: `docker stats`

## Security Considerations

### Production Deployment

1. **Replace all test keys**:
   - Generate new validator keys
   - Create new TLS certificates
   - Update wallet keys

2. **Secure configuration files**:
   - Use Docker secrets for keys
   - Encrypt sensitive configs
   - Limit file permissions

3. **Network security**:
   - Use private networks
   - Configure firewalls
   - Enable TLS for all APIs

4. **Monitoring**:
   - Set up prometheus metrics
   - Configure alerts
   - Enable audit logging

### Test Keys (DO NOT USE IN PRODUCTION)

The repository includes test keys for development:
- Bootstrap node keys
- Validator 1-4 keys
- AutoPropose deploy wallet
- TLS certificates

**Always generate new keys for production deployments!**

## Wallet Information

### Pre-funded Test Wallets

| Wallet | REV Address | Initial Balance | Purpose |
|--------|------------|-----------------|---------|
| Bootstrap | 1111AtahZee...k5r3g | 50000000000000000 | Network operations |
| Validator1 | 111127RX5Zg...2PiHA | 50000000000000000 | Validator operations |
| Validator2 | 111129p33f7...ymczH | 50000000000000000 | Validator operations |
| Validator3 | 1111LAd2PWa...HftP | 50000000000000 | Validator operations |
| AutoPropose | 1111ocWgUJb...TDS8 | 50000000000000000 | Contract deployments |

### Key Management

**Private keys location**:
- Environment file: `docker/.env`
- Documentation: `docker/README.md`
- Config files: Various `*.conf` files

**Best practices**:
- Rotate keys regularly
- Use hardware security modules (HSM) in production
- Never commit private keys to version control
- Use encrypted key storage

## Troubleshooting

### Reset Everything
```bash
# Stop all containers
docker-compose -f shard-with-autopropose.yml down
docker-compose -f observer.yml down
docker-compose -f validator4.yml down

# Remove all data
rm -rf data/

# Remove network
docker network rm docker_f1r3fly

# Start fresh
docker-compose -f shard-with-autopropose.yml up
```

### Debug Connection Issues
```bash
# Check network
docker network inspect docker_f1r3fly

# Test connectivity
docker exec rnode.validator1 ping rnode.bootstrap

# Check ports
netstat -tuln | grep 404
```

### Performance Tuning
```bash
# Adjust JVM heap
export _JAVA_OPTIONS="-Xmx4g -Xms2g"

# Modify compose file
environment:
  - _JAVA_OPTIONS=-Xmx4g -Xms2g
```

## Additional Resources

- [Rust Client](https://github.com/F1R3FLY-io/rust-client)
- [F1R3FLY Documentation](https://github.com/F1R3FLY-io/f1r3fly)
- [RChain Reference](https://github.com/rchain/rchain)

## Support

For issues and questions:
- GitHub Issues: [F1R3FLY Repository](https://github.com/F1R3FLY-io/f1r3fly/issues)
- Documentation: Check `/docs` folder in repository
- Logs: Always include relevant log excerpts when reporting issues

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

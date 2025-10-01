# ASI Chain Documentation Site

This is the official documentation site for ASI Chain, built using [Docusaurus](https://docusaurus.io/) v3.8.1.

**Live Site:** http://13.251.66.61:3003  
**Status:** ✅ Deployed  
**Platform:** AWS Lightsail (Docker)  
**Auto-Deployment:** Enabled via GitHub Actions

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build locally
npm run serve
```

## Docker Deployment

The documentation site is containerized for easy deployment:

```bash
# Build Docker image
docker-compose build

# Run locally
docker-compose up -d

# Access at http://localhost:3003
```

## Production Deployment

### AWS Lightsail Deployment (Current)

The site is deployed on AWS Lightsail using Docker:

- **URL:** http://13.251.66.61:3003
- **Container:** asi-docs
- **Port:** 3003
- **Architecture:** Multi-stage Docker build (Node.js for building, Nginx for serving)

### Automatic Deployment (GitHub Actions)

Simply push changes to the main branch and GitHub Actions will automatically deploy to the AWS Lightsail server.

### Manual Deployment

```bash
# Option 1: Quick deploy script
./deployment/quick-deploy.sh

# Option 2: Docker deployment
docker-compose build --no-cache
docker-compose up -d
```

For detailed deployment instructions, see [AWS_LIGHTSAIL_DOCS_DEPLOYMENT.md](docs/archive/deployment/lightsail_fullstack/AWS_LIGHTSAIL_DOCS_DEPLOYMENT.md)

## Development

This section provides comprehensive guides for ASI Chain blockchain development and multi-node network management.

### Development Guide

For complete development setup, environment configuration, and coding guidelines, see the [Development Guide](docs/development/guide.md). This guide covers:

- Development environment setup with required tools (JDK 11, SBT, Docker)
- Building F1R3FLY from source
- Project structure and module organization
- Development workflow and testing strategies
- Debugging techniques and performance profiling

### Configuration Guide

For detailed configuration management including monitoring stack and service configurations, see the [Configuration Guide](docs/development/configuration.md). This covers:

- Prometheus metrics collection setup
- Systemd service configuration for blockchain metrics exporter
- Environment-specific configurations for production and development
- Network monitoring and troubleshooting procedures

### Running Multiple Nodes

For developers who need to establish and manage a multi-node peer-to-peer network environment, we provide comprehensive instructions for setting up distributed blockchain testing environments.

#### Quick Multi-Node Setup

```bash
# Create isolated Docker network for F1R3FLY nodes
docker network create \
  --driver bridge \
  --subnet=172.20.0.0/16 \
  --ip-range=172.20.240.0/20 \
  --gateway=172.20.0.1 \
  f1r3fly-dev-net

# Setup directory structure
mkdir -p f1r3fly-multinode/{rnode0,rnode1,rnode2,shared/genesis}
cd f1r3fly-multinode

# Generate keys and configurations for each node
for i in 0 1 2; do
  mkdir -p rnode$i/{data,configs,keys}
  docker run --rm -v $(pwd)/rnode$i/keys:/keys \
    f1r3flyindustries/f1r3fly-scala-node:latest \
    keygen --algorithm secp256k1 --output-dir /keys
done

# Start bootstrap node (rnode0)
docker run -d --name rnode0 --hostname rnode0 \
  --network f1r3fly-dev-net --ip 172.20.240.10 \
  -p 40400-40405:40400-40405 \
  -v $(pwd)/rnode0/data:/var/lib/rnode/data \
  f1r3flyindustries/f1r3fly-scala-node:latest

# Start validator nodes (rnode1, rnode2)
# Connect to bootstrap node for peer discovery
BOOTSTRAP_ID=$(docker exec rnode0 cat /var/lib/rnode/keys/node.pub)
for i in 1 2; do
  base_port=$((40400 + i * 10))
  ip_suffix=$((10 + i))
  docker run -d --name rnode$i --hostname rnode$i \
    --network f1r3fly-dev-net --ip 172.20.240.$ip_suffix \
    -p $base_port-$((base_port + 5)):40400-40405 \
    -v $(pwd)/rnode$i/data:/var/lib/rnode/data \
    f1r3flyindustries/f1r3fly-scala-node:latest \
    --bootstrap rnode://${BOOTSTRAP_ID}@172.20.240.10:40400
done
```

#### Network Verification

```bash
# Check peer connections across all nodes
curl -s http://localhost:40403/api/status | jq '.peers'  # Bootstrap
curl -s http://localhost:40413/api/status | jq '.peers'  # Validator1
curl -s http://localhost:40453/api/status | jq '.peers'  # Observer

# Test contract deployment and block propagation
curl -X POST http://localhost:40401/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"term": "new out(`rho:io:stdout`) in { out!(\"Hello multi-node!\") }", "phloLimit": 100000}'

curl -X POST http://localhost:40401/api/propose

# Verify block synchronization
for port in 40403 40413 40453; do
  echo "Port $port blocks: $(curl -s http://localhost:$port/api/blocks | jq 'length')"
done
```

#### Key Features

- **Isolated Docker Network**: Dedicated network with custom subnet for secure node communication
- **Multiple Node Types**: Bootstrap, validator, and observer nodes with different roles
- **Port Management**: Systematic port allocation (40400-40405, 40410-40415, etc.)
- **Genesis Configuration**: Shared genesis files for network consensus
- **Peer Discovery**: Automatic peer discovery and connection management
- **API Testing**: Complete REST and gRPC API verification procedures

#### Use Cases

This multi-node setup enables:

- **Consensus Testing**: Validate blockchain consensus across distributed validators
- **Smart Contract Development**: Test Rholang contracts in distributed environment
- **Network Resilience**: Simulate node failures and recovery scenarios
- **Performance Benchmarking**: Load testing with multiple concurrent nodes
- **Integration Testing**: End-to-end application testing with realistic network topology

For complete multi-node setup instructions, advanced configurations, troubleshooting guides, and practical use cases, see the [comprehensive multi-node documentation](running-multiple-nodes.md).

## Technical Writer Guide

See [TECHNICAL_WRITER_GUIDE.md](./TECHNICAL_WRITER_GUIDE.md) for instructions on how to update documentation without technical knowledge.

## GitHub Actions Setup

See [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) for CI/CD configuration details.

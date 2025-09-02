# F1R3FLY Node Documentation

## Overview

The F1R3FLY node is the core blockchain implementation for ASI Chain, providing a high-performance, concurrent execution environment for smart contracts using the Rholang process calculus language.

## Repository Structure

The `f1r3fly/` directory is configured as a Git submodule pointing to the official F1R3FLY repository:
- **Repository**: https://github.com/F1R3FLY-io/f1r3fly.git
- **Type**: Git submodule
- **Purpose**: Core blockchain node implementation

## Installation

### Cloning with Submodules

When cloning the ASI Chain repository, initialize submodules:

```bash
# Clone with submodules
git clone --recursive https://github.com/asi-alliance/asi-chain.git

# Or if already cloned, initialize submodules
git submodule init
git submodule update
```

### Building from Source

Prerequisites:
- JDK 11 (OpenJDK recommended)
- sbt (Scala Build Tool)
- Docker (for containerized deployment)

Build commands:
```bash
cd f1r3fly
sbt clean compile
sbt stage  # Creates executable binary
```

## Node Types

ASI Chain operates multiple node types in the network:

### 1. Bootstrap Node
- **Purpose**: Initial network entry point
- **Port**: 40403 (API), 40402 (P2P)
- **Container**: `rnode.bootstrap`

### 2. Validator Nodes
- **Purpose**: Block validation and consensus
- **Ports**: 40413, 40423, 40433, 40443 (API)
- **Containers**: `rnode.validator1-4`
- **Bonding**: Required for block production

### 3. Observer Node
- **Purpose**: Read-only access to blockchain state
- **Port**: 40453 (API)
- **Container**: `rnode.readonly`
- **Features**: Wallet balance queries, state inspection

### 4. AutoPropose Node
- **Purpose**: Automated block proposal
- **Container**: `autopropose`
- **Function**: Ensures continuous block production

## Configuration

### Node Configuration Files

Each node requires configuration for:
- Network identity (node key)
- Bootstrap server address
- Validator bonds file
- Data directory path
- API server settings

Example configuration:
```hocon
rnode {
  server {
    host = "0.0.0.0"
    port = 40400
  }
  grpc {
    host = "0.0.0.0"
    port = 40401
  }
  http {
    host = "0.0.0.0"
    port = 40403
  }
  casper {
    validator-private-key = "path/to/key"
    bonds-file = "path/to/bonds"
  }
}
```

## Deployment

### Docker Deployment

The recommended deployment method uses Docker:

```bash
# Build Docker image
docker build -t f1r3fly-node .

# Run node
docker run -d \
  --name rnode.validator1 \
  -p 40413:40403 \
  -v /data:/var/lib/rnode \
  f1r3fly-node
```

### Docker Compose

For multi-node deployment:
```yaml
services:
  validator1:
    image: f1r3fly-node
    container_name: rnode.validator1
    ports:
      - "40413:40403"
    volumes:
      - validator1-data:/var/lib/rnode
    networks:
      - f1r3fly-network
```

## API Endpoints

### gRPC API (Port 40401/40411/40421...)
- Deploy smart contracts
- Propose blocks
- Query blockchain state

### HTTP API (Port 40403/40413/40423...)
- RESTful interface
- Block explorer data
- Network status

### Metrics (Port 40404)
- Prometheus-compatible metrics
- Node health monitoring
- Performance statistics

## Smart Contract Execution

F1R3FLY executes Rholang smart contracts:

1. **Deploy Contract**:
```bash
./node_cli deploy -f contract.rho -H localhost -p 40412
```

2. **Query State**:
```bash
./node_cli show-blocks --depth 10
```

3. **Check Balance**:
```bash
./node_cli wallet-balance --address "11112..." -p 40452
```

## Consensus Mechanism

F1R3FLY uses CBC Casper consensus:
- **Proof-of-Stake**: Validators bond tokens
- **Multi-parent DAG**: Parallel block creation
- **Finality**: Probabilistic finalization
- **Fork Choice**: GHOST-based selection

## Monitoring

### Health Checks
```bash
# Check node status
curl http://localhost:40403/status

# View peers
curl http://localhost:40403/peers

# Get block info
curl http://localhost:40403/api/blocks
```

### Metrics Collection
- Prometheus scrapes metrics from port 40404
- Grafana dashboards visualize performance
- Custom exporters for blockchain-specific metrics

## Troubleshooting

### Common Issues

1. **Node won't sync**:
   - Check bootstrap node connectivity
   - Verify network configuration
   - Review logs: `docker logs rnode.validator1`

2. **High memory usage**:
   - Adjust JVM heap size
   - Configure state pruning
   - Monitor with: `docker stats`

3. **Block production stopped**:
   - Verify validator is bonded
   - Check autopropose service
   - Review consensus logs

## Performance Tuning

### JVM Options
```bash
export _JAVA_OPTIONS="-Xmx4g -Xms2g -XX:+UseG1GC"
```

### Network Optimization
- Adjust peer discovery intervals
- Configure connection limits
- Optimize block size

### Storage
- Use SSD for data directory
- Regular state pruning
- Implement log rotation

## Development

### Running Tests
```bash
cd f1r3fly
sbt test
sbt it:test  # Integration tests
```

### Contributing
1. Fork the F1R3FLY repository
2. Create feature branch
3. Submit pull request to upstream

## Related Documentation

- [Architecture Overview](architecture-overview.md)
- [Casper Consensus Guide](casper-consensus-guide.md)
- [Rholang Programming Guide](rholang-programming-guide.md)
- [Deployment Guide](deployment/AWS_LIGHTSAIL_DEPLOYMENT.md)
- [Rust Client Guide](tools/RUST_CLIENT_GUIDE.md)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

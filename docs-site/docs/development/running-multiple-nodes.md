---
sidebar_position: 3
title: Running Multiple Nodes
---

# Running Multiple Nodes

## Overview

This guide explains how to set up and run multiple ASI Chain nodes for testing and development purposes. You'll learn to create a peer-to-peer network with multiple validators, observers, and automated block proposing.

## Prerequisites

- **Docker Engine**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **System Requirements**: 8GB RAM minimum, 20GB free disk space
- **Network**: Available ports 40400-40455

## Creating a Docker Network

Before starting multiple nodes, verify network creation by running the command below:

```bash
# Verify network creation
docker network ls | grep f1r3fly

```

**Network Configuration**:
- **Name**: `f1r3fly`
- **Driver**: `bridge`
- **Purpose**: Enables secure communication between all ASI Chain containers

## Starting Multiple Nodes

### Method 1: Complete Multi-Validator Network (Recommended)

This method starts a full network with bootstrap node, multiple validators, and automated proposing.

#### Step 1: Start Main Network (rnode0 + validators)

```bash
# Navigate to Docker directory
cd f1r3fly/docker

# Start the complete shard network with auto-propose
docker compose -f shard-with-autopropose.yml up -d

# Wait for genesis ceremony (4-5 minutes)
echo "Waiting for genesis ceremony to complete..."
sleep 300
```

This command starts:
- **Bootstrap Node** (`rnode0`): Genesis ceremony coordinator
- **Validator1**: First consensus participant  
- **Validator2**: Second consensus participant
- **Validator3**: Third consensus participant
- **AutoPropose Service**: Automated block proposing with validator rotation

#### Step 2: Add Observer Node (rnode1)

```bash
# Start read-only observer node
docker compose -f observer.yml up -d

# Verify observer is connected
docker compose -f observer.yml logs
```

#### Step 3: Add Additional Validator (Optional)

```bash
# Start fourth validator
docker compose -f validator4.yml up -d

# Monitor validator startup
docker compose -f validator4.yml logs
```

### Method 2: Manual Two-Node Setup

For simple testing with just two nodes using containerized operations:

#### Step 1: Start Bootstrap Container (rnode0)

```bash
# Create and start bootstrap container in background
docker run -d \
  --name rnode0 \
  --network f1r3fly \
  -p 40400-40405:40400-40405 \
  -v $(pwd)/conf/bootstrap-ceremony.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  sleep infinity

# Start the RChain node service inside the container
docker exec -d rnode0 rnode \
  run \
  --host rnode0 \
  --allow-private-addresses \
  --validator-private-key 30440220...
```

#### Step 2: Start Peer Container (rnode1)

```bash
# Create and start peer container in background
docker run -d \
  --name rnode1 \
  --network f1r3fly \
  -p 40410-40415:40400-40405 \
  -v $(pwd)/conf/validator1.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  sleep infinity

# Get bootstrap node ID using docker exec
BOOTSTRAP_ID=$(docker exec rnode0 cat /var/lib/rnode/.rnode/rnode_id)

# Start the RChain node service inside the peer container
docker exec -d rnode1 rnode \
  run \
  --host rnode1 \
  --bootstrap "rnode://${BOOTSTRAP_ID}@rnode0" \
  --validator-private-key 30440220...
```

⚠️ **Key Take-aways**
1. **Validator recognition depends on the bonds file**

   * If your validator private key is **already listed in the existing `bonds.txt`**, the node will be recognized as a validator.
   * If it’s **not in the file**, your node will start but **will not propose blocks**.

2. **Config alignment is critical**

   * The node’s `rnode.conf` must match the network, ports, and genesis used in the existing setup.
   * If it differs (e.g., wrong shardId, networkId, or genesis block), the node may fail to join the network properly.

3. **Using the existing bonds.txt and config**

   * Means you are **joining the network as defined by those files**.
   * If the private key you specify is already in the bonds file, **blocks will be proposed**.
   * If not, your node will only **sync and observe**, but not propose blocks.


## Node Port Mappings

Each node uses a dedicated port range to avoid conflicts:

| Node Type | Container Ports | Host Ports | Purpose |
|-----------|----------------|------------|---------|
| Bootstrap (rnode0) | 40400-40405 | 40400-40405 | P2P, gRPC, HTTP API |
| Validator1 (rnode1) | 40400-40405 | 40410-40415 | P2P, gRPC, HTTP API |
| Validator2 | 40400-40405 | 40420-40425 | P2P, gRPC, HTTP API |
| Validator3 | 40400-40405 | 40430-40435 | P2P, gRPC, HTTP API |
| Validator4 | 40400-40405 | 40440-40445 | P2P, gRPC, HTTP API |
| Observer | 40401-40403 | 40451-40453 | gRPC, HTTP API (no P2P) |

### Port Functions

- **40400**: P2P protocol communication
- **40401**: gRPC external API
- **40402**: gRPC internal API (for block proposing)
- **40403**: HTTP REST API
- **40404**: P2P discovery protocol
- **40405**: Admin HTTP API

## Verifying Communication Between Nodes

### Method 1: Check Network Status via API

```bash
# Check bootstrap node status
curl -s http://localhost:40403/api/status | jq .

# Check validator1 status  
curl -s http://localhost:40413/api/status | jq .

# Check observer node status
curl -s http://localhost:40453/api/status | jq .
```

### Method 2: Monitor Peer Connections

```bash
# View number of active peers on the bootstrap node
curl -s http://localhost:40403/api/status | jq '.peers'

# Check if nodes are discovering each other
docker compose -f shard-with-autopropose.yml logs | grep -i "peer"
```

### Method 3: Verify Block Synchronization

```bash
# Get latest block from each node
echo "Bootstrap Node Block Height:"
curl -s http://localhost:40403/api/blocks | jq '.[0].blockNumber'

echo "Validator1 Block Height:"
curl -s http://localhost:40413/api/blocks | jq '.[0].blockNumber'

echo "Observer Block Height:"
curl -s http://localhost:40453/api/blocks | jq '.[0].blockNumber'
```

### Method 4: Container Network Connectivity

```bash
# Test network connectivity between containers
# For Method 1 (docker compose): Get the container IP rnode.bootstrap & rnode.validator1
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode.bootstrap
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode.validator1

# For Method 2 (manual setup): Get the container IP rnode0 & rnode1
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode0
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode1

# Ping containers from host
ping -c 3 <container-ip>

# Check Docker network details
docker network inspect docker_f1r3fly
```

## Network Health Verification

### Automated Health Check Script

Create a script to verify your multi-node network:

```bash
#!/bin/bash
# save as check-network-health.sh

echo "=== ASI Chain Multi-Node Health Check ==="

# Check container status
echo "Container Status:"
docker compose -f shard-with-autopropose.yml ps
docker compose -f observer.yml ps 2>/dev/null || true

# Check API endpoints
echo -e "\nAPI Health Checks:"
NODES=("40403:Bootstrap" "40413:rnode.validator1" "40423:rnode.validator2" "40433:rnode.validator3" "40453:Observer")

for node in "${NODES[@]}"; do
    IFS=':' read -r port name <<< "$node"
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/api/status)
    if [ "$status" = "200" ]; then
        echo "✅ $name (port $port): Healthy"
    else
        echo "❌ $name (port $port): Unhealthy (HTTP $status)"
    fi
done

# Check block heights
echo -e "\nBlock Synchronization:"
for node in "${NODES[@]}"; do
    IFS=':' read -r port name <<< "$node"
    height=$(curl -s http://localhost:${port}/api/blocks 2>/dev/null | jq -r '.[0].blockNumber // "N/A"')
    echo "$name: Block $height"
done

echo -e "\n=== Health Check Complete ==="
```

```bash
# Make executable and run
chmod +x check-network-health.sh
./check-network-health.sh
```

## Managing the Multi-Node Network

### Starting the Network

```bash
# Complete startup sequence
cd f1r3fly/docker

# 1. Start main shard with auto-propose
docker compose -f shard-with-autopropose.yml up -d

# 2. Wait for genesis (important!)
echo "Waiting for genesis ceremony..."
sleep 300

# 3. Start observer
docker compose -f observer.yml up -d

# 4. Start additional validator (optional)
docker compose -f validator4.yml up -d

echo "Multi-node network started successfully!"
```

### Monitoring the Network

```bash
# View all container logs
docker compose -f shard-with-autopropose.yml logs -f

# Monitor specific services
docker compose -f shard-with-autopropose.yml logs -f validator1
docker compose -f shard-with-autopropose.yml logs -f autopropose

# Monitor block production
docker compose -f shard-with-autopropose.yml logs -f | grep -i "proposed\|finalized"
```

### Stopping the Network

```bash
# Stop all nodes gracefully
docker compose -f validator4.yml down 2>/dev/null || true
docker compose -f observer.yml down 2>/dev/null || true
docker compose -f shard-with-autopropose.yml down

# Optional: Remove all data for fresh start
rm -rf data/

# Optional: Remove Docker network
docker network rm f1r3fly 2>/dev/null || true
```

## Advanced Configuration

### Custom Network Topology

You can create custom network configurations by modifying the `docker compose` files:

📝 Please note that "Custom Network Topology” will work only on localhost.

```yaml
# custom-network.yml
services:
  custom-validator:
    image: f1r3flyindustries/f1r3fly-scala-node:latest
    container_name: rnode.custom
    hostname: rnode.custom
    networks:
      - f1r3fly
    ports:
      - "40460-40465:40400-40405"
    volumes:
      - ./conf/custom-validator.conf:/var/lib/rnode/rnode.conf
      - ./genesis:/var/lib/rnode/genesis
      - ./certs:/var/lib/rnode
    command:
      - run
      - --host=rnode.custom
      - --bootstrap=rnode://BOOTSTRAP_ID@rnode.bootstrap
      - --validator-private-key=YOUR_PRIVATE_KEY

networks:
  f1r3fly:
    external: true
```

### Performance Optimization

For better performance with multiple nodes:

```bash
# Increase Docker daemon resources
# Edit /etc/docker/daemon.json:
{
  "default-runtime": "runc",
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

## Troubleshooting

### Common Issues

#### 1. Nodes Not Connecting

```bash
# Check network connectivity
# For Method 1 (docker compose): Get the container IP
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode.bootstrap

# For Method 2 (manual setup): Get the container IP
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' rnode0

# Ping containers from host
ping -c 3 <container-ip>

# Verify ports are not blocked
netstat -tuln | grep 404

# Check Docker network
docker network inspect f1r3fly

# For manual setup - check container logs using docker exec
docker exec rnode0 tail -f /var/lib/rnode/rnode.log
docker exec rnode1 tail -f /var/lib/rnode/rnode.log
```

#### 2. Genesis Ceremony Timeout

```bash
# Increase startup wait time
sleep 600  # Wait 10 minutes instead of 5

# Check bootstrap logs
docker compose -f shard-with-autopropose.yml logs rnode.bootstrap
```

#### 3. Block Sync Issues

```bash
# Restart specific node
docker compose -f shard-with-autopropose.yml restart validator1

# Check for network partitions
curl http://localhost:40403/api/peers
```

#### 4. Port Conflicts

```bash
# Check what's using ports
sudo lsof -i :40400-40455

# Use different port ranges in `docker compose` files
ports:
  - "50400-50405:40400-40405"  # Custom port range
```

### Reset Network Completely

```bash
#!/bin/bash
# reset-network.sh - Complete network reset

echo "Stopping all containers..."
# Stop docker compose containers (Method 1)
docker compose -f validator4.yml down 2>/dev/null
docker compose -f observer.yml down 2>/dev/null
docker compose -f shard-with-autopropose.yml down

# Stop manual containers (Method 2)
docker stop rnode0 rnode1 2>/dev/null
docker rm rnode0 rnode1 2>/dev/null

echo "Removing all blockchain data..."
rm -rf data/

echo "Removing Docker network..."
docker network rm f1r3fly 2>/dev/null

echo "Creating fresh network..."
docker network create f1r3fly

echo "Starting fresh network..."
docker compose -f shard-with-autopropose.yml up -d

echo "Waiting for genesis ceremony..."
sleep 300

echo "Starting observer..."
docker compose -f observer.yml up -d

echo "Network reset complete!"
```

## Best Practices

1. **Always wait for genesis ceremony** (5+ minutes) before adding additional nodes
2. **Monitor resource usage** with `docker stats` during operation
3. **Use health checks** to verify network state before deployments
4. **Keep logs manageable** by configuring log rotation
5. **Test connectivity** between all nodes after startup
6. **Backup configurations** before making changes
7. **Use dedicated networks** to isolate different environments

## Integration with Development Workflow

### Testing Smart Contracts

With multiple nodes running, you can test contract deployment across the network:

```bash
# Deploy to bootstrap node
curl -X POST http://localhost:40403/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"term": "new x in { x!(42) }", "phloLimit": 100000}'

# Verify deployment on observer
curl http://localhost:40453/api/deploys
```

### Performance Testing

Use multiple nodes to test network performance:

```bash
# Test parallel deployments
for i in {1..10}; do
  curl -X POST http://localhost:40403/api/deploy \
    -H "Content-Type: application/json" \
    -d "{\"term\": \"@\\\"test${i}\\\"!(${i})\", \"phloLimit\": 100000}" &
done
wait
```

## Related Documentation

- [Development Guide](./guide.md) - Complete development setup
- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Docker Deployment](../deployment/docker-guide.md) - Advanced Docker configurations
- [F1R3FLY Deployment](../deployment/f1r3fly-deployment.md) - Production deployment guide

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
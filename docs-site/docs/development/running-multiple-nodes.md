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
# Remove the old container
sudo docker rm -f rnode0

# Create and start bootstrap container in background
sudo docker run -d \
  --name rnode0 \
  --network docker_f1r3fly \
  -p 40400-40405:40400-40405 \
  -v $(pwd)/conf/bootstrap-ceremony.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  --restart unless-stopped \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  run \
    --host rnode0 \
    --allow-private-addresses \
    --validator-private-key /var/lib/rnode/validator0.pem


# Verify it’s running
sudo docker ps

```

#### Step 2: Start Peer Container (rnode1)

```bash
# Create and start peer container in background
sudo docker run -d \
  --name rnode1 \
  --network docker_f1r3fly \
  -p 40410-40415:40400-40405 \
  -v $(pwd)/conf/bootstrap-ceremony.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  --restart unless-stopped \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  run \
    --host rnode1 \
    --allow-private-addresses \
    --validator-private-key /var/lib/rnode/validator1.pem

# Verify it’s running
sudo docker ps

# Get bootstrap node ID using docker exec
BOOTSTRAP_ID=$(grep '^BOOTSTRAP_NODE_ID=' f1r3node/docker/.env | cut -d '=' -f2)

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

### Method 3: Docker Network P2P Testing Environment

This method demonstrates creating a complete peer-to-peer testing environment with isolated Docker networking, proper node communication setup, and comprehensive verification steps. This approach provides better network isolation and more realistic P2P testing scenarios.

#### Step 1: Create Docker Network for P2P Testing

First, create a dedicated Docker network specifically designed for ASI Chain P2P testing:

```bash
# Create a custom Docker network for ASI Chain P2P testing
docker network create --driver bridge \
  --subnet=172.20.0.0/16 \
  --ip-range=172.20.240.0/20 \
  --gateway=172.20.0.1 \
  asi-p2p-network

# Verify the network was created successfully
docker network ls | grep asi-p2p-network

# Inspect network configuration details
docker network inspect asi-p2p-network
```

**Network Configuration Details:**
- **Network Name**: `asi-p2p-network`
- **Driver**: `bridge` (for container-to-container communication)
- **Subnet**: `172.20.0.0/16` (provides 65,534 available IP addresses)
- **IP Range**: `172.20.240.0/20` (4,094 addresses for dynamic allocation)
- **Gateway**: `172.20.0.1` (network gateway for external communication)

#### Step 2: Start Main Node (rnode0) in Standalone Mode

Create and start the bootstrap/main node with proper network configuration:

```bash
# Navigate to the f1r3fly docker directory
cd f1r3fly/docker

# Stop and remove any existing rnode0 container
docker stop rnode0 2>/dev/null || true
docker rm rnode0 2>/dev/null || true

# Create main node configuration for standalone mode
cat > conf/rnode0-standalone.conf << 'EOF'
rnode {
  server {
    host = 0.0.0.0
    port = 40400
    port-kademlia = 40404
    http-port = 40403
    grpc-port-external = 40401
    grpc-port-internal = 40402
  }

  grpc {
    port-external = 40401
    port-internal = 40402
    host = 0.0.0.0
  }

  casper {
    shard-id = "root"
    known-validators = []
    validators-file = "/var/lib/rnode/genesis/bonds.txt"
    genesis-ceremony = true
    standalone = true
    auto-propose = true
    auto-propose-interval = 15s
  }

  blockstorage {
    data-dir = "/var/lib/rnode/blockstorage"
  }

  network {
    allow-private-addresses = true
    upnp = false
  }
}
EOF

# Start main node (rnode0) in standalone mode
docker run -d \
  --name rnode0 \
  --hostname rnode0 \
  --network asi-p2p-network \
  --ip 172.20.240.10 \
  -p 40400:40400 \
  -p 40401:40401 \
  -p 40402:40402 \
  -p 40403:40403 \
  -p 40404:40404 \
  -p 40405:40405 \
  -v $(pwd)/conf/rnode0-standalone.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  -v rnode0-data:/var/lib/rnode/blockstorage \
  --restart unless-stopped \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  run \
    --host rnode0 \
    --allow-private-addresses \
    --validator-private-key /var/lib/rnode/validator0.pem

# Wait for main node initialization (3-4 minutes)
echo "Waiting for main node (rnode0) to initialize..."
sleep 180

# Verify main node is running and accessible
docker ps | grep rnode0
curl -s http://localhost:40403/api/status | jq .
```

**Main Node Configuration Key Points:**
- **Standalone Mode**: Operates independently for initial setup
- **Auto-Propose**: Automatically creates blocks every 15 seconds
- **Genesis Ceremony**: Handles initial blockchain state creation
- **Fixed IP**: `172.20.240.10` for predictable peer discovery

#### Step 3: Start Peer Node (rnode1) Connecting to rnode0

Create and configure the second node to connect to the main node:

```bash
# Get the bootstrap node ID from rnode0
BOOTSTRAP_NODE_ID=$(sudo docker exec rnode0 cat /var/lib/rnode/node.certificate.der | grep -A 10 "Node ID" | tail -1 | tr -d '\n')

# Alternative method to get node ID via API
BOOTSTRAP_NODE_ID=$(curl -s http://localhost:40403/api/status | jq -r '.id')

echo "Bootstrap Node ID: $BOOTSTRAP_NODE_ID"

# Create peer node configuration
cat > conf/rnode1-peer.conf << 'EOF'
rnode {
  server {
    host = 0.0.0.0
    port = 40400
    port-kademlia = 40404
    http-port = 40403
    grpc-port-external = 40401
    grpc-port-internal = 40402
  }

  grpc {
    port-external = 40401
    port-internal = 40402
    host = 0.0.0.0
  }

  casper {
    shard-id = "root"
    known-validators = []
    validators-file = "/var/lib/rnode/genesis/bonds.txt"
    genesis-ceremony = false
    standalone = false
    auto-propose = false
  }

  blockstorage {
    data-dir = "/var/lib/rnode/blockstorage"
  }

  network {
    allow-private-addresses = true
    upnp = false
  }
}
EOF

# Start peer node (rnode1) connecting to rnode0
docker run -d \
  --name rnode1 \
  --hostname rnode1 \
  --network asi-p2p-network \
  --ip 172.20.240.11 \
  -p 40410:40401 \
  -p 40411:40402 \
  -p 40413:40403 \
  -p 40414:40404 \
  -p 40415:40400 \
  -v $(pwd)/conf/rnode1-peer.conf:/var/lib/rnode/rnode.conf \
  -v $(pwd)/genesis:/var/lib/rnode/genesis \
  -v $(pwd)/certs:/var/lib/rnode \
  -v rnode1-data:/var/lib/rnode/blockstorage \
  --restart unless-stopped \
  f1r3flyindustries/f1r3fly-scala-node:latest \
  run \
    --host rnode1 \
    --allow-private-addresses \
    --bootstrap "rnode://$BOOTSTRAP_NODE_ID@172.20.240.10:40400" \
    --validator-private-key /var/lib/rnode/validator1.pem

# Wait for peer node to connect and sync
echo "Waiting for peer node (rnode1) to connect and sync..."
sleep 120

# Verify peer node is running
docker ps | grep rnode1
curl -s http://localhost:40413/api/status | jq .
```

**Peer Node Configuration Key Points:**
- **Bootstrap Connection**: Connects to rnode0 using bootstrap URI
- **No Auto-Propose**: Acts as a validator but doesn't auto-generate blocks
- **Genesis Ceremony**: Set to false since joining existing network
- **Different Ports**: Uses 40410-40415 range to avoid conflicts

#### Step 4: Verifying Node-to-Node Communication

Perform comprehensive verification of P2P communication between nodes:

##### 4.1 Check Peer Count and Connections

```bash
# Check peer count on main node (rnode0)
echo "=== Main Node (rnode0) Peer Information ==="
curl -s http://localhost:40403/api/status | jq '{
  nodeId: .id,
  peerCount: .peers | length,
  peers: .peers[]?.id
}'

# Check peer count on peer node (rnode1)
echo "=== Peer Node (rnode1) Peer Information ==="
curl -s http://localhost:40413/api/status | jq '{
  nodeId: .id,
  peerCount: .peers | length,
  peers: .peers[]?.id
}'

# Verify bidirectional connectivity
echo "=== Bidirectional Connectivity Check ==="
RNODE0_PEERS=$(curl -s http://localhost:40403/api/status | jq '.peers | length')
RNODE1_PEERS=$(curl -s http://localhost:40413/api/status | jq '.peers | length')

echo "rnode0 connected peers: $RNODE0_PEERS"
echo "rnode1 connected peers: $RNODE1_PEERS"

if [ "$RNODE0_PEERS" -gt 0 ] && [ "$RNODE1_PEERS" -gt 0 ]; then
  echo "✅ Nodes are successfully connected to each other"
else
  echo "❌ Nodes are not properly connected"
fi
```

##### 4.2 Monitor Node Logs for P2P Activity

```bash
# Monitor connection establishment in node logs
echo "=== Main Node (rnode0) Connection Logs ==="
docker logs rnode0 2>&1 | grep -i -E "(peer|connect|bootstrap)" | tail -10

echo "=== Peer Node (rnode1) Connection Logs ==="
docker logs rnode1 2>&1 | grep -i -E "(peer|connect|bootstrap)" | tail -10

# Check for successful handshake messages
echo "=== Handshake and Protocol Messages ==="
docker logs rnode0 2>&1 | grep -i "handshake\|protocol" | tail -5
docker logs rnode1 2>&1 | grep -i "handshake\|protocol" | tail -5

# Monitor real-time P2P communication
echo "=== Real-time P2P Communication Monitoring ==="
echo "Starting real-time log monitoring (press Ctrl+C to stop):"
docker logs -f rnode0 2>&1 | grep -i -E "(peer|message|sync)" &
RNODE0_PID=$!
docker logs -f rnode1 2>&1 | grep -i -E "(peer|message|sync)" &
RNODE1_PID=$!

# Run monitoring for 30 seconds then stop
sleep 30
kill $RNODE0_PID $RNODE1_PID 2>/dev/null
```

##### 4.3 Verify Block Synchronization

```bash
# Check block heights and synchronization
echo "=== Block Synchronization Status ==="
RNODE0_HEIGHT=$(curl -s http://localhost:40403/api/blocks | jq -r '.[0].blockNumber // "0"')
RNODE1_HEIGHT=$(curl -s http://localhost:40413/api/blocks | jq -r '.[0].blockNumber // "0"')

echo "rnode0 block height: $RNODE0_HEIGHT"
echo "rnode1 block height: $RNODE1_HEIGHT"

DIFF=$((RNODE0_HEIGHT - RNODE1_HEIGHT))
ABS_DIFF=$(($DIFF < 0 ? -$DIFF : $DIFF))

if [ "$ABS_DIFF" -le 1 ]; then
  echo "✅ Nodes are synchronized (difference: $DIFF blocks)"
else
  echo "⚠️  Nodes may be out of sync (difference: $DIFF blocks)"
fi

# Check latest block hashes for consistency
echo "=== Block Hash Verification ==="
RNODE0_HASH=$(curl -s http://localhost:40403/api/blocks | jq -r '.[0].blockHash')
RNODE1_HASH=$(curl -s http://localhost:40413/api/blocks | jq -r '.[0].blockHash')

echo "rnode0 latest block hash: $RNODE0_HASH"
echo "rnode1 latest block hash: $RNODE1_HASH"

if [ "$RNODE0_HASH" = "$RNODE1_HASH" ]; then
  echo "✅ Nodes have identical latest blocks"
else
  echo "⚠️  Nodes have different latest blocks"
fi
```

##### 4.4 Network Connectivity Tests

```bash
# Test direct container-to-container connectivity
echo "=== Container Network Connectivity ==="
echo "Testing ping connectivity:"
docker exec rnode0 ping -c 3 172.20.240.11
docker exec rnode1 ping -c 3 172.20.240.10

echo "Testing port connectivity:"
docker exec rnode0 nc -zv 172.20.240.11 40400
docker exec rnode1 nc -zv 172.20.240.10 40400

# Check Docker network information
echo "=== Docker Network Status ==="
docker network inspect asi-p2p-network | jq '.[] | {
  Name: .Name,
  Driver: .Driver,
  Subnet: .IPAM.Config[0].Subnet,
  Gateway: .IPAM.Config[0].Gateway,
  Containers: .Containers | keys
}'
```

##### 4.5 Complete P2P Environment Health Check

Create a comprehensive health check script:

```bash
#!/bin/bash
# p2p-health-check.sh - Complete P2P environment verification

echo "========================================"
echo "ASI Chain P2P Environment Health Check"
echo "========================================"

# Container status
echo "1. Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(rnode0|rnode1)"

# API availability
echo -e "\n2. API Health:"
for node in "rnode0:40403" "rnode1:40413"; do
  name=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/api/status)
  if [ "$status" = "200" ]; then
    echo "✅ $name API: Healthy"
  else
    echo "❌ $name API: Unhealthy (HTTP $status)"
  fi
done

# Peer connectivity
echo -e "\n3. Peer Connectivity:"
RNODE0_PEERS=$(curl -s http://localhost:40403/api/status | jq '.peers | length' 2>/dev/null || echo "0")
RNODE1_PEERS=$(curl -s http://localhost:40413/api/status | jq '.peers | length' 2>/dev/null || echo "0")

echo "rnode0 peers: $RNODE0_PEERS"
echo "rnode1 peers: $RNODE1_PEERS"

# Block synchronization
echo -e "\n4. Block Synchronization:"
RNODE0_HEIGHT=$(curl -s http://localhost:40403/api/blocks | jq -r '.[0].blockNumber // "0"' 2>/dev/null || echo "0")
RNODE1_HEIGHT=$(curl -s http://localhost:40413/api/blocks | jq -r '.[0].blockNumber // "0"' 2>/dev/null || echo "0")

echo "rnode0 height: $RNODE0_HEIGHT"
echo "rnode1 height: $RNODE1_HEIGHT"

# Network status summary
echo -e "\n5. Summary:"
if [ "$RNODE0_PEERS" -gt 0 ] && [ "$RNODE1_PEERS" -gt 0 ]; then
  echo "✅ P2P Environment: Healthy"
else
  echo "❌ P2P Environment: Issues detected"
fi

echo "========================================"
```

```bash
# Make the script executable and run it
chmod +x p2p-health-check.sh
./p2p-health-check.sh
```

This method provides a complete, isolated P2P testing environment with:
- **Dedicated Docker network** for proper isolation
- **Configurable node setups** with standalone and peer modes
- **Comprehensive verification** of all communication aspects
- **Real-time monitoring** capabilities for development and testing
- **Health check automation** for continuous verification

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
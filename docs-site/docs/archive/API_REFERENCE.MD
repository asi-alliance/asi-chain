# ASI Chain API Reference

## Table of Contents
1. [Overview](#overview)
2. [gRPC API](#grpc-api)
3. [HTTP API](#http-api)
4. [Admin API](#admin-api)
5. [WebSocket API](#websocket-api)
6. [Error Handling](#error-handling)
7. [Authentication](#authentication)
8. [Rate Limiting](#rate-limiting)
9. [SDKs and Client Libraries](#sdks-and-client-libraries)

## Overview

ASI Chain provides multiple API interfaces for interacting with the blockchain:

- **gRPC API**: High-performance RPC for programmatic access
- **HTTP API**: RESTful interface for web applications
- **Admin API**: Node management and monitoring
- **WebSocket API**: Real-time event streaming

### Base URLs

```
gRPC:     grpc://localhost:40402
HTTP:     http://localhost:40403
Admin:    http://localhost:40405
WebSocket: ws://localhost:40403/ws
```

## gRPC API

### Deploy Service

#### Submit Deploy

Submit a transaction to the blockchain.

```protobuf
service DeployService {
  rpc DoDeploy(DeployDataProto) returns (DeployResponse);
}

message DeployDataProto {
  bytes deployer = 1;          // Deployer's public key
  string term = 2;              // Rholang code to execute
  int64 timestamp = 3;          // Unix timestamp
  bytes sig = 4;                // Signature
  string sigAlgorithm = 5;      // "secp256k1" or "ed25519"
  int64 phloPrice = 6;          // Gas price
  int64 phloLimit = 7;          // Gas limit
  int64 validAfterBlockNumber = 8;
}

message DeployResponse {
  bool success = 1;
  string message = 2;
  DeployId deployId = 3;
}
```

**Example (Python)**:
```python
import grpc
from rchain.crypto import PrivateKey
from rchain.client import RClient

client = RClient("localhost", 40402)

deploy_id = client.deploy(
    term='new x in { x!(42) }',
    phlo_price=1,
    phlo_limit=100000,
    private_key=PrivateKey.from_hex("...")
)
```

#### Get Deploy

Retrieve information about a submitted deploy.

```protobuf
service DeployService {
  rpc GetDeploy(GetDeployRequest) returns (GetDeployResponse);
}

message GetDeployRequest {
  DeployId deployId = 1;
}

message GetDeployResponse {
  DeployInfo deploy = 1;
  ProcessingStatus status = 2;
  repeated ProcessingResult results = 3;
}
```

### Propose Service

#### Propose Block

Trigger block creation (validator only).

```protobuf
service ProposeService {
  rpc Propose(ProposeRequest) returns (ProposeResponse);
}

message ProposeRequest {
  bool async = 1;  // Asynchronous proposal
}

message ProposeResponse {
  bool success = 1;
  string message = 2;
  BlockInfo block = 3;
}
```

**Example**:
```python
# Propose a new block
response = client.propose()
print(f"Block created: {response.block.blockHash}")
```

### Block Query Service

#### Get Blocks

Retrieve blocks from the blockchain.

```protobuf
service BlockQuery {
  rpc GetBlocks(GetBlocksRequest) returns (stream BlockInfo);
  rpc GetBlock(GetBlockRequest) returns (BlockInfo);
}

message GetBlocksRequest {
  int32 depth = 1;              // Number of blocks to retrieve
  BlocksPosition position = 2;   // Starting position
}

message GetBlockRequest {
  string blockHash = 1;
}

message BlockInfo {
  string blockHash = 1;
  int64 blockNumber = 2;
  int64 timestamp = 3;
  string deployer = 4;
  repeated string parentHashes = 5;
  repeated DeployInfo deploys = 6;
  BondsList bonds = 7;
}
```

**Example**:
```python
# Get latest blocks
blocks = client.get_blocks(depth=10)
for block in blocks:
    print(f"Block {block.blockNumber}: {block.blockHash}")
```

#### Find Deploy

Find which block contains a deploy.

```protobuf
service BlockQuery {
  rpc FindDeploy(FindDeployRequest) returns (FindDeployResponse);
}

message FindDeployRequest {
  DeployId deployId = 1;
}

message FindDeployResponse {
  BlockInfo block = 1;
}
```

### State Query Service

#### Get Data at Name

Query data stored at a specific channel.

```protobuf
service StateQuery {
  rpc GetDataAtName(DataAtNameRequest) returns (DataAtNameResponse);
}

message DataAtNameRequest {
  Par name = 1;               // Channel name
  int32 depth = 2;            // Traversal depth
  string stateBlockHash = 3;  // State reference
}

message DataAtNameResponse {
  repeated Par data = 1;
}
```

**Example**:
```python
# Query data at a channel
data = client.get_data_at_name(
    name='@"myChannel"',
    depth=1
)
```

#### Get Continuation

Retrieve continuations at a channel.

```protobuf
service StateQuery {
  rpc GetContinuation(ContinuationRequest) returns (ContinuationResponse);
}

message ContinuationRequest {
  repeated Par names = 1;
  string stateBlockHash = 2;
}

message ContinuationResponse {
  repeated ContinuationInfo continuations = 1;
}
```

## HTTP API

### Endpoints

#### GET /api/status

Get node status and information.

```json
// Response
{
  "version": "0.13.0",
  "nodeId": "1e780e5dfbe0a3d9470a2b414f502d59402e09c2",
  "peers": 5,
  "minPhloPrice": 1,
  "networkId": "mainnet",
  "shardId": "root",
  "casperStatus": {
    "validating": true,
    "lastFinalizedBlock": "abc123...",
    "lastFinalizedHeight": 12345
  }
}
```

#### POST /api/deploy

Submit a deploy via HTTP.

```json
// Request
{
  "term": "new x in { x!(42) }",
  "phloPrice": 1,
  "phloLimit": 100000,
  "deployer": "04abc...",
  "timestamp": 1634567890000,
  "sig": "304502...",
  "sigAlgorithm": "secp256k1"
}

// Response
{
  "success": true,
  "deployId": "8f6a3b2c...",
  "message": "Deploy submitted successfully"
}
```

#### GET /api/block/{blockHash}

Get block by hash.

```json
// Response
{
  "blockHash": "abc123...",
  "blockNumber": 12345,
  "timestamp": 1634567890000,
  "deployer": "04abc...",
  "parents": ["def456...", "ghi789..."],
  "deploys": [
    {
      "deployId": "8f6a3b2c...",
      "deployer": "04abc...",
      "term": "new x in { x!(42) }",
      "cost": 1234
    }
  ],
  "bonds": {
    "04abc...": 1000000,
    "04def...": 2000000
  }
}
```

#### GET /api/blocks

Get recent blocks.

```json
// Query parameters
?depth=10&position=latest

// Response
{
  "blocks": [
    {
      "blockHash": "abc123...",
      "blockNumber": 12345,
      "timestamp": 1634567890000
      // ... more fields
    }
  ]
}
```

#### GET /api/deploy/{deployId}

Get deploy status and result.

```json
// Response
{
  "deployId": "8f6a3b2c...",
  "status": "processed",
  "blockHash": "abc123...",
  "cost": 1234,
  "result": {
    "success": true,
    "data": "42"
  }
}
```

#### POST /api/explore

Execute Rholang code (read-only).

```json
// Request
{
  "term": "@\"myChannel\"!(42)",
  "blockHash": "abc123..."  // Optional state reference
}

// Response
{
  "result": {
    "data": ["42"],
    "cost": 123
  }
}
```

#### GET /api/bonds

Get current validator bonds.

```json
// Response
{
  "bonds": {
    "04abc...": 1000000,
    "04def...": 2000000,
    "04ghi...": 1500000
  },
  "totalBonded": 4500000
}
```

#### POST /api/propose

Trigger block proposal (validator only).

```json
// Request
{
  "async": false
}

// Response
{
  "success": true,
  "blockHash": "abc123...",
  "deploys": 5
}
```

## Admin API

### Monitoring Endpoints

#### GET /admin/metrics

Prometheus metrics.

```
# HELP rnode_cpu_usage CPU usage percentage
# TYPE rnode_cpu_usage gauge
rnode_cpu_usage 45.2

# HELP rnode_memory_usage Memory usage in bytes
# TYPE rnode_memory_usage gauge
rnode_memory_usage 3456789012

# HELP rnode_peers_count Number of connected peers
# TYPE rnode_peers_count gauge
rnode_peers_count 8
```

#### GET /admin/health

Health check endpoint.

```json
// Response
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "network": "ok",
    "consensus": "ok",
    "storage": "ok"
  }
}
```

#### GET /admin/info

Detailed node information.

```json
// Response
{
  "version": "0.13.0",
  "commit": "abc123def456",
  "buildTime": "2024-01-15T10:30:00Z",
  "runtime": {
    "javaVersion": "11.0.12",
    "scalaVersion": "2.12.15",
    "heap": {
      "used": 2147483648,
      "max": 8589934592
    }
  },
  "network": {
    "nodeId": "1e780e5dfbe0a3d9470a2b414f502d59402e09c2",
    "host": "192.168.1.100",
    "port": 40400,
    "protocol": "rchain/1.0"
  }
}
```

### Management Endpoints

#### POST /admin/shutdown

Gracefully shutdown the node.

```json
// Request
{
  "timeout": 30  // Seconds to wait for graceful shutdown
}

// Response
{
  "message": "Node shutting down"
}
```

#### POST /admin/log-level

Change log level dynamically.

```json
// Request
{
  "logger": "coop.rchain.casper",
  "level": "DEBUG"  // TRACE, DEBUG, INFO, WARN, ERROR
}

// Response
{
  "success": true,
  "message": "Log level updated"
}
```

#### GET /admin/connections

Get peer connection details.

```json
// Response
{
  "connections": [
    {
      "nodeId": "abc123...",
      "address": "192.168.1.101:40400",
      "inbound": false,
      "connected": "2024-01-15T10:30:00Z",
      "lastSeen": "2024-01-15T12:00:00Z",
      "bytesReceived": 1234567,
      "bytesSent": 7654321
    }
  ]
}
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:40403/ws');

ws.onopen = () => {
  console.log('Connected to F1R3FLY WebSocket');
  
  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['blocks', 'deploys', 'bonds']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};
```

### Event Types

#### Block Events

```json
{
  "type": "block",
  "event": "created",
  "data": {
    "blockHash": "abc123...",
    "blockNumber": 12345,
    "timestamp": 1634567890000,
    "deployer": "04abc...",
    "deployCount": 5
  }
}
```

#### Deploy Events

```json
{
  "type": "deploy",
  "event": "processed",
  "data": {
    "deployId": "8f6a3b2c...",
    "blockHash": "abc123...",
    "status": "success",
    "cost": 1234
  }
}
```

#### Finalization Events

```json
{
  "type": "finalization",
  "event": "finalized",
  "data": {
    "blockHash": "abc123...",
    "blockNumber": 12340,
    "finalizedAt": 12345
  }
}
```

#### Bond Events

```json
{
  "type": "bonds",
  "event": "updated",
  "data": {
    "validator": "04abc...",
    "oldStake": 1000000,
    "newStake": 1500000,
    "action": "bond"  // or "unbond"
  }
}
```

### Subscriptions

```javascript
// Subscribe to specific events
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['blocks'],
  filters: {
    validator: '04abc...'  // Only blocks from specific validator
  }
}));

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channels: ['blocks']
}));
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DEPLOY",
    "message": "Deploy signature verification failed",
    "details": {
      "deployId": "8f6a3b2c...",
      "reason": "Invalid signature"
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REQUEST` | Malformed request | 400 |
| `INVALID_DEPLOY` | Deploy validation failed | 400 |
| `INSUFFICIENT_PHLO` | Not enough gas | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |
| `NODE_UNAVAILABLE` | Node not ready | 503 |

### Error Handling Best Practices

```python
# Python example
try:
    response = client.deploy(term=code)
except DeployError as e:
    if e.code == 'INSUFFICIENT_PHLO':
        # Retry with higher gas limit
        response = client.deploy(term=code, phlo_limit=e.suggested_limit)
    elif e.code == 'RATE_LIMITED':
        # Wait and retry
        time.sleep(e.retry_after)
        response = client.deploy(term=code)
    else:
        # Handle other errors
        log.error(f"Deploy failed: {e.message}")
```

## Authentication

### API Key Authentication

Include API key in headers:

```http
Authorization: Bearer YOUR_API_KEY
```

### Signature Authentication

Sign requests with private key:

```python
from rchain.crypto import PrivateKey
import time
import json

private_key = PrivateKey.from_hex("...")

# Create request
request = {
    "term": "new x in { x!(42) }",
    "timestamp": int(time.time() * 1000),
    "deployer": private_key.get_public_key().to_hex()
}

# Sign request
message = json.dumps(request, sort_keys=True)
signature = private_key.sign(message.encode())

request["sig"] = signature.hex()
request["sigAlgorithm"] = "secp256k1"
```

### JWT Authentication

For session-based authentication:

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    username: 'validator1',
    password: 'secret'
  })
});

const { token } = await response.json();

// Use token in subsequent requests
fetch('/api/deploy', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  // ... rest of request
});
```

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|---------|
| `/api/deploy` | 100 | 1 minute |
| `/api/explore` | 50 | 1 minute |
| `/api/block/*` | 1000 | 1 minute |
| `/api/propose` | 1 | 10 seconds |
| WebSocket | 100 messages | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1634567950
```

### Handling Rate Limits

```javascript
async function deployWithRetry(term, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await deploy(term);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['retry-after'] || 60;
        await sleep(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

## SDKs and Client Libraries

### Official SDKs

#### Python
```bash
pip install pyrchain
```

```python
from rchain.client import RClient
from rchain.crypto import PrivateKey

client = RClient("localhost", 40402)
private_key = PrivateKey.generate()

# Deploy contract
deploy_id = client.deploy(
    term='new x in { x!(42) }',
    phlo_price=1,
    phlo_limit=100000,
    private_key=private_key
)

# Wait for result
result = client.get_deploy(deploy_id)
print(result)
```

#### JavaScript/TypeScript
```bash
npm install @rchain/rchain-js
```

```javascript
import { RClient, PrivateKey } from '@rchain/rchain-js';

const client = new RClient('localhost', 40402);
const privateKey = PrivateKey.generate();

// Deploy contract
const deployId = await client.deploy({
  term: 'new x in { x!(42) }',
  phloPrice: 1,
  phloLimit: 100000,
  privateKey
});

// Get result
const result = await client.getDeploy(deployId);
console.log(result);
```

#### Rust
```toml
[dependencies]
rchain-client = "0.1.0"
```

```rust
use rchain_client::{RClient, PrivateKey};

#[tokio::main]
async fn main() {
    let client = RClient::new("localhost", 40402);
    let private_key = PrivateKey::generate();
    
    // Deploy contract
    let deploy_id = client.deploy(
        "new x in { x!(42) }",
        1,
        100000,
        &private_key
    ).await.unwrap();
    
    // Get result
    let result = client.get_deploy(&deploy_id).await.unwrap();
    println!("{:?}", result);
}
```

### Community Libraries

- **Java**: `io.rchain:rchain-java-client`
- **Go**: `github.com/rchain/rchain-go`
- **C#**: `RChain.NET.Client`
- **Ruby**: `gem install rchain-client`

## API Versioning

The API follows semantic versioning:

```
/api/v1/deploy  # Current stable version
/api/v2/deploy  # Next version (beta)
```

Version negotiation via headers:

```http
Accept: application/vnd.rchain.v1+json
```

## Performance Tips

1. **Use gRPC for high-throughput applications**
2. **Batch deploys when possible**
3. **Cache block and deploy results**
4. **Use WebSocket for real-time updates instead of polling**
5. **Implement exponential backoff for retries**
6. **Use connection pooling for gRPC clients**

## Examples

### Complete Deploy Lifecycle

```python
import time
from rchain.client import RClient
from rchain.crypto import PrivateKey

# Initialize
client = RClient("localhost", 40402)
private_key = PrivateKey.from_hex("YOUR_PRIVATE_KEY")

# 1. Submit deploy
deploy_id = client.deploy(
    term='''
    new result, stdout(`rho:io:stdout`) in {
      result!(42) |
      for (x <- result) {
        stdout!(["Result:", x])
      }
    }
    ''',
    phlo_price=1,
    phlo_limit=100000,
    private_key=private_key
)

print(f"Deploy submitted: {deploy_id}")

# 2. Propose block (if validator)
try:
    block = client.propose()
    print(f"Block proposed: {block.block_hash}")
except Exception as e:
    print(f"Not a validator or proposal failed: {e}")

# 3. Wait for processing
time.sleep(5)

# 4. Get deploy result
result = client.get_deploy(deploy_id)
print(f"Deploy status: {result.status}")
print(f"Deploy cost: {result.cost}")

# 5. Find block containing deploy
block_info = client.find_deploy(deploy_id)
print(f"Deploy in block: {block_info.block_hash}")
```

### Monitoring Node Health

```python
import requests
import time

def monitor_node(host="localhost", port=40403):
    while True:
        try:
            # Check status
            response = requests.get(f"http://{host}:{port}/api/status")
            status = response.json()
            
            print(f"Node: {status['nodeId']}")
            print(f"Peers: {status['peers']}")
            print(f"Validating: {status['casperStatus']['validating']}")
            print(f"Last finalized: {status['casperStatus']['lastFinalizedHeight']}")
            
            # Check health
            health = requests.get(f"http://{host}:40405/admin/health").json()
            print(f"Health: {health['status']}")
            
            time.sleep(10)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(30)

monitor_node()
```

## Conclusion

The F1R3FLY API provides comprehensive access to blockchain functionality through multiple protocols. Choose the appropriate interface based on your use case:

- **gRPC**: High-performance applications
- **HTTP**: Web applications and simple integrations
- **WebSocket**: Real-time monitoring and updates
- **Admin**: Node management and monitoring

Always implement proper error handling, authentication, and rate limiting compliance for production applications.

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

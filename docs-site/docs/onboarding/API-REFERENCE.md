# API Reference

## 🌐 API Overview

ASI Chain provides multiple API interfaces for interacting with the blockchain and querying data:

1. **REST API** (Port 9090) - Indexer API for blockchain data
2. **GraphQL API** (Port 8080) - Hasura-powered GraphQL interface
3. **F1R3FLY HTTP API** (Ports 40403-40453) - Direct blockchain interaction
4. **gRPC API** (Ports 40402-40452) - Binary protocol for node communication
5. **WebSocket API** (Port 8080/ws) - Real-time subscriptions

## 📡 REST API (Indexer)

### Base URL
- **Local**: `http://localhost:9090`
- **Production**: `http://13.251.66.61:9090`

### Authentication
No authentication required for public endpoints.

### Endpoints

#### Health Check
```http
GET /health

Response 200 OK:
{
  "status": "healthy",
  "timestamp": "2025-09-10T12:00:00Z"
}
```

#### Indexer Status
```http
GET /status

Response 200 OK:
{
  "latest_indexed_block": 12345,
  "latest_chain_block": 12350,
  "blocks_behind": 5,
  "indexer_version": "2.1.1",
  "status": "syncing"
}
```

#### Get Blocks
```http
GET /blocks?limit=50&offset=0

Parameters:
- limit: number (max 100, default 50)
- offset: number (default 0)

Response 200 OK:
[
  {
    "block_number": 12345,
    "block_hash": "abc123...",
    "timestamp": "2025-09-10T12:00:00Z",
    "validator": "1111...",
    "deployments_count": 5
  }
]
```

#### Get Block Details
```http
GET /blocks/{block_number}

Response 200 OK:
{
  "block_number": 12345,
  "block_hash": "abc123...",
  "parent_hash": "def456...",
  "timestamp": "2025-09-10T12:00:00Z",
  "validator": "1111...",
  "deployments_count": 5,
  "deployments": [...],
  "validator_bonds": [...]
}

Response 404 Not Found:
{
  "error": "Block not found"
}
```

#### Get Transaction
```http
GET /transactions/{deploy_id}

Response 200 OK:
{
  "deploy_id": "xyz789...",
  "block_number": 12345,
  "deployer": "1111...",
  "term": "new x in { x!(42) }",
  "phlo_limit": 100000,
  "phlo_price": 1,
  "cost": 50000,
  "error_message": null,
  "timestamp": "2025-09-10T12:00:00Z"
}
```

#### Get Address Info
```http
GET /address/{address}

Response 200 OK:
{
  "address": "1111...",
  "balance": 1000000000000,
  "transaction_count": 42,
  "recent_transactions": [...]
}
```

#### Get Balance
```http
GET /balance/{address}

Response 200 OK:
{
  "address": "1111...",
  "balance": 1000000000000
}
```

#### Get Validators
```http
GET /validators

Response 200 OK:
[
  {
    "validator": "1111...",
    "stake": 1000000000000,
    "blocks_proposed": 500
  }
]
```

#### Get Network Statistics
```http
GET /stats

Response 200 OK:
{
  "total_blocks": 12345,
  "total_transactions": 98765,
  "validator_count": 4,
  "total_stake": 4000000000000
}
```

### Error Responses

```json
{
  "error": "Error message",
  "details": "Additional information"
}
```

Status Codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable

## 📊 GraphQL API (Hasura)

### Endpoint
- **Local**: `http://localhost:8080/v1/graphql`
- **Production**: `http://13.251.66.61:8080/v1/graphql`
- **WebSocket**: `ws://13.251.66.61:8080/v1/graphql`

### Authentication
```http
Headers:
x-hasura-admin-secret: myadminsecretkey
```

### Schema

#### Queries

```graphql
# Get blocks with pagination
query GetBlocks($limit: Int!, $offset: Int) {
  blocks(
    limit: $limit
    offset: $offset
    order_by: {block_number: desc}
  ) {
    block_number
    block_hash
    timestamp
    validator
    deployments_count
    deployments {
      deploy_id
      deployer
      cost
    }
  }
}

# Get block by number
query GetBlock($blockNumber: bigint!) {
  blocks_by_pk(block_number: $blockNumber) {
    block_number
    block_hash
    parent_hash
    timestamp
    validator
    deployments {
      deploy_id
      deployer
      term
      cost
      error_message
    }
    validator_bonds {
      validator
      stake
    }
  }
}

# Get deployments
query GetDeployments($limit: Int!, $where: deployments_bool_exp) {
  deployments(limit: $limit, where: $where) {
    deploy_id
    block_number
    deployer
    cost
    timestamp
  }
}

# Get validators
query GetValidators {
  validator_bonds(
    distinct_on: validator
    order_by: {validator: asc, block_number: desc}
  ) {
    validator
    stake
    block_number
  }
}

# Aggregate queries
query GetStatistics {
  blocks_aggregate {
    aggregate {
      count
      max {
        block_number
      }
    }
  }
  deployments_aggregate {
    aggregate {
      count
      sum {
        cost
      }
    }
  }
}
```

#### Subscriptions

```graphql
# Subscribe to new blocks
subscription NewBlocks {
  blocks(
    limit: 1
    order_by: {block_number: desc}
  ) {
    block_number
    block_hash
    timestamp
    validator
    deployments_count
  }
}

# Subscribe to new deployments
subscription NewDeployments {
  deployments(
    limit: 10
    order_by: {timestamp: desc}
  ) {
    deploy_id
    deployer
    cost
    timestamp
  }
}

# Subscribe to validator changes
subscription ValidatorUpdates {
  validator_bonds(
    order_by: {block_number: desc}
    limit: 10
  ) {
    validator
    stake
    block_number
  }
}
```

#### Mutations

```graphql
# Note: Mutations are restricted to admin role
mutation InsertEvent($object: events_insert_input!) {
  insert_events_one(object: $object) {
    id
    event_type
    data
    created_at
  }
}
```

### GraphQL Examples

#### JavaScript/TypeScript
```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://13.251.66.61:8080/v1/graphql',
  headers: {
    'x-hasura-admin-secret': 'myadminsecretkey'
  },
  cache: new InMemoryCache()
});

// Query example
const GET_BLOCKS = gql`
  query GetBlocks($limit: Int!) {
    blocks(limit: $limit, order_by: {block_number: desc}) {
      block_number
      timestamp
      validator
    }
  }
`;

const result = await client.query({
  query: GET_BLOCKS,
  variables: { limit: 10 }
});
```

#### Python
```python
import requests

url = "http://13.251.66.61:8080/v1/graphql"
headers = {
    "x-hasura-admin-secret": "myadminsecretkey",
    "Content-Type": "application/json"
}

query = """
query GetBlocks($limit: Int!) {
  blocks(limit: $limit, order_by: {block_number: desc}) {
    block_number
    timestamp
    validator
  }
}
"""

response = requests.post(url, json={
    "query": query,
    "variables": {"limit": 10}
}, headers=headers)

data = response.json()
```

#### cURL
```bash
curl -X POST http://13.251.66.61:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{
    "query": "{ blocks(limit: 5) { block_number timestamp } }"
  }'
```

## 🔗 F1R3FLY HTTP API

### Base URLs
- **Bootstrap**: `http://13.251.66.61:40403` (DO NOT use for transactions!)
- **Validator1**: `http://13.251.66.61:40413` (Use for transactions)
- **Validator2**: `http://13.251.66.61:40423` (Use for transactions)
- **Observer**: `http://13.251.66.61:40453` (Use for queries)

### Endpoints

#### Node Status
```http
GET /api/status

Response:
{
  "version": "0.13.0",
  "blockNumber": 12345,
  "blockHash": "abc123...",
  "peers": 5,
  "isReadOnly": false
}
```

#### Deploy Transaction
```http
POST /api/deploy

Request Body:
{
  "deployer": "1111...",
  "term": "new x in { x!(42) }",
  "phloLimit": 100000,
  "phloPrice": 1,
  "timestamp": 1234567890,
  "sig": "signature_hex",
  "sigAlgorithm": "secp256k1"
}

Response:
{
  "success": true,
  "deployId": "xyz789..."
}
```

#### Exploratory Deploy
```http
POST /api/explore-deploy

Request Body:
{
  "term": "new return in { @\"registry\"!(\"lookup\", \"rho:rchain:revVault\", *return) }"
}

Response:
{
  "result": "..." // Deployment result
}
```

#### Get Blocks
```http
GET /api/blocks?depth=10

Response:
[
  {
    "blockNumber": 12345,
    "blockHash": "abc123...",
    "timestamp": 1234567890,
    "validator": "1111...",
    "parentsHashList": ["def456..."]
  }
]
```

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://13.251.66.61:8080/v1/graphql', {
  headers: {
    'Sec-WebSocket-Protocol': 'graphql-ws',
    'x-hasura-admin-secret': 'myadminsecretkey'
  }
});

// Connection init
ws.send(JSON.stringify({
  type: 'connection_init',
  payload: {}
}));

// Subscribe
ws.send(JSON.stringify({
  id: '1',
  type: 'start',
  payload: {
    query: `
      subscription {
        blocks(limit: 1, order_by: {block_number: desc}) {
          block_number
          timestamp
        }
      }
    `
  }
}));

// Handle messages
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'data') {
    console.log('New block:', message.payload.data);
  }
});
```

## 🚰 Faucet API

### Base URL
- **Local**: `http://localhost:5050`
- **Production**: `http://13.251.66.61:5050`

### Endpoints

#### Request Tokens
```http
POST /api/faucet/request

Request Body:
{
  "address": "1111...",
  "amount": 100  // Optional, default 100
}

Response 200 OK:
{
  "success": true,
  "transactionId": "xyz789...",
  "amount": 100,
  "message": "Successfully sent 100 REV to 1111..."
}

Response 429 Too Many Requests:
{
  "error": "Please wait 24 hours between requests"
}
```

#### Check Status
```http
GET /api/faucet/status/{address}

Response:
{
  "address": "1111...",
  "requests": [
    {
      "amount": 100,
      "status": "completed",
      "transactionId": "xyz789...",
      "timestamp": "2025-09-10T12:00:00Z"
    }
  ]
}
```

#### Faucet Info
```http
GET /api/faucet/info

Response:
{
  "faucetAddress": "1111...",
  "balance": 1000000,
  "dailyLimit": 100,
  "requestCooldown": "24 hours",
  "statistics": {
    "todayRequests": 42,
    "todayDistributed": "4200 REV",
    "uniqueAddresses": 35
  }
}
```

## 🔒 Rate Limiting

### Global Limits
- 1000 requests per minute per IP
- 10000 requests per hour per IP

### Endpoint-Specific Limits
- `/api/deploy`: 10 per minute
- `/api/faucet/request`: 1 per 24 hours per address
- `/balance/*`: 100 per minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

## 🔑 Authentication & Security

### API Keys (Future)
```http
Authorization: Bearer YOUR_API_KEY
```

### CORS Configuration
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 📝 SDK Examples

### JavaScript/TypeScript SDK
```typescript
import { ASIChainClient } from '@asi-chain/sdk';

const client = new ASIChainClient({
  nodeUrl: 'http://13.251.66.61:40413',
  indexerUrl: 'http://13.251.66.61:9090',
  graphqlUrl: 'http://13.251.66.61:8080/v1/graphql'
});

// Get balance
const balance = await client.getBalance('1111...');

// Send transaction
const tx = await client.sendTransaction({
  to: '1111...',
  amount: 100,
  privateKey: 'your_private_key'
});

// Subscribe to blocks
client.subscribeToBlocks((block) => {
  console.log('New block:', block);
});
```

### Python SDK
```python
from asi_chain import Client

client = Client(
    node_url="http://13.251.66.61:40413",
    indexer_url="http://13.251.66.61:9090"
)

# Get balance
balance = client.get_balance("1111...")

# Send transaction
tx = client.send_transaction(
    to="1111...",
    amount=100,
    private_key="your_private_key"
)

# Query blocks
blocks = client.get_blocks(limit=10)
```

## 🧪 Testing APIs

### Postman Collection
Import the Postman collection from: `docs/api/ASI_Chain_API.postman_collection.json`

### Test Environment
```json
{
  "base_url": "http://13.251.66.61",
  "indexer_port": "9090",
  "graphql_port": "8080",
  "validator_port": "40413",
  "test_address": "1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g"
}
```

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**API Version**: 2.1.1
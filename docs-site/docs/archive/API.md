# ASI Chain API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Blockchain API](#blockchain-api)
- [Wallet API](#wallet-api)
- [Explorer API](#explorer-api)
- [Indexer API](#indexer-api)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)

## Overview

The ASI Chain API provides comprehensive access to blockchain data, wallet operations, and real-time updates. All API endpoints are RESTful and return JSON responses.

### Base URLs
- **Mainnet**: `https://api.asi-chain.com/v1`
- **Testnet**: `https://testnet-api.asi-chain.com/v1`
- **Local**: `http://localhost:8545`

### Request Headers
```http
Content-Type: application/json
X-API-Key: your-api-key
X-Request-ID: unique-request-id
```

## Authentication

### API Key Authentication
```bash
curl -H "X-API-Key: your-api-key" https://api.asi-chain.com/v1/blocks/latest
```

### JWT Authentication
```bash
curl -H "Authorization: Bearer your-jwt-token" https://api.asi-chain.com/v1/wallet/balance
```

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **WebSocket connections**: 10 concurrent connections per API key

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Blockchain API

### Get Latest Block
```http
GET /blocks/latest
```

**Response:**
```json
{
  "number": 12345678,
  "hash": "0xabc123...",
  "parentHash": "0xdef456...",
  "timestamp": 1640995200,
  "miner": "0x123...",
  "gasUsed": 8000000,
  "gasLimit": 10000000,
  "transactions": ["0xtx1...", "0xtx2..."],
  "transactionCount": 150
}
```

### Get Block by Number
```http
GET /blocks/{blockNumber}
```

**Parameters:**
- `blockNumber` (required): Block number or "latest", "earliest", "pending"

### Get Block by Hash
```http
GET /blocks/hash/{blockHash}
```

### Get Transaction
```http
GET /transactions/{txHash}
```

**Response:**
```json
{
  "hash": "0xtx123...",
  "from": "0xabc...",
  "to": "0xdef...",
  "value": "1000000000000000000",
  "gas": 21000,
  "gasPrice": "20000000000",
  "nonce": 42,
  "blockNumber": 12345678,
  "blockHash": "0xblock...",
  "status": "success",
  "confirmations": 12
}
```

### Submit Transaction
```http
POST /transactions
```

**Request Body:**
```json
{
  "from": "0xabc...",
  "to": "0xdef...",
  "value": "1000000000000000000",
  "gas": 21000,
  "gasPrice": "20000000000",
  "nonce": 42,
  "data": "0x...",
  "signature": "0xsig..."
}
```

### Get Transaction Receipt
```http
GET /transactions/{txHash}/receipt
```

### Estimate Gas
```http
POST /gas/estimate
```

**Request Body:**
```json
{
  "from": "0xabc...",
  "to": "0xdef...",
  "value": "1000000000000000000",
  "data": "0x..."
}
```

### Get Gas Price
```http
GET /gas/price
```

**Response:**
```json
{
  "low": "10000000000",
  "medium": "20000000000",
  "high": "30000000000",
  "instant": "40000000000"
}
```

## Wallet API

### Get Balance
```http
GET /wallet/{address}/balance
```

**Response:**
```json
{
  "address": "0xabc...",
  "balance": "1000000000000000000",
  "formatted": "1.0 ASI",
  "tokens": [
    {
      "contract": "0xtoken...",
      "symbol": "TKN",
      "balance": "500000000000000000",
      "decimals": 18
    }
  ]
}
```

### Get Transaction History
```http
GET /wallet/{address}/transactions
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `from` (optional): Start timestamp
- `to` (optional): End timestamp

### Sign Transaction
```http
POST /wallet/sign
```

**Request Body:**
```json
{
  "transaction": {
    "from": "0xabc...",
    "to": "0xdef...",
    "value": "1000000000000000000",
    "gas": 21000,
    "gasPrice": "20000000000",
    "nonce": 42
  },
  "privateKey": "0x..." // Only for testing, use hardware wallet in production
}
```

### Create Wallet
```http
POST /wallet/create
```

**Response:**
```json
{
  "address": "0xnew...",
  "mnemonic": "word1 word2 ... word12",
  "privateKey": "0xprivate...",
  "publicKey": "0xpublic..."
}
```

### Import Wallet
```http
POST /wallet/import
```

**Request Body:**
```json
{
  "mnemonic": "word1 word2 ... word12"
  // OR
  "privateKey": "0xprivate..."
}
```

## Explorer API

### Search
```http
GET /explorer/search?q={query}
```

**Response:**
```json
{
  "blocks": [...],
  "transactions": [...],
  "addresses": [...],
  "tokens": [...]
}
```

### Get Address Info
```http
GET /explorer/address/{address}
```

**Response:**
```json
{
  "address": "0xabc...",
  "balance": "1000000000000000000",
  "transactionCount": 150,
  "tokenTransfers": 45,
  "isContract": false,
  "firstSeen": 12340000,
  "lastSeen": 12345678
}
```

### Get Network Statistics
```http
GET /explorer/stats
```

**Response:**
```json
{
  "totalBlocks": 12345678,
  "totalTransactions": 98765432,
  "totalAddresses": 1234567,
  "tps": 125.5,
  "avgBlockTime": 2.1,
  "networkHashrate": "500 TH/s",
  "difficulty": "15000000000",
  "activeValidators": 100,
  "totalStaked": "1000000000000000000000000"
}
```

### Get Token Info
```http
GET /explorer/tokens/{contractAddress}
```

### Get Top Holders
```http
GET /explorer/tokens/{contractAddress}/holders
```

### Export Data
```http
GET /explorer/export/{type}
```

**Query Parameters:**
- `type`: "blocks", "transactions", "addresses"
- `format`: "csv", "json", "xlsx"
- `from`: Start block/timestamp
- `to`: End block/timestamp
- `limit`: Max records (default: 1000)

## Indexer API

### Query Indexed Data
```http
POST /indexer/query
```

**Request Body:**
```json
{
  "query": "SELECT * FROM transactions WHERE from_address = $1",
  "params": ["0xabc..."],
  "limit": 100
}
```

### Get Sync Status
```http
GET /indexer/sync
```

**Response:**
```json
{
  "syncing": false,
  "currentBlock": 12345678,
  "highestBlock": 12345678,
  "startingBlock": 0,
  "syncProgress": 100.0
}
```

### Subscribe to Events
```http
POST /indexer/subscribe
```

**Request Body:**
```json
{
  "event": "Transfer",
  "contract": "0xtoken...",
  "filters": {
    "from": "0xabc...",
    "to": null,
    "value": null
  }
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://ws.asi-chain.com/v1');

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'your-api-key'
  }));
});
```

### Subscribe to New Blocks
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'blocks'
}));

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'block') {
    console.log('New block:', message.data);
  }
});
```

### Subscribe to Pending Transactions
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'pendingTransactions',
  filters: {
    from: '0xabc...',
    minValue: '1000000000000000000'
  }
}));
```

### Subscribe to Address Activity
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'address',
  address: '0xabc...'
}));
```

### Unsubscribe
```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'blocks'
}));
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": 400,
    "message": "Invalid request",
    "details": "Block number must be a positive integer",
    "requestId": "req_123abc"
  }
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Code Reference
| Code | Description | Action |
|------|-------------|--------|
| 1001 | Invalid block number | Check block number format |
| 1002 | Block not found | Block doesn't exist yet |
| 1003 | Invalid transaction hash | Check hash format (0x + 64 hex chars) |
| 1004 | Transaction not found | Transaction doesn't exist |
| 1005 | Invalid address | Check address format (0x + 40 hex chars) |
| 1006 | Insufficient balance | Check account balance |
| 1007 | Invalid signature | Verify signature |
| 1008 | Nonce too low | Update nonce |
| 1009 | Gas price too low | Increase gas price |
| 1010 | Gas limit exceeded | Reduce gas limit |

## SDK Examples

### JavaScript/TypeScript
```javascript
import { ASIChainSDK } from '@asi-chain/sdk';

const sdk = new ASIChainSDK({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// Get latest block
const block = await sdk.getLatestBlock();

// Send transaction
const tx = await sdk.sendTransaction({
  to: '0xrecipient...',
  value: '1000000000000000000'
});
```

### Python
```python
from asi_chain import ASIChainClient

client = ASIChainClient(
    api_key='your-api-key',
    network='mainnet'
)

# Get balance
balance = client.get_balance('0xaddress...')

# Submit transaction
tx_hash = client.send_transaction(
    to='0xrecipient...',
    value=1000000000000000000
)
```

### Go
```go
import "github.com/asi-chain/go-sdk"

client := asichain.NewClient("your-api-key", "mainnet")

// Get block
block, err := client.GetBlock(12345678)

// Send transaction
tx := &asichain.Transaction{
    To:    "0xrecipient...",
    Value: big.NewInt(1000000000000000000),
}
hash, err := client.SendTransaction(tx)
```

## Webhooks

### Configure Webhook
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["block.created", "transaction.confirmed"],
  "filters": {
    "address": "0xabc..."
  },
  "secret": "webhook-secret"
}
```

### Webhook Payload
```json
{
  "event": "transaction.confirmed",
  "timestamp": 1640995200,
  "data": {
    "hash": "0xtx...",
    "confirmations": 12
  },
  "signature": "hmac-sha256-signature"
}
```

## Rate Limits and Quotas

| Plan | Requests/min | WebSocket Connections | Data Export/day |
|------|-------------|----------------------|-----------------|
| Free | 100 | 1 | 1000 records |
| Basic | 1000 | 5 | 10000 records |
| Pro | 10000 | 20 | 100000 records |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Support

- **Documentation**: https://docs.asi-chain.com
- **Status Page**: https://status.asi-chain.com
- **Support Email**: support@asi-chain.com
- **Discord**: https://discord.gg/asi-chain
- **GitHub**: https://github.com/asi-alliance/asi-chain
# Explorer WebSocket API

## Overview

The ASI Chain Explorer provides real-time blockchain data through WebSocket connections, enabling live updates for blocks, transactions, and network statistics without polling.

## Connection

### WebSocket Endpoint

```javascript
// Production
wss://explorer.asi-chain.io/ws

// Staging
wss://staging.explorer.asi-chain.io/ws

// Local Development
ws://localhost:3001/ws
```

### Connection Example

```javascript
import WebSocket from 'ws';

const ws = new WebSocket('wss://explorer.asi-chain.io/ws');

ws.on('open', () => {
  console.log('Connected to ASI Explorer WebSocket');
  
  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['blocks', 'transactions', 'validators']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  handleRealtimeUpdate(message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket');
  // Implement reconnection logic
});
```

## Subscription Channels

### Available Channels

| Channel | Description | Update Frequency |
|---------|-------------|------------------|
| `blocks` | New blocks as they're produced | ~30 seconds |
| `transactions` | New transactions in mempool and confirmed | Real-time |
| `validators` | Validator status changes | On change |
| `statistics` | Network statistics updates | Every 10 seconds |
| `events` | Smart contract events | Real-time |
| `gas` | Gas price updates | Every block |

### Subscribe to Channels

```javascript
// Subscribe to multiple channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['blocks', 'transactions']
}));

// Subscribe with filters
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'transactions',
  filters: {
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
    minValue: '1000000000000000000' // 1 ASI
  }
}));
```

### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channels: ['transactions']
}));
```

## Message Types

### Block Updates

```javascript
{
  "type": "block",
  "data": {
    "number": 1234567,
    "hash": "0xabc...",
    "parentHash": "0xdef...",
    "timestamp": 1692345678,
    "validator": "0x123...",
    "transactionCount": 42,
    "gasUsed": "8000000",
    "gasLimit": "10000000",
    "size": 12345
  }
}
```

### Transaction Updates

```javascript
{
  "type": "transaction",
  "data": {
    "hash": "0xtx123...",
    "from": "0xfrom...",
    "to": "0xto...",
    "value": "1000000000000000000",
    "gasPrice": "20000000000",
    "gasLimit": "21000",
    "nonce": 42,
    "status": "pending", // pending, confirmed, failed
    "blockNumber": null, // null if pending
    "confirmations": 0
  }
}
```

### Validator Updates

```javascript
{
  "type": "validator",
  "data": {
    "address": "0xval...",
    "status": "active", // active, inactive, jailed
    "stake": "1000000000000000000000",
    "delegators": 150,
    "commission": "5.00",
    "uptime": "99.98",
    "lastBlock": 1234567,
    "missedBlocks": 2
  }
}
```

### Network Statistics

```javascript
{
  "type": "statistics",
  "data": {
    "blockHeight": 1234567,
    "totalTransactions": 5000000,
    "tps": 142.5,
    "activeValidators": 21,
    "totalStake": "21000000000000000000000",
    "networkUtilization": 0.75,
    "averageBlockTime": 30.2,
    "gasPrice": {
      "fast": "30000000000",
      "standard": "20000000000",
      "slow": "10000000000"
    }
  }
}
```

## Advanced Features

### Filtered Subscriptions

Subscribe to specific addresses or transaction types:

```javascript
// Watch specific wallet
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'address',
  params: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
    events: ['in', 'out', 'token_transfers']
  }
}));

// Watch smart contract events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'contract_events',
  params: {
    contract: '0xcontract...',
    events: ['Transfer', 'Approval'],
    fromBlock: 'latest'
  }
}));
```

### Batch Requests

Request multiple data points efficiently:

```javascript
ws.send(JSON.stringify({
  type: 'batch',
  requests: [
    { method: 'getBlock', params: { number: 1234567 } },
    { method: 'getTransaction', params: { hash: '0x...' } },
    { method: 'getBalance', params: { address: '0x...' } }
  ]
}));
```

### Historical Data

Request historical data with pagination:

```javascript
ws.send(JSON.stringify({
  type: 'history',
  channel: 'blocks',
  params: {
    fromBlock: 1234500,
    toBlock: 1234567,
    limit: 100,
    offset: 0
  }
}));
```

## React Integration

### Custom Hook Example

```typescript
import { useEffect, useState, useCallback } from 'react';

function useExplorerWebSocket(channels: string[]) {
  const [data, setData] = useState<any>({});
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('wss://explorer.asi-chain.io/ws');
    
    websocket.onopen = () => {
      setConnected(true);
      websocket.send(JSON.stringify({
        type: 'subscribe',
        channels
      }));
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(prev => ({
        ...prev,
        [message.type]: message.data
      }));
    };
    
    websocket.onclose = () => {
      setConnected(false);
      // Implement reconnection
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [channels]);
  
  const send = useCallback((message: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws]);
  
  return { data, connected, send };
}

// Usage
function BlockExplorer() {
  const { data, connected } = useExplorerWebSocket(['blocks', 'transactions']);
  
  return (
    <div>
      {connected ? 'Connected' : 'Disconnected'}
      <div>Latest Block: {data.blocks?.number}</div>
      <div>Latest TX: {data.transactions?.hash}</div>
    </div>
  );
}
```

## Rate Limiting

WebSocket connections are rate-limited to ensure fair usage:

- **Connection limit**: 5 concurrent connections per IP
- **Message limit**: 100 messages per minute
- **Subscription limit**: 10 channels per connection
- **Batch request limit**: 50 requests per batch

## Error Handling

### Error Messages

```javascript
{
  "type": "error",
  "error": {
    "code": 4001,
    "message": "Invalid subscription channel",
    "details": "Channel 'invalid' does not exist"
  }
}
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 4000 | Invalid message format | Check JSON syntax |
| 4001 | Invalid channel | Use valid channel name |
| 4002 | Rate limit exceeded | Reduce request frequency |
| 4003 | Authentication required | Provide API key |
| 4004 | Subscription limit reached | Unsubscribe from other channels |
| 5000 | Internal server error | Retry with backoff |

## Connection Management

### Automatic Reconnection

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  
  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }
}
```

### Heartbeat/Ping-Pong

Keep connection alive with periodic pings:

```javascript
// Client sends ping every 30 seconds
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);

// Server responds with pong
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'pong') {
    console.log('Connection alive');
  }
});
```

## Performance Optimization

### Message Throttling

```javascript
class ThrottledWebSocket {
  constructor(ws) {
    this.ws = ws;
    this.messageQueue = [];
    this.throttleMs = 100; // Process every 100ms
    this.startThrottle();
  }
  
  startThrottle() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        const messages = this.messageQueue.splice(0, 10); // Process 10 at a time
        messages.forEach(msg => this.processMessage(msg));
      }
    }, this.throttleMs);
  }
  
  onMessage(callback) {
    this.ws.onmessage = (event) => {
      this.messageQueue.push(JSON.parse(event.data));
    };
    this.processMessage = callback;
  }
}
```

### Binary Protocol (Coming Soon)

For high-frequency data, binary protocol support is planned:

```javascript
// Future: Binary message format for efficiency
ws.binaryType = 'arraybuffer';

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    const view = new DataView(event.data);
    // Parse binary data
  }
};
```

## Security

### Authentication

For private data and higher rate limits:

```javascript
// Authenticate with API key
ws.send(JSON.stringify({
  type: 'auth',
  apiKey: 'your-api-key-here'
}));
```

### TLS/SSL

Always use `wss://` in production for encrypted connections.

## Support

- GitHub Issues: [ASI Chain Explorer](https://github.com/asi-alliance/asi-chain/issues)
- Discord: #explorer-api channel
- API Status: https://status.asi-chain.io

---

*Last updated: August 14, 2025*  
*WebSocket API v2.0 with real-time capabilities*
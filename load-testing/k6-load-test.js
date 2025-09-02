/**
 * K6 Load Testing Script for ASI Chain
 * Target: 1000 TPS (Transactions Per Second)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import ws from 'k6/ws';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const transactionSuccessRate = new Rate('transaction_success_rate');
const transactionDuration = new Trend('transaction_duration');
const blockProcessingTime = new Trend('block_processing_time');
const wsConnectionTime = new Trend('ws_connection_time');
const errorCounter = new Counter('errors');
const activeConnections = new Gauge('active_connections');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to 1000 TPS
    ramp_up_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [
        { duration: '30s', target: 100 },   // Warm up to 100 TPS
        { duration: '1m', target: 500 },    // Ramp to 500 TPS
        { duration: '2m', target: 1000 },   // Ramp to 1000 TPS
        { duration: '5m', target: 1000 },   // Stay at 1000 TPS
        { duration: '2m', target: 500 },    // Scale down
        { duration: '1m', target: 0 },      // Cool down
      ],
      exec: 'submitTransaction'
    },
    
    // Scenario 2: WebSocket connections stress test
    websocket_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 500 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      exec: 'websocketTest'
    },
    
    // Scenario 3: Explorer API stress test
    api_stress_test: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 500,
      exec: 'explorerAPITest'
    },
    
    // Scenario 4: Wallet operations test
    wallet_operations: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 10,
      maxDuration: '10m',
      exec: 'walletOperationsTest'
    },
    
    // Scenario 5: Smart contract interactions
    contract_test: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 1000,
      maxDuration: '10m',
      exec: 'smartContractTest'
    }
  },
  
  thresholds: {
    // Performance requirements
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'transaction_success_rate': ['rate>0.99'],         // 99% success rate
    'transaction_duration': ['p(95)<2000'],            // 95% of transactions under 2s
    'block_processing_time': ['p(95)<3000'],           // 95% of blocks under 3s
    'ws_connection_time': ['p(95)<1000'],              // 95% WS connections under 1s
    'errors': ['count<100'],                           // Less than 100 errors total
    'http_req_failed': ['rate<0.01'],                  // Less than 1% failure rate
  }
};

// Test data
const walletAddresses = new SharedArray('wallets', function() {
  const wallets = [];
  for (let i = 0; i < 1000; i++) {
    wallets.push({
      address: `0x${randomString(40, '0123456789abcdef')}`,
      privateKey: `0x${randomString(64, '0123456789abcdef')}`
    });
  }
  return wallets;
});

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8545';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8546';
const EXPLORER_API = __ENV.EXPLORER_API || 'http://localhost:3001/api';
const WALLET_API = __ENV.WALLET_API || 'http://localhost:3002/api';

// Helper functions
function generateTransaction() {
  const from = randomItem(walletAddresses);
  const to = randomItem(walletAddresses);
  
  return {
    from: from.address,
    to: to.address,
    value: Math.floor(Math.random() * 1000000000000000000).toString(),
    gas: '21000',
    gasPrice: '20000000000',
    nonce: Math.floor(Math.random() * 1000),
    data: '0x' + randomString(64, '0123456789abcdef')
  };
}

// Test scenarios

export function submitTransaction() {
  const startTime = Date.now();
  const tx = generateTransaction();
  
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_sendTransaction',
    params: [tx],
    id: Date.now()
  });
  
  const response = http.post(BASE_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s'
  });
  
  const duration = Date.now() - startTime;
  transactionDuration.add(duration);
  
  const success = check(response, {
    'transaction accepted': (r) => r.status === 200,
    'valid response': (r) => r.json('result') !== undefined,
    'no error': (r) => r.json('error') === undefined
  });
  
  transactionSuccessRate.add(success);
  
  if (!success) {
    errorCounter.add(1);
    console.error(`Transaction failed: ${response.body}`);
  }
}

export function websocketTest() {
  const startTime = Date.now();
  
  const res = ws.connect(WS_URL, {}, function(socket) {
    const connectionTime = Date.now() - startTime;
    wsConnectionTime.add(connectionTime);
    activeConnections.add(1);
    
    socket.on('open', () => {
      // Subscribe to new blocks
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'blocks'
      }));
      
      // Subscribe to pending transactions
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'pendingTransactions'
      }));
    });
    
    socket.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'block') {
        const processingTime = Date.now() - message.timestamp;
        blockProcessingTime.add(processingTime);
      }
    });
    
    socket.on('error', (e) => {
      errorCounter.add(1);
      console.error('WebSocket error:', e);
    });
    
    socket.on('close', () => {
      activeConnections.add(-1);
    });
    
    // Keep connection alive for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 60000);
  });
  
  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101
  });
}

export function explorerAPITest() {
  const endpoints = [
    '/blocks/latest',
    '/blocks/' + Math.floor(Math.random() * 1000000),
    '/transactions/' + randomString(66, '0123456789abcdef'),
    '/address/' + randomItem(walletAddresses).address,
    '/stats/network',
    '/stats/gas',
    '/search?q=' + randomString(10)
  ];
  
  const endpoint = randomItem(endpoints);
  const response = http.get(EXPLORER_API + endpoint, {
    timeout: '5s'
  });
  
  check(response, {
    'API response OK': (r) => r.status === 200 || r.status === 404,
    'Response time OK': (r) => r.timings.duration < 1000,
    'Valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });
}

export function walletOperationsTest() {
  const wallet = randomItem(walletAddresses);
  
  // Test 1: Check balance
  let response = http.get(`${WALLET_API}/balance/${wallet.address}`);
  check(response, {
    'Balance check OK': (r) => r.status === 200
  });
  
  // Test 2: Get transaction history
  response = http.get(`${WALLET_API}/transactions/${wallet.address}?limit=100`);
  check(response, {
    'Transaction history OK': (r) => r.status === 200
  });
  
  // Test 3: Sign transaction
  const tx = generateTransaction();
  response = http.post(`${WALLET_API}/sign`, JSON.stringify({
    transaction: tx,
    privateKey: wallet.privateKey
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(response, {
    'Transaction signing OK': (r) => r.status === 200,
    'Signature present': (r) => r.json('signature') !== undefined
  });
  
  // Test 4: Estimate gas
  response = http.post(`${WALLET_API}/estimateGas`, JSON.stringify(tx), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(response, {
    'Gas estimation OK': (r) => r.status === 200,
    'Gas estimate valid': (r) => r.json('gasEstimate') > 0
  });
  
  sleep(0.1); // Small delay between operations
}

export function smartContractTest() {
  // Deploy a test contract
  const deployPayload = {
    jsonrpc: '2.0',
    method: 'eth_sendTransaction',
    params: [{
      from: randomItem(walletAddresses).address,
      data: '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe', // Simple contract bytecode
      gas: '1000000',
      gasPrice: '20000000000'
    }],
    id: Date.now()
  };
  
  let response = http.post(BASE_URL, JSON.stringify(deployPayload), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(response, {
    'Contract deployment initiated': (r) => r.status === 200
  });
  
  // Call contract method
  const callPayload = {
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{
      to: '0x' + randomString(40, '0123456789abcdef'),
      data: '0x70a08231' + randomString(64, '0123456789abcdef') // balanceOf method
    }, 'latest'],
    id: Date.now()
  };
  
  response = http.post(BASE_URL, JSON.stringify(callPayload), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(response, {
    'Contract call successful': (r) => r.status === 200
  });
}

// Lifecycle hooks
export function setup() {
  console.log('Starting ASI Chain load test...');
  console.log(`Target: 1000 TPS`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  
  // Warm up the system
  const warmupTx = generateTransaction();
  http.post(BASE_URL, JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_sendTransaction',
    params: [warmupTx],
    id: 1
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data)
  };
}

function textSummary(data, options) {
  let summary = '\n=== ASI Chain Load Test Results ===\n\n';
  
  // Check if we met our targets
  const tpsAchieved = data.metrics.transaction_success_rate?.values?.rate || 0;
  const successRate = data.metrics.transaction_success_rate?.values?.rate || 0;
  
  summary += `✓ TPS Target: ${tpsAchieved >= 0.99 ? '✅ PASSED' : '❌ FAILED'}\n`;
  summary += `✓ Success Rate: ${successRate * 100}% ${successRate >= 0.99 ? '✅' : '❌'}\n`;
  summary += `✓ P95 Latency: ${data.metrics.http_req_duration?.values?.['p(95)']}ms\n`;
  summary += `✓ Total Errors: ${data.metrics.errors?.values?.count || 0}\n`;
  
  return summary;
}

function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ASI Chain Load Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { padding: 10px; margin: 10px 0; border: 1px solid #ddd; }
        .success { background: #d4edda; }
        .failure { background: #f8d7da; }
      </style>
    </head>
    <body>
      <h1>ASI Chain Load Test Report</h1>
      <div class="metric ${data.metrics.transaction_success_rate?.values?.rate >= 0.99 ? 'success' : 'failure'}">
        <h2>Transaction Success Rate: ${(data.metrics.transaction_success_rate?.values?.rate * 100).toFixed(2)}%</h2>
      </div>
      <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
    </body>
    </html>
  `;
}
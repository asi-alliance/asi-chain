// ASI Chain Comprehensive Load Testing Script
// Target: 1000 TPS with various scenarios

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import encoding from 'k6/encoding';
import { SharedArray } from 'k6/data';

// Configuration
const API_BASE = __ENV.API_URL || 'https://api.testnet.asi-chain.io';
const RPC_BASE = __ENV.RPC_URL || 'https://rpc.testnet.asi-chain.io';
const WS_BASE = __ENV.WS_URL || 'wss://ws.testnet.asi-chain.io';
const WALLET_BASE = __ENV.WALLET_URL || 'https://wallet.testnet.asi-chain.io';
const EXPLORER_BASE = __ENV.EXPLORER_URL || 'https://explorer.testnet.asi-chain.io';
const FAUCET_BASE = __ENV.FAUCET_URL || 'https://faucet.testnet.asi-chain.io';

// Custom metrics
const errorRate = new Rate('errors');
const transactionDuration = new Trend('transaction_duration');
const transactionSuccess = new Counter('transaction_success');
const transactionFailure = new Counter('transaction_failure');
const blockHeight = new Gauge('block_height');
const rpcLatency = new Trend('rpc_latency');
const apiLatency = new Trend('api_latency');
const walletLatency = new Trend('wallet_latency');

// Test accounts (pre-generated for testing)
const testAccounts = new SharedArray('accounts', function () {
  const accounts = [];
  for (let i = 0; i < 100; i++) {
    accounts.push({
      address: `0x${encoding.b64encode(String(i)).substring(0, 40)}`,
      privateKey: `0x${encoding.b64encode(String(i * 2)).substring(0, 64)}`,
    });
  }
  return accounts;
});

// Load test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up test
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 500 },  // Ramp up to 500 users
        { duration: '10m', target: 1000 }, // Ramp up to 1000 users
        { duration: '5m', target: 1000 },  // Stay at 1000 users
        { duration: '2m', target: 0 },     // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'gradual' },
    },
    
    // Scenario 2: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startTime: '25m',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },   // Baseline
        { duration: '30s', target: 2000 }, // Spike to 2000 users
        { duration: '1m', target: 2000 },  // Stay at peak
        { duration: '30s', target: 10 },   // Back to baseline
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'spike' },
    },
    
    // Scenario 3: Stress test
    stress_test: {
      executor: 'constant-arrival-rate',
      startTime: '30m',
      duration: '10m',
      rate: 1000,          // 1000 requests per second
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      tags: { scenario: 'stress' },
    },
    
    // Scenario 4: Soak test (endurance)
    soak_test: {
      executor: 'constant-vus',
      startTime: '45m',
      vus: 200,
      duration: '30m',
      tags: { scenario: 'soak' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],                  // Error rate under 5%
    errors: ['rate<0.1'],                            // Custom error rate under 10%
    transaction_duration: ['p(95)<2000'],            // 95% of transactions under 2s
    rpc_latency: ['p(95)<100'],                     // RPC latency under 100ms
    api_latency: ['p(95)<200'],                     // API latency under 200ms
  },
};

// Helper functions
function makeRPCCall(method, params = []) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: randomIntBetween(1, 100000),
  });
  
  const params_req = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const start = Date.now();
  const response = http.post(RPC_BASE, payload, params_req);
  const duration = Date.now() - start;
  
  rpcLatency.add(duration);
  
  check(response, {
    'RPC status is 200': (r) => r.status === 200,
    'RPC has result': (r) => JSON.parse(r.body).result !== undefined,
  }) || errorRate.add(1);
  
  return response;
}

function makeAPICall(endpoint, method = 'GET', payload = null) {
  const url = `${API_BASE}${endpoint}`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
    },
  };
  
  const start = Date.now();
  let response;
  
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(payload), params);
  }
  
  const duration = Date.now() - start;
  apiLatency.add(duration);
  
  check(response, {
    'API status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  return response;
}

// Test scenarios
export default function () {
  const account = testAccounts[randomIntBetween(0, testAccounts.length - 1)];
  
  group('RPC Operations', function () {
    // Test eth_blockNumber
    group('Get Block Number', function () {
      const response = makeRPCCall('eth_blockNumber');
      if (response.status === 200) {
        const result = JSON.parse(response.body).result;
        blockHeight.add(parseInt(result, 16));
      }
    });
    
    // Test eth_getBalance
    group('Get Balance', function () {
      makeRPCCall('eth_getBalance', [account.address, 'latest']);
    });
    
    // Test eth_getTransactionCount
    group('Get Transaction Count', function () {
      makeRPCCall('eth_getTransactionCount', [account.address, 'latest']);
    });
    
    // Test eth_gasPrice
    group('Get Gas Price', function () {
      makeRPCCall('eth_gasPrice');
    });
    
    // Test eth_estimateGas
    group('Estimate Gas', function () {
      const tx = {
        from: account.address,
        to: testAccounts[randomIntBetween(0, 99)].address,
        value: '0x' + randomIntBetween(1, 1000000).toString(16),
        data: '0x',
      };
      makeRPCCall('eth_estimateGas', [tx]);
    });
  });
  
  group('API Operations', function () {
    // Test health endpoint
    group('Health Check', function () {
      makeAPICall('/health');
    });
    
    // Test block endpoint
    group('Get Latest Block', function () {
      makeAPICall('/blocks/latest');
    });
    
    // Test transactions endpoint
    group('Get Transactions', function () {
      makeAPICall('/transactions?limit=10');
    });
    
    // Test validators endpoint
    group('Get Validators', function () {
      makeAPICall('/validators');
    });
    
    // Test stats endpoint
    group('Get Network Stats', function () {
      makeAPICall('/stats');
    });
  });
  
  group('Wallet Operations', function () {
    const walletParams = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Test wallet creation
    group('Create Wallet', function () {
      const start = Date.now();
      const response = http.post(
        `${WALLET_BASE}/api/wallets/create`,
        JSON.stringify({
          password: 'test-password-' + randomIntBetween(1, 10000),
        }),
        walletParams
      );
      const duration = Date.now() - start;
      walletLatency.add(duration);
      
      check(response, {
        'Wallet creation successful': (r) => r.status === 200 || r.status === 201,
      });
    });
    
    // Test wallet balance
    group('Check Wallet Balance', function () {
      const start = Date.now();
      const response = http.get(
        `${WALLET_BASE}/api/wallets/${account.address}/balance`,
        walletParams
      );
      const duration = Date.now() - start;
      walletLatency.add(duration);
      
      check(response, {
        'Balance check successful': (r) => r.status === 200,
      });
    });
  });
  
  group('Explorer Operations', function () {
    // Test explorer home
    group('Explorer Home', function () {
      const response = http.get(EXPLORER_BASE);
      check(response, {
        'Explorer loads': (r) => r.status === 200,
      });
    });
    
    // Test explorer search
    group('Explorer Search', function () {
      const response = http.get(
        `${EXPLORER_BASE}/api/search?q=${account.address}`
      );
      check(response, {
        'Search works': (r) => r.status === 200,
      });
    });
  });
  
  group('Faucet Operations', function () {
    // Test faucet request
    group('Request Tokens', function () {
      const response = http.post(
        `${FAUCET_BASE}/api/request`,
        JSON.stringify({
          address: account.address,
          recaptcha: 'test-recaptcha-token',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      check(response, {
        'Faucet request processed': (r) => 
          r.status === 200 || r.status === 429, // 429 = rate limited
      });
    });
  });
  
  group('Transaction Simulation', function () {
    const start = Date.now();
    
    // Simulate creating and sending a transaction
    const nonce = makeRPCCall('eth_getTransactionCount', [account.address, 'latest']);
    const gasPrice = makeRPCCall('eth_gasPrice');
    
    if (nonce.status === 200 && gasPrice.status === 200) {
      const tx = {
        from: account.address,
        to: testAccounts[randomIntBetween(0, 99)].address,
        value: '0x' + randomIntBetween(1, 1000000).toString(16),
        gas: '0x5208', // 21000 in hex
        gasPrice: JSON.parse(gasPrice.body).result,
        nonce: JSON.parse(nonce.body).result,
        data: '0x',
      };
      
      const sendResult = makeRPCCall('eth_sendTransaction', [tx]);
      
      if (sendResult.status === 200) {
        transactionSuccess.add(1);
      } else {
        transactionFailure.add(1);
      }
    }
    
    const duration = Date.now() - start;
    transactionDuration.add(duration);
  });
  
  // Random sleep between 0.5 and 2 seconds
  sleep(randomIntBetween(0.5, 2));
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log('='.repeat(60));
  console.log('Test Summary:');
  console.log(`- Scenarios executed: ${Object.keys(options.scenarios).length}`);
  console.log(`- Total duration: ${options.scenarios.gradual_load.stages.reduce((acc, stage) => acc + parseInt(stage.duration), 0)} minutes`);
  console.log(`- Peak VUs: 2000`);
  console.log(`- Target TPS: 1000`);
  console.log('='.repeat(60));
}
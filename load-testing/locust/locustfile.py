"""
Locust Load Testing for ASI Chain
Target: 1000 TPS with multiple user scenarios
"""

from locust import HttpUser, TaskSet, task, between, events
from locust.contrib.fasthttp import FastHttpUser
import json
import random
import time
import string
import websocket
import threading
from datetime import datetime

# Custom metrics
transaction_success_count = 0
transaction_failure_count = 0
websocket_connections = 0
block_processing_times = []

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize test metrics"""
    global transaction_success_count, transaction_failure_count
    transaction_success_count = 0
    transaction_failure_count = 0
    print("ASI Chain Load Test Starting - Target: 1000 TPS")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Report final metrics"""
    total_transactions = transaction_success_count + transaction_failure_count
    if total_transactions > 0:
        success_rate = (transaction_success_count / total_transactions) * 100
        print(f"\n=== Final Results ===")
        print(f"Total Transactions: {total_transactions}")
        print(f"Success Rate: {success_rate:.2f}%")
        print(f"Average TPS: {total_transactions / environment.runner.stats.total.avg_response_time * 1000:.2f}")

class BlockchainUser(FastHttpUser):
    """Simulates blockchain transaction submissions"""
    wait_time = between(0.001, 0.01)  # Very short wait for high TPS
    
    def on_start(self):
        """Initialize user with wallet address"""
        self.wallet_address = self.generate_address()
        self.nonce = 0
        self.ws_client = None
    
    def on_stop(self):
        """Clean up WebSocket connections"""
        if self.ws_client:
            self.ws_client.close()
    
    @task(40)
    def send_transaction(self):
        """Submit a transaction to the blockchain"""
        global transaction_success_count, transaction_failure_count
        
        tx = self.create_transaction()
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_sendTransaction",
            "params": [tx],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="send_transaction"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "result" in data:
                        transaction_success_count += 1
                        response.success()
                    else:
                        transaction_failure_count += 1
                        response.failure(f"Transaction failed: {data.get('error', 'Unknown error')}")
                except json.JSONDecodeError:
                    transaction_failure_count += 1
                    response.failure("Invalid JSON response")
            else:
                transaction_failure_count += 1
                response.failure(f"HTTP {response.status_code}")
    
    @task(20)
    def check_balance(self):
        """Check wallet balance"""
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": [self.wallet_address, "latest"],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="check_balance"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Balance check failed: {response.status_code}")
    
    @task(15)
    def get_transaction_receipt(self):
        """Get transaction receipt"""
        tx_hash = "0x" + self.random_hex(64)
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getTransactionReceipt",
            "params": [tx_hash],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="get_receipt"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Receipt fetch failed: {response.status_code}")
    
    @task(10)
    def get_block(self):
        """Get block information"""
        block_number = random.randint(1, 1000000)
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getBlockByNumber",
            "params": [hex(block_number), False],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="get_block"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Block fetch failed: {response.status_code}")
    
    @task(10)
    def estimate_gas(self):
        """Estimate gas for transaction"""
        tx = self.create_transaction()
        del tx['gas']  # Remove gas for estimation
        
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_estimateGas",
            "params": [tx],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="estimate_gas"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Gas estimation failed: {response.status_code}")
    
    @task(5)
    def call_contract(self):
        """Call smart contract method"""
        contract_address = self.generate_address()
        data = "0x70a08231" + self.random_hex(64)  # balanceOf method
        
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{
                "to": contract_address,
                "data": data
            }, "latest"],
            "id": int(time.time() * 1000)
        }
        
        with self.client.post(
            "/",
            json=payload,
            catch_response=True,
            name="call_contract"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Contract call failed: {response.status_code}")
    
    def create_transaction(self):
        """Create a random transaction"""
        self.nonce += 1
        return {
            "from": self.wallet_address,
            "to": self.generate_address(),
            "value": hex(random.randint(1, 1000000000000000000)),
            "gas": hex(21000 + random.randint(0, 100000)),
            "gasPrice": hex(20000000000 + random.randint(0, 10000000000)),
            "nonce": hex(self.nonce),
            "data": "0x" + self.random_hex(random.randint(0, 256))
        }
    
    def generate_address(self):
        """Generate random Ethereum address"""
        return "0x" + self.random_hex(40)
    
    def random_hex(self, length):
        """Generate random hex string"""
        return ''.join(random.choice('0123456789abcdef') for _ in range(length))


class ExplorerUser(FastHttpUser):
    """Simulates Explorer API usage"""
    wait_time = between(0.1, 1)
    host = "http://localhost:3001"
    
    @task(30)
    def search_block(self):
        """Search for block"""
        block_number = random.randint(1, 1000000)
        with self.client.get(
            f"/api/blocks/{block_number}",
            catch_response=True,
            name="search_block"
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Block search failed: {response.status_code}")
    
    @task(25)
    def search_transaction(self):
        """Search for transaction"""
        tx_hash = "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(64))
        with self.client.get(
            f"/api/transactions/{tx_hash}",
            catch_response=True,
            name="search_transaction"
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Transaction search failed: {response.status_code}")
    
    @task(20)
    def get_address_info(self):
        """Get address information"""
        address = "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(40))
        with self.client.get(
            f"/api/address/{address}",
            catch_response=True,
            name="get_address"
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Address lookup failed: {response.status_code}")
    
    @task(15)
    def get_network_stats(self):
        """Get network statistics"""
        with self.client.get(
            "/api/stats/network",
            catch_response=True,
            name="network_stats"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Stats fetch failed: {response.status_code}")
    
    @task(10)
    def export_data(self):
        """Export blockchain data"""
        export_type = random.choice(['csv', 'json', 'xlsx'])
        with self.client.get(
            f"/api/export/blocks?format={export_type}&limit=100",
            catch_response=True,
            name="export_data"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Export failed: {response.status_code}")


class WalletUser(FastHttpUser):
    """Simulates Wallet API usage"""
    wait_time = between(0.5, 2)
    host = "http://localhost:3002"
    
    def on_start(self):
        """Initialize wallet"""
        self.wallet_address = "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(40))
        self.private_key = "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(64))
    
    @task(30)
    def check_wallet_balance(self):
        """Check wallet balance"""
        with self.client.get(
            f"/api/balance/{self.wallet_address}",
            catch_response=True,
            name="wallet_balance"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Balance check failed: {response.status_code}")
    
    @task(25)
    def get_transaction_history(self):
        """Get transaction history"""
        with self.client.get(
            f"/api/transactions/{self.wallet_address}?limit=50",
            catch_response=True,
            name="tx_history"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"History fetch failed: {response.status_code}")
    
    @task(20)
    def sign_transaction(self):
        """Sign a transaction"""
        tx_data = {
            "from": self.wallet_address,
            "to": "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(40)),
            "value": str(random.randint(1, 1000000000000000000)),
            "gas": "21000"
        }
        
        with self.client.post(
            "/api/sign",
            json={"transaction": tx_data, "privateKey": self.private_key},
            catch_response=True,
            name="sign_transaction"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Signing failed: {response.status_code}")
    
    @task(15)
    def estimate_transaction_fee(self):
        """Estimate transaction fee"""
        tx_data = {
            "from": self.wallet_address,
            "to": "0x" + ''.join(random.choice('0123456789abcdef') for _ in range(40)),
            "value": str(random.randint(1, 1000000000000000000))
        }
        
        with self.client.post(
            "/api/estimateGas",
            json=tx_data,
            catch_response=True,
            name="estimate_fee"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Fee estimation failed: {response.status_code}")
    
    @task(10)
    def get_token_balances(self):
        """Get token balances"""
        with self.client.get(
            f"/api/tokens/{self.wallet_address}",
            catch_response=True,
            name="token_balances"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Token fetch failed: {response.status_code}")


class WebSocketUser(HttpUser):
    """Simulates WebSocket connections"""
    wait_time = between(1, 5)
    
    def on_start(self):
        """Connect to WebSocket"""
        global websocket_connections
        
        self.ws_url = "ws://localhost:8546"
        self.ws_thread = threading.Thread(target=self.websocket_client)
        self.ws_thread.daemon = True
        self.ws_thread.start()
        websocket_connections += 1
    
    def on_stop(self):
        """Disconnect WebSocket"""
        global websocket_connections
        websocket_connections -= 1
    
    def websocket_client(self):
        """WebSocket client thread"""
        try:
            ws = websocket.create_connection(self.ws_url)
            
            # Subscribe to events
            ws.send(json.dumps({
                "type": "subscribe",
                "channels": ["blocks", "pendingTransactions"]
            }))
            
            # Listen for messages
            while True:
                try:
                    message = ws.recv()
                    data = json.loads(message)
                    
                    if data.get("type") == "block":
                        global block_processing_times
                        processing_time = time.time() - data.get("timestamp", time.time())
                        block_processing_times.append(processing_time)
                        
                except Exception as e:
                    print(f"WebSocket error: {e}")
                    break
                    
        except Exception as e:
            print(f"WebSocket connection failed: {e}")
    
    @task
    def maintain_connection(self):
        """Maintain WebSocket connection"""
        # This task just keeps the user alive
        time.sleep(1)
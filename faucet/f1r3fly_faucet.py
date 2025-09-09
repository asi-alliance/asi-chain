#!/usr/bin/env python3
"""
F1R3FLY/RChain Faucet Service
Distributes REV tokens to users on the F1R3FLY network
Replaces the Ethereum-based faucet
"""

import os
import re
import time
import json
import logging
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import grpc
import requests
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
F1R3FLY_NODE_URL = os.getenv('F1R3FLY_NODE_URL', 'http://localhost:40403')
FAUCET_PRIVATE_KEY = os.getenv('FAUCET_PRIVATE_KEY', '')
FAUCET_REV_ADDRESS = os.getenv('FAUCET_REV_ADDRESS', '1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8')
DB_PATH = os.getenv('DB_PATH', './faucet.db')

# Faucet limits
FAUCET_AMOUNT = 1000  # REV tokens per request
DAILY_LIMIT = 5000  # Daily limit per address
REQUEST_COOLDOWN = 3600  # 1 hour between requests (seconds)
RATE_LIMIT = 10  # Max requests per minute per IP

class RevAddressValidator:
    """Validates F1R3FLY REV addresses"""
    
    @staticmethod
    def is_valid_rev_address(address: str) -> bool:
        """
        Validate REV address format
        REV addresses start with '1111' and are base58 encoded
        """
        if not address:
            return False
        
        # Basic format check
        if not address.startswith('1111'):
            return False
        
        # Length check (REV addresses are typically 54 characters)
        if len(address) < 50 or len(address) > 60:
            return False
        
        # Base58 character set check
        base58_chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
        return all(c in base58_chars for c in address)

class F1R3FlyClient:
    """Client for interacting with F1R3FLY node"""
    
    def __init__(self, node_url: str):
        self.node_url = node_url
        
    def get_balance(self, rev_address: str) -> Optional[int]:
        """Get balance for a REV address"""
        try:
            # F1R3FLY uses gRPC API, but also has HTTP endpoints
            response = requests.post(
                f"{self.node_url}/api/balance",
                json={"rev_address": rev_address},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('balance', 0)
        except Exception as e:
            logger.error(f"Failed to get balance: {e}")
        return None
    
    def transfer_rev(self, from_private_key: str, to_address: str, amount: int) -> Optional[str]:
        """
        Transfer REV tokens to an address
        Returns transaction hash if successful
        """
        try:
            # Create Rholang transfer contract
            rholang_code = f"""
            new rl(`rho:registry:lookup`), RevVaultCh in {{
              rl!(`rho:rchain:revVault`, *RevVaultCh) |
              for (@(_, RevVault) <- RevVaultCh) {{
                @RevVault!("transfer", "{to_address}", {amount}, *_)
              }}
            }}
            """
            
            # Deploy the contract
            response = requests.post(
                f"{self.node_url}/api/deploy",
                json={
                    "term": rholang_code,
                    "phlo_limit": 100000,
                    "phlo_price": 1,
                    "deployer": FAUCET_REV_ADDRESS,
                    "private_key": from_private_key
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('deploy_id')
                
        except Exception as e:
            logger.error(f"Failed to transfer REV: {e}")
        return None
    
    def wait_for_deploy(self, deploy_id: str, timeout: int = 60) -> bool:
        """Wait for a deploy to be included in a block"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(
                    f"{self.node_url}/api/deploy/{deploy_id}",
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('block_hash'):
                        return True
            except Exception as e:
                logger.error(f"Error checking deploy status: {e}")
            
            time.sleep(2)
        
        return False

class FaucetDatabase:
    """Database for tracking faucet requests"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rev_address TEXT NOT NULL,
                amount INTEGER NOT NULL,
                tx_hash TEXT,
                ip_address TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending'
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_address ON requests(rev_address)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_timestamp ON requests(timestamp)
        ''')
        
        conn.commit()
        conn.close()
    
    def can_request(self, rev_address: str, ip_address: str) -> tuple[bool, str]:
        """Check if address/IP can request tokens"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check cooldown period
        cursor.execute('''
            SELECT MAX(timestamp) FROM requests 
            WHERE rev_address = ? AND status = 'completed'
        ''', (rev_address,))
        
        last_request = cursor.fetchone()[0]
        if last_request:
            last_time = datetime.fromisoformat(last_request)
            if datetime.now() - last_time < timedelta(seconds=REQUEST_COOLDOWN):
                remaining = REQUEST_COOLDOWN - (datetime.now() - last_time).seconds
                conn.close()
                return False, f"Please wait {remaining} seconds before requesting again"
        
        # Check daily limit
        cursor.execute('''
            SELECT SUM(amount) FROM requests 
            WHERE rev_address = ? 
            AND timestamp > datetime('now', '-1 day')
            AND status = 'completed'
        ''', (rev_address,))
        
        daily_total = cursor.fetchone()[0] or 0
        if daily_total >= DAILY_LIMIT:
            conn.close()
            return False, f"Daily limit of {DAILY_LIMIT} REV reached"
        
        # Check IP rate limit
        cursor.execute('''
            SELECT COUNT(*) FROM requests 
            WHERE ip_address = ? 
            AND timestamp > datetime('now', '-1 minute')
        ''', (ip_address,))
        
        ip_requests = cursor.fetchone()[0]
        if ip_requests >= RATE_LIMIT:
            conn.close()
            return False, "Rate limit exceeded. Please try again later"
        
        conn.close()
        return True, "OK"
    
    def add_request(self, rev_address: str, amount: int, ip_address: str, tx_hash: str = None) -> int:
        """Add a new faucet request"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO requests (rev_address, amount, ip_address, tx_hash, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (rev_address, amount, ip_address, tx_hash, 'pending'))
        
        request_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return request_id
    
    def update_request_status(self, request_id: int, status: str, tx_hash: str = None):
        """Update request status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if tx_hash:
            cursor.execute('''
                UPDATE requests SET status = ?, tx_hash = ?
                WHERE id = ?
            ''', (status, tx_hash, request_id))
        else:
            cursor.execute('''
                UPDATE requests SET status = ?
                WHERE id = ?
            ''', (status, request_id))
        
        conn.commit()
        conn.close()

# Initialize services
db = FaucetDatabase(DB_PATH)
client = F1R3FlyClient(F1R3FLY_NODE_URL)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'network': 'F1R3FLY'})

@app.route('/faucet/request', methods=['POST'])
def request_tokens():
    """Request tokens from faucet"""
    try:
        data = request.json
        rev_address = data.get('address', '').strip()
        ip_address = request.remote_addr
        
        # Validate REV address
        if not RevAddressValidator.is_valid_rev_address(rev_address):
            return jsonify({'error': 'Invalid REV address format'}), 400
        
        # Check if request is allowed
        can_request, message = db.can_request(rev_address, ip_address)
        if not can_request:
            return jsonify({'error': message}), 429
        
        # Check current balance
        balance = client.get_balance(rev_address)
        if balance is None:
            return jsonify({'error': 'Failed to check balance'}), 500
        
        if balance > 10000:  # Don't fund addresses with > 10000 REV
            return jsonify({'error': 'Address has sufficient balance'}), 400
        
        # Create request record
        request_id = db.add_request(rev_address, FAUCET_AMOUNT, ip_address)
        
        # Transfer tokens
        tx_hash = client.transfer_rev(FAUCET_PRIVATE_KEY, rev_address, FAUCET_AMOUNT)
        
        if tx_hash:
            # Wait for confirmation (async in production)
            confirmed = client.wait_for_deploy(tx_hash)
            
            if confirmed:
                db.update_request_status(request_id, 'completed', tx_hash)
                return jsonify({
                    'success': True,
                    'amount': FAUCET_AMOUNT,
                    'tx_hash': tx_hash,
                    'message': f'Successfully sent {FAUCET_AMOUNT} REV to {rev_address}'
                })
            else:
                db.update_request_status(request_id, 'pending', tx_hash)
                return jsonify({
                    'success': True,
                    'amount': FAUCET_AMOUNT,
                    'tx_hash': tx_hash,
                    'message': 'Transaction submitted, waiting for confirmation'
                })
        else:
            db.update_request_status(request_id, 'failed')
            return jsonify({'error': 'Failed to send transaction'}), 500
            
    except Exception as e:
        logger.error(f"Error processing faucet request: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/faucet/status/<tx_hash>', methods=['GET'])
def check_status(tx_hash: str):
    """Check transaction status"""
    try:
        # Check if deploy is confirmed
        response = requests.get(
            f"{F1R3FLY_NODE_URL}/api/deploy/{tx_hash}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'tx_hash': tx_hash,
                'status': 'confirmed' if data.get('block_hash') else 'pending',
                'block_hash': data.get('block_hash')
            })
        else:
            return jsonify({'error': 'Transaction not found'}), 404
            
    except Exception as e:
        logger.error(f"Error checking status: {e}")
        return jsonify({'error': 'Failed to check status'}), 500

@app.route('/faucet/balance', methods=['GET'])
def faucet_balance():
    """Get faucet balance"""
    try:
        balance = client.get_balance(FAUCET_REV_ADDRESS)
        if balance is not None:
            return jsonify({
                'address': FAUCET_REV_ADDRESS,
                'balance': balance,
                'available_requests': balance // FAUCET_AMOUNT
            })
        else:
            return jsonify({'error': 'Failed to get balance'}), 500
    except Exception as e:
        logger.error(f"Error getting faucet balance: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    if not FAUCET_PRIVATE_KEY:
        logger.error("FAUCET_PRIVATE_KEY not set!")
        exit(1)
    
    logger.info(f"F1R3FLY Faucet starting...")
    logger.info(f"Node URL: {F1R3FLY_NODE_URL}")
    logger.info(f"Faucet address: {FAUCET_REV_ADDRESS}")
    logger.info(f"Amount per request: {FAUCET_AMOUNT} REV")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
#!/usr/bin/env python3
"""
ASI Chain Testnet Faucet Service
Lightweight implementation optimized for AWS Lightsail
"""

import os
import time
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
from web3 import Web3
from eth_account import Account

# Configuration
app = Flask(__name__)
CORS(app)

# Environment variables
FAUCET_PRIVATE_KEY = os.getenv('FAUCET_PRIVATE_KEY', '')
RPC_URL = os.getenv('RPC_URL', 'http://localhost:8545')
FAUCET_AMOUNT = float(os.getenv('FAUCET_AMOUNT', '10'))  # ASI tokens
CAPTCHA_SECRET = os.getenv('RECAPTCHA_SECRET_KEY', '')
DATABASE_PATH = os.getenv('DATABASE_PATH', './faucet.db')

# Web3 setup
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if FAUCET_PRIVATE_KEY:
    faucet_account = Account.from_key(FAUCET_PRIVATE_KEY)
    FAUCET_ADDRESS = faucet_account.address
else:
    FAUCET_ADDRESS = '0x0000000000000000000000000000000000000000'

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per hour"],
    storage_uri=f"sqlite:///{DATABASE_PATH}"
)

# Database setup
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            amount REAL NOT NULL,
            tx_hash TEXT,
            status TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_address ON requests(address);
    ''')
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_ip ON requests(ip_address);
    ''')
    conn.commit()
    conn.close()

# Initialize database
init_db()

def verify_captcha(token):
    """Verify reCAPTCHA token"""
    if not CAPTCHA_SECRET:
        return True  # Skip if not configured
    
    response = requests.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data={
            'secret': CAPTCHA_SECRET,
            'response': token
        }
    )
    result = response.json()
    return result.get('success', False)

def check_rate_limit(address, ip_address):
    """Check if address or IP has exceeded rate limit"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    # Check address limit (1 per hour)
    one_hour_ago = datetime.now() - timedelta(hours=1)
    c.execute('''
        SELECT COUNT(*) FROM requests 
        WHERE address = ? AND created_at > ? AND status = 'success'
    ''', (address.lower(), one_hour_ago))
    address_count = c.fetchone()[0]
    
    # Check IP limit (3 per hour)
    c.execute('''
        SELECT COUNT(*) FROM requests 
        WHERE ip_address = ? AND created_at > ? AND status = 'success'
    ''', (ip_address, one_hour_ago))
    ip_count = c.fetchone()[0]
    
    conn.close()
    
    if address_count >= 1:
        return False, "Address has already received tokens in the last hour"
    if ip_count >= 3:
        return False, "IP address has exceeded rate limit"
    
    return True, "OK"

def send_tokens(to_address, amount):
    """Send tokens to address"""
    try:
        # Build transaction
        nonce = w3.eth.get_transaction_count(FAUCET_ADDRESS)
        gas_price = w3.eth.gas_price
        
        tx = {
            'nonce': nonce,
            'to': to_address,
            'value': w3.to_wei(amount, 'ether'),
            'gas': 21000,
            'gasPrice': gas_price,
            'chainId': w3.eth.chain_id
        }
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, FAUCET_PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        return tx_hash.hex()
    except Exception as e:
        print(f"Error sending tokens: {e}")
        return None

@app.route('/')
def index():
    """Faucet frontend"""
    balance = 0
    if FAUCET_ADDRESS != '0x0000000000000000000000000000000000000000':
        try:
            balance = w3.eth.get_balance(FAUCET_ADDRESS)
            balance = w3.from_wei(balance, 'ether')
        except:
            pass
    
    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>ASI Chain Testnet Faucet</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
            }
            input, button {
                width: 100%;
                padding: 12px;
                margin: 10px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
            }
            button {
                background: #667eea;
                color: white;
                border: none;
                cursor: pointer;
            }
            button:hover {
                background: #5a67d8;
            }
            .info {
                background: #f7fafc;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .error {
                color: #e53e3e;
                margin: 10px 0;
            }
            .success {
                color: #38a169;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚰 ASI Chain Testnet Faucet</h1>
            
            <div class="info">
                <p><strong>Faucet Address:</strong> {{ faucet_address }}</p>
                <p><strong>Balance:</strong> {{ balance }} ASI</p>
                <p><strong>Amount per request:</strong> {{ amount }} ASI</p>
                <p><strong>Rate limit:</strong> 1 request per address per hour</p>
            </div>
            
            <form id="faucetForm">
                <input type="text" id="address" placeholder="Enter your wallet address (0x...)" required>
                <div id="recaptcha"></div>
                <button type="submit">Request Tokens</button>
            </form>
            
            <div id="message"></div>
        </div>
        
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <script>
            document.getElementById('faucetForm').onsubmit = async (e) => {
                e.preventDefault();
                const address = document.getElementById('address').value;
                const messageDiv = document.getElementById('message');
                
                try {
                    const response = await fetch('/request', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({address})
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        messageDiv.innerHTML = `<div class="success">✅ Success! TX: ${result.tx_hash}</div>`;
                    } else {
                        messageDiv.innerHTML = `<div class="error">❌ ${result.error}</div>`;
                    }
                } catch (error) {
                    messageDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
                }
            };
        </script>
    </body>
    </html>
    ''', faucet_address=FAUCET_ADDRESS, balance=balance, amount=FAUCET_AMOUNT)

@app.route('/request', methods=['POST'])
@limiter.limit("1 per minute")
def request_tokens():
    """Handle faucet request"""
    data = request.get_json()
    address = data.get('address', '')
    captcha_token = data.get('captcha_token', '')
    ip_address = get_remote_address()
    
    # Validate address
    if not Web3.is_address(address):
        return jsonify({'success': False, 'error': 'Invalid wallet address'}), 400
    
    # Verify captcha
    if not verify_captcha(captcha_token):
        return jsonify({'success': False, 'error': 'Captcha verification failed'}), 400
    
    # Check rate limit
    can_proceed, message = check_rate_limit(address, ip_address)
    if not can_proceed:
        return jsonify({'success': False, 'error': message}), 429
    
    # Record request
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO requests (address, ip_address, amount, status)
        VALUES (?, ?, ?, ?)
    ''', (address.lower(), ip_address, FAUCET_AMOUNT, 'pending'))
    request_id = c.lastrowid
    conn.commit()
    
    # Send tokens
    tx_hash = send_tokens(address, FAUCET_AMOUNT)
    
    if tx_hash:
        # Update request status
        c.execute('''
            UPDATE requests SET tx_hash = ?, status = ?
            WHERE id = ?
        ''', (tx_hash, 'success', request_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'tx_hash': tx_hash,
            'amount': FAUCET_AMOUNT,
            'message': f'Successfully sent {FAUCET_AMOUNT} ASI to {address}'
        })
    else:
        # Update request status
        c.execute('''
            UPDATE requests SET status = ?
            WHERE id = ?
        ''', ('failed', request_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': False, 'error': 'Failed to send transaction'}), 500

@app.route('/stats')
def stats():
    """Get faucet statistics"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    # Get stats
    c.execute('SELECT COUNT(*) FROM requests WHERE status = "success"')
    total_requests = c.fetchone()[0]
    
    c.execute('SELECT SUM(amount) FROM requests WHERE status = "success"')
    total_distributed = c.fetchone()[0] or 0
    
    c.execute('SELECT COUNT(DISTINCT address) FROM requests WHERE status = "success"')
    unique_addresses = c.fetchone()[0]
    
    conn.close()
    
    balance = 0
    if FAUCET_ADDRESS != '0x0000000000000000000000000000000000000000':
        try:
            balance = w3.eth.get_balance(FAUCET_ADDRESS)
            balance = float(w3.from_wei(balance, 'ether'))
        except:
            pass
    
    return jsonify({
        'faucet_address': FAUCET_ADDRESS,
        'balance': balance,
        'total_requests': total_requests,
        'total_distributed': total_distributed,
        'unique_addresses': unique_addresses
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'ASI Chain Faucet'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
#!/usr/bin/env python3
"""
ASI Chain RChain-Compatible Testnet Faucet Service
Distributes REV tokens on the F1R3FLY blockchain
"""

import os
import time
import json
import sqlite3
import hashlib
import secrets
import requests
import subprocess
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
import base58
import binascii

# Configuration
app = Flask(__name__)
CORS(app)

# Environment variables
FAUCET_PRIVATE_KEY = os.getenv('FAUCET_PRIVATE_KEY', '')  # Hex private key
VALIDATOR_URL = os.getenv('VALIDATOR_URL', 'http://18.142.221.192:40413')  # Use validator1 for transactions
READONLY_URL = os.getenv('READONLY_URL', 'http://18.142.221.192:40453')  # Use readonly for queries
GRAPHQL_URL = os.getenv('GRAPHQL_URL', 'http://18.142.221.192:8080/v1/graphql')
FAUCET_AMOUNT = int(os.getenv('FAUCET_AMOUNT', '100'))  # REV tokens (100 REV = 100 * 10^8 dust)
CAPTCHA_SECRET = os.getenv('RECAPTCHA_SECRET_KEY', '')
DATABASE_PATH = os.getenv('DATABASE_PATH', './faucet.db')
PHLO_LIMIT = int(os.getenv('PHLO_LIMIT', '500000'))
PHLO_PRICE = int(os.getenv('PHLO_PRICE', '1'))

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["20 per hour"]  # More restrictive for blockchain
)

# Database setup
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create tables for tracking distributions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS faucet_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            amount INTEGER NOT NULL,
            deploy_id TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_limits (
            address TEXT PRIMARY KEY,
            date DATE NOT NULL,
            total_amount INTEGER DEFAULT 0,
            request_count INTEGER DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# RChain/F1R3FLY specific functions
def derive_rev_address(eth_address):
    """Convert Ethereum address to REV address format (wallet method with double keccak)"""
    # Remove 0x prefix if present
    eth_address = eth_address.lower().replace('0x', '')
    
    # Hash the ETH address with keccak256 (wallet's method)
    from Crypto.Hash import keccak
    k = keccak.new(digest_bits=256)
    k.update(bytes.fromhex(eth_address))
    eth_hash = k.hexdigest()
    
    # Add REV prefix
    prefix = "000000"  # coinId
    version = "00"     # version
    
    # Construct payload with the hash
    payload = prefix + version + eth_hash
    
    # Calculate checksum (first 4 bytes of blake2b hash)
    import hashlib
    checksum = hashlib.blake2b(bytes.fromhex(payload), digest_size=32).hexdigest()[:8]
    
    # Combine and encode to base58
    full_address = payload + checksum
    return base58.b58encode(bytes.fromhex(full_address)).decode('ascii')

def get_public_key_from_private(private_key_hex):
    """Get public key from private key"""
    private_key_bytes = bytes.fromhex(private_key_hex)
    private_key = ec.derive_private_key(
        int.from_bytes(private_key_bytes, 'big'),
        ec.SECP256K1(),
        default_backend()
    )
    public_key = private_key.public_key()
    public_numbers = public_key.public_numbers()
    
    # Get uncompressed public key (04 + x + y coordinates)
    x_bytes = public_numbers.x.to_bytes(32, 'big')
    y_bytes = public_numbers.y.to_bytes(32, 'big')
    public_key_hex = '04' + x_bytes.hex() + y_bytes.hex()
    
    return public_key_hex

def derive_eth_address(public_key_hex):
    """Derive Ethereum address from public key"""
    # Remove the '04' prefix if present
    if public_key_hex.startswith('04'):
        public_key_hex = public_key_hex[2:]
    
    # Keccak256 hash of the public key
    from Crypto.Hash import keccak
    k = keccak.new(digest_bits=256)
    k.update(bytes.fromhex(public_key_hex))
    
    # Take the last 20 bytes
    return '0x' + k.hexdigest()[-40:]

def protobuf_serialize_deploy(deploy_data):
    """Serialize deploy data in protobuf format (like wallet)"""
    import struct
    
    buffer = bytearray()
    
    def write_varint(value):
        """Write a varint to the buffer"""
        while value > 0x7f:
            buffer.append((value & 0x7f) | 0x80)
            value >>= 7
        buffer.append(value)
    
    def write_varint64(value):
        """Write a 64-bit varint (for timestamps)"""
        while value > 0x7f:
            buffer.append((value & 0x7f) | 0x80)
            value = value // 128  # Use division for large numbers
        buffer.append(value)
    
    def write_string(field_number, value):
        """Write a string field"""
        if not value:
            return
        # Field key: (field_number << 3) | 2 (wire type 2 = length-delimited)
        key = (field_number << 3) | 2
        write_varint(key)
        
        # Write string bytes
        value_bytes = value.encode('utf-8')
        write_varint(len(value_bytes))
        buffer.extend(value_bytes)
    
    def write_int64(field_number, value):
        """Write an int64 field"""
        if value == 0:
            return
        # Field key: (field_number << 3) | 0 (wire type 0 = varint)
        key = (field_number << 3) | 0
        write_varint(key)
        write_varint64(value)
    
    # Write fields according to RChain protobuf schema
    # Field numbers from CasperMessage.proto:
    # term = 2, timestamp = 3, phloPrice = 7, phloLimit = 8,
    # validAfterBlockNumber = 10, shardId = 11
    write_string(2, deploy_data.get('term', ''))
    write_int64(3, deploy_data.get('timestamp', 0))
    write_int64(7, deploy_data.get('phloPrice', 1))
    write_int64(8, deploy_data.get('phloLimit', 500000))
    write_int64(10, deploy_data.get('validAfterBlockNumber', 0))
    write_string(11, deploy_data.get('shardId', ''))
    
    return bytes(buffer)

def sign_deploy(deploy_data, private_key_hex):
    """Sign a deploy with the private key using protobuf serialization"""
    import hashlib
    from ecdsa import SigningKey, SECP256k1
    from ecdsa.util import sigencode_der
    
    # Serialize deploy data using protobuf format
    deploy_serialized = protobuf_serialize_deploy(deploy_data)
    
    # Hash with Blake2b-256 (32 bytes)
    message_hash = hashlib.blake2b(deploy_serialized, digest_size=32).digest()
    
    # Create signing key from private key
    private_key_bytes = bytes.fromhex(private_key_hex)
    signing_key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
    
    # Sign the hash with deterministic k (canonical)
    signature_der = signing_key.sign_digest_deterministic(
        message_hash,
        hashfunc=hashlib.sha256,
        sigencode=sigencode_der
    )
    
    return signature_der.hex()

def create_transfer_deploy(from_rev_address, to_rev_address, amount, private_key):
    """Create a signed deploy for REV transfer"""
    
    # Get current block number for validAfterBlockNumber
    try:
        response = requests.get(f"{READONLY_URL}/api/last-finalized-block")
        block_number = response.json().get('blockNumber', 0)
    except:
        block_number = 0
    
    # Create the Rholang transfer code
    transfer_code = f'''
    new rl(`rho:registry:lookup`), RevVaultCh in {{
      rl!(`rho:rchain:revVault`, *RevVaultCh) |
      for (@(_, RevVault) <- RevVaultCh) {{
        new vaultCh, vaultTo, revVaultkeyCh,
        deployerId(`rho:rchain:deployerId`),
        deployId(`rho:rchain:deployId`) in {{
          @RevVault!("findOrCreate", "{from_rev_address}", *vaultCh) |
          @RevVault!("findOrCreate", "{to_rev_address}", *vaultTo) |
          @RevVault!("deployerAuthKey", *deployerId, *revVaultkeyCh) |
          for (@vault <- vaultCh; @vaultTo <- vaultTo; key <- revVaultkeyCh) {{
            match vault {{
              (true, vault) => {{
                new resultCh in {{
                  @vault!("transfer", "{to_rev_address}", {amount * 100000000}, *key, *resultCh) |
                  for (@result <- resultCh) {{
                    match result {{
                      (true , _  ) => deployId!((true, "Faucet transfer successful"))
                      (false, err) => deployId!((false, err))
                    }}
                  }}
                }}
              }}
              (false, err) => deployId!((false, err))
            }}
          }}
        }}
      }}
    }}
    '''
    
    # Prepare deploy data
    timestamp = int(time.time() * 1000)
    
    deploy = {
        'term': transfer_code,
        'phloLimit': PHLO_LIMIT,
        'phloPrice': PHLO_PRICE,
        'validAfterBlockNumber': block_number,
        'timestamp': timestamp,
        'deployer': get_public_key_from_private(private_key),
        'shardId': 'root'
    }
    
    # Sign the deploy
    deploy['sig'] = sign_deploy(deploy, private_key)
    deploy['sigAlgorithm'] = 'secp256k1'
    
    return deploy

def send_deploy_via_rust_client(from_rev_address, to_rev_address, amount, private_key):
    """Send deploy to ALL validators for better reliability"""
    try:
        # Path to rust client binary
        rust_client = "/home/ubuntu/code/GitLab/asi-chain/rust-client/target/release/node_cli"
        
        # Check if rust client exists
        if not os.path.exists(rust_client):
            # Fallback to HTTP API if rust client not available
            return send_deploy_via_http(from_rev_address, to_rev_address, amount, private_key)
        
        # Create transfer Rholang code
        transfer_code = f'''
        new rl(`rho:registry:lookup`), RevVaultCh in {{
          rl!(`rho:rchain:revVault`, *RevVaultCh) |
          for (@(_, RevVault) <- RevVaultCh) {{
            new vaultCh, vaultTo, revVaultkeyCh,
            deployerId(`rho:rchain:deployerId`),
            deployId(`rho:rchain:deployId`) in {{
              @RevVault!("findOrCreate", "{from_rev_address}", *vaultCh) |
              @RevVault!("findOrCreate", "{to_rev_address}", *vaultTo) |
              @RevVault!("deployerAuthKey", *deployerId, *revVaultkeyCh) |
              for (@vault <- vaultCh; @vaultTo <- vaultTo; key <- revVaultkeyCh) {{
                match vault {{
                  (true, vault) => {{
                    new resultCh in {{
                      @vault!("transfer", "{to_rev_address}", {amount * 100000000}, *key, *resultCh) |
                      for (@result <- resultCh) {{
                        match result {{
                          (true , _  ) => deployId!((true, "Faucet transfer successful"))
                          (false, err) => deployId!((false, err))
                        }}
                      }}
                    }}
                  }}
                  (false, err) => deployId!((false, err))
                }}
              }}
            }}
          }}
        }}
        '''
        
        # Write Rholang code to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.rho', delete=False) as f:
            f.write(transfer_code)
            rho_file = f.name
        
        try:
            # Send to ALL validators to ensure it gets picked up by autopropose
            validators = [
                {"port": "40411", "name": "validator1"},
                {"port": "40421", "name": "validator2"},
                {"port": "40431", "name": "validator3"},
                {"port": "40441", "name": "validator4"}
            ]
            
            deploy_id = None
            success_count = 0
            
            # Send deploy to each validator
            for validator in validators:
                cmd = [
                    rust_client,
                    "deploy",  # Just deploy, don't wait (faster)
                    "--file", rho_file,
                    "--private-key", private_key,
                    "--host", "18.142.221.192",
                    "--port", validator["port"]
                ]
                
                if PHLO_LIMIT > 500000:
                    cmd.append("--bigger-phlo")
                
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        success_count += 1
                        if not deploy_id and "Deploy ID:" in result.stdout:
                            # Extract deploy ID from first successful deployment
                            deploy_id = result.stdout.split("Deploy ID:")[-1].strip()
                        print(f"Deploy sent to {validator['name']}")
                    else:
                        print(f"Failed to send to {validator['name']}: {result.stderr}")
                except Exception as e:
                    print(f"Error sending to {validator['name']}: {e}")
            
            # If at least one validator accepted it, consider it successful
            if success_count > 0:
                if not deploy_id:
                    deploy_id = f"Deployed to {success_count} validators"
                
                # Force a propose to include the deploy immediately
                # Try to propose on the admin port of validator1
                propose_cmd = [
                    rust_client,
                    "propose",
                    "--host", "18.142.221.192",
                    "--port", "40412"  # Admin port of validator1
                ]
                
                try:
                    propose_result = subprocess.run(propose_cmd, capture_output=True, text=True, timeout=10)
                    if propose_result.returncode == 0:
                        print("Block proposed successfully")
                    else:
                        # It's okay if propose fails - autopropose will eventually pick it up
                        print(f"Propose attempt: {propose_result.stderr}")
                except:
                    pass  # Ignore propose errors
                
                return {'success': True, 'deployId': deploy_id}
            else:
                return {'success': False, 'error': 'Failed to send to any validator'}
            
            # Note: We're not waiting for finalization here to keep it fast
            # The autopropose will pick it up from whichever validator is next
                
        finally:
            # Clean up temp file
            if os.path.exists(rho_file):
                os.unlink(rho_file)
                
    except Exception as e:
        print(f"Error using rust client: {e}")
        # Fallback to HTTP API
        return send_deploy_via_http(from_rev_address, to_rev_address, amount, private_key)

def send_deploy_via_http(from_rev_address, to_rev_address, amount, private_key):
    """Fallback: Send deploy via HTTP API (original method)"""
    deploy = create_transfer_deploy(from_rev_address, to_rev_address, amount, private_key)
    return send_deploy(deploy)

def send_deploy(deploy):
    """Send the signed deploy to the validator node via HTTP"""
    try:
        # Format for Web API (like ASI wallet)
        web_deploy = {
            'data': {
                'term': deploy['term'],
                'timestamp': deploy['timestamp'],
                'phloPrice': deploy['phloPrice'],
                'phloLimit': deploy['phloLimit'],
                'validAfterBlockNumber': deploy['validAfterBlockNumber'],
                'shardId': deploy.get('shardId', 'root')
            },
            'sigAlgorithm': deploy['sigAlgorithm'],
            'signature': deploy['sig'],
            'deployer': deploy['deployer']
        }
        
        response = requests.post(
            f"{VALIDATOR_URL}/api/deploy",
            json=web_deploy,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.text.strip().strip('"')
            return {'success': True, 'deployId': result}
        else:
            return {'success': False, 'error': f"Deploy failed: {response.text}"}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_balance(rev_address):
    """Get REV balance using rust client for reliability"""
    try:
        # Use rust client for more reliable balance checking
        rust_client = "/home/ubuntu/code/GitLab/asi-chain/rust-client/target/release/node_cli"
        
        if os.path.exists(rust_client):
            cmd = [
                rust_client,
                "wallet-balance",
                "--address", rev_address,
                "--host", "18.142.221.192",
                "--port", "40452"  # Use read-only gRPC port
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "Balance for" in result.stdout:
                # Extract balance from output like "Balance for ADDRESS: 12345678 REV"
                import re
                match = re.search(r'Balance for [^:]+: (\d+) REV', result.stdout)
                if match:
                    return int(match.group(1))  # Return balance in dust
        
        # Fallback to explore-deploy method if rust client fails
        check_balance_rho = f'''
        new return, rl(`rho:registry:lookup`), RevVaultCh, vaultCh in {{
          rl!(`rho:rchain:revVault`, *RevVaultCh) |
          for (@(_, RevVault) <- RevVaultCh) {{
            @RevVault!("findOrCreate", "{rev_address}", *vaultCh) |
            for (@maybeVault <- vaultCh) {{
              match maybeVault {{
                (true, vault) => @vault!("balance", *return)
                (false, err)  => return!(0)
              }}
            }}
          }}
        }}
        '''
        
        response = requests.post(
            f"{READONLY_URL}/api/explore-deploy",
            data=check_balance_rho,
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result and 'expr' in result and len(result['expr']) > 0:
                first_expr = result['expr'][0]
                if 'ExprInt' in first_expr and 'data' in first_expr['ExprInt']:
                    return first_expr['ExprInt']['data']
        
        return 0
    except Exception as e:
        print(f"Error getting balance: {e}")
        return 0

def verify_captcha(captcha_response):
    """Verify Google reCAPTCHA response"""
    if not CAPTCHA_SECRET:
        return True  # Skip if no secret configured
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': CAPTCHA_SECRET,
                'response': captcha_response
            }
        )
        return response.json().get('success', False)
    except:
        return False

# HTML template for the faucet frontend
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>ASI Chain Testnet Faucet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(26, 26, 46, 0.9);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        h1 {
            color: #10b981;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #9ca3af;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #9ca3af;
            font-size: 14px;
        }
        input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            color: #e0e0e0;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        input:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        button {
            width: 100%;
            padding: 14px;
            background: #10b981;
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        button:hover {
            background: #0ea572;
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }
        button:disabled {
            background: #4b5563;
            cursor: not-allowed;
            transform: none;
        }
        .message {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
        }
        .success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            color: #10b981;
        }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #ef4444;
        }
        .info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid #3b82f6;
            color: #93bbfc;
            margin-bottom: 20px;
        }
        .stats {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .deploy-link {
            color: #10b981;
            text-decoration: none;
            word-break: break-all;
        }
        .deploy-link:hover {
            text-decoration: underline;
        }
    </style>
    {% if CAPTCHA_SECRET %}
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
    {% endif %}
</head>
<body>
    <div class="container">
        <h1>🚰 ASI Chain Faucet</h1>
        <div class="subtitle">Get test REV tokens for the F1R3FLY testnet</div>
        
        <div class="info">
            <strong>Network:</strong> ASI Testnet<br>
            <strong>Amount:</strong> {{ amount }} REV per request<br>
            <strong>Limit:</strong> 20 requests per hour
        </div>
        
        <form id="faucetForm">
            <div class="form-group">
                <label for="address">REV Address</label>
                <input 
                    type="text" 
                    id="address" 
                    name="address" 
                    placeholder="Enter your REV address (e.g., 11112...)" 
                    required
                    pattern="^1[0-9A-Za-z]{20,}$"
                >
            </div>
            
            {% if CAPTCHA_SECRET %}
            <div class="form-group">
                <div class="g-recaptcha" data-sitekey="{{ CAPTCHA_SITE_KEY }}"></div>
            </div>
            {% endif %}
            
            <button type="submit" id="submitBtn">Request {{ amount }} REV</button>
        </form>
        
        <div id="message"></div>
        
        <div class="stats">
            <h3 style="margin-bottom: 15px; color: #10b981;">Faucet Stats</h3>
            <div class="stat-item">
                <span>Status:</span>
                <span id="status">🟢 Online</span>
            </div>
            <div class="stat-item">
                <span>Balance:</span>
                <span id="balance">Loading...</span>
            </div>
            <div class="stat-item">
                <span>Total Distributed:</span>
                <span id="distributed">Loading...</span>
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('faucetForm').onsubmit = async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('submitBtn');
            const msgDiv = document.getElementById('message');
            const address = document.getElementById('address').value;
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            msgDiv.innerHTML = '';
            
            const formData = new FormData();
            formData.append('address', address);
            
            {% if CAPTCHA_SECRET %}
            const captcha = grecaptcha.getResponse();
            if (!captcha) {
                msgDiv.innerHTML = '<div class="message error">Please complete the CAPTCHA</div>';
                btn.disabled = false;
                btn.textContent = 'Request {{ amount }} REV';
                return;
            }
            formData.append('captcha', captcha);
            {% endif %}
            
            try {
                const response = await fetch('/request', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    msgDiv.innerHTML = `
                        <div class="message success">
                            ✅ Success! {{ amount }} REV sent to ${address}<br>
                            Deploy ID: <a href="http://18.142.221.192:3001/transaction/${data.deployId}" 
                                      target="_blank" class="deploy-link">${data.deployId.slice(0, 12)}...</a>
                        </div>
                    `;
                } else {
                    msgDiv.innerHTML = `<div class="message error">❌ ${data.error}</div>`;
                }
            } catch (error) {
                msgDiv.innerHTML = `<div class="message error">❌ Network error: ${error.message}</div>`;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Request {{ amount }} REV';
                {% if CAPTCHA_SECRET %}
                grecaptcha.reset();
                {% endif %}
            }
        };
        
        // Load stats
        async function loadStats() {
            try {
                const response = await fetch('/stats');
                const data = await response.json();
                document.getElementById('balance').textContent = `${data.balance.toFixed(2)} REV`;
                document.getElementById('distributed').textContent = `${data.distributed.toFixed(2)} REV`;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        loadStats();
        setInterval(loadStats, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
'''

# Flask routes
@app.route('/')
def index():
    """Serve the faucet frontend"""
    return render_template_string(
        HTML_TEMPLATE,
        amount=FAUCET_AMOUNT,
        CAPTCHA_SECRET=CAPTCHA_SECRET,
        CAPTCHA_SITE_KEY=os.getenv('RECAPTCHA_SITE_KEY', '')
    )

def validate_rev_address(address):
    """Validate REV address format"""
    try:
        if not address or not address.startswith('1111'):
            return False
        
        # Decode and check length
        decoded = base58.b58decode(address)
        # Valid REV addresses should decode to 43 bytes
        # But we're seeing 40 bytes in practice, so accept 40-43
        if len(decoded) < 40 or len(decoded) > 43:
            return False
        
        return True
    except:
        return False

@app.route('/request', methods=['POST'])
@limiter.limit("20 per hour")
def request_tokens():
    """Handle faucet requests"""
    try:
        address = request.form.get('address', '').strip()
        captcha = request.form.get('captcha', '')
        
        # Validate REV address format
        if not validate_rev_address(address):
            return jsonify({'success': False, 'error': 'Invalid REV address format. Address must start with "1111" and be properly formatted.'}), 400
        
        # Verify CAPTCHA if enabled
        if CAPTCHA_SECRET and not verify_captcha(captcha):
            return jsonify({'success': False, 'error': 'CAPTCHA verification failed'}), 400
        
        # Check daily limit
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        today = datetime.now().date()
        cursor.execute('''
            SELECT total_amount, request_count FROM daily_limits 
            WHERE address = ? AND date = ?
        ''', (address, today))
        
        limit_row = cursor.fetchone()
        if limit_row and limit_row[1] >= 5:  # Max 5 requests per day per address
            conn.close()
            return jsonify({'success': False, 'error': 'Daily limit reached (5 requests)'}), 429
        
        # Get faucet account details
        if not FAUCET_PRIVATE_KEY:
            conn.close()
            return jsonify({'success': False, 'error': 'Faucet not configured'}), 500
        
        # Derive faucet REV address
        faucet_public_key = get_public_key_from_private(FAUCET_PRIVATE_KEY)
        faucet_eth_address = derive_eth_address(faucet_public_key)
        faucet_rev_address = derive_rev_address(faucet_eth_address)
        
        # Use rust client for proper gRPC integration with autopropose
        result = send_deploy_via_rust_client(
            faucet_rev_address,
            address,
            FAUCET_AMOUNT,
            FAUCET_PRIVATE_KEY
        )
        
        if result['success']:
            # Record the request
            cursor.execute('''
                INSERT INTO faucet_requests (address, amount, deploy_id, ip_address, status)
                VALUES (?, ?, ?, ?, ?)
            ''', (address, FAUCET_AMOUNT, result['deployId'], request.remote_addr, 'success'))
            
            # Update daily limits
            if limit_row:
                cursor.execute('''
                    UPDATE daily_limits 
                    SET total_amount = total_amount + ?, request_count = request_count + 1
                    WHERE address = ? AND date = ?
                ''', (FAUCET_AMOUNT, address, today))
            else:
                cursor.execute('''
                    INSERT INTO daily_limits (address, date, total_amount, request_count)
                    VALUES (?, ?, ?, 1)
                ''', (address, today, FAUCET_AMOUNT))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'deployId': result['deployId'],
                'amount': FAUCET_AMOUNT,
                'message': f'Successfully sent {FAUCET_AMOUNT} REV to {address}'
            })
        else:
            conn.close()
            return jsonify({'success': False, 'error': result['error']}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/stats')
def stats():
    """Get faucet statistics"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Get total distributed
        cursor.execute('SELECT SUM(amount) FROM faucet_requests WHERE status = "success"')
        total = cursor.fetchone()[0] or 0
        
        conn.close()
        
        # Get actual faucet balance from blockchain
        try:
            if FAUCET_PRIVATE_KEY:
                # Derive faucet REV address
                faucet_public_key = get_public_key_from_private(FAUCET_PRIVATE_KEY)
                faucet_eth_address = derive_eth_address(faucet_public_key)
                faucet_rev_address = derive_rev_address(faucet_eth_address)
                
                # Get balance from blockchain
                balance_dust = get_balance(faucet_rev_address)
                # Convert from dust (1 REV = 10^8 dust) to REV
                balance = balance_dust / 100000000 if balance_dust else 0
            else:
                balance = 0
        except:
            # Fallback if balance check fails
            balance = 0
        
        return jsonify({
            'balance': balance,
            'distributed': total,
            'status': 'online'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
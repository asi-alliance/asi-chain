#!/usr/bin/env python3
"""
Flask web application for ASI Chain Block Explorer - Docker version
"""

import os
import sqlite3
import json
import logging
from datetime import datetime
from flask import Flask, render_template, jsonify, request, g
import requests

# Configuration from environment
DB_PATH = os.getenv('DB_PATH', '/app/data/asi-chain.db')
WEB_PORT = int(os.getenv('WEB_PORT', '5001'))
EXPLORE_DEPLOY_URL = os.getenv('EXPLORE_DEPLOY_URL', 'http://host.docker.internal:40453')

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/webapp.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_db():
    """Get database connection for the request."""
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(error):
    """Close database connection after request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- HTML Routes ---

@app.route('/')
def index():
    """Renders the main page."""
    return render_template('index.html')

@app.route('/block/<string:block_hash>')
def block_detail(block_hash):
    """Renders the detail page for a single block."""
    return render_template('block_detail.html', block_hash=block_hash)

# --- API Routes ---

@app.route('/api/status')
def api_status():
    """Health check endpoint for Docker."""
    try:
        db = get_db()
        c = db.cursor()
        c.execute('SELECT COUNT(*) as count FROM blocks')
        block_count = c.fetchone()['count']
        
        return jsonify({
            'status': 'healthy',
            'blocks': block_count,
            'database': DB_PATH,
            'explore_url': EXPLORE_DEPLOY_URL
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/api/transfers')
def get_transfers():
    """Get REV transfers with pagination."""
    db = get_db()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    
    # Parse REV transfers from deployments
    transfers_query = """
    SELECT 
        d.deploy_id,
        d.block_hash,
        b.block_number,
        d.deployer_pub_key as deployer,
        d.cost as phlo_cost,
        CASE WHEN d.errors IS NOT NULL AND d.errors != '' THEN 1 ELSE 0 END as errored,
        d.errors as error_message,
        d.created_at,
        d.term
    FROM deployments d
    JOIN blocks b ON d.block_hash = b.block_hash
    WHERE d.term LIKE '%RevVault%' 
      AND d.term LIKE '%transfer%'
      AND d.term LIKE '%match (%'
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
    """
    
    offset = (page - 1) * per_page
    cursor = db.execute(transfers_query, (per_page, offset))
    transfers_raw = cursor.fetchall()
    
    # Parse the transfers
    transfers = []
    for row in transfers_raw:
        # Replace both literal \n and actual newlines
        term = row['term'].replace('\\n', ' ').replace('\n', ' ')
        
        # Extract from/to/amount using regex with more flexible matching
        import re
        match_pattern = r'match\s*\(\s*\\?"([^"\\]+)\\?"\s*,\s*\\?"([^"\\]+)\\?"\s*,\s*(\d+)\s*\)'
        match = re.search(match_pattern, term)
        
        if match:
            transfers.append({
                'deploy_id': row['deploy_id'],
                'block_hash': row['block_hash'],
                'block_number': row['block_number'],
                'from_address': match.group(1),
                'to_address': match.group(2),
                'amount': int(match.group(3)),
                'rev_amount': int(match.group(3)) / 100_000_000,
                'deployer': row['deployer'],
                'phlo_cost': row['phlo_cost'],
                'errored': row['errored'],
                'error_message': row['error_message'],
                'created_at': row['created_at']
            })
    
    # Get total count
    count_query = """
    SELECT COUNT(*) as total
    FROM deployments d
    WHERE d.term LIKE '%RevVault%' 
      AND d.term LIKE '%transfer%'
      AND d.term LIKE '%match (%'
    """
    total = db.execute(count_query).fetchone()['total']
    
    return jsonify({
        'transfers': transfers,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    })

@app.route('/api/blocks')
def get_blocks():
    """Returns a paginated list of blocks with optional search."""
    db = get_db()
    cursor = db.cursor()
    
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    search = request.args.get('search', '', type=str)
    
    # Limit per_page to prevent abuse
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page
    
    # Build query based on search parameter
    if search:
        # Search by block number or hash
        if search.isdigit():
            # Search by block number
            count_query = "SELECT COUNT(*) FROM blocks WHERE block_number = ?"
            data_query = """
                SELECT block_number, block_hash, proposer_pub_key, created_at 
                FROM blocks 
                WHERE block_number = ?
                ORDER BY block_number DESC 
                LIMIT ? OFFSET ?
            """
            params = (int(search), per_page, offset)
            count_params = (int(search),)
        else:
            # Search by block hash (partial match)
            count_query = "SELECT COUNT(*) FROM blocks WHERE block_hash LIKE ?"
            data_query = """
                SELECT block_number, block_hash, proposer_pub_key, created_at 
                FROM blocks 
                WHERE block_hash LIKE ?
                ORDER BY block_number DESC 
                LIMIT ? OFFSET ?
            """
            search_pattern = f"%{search}%"
            params = (search_pattern, per_page, offset)
            count_params = (search_pattern,)
    else:
        # No search - return all blocks
        count_query = "SELECT COUNT(*) FROM blocks"
        data_query = """
            SELECT block_number, block_hash, proposer_pub_key, created_at 
            FROM blocks 
            ORDER BY block_number DESC 
            LIMIT ? OFFSET ?
        """
        params = (per_page, offset)
        count_params = ()
    
    # Get total count
    cursor.execute(count_query, count_params)
    total_count = cursor.fetchone()[0]
    
    # Get blocks
    cursor.execute(data_query, params)
    blocks = [dict(row) for row in cursor.fetchall()]
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    return jsonify({
        'blocks': blocks,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    })

@app.route('/api/block/<string:block_hash>')
def get_block_detail(block_hash):
    """Returns all details for a single block, including active validators."""
    db = get_db()
    cursor = db.cursor()

    # Get block details
    cursor.execute("SELECT * FROM blocks WHERE block_hash = ?", (block_hash,))
    block_row = cursor.fetchone()

    if not block_row:
        return jsonify({"error": "Block not found"}), 404
    
    block = dict(block_row)

    # Get active validators for this block
    cursor.execute(
        """
        SELECT v.public_key, v.name
        FROM block_validators bv
        JOIN validators v ON bv.validator_pub_key = v.public_key
        WHERE bv.block_hash = ?
        """,
        (block_hash,)
    )
    validators = [dict(row) for row in cursor.fetchall()]
    
    # Get deployments/transactions for this block
    cursor.execute(
        """
        SELECT deploy_id, 
               deployer_pub_key as deployer, 
               term, 
               created_at as timestamp, 
               1 as phlo_price, 
               0 as phlo_limit, 
               cost as phlo_cost, 
               CASE WHEN errors IS NOT NULL THEN 1 ELSE 0 END as errored, 
               errors as error_message, 
               created_at
        FROM deployments
        WHERE block_hash = ?
        ORDER BY created_at DESC
        """,
        (block_hash,)
    )
    deployments = [dict(row) for row in cursor.fetchall()]

    return jsonify({
        "block": block,
        "active_validators": validators,
        "deployments": deployments
    })

@app.route('/api/validators')
def get_validators():
    """Returns validator statistics based on block production."""
    db = get_db()
    cursor = db.cursor()
    
    # Known validator public keys (full keys)
    known_validators = {
        '04ffc016579a68050d655d55df4e09f04605164543e257c8e6df10361e6068a5336588e9b355ea859c5ab4285a5ef0efdf62bc28b80320ce99e26bb1607b3ad93d': 'Bootstrap',
        '0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c': 'Validator 1',
        '04837a4cff833e3157e3135d7b40b8e1f33c6e6b5a4342b9fc784230ca4c4f9d356f258debef56ad4984726d6ab3e7709e1632ef079b4bcd653db00b68b2df065f': 'Validator 2',
        '04fa70d7be5eb750e0915c0f6d19e7085d18bb1c22d030feb2a877ca2cd226d04438aa819359c56c720142fbc66e9da03a5ab960a3d8b75363a226b7c800f60420': 'Validator 3'
    }
    
    # Create a mapping of truncated keys to full keys
    key_mapping = {}
    for full_key in known_validators:
        # Map various truncated versions to full key
        key_mapping[full_key[:10]] = full_key  # First 10 chars
        key_mapping[full_key] = full_key  # Full key maps to itself
    
    # Get all proposer keys and their counts
    cursor.execute("""
        SELECT 
            proposer_pub_key,
            COUNT(*) as count
        FROM blocks
        GROUP BY proposer_pub_key
    """)
    
    raw_stats = cursor.fetchall()
    
    # Aggregate counts by normalizing keys
    validator_counts = {}
    for row in raw_stats:
        key = row['proposer_pub_key']
        count = row['count']
        
        # Normalize the key
        normalized_key = key_mapping.get(key, key)
        if len(key) == 10:  # If it's truncated, try to match
            for full_key in known_validators:
                if full_key.startswith(key):
                    normalized_key = full_key
                    break
        
        # Aggregate counts
        if normalized_key not in validator_counts:
            validator_counts[normalized_key] = 0
        validator_counts[normalized_key] += count
    
    # Get last active times for each validator
    validators = []
    for pub_key, block_count in validator_counts.items():
        # Get last active time
        cursor.execute("""
            SELECT MAX(created_at) as last_active
            FROM blocks
            WHERE proposer_pub_key = ? OR proposer_pub_key = ?
        """, (pub_key, pub_key[:10]))
        
        last_active = cursor.fetchone()['last_active']
        
        validators.append({
            'public_key': pub_key,
            'name': known_validators.get(pub_key, 'Unknown'),
            'block_count': block_count,
            'last_active': last_active
        })
    
    # Sort by block count
    validators.sort(key=lambda x: x['block_count'], reverse=True)
    
    return jsonify({
        "active_validators": validators,
        "total_validators": len(validators)
    })

@app.route('/api/deployments')
def get_deployments():
    """Returns a paginated list of deployments with optional search."""
    db = get_db()
    cursor = db.cursor()
    
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '', type=str)
    
    # Limit per_page to prevent abuse
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page
    
    # Build query based on search parameter
    if search:
        # Search by deploy ID or deployer
        count_query = """
            SELECT COUNT(*) 
            FROM deployments d
            JOIN blocks b ON d.block_hash = b.block_hash
            WHERE d.deploy_id LIKE ? OR d.deployer_pub_key LIKE ?
        """
        data_query = """
            SELECT d.deploy_id, 
                   d.deployer_pub_key as deployer, 
                   d.term, 
                   d.cost as phlo_cost, 
                   0 as phlo_limit, 
                   1 as phlo_price, 
                   CASE WHEN d.errors IS NOT NULL AND d.errors != '' THEN 1 ELSE 0 END as errored, 
                   d.errors as error_message, 
                   d.created_at,
                   d.block_hash, 
                   b.block_number
            FROM deployments d
            JOIN blocks b ON d.block_hash = b.block_hash
            WHERE d.deploy_id LIKE ? OR d.deployer_pub_key LIKE ?
            ORDER BY d.created_at DESC
            LIMIT ? OFFSET ?
        """
        search_pattern = f"%{search}%"
        params = (search_pattern, search_pattern, per_page, offset)
        count_params = (search_pattern, search_pattern)
    else:
        # No search - return all deployments
        count_query = """
            SELECT COUNT(*) 
            FROM deployments d
            JOIN blocks b ON d.block_hash = b.block_hash
        """
        data_query = """
            SELECT d.deploy_id, 
                   d.deployer_pub_key as deployer, 
                   d.term, 
                   d.cost as phlo_cost, 
                   0 as phlo_limit, 
                   1 as phlo_price, 
                   CASE WHEN d.errors IS NOT NULL AND d.errors != '' THEN 1 ELSE 0 END as errored, 
                   d.errors as error_message, 
                   d.created_at,
                   d.block_hash, 
                   b.block_number
            FROM deployments d
            JOIN blocks b ON d.block_hash = b.block_hash
            ORDER BY d.created_at DESC
            LIMIT ? OFFSET ?
        """
        params = (per_page, offset)
        count_params = ()
    
    # Get total count
    cursor.execute(count_query, count_params)
    total_count = cursor.fetchone()[0]
    
    # Get deployments
    cursor.execute(data_query, params)
    deployments = [dict(row) for row in cursor.fetchall()]
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    return jsonify({
        'deployments': deployments,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': total_pages,
            'pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    })

@app.route('/api/wallet/<address>')
def get_wallet_balance(address):
    """Query wallet balance using RNode explore-deploy."""
    try:
        # Validate address format (basic check)
        if not address or len(address) < 40:
            return jsonify({'error': 'Invalid address format'}), 400
        
        # Get latest block number for validAfterBlockNumber
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT MAX(block_number) FROM blocks")
        latest_block = cursor.fetchone()[0] or 0
        
        # Prepare the Rholang code to check balance
        check_balance_rho = f'''
new return, rl(`rho:registry:lookup`), RevVaultCh, vaultCh in {{
  rl!(`rho:rchain:revVault`, *RevVaultCh) |
  for (@(_, RevVault) <- RevVaultCh) {{
    @RevVault!("findOrCreate", "{address}", *vaultCh) |
    for (@maybeVault <- vaultCh) {{
      match maybeVault {{
        (true, vault) => @vault!("balance", *return)
        (false, err)  => return!(err)
      }}
    }}
  }}
}}'''
        
        # Use HTTP API to execute explore-deploy
        try:
            # Send as plain text, matching ASI Wallet v2 implementation
            # The Rholang code is sent directly as a string, not as JSON
            response = requests.post(
                f"{EXPLORE_DEPLOY_URL}/api/explore-deploy",
                data=check_balance_rho,
                headers={'Content-Type': 'text/plain'},
                timeout=30
            )
            
            if response.status_code != 200:
                app.logger.error(f"RNode API error: {response.status_code} - {response.text}")
                return jsonify({'error': 'Failed to query balance from RNode'}), 500
            
            # Parse the JSON response
            result = response.json()
            balance_dust = 0
            
            # Log the full response for debugging
            app.logger.info(f"Explore-deploy response for {address}: {json.dumps(result, indent=2)}")
            
            # Check if we have expr array with balance data
            if result.get('expr') and len(result['expr']) > 0:
                first_expr = result['expr'][0]
                
                # Check if it's a direct integer (balance)
                if 'ExprInt' in first_expr and 'data' in first_expr['ExprInt']:
                    balance_dust = int(first_expr['ExprInt']['data'])
                # Check if it's an error string
                elif 'ExprString' in first_expr and 'data' in first_expr['ExprString']:
                    app.logger.error(f"Balance check error: {first_expr['ExprString']['data']}")
                    balance_dust = 0
            else:
                # Empty expr array - might mean the vault doesn't exist yet
                app.logger.warning(f"Empty expr array for address {address}. Vault may not exist.")
                # Return 0 balance with a note
                return jsonify({
                    'address': address,
                    'balance': {
                        'dust': 0,
                        'rev': 0
                    },
                    'note': 'This address may not have been initialized on the blockchain yet.',
                    'transactions': []
                })
                    
        except requests.exceptions.Timeout:
            return jsonify({'error': 'RNode query timeout'}), 504
        except requests.exceptions.ConnectionError:
            app.logger.error(f"Cannot connect to read-only node at {EXPLORE_DEPLOY_URL}")
            return jsonify({'error': 'Cannot connect to RNode. Is the read-only node running?'}), 503
        
        # Convert dust to REV (1 REV = 100,000,000 dust)
        balance_rev = balance_dust / 100_000_000
        
        # Get transaction history for this address
        cursor.execute("""
            SELECT 
                d.block_hash,
                d.deploy_id,
                d.term,
                d.created_at as timestamp,
                d.cost as phlo_cost,
                CASE WHEN d.errors IS NOT NULL AND d.errors != '' THEN 1 ELSE 0 END as errored,
                b.block_number,
                b.created_at as block_created_at
            FROM deployments d
            JOIN blocks b ON d.block_hash = b.block_hash
            WHERE d.term LIKE ?
            ORDER BY b.block_number DESC
            LIMIT 20
        """, (f'%{address}%',))
        
        deployments = []
        for row in cursor.fetchall():
            deployment = dict(row)
            
            # Check if this is a transfer
            term = deployment['term'].replace('\\n', ' ')
            if 'RevVault' in term and 'transfer' in term:
                # Try to parse transfer details
                import re
                pattern = r'match\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*\)'
                match = re.search(pattern, term)
                if match:
                    from_addr = match.group(1)
                    to_addr = match.group(2)
                    amount = int(match.group(3))
                    
                    deployment['type'] = 'transfer'
                    deployment['from_address'] = from_addr
                    deployment['to_address'] = to_addr
                    deployment['amount_dust'] = amount
                    deployment['amount_rev'] = amount / 100_000_000
                    deployment['direction'] = 'out' if from_addr == address else 'in'
            
            deployments.append(deployment)
        
        return jsonify({
            'address': address,
            'balance': {
                'dust': balance_dust,
                'rev': balance_rev
            },
            'transactions': deployments
        })
        
    except Exception as e:
        app.logger.error(f"Error querying wallet balance: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting ASI Chain Block Explorer on port {WEB_PORT}")
    logger.info(f"Database: {DB_PATH}")
    logger.info(f"Explore Deploy URL: {EXPLORE_DEPLOY_URL}")
    
    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)
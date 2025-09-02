# ASI Chain RChain/F1R3FLY Faucet

A production-ready faucet service for distributing REV tokens on the ASI Chain (F1R3FLY) blockchain network.

## Features

- ✅ **Native RChain/F1R3FLY Integration**: Direct blockchain interaction using Rholang smart contracts
- ✅ **REV Token Distribution**: Automated distribution of testnet REV tokens
- ✅ **Rate Limiting**: 20 requests/hour, 5 requests/day per address
- ✅ **Web Interface**: User-friendly HTML interface with real-time status
- ✅ **Security**: Optional reCAPTCHA support, input validation, SQL injection protection
- ✅ **Production Ready**: Docker deployment, health checks, monitoring endpoints
- ✅ **GraphQL Integration**: Uses indexer for transaction verification

## Architecture

The faucet is built specifically for RChain/F1R3FLY blockchain:
- Uses SECP256K1 cryptography for signing deployments
- Implements Blake2b hashing for message digests
- Converts between ETH and REV address formats
- Sends Rholang code directly to validator nodes

## Quick Start

### 1. Deploy with Docker

```bash
# Copy and configure environment
cp .env.rchain.template .env.rchain

# Generate a private key for the faucet
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env.rchain and add your FAUCET_PRIVATE_KEY

# Deploy the faucet
./deploy_rchain_faucet.sh
```

### 2. Manual Installation

```bash
# Install dependencies
pip install -r requirements_rchain.txt

# Configure environment
cp .env.rchain.template .env.rchain
# Edit .env.rchain with your settings

# Run the faucet
python rchain_faucet.py
```

## Configuration

Edit `.env.rchain` with your settings:

```env
# Required: Faucet private key (hex format)
FAUCET_PRIVATE_KEY=your_private_key_here

# RChain node endpoints
VALIDATOR_URL=http://18.142.221.192:40413  # For sending transactions
READONLY_URL=http://18.142.221.192:40453    # For balance queries
GRAPHQL_URL=http://18.142.221.192:8080/v1/graphql  # For transaction history

# Faucet settings
FAUCET_AMOUNT=100    # REV per request
PHLO_LIMIT=500000    # Gas limit
PHLO_PRICE=1         # Gas price

# Optional: reCAPTCHA
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=
```

## API Endpoints

### Web Interface
- `GET /` - Faucet web interface

### API
- `POST /request` - Request REV tokens
  ```
  Form data:
  - address: REV address (required)
  - captcha: reCAPTCHA response (if enabled)
  ```

### Monitoring
- `GET /stats` - Faucet statistics (balance, distributed amount)
- `GET /health` - Health check endpoint

## How It Works

1. **Address Validation**: Validates REV address format (starts with '1')
2. **Rate Limiting**: Checks request limits (hourly and daily)
3. **Deploy Creation**: Creates Rholang transfer code
4. **Signing**: Signs deploy with SECP256K1
5. **Submission**: Sends to validator node
6. **Verification**: Tracks deploy in database

## Rholang Transfer Code

The faucet uses native Rholang code for transfers:

```rholang
new rl(`rho:registry:lookup`), RevVaultCh in {
  rl!(`rho:rchain:revVault`, *RevVaultCh) |
  for (@(_, RevVault) <- RevVaultCh) {
    // Create vaults and transfer logic
    @vault!("transfer", recipient, amount, *key, *resultCh)
  }
}
```

## Security Features

- **Input Validation**: Strict REV address format validation
- **Rate Limiting**: SQLite-backed rate limiting per IP and address
- **CAPTCHA**: Optional Google reCAPTCHA integration
- **SQL Injection Protection**: Parameterized queries
- **Non-root Docker**: Runs as unprivileged user
- **Health Checks**: Built-in health monitoring

## Monitoring

### Check Faucet Status
```bash
# View logs
docker logs -f asi-rchain-faucet

# Check health
curl http://localhost:5000/health

# View statistics
curl http://localhost:5000/stats
```

### Database Management
```bash
# View request history
sqlite3 faucet.db "SELECT * FROM faucet_requests ORDER BY timestamp DESC LIMIT 10;"

# Check daily limits
sqlite3 faucet.db "SELECT * FROM daily_limits WHERE date = date('now');"
```

## Funding the Faucet

1. Get the faucet's REV address:
```bash
docker exec asi-rchain-faucet python3 -c "
from rchain_faucet import *
import os
pk = os.getenv('FAUCET_PRIVATE_KEY')
pub = get_public_key_from_private(pk)
eth = derive_eth_address(pub)
rev = derive_rev_address(eth)
print(f'Faucet REV Address: {rev}')
"
```

2. Send REV tokens to this address using the ASI Wallet or CLI

## Troubleshooting

### Faucet has no balance
- Fund the faucet's REV address with tokens
- Check balance in the stats endpoint

### Deploy failures
- Verify node connectivity: `curl http://18.142.221.192:40413/api/status`
- Check phloLimit is sufficient
- Ensure validator node is accepting deploys

### Rate limit issues
- Default: 20 requests/hour, 5 requests/day per address
- Clear limits: `sqlite3 faucet.db "DELETE FROM daily_limits;"`

## Development

### Testing Locally
```bash
# Run in development mode
FLASK_ENV=development python rchain_faucet.py

# Test request
curl -X POST http://localhost:5000/request \
  -F "address=11112YdjsGp7pnNPNGHtokpR7xpR5epTTRHGiP7LVUYxhJDSMNpqWz"
```

### Custom Amount
```python
# In rchain_faucet.py, modify:
FAUCET_AMOUNT = int(os.getenv('FAUCET_AMOUNT', '100'))
```

## Differences from Ethereum Faucet

| Feature | Ethereum Faucet | RChain Faucet |
|---------|-----------------|---------------|
| Token | ETH | REV |
| Address Format | 0x... (40 chars) | 1... (52+ chars) |
| Signing | ECDSA on Keccak256 | SECP256K1 on Blake2b |
| Smart Contracts | Solidity | Rholang |
| Transaction Format | RLP encoded | Protobuf |
| Gas | Wei/Gwei | Phlogiston |

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Create an issue in the ASI Chain GitLab repository
- Contact the ASI Chain development team
# Archived Faucet Implementations

This directory contains archived faucet implementations that were previously used in the ASI Chain project. These implementations have been superseded by the TypeScript faucet but are preserved for reference and historical purposes.

## Archived Date: September 2025

## Archived Implementations

### 1. Ethereum/Web3 Faucet (`ethereum-web3-faucet.py`)

**Previously known as:** `server.py`

**Purpose:** For Ethereum-compatible chains or ASI token on Ethereum

**Technology Stack:**
- Web3.py for Ethereum integration
- eth_account for wallet management
- Flask web framework
- SQLite for rate limiting

**Features:**
- Web3 integration for Ethereum/EVM chains
- Distributes ASI tokens (default 10 ASI per request)
- Standard Ethereum transaction format
- SQLite-based rate limiting
- Google reCAPTCHA support
- Balance checking via `w3.eth.get_balance()`
- CORS support for cross-origin requests

**Token Details:**
- Token Type: ASI tokens (ERC-20 style)
- Address Format: 0x... (Ethereum addresses, 40 characters)
- Default Amount: 10 ASI per request

### 2. F1R3FLY Python Faucet (`f1r3fly_faucet.py`)

**Purpose:** Experimental F1R3FLY blockchain faucet implementation

**Technology Stack:**
- Native F1R3FLY/RChain integration
- SECP256K1 cryptography
- Blake2b hashing
- Flask web framework

**Features:**
- REV address validation (1111... format)
- Rholang smart contract generation
- Direct gRPC/HTTP node communication
- Rate limiting (20 requests/hour, 5 requests/day)
- GraphQL integration for transaction verification

**Token Details:**
- Token Type: REV tokens
- Address Format: 1111... (REV addresses, ~54 characters)
- Default Amount: 1000 REV per request

### 3. RChain Python Faucet (`rchain_faucet.py`)

**Purpose:** Production-ready RChain/F1R3FLY faucet

**Technology Stack:**
- Full RChain node integration
- SECP256K1 with Blake2b
- Protobuf message formatting
- Flask with comprehensive security

**Features:**
- Complete REV token distribution system
- Advanced rate limiting with SQLite
- Transaction tracking and verification
- Health monitoring endpoints
- Docker deployment ready
- Optional reCAPTCHA integration
- Comprehensive error handling

**Token Details:**
- Token Type: REV tokens
- Address Format: 1111... (REV addresses)
- Default Amount: 100 REV per request
- Gas: Phlogiston (500,000 phlo limit)

## Why These Were Archived

1. **Consolidation**: The TypeScript faucet (`typescript-faucet/`) provides a unified, modern implementation that combines the best features of all Python implementations.

2. **Technology Stack**: The TypeScript implementation uses the proven crypto libraries from ASI Wallet v2, ensuring consistency across the project.

3. **Maintenance**: Having multiple implementations of the same functionality increases maintenance burden. The TypeScript version is easier to maintain alongside the wallet and explorer.

4. **Performance**: The TypeScript implementation offers better performance with Node.js async capabilities and efficient request handling.

5. **Network Focus**: ASI Chain primarily uses the F1R3FLY blockchain. The Ethereum faucet was for potential cross-chain compatibility that is not currently active.

## Current Active Implementation

The active faucet implementation is located at:
```
faucet/typescript-faucet/
```

This TypeScript implementation:
- Supports F1R3FLY/RChain network
- Uses modern Express.js with TypeScript
- Integrates with ASI Wallet v2 crypto libraries
- Provides enterprise-grade security
- Offers real-time web interface

## Historical Notes

- The Ethereum faucet was created for potential ASI token distribution on Ethereum-compatible networks
- The F1R3FLY Python faucets were early implementations during the blockchain development phase
- These implementations served well during development but have been superseded by the TypeScript version

## Usage (Historical Reference Only)

These archived faucets are not recommended for production use. If you need to reference them:

```python
# Example of how the Ethereum faucet was configured
FAUCET_PRIVATE_KEY=<private_key>
RPC_URL=http://localhost:8545
FAUCET_AMOUNT=10

# Example of how the F1R3FLY faucet was configured
FAUCET_PRIVATE_KEY=<private_key>
VALIDATOR_URL=http://localhost:40413
READONLY_URL=http://localhost:40453
FAUCET_AMOUNT=100
```

## Migration Path

To use the current faucet implementation:

```bash
cd ../typescript-faucet
npm install
npm run build
npm start
```

Refer to the TypeScript faucet README for current deployment instructions.
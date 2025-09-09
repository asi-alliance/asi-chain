# ASI Wallet v2 - Docker Deployment Guide

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the wallet
docker-compose -f docker-compose.local.yml up -d

# View logs
docker logs -f asi-wallet-v2-local

# Stop the wallet
docker-compose -f docker-compose.local.yml down
```

### 2. Using the Start Script

```bash
# Make script executable (first time only)
chmod +x start-wallet.sh

# Start the wallet
./start-wallet.sh

# Stop the wallet
docker-compose -f docker-compose.local.yml down
```

## Access Points

- **Wallet UI**: http://localhost:3000
- **Connected to**: ASI Chain Testnet (54.254.197.253)

## Features Available

### Core Wallet Functions
- ✅ Create new wallet
- ✅ Import existing wallet (private key/seed phrase)
- ✅ Send and receive REV tokens
- ✅ Transaction history
- ✅ Balance checking

### Advanced Features
- ✅ WalletConnect v2 integration for DApp connectivity
- ✅ Hardware wallet support (Ledger/Trezor)
- ✅ Multi-signature wallets
- ✅ 2FA and biometric authentication
- ✅ Rholang IDE with Monaco editor
- ✅ Deploy smart contracts
- ✅ Dark/Light theme

## Configuration

### Environment Variables (docker-compose.local.yml)

```yaml
environment:
  # WalletConnect Project ID
  - REACT_APP_WALLETCONNECT_PROJECT_ID=4c8ec18817ffbbce4b824f14928d0f8b
  
  # RChain Network Endpoints (AWS Lightsail)
  - REACT_APP_RCHAIN_HTTP_URL=http://54.254.197.253:40403
  - REACT_APP_RCHAIN_GRPC_URL=http://54.254.197.253:40401
  - REACT_APP_RCHAIN_READONLY_URL=http://54.254.197.253:40453
```

### Connect to Local RChain Node

If you have a local RChain node running, update the endpoints:

```yaml
environment:
  - REACT_APP_RCHAIN_HTTP_URL=http://host.docker.internal:40403
  - REACT_APP_RCHAIN_GRPC_URL=http://host.docker.internal:40401
  - REACT_APP_RCHAIN_READONLY_URL=http://host.docker.internal:40403
```

## Docker Commands

### Build the Image
```bash
docker build -t asi-wallet-v2:latest .
```

### Run Container Manually
```bash
docker run -d \
  --name asi-wallet-v2 \
  -p 3000:80 \
  -e REACT_APP_RCHAIN_HTTP_URL=http://54.254.197.253:40403 \
  -e REACT_APP_RCHAIN_GRPC_URL=http://54.254.197.253:40401 \
  -e REACT_APP_RCHAIN_READONLY_URL=http://54.254.197.253:40453 \
  asi-wallet-v2:latest
```

### View Container Logs
```bash
docker logs -f asi-wallet-v2-local
```

### Check Container Status
```bash
docker ps --filter name=asi-wallet
```

### Stop and Remove Container
```bash
docker stop asi-wallet-v2-local
docker rm asi-wallet-v2-local
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Find process using port 3000
lsof -i :3000

# Or change the port in docker-compose.local.yml
ports:
  - "3001:80"  # Change to different port
```

### Cannot Connect to Blockchain
1. Check if the F1R3FLY nodes are accessible:
```bash
curl http://54.254.197.253:40403/status
```

2. Verify environment variables are set correctly:
```bash
docker exec asi-wallet-v2-local env | grep REACT_APP
```

### Build Errors
If the build fails:
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t asi-wallet-v2:latest .
```

## Security Notes

⚠️ **Important Security Considerations**:
- The default WalletConnect Project ID is for testing only
- Never expose private keys or seed phrases
- Use hardware wallets for production environments
- Enable 2FA for additional security
- Always verify transaction details before signing

## Network Information

### Connected to ASI Chain Testnet
- **Bootstrap Node**: 54.254.197.253:40403
- **gRPC Endpoint**: 54.254.197.253:40401
- **Observer Node**: 54.254.197.253:40453
- **Block Time**: ~30 seconds
- **Active Validators**: 4

## Support

For issues or questions:
1. Check the logs: `docker logs asi-wallet-v2-local`
2. Verify network connectivity
3. Ensure Docker is running properly
4. Check the [main documentation](../README.md)
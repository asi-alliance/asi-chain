#!/bin/bash

# ASI Chain RChain Faucet Deployment Script

set -e

echo "==================================="
echo "ASI Chain RChain Faucet Deployment"
echo "==================================="

# Check if .env file exists
if [ ! -f ".env.rchain" ]; then
    echo "Creating .env.rchain from template..."
    cp .env.rchain.template .env.rchain
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.rchain and add your FAUCET_PRIVATE_KEY"
    echo "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
    exit 1
fi

# Load environment variables
source .env.rchain

# Check if private key is set
if [ -z "$FAUCET_PRIVATE_KEY" ]; then
    echo "❌ ERROR: FAUCET_PRIVATE_KEY not set in .env.rchain"
    echo "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    exit 1
fi

# Build Docker image
echo "Building Docker image..."
docker build -f Dockerfile.rchain -t asi-rchain-faucet:latest .

# Stop existing container if running
echo "Stopping existing container (if any)..."
docker stop asi-rchain-faucet 2>/dev/null || true
docker rm asi-rchain-faucet 2>/dev/null || true

# Run new container
echo "Starting RChain faucet container..."
docker run -d \
    --name asi-rchain-faucet \
    --restart unless-stopped \
    -p 5000:5000 \
    --env-file .env.rchain \
    -v $(pwd)/faucet.db:/app/faucet.db \
    asi-rchain-faucet:latest

echo ""
echo "✅ RChain faucet deployed successfully!"
echo ""
echo "Access the faucet at: http://localhost:5000"
echo ""
echo "Container status:"
docker ps | grep asi-rchain-faucet
echo ""
echo "View logs with: docker logs -f asi-rchain-faucet"
echo ""

# Display faucet REV address
echo "Calculating faucet REV address..."
docker exec asi-rchain-faucet python3 -c "
import os
from rchain_faucet import get_public_key_from_private, derive_eth_address, derive_rev_address

private_key = os.getenv('FAUCET_PRIVATE_KEY', '')
if private_key:
    public_key = get_public_key_from_private(private_key)
    eth_address = derive_eth_address(public_key)
    rev_address = derive_rev_address(eth_address)
    print(f'Faucet ETH Address: {eth_address}')
    print(f'Faucet REV Address: {rev_address}')
    print()
    print('⚠️  Make sure to fund this address with REV tokens for the faucet to work!')
"
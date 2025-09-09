#!/bin/bash

# ASI Wallet v2 Docker Build Script

echo "🚀 Building ASI Wallet v2 Docker image..."

# Build the Docker image
docker build -t asi-wallet-v2 . || {
    echo "❌ Build failed!"
    exit 1
}

echo "✅ Build successful!"
echo ""
echo "To run the wallet:"
echo "  docker-compose up -d"
echo ""
echo "Or run directly:"
echo "  docker run -d -p 3000:80 --name asi-wallet asi-wallet-v2"
echo ""
echo "Access the wallet at: http://localhost:3000"
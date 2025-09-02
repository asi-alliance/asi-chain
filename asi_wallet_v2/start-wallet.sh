#!/bin/bash

echo "🚀 Starting ASI Wallet v2 with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if image exists
if ! docker images | grep -q "asi-wallet-v2"; then
    echo "📦 Building Docker image first..."
    docker build -t asi-wallet-v2:latest .
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build Docker image"
        exit 1
    fi
fi

# Stop existing container if running
if docker ps -a | grep -q "asi-wallet-v2-local"; then
    echo "🛑 Stopping existing container..."
    docker stop asi-wallet-v2-local
    docker rm asi-wallet-v2-local
fi

echo "🏃 Starting ASI Wallet v2..."
docker-compose -f docker-compose.local.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ASI Wallet v2 is running!"
    echo ""
    echo "📱 Access the wallet at: http://localhost:3000"
    echo "🔗 Connected to: ASI Chain Testnet (54.254.197.253)"
    echo ""
    echo "📊 Container status:"
    docker ps --filter name=asi-wallet-v2-local --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📝 View logs with: docker logs -f asi-wallet-v2-local"
    echo "🛑 Stop with: docker-compose -f docker-compose.local.yml down"
else
    echo "❌ Failed to start ASI Wallet v2"
    exit 1
fi
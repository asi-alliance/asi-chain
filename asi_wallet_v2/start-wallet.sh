#!/bin/bash

echo "🚀 Starting ASI Wallet v2 with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if image exists, build if needed
if ! docker images | grep -q "asi-wallet-v2"; then
    echo "📦 Building Docker image first..."
    docker build -t asi-wallet-v2:latest .
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build Docker image"
        exit 1
    fi
fi

# Stop existing container if running
if docker ps -a | grep -q "asi-wallet-v2"; then
    echo "🛑 Stopping existing container..."
    docker-compose down
fi

echo "🏃 Starting ASI Wallet v2..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ASI Wallet v2 is running!"
    echo ""
    echo "📱 Access the wallet at: http://localhost:3000"
    echo "🔗 Connected to: F1R3FLY Network (AWS Lightsail)"
    echo "   • Validator: 13.251.66.61:40413"
    echo "   • Read-Only: 13.251.66.61:40453"
    echo "   • GraphQL: 13.251.66.61:8080"
    echo ""
    echo "📊 Container status:"
    docker ps --filter name=asi-wallet-v2 --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "🔍 Health check:"
    sleep 5
    curl -s http://localhost:3000/health && echo " ✅ Healthy" || echo " ⚠️  Starting..."
    echo ""
    echo "📝 View logs with: docker logs -f asi-wallet-v2"
    echo "🛑 Stop with: docker-compose down"
    echo "🔄 Rebuild with: docker-compose build --no-cache"
else
    echo "❌ Failed to start ASI Wallet v2"
    echo "📝 Check logs with: docker-compose logs"
    exit 1
fi
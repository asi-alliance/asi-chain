#!/bin/bash
# Script to rebuild and restart the indexer with new features

echo "Rebuilding indexer with new features..."

# Stop existing containers
docker compose down

# Rebuild the indexer image
docker compose build indexer

# Start the services
docker compose up -d

echo "Waiting for services to start..."
sleep 10

# Check status
docker ps | grep asi-indexer
echo ""
echo "Indexer rebuilt and restarted. Check logs with: docker logs -f asi-indexer"
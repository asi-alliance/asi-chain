#!/bin/bash
# Start the dockerized block explorer

# Build the image
echo "Building block explorer image..."
docker-compose -f docker-compose.explorer.yml build

# Start the container
echo "Starting block explorer..."
docker-compose -f docker-compose.explorer.yml up -d

# Show logs
echo "Showing logs (Ctrl+C to exit)..."
docker-compose -f docker-compose.explorer.yml logs -f

#!/bin/bash
# Configure Docker networks for block explorer access

echo "=== ASI Chain Block Explorer Docker Configuration ==="
echo ""

# Check if nodes are running
echo "1. Checking for running ASI Chain nodes..."
docker ps --format "table {{.Names}}\t{{.Networks}}" | grep -E "(validator|rnode|bootstrap)"

echo ""
echo "2. Available Docker networks:"
docker network ls --format "table {{.Name}}\t{{.Driver}}"

echo ""
echo "3. To run the block explorer with access to nodes:"
echo ""
echo "Option A - Using Docker Socket (Recommended):"
echo "  docker-compose -f docker-compose.explorer.yml up -d"
echo ""
echo "Option B - Using Host Network Mode:"
echo "  Edit docker-compose.explorer.yml and uncomment 'network_mode: host'"
echo "  docker-compose -f docker-compose.explorer.yml up -d"
echo ""
echo "Option C - Connect to Node Network (Not Recommended):"
echo "  docker network connect finalizer-bot_default asi-block-explorer"
echo ""

# Create startup script
cat > start_dockerized_explorer.sh << 'EOF'
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
EOF

chmod +x start_dockerized_explorer.sh

echo "4. Created start_dockerized_explorer.sh"
echo ""
echo "To start the explorer: ./start_dockerized_explorer.sh"
#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting ASI-Chain Indexer Deployment ---"

# 0. Check if Docker is running
echo "--- Checking Docker status... ---"
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi
echo "Docker is running."

# 0.5. Pre-pull Docker images to avoid timeouts
echo "--- Pre-pulling required Docker images... ---"
echo "This may take a few minutes on first run..."

# Function to pull Docker image with retries
pull_with_retry() {
    local image=$1
    local description=$2
    local max_attempts=3
    local attempt=1
    
    echo "Pulling $description..."
    while [ $attempt -le $max_attempts ]; do
        if docker pull "$image"; then
            echo "✅ Successfully pulled $image"
            return 0
        else
            echo "⚠️  Attempt $attempt of $max_attempts failed for $image"
            if [ $attempt -lt $max_attempts ]; then
                echo "Retrying in 5 seconds..."
                sleep 5
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    echo "❌ Failed to pull $image after $max_attempts attempts"
    return 1
}

# Pre-pull base images with retry logic
pull_with_retry "python:3.11-slim" "Python image for indexer" || {
    echo "Error: Failed to pull Python image. Indexer build will likely fail."
    echo "Please check your internet connection and Docker Hub access."
    exit 1
}

pull_with_retry "postgres:14-alpine" "PostgreSQL image for database" || {
    echo "Error: Failed to pull PostgreSQL image. Database will likely fail."
    echo "Please check your internet connection and Docker Hub access."
    exit 1
}

pull_with_retry "hasura/graphql-engine:v2.36.0" "Hasura GraphQL Engine" || {
    echo "Warning: Failed to pull Hasura image. GraphQL API may not work."
}

echo "--- Docker images pre-pulled successfully. ---"

# 1. Check for required configuration files
echo "--- Checking configuration files... ---"
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Creating from template..."
    cat > .env << 'EOF'
# ASI-Chain Indexer Environment Configuration

# RChain Node Configuration
NODE_URL=http://host.docker.internal:40453
NODE_TIMEOUT=30

# Database Configuration
DATABASE_POOL_SIZE=20

# Sync Settings
SYNC_INTERVAL=5
BATCH_SIZE=50
START_FROM_BLOCK=0

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Features
ENABLE_REV_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
EOF
    echo "Created .env file with default values. Please review and modify if needed."
fi

if [ ! -f "node_cli_linux" ]; then
    echo "Error: node_cli_linux not found. Please ensure the CLI binary is available."
    echo "You can obtain it from the main network deployment or build it manually."
    exit 1
fi

echo "--- Configuration files verified. ---"

# 2. Stop existing indexer services
echo "--- Stopping existing indexer services... ---"
docker compose -f docker-compose.rust.yml down --remove-orphans 2>/dev/null || echo "No existing services to stop."

# 3. Clean up old volumes if requested
read -p "Do you want to start with a fresh database? This will delete all indexed data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "--- Removing existing database volumes... ---"
    docker compose -f docker-compose.rust.yml down -v 2>/dev/null || echo "No volumes to remove."
    docker volume rm indexer_postgres_data 2>/dev/null || echo "Volume already removed."
    echo "Database volumes cleaned."
fi

# 4. Check network connectivity to ASI-Chain node
echo "--- Checking ASI-Chain node connectivity... ---"
source .env 2>/dev/null || echo "Warning: Could not source .env file"
NODE_HOST=${NODE_URL:-"http://host.docker.internal:40453"}

# Extract host and port from NODE_URL
if [[ $NODE_HOST =~ http://([^:]+):([0-9]+) ]]; then
    HOST="${BASH_REMATCH[1]}"
    PORT="${BASH_REMATCH[2]}"
    
    # Replace host.docker.internal with localhost for testing
    if [ "$HOST" = "host.docker.internal" ]; then
        TEST_HOST="localhost"
    else
        TEST_HOST="$HOST"
    fi
    
    echo "Testing connection to $TEST_HOST:$PORT..."
    if bash -c "echo >/dev/tcp/$TEST_HOST/$PORT" 2>/dev/null; then
        echo "✅ Successfully connected to ASI-Chain node at $TEST_HOST:$PORT"
    else
        echo "⚠️  Warning: Cannot connect to ASI-Chain node at $TEST_HOST:$PORT"
        echo "Please ensure the ASI-Chain network is running before starting the indexer."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo "Warning: Could not parse NODE_URL. Skipping connectivity test."
fi

# 5. Build and deploy indexer services
echo "--- Building and deploying indexer services... ---"
docker compose -f docker-compose.rust.yml up -d --build

# 6. Wait for services to be healthy
echo "--- Waiting for services to start... ---"
timeout=60 # 1 minute timeout
interval=10  # check every 10 seconds
elapsed=0

echo "Waiting for database to be ready..."
while true; do
    if docker compose -f docker-compose.rust.yml ps | grep -q "asi-indexer-db.*healthy"; then
        echo "✅ Database is healthy!"
        break
    fi
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ Timeout: Database did not become healthy within $timeout seconds."
        echo "--- Database logs ---"
        docker compose -f docker-compose.rust.yml logs postgres
        exit 1
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    echo "Still waiting for database... (${elapsed}s / ${timeout}s)"
done

echo "Waiting for indexer to be ready..."
elapsed=0
while true; do
    if docker compose -f docker-compose.rust.yml ps | grep -q "asi-rust-indexer.*healthy"; then
        echo "✅ Indexer is healthy!"
        break
    fi
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ Timeout: Indexer did not become healthy within $timeout seconds."
        echo "--- Indexer logs ---"
        docker compose -f docker-compose.rust.yml logs rust-indexer
        exit 1
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    echo "Still waiting for indexer... (${elapsed}s / ${timeout}s)"
done

echo "Waiting for Hasura to be ready..."
elapsed=0
while true; do
    if docker compose -f docker-compose.rust.yml ps | grep -q "asi-hasura.*healthy"; then
        echo "✅ Hasura is healthy!"
        break
    fi
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ Timeout: Hasura did not become healthy within $timeout seconds."
        echo "--- Hasura logs ---"
        docker compose -f docker-compose.rust.yml logs hasura
        exit 1
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
    echo "Still waiting for Hasura... (${elapsed}s / ${timeout}s)"
done

# 7. Configure Hasura GraphQL Engine
echo "--- Configuring Hasura GraphQL Engine... ---"

# Check for configuration script (prefer bash version)
if [ -f "scripts/configure-hasura.sh" ]; then
    echo "Running Hasura configuration script..."
    
    # Make script executable
    chmod +x scripts/configure-hasura.sh
    
    # Run the configuration script
    if bash scripts/configure-hasura.sh; then
        echo "✅ Hasura configured successfully!"
    else
        echo "⚠️  Warning: Hasura configuration failed. GraphQL API may not work properly."
        echo "You can manually configure it later by running: bash scripts/configure-hasura.sh"
    fi
elif [ -f "scripts/configure-hasura.py" ]; then
    echo "Running Python Hasura configuration script..."
    
    # Make script executable
    chmod +x scripts/configure-hasura.py
    
    # Try to run the Python configuration script
    if python3 scripts/configure-hasura.py 2>/dev/null; then
        echo "✅ Hasura configured successfully!"
    else
        echo "⚠️  Warning: Python configuration failed (likely missing 'requests' module)."
        echo "Install with: pip3 install requests"
        echo "Or manually configure later by running: python3 scripts/configure-hasura.py"
    fi
else
    echo "⚠️  Warning: No Hasura configuration script found. Skipping automatic configuration."
    echo "GraphQL API will need manual configuration."
fi

# 8. Verify indexer functionality
echo "--- Verifying indexer functionality... ---"

# Check if indexer can connect to the node
echo "Checking indexer logs for connectivity..."
sleep 5  # Give indexer time to attempt connection

# Look for success or error messages in logs
INDEXER_LOGS=$(docker compose -f docker-compose.rust.yml logs --tail=20 rust-indexer)

if echo "$INDEXER_LOGS" | grep -q "Starting enhanced Rust CLI blockchain indexer"; then
    echo "✅ Indexer started successfully!"
elif echo "$INDEXER_LOGS" | grep -q "Cannot connect to host"; then
    echo "⚠️  Warning: Indexer cannot connect to ASI-Chain node."
    echo "Please ensure the ASI-Chain network is running and accessible."
elif echo "$INDEXER_LOGS" | grep -q "ERROR\|error"; then
    echo "⚠️  Warning: Indexer shows errors in logs."
    echo "Recent logs:"
    echo "$INDEXER_LOGS"
else
    echo "✅ Indexer appears to be running normally."
fi

# 9. Check database initialization
echo "--- Checking database initialization... ---"
BLOCK_COUNT=$(docker exec -i $(docker compose -f docker-compose.rust.yml ps -q postgres) psql -U indexer -d asichain -t -c "SELECT COUNT(*) FROM blocks;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$BLOCK_COUNT" -gt "0" ]; then
    echo "✅ Database contains $BLOCK_COUNT blocks."
    
    # Check for genesis data
    GENESIS_TRANSFERS=$(docker exec -i $(docker compose -f docker-compose.rust.yml ps -q postgres) psql -U indexer -d asichain -t -c "SELECT COUNT(*) FROM transfers WHERE block_number = 0;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$GENESIS_TRANSFERS" -gt "0" ]; then
        echo "✅ Genesis transfers found: $GENESIS_TRANSFERS"
    else
        echo "ℹ️  No genesis transfers found. This is normal if indexing started from block 1."
    fi
else
    echo "ℹ️  Database is empty. Indexer will start synchronizing blocks shortly."
fi

# 10. Display service information
echo ""
echo "--- ASI-Chain Indexer Deployment Complete ---"
echo ""
echo "📊 Service URLs:"
echo "   • Indexer Metrics:  http://localhost:9090"
echo "   • GraphQL API:      http://localhost:8080"
echo "   • GraphiQL IDE:     http://localhost:8080/console"
echo "   • PostgreSQL:       localhost:5432 (indexer/indexer_pass)"
echo ""
echo "📋 Useful Commands:"
echo "   • View logs:        docker compose -f docker-compose.rust.yml logs -f rust-indexer"
echo "   • Check status:     docker compose -f docker-compose.rust.yml ps"
echo "   • Stop services:    docker compose -f docker-compose.rust.yml down"
echo "   • View database:    docker exec -it asi-indexer-db psql -U indexer -d asichain"
echo ""
echo "📈 Monitor indexing progress:"
echo "   docker compose -f docker-compose.rust.yml logs -f rust-indexer | grep 'Indexed block'"
echo ""

# 11. Optional: Run basic functionality test
read -p "Would you like to run a basic functionality test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "--- Running basic functionality test... ---"
    
    # Test GraphQL endpoint
    echo "Testing GraphQL endpoint..."
    GRAPHQL_RESPONSE=$(curl -s -X POST http://localhost:8080/v1/graphql \
        -H "Content-Type: application/json" \
        -d '{"query": "{ blocks_aggregate { aggregate { count } } }"}' || echo "ERROR")
    
    if echo "$GRAPHQL_RESPONSE" | grep -q "count"; then
        BLOCK_COUNT_GQL=$(echo "$GRAPHQL_RESPONSE" | jq -r '.data.blocks_aggregate.aggregate.count' 2>/dev/null || echo "unknown")
        echo "✅ GraphQL API working! Blocks available: $BLOCK_COUNT_GQL"
    else
        echo "⚠️  GraphQL API test failed. Response: $GRAPHQL_RESPONSE"
    fi
    
    # Test metrics endpoint
    echo "Testing metrics endpoint..."
    if curl -s http://localhost:9090/health | grep -q "healthy"; then
        echo "✅ Metrics endpoint working!"
    else
        echo "⚠️  Metrics endpoint test failed."
    fi
    
    echo "--- Functionality test complete. ---"
fi

# 12. Setup Hasura relationships
echo ""
echo "--- Setting up Hasura GraphQL relationships... ---"

# Check if the setup script exists
if [ -f "./scripts/setup-hasura-relationships.sh" ]; then
    echo "Running Hasura relationship setup..."
    
    # Make script executable if it isn't already
    chmod +x ./scripts/setup-hasura-relationships.sh
    
    # Run the setup script
    if ./scripts/setup-hasura-relationships.sh > /tmp/hasura-setup.log 2>&1; then
        echo "✅ Hasura relationships configured successfully!"
        
        # Test a nested query to verify relationships
        echo "Testing nested GraphQL query..."
        NESTED_TEST=$(curl -s -X POST http://localhost:8080/v1/graphql \
            -H "Content-Type: application/json" \
            -H "x-hasura-admin-secret: myadminsecretkey" \
            -d '{"query": "{ blocks(limit: 1) { block_number deployments { deploy_id } } }"}' 2>/dev/null || echo "{}")
        
        if echo "$NESTED_TEST" | grep -q "deployments"; then
            echo "✅ Nested queries working! You can now use relationships like blocks->deployments"
        else
            echo "⚠️  Nested queries may not be working. Check /tmp/hasura-setup.log for details"
        fi
    else
        echo "⚠️  Failed to setup Hasura relationships. Check /tmp/hasura-setup.log for details"
        echo "   You can manually run: ./scripts/setup-hasura-relationships.sh"
    fi
else
    echo "⚠️  Hasura relationship setup script not found at ./scripts/setup-hasura-relationships.sh"
    echo "   GraphQL relationships may not be configured."
fi

echo ""
echo "✅ ASI-Chain Indexer is now running!"
echo "   Monitor the logs to ensure proper synchronization with the blockchain."
echo "   The indexer will automatically process blocks and extract transfer data."
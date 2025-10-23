#!/bin/bash

# ASI-Chain Indexer Deployment Script
# 
# This script deploys the ASI-Chain indexer with support for:
# - Build-from-source Rust CLI (cross-platform, recommended)
# - Pre-compiled Rust CLI binary (faster deployment)
# - Remote F1R3FLY node connection (13.251.66.61)
# - Local F1R3FLY node connection
# - Automatic configuration templates
# - Comprehensive health checks and verification
#
# Updated: 2025-09-09
# Version: 2.0.0

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting ASI-Chain Indexer Deployment v2.0.0 ---"

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

# Check if we're using the build-from-source option
if [[ -f "docker-compose.rust.yml" ]] && grep -q "Dockerfile.rust-builder" docker-compose.rust.yml; then
    echo "--- Detected build-from-source configuration ---"
    echo "This will build the Rust CLI from source (takes 10-15 minutes first time)"
    
    pull_with_retry "rust:latest" "Latest Rust compiler for building CLI" || {
        echo "Warning: Failed to pull Rust image. CLI build may fail."
    }
    
    # Check system requirements for Rust build
    MEMORY_GB=$(docker run --rm busybox free -m | awk 'NR==2{print int($2/1024)}')
    if [ "$MEMORY_GB" -lt 6 ]; then
        echo "⚠️  Warning: Less than 6GB RAM available. Rust compilation may fail."
        echo "Consider using pre-compiled binary method instead."
        read -p "Continue with build from source? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "To use pre-compiled binary:"
            echo "1. Ensure node_cli_linux exists in this directory"
            echo "2. Update docker-compose.rust.yml to use Dockerfile.rust-simple"
            exit 1
        fi
    fi
fi

echo "--- Docker images pre-pulled successfully. ---"

# 1. Check for required configuration files
echo "--- Checking configuration files... ---"

# Check for .env file and offer templates
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Select configuration template:"
    echo "1. Remote F1R3FLY node (recommended - connects to 13.251.66.61)"
    echo "2. Local F1R3FLY node (requires local blockchain)"
    echo "3. Manual configuration"
    
    read -p "Select option (1/2/3): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            if [ -f ".env.remote-observer" ]; then
                cp .env.remote-observer .env
                echo "✅ Copied remote observer configuration to .env"
            else
                # Create remote config
                cat > .env << 'EOF'
# ASI-Chain Indexer Configuration for Remote Observer Node
NODE_HOST=44.198.8.24
HTTP_PORT=40403
GRPC_PORT=40401
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain
RUST_CLI_PATH=/usr/local/bin/node_cli
SYNC_INTERVAL=5
BATCH_SIZE=50
START_FROM_BLOCK=0
ENABLE_REV_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
LOG_LEVEL=INFO
LOG_FORMAT=json
HASURA_ADMIN_SECRET=myadminsecretkey
EOF
                echo "✅ Created remote F1R3FLY node configuration"
            fi
            ;;
        2)
            cat > .env << 'EOF'
# ASI-Chain Indexer Configuration for Local Node
NODE_HOST=44.198.8.24
GRPC_PORT=40452
HTTP_PORT=40453
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain
RUST_CLI_PATH=/usr/local/bin/node_cli
SYNC_INTERVAL=5
BATCH_SIZE=50
START_FROM_BLOCK=0
ENABLE_REV_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
LOG_LEVEL=INFO
LOG_FORMAT=json
HASURA_ADMIN_SECRET=myadminsecretkey
EOF
            echo "✅ Created local F1R3FLY node configuration"
            ;;
        3)
            cat > .env << 'EOF'
# ASI-Chain Indexer Environment Configuration
# Please customize these values for your deployment

NODE_HOST=44.198.8.24
GRPC_PORT=40452
HTTP_PORT=40453
DATABASE_URL=postgresql://indexer:indexer_pass@postgres:5432/asichain
RUST_CLI_PATH=/usr/local/bin/node_cli
SYNC_INTERVAL=5
BATCH_SIZE=50
START_FROM_BLOCK=0
ENABLE_REV_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
LOG_LEVEL=INFO
LOG_FORMAT=json
HASURA_ADMIN_SECRET=myadminsecretkey
EOF
            echo "✅ Created template .env file. Please edit before proceeding."
            echo "⚠️  Edit .env file now to configure your node connection."
            read -p "Press Enter after editing .env file..."
            ;;
        *)
            echo "Invalid selection. Creating default remote configuration."
            cp .env.remote-observer .env 2>/dev/null || {
                echo "Warning: Could not find template. Creating basic configuration."
            }
            ;;
    esac
fi

# Check Rust CLI requirements based on build method
BUILD_METHOD="unknown"
if [[ -f "docker-compose.rust.yml" ]] && grep -q "Dockerfile.rust-builder" docker-compose.rust.yml; then
    BUILD_METHOD="build-from-source"
    echo "✅ Using build-from-source method (Dockerfile.rust-builder)"
    echo "ℹ️  Rust CLI will be compiled inside Docker container"
elif [ -f "node_cli_linux" ]; then
    BUILD_METHOD="pre-compiled"
    echo "✅ Using pre-compiled binary method"
    echo "ℹ️  Found node_cli_linux binary: $(ls -lh node_cli_linux | awk '{print $5}')"
    
    # Check if binary is executable
    if [ ! -x "node_cli_linux" ]; then
        echo "⚠️  Making node_cli_linux executable..."
        chmod +x node_cli_linux
    fi
else
    echo "❌ No Rust CLI method available!"
    echo "Options:"
    echo "1. For build-from-source: Update docker-compose.rust.yml to use Dockerfile.rust-builder"
    echo "2. For pre-compiled: Ensure node_cli_linux exists in this directory"
    echo "3. Build locally: cd ../rust-client && cargo build --release && cp target/release/node_cli ../indexer/node_cli_linux"
    exit 1
fi

echo "--- Configuration files verified (method: $BUILD_METHOD). ---"

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

# Use new environment variable format (NODE_HOST and HTTP_PORT)
TEST_HOST="$NODE_HOST"
TEST_PORT="${HTTP_PORT:-40453}"

# Handle different host formats
if [ "$TEST_HOST" = "host.docker.internal" ]; then
    ACTUAL_TEST_HOST="localhost"
else
    ACTUAL_TEST_HOST="$TEST_HOST"
fi

echo "Testing connection to F1R3FLY node at $ACTUAL_TEST_HOST:$TEST_PORT..."
if bash -c "echo >/dev/tcp/$ACTUAL_TEST_HOST/$TEST_PORT" 2>/dev/null; then
    echo "✅ Successfully connected to F1R3FLY node at $ACTUAL_TEST_HOST:$TEST_PORT"
    
    # Test if it's actually a F1R3FLY node
    echo "Verifying F1R3FLY API endpoint..."
    if command -v curl >/dev/null 2>&1; then
        RESPONSE=$(curl -s --connect-timeout 5 "http://$ACTUAL_TEST_HOST:$TEST_PORT/api/status" 2>/dev/null || echo "")
        if [[ "$RESPONSE" == *"f1r3fly"* ]] || [[ "$RESPONSE" == *"rchain"* ]] || [[ "$RESPONSE" == *"status"* ]]; then
            echo "✅ F1R3FLY API responding correctly"
        else
            echo "⚠️  Warning: Endpoint responding but may not be F1R3FLY node"
        fi
    fi
else
    echo "⚠️  Warning: Cannot connect to F1R3FLY node at $ACTUAL_TEST_HOST:$TEST_PORT"
    echo "Please ensure the F1R3FLY network is running and accessible."
    echo ""
    echo "Connection details:"
    echo "  Host: $TEST_HOST"
    echo "  Port: $TEST_PORT"
    echo "  Testing: $ACTUAL_TEST_HOST:$TEST_PORT"
    echo ""
    echo "If using remote node, ensure:"
    echo "  - Node is running and healthy"
    echo "  - Network/firewall allows connection"
    echo "  - Correct host/port in .env file"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. Build and deploy indexer services
echo "--- Building and deploying indexer services... ---"

if [ "$BUILD_METHOD" = "build-from-source" ]; then
    echo "🔨 Building Rust CLI from source... This may take 10-15 minutes on first run."
    echo "💡 Tip: Monitor progress with: docker compose -f docker-compose.rust.yml logs -f rust-indexer"
    echo ""
    
    # Build with more verbose output for long-running process
    if ! docker compose -f docker-compose.rust.yml up -d --build; then
        echo "❌ Build failed. Check the following:"
        echo "  - Sufficient RAM (8GB+ recommended)"
        echo "  - Sufficient disk space (20GB+ recommended)" 
        echo "  - Stable internet connection for downloading crates"
        echo "  - Docker daemon has enough resources allocated"
        echo ""
        echo "To retry with clean build: docker system prune -a && ./deploy.sh"
        exit 1
    fi
else
    echo "🚀 Deploying with pre-compiled Rust CLI binary..."
    if ! docker compose -f docker-compose.rust.yml up -d --build; then
        echo "❌ Deployment failed. Check Docker logs for details."
        exit 1
    fi
fi

# 6. Wait for services to be healthy
echo "--- Waiting for services to start... ---"

# Set timeout based on build method
if [ "$BUILD_METHOD" = "build-from-source" ]; then
    timeout=180  # 3 minutes for build-from-source (compilation takes time)
    echo "Using extended timeout (3 minutes) for build-from-source method..."
else
    timeout=60   # 1 minute for pre-compiled
fi

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

# 11. Setup Hasura relationships (moved before optional tests to ensure it runs)
echo ""
echo "--- Setting up Hasura GraphQL relationships... ---"

# Check if the setup script exists
if [ -f "./scripts/setup-hasura-relationships.sh" ]; then
    echo "Running Hasura relationship setup..."
    
    # Make script executable if it isn't already
    chmod +x ./scripts/setup-hasura-relationships.sh
    
    # Run the setup script with better error handling
    echo "Setting up GraphQL relationships for nested queries..."
    if timeout 60 ./scripts/setup-hasura-relationships.sh > /tmp/hasura-setup.log 2>&1; then
        echo "✅ Hasura relationships configured successfully!"
        
        # Test a nested query to verify relationships
        echo "Testing nested GraphQL query..."
        sleep 2  # Give Hasura a moment to process the relationships
        NESTED_TEST=$(curl -s -X POST http://localhost:8080/v1/graphql \
            -H "Content-Type: application/json" \
            -H "x-hasura-admin-secret: myadminsecretkey" \
            -d '{"query": "{ blocks(limit: 1) { block_number deployments { deploy_id } } }"}' 2>/dev/null || echo '{"errors":[{"message":"connection failed"}]}')
        
        if echo "$NESTED_TEST" | grep -q '"deployments"'; then
            echo "✅ Nested queries working! You can now use relationships like blocks->deployments"
        elif echo "$NESTED_TEST" | grep -q '"data"'; then
            echo "✅ GraphQL working but no test data available yet"
        else
            echo "⚠️  Nested queries may not be working. Response: $(echo "$NESTED_TEST" | jq -c . 2>/dev/null || echo "$NESTED_TEST")"
            echo "   Check /tmp/hasura-setup.log for details"
        fi
    else
        echo "⚠️  Failed to setup Hasura relationships (timeout or error)"
        echo "   Check /tmp/hasura-setup.log for details"
        echo "   You can manually run: ./scripts/setup-hasura-relationships.sh"
        
        # Show last few lines of the log for immediate troubleshooting
        if [ -f "/tmp/hasura-setup.log" ]; then
            echo "   Last few lines of setup log:"
            tail -3 /tmp/hasura-setup.log | sed 's/^/     /'
        fi
    fi
else
    echo "⚠️  Hasura relationship setup script not found at ./scripts/setup-hasura-relationships.sh"
    echo "   GraphQL relationships may not be configured."
fi

# 12. Optional: Run basic functionality test
echo ""
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

# 13. Final deployment summary
echo ""
echo "--- Deployment Summary ---"
echo "✅ ASI-Chain Indexer deployment complete!"
echo ""
echo "🔧 Configuration:"
echo "   • Build method: $BUILD_METHOD"
echo "   • F1R3FLY node: $TEST_HOST:$TEST_PORT"
echo "   • Database: PostgreSQL (asi-indexer-db)"
echo "   • GraphQL: Hasura (asi-hasura)"
echo ""
echo "📊 Status Check:"
if curl -s http://localhost:9090/status >/dev/null 2>&1; then
    echo "   • REST API: ✅ Online at http://localhost:9090"
else
    echo "   • REST API: ⚠️  Not responding (may still be starting)"
fi

if curl -s http://localhost:8080/healthz >/dev/null 2>&1; then
    echo "   • GraphQL: ✅ Online at http://localhost:8080"
else
    echo "   • GraphQL: ⚠️  Not responding (may still be starting)"
fi

echo ""
echo "🔍 Next Steps:"
echo "   • Monitor indexing progress: docker compose -f docker-compose.rust.yml logs -f rust-indexer"
echo "   • Check sync status: curl http://localhost:9090/status | jq ."
echo "   • Access GraphQL Console: http://localhost:8080/console"
echo "   • View indexed data: http://localhost:9090/api/blocks"
echo ""
echo "The indexer will automatically synchronize with the blockchain and extract transfer data."
echo "Initial sync may take some time depending on the chain height and your network connection."
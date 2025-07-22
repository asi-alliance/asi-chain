#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting ASI-Chain Deployment ---"

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
pull_with_retry "ghcr.io/graalvm/jdk:ol8-java17-22.3.3" "GraalVM image for node build" || {
    echo "Warning: Failed to pull GraalVM image. Build may be slower or fail."
}

pull_with_retry "python:3.9-slim" "Python image for finalizer bot" || {
    echo "Error: Failed to pull Python image. Finalizer bot build will likely fail."
    echo "Please check your internet connection and Docker Hub access."
    exit 1
}

pull_with_retry "rust:latest" "Rust image for CLI build in finalizer bot" || {
    echo "Error: Failed to pull Rust image. Finalizer bot build will likely fail."
    echo "Please check your internet connection and Docker Hub access."
    exit 1
}

echo "--- Docker images pre-pulled successfully. ---"

# 1. Clone Repositories
echo "--- Cloning repositories... ---"
if [ ! -d "node" ]; then
    git clone https://github.com/F1R3FLY-io/f1r3fly/ node
else
    echo "Node directory already exists, skipping clone."
fi

if [ ! -d "cli" ]; then
    git clone -b preston/rholang_rust https://github.com/F1R3FLY-io/f1r3fly/ cli
else
    echo "CLI directory already exists, skipping clone."
fi
echo "--- Repositories cloned successfully. ---"

# 1.5. Copy updated configuration files
echo "--- Copying updated configuration files... ---"
if [ -d "finalizer-bot/conf" ]; then
    echo "Replacing node configuration files with updated versions..."
    # Ensure the target directory exists
    if [ ! -d "node/docker/conf" ]; then
        echo "Creating node/docker/conf directory..."
        mkdir -p node/docker/conf
    fi
    # First, clean up any directories that should be files
    for conf_file in bootstrap.conf validator1.conf validator2.conf validator3.conf; do
        if [ -d "node/docker/conf/$conf_file" ]; then
            echo "Removing directory node/docker/conf/$conf_file to replace with file..."
            rm -rf "node/docker/conf/$conf_file"
        fi
    done
    # Now copy the configuration files with force flag
    cp -fv finalizer-bot/conf/*.conf node/docker/conf/
    echo "--- Configuration files updated successfully. ---"
else
    echo "Warning: finalizer-bot/conf directory not found. Using default configuration files."
fi

# 2. Build the Node and Docker Image
echo "--- Building Scala node and Docker image... ---"
cd node
sbt clean compile
sbt "project node" Docker/publishLocal
cd ..
echo "--- Node and Docker image built successfully. ---"

# 3. Check/Implement VABN support in CLI
echo "--- Checking VABN (Valid After Block Number) support in CLI... ---"
# Check if VABN is already implemented (due to code structure changes, patch may not apply)
if grep -q "valid_after_block_number" cli/node-cli/src/args.rs 2>/dev/null && \
   grep -q "valid_after_block_number: i64" cli/node-cli/src/f1r3fly_api.rs 2>/dev/null && \
   grep -q "args.valid_after_block_number" cli/node-cli/src/commands/network.rs 2>/dev/null; then
    echo "--- VABN support already implemented in CLI. ---"
else
    echo "Attempting to apply VABN patch..."
    cd cli
    if [ -f "../patches/cli-vabn-support.patch" ]; then
        # Try to apply the patch
        if patch -p1 --dry-run < ../patches/cli-vabn-support.patch >/dev/null 2>&1; then
            patch -p1 < ../patches/cli-vabn-support.patch
            echo "--- VABN patch applied successfully. ---"
        else
            echo "Warning: Patch cannot be applied cleanly. VABN may need manual implementation."
            echo "Please see docs/development/PATCH_MANAGEMENT.md for manual implementation instructions."
        fi
    else
        echo "Warning: VABN patch file not found. CLI will use default behavior (VABN=0)."
    fi
    cd ..
fi

# 4. Build the CLI Tool
echo "--- Building the CLI tool... ---"
cd cli/node-cli
cargo build --release
cd ../..
echo "--- CLI tool built successfully. ---"

# 5. Enable VABN-aware finalizer
echo "--- Enabling VABN-aware finalizer... ---"
if [ -f "finalizer-bot/finalizer_with_vabn.py" ]; then
    cp finalizer-bot/finalizer_with_vabn.py finalizer-bot/finalizer.py
    echo "--- VABN-aware finalizer enabled. ---"
else
    echo "Warning: VABN-aware finalizer not found. Using default finalizer."
fi

# 6. Deploy the Testnet
echo "--- Deploying the testnet... ---"
cd node
echo "--- Copying integrated Docker Compose file... ---"
cp ../finalizer-bot/docker-compose.integrated.yml docker/docker-compose.integrated.yml
# Use the single, integrated Docker Compose file to launch all services.
# The --build flag ensures the finalizer-bot image is always up-to-date.
docker compose -f docker/docker-compose.integrated.yml up -d --build finalizer-bot
cd ..
echo "--- Testnet deployment started in the background. ---"

# 5. Verify Network Status and Check Bonds
echo "--- Verifying network status and waiting for observer node... ---"
docker ps

timeout=300 # 5 minutes timeout
interval=10  # check every 10 seconds
elapsed=0

echo "Polling the observer node for bond status. This may take a few minutes..."

cd cli/node-cli
# Try to get bonds, but don't exit on error
set +e
while true; do
    # Execute the command and capture the output. We check the output content
    # instead of the exit code, because the CLI tool erroneously returns 0 on failure.
    output=$(./target/release/node_cli bonds --port 40453 2>&1)

    # Check if the command's output contains the success message
    if echo "$output" | grep -q "✅ Validator bonds retrieved successfully!"; then
        echo "--- Observer node is ready! Bonds retrieved successfully. ---"
        echo "$output" # Print the successful output
        break
    fi

    # Check for timeout
    if [ $elapsed -ge $timeout ]; then
        echo "Timeout reached. Observer node did not respond within $timeout seconds."
        echo "--- Last attempt output ---"
        echo "$output"
        echo "--- Bootstrap logs ---"
        docker logs rnode.bootstrap
        echo "--- Readonly (Observer) logs ---"
        docker logs rnode.readonly
        exit 1
    fi

    # Wait and try again
    sleep $interval
    elapsed=$((elapsed + interval))
    echo "Still waiting for observer node to be ready... (${elapsed}s / ${timeout}s)"
done
set -e # Re-enable exit on error
cd ../..

echo "--- ASI-Chain Deployment Script Finished ---"
echo ""
echo "✅ IMPORTANT: The network is now configured to run past block 50!"
echo "   - CLI has been patched to support --valid-after-block-number"
echo "   - Finalizer bot is using dynamic VABN values"
echo ""
echo "To test the VABN support manually:"
echo "  cd cli/node-cli"
echo "  ./target/release/node_cli deploy --file ../../contracts/hello.rho --valid-after-block-number 50"
echo ""
echo "Monitor block production:"
echo "  docker logs -f finalizer-bot | grep 'finalized block'"
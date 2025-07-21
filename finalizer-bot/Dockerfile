# Stage 1: Build the node-cli binary
# Use the latest stable rust image to ensure compatibility with modern Cargo.lock files
FROM rust:latest as builder

# Install build dependencies, including the protobuf compiler
WORKDIR /usr/src
# Clone the specific branch of the CLI repository
RUN apt-get update && apt-get install -y git protobuf-compiler pkg-config libssl-dev patch && \
    git clone -b preston/rholang_rust https://github.com/F1R3FLY-io/f1r3fly/ asi-cli

# Copy patches and fix script
COPY patches/cli-vabn-github.patch /tmp/
COPY patches/cli-vabn-support.patch /tmp/
COPY patches/fix-vabn.py /tmp/
WORKDIR /usr/src/asi-cli

# Install Python for the fix script (it's in the rust image)
RUN apt-get update && apt-get install -y python3

# Try to apply patches flexibly
RUN echo "Attempting to patch files..." && \
    patch -p1 < /tmp/cli-vabn-support.patch || echo "Main patch partially applied" && \
    patch -p1 < /tmp/cli-vabn-github.patch || echo "GitHub patch partially applied"

# Run the Python fix script to handle remaining issues
RUN python3 /tmp/fix-vabn.py

# Verify the changes
RUN echo "=== Verification ===" && \
    echo "VABN in f1r3fly_api.rs:" && grep -n "valid_after_block_number" node-cli/src/f1r3fly_api.rs | head -5 || true && \
    echo "VABN in args.rs:" && grep -n "valid_after_block_number" node-cli/src/args.rs | head -5 || true && \
    echo "Deploy calls in network.rs:" && grep -n "\.deploy(" node-cli/src/commands/network.rs | head -5 || true

WORKDIR /usr/src/asi-cli/node-cli
# Build the release binary
RUN cargo build --release

# Stage 2: Create the final, lightweight image
FROM python:3.9-slim

# Set the working directory in the final image
WORKDIR /app

# Copy the compiled node-cli binary from the builder stage
COPY --from=builder /usr/src/asi-cli/node-cli/target/release/node_cli .
# Copy the finalizer script and the contract
COPY finalizer-bot/finalizer.py .
COPY finalizer-bot/contracts/ ./contracts/

# Ensure the CLI binary is executable
RUN chmod +x ./node_cli

# Run the finalizer script when the container launches
# -u ensures that python output is sent straight to terminal
CMD ["python", "-u", "finalizer.py"]
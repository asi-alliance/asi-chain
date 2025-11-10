# Development Guide

← [Back to README](README.md)

This guide covers development environment setup, building from source, manual deployment procedures, and troubleshooting for ASI Chain node infrastructure.

---

## Table of Contents

1. [Development Environment](#development-environment)
2. [Building from Source](#building-from-source)
3. [Manual Deployment](#manual-deployment)
4. [Running Components](#running-components)
5. [Troubleshooting](#troubleshooting)

---

## Development Environment

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 16 GB
- Storage: 50 GB free
- Network: Stable internet connection

**Recommended:**
- CPU: 8 cores
- RAM: 32 GB
- Storage: 250+ GB
- Network: Stable internet connection

### Software Dependencies

**Docker and Docker Compose**

Linux:
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

macOS:
```bash
brew install --cask docker
# Start Docker Desktop application
```

Verify installation:
```bash
docker --version          # Need: 20.10+
docker compose version    # Need: 2.0+
```

**Java Development Kit**

Linux:
```bash
sudo apt-get install openjdk-17-jdk
```

macOS:
```bash
brew install openjdk@17

# Configure environment
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:$PATH"

# Add to shell profile for persistence
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
```

Verify installation:
```bash
java -version    # Need: OpenJDK 17+
```

**Scala Build Tool (sbt)**

Linux:
```bash
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x99E82A75642AC823" | sudo apt-key add
sudo apt-get update
sudo apt-get install sbt
```

macOS:
```bash
brew install sbt
```

Verify installation:
```bash
sbt --version    # Need: 1.9+
```

**Rust and Cargo**

All platforms:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

Verify installation:
```bash
rustc --version    # Need: 1.70+
cargo --version
```

**Node.js (for wallet-generator)**

Linux:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

macOS:
```bash
brew install node@20
```

Verify installation:
```bash
node --version    # Need: 20+
npm --version     # Need: 9+
```

**Build Tools**

Linux:
```bash
sudo apt-get install make perl git protobuf-compiler
```

macOS:
```bash
brew install make perl git protobuf-compiler
```

---

## Building from Source

### Clone Repository

```bash
git clone --recursive https://github.com/asi-alliance/asi-chain.git
cd asi-chain
```

The `--recursive` flag initializes the `node/` submodule. If you already cloned without this flag:
```bash
git submodule update --init --recursive
```

### Build ASI Chain Node

To build manually:

```bash
cd node
sbt clean compile
sbt "project node" Docker/publishLocal
cd ..
```

This creates the Docker image `amamata/asi-scala-node:latest`.

### Build Rust CLI

```bash
cd cli/node-cli
cargo build --release
cd ../..
```

The compiled binary is located at `cli/node-cli/target/release/node_cli`.

### Build Wallet Generator

```bash
cd wallet-generator
npm install
cd ..
```

No compilation needed - TypeScript is executed with ts-node.

### Build Deployer Bot

```bash
cd deployer-bot
docker build -t deployer-bot:latest .
cd ..
```

---

## Manual Deployment

**Note:** Automated deployment scripts (including `scripts/deploy.sh`) are currently in development and reference components not included in this repository. The manual deployment steps below provide a working setup without external dependencies.

### Step 1: Initialize Dependencies

```bash
# Initialize submodules (node repository)
git submodule update --init --recursive

# Clone CLI repository
git clone https://github.com/singnet/rust-client cli
cd cli
```

### Step 2: Build Components

```bash
# Build node
cd node
sbt clean compile
sbt "project node" Docker/publishLocal
cd ..

# Build CLI
cd cli/node-cli
cargo build --release
cd ../..
```

### Step 3: Configure Network

The default configuration files are located in:
- `chain/genesis/` - Genesis node configurations
- `chain/validator/` - External validator configurations

### Step 4: Start Network

Using the provided Docker Compose configurations:

```bash
cd node/docker

# Start genesis nodes (bootstrap + validators)
docker compose -f shard.yml up -d

# Wait for network initialization (2-3 minutes)
# Check logs for: "Approved state for block Block #0"

# Start observer node
docker compose -f observer.yml up -d
```

### Step 5: Verify Network

Check that all containers are running:
```bash
docker ps
```

Query bond status from observer:
```bash
cd cli/node-cli
cargo run -- bonds -p 40402
```

---

## Running Components

### Wallet Generator

Generate a new wallet key set:

```bash
cd wallet-generator
npm run generate
```

Output:
```
Private Key: b67533f1f99c0ecaedb7d829e430b1c0e605bda10f339f65d5567cb5bd77cbcb
Public Key: 0457febafcc25dd34ca5e5c025cd445f60e5ea6918931a54eb8c3a204f51760248090b0c757c2bdad7b8c4dca757e109f8ef64737d90712724c8216c94b4ae661c
Address: 1111LAd2PWaHsw84gxarNx99YVK2aZhCThhrPsWTV7cs1BPcvHftP
Wallet saved to: wallet_2025-11-01T13-24-58-185Z.txt
```

**Important:** Backup the generated file securely.

### Deployer Bot

Configure the bot:
```bash
cd deployer-bot
cp .env.example .env
# Edit .env with your settings
```

Build and run:
```bash
docker build -t deployer-bot:latest .
docker compose -f deployer.yml up -d
```

View logs:
```bash
docker logs -f deployer
```

### External Validator

Follow the complete guide in [chain/validator/README.md](chain/validator/README.md).

Quick setup:
```bash
cd chain/validator

# Build images
docker build -f configurator.Dockerfile -t configurator:latest ../..
docker build -f connector.Dockerfile -t connector:latest .

# Configure environment
cp conf/validator.env .env
# Edit .env with validator settings

# Generate credentials (if needed)
docker compose -f configurator.yml up

# Start validator
docker compose -f validator.yml up -d
```

---

## Troubleshooting

### Docker Issues

**Container fails to start**

Check logs:
```bash
docker logs <container-name>
```

Common causes:
- Port already in use: Change port mappings in docker-compose.yml
- Insufficient resources: Ensure Docker has at least 16GB RAM allocated
- Image not found: Verify images are built with `docker images`

**Clean restart**

Stop all containers and remove volumes:
```bash
cd node/docker
docker compose -f shard.yml down -v
docker compose -f observer.yml down -v

# Clean deployer bot
cd ../../deployer-bot
docker compose -f deployer.yml down -v
```

### Build Issues

**Java compilation errors**

Verify Java version:
```bash
java -version
```

Clear build artifacts:
```bash
cd node
sbt clean
```

**Rust compilation errors**

Update Rust:
```bash
rustup update
```

Clean build:
```bash
cd cli/node-cli
cargo clean
cargo build --release
```

**npm installation errors**

Clear cache:
```bash
cd wallet-generator
rm -rf node_modules package-lock.json
npm install
```

### Network Issues

**Nodes not connecting**

Verify bootstrap node is running:
```bash
docker ps | grep bootstrap
docker logs rnode.bootstrap
```

Check network connectivity:
```bash
docker network inspect devnet
```

**Transaction not processing**

Verify node is synchronized:
```bash
curl http://54.235.138.68:40403/api/last-finalized-block
```

Check if validators are active:
```bash
cd cli/node-cli
cargo run -- bonds -p 40402
```

### Common Errors

**"Connection refused" when deploying**

Wait for nodes to fully initialize (2-3 minutes after startup).

**"bind: address already in use"**

Find process using the port:
```bash
lsof -i :<port>
```

Kill the process or change port mapping in docker-compose.yml.

**"Error: Could not deploy, casper instance was not available yet"**

Node's consensus engine is still initializing. Wait and retry.

**Submodule not initialized**

```bash
git submodule update --init --recursive
```

### Getting Help

If issues persist:

1. Check container logs for detailed error messages
2. Review configuration files for typos or incorrect values
3. Verify all prerequisites are correctly installed
4. Consult the documentation portal at https://docs.asichain.io
5. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - System information (OS, Docker version, etc.)

---

For configuration details, see [CONFIGURATION.md](CONFIGURATION.md).

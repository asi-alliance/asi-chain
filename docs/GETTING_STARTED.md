# ASI-Chain Complete Getting Started Guide

Welcome to ASI-Chain! This comprehensive guide will take you from zero to a fully running ASI-Chain network with all essential services. Whether you're looking for a quick start or detailed deployment instructions, this guide has you covered.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
   - [System Requirements](#system-requirements)
   - [Software Requirements](#software-requirements)
   - [Quick Prerequisites Check](#quick-prerequisites-check)
3. [Quick Start (5 Minutes)](#quick-start-5-minutes)
   - [Step 1: Clone and Setup](#step-1-clone-and-setup-1-minute)
   - [Step 2: Deploy the Network](#step-2-deploy-the-network-3-minutes)
   - [Step 3: Your First Smart Contract](#step-3-your-first-smart-contract-1-minute)
   - [Step 4: Verify Your Deployment](#step-4-verify-your-deployment)
4. [Detailed Installation Guide](#detailed-installation-guide)
   - [Pre-download Docker Images](#pre-download-docker-images-recommended)
   - [Understanding the Deployment Process](#understanding-the-deployment-process)
   - [Manual Deployment Option](#manual-deployment-option)
5. [Post-Deployment Services](#post-deployment-services)
   - [Starting the Block Explorer](#starting-the-block-explorer)
   - [Starting ASI Wallet v2](#starting-asi-wallet-v2)
   - [Service Management](#service-management)
6. [CLI Usage Guide](#cli-usage-guide)
   - [CLI Installation](#cli-installation)
   - [Command Reference](#command-reference)
   - [Common CLI Operations](#common-cli-operations)
7. [Ubuntu Server Deployment](#ubuntu-server-deployment)
   - [Server Prerequisites](#server-prerequisites)
   - [Firewall Configuration](#firewall-configuration)
   - [Public Access Configuration](#public-access-configuration)
8. [Network Architecture](#network-architecture)
   - [Node Configuration](#node-configuration)
   - [Port Mappings](#port-mappings)
   - [Service URLs](#service-urls)
9. [Smart Contract Development](#smart-contract-development)
   - [Rholang Basics](#rholang-basics)
   - [Example Contracts](#example-contracts)
   - [Contract Deployment](#contract-deployment)
10. [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Clean Deployment](#clean-deployment)
    - [VABN and Block 50](#vabn-and-block-50)
11. [Advanced Topics](#advanced-topics)
    - [Custom Configuration](#custom-configuration)
    - [Alternative Deployment Scripts](#alternative-deployment-scripts)
    - [Development Workflow](#development-workflow)
12. [Next Steps](#next-steps)

## Overview

ASI-Chain is a blockchain platform based on RChain/F1R3FLY technology, featuring:
- **Multi-component architecture**: Scala blockchain node, Rust CLI, React wallet, Python block explorer
- **Rholang smart contracts**: A concurrent programming language for blockchain
- **Automated deployment**: One-command setup for the entire network
- **VABN support**: Valid After Block Number for enhanced transaction ordering
- **Continuous block production**: Automated finalizer bot ensures network activity

## Prerequisites

### System Requirements

- **OS**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 20GB free space
- **CPU**: 4+ cores recommended
- **Internet**: Stable connection for downloading ~1GB of data

### Software Requirements

Essential tools that must be installed:

- **Docker** (20.10+) with Docker Compose (2.0+) - [Install Docker](https://docs.docker.com/get-docker/)
- **Git** (2.0+) - [Install Git](https://git-scm.com/downloads)
- **Make** - Usually pre-installed on Linux/macOS

Additional requirements for manual builds:
- **Java** (17+) - Required for Scala compilation
- **Rust** (1.70+) - [Install Rust](https://rustup.rs/)
- **sbt** - Scala Build Tool 1.9+

### Quick Prerequisites Check

Run this command to verify all prerequisites:

```bash
docker --version && docker compose version && git --version && make --version && java -version && rustc --version
```

If any command fails, install the missing component before proceeding.

## Quick Start (5 Minutes)

Get your ASI-Chain testnet up and running with minimal effort!

### Step 1: Clone and Setup (1 minute)

```bash
# Clone the workspace
git clone https://github.com/F1R3FLY-io/asi-chain.git
cd asi-chain

# The deploy script will handle cloning node and CLI repos
```

### Step 2: Deploy the Network (3 minutes)

```bash
# This single command does everything!
./scripts/deploy.sh
```

This automated script will:
- Clone necessary repositories (node and CLI)
- Check for VABN support and apply patch if needed
- Build the Scala node and Docker image
- Build the Rust CLI tool with VABN support
- Start all network services (including finalizer bot)
- Wait for the network to be ready

Expected output:
```
--- Starting ASI-Chain Deployment ---
--- Cloning repositories... ---
--- Building Scala node and Docker image... ---
--- Building CLI tool... ---
--- Starting Docker services... ---
--- Testnet deployment started in the background. ---
SUCCESS: Bond list retrieved! Observer node is ready.
```

### Step 3: Your First Smart Contract (1 minute)

#### Generate Keys
```bash
cd cli/node-cli
make generate-key-pair SAVE=true
```

#### Deploy a Contract
```bash
# Deploy the sample "Hello World" contract
make deploy
```

#### Propose a Block
```bash
# Create a block containing your deployment
make propose
```

#### Or Do Everything at Once
```bash
# Generate keys, deploy, and propose in one command
make full-deploy
```

### Step 4: Verify Your Deployment

#### Check the Network Status
```bash
# View all running services
docker ps

# Check validator bonds
make bonds

# View recent blocks
./target/release/node_cli show-blocks --port 40453
```

You should see these containers running:
- `rnode.bootstrap` - Bootstrap node
- `rnode.validator1-3` - Three validator nodes
- `rnode.readonly` - Observer node for queries
- `finalizer-bot` - Automated block finalizer

## Detailed Installation Guide

For those who want to understand the deployment process in detail or customize their setup.

### Pre-download Docker Images (Recommended)

To avoid timeout issues during deployment, pre-pull the large base image:

```bash
# Pre-pull the large base image
docker pull ghcr.io/graalvm/jdk:ol8-java17-22.3.3

# This prevents the 265MB download during the build process
```

### Understanding the Deployment Process

The deployment script (`./scripts/deploy.sh`) performs these steps:

1. **Repository Cloning**
   - Clones the F1R3FLY node repository
   - Clones the CLI repository with VABN support

2. **VABN Support Check**
   - Detects if CLI already has VABN support
   - Applies patch only if needed (latest CLI has built-in support)

3. **Build Process**
   - Compiles Scala node using sbt
   - Builds Docker image for the node
   - Compiles Rust CLI tool

4. **Network Deployment**
   - Starts 4-node network via Docker Compose
   - Launches finalizer bot for continuous blocks
   - Waits for network stability

5. **Verification**
   - Checks observer node readiness
   - Confirms bond list retrieval
   - Validates network operation

### Manual Deployment Option

If you prefer manual control over each step:

```bash
# 1. Clone repositories
git clone https://github.com/F1R3FLY-io/f1r3fly/ node
git clone -b preston/rholang_rust https://github.com/F1R3FLY-io/f1r3fly/ cli

# 2. Build node
cd node
sbt clean compile
sbt "project node" Docker/publishLocal
cd ..

# 3. Build CLI
cd cli/node-cli
cargo build --release
cd ../..

# 4. Deploy network
docker-compose -f node/docker/docker-compose.integrated.yml up -d
```

## Post-Deployment Services

Once your network is deployed and producing blocks, start additional services for a complete blockchain experience.

### Starting the Block Explorer

The Block Explorer provides real-time visibility into network activity. Start it immediately after network sync to capture complete blockchain history.

#### Quick Start with Docker (Recommended)

```bash
# Navigate to block explorer directory
cd block-explorer

# Start both parser and web server with Docker
docker-compose up -d

# Verify it's running
docker ps | grep block-explorer

# Check the logs
docker logs block-explorer-parser-1
docker logs block-explorer-web-1
```

The Block Explorer will be available at: **http://localhost:5001**

#### Alternative: Manual Setup (Local Development)

```bash
# Navigate to block explorer directory
cd block-explorer

# Install Python dependencies
pip install -r requirements.txt

# Initialize the database
python parser/init_db.py

# Start the parser (collects blockchain data)
python parser/enhanced_parser.py &

# Start the web server
python web/app.py
```

The Block Explorer will be available at: **http://localhost:8080** (local development uses port 8080)

### Starting ASI Wallet v2

The wallet allows you to manage accounts and interact with the blockchain.

```bash
# Open a new terminal (keep Block Explorer running)
cd asi_wallet_v2

# Install dependencies (first time only, ~2-3 minutes)
npm install

# Copy environment template
cp .env.example .env

# Start the wallet
npm start
```

The ASI Wallet will be available at: **http://localhost:3000**

#### First Time Setup
1. **Create a password** when you first open the wallet
2. **Generate or import an account**
3. **Configure network settings**:
   - Click Settings → Network Configuration
   - Verify it points to your local nodes
   - Default should work: `http://localhost:40403`

### Service Management

#### Quick Reference: Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Block Explorer | http://localhost:5001 | Monitor blockchain activity |
| ASI Wallet | http://localhost:3000 | Manage accounts & transactions |
| Observer Node API | http://localhost:40453 | Direct blockchain queries |

#### Service Management Commands

```bash
# Check Block Explorer status
docker ps | grep block-explorer

# View Block Explorer logs
docker logs block-explorer-web-1
docker logs block-explorer-parser-1

# Stop Block Explorer
cd block-explorer && docker-compose down

# Check Wallet process
ps aux | grep "npm start" | grep -v grep

# Stop Wallet
pkill -f "npm start"
```

#### Automated Service Startup Script

Create a script to start both services automatically:

```bash
# Create the startup script
cat > start_services.sh << 'EOF'
#!/bin/bash
echo "=== Starting ASI Chain Services ==="

# Check if network is running
if ! docker ps | grep -q "rnode.bootstrap"; then
    echo "Error: ASI Chain network is not running!"
    echo "Please run ./scripts/deploy.sh first"
    exit 1
fi

# Start Block Explorer
echo "Starting Block Explorer..."
cd block-explorer
docker-compose up -d
echo "✅ Block Explorer started at http://localhost:5001"

# Start Wallet
echo "Starting ASI Wallet..."
cd ../asi_wallet_v2
if [ ! -d "node_modules" ]; then
    echo "Installing wallet dependencies (first time only)..."
    npm install
fi
nohup npm start > wallet.log 2>&1 &
echo "✅ ASI Wallet starting at http://localhost:3000"
echo "   Check wallet.log for startup progress"

echo ""
echo "=== All services started! ==="
echo "Block Explorer: http://localhost:5001"
echo "ASI Wallet:     http://localhost:3000"
EOF

chmod +x start_services.sh
./start_services.sh
```

## CLI Usage Guide

The `node-cli` is your primary tool for interacting with the ASI-Chain network.

### CLI Installation

The CLI is automatically built during network deployment. If you need to build it manually:

```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Clone and build (if not done by deploy script)
git clone -b preston/rholang_rust https://github.com/F1R3FLY-io/f1r3fly/ cli
cd cli/node-cli
cargo build --release
```

### Command Reference

#### Getting Help

```bash
# List all commands
cargo run -- help

# Get help for a specific command
cargo run -- <COMMAND> --help
```

#### Deploy Command

Deploys a Rholang file to the network.

```bash
cargo run --release -- deploy --file <FILE> [OPTIONS]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --file` | Path to Rholang (.rho) file | Required |
| `--private-key` | Hex-encoded signing key | test key |
| `-p, --port` | gRPC port for deploy | 40401 |
| `--valid-after-block-number` | Block number after which deploy is valid | 0 |

#### Propose Command

Requests a validator to create a new block.

```bash
cargo run --release -- propose [OPTIONS]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--private-key` | Key of proposing validator | test key |
| `-p, --port` | gRPC port for propose | 40402 |

#### Bonds Command

Queries the list of bonded validators.

```bash
cargo run --release -- bonds [OPTIONS]
```

Example: `cargo run --release -- bonds -p 40453`

#### Generate Key Pair

Creates a new secp256k1 key pair.

```bash
cargo run --release -- generate-key-pair [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `-s, --save` | Save keys to files |
| `-o, --output-dir` | Directory for key files |

### Common CLI Operations

#### Check Balance
```bash
make wallet-balance ADDRESS=<your-address>
```

#### Deploy Custom Contract
```bash
# Create your contract
echo 'new helloWorld in { helloWorld!("Hello from ASI-Chain!") }' > mycontract.rho

# Deploy it (with VABN support)
./node_cli deploy --private-key <your-private-key> \
  --file mycontract.rho \
  --host 127.0.0.1 \
  --port 40401 \
  --valid-after-block-number 0
```

#### Monitor the Network
```bash
# Watch finalizer bot logs
docker logs -f finalizer-bot

# Check specific node logs
docker logs rnode.validator1
```

## Ubuntu Server Deployment

Deploy ASI-Chain on an Ubuntu 22.04 server for public access.

### Server Prerequisites

Connect to your Ubuntu server and install dependencies:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y git curl make

# Install Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ${USER}

# Install Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Install Java 17
sudo apt install -y openjdk-17-jdk

# Install sbt
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x99E82A75642AC823" | sudo apt-key add
sudo apt update
sudo apt install -y sbt

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Firewall Configuration

Configure UFW to allow necessary ports:

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# ASI-Chain Network Ports
sudo ufw allow 40400/tcp
sudo ufw allow 40404/tcp
sudo ufw allow 40401:40403/tcp
sudo ufw allow 40411:40412/tcp
sudo ufw allow 40421:40422/tcp
sudo ufw allow 40431:40432/tcp
sudo ufw allow 40453/tcp

# Web Application Ports
sudo ufw allow 3000/tcp
sudo ufw allow 5001/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Public Access Configuration

#### Deploy the Network

```bash
git clone https://github.com/vbrltech/asi-chain.git
cd asi-chain
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### Start Block Explorer for Public Access

```bash
cd block-explorer
chmod +x start_explorer.sh
./start_explorer.sh
```

The Block Explorer will be accessible at `http://<YOUR_PUBLIC_IP>:5001`

#### Start Wallet for Public Access

```bash
cd asi_wallet_v2
npm install
nohup npm start -- --host 0.0.0.0 > wallet.log 2>&1 &
```

The wallet will be accessible at `http://<YOUR_PUBLIC_IP>:3000`

#### Access Your Public Testnet

- **Block Explorer**: `http://<YOUR_PUBLIC_IP>:5001`
- **ASI Wallet**: `http://<YOUR_PUBLIC_IP>:3000`
- **Observer gRPC Endpoint**: `<YOUR_PUBLIC_IP>:40453`

## Network Architecture

### Node Configuration

The ASI-Chain network consists of:

| Node | Type | Role |
|------|------|------|
| rnode.bootstrap | Bootstrap | Initial network entry point |
| rnode.validator1 | Validator | Block validation and creation |
| rnode.validator2 | Validator | Block validation and creation |
| rnode.validator3 | Validator | Block validation and creation |
| rnode.readonly | Observer | Read-only queries |
| finalizer-bot | Bot | Automated block production |

### Port Mappings

| Node | Deploy Port | Propose Port | Query Port |
|------|-------------|--------------|------------|
| Bootstrap | 40401 | 40402 | 40403 |
| Validator1 | 40411 | 40412 | - |
| Validator2 | 40421 | 40422 | - |
| Validator3 | 40431 | 40432 | - |
| Observer | - | - | 40453 |

### Service URLs

| Service | Local URL | Purpose |
|---------|-----------|---------|
| Block Explorer | http://localhost:5001 | View blockchain data |
| ASI Wallet | http://localhost:3000 | Manage accounts |
| Observer API | http://localhost:40453 | Direct queries |

## Smart Contract Development

### Rholang Basics

Rholang is ASI-Chain's smart contract language, featuring:
- **Concurrent execution**: Contracts run in parallel
- **Channel-based communication**: Message passing between processes
- **Pattern matching**: Powerful data handling

### Example Contracts

#### Simple Message Contract
```rholang
new stdout(`rho:io:stdout`) in {
  stdout!("Hello, Blockchain!")
}
```

#### Data Logging Contract
```rholang
new dataChannel in {
  dataChannel!({
    "message": "My custom data",
    "timestamp": 1234567890,
    "user": "developer"
  })
}
```

#### Unique Channel Contract
```rholang
new ch_1752497264226_SnQ3TdHr in { 
  ch_1752497264226_SnQ3TdHr!({
    "validator": "rnode.validator3", 
    "block": 2, 
    "timestamp": 1752497264226, 
    "nonce": "SnQ3TdHr"
  }) 
}
```

### Contract Deployment

Deploy contracts using the CLI:

```bash
# Basic deployment
make deploy CONTRACT=../../contracts/example.rho

# Deploy and propose
make full-deploy CONTRACT=../../contracts/example.rho

# Direct CLI usage
./target/release/node-cli --grpc-host localhost --grpc-port 40402 deploy \
  --private-key <key> --valid-after-block-number <block> <contract.rho>
```

## Troubleshooting

### Common Issues

#### Network Not Starting?

Clean everything and restart:
```bash
docker compose -f node/docker/docker-compose.integrated.yml down -v
./scripts/deploy.sh
```

#### Can't Connect to Node?

Remember the correct port mappings:
- **Deploy**: Use port 40401
- **Propose**: Use port 40402  
- **Query**: Use port 40453

#### Build Failed?

Clean and rebuild:
```bash
cd node && sbt clean && cd ..
cd cli/node-cli && cargo clean && cd ../..
./scripts/deploy.sh
```

#### Port Already in Use?

Stop existing containers:
```bash
docker-compose -f node/docker/docker-compose.integrated.yml down
./scripts/deploy.sh
```

#### CLI Compilation Errors?

The latest code includes VABN support. If you see compilation errors:
```bash
# Clean and retry
rm -rf cli/
./scripts/deploy.sh
```

### Clean Deployment

For a completely fresh start:

```bash
# Stop all containers
docker-compose -f node/docker/docker-compose.integrated.yml down -v

# Remove cloned repositories
rm -rf node/ cli/

# Remove Docker images (optional)
docker rmi f1r3fly-scala-node finalizer-bot

# Run deployment
./scripts/deploy.sh
```

### VABN and Block 50

The network previously stopped at block 50. This is now resolved through VABN (Valid After Block Number) support:

- The CLI automatically includes VABN support
- The finalizer bot sets appropriate VABN values
- The network continues past block 50 without issues

To verify VABN is working:
```bash
# Watch for blocks past 50
docker logs -f finalizer-bot | grep "blocks past"
```

When successful, you'll see:
```
🎉 Network has produced 51 blocks past the old limit!
```

## Advanced Topics

### Custom Configuration

Modify node configurations in `finalizer-bot/conf/`:
- `bootstrap.conf` - Bootstrap node settings
- `validator1.conf` - Validator 1 settings
- `validator2.conf` - Validator 2 settings
- `validator3.conf` - Validator 3 settings

### Alternative Deployment Scripts

- `./scripts/deploy_quick.sh` - Skip builds, use existing images
- `./scripts/deploy_local.sh` - Local development deployment

### Development Workflow

#### Making Changes to Node
1. Edit Scala code
2. Run `sbt compile` (auto-formats unless CI=true)
3. Run `sbt test` for unit tests
4. Build Docker: `sbt "project node" Docker/publishLocal`

#### Making Changes to CLI
1. Edit Rust code
2. Run `cargo build --release`
3. Test with `make deploy` using example contracts

#### Making Changes to Wallet
1. Edit React/TypeScript code
2. Hot reload with `npm start`
3. Type check: `npm run type-check`
4. Lint: `npm run lint`

#### Testing Smart Contracts
1. Write Rholang in `contracts/`
2. Deploy with CLI: `make deploy CONTRACT=path/to/contract.rho`
3. Check results in block explorer

## Next Steps

Now that your network is running:

1. **Explore the Architecture**: Review the network design and components
2. **Write Smart Contracts**: Learn [Rholang basics](https://rholang.github.io/)
3. **Use the Block Explorer**: Monitor network activity at http://localhost:5001
4. **Interact with the Wallet**: Manage accounts at http://localhost:3000
5. **Read Advanced Documentation**: Check the `docs/` directory for detailed guides

## Need Help?

- **Full Documentation Index**: See `docs/INDEX.md`
- **Architecture Details**: `docs/architecture/ARCHITECTURE.md`
- **Troubleshooting Guide**: `docs/troubleshooting/TROUBLESHOOTING.md`
- **Test Reports**: `docs/analysis/TEST_REPORT.md`

---

**Pro Tips**: 
- The finalizer-bot ensures continuous block production. If blocks aren't being created, check its logs with `docker logs finalizer-bot`
- Always start the Block Explorer immediately after network sync to capture complete blockchain history
- Use VABN when deploying contracts to ensure they remain valid past block 50

Welcome to ASI-Chain! Your blockchain journey starts here.
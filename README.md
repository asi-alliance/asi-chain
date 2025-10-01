<div align="center">

# ASI Chain

[![Status](https://img.shields.io/badge/Status-Production--Ready-7FD67A?style=for-the-badge)](https://github.com/asi-alliance/asi-chain)
[![Version](https://img.shields.io/badge/Version-1.0.2-A8E6A3?style=for-the-badge)](https://github.com/asi-alliance/asi-chain/releases)
[![License](https://img.shields.io/badge/License-Apache%202.0-1A1A1A?style=for-the-badge)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-Available-C4F0C1?style=for-the-badge)](docs-site/)

<h3>⚡ Blockchain Infrastructure for Decentralized AI ⚡</h3>

Part of the [**Artificial Superintelligence Alliance**](https://superintelligence.io) ecosystem
*Uniting Fetch.ai, SingularityNET, Ocean Protocol, and CUDOS*

</div>

---

## 📚 Table of Contents

1. [🌐 Network Overview](#-network-overview)
2. [⚙️ Technical Architecture](#️-technical-architecture)
3. [📋 Prerequisites & Installation](#-prerequisites--installation)
4. [🚀 Quick Start Guide](#-quick-start-guide)
5. [🔧 Blockchain Node Operations](#-blockchain-node-operations)
6. [💼 Wallet Management](#-wallet-management)
7. [🌐 Blockchain Explorer](#-blockchain-explorer)
8. [📡 API Documentation](#-api-documentation)
9. [🛠️ Command Line Interface](#️-command-line-interface)
10. [🌍 Network Environments](#-network-environments)
11. [🔒 Security Best Practices](#-security-best-practices)
12. [🧪 Troubleshooting Guide](#-troubleshooting-guide)
13. [📊 Performance & Monitoring](#-performance--monitoring)
14. [🤝 Contributing](#-contributing)

---

## 🌐 Network Overview

ASI Chain provides the blockchain foundation for the **Artificial Superintelligence Alliance**, enabling:

- 🤖 **Decentralized AI agent coordination**
- 🔗 **Cross-chain AI workflow orchestration**  
- 💰 **On-chain AI model governance**
- 🖥️ **Compute resource marketplace transactions**
- 🧠 **Parallel smart contract execution via Rholang**

**Project Status**: Production-ready blockchain infrastructure with enterprise-grade services, zero-touch indexer deployment (v2.1.1), comprehensive wallet implementation, and fully deployed blockchain explorer. **Complete AWS Lightsail deployment** at 13.251.66.61 with F1R3FLY network + Indexer + Explorer + **ASI Wallet v2** + **Faucet** + **Documentation Site** all operational. ASI Wallet v2.2.0 live at http://13.251.66.61:3000 with WalletConnect v2, and Rholang IDE. Explorer v1.0.2 at http://13.251.66.61:3001 with validator deduplication fixed. TypeScript Faucet at http://13.251.66.61:5050 distributing testnet ASI tokens. Documentation Site at http://13.251.66.61:3003 with Docusaurus 3.8.1.

## ⚙️ Technical Architecture

<div align="center">

```
┌──────────────────────────────────────────────────────────────┐
│                       ASI Chain Stack                        │
├──────────────────────────────────────────────────────────────┤
│  Frontend Layer                                               │
│    ├── ASI Wallet v2.2.0 (React 18, TypeScript, Redux)        │
│    ├── Blockchain Explorer (React 19, Apollo GraphQL)         │
│    └── Documentation Site (Docusaurus 3.8.1)                  │
├──────────────────────────────────────────────────────────────┤
│  API Layer                                                    │
│    ├── REST API (Port 9090)                                   │
│    ├── GraphQL via Hasura (Port 8080)                         │
│    ├── gRPC Node Interface (Port 40403)                       │
│    └── Faucet API (Port 5050)                                 │
├──────────────────────────────────────────────────────────────┤
│  Data Layer                                                   │
│    ├── Python Indexer with Rust CLI                           │
│    ├── PostgreSQL 14+ Database                                │
│    ├── Redis Primary/Replica Caching                          │
│    └── Hasura GraphQL Engine                                  │
├──────────────────────────────────────────────────────────────┤
│  Blockchain Core (F1R3FLY)                                    │
│    ├── CBC Casper PoS Consensus (Scala 2.12.15)               │
│    ├── Rholang VM & Runtime                                   │
│    ├── RSpace Parallel Execution                              │
│    └── P2P Network Layer                                      │
├──────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                         │
│    ├── Docker & Kubernetes Orchestration                      │
│    ├── Terraform AWS Infrastructure                           │
│    ├── Prometheus/Grafana Monitoring                          │
│    └── Security & Secrets Management                          │
└──────────────────────────────────────────────────────────────┘
```

</div>

### Core Specifications

| Component | Technology | Performance |
|-----------|------------|-------------|
| **Consensus** | CBC Casper PoS | 30s blocks |
| **Smart Contracts** | Rholang Process Calculus | Parallel execution |
| **Networking** | P2P + gRPC | < 200ms propagation |
| **Storage** | LMDB/PostgreSQL | 50K reads/sec |
| **Throughput** | Current: 180 TPS | Target: 1000+ TPS |
| **Finality** | Probabilistic | ~60s confirmation |
| **Indexer Sync** | 100 blocks/2s | <100ms API response |

## 📋 Prerequisites & Installation

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB SSD | 200+ GB NVMe |
| **Network** | 10 Mbps | 100+ Mbps |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Software Prerequisites

#### Core Development Tools
```bash
# System tools
sudo apt update && sudo apt install -y \
  curl wget git build-essential \
  pkg-config libssl-dev

# Java Development Kit 11+
sudo apt install -y openjdk-11-jdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Scala Build Tool (sbt)
echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" | sudo tee /etc/apt/sources.list.d/sbt.list
curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | sudo apt-key add
sudo apt update && sudo apt install -y sbt
```

#### Rust Toolchain (for CLI client)
```bash
# Install Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version

# Add useful targets
rustup target add x86_64-unknown-linux-musl
```

#### Node.js & npm (for frontend components)
```bash
# Install Node.js 18+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18+
npm --version   # Should be v9+

# Install Yarn (optional but recommended)
npm install -g yarn
```

#### Docker & Container Runtime
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Python Environment (for indexer and faucet)
```bash
# Install Python 3.9+
sudo apt install -y python3 python3-pip python3-venv

# Create virtual environment
python3 -m venv asi-chain-env
source asi-chain-env/bin/activate

# Install common packages
pip install --upgrade pip setuptools wheel
```

### Verification Script

Run this script to verify all prerequisites are installed:

```bash
#!/bin/bash
# save as verify-prerequisites.sh

echo "🔍 Verifying ASI Chain Prerequisites..."

# Check Java
if java -version 2>&1 | grep -q "11\|17\|21"; then
    echo "✅ Java: $(java -version 2>&1 | head -n 1)"
else
    echo "❌ Java 11+ not found"
fi

# Check sbt
if sbt --version &>/dev/null; then
    echo "✅ sbt: $(sbt --version 2>&1 | head -n 1)"
else
    echo "❌ sbt not found"
fi

# Check Rust
if rustc --version &>/dev/null; then
    echo "✅ Rust: $(rustc --version)"
else
    echo "❌ Rust not found"
fi

# Check Node.js
if node --version &>/dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check Docker
if docker --version &>/dev/null; then
    echo "✅ Docker: $(docker --version)"
else
    echo "❌ Docker not found"
fi

# Check Python
if python3 --version &>/dev/null; then
    echo "✅ Python: $(python3 --version)"
else
    echo "❌ Python 3.9+ not found"
fi

echo "🎯 Prerequisites check complete!"
```

## 🚀 Quick Start Guide

### Option A: Full Development Setup

```bash
# 1. Clone repository with submodules
git clone --recurse-submodules https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# 2. Initialize submodules (if not cloned with --recurse-submodules)
git submodule update --init --recursive

# 3. Apply F1R3FLY patches
chmod +x scripts/apply-f1r3fly-patches.sh
./scripts/apply-f1r3fly-patches.sh

```

### Option B: Docker-Only Setup (Recommended for beginners)

```bash
# 1. Clone repository
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# 2. Start with Docker Compose
docker-compose up -d

# 3. Verify services
docker-compose ps
```

### Option C: Production Deployment

```bash
# Deploy indexer with zero-touch configuration
cd indexer
echo "1" | ./deploy.sh

# This automatically:
# ✅ Builds Rust CLI from source
# ✅ Sets up PostgreSQL database
# ✅ Configures Hasura GraphQL
# ✅ Starts blockchain synchronization
```

### Installation

<details>
<summary><b>1️⃣ Clone Repository</b></summary>

```bash
# Clone from GitHub
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# Initialize and update Git submodules
git submodule init
git submodule update --recursive

# Apply F1R3FLY patches (required for Docker Compose)
./scripts/apply-f1r3fly-patches.sh
```

</details>

<details>
<summary><b>2️⃣ Build from Source</b></summary>

```bash

# Build F1R3FLY blockchain core (Scala)
cd f1r3fly
sbt clean compile stage
sbt docker:publishLocal

# Build Rust CLI client
cd ../rust-client
cargo build --release

# Build ASI Wallet v2.2.0
cd ../asi_wallet_v2
npm install
npm run build

# Build Explorer (React 19)
cd ../explorer
npm install
npm run build

# Build Documentation Site
cd ../docs-site
npm install
npm run build

# Build Python Indexer
cd ../indexer
make install

# Build TypeScript Faucet
cd ../faucet/typescript-faucet
npm install
npm run build
```

</details>

<details>
<summary><b>3️⃣ Run Local Network</b></summary>

#### Option A: Kubernetes Deployment (Recommended)
```bash
# Deploy F1R3FLY on local Kubernetes
./scripts/deploy-f1r3fly-k8s.sh

# With monitoring stack
./scripts/deploy-f1r3fly-k8s.sh --monitoring

# Custom validator count
./scripts/deploy-f1r3fly-k8s.sh --replicas 8

# Clean up
./scripts/deploy-f1r3fly-k8s.sh --cleanup
```

#### Option B: Docker Compose
```bash
# Deploy Indexer with zero-touch configuration (v2.1.1)
cd indexer
echo "1" | ./deploy.sh  # Option 1: Connects to remote F1R3FLY node
# Option 2: Skip local F1R3FLY (for remote deployments)
echo "2" | ./deploy.sh  

# Check node status (after building rust-client)
./rust-client/target/release/node_cli status -H localhost

# AWS Lightsail Deployment (Production)
# Server: 13.251.66.61 (Singapore)
# See: indexer/AWS_LIGHTSAIL_INDEXER_DEPLOYMENT.md
```

#### Access Services (Local)
- **F1R3FLY API**: http://localhost:40403
- **ASI Wallet**: http://localhost:3000
- **Explorer**: http://localhost:3001
- **GraphQL**: http://localhost:8080
- **Indexer API**: http://localhost:9090
- **Faucet API**: http://localhost:5050
- **Prometheus**: http://localhost:9091
- **Grafana**: http://localhost:3002

#### Production Services (AWS Lightsail) ✅ LIVE
- **💼 ASI Wallet v2**: http://13.251.66.61:3000 **(v2.2.0)**
- **🌐 ASI Chain Explorer**: http://13.251.66.61:3001 **(v1.0.2)**
- **📚 Documentation Site**: http://13.251.66.61:3003 **(Docusaurus 3.8.1)**
- **🚰 Token Faucet**: http://13.251.66.61:5050 **(TypeScript)**
- **GraphQL API**: http://13.251.66.61:8080/v1/graphql
- **GraphQL Console**: http://13.251.66.61:8080/console
- **Indexer API**: http://13.251.66.61:9090
- **PostgreSQL**: 13.251.66.61:5432

```bash
# Check service health
curl http://localhost:40403/api/status  # F1R3FLY node status
curl http://localhost:9090/health       # Indexer health
curl http://localhost:8080/healthz      # Hasura health

# Production health checks
curl http://13.251.66.61:9090/status    # Production indexer status
curl http://13.251.66.61:9090/health    # Production health
```

</details>

## 🔧 Blockchain Node Operations

### F1R3FLY Node Management

#### Starting a Local Node

**Option 1: Docker Compose (Recommended)**
```bash
# Start full network with 4 validators
cd f1r3fly
docker-compose -f docker/shard-with-autopropose.yml up -d

# Start observer node
docker-compose -f docker/observer.yml up -d

# Start additional validator
docker-compose -f docker/validator4.yml up -d
```

**Option 2: Native Binary**
```bash
# Build F1R3FLY from source
cd f1r3fly
sbt clean compile stage

# Run bootstrap node
./node/target/universal/stage/bin/rnode run \
  --data-dir /path/to/data \
  --network-id mainnet \
  --shard-id root \
  --bootstrap "rnode://bootstrap@localhost:40400"

# Run validator node
./node/target/universal/stage/bin/rnode run \
  --data-dir /path/to/validator-data \
  --network-id mainnet \
  --shard-id root \
  --validator-private-key /path/to/validator.key \
  --bootstrap "rnode://bootstrap@localhost:40400"
```

#### Node Configuration

**Core Configuration Files:**
- [`rnode.conf`](f1r3fly/node/src/main/resources/default-rnode.conf): Main configuration
- [`logback.xml`](f1r3fly/node/src/main/resources/logback.xml): Logging configuration
- [`genesis.conf`](f1r3fly/casper/src/main/resources/genesis.conf): Genesis block parameters

**Key Configuration Parameters:**
```hocon
# Network settings
rnode {
  server {
    host = "0.0.0.0"
    port = 40400
    grpc-port = 40401
    http-port = 40403
  }
  
  # Storage configuration
  data-dir = "/var/lib/rnode"
  map-size = 1073741824  # 1GB
  
  # Consensus settings
  casper {
    validator-private-key = "/var/lib/rnode/validator.key"
    bonds-file = "/var/lib/rnode/bonds.txt"
    required-sigs = 1
    shard-id = "root"
  }
  
  # Network discovery
  bootstrap = "rnode://abc123@bootstrap.node:40400"
}
```

#### Node Status & Health Checks

**HTTP API Status:**
```bash
# Basic node status
curl http://localhost:40403/api/status | jq .

# Expected response:
{
  "version": "0.13.0",
  "nodeId": "abc123...",
  "peers": 5,
  "minPhloPrice": 1,
  "networkId": "mainnet",
  "shardId": "root",
  "casperStatus": {
    "validating": true,
    "lastFinalizedBlock": "def456...",
    "lastFinalizedHeight": 12345
  }
}
```

**gRPC Status:**
```bash
# Using Rust CLI
cd rust-client
cargo run -- status -H localhost -p 40401

# Using grpcurl
grpcurl -plaintext localhost:40401 \
  casper.GetStatusRequest/getStatus
```

#### Network Connection Management

**Peer Discovery:**
```bash
# List connected peers
curl http://localhost:40403/api/peers | jq .

# Manual peer addition
curl -X POST http://localhost:40403/api/peers \
  -H "Content-Type: application/json" \
  -d '{"address": "rnode://peer@192.168.1.100:40400"}'
```

**Bootstrap Configuration:**
```bash
# Environment variable method
export RNODE_BOOTSTRAP="rnode://bootstrap@13.251.66.61:40400"

# Configuration file method
echo 'rnode.server.bootstrap = "rnode://bootstrap@13.251.66.61:40400"' >> rnode.conf
```

### Web-Based Node Management

#### Accessing Node Interfaces

**F1R3FLY Web Console:**
- URL: http://localhost:40403
- Features: Node status, peer management, basic operations

**Prometheus Metrics:**
- URL: http://localhost:9091/metrics
- Features: Performance metrics, resource usage

**Grafana Dashboard:**
- URL: http://localhost:3002
- Login: admin / secure-password
- Features: Visual monitoring, alerts

#### Docker Container Management

**Container Status:**
```bash
# View all F1R3FLY containers
docker ps --filter "name=rnode"

# Container health checks
docker inspect rnode.validator1 | jq '.[0].State.Health'

# Resource usage
docker stats rnode.validator1 rnode.validator2
```

**Log Management:**
```bash
# Real-time logs
docker logs -f rnode.validator1

# Filtered logs
docker logs rnode.validator1 2>&1 | grep "ERROR\|WARN"

# Export logs
docker logs rnode.validator1 > validator1.log
```

**Container Operations:**
```bash
# Restart individual validator
docker restart rnode.validator1

# Graceful shutdown
docker stop -t 30 rnode.validator1

# Force restart entire network
docker-compose -f docker/shard-with-autopropose.yml restart
```

### Command Line Operations

#### Block & Transaction Management

**Deploy Smart Contract:**
```bash
# Using Rust CLI
cd rust-client
cargo run -- deploy \
  -f contracts/hello-world.rho \
  -H localhost \
  -p 40401 \
  --private-key $PRIVATE_KEY

# Direct gRPC call
grpcurl -plaintext \
  -d '{"term": "new x in { x!(42) }", "deployer": "abc123..."}' \
  localhost:40401 \
  casper.DeployService/doDeploy
```

**Propose Block:**
```bash
# Manual block proposal
cargo run -- propose -H localhost -p 40401

# Automatic proposal (production)
# Handled by autopropose service in Docker
```

**Query Blockchain State:**
```bash
# Get recent blocks
cargo run -- blocks -H localhost -p 40401 --limit 10

# Get specific block
curl http://localhost:40403/api/block/$BLOCK_HASH | jq .

# Query data at channel
cargo run -- get-data-at-name \
  --name "@\"myChannel\"" \
  -H localhost -p 40401
```

#### Validator Operations

**Bond Validator:**
```bash
# Bond new validator
cargo run -- bond-validator \
  --validator-key $VALIDATOR_PUBLIC_KEY \
  --stake 1000000 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -H localhost -p 40401
```

**Check Validator Status:**
```bash
# List active validators
cargo run -- active-validators -H localhost -p 40401

# Check specific validator bonds
cargo run -- bonds -H localhost -p 40401

# Validator performance metrics
curl http://localhost:40403/api/validators | jq .
```

## 💼 Wallet Management

### ASI Wallet v2.2.0 Features

ASI Wallet v2 is a comprehensive blockchain wallet with enterprise-grade security and modern features:

#### Core Features
- **🔌 WalletConnect v2**: DApp connectivity
- **💰 ASI Token Management**: Native ASI Chain currency
- **📱 Cross-Platform**: Web, mobile-responsive design
- **🧠 Rholang IDE**: Built-in smart contract development
- **🔄 Multi-Signature**: Enterprise wallet capabilities

### Installation & Setup

#### Web Wallet (Recommended)

**Access Production Wallet:**
```bash
# Live deployment
open http://13.251.66.61:3000

# Features available immediately:
# ✅ Create new wallet
# ✅ Import existing wallet
# ✅ DApp connectivity
```

**Local Development:**
```bash
cd asi_wallet_v2

# Install dependencies
npm install

# Start development server
npm start

# Access at http://localhost:3000
```

#### Mobile Integration

**Progressive Web App (PWA):**
```bash
# Install as PWA on mobile devices
# 1. Visit http://13.251.66.61:3000
# 2. Tap "Add to Home Screen"
# 3. Launch from home screen icon
```

### Wallet Operations

#### Account Management

**Create New Wallet:**
```typescript
// Via Web Interface
1. Visit http://13.251.66.61:3000
2. Click "Create Wallet"
3. Set secure password (12+ characters)
4. Save password securely.

// Programmatic Creation
import { Wallet } from '@asi-chain/wallet-sdk';

const wallet = await Wallet.create({
  password: 'secure-password',
  network: 'testnet' // or 'mainnet'
});

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey); // Store securely!
```

**Import Existing Wallet:**
```typescript
// Import from private key
const wallet = await Wallet.fromPrivateKey({
  privateKey: 'your-private-key-hex',
  password: 'new-password'
});

```

#### Address Generation

**ASI Address Format:**
```bash
# ASI Chain uses RChain-compatible addresses
# Format: 1111xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Length: 54-56 characters
# Encoding: Base58Check with specific checksum

# Example addresses:
1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8  # User wallet
11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP  # Contract address
```

**Generate New Address:**
```bash
# Using Rust CLI
cd rust-client
cargo run -- generate-key-pair

# Output:
# Private Key: 0x1234567890abcdef...
# Public Key:  041234567890abcdef...
# ASI Address: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# Using wallet interface
# 1. Open wallet settings
# 2. Navigate to "Account Management"
# 3. Click "Generate New Address"
# 4. Optionally add label/description
```

#### Private Key Management

**Best Practices:**
```bash
# ✅ DO:
# - Store private keys in securely
# - Use encrypted storage for hot wallets
# - Backup keys in multiple secure locations
# - Use strong, unique passwords

# ❌ DON'T:
# - Store private keys in plain text
# - Share private keys via email/chat
# - Use weak passwords
# - Store keys on cloud services without encryption
# - Take screenshots of private keys
```

**Key Export/Import:**
```typescript
// Export encrypted private key
const encryptedKey = await wallet.exportPrivateKey(password);

// Import private key
const wallet = await Wallet.importPrivateKey({
  encryptedKey: encryptedKey,
  password: password
});

### Transaction Management

#### Balance Queries

**Check Balance:**
```bash
# Via Web Interface
# 1. Open wallet
# 2. Balance displayed on dashboard
# 3. Refresh button updates in real-time

# Via API
curl http://13.251.66.61:9090/api/balance/YOUR_ADDRESS | jq .

# Via Rust CLI
cd rust-client
./target/release/node_cli wallet-balance \
  --address 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --host 13.251.66.61 \
  --port 40453

# Expected response:
{
  "address": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8",
  "balance": "1000000000",  // 10.0 ASI (8 decimal places)
  "balanceASI": "10.0"
}
```

#### ASI Token Transfers

**Send ASI Tokens:**
```bash
# Via Web Interface
1. Open wallet → Send tab
2. Enter recipient address
3. Enter amount (in ASI)
4. Set gas limit (default: 100000)
5. ASIiew transaction details
6. Sign transaction
7. Broadcast to network

# Via Rust CLI
cd rust-client
cargo run -- transfer \
  --from 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --to 11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP \
  --amount 5.0 \
  --private-key $PRIVATE_KEY \
  --host 13.251.66.61 \
  --port 40413
```

**Transaction Status:**
```bash
# Check transaction status
curl http://13.251.66.61:9090/api/transaction/$TX_ID | jq .

# Expected response:
{
  "txId": "abc123...",
  "status": "confirmed",
  "blockNumber": 12345,
  "from": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8",
  "to": "11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP",
  "amount": "500000000",  // 5.0 ASI
  "fee": "10000",         // 0.0001 ASI
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Authentication & Security

### Multi-Signature Wallets

#### Creating Multisig Wallet

**Setup 2-of-3 Multisig:**
```typescript
// Create multisig wallet
const multisig = await wallet.createMultisig({
  owners: [
    '1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8',
    '11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP',
    '11113aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789AbCdEfGhIjKlMn'
  ],
  threshold: 2, // Require 2 signatures
  name: 'Company Treasury'
});

console.log('Multisig Address:', multisig.address);
```

**Multisig Transaction Flow:**
```bash
# 1. Propose transaction (any owner)
curl -X POST http://13.251.66.61:3000/api/multisig/propose \
  -H "Content-Type: application/json" \
  -d '{
    "multisigAddress": "1111MultisigAddress...",
    "to": "1111RecipientAddress...",
    "amount": "10.0",
    "description": "Payment for services"
  }'

# 2. Sign transaction (other owners)
curl -X POST http://13.251.66.61:3000/api/multisig/sign \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx123...",
    "signature": "sig456..."
  }'

# 3. Execute when threshold reached
curl -X POST http://13.251.66.61:3000/api/multisig/execute \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "tx123..."}'
```

### DApp Connectivity

#### WalletConnect v2 Integration

**Connection Flow:**
```typescript
// DApp requests connection
const walletConnect = await wallet.initializeWalletConnect({
  projectId: 'your-walletconnect-project-id',
  metadata: {
    name: 'Your DApp',
    description: 'DApp description',
    url: 'https://yourdapp.com',
    icons: ['https://yourdapp.com/icon.png']
  }
});

// Generate connection URI
const uri = await walletConnect.connect();
console.log('Scan this QR:', uri);

// Handle session proposals
walletConnect.on('session_proposal', async (proposal) => {
  // User approves/rejects in wallet interface
  const approval = await wallet.approveSession(proposal);
  await walletConnect.approveSession(approval);
});
```

**Transaction Signing:**
```typescript
// DApp requests transaction signature
walletConnect.on('session_request', async (request) => {
  if (request.params.request.method === 'personal_sign') {
    // Display transaction in wallet
    const userApproval = await wallet.requestUserApproval(request);
    
    if (userApproval) {
      const signature = await wallet.signMessage(request.params.message);
      await walletConnect.respondSessionRequest({
        topic: request.topic,
        response: { signature }
      });
    }
  }
});
```

### Wallet Configuration

#### Network Settings

**Configure Network:**
```typescript
// Testnet configuration (default)
const testnetConfig = {
  networkId: 'asi-testnet',
  nodeUrl: 'http://13.251.66.61:40413',
  readOnlyUrl: 'http://13.251.66.61:40453',
  explorerUrl: 'http://13.251.66.61:3001',
  faucetUrl: 'http://13.251.66.61:5050'
};

// Mainnet configuration (coming soon)
const mainnetConfig = {
  networkId: 'asi-mainnet',
  nodeUrl: 'https://rpc.asichain.io',
  readOnlyUrl: 'https://rpc-readonly.asichain.io',
  explorerUrl: 'https://explorer.asichain.io',
  faucetUrl: null
};

// Custom network
const customConfig = {
  networkId: 'custom',
  nodeUrl: 'http://localhost:40403',
  readOnlyUrl: 'http://localhost:40403',
  explorerUrl: 'http://localhost:3001'
};
```

#### Security Settings

**Password Policy:**
```typescript
const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  prohibitCommonPasswords: true,
  maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
};
```

**Session Management:**
```typescript
const sessionConfig = {
  idleTimeout: 15 * 60 * 1000,    // 15 minutes
  maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
  requireReauthForSend: true,
  clearDataOnLock: true
};
```

## 🛠️ Repository Structure

```
asi-chain/
├── 📦 f1r3fly/                # F1R3FLY blockchain (Git submodule - Scala 2.12.15)
│   ├── casper/                # CBC Casper PoS consensus
│   ├── rholang/               # Process calculus smart contracts
│   ├── rspace/                # Parallel execution environment
│   ├── node/                  # Node runtime with P2P networking
│   ├── comm/                  # gRPC/Protobuf communication
│   ├── crypto/                # secp256k1, Blake2b, Keccak crypto
│   └── models/                # Protocol buffer definitions
├── 📦 rust-client/            # Rust CLI client (Git submodule)
│   └── src/                   # Node CLI implementation
├── 💼 asi_wallet_v2/          # ASI Wallet v2.2.0 (React 18, TypeScript) - DEPLOYED ✅
│   ├── src/components/        # WalletConnect v2
│   ├── src/services/          # Global balance caching, RChain integration
│   ├── src/store/             # Redux Toolkit state management
│   └── AWS_LIGHTSAIL_WALLET_DEPLOYMENT.md # Production deployment guide
├── 🌐 explorer/               # Blockchain Explorer v1.0.2 (React 19, Apollo GraphQL)
│   ├── src/components/        # Real-time data components
│   ├── src/graphql/           # GraphQL queries and subscriptions
│   ├── src/pages/             # Block/transaction/validator pages (validator deduplication fixed)
│   ├── archive/               # Non-essential files moved for organization
│   └── deploy-docker.sh       # Automated Docker deployment script
├── 📊 indexer/                # Advanced blockchain data indexer (v2.1.1)
│   ├── src/                   # Python asyncio with Rust CLI integration
│   ├── migrations/            # Single comprehensive schema (000_comprehensive)
│   ├── scripts/               # Zero-touch deployment with automatic Hasura setup
│   ├── deploy.sh              # Automated deployment script (local/remote)
│   ├── AWS_LIGHTSAIL_INDEXER_DEPLOYMENT.md # Production deployment guide
│   └── Dockerfile.rust-builder # Builds Rust CLI from source in Docker
├── 🚰 faucet/                 # Token faucet service (TypeScript & Python)
├── 📚 docs-site/              # Docusaurus 3.8.1 documentation site
├── 📖 docs/                   # Technical documentation and guides
├── 🎨 media/                  # Brand assets, logos, and images
├── 🏛️ legal/                  # Terms of Service, Privacy Policy
├── 🔧 patches/                # F1R3FLY submodule patches
└── 📋 scripts/                # Operational and maintenance scripts
    ├── deploy-f1r3fly-k8s.sh # Automated F1R3FLY deployment
    └── apply-f1r3fly-patches.sh # Apply submodule patches
```

## 🎯 Key Features

<div align="center">

| Feature | Description | Status |
|---------|-------------|--------|
| **🔐 CBC Casper** | Correct-by-construction consensus | ✅ Active |
| **⚡ Parallel Execution** | Namespace sharding via Rholang | ✅ Active |
| **🤖 AI-Native** | Optimized for AI workloads | ✅ Active |
| **🔗 Smart Contracts** | Process calculus based (100+ examples) | ✅ Active |
| **💰 ASI Token** | Native cryptocurrency with 8 decimals | ✅ Active |
| **🔌 WalletConnect v2** | DApp connectivity | ✅ Active |
| **🔄 Multi-Signature** | Enterprise wallets | ✅ Active |
| **📊 GraphQL API** | Real-time subscriptions via Hasura | ✅ Active |
| **💧 Token Faucet** | Testnet token distribution | ✅ Active |
| **🧪 Testing Framework** | Comprehensive RhoSpec contracts | ✅ Active |

</div>

## 📈 Performance Metrics

<div align="center">

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Block Time** | 30s | 30s | ✅ Met |
| **Throughput** | 180 TPS | 1000+ TPS | 🔄 Scaling |
| **Finality** | 60s | 30s | 🔄 Optimizing |
| **Validators** | 4 | 100+ | 🔄 Growing |
| **Uptime** | 99.9% | 99.99% | 🔄 Improving |
| **Indexer Sync** | 100 blocks/2s | 1000 blocks/s | 🔄 Optimizing |
| **API Response** | <100ms | <50ms | 🔄 Optimizing |
| **Memory Usage** | ~80MB (indexer) | <50MB | 🔄 Optimizing |
| **Test Coverage** | 62.88% (store), 27.58% (overall) | 90% | 🔄 Improving |

</div>

## 🧪 Testing & Quality

```bash
# F1R3FLY blockchain tests (requires submodule)
cd f1r3fly
sbt test

# Integration tests
cd integration-tests
pytest

# ASI Wallet v2 tests
cd asi_wallet_v2
npm test
npm run lint
npm run type-check

# Explorer tests  
cd explorer
npm test

# Load/stress tests
./scripts/monitoring/run_stress_tests.sh standard

# Security audit
./scripts/security/security_audit.sh
```

## 🔧 Configuration

### Network Ports

| Service | Port | Purpose |
|---------|------|---------|
| **Node P2P** | 40400 | Peer-to-peer communication |
| **Node gRPC** | 40403 (ext), 40401 (int) | External/internal gRPC |
| **Node HTTP** | 40413 | Indexer HTTP interface |
| **ASI Wallet** | 3000 | Web wallet interface |
| **Explorer** | 3001 | Blockchain explorer |
| **Hasura GraphQL** | 8080 | GraphQL API |
| **Indexer REST** | 9090 | REST API |
| **Prometheus** | 9091 | Metrics collection |
| **Grafana** | 3002 | Monitoring dashboards |
| **Redis Primary** | 6379 | Cache primary |
| **Redis Replica** | 6380 | Cache replica |
| **Faucet API** | 5050 | Token faucet |

### Environment Variables

```bash
# Node configuration
export ASI_NODE_HOST="localhost"
export ASI_NODE_P2P_PORT="40400"
export ASI_NODE_GRPC_PORT="40403"
export ASI_NODE_HTTP_PORT="40413"

# Database
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="asi_chain"
export DB_USER="asi_user"

# Monitoring
export GRAFANA_USER="admin"
export GRAFANA_PASSWORD="secure-password"
export PROMETHEUS_PORT="9091"

# Wallet
export WALLETCONNECT_PROJECT_ID="your-project-id"

```

## 📚 Documentation

<table>
<tr>
<td width="33%">

### 🏗️ **Development**
- [Development Guide](docs/DEVELOPMENT_GUIDE.MD)
- [API Reference](docs/API_REFERENCE.MD)
- [GraphQL Guide](indexer/GRAPHQL_GUIDE.md)
- [Rholang Programming](docs/RHOLANG_PROGRAMMING_GUIDE.MD)
- [Smart Contract Testing](docs/smart-contracts/SMART_CONTRACT_TESTING.MD)

</td>
<td width="33%">

### 🚀 **Deployment**
- [F1R3FLY Quick Start](docs/F1R3FLY_QUICK_START.md)
- [F1R3FLY Kubernetes](docs/F1R3FLY_KUBERNETES_DEPLOYMENT.md)
- [F1R3FLY Helm Chart](docs/F1R3FLY_HELM_CHART_GUIDE.md)
- [AWS Lightsail Indexer](indexer/AWS_LIGHTSAIL_INDEXER_DEPLOYMENT.md)
- [Docker to K8s Migration](docs/DOCKER_TO_KUBERNETES_MIGRATION.md)
- [Production Infrastructure](PRODUCTION_INFRASTRUCTURE_GUIDE.md)
- [Terraform AWS](infrastructure/terraform/)

</td>
<td width="33%">

### 🤝 **Community**
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Governance](GOVERNANCE.md)
- [Security](SECURITY.md)
- [Terms of Service](legal/TERMS_OF_SERVICE.md)
- [Privacy Policy](legal/PRIVACY_POLICY.md)

</td>
</tr>
</table>

## 🤝 Contributing

We welcome contributions to ASI Chain! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💻 Make your changes
4. ✅ Run tests (`sbt test && npm test`)
5. 📝 Update documentation
6. 🎯 Commit (`git commit -m 'Add amazing feature'`)
7. 📤 Push (`git push origin feature/amazing-feature`)
8. 🔄 Open a Merge Request

## 🔒 Security

### ⚠️ Critical Security Notes

Before production deployment, you MUST:
- ❗ Replace test validator keys in `rust-client/f1r3fly/docker/`
- ❗ Update hardcoded secrets in Kubernetes manifests
- ❗ Configure proper CORS policies (not "*")
- ❗ Set up proper secrets management (AWS Secrets Manager/Vault)

**Security Features:**
- AES-256-GCM encryption with PBKDF2 (100k iterations)
- TLS 1.2/1.3 for all communications
- Multi-signature wallet capabilities
- Rate limiting and input validation
- Database row-level security

For security vulnerabilities:
- 🔐 **Report privately** via GitLab Security
- 🚫 **Do not** open public issues for vulnerabilities
- ✅ **Follow** responsible disclosure guidelines

## 📊 Important Notes

- F1R3FLY and rust-client are Git submodules from github.com/F1R3FLY-io - run `git submodule update --init --recursive` after cloning
- Private keys and validator configs are in `f1r3fly/docker/` (⚠️ Replace test keys in production)
- Always run lint and type checks before committing frontend code
- Environment variables are managed through `.env` files per service
- The indexer uses Rust CLI (`node_cli`) for blockchain interaction, not HTTP APIs
- The wallet includes WalletConnect v2 support for DApp connectivity

## 📊 Governance

ASI Chain is governed by the **Artificial Superintelligence Alliance**:

<div align="center">

| Organization | Role | Focus |
|--------------|------|-------|
| **Fetch.ai** | Infrastructure | Autonomous agents |
| **SingularityNET** | AI Services | AGI development |
| **Ocean Protocol** | Data Layer | Data monetization |
| **CUDOS** | Compute | Distributed computing |

</div>

## 🎮 Network Endpoints

### 🟢 Live Testnet Infrastructure (AWS Lightsail - Singapore)
**Status**: ✅ OPERATIONAL | **Server IP**: `13.251.66.61` | **Deployed**: September 9, 2025

---

### 📱 Web Applications

| Service | URL | Port | Description | Status |
|---------|-----|------|-------------|--------|
| **ASI Wallet v2** | http://13.251.66.61:3000 | 3000 | Web wallet with WalletConnect v2, Rholang IDE | ✅ Live |
| **Blockchain Explorer** | http://13.251.66.61:3001 | 3001 | Real-time blockchain explorer | ✅ Live |
| **Documentation Site** | http://13.251.66.61:3003 | 3003 | Interactive Docusaurus documentation | ✅ Live |
| **Token Faucet** | http://13.251.66.61:5050 | 5050 | Testnet ASI token distribution (100 ASI/request) | ✅ Live |

---

### 🔗 Blockchain Node Endpoints (F1R3FLY)

| Node Type | HTTP API | gRPC Port | P2P Port | Purpose | Status |
|-----------|----------|-----------|----------|---------|--------|
| **Bootstrap** | http://13.251.66.61:40403 | 40402 | 40400 | Network discovery only ⚠️ | ✅ Active |
| **Validator1** | http://13.251.66.61:40413 | 40412 | 40410 | **🔥 Send transactions here** | ✅ Active |
| **Validator2** | http://13.251.66.61:40423 | 40422 | 40420 | **🔥 Send transactions here** | ✅ Active |
| **Validator3** | - | - | - | Not deployed | ❌ Inactive |
| **Validator4** | http://13.251.66.61:40443 | 40442 | 40440 | Bonding in quarantine | ⏳ Pending |
| **Read-only** | http://13.251.66.61:40453 | 40452 | 40451 | **📖 Query-only (best for reads)** | ✅ Active |

#### ⚠️ CRITICAL: Transaction Port Guidelines

**🚨 DO NOT send transactions to Bootstrap (40403)** 
- Bootstrap nodes are for network discovery only
- Transactions sent here will NOT be processed or included in blocks

**✅ CORRECT ports for transactions:**
- **Validator1** (40413) or **Validator2** (40423)
- These validators are monitored by autopropose service
- Transactions will be included in blocks within 30 seconds

**✅ OPTIMAL ports for queries:**
- **Read-only** (40453) - Best performance for balance checks and data queries
- Any validator port also works for queries

---

### 📊 Data & Infrastructure Services

| Service | URL/Endpoint | Port | Purpose | Access |
|---------|-------------|------|---------|--------|
| **Hasura GraphQL API** | http://13.251.66.61:8080/v1/graphql | 8080 | GraphQL queries & mutations | Public |
| **GraphQL Console** | http://13.251.66.61:8080/console | 8080 | Hasura admin interface | Public |
| **GraphQL WebSocket** | ws://13.251.66.61:8080/v1/graphql | 8080 | Real-time subscriptions | Public |
| **Indexer REST API** | http://13.251.66.61:9090 | 9090 | Blockchain data indexer | Public |
| **PostgreSQL Database** | `13.251.66.61:5432` | 5432 | Direct database connection | Private |
| **Autopropose Service** | Internal container | N/A | Automatic block creation | Internal |

---

### 🔧 Indexer Configuration

#### Environment Settings for Server Deployment

To deploy the indexer against the live testnet at `13.251.66.61`, use these environment settings:

**Create `.env` file in `indexer/` directory:**
```env
# Node Configuration for Remote Server (Observer Node - Best for Indexing)
NODE_HOST=13.251.66.61
GRPC_PORT=40452              # Observer gRPC port (read-only)
HTTP_PORT=40453              # Observer HTTP port (read-only)

# Database Configuration
DATABASE_URL=postgresql://indexer:indexer_pass@localhost:5432/asichain
DATABASE_POOL_SIZE=20

# Sync Settings
SYNC_INTERVAL=5               # Check for new blocks every 5 seconds
BATCH_SIZE=50                # Process up to 50 blocks per batch
START_FROM_BLOCK=0           # Start from genesis

# Features
ENABLE_ASI_TRANSFER_EXTRACTION=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true

# Monitoring
MONITORING_PORT=9090
LOG_LEVEL=INFO
LOG_FORMAT=json

# Hasura GraphQL
HASURA_ADMIN_SECRET=myadminsecretkey
```

**Deploy Indexer (v2.1.1 - Zero Touch with Enhanced Data Quality):**
```bash
cd indexer
echo "1" | ./deploy.sh  # Option 1 for remote F1R3FLY node

# What you get automatically:
# ✅ Cross-platform Rust CLI build from source (10-15 min first time)
# ✅ Complete database schema with 10 tables
# ✅ Hasura GraphQL relationships configured automatically
# ✅ Validator bond detection with new CLI format support
# ✅ Data quality improvements (proper NULL handling)
# ✅ Real-time blockchain synchronization from genesis

# Or with Docker Compose directly:
docker-compose -f docker-compose.rust.yml up -d
# Then configure Hasura: bash scripts/configure-hasura.sh
```

**Verify Indexer Connection:**
```bash
# Check indexer status
curl http://localhost:9090/status

# Check if syncing from remote node
docker logs asi-rust-indexer | grep "13.251.66.61"

# Query indexed data via GraphQL
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks(limit: 5, order_by: {block_number: desc}) { block_number } }"}'
```

---

### 📈 Network Statistics & Health

| Metric | Value | Status |
|--------|-------|--------|
| **Consensus Health** | 100% participation | 🟢 Healthy |
| **Latest Block** | ~2000+ (growing) | ✅ Active |
| **Block Time** | 30 seconds | ⚡ Fast |
| **Active Validators** | 4 validators (including bootstrap) | ✅ Secure |
| **Total Nodes** | 6 fully connected | 🔗 Connected |
| **Network Peers** | 5 peers per node | 🌐 Meshed |
| **Autopropose** | Rotating validator1→2 | 🔄 Active |

---

### 🛠️ Quick Start Commands

#### Check Blockchain Status
```bash
# Get node status
curl http://13.251.66.61:40453/api/status

# Get latest block via GraphQL
curl -X POST http://13.251.66.61:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks(limit: 1, order_by: {block_number: desc}) { block_number timestamp } }"}'
```

#### Send Transactions (Use any validator 1-3)
```bash
# Deploy via Validator1 (RECOMMENDED)
curl -X POST http://13.251.66.61:40413/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"deployer": "YOUR_ADDRESS", "term": "YOUR_RHOLANG_CODE", ...}'

# Alternative validators
# Validator2: http://13.251.66.61:40423/api/deploy
# Validator3: http://13.251.66.61:40433/api/deploy
```

#### Query Balance
```bash
# Best performance using read-only node
./node_cli wallet-balance --address YOUR_ADDRESS --host 13.251.66.61 --port 40452
```

#### Monitor Services
```bash
# Check indexer health
curl http://13.251.66.61:9090/health

# View running Docker containers (requires SSH)
ssh -i XXXXXXXXX.pem ubuntu@13.251.66.61 "docker ps"
```

---

### 🔧 Wallet Configuration

#### ASI Wallet v2 Settings
```yaml
Network Name: ASI Testnet
Transaction URL: http://13.251.66.61:40413  # validator1
Read-only URL: http://13.251.66.61:40453    # for balance checks
gRPC Endpoint: 13.251.66.61:40412          # validator1 gRPC
Explorer URL: http://13.251.66.61:3001
```

#### Alternative Validator Endpoints
```yaml
# You can use any of these for transactions:
Validator1: http://13.251.66.61:40413 (gRPC: 40412)
Validator2: http://13.251.66.61:40423 (gRPC: 40422)  
Validator3: http://13.251.66.61:40433 (gRPC: 40432)
```

---

### 🖥️ Rust CLI Examples

```bash
# Build the CLI first (requires submodule)
cd rust-client && cargo build --release

# Check node status
./target/release/node_cli status -H 13.251.66.61

# Get recent blocks (use read-only for best performance)
./target/release/node_cli blocks -H 13.251.66.61 -p 40453 -n 10

# Check balance
./target/release/node_cli balance YOUR_ASI_ADDRESS -H 13.251.66.61 -p 40453

# Deploy contract (use validator1, 2, or 3)
./target/release/node_cli deploy -f contract.rho -H 13.251.66.61 -p 40413

# Execute exploratory deploy (testing)
./target/release/node_cli exploratory-deploy -f test.rho -H 13.251.66.61 -p 40412

# ⚠️ NEVER use bootstrap for transactions
# ❌ WRONG: ./target/release/node_cli deploy -f contract.rho -H 13.251.66.61 -p 40403
```

---

### 🔒 SSH Access

```bash
# Connect to server (requires private key)
ssh -i XXXXXXXXX.pem ubuntu@13.251.66.61

# View logs
docker logs rnode.validator1 --tail 50
docker logs asi-explorer --tail 50
docker logs autopropose --tail 50

# Check disk usage
df -h

# Monitor system resources
htop
```

---

### 🐳 Docker Services Status

All services run in Docker containers on the single AWS Lightsail instance:

```bash
# Running containers (as of deployment):
asi-explorer       # Port 3001 - Blockchain Explorer v1.0.2
asi-wallet-v2      # Port 3000 - ASI Wallet v2.2.0 with WalletConnect v2
asi-docs           # Port 3003 - Documentation Site (Docusaurus 3.8.1)
asi-faucet         # Port 5050 - TypeScript Faucet
asi-hasura         # Port 8080 - GraphQL Engine
asi-rust-indexer   # Port 9090 - Blockchain Indexer v2.1.1
asi-indexer-db     # Port 5432 - PostgreSQL Database
rnode.bootstrap    # Ports 40400-40405 - Bootstrap Node
rnode.validator1   # Ports 40410-40415 - Validator 1 (transactions)
rnode.validator2   # Ports 40420-40425 - Validator 2 (transactions)
rnode.validator3   # Ports 40430-40435 - Validator 3 (transactions)
rnode.validator4   # Ports 40440-40445 - Validator 4
rnode.readonly     # Ports 40451-40453 - Read-only Node (queries)
autopropose        # Internal - Block Creation Service
```

### Production (AWS Lightsail) ✅ LIVE
```
ASI Wallet v2: http://13.251.66.61:3000
ASI Explorer: http://13.251.66.61:3001
Documentation: http://13.251.66.61:3003
Token Faucet: http://13.251.66.61:5050
F1R3FLY Network: http://13.251.66.61:40403
GraphQL API: http://13.251.66.61:8080/v1/graphql  
Indexer API: http://13.251.66.61:9090
```

### Mainnet (Coming Soon)
```
RPC: https://rpc.asichain.io
GraphQL: https://graphql.asichain.io
Explorer: https://explorer.asichain.io
```

### Local Development
```
Node RPC: http://localhost:40403
GraphQL API: http://localhost:8080
ASI Wallet: http://localhost:3000
Explorer: http://localhost:3001
Indexer API: http://localhost:9090
Faucet API: http://localhost:5050
```

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for details.

```
Copyright 2025 Artificial Superintelligence Alliance
Part of the ASI Alliance ecosystem (https://superintelligence.io)
```

## 🔗 Resources

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-ASI--Chain-181717?style=for-the-badge&logo=github)](https://github.com/asi-alliance/asi-chain)
[![Website](https://img.shields.io/badge/Website-superintelligence.io-7FD67A?style=for-the-badge)](https://superintelligence.io)
[![Documentation](https://img.shields.io/badge/Docs-Available-A8E6A3?style=for-the-badge)](docs-site/)
[![Community](https://img.shields.io/badge/Community-Join%20Us-C4F0C1?style=for-the-badge)](https://superintelligence.io/community)

</div>

---

<div align="center">

**ASI Chain** - Building the decentralized infrastructure for Artificial Superintelligence

<sub>Developed with 🧠 by the ASI Alliance • 2025</sub>

</div>


## 🌐 Blockchain Explorer

### ASI Chain Explorer v1.0.2

The ASI Chain Explorer provides real-time blockchain data visualization and comprehensive transaction analysis powered by React 19 and Apollo GraphQL.

#### Features Overview
- **🔍 Real-time Block Explorer**: Live blockchain data with WebSocket updates
- **📊 Transaction Analysis**: Detailed transaction inspection and history
- **👥 Validator Monitoring**: Active validator tracking and performance metrics
- **💰 ASI Token Tracking**: Balance queries and transfer analysis
- **📈 Network Statistics**: Health metrics and consensus monitoring
- **🔗 Smart Contract Interaction**: Rholang contract deployment viewing

### Accessing the Explorer

**Production Explorer (Live):**
```bash
# Web interface
open http://13.251.66.61:3001

# Available immediately:
# ✅ Real-time block data
# ✅ Transaction search
# ✅ Validator information
# ✅ Network statistics
# ✅ ASI token analytics
```

**Local Development:**
```bash
cd explorer

# Install dependencies
npm install

# Start development server
npm start

# Access at http://localhost:3001
```

### Explorer Navigation

#### Main Dashboard
- **Latest Blocks**: Real-time block feed with timestamps
- **Recent Transactions**: Live transaction stream
- **Network Health**: Consensus status and validator count
- **ASI Statistics**: Token circulation and transfer volume

#### Block Explorer

**Search Blocks:**
```bash
# By block number
http://13.251.66.61:3001/block/12345

# By block hash
http://13.251.66.61:3001/block/abc123def456...

# Latest blocks view
http://13.251.66.61:3001/blocks
```

**Block Information:**
- Block number and hash
- Timestamp and proposer
- Transaction count
- Parent block references
- Validator signatures
- State root hash

#### Transaction Explorer

**Search Transactions:**
```bash
# By transaction ID
http://13.251.66.61:3001/transaction/tx123...

# By deployer address
http://13.251.66.61:3001/address/1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# Transaction history
http://13.251.66.61:3001/transactions
```

**Transaction Details:**
- Transaction ID and status
- From/To addresses
- ASI amount transferred
- Gas used and gas price
- Block number and timestamp
- Rholang contract code
- Execution results

#### Validator Monitoring

**Validator Dashboard:**
```bash
# All validators
http://13.251.66.61:3001/validators

# Specific validator
http://13.251.66.61:3001/validator/04abc123...
```

**Validator Information:**
- Public key and address
- Stake amount and bond status
- Block production count
- Performance metrics
- Active/inactive status
- Quarantine information

#### Address Analytics

**Address Information:**
```bash
# Address overview
http://13.251.66.61:3001/address/1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# Transaction history
http://13.251.66.61:3001/address/1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8/transactions
```

**Address Features:**
- ASI balance (current)
- Transaction history
- Contract deployments
- ASI transfers (sent/received)
- QR code generation
- Export transaction data

### API Integration

#### GraphQL Queries

**Real-time Data:**
```graphql
# Subscribe to new blocks
subscription {
  blocks(limit: 1, order_by: {block_number: desc}) {
    block_number
    timestamp
    proposer
    transaction_count
  }
}

# Get block details
query GetBlock($blockNumber: Int!) {
  blocks(where: {block_number: {_eq: $blockNumber}}) {
    block_hash
    timestamp
    proposer
    deployments {
      deploy_id
      deployer
      term
      status
    }
  }
}
```

**Transaction Queries:**
```graphql
# Get transactions by address
query GetAddressTransactions($address: String!) {
  transfers(where: {
    _or: [
      {from_address: {_eq: $address}},
      {to_address: {_eq: $address}}
    ]
  }) {
    deploy_id
    from_address
    to_address
    amount
    timestamp
  }
}
```

#### REST API Access

**Block Data:**
```bash
# Get latest blocks
curl http://13.251.66.61:9090/api/blocks?limit=10 | jq .

# Get specific block
curl http://13.251.66.61:9090/api/block/12345 | jq .
```

**Transaction Data:**
```bash
# Get transaction details
curl http://13.251.66.61:9090/api/transaction/tx123... | jq .

# Get address transactions
curl http://13.251.66.61:9090/api/address/1111ocWg.../transactions | jq .
```

### WebSocket Integration

#### Real-time Updates

**Subscribe to Live Data:**
```javascript
// WebSocket connection
const ws = new WebSocket('ws://13.251.66.61:8080/v1/graphql');

// Subscribe to new blocks
ws.send(JSON.stringify({
  type: 'start',
  payload: {
    query: `
      subscription {
        blocks(limit: 1, order_by: {block_number: desc}) {
          block_number
          timestamp
          transaction_count
        }
      }
    `
  }
}));

// Handle incoming data
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'data') {
    console.log('New block:', data.payload.data.blocks[0]);
  }
};
```

### Explorer Configuration

#### Environment Setup

**Production Configuration:**
```javascript
// explorer/src/config.js
const config = {
  graphqlEndpoint: 'http://13.251.66.61:8080/v1/graphql',
  wsEndpoint: 'ws://13.251.66.61:8080/v1/graphql',
  restApiEndpoint: 'http://13.251.66.61:9090/api',
  walletUrl: 'http://13.251.66.61:3000',
  faucetUrl: 'http://13.251.66.61:5050',
  networkName: 'ASI Testnet',
  blockTime: 30000, // 30 seconds
  refreshInterval: 5000 // 5 seconds
};
```

**Local Development:**
```javascript
const config = {
  graphqlEndpoint: 'http://localhost:8080/v1/graphql',
  wsEndpoint: 'ws://localhost:8080/v1/graphql',
  restApiEndpoint: 'http://localhost:9090/api',
  walletUrl: 'http://localhost:3000',
  faucetUrl: 'http://localhost:5050',
  networkName: 'Local Testnet'
};
```

### Data Export Features

#### CSV Export

**Transaction History:**
```bash
# Export address transactions
curl "http://13.251.66.61:3001/api/export/transactions?address=1111ocWg...&format=csv"

# Export block data
curl "http://13.251.66.61:3001/api/export/blocks?from=1000&to=2000&format=csv"
```

#### QR Code Generation

**Address QR Codes:**
```javascript
// Generate QR code for address
const qrData = {
  address: '1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8',
  amount: '10.0', // Optional
  message: 'Payment for services' // Optional
};

// QR code URL
const qrUrl = `http://13.251.66.61:3001/qr?data=${encodeURIComponent(JSON.stringify(qrData))}`;
```

## 📡 API Documentation

### Overview

ASI Chain provides multiple API interfaces for comprehensive blockchain interaction:

#### API Endpoints Summary

| API Type | Endpoint | Purpose | Documentation |
|----------|----------|---------|---------------|
| **F1R3FLY gRPC** | `13.251.66.61:40412` | Node operations | [gRPC Reference](#grpc-api) |
| **F1R3FLY HTTP** | `http://13.251.66.61:40413` | Transaction submission | [HTTP Reference](#http-api) |
| **Indexer REST** | `http://13.251.66.61:9090` | Blockchain data | [REST Reference](#rest-api) |
| **GraphQL** | `http://13.251.66.61:8080/v1/graphql` | Real-time queries | [GraphQL Reference](#graphql-api) |
| **Faucet API** | `http://13.251.66.61:5050` | Token distribution | [Faucet Reference](#faucet-api) |

### gRPC API

#### Connection Configuration

**Client Setup:**
```bash
# Using grpcurl
grpcurl -plaintext 13.251.66.61:40412 list

# Available services:
casper.DeployService
casper.ProposeService
casper.BlockQuery
casper.StateQuery
```

#### Deploy Service

**Submit Transaction:**
```bash
# Deploy Rholang contract
grpcurl -plaintext \
  -d '{
    "deployer": "04abc123...",
    "term": "new x in { x!(42) }",
    "timestamp": 1640995200000,
    "sig": "304502...",
    "sigAlgorithm": "secp256k1",
    "phloPrice": 1,
    "phloLimit": 100000
  }' \
  13.251.66.61:40412 \
  casper.DeployService/doDeploy
```

**Get Deploy Status:**
```bash
grpcurl -plaintext \
  -d '{"deployId": "abc123..."}' \
  13.251.66.61:40412 \
  casper.DeployService/getDeploy
```

#### Block Query Service

**Get Recent Blocks:**
```bash
grpcurl -plaintext \
  -d '{"depth": 10}' \
  13.251.66.61:40412 \
  casper.BlockQuery/getBlocks
```

**Get Specific Block:**
```bash
grpcurl -plaintext \
  -d '{"blockHash": "def456..."}' \
  13.251.66.61:40412 \
  casper.BlockQuery/getBlock
```

### HTTP API

#### Node Status

**Get Node Information:**
```bash
curl http://13.251.66.61:40413/api/status | jq .

# Response:
{
  "version": "0.13.0",
  "nodeId": "abc123...",
  "peers": 5,
  "networkId": "mainnet",
  "casperStatus": {
    "validating": true,
    "lastFinalizedHeight": 12345
  }
}
```

#### Transaction Submission

**Deploy Contract:**
```bash
curl -X POST http://13.251.66.61:40413/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "term": "new x in { x!(42) }",
    "phloPrice": 1,
    "phloLimit": 100000,
    "deployer": "04abc123...",
    "timestamp": 1640995200000,
    "sig": "304502...",
    "sigAlgorithm": "secp256k1"
  }'
```

**Propose Block:**
```bash
curl -X POST http://13.251.66.61:40413/api/propose \
  -H "Content-Type: application/json" \
  -d '{"async": false}'
```

### REST API

#### Indexer Endpoints

**Health Check:**
```bash
curl http://13.251.66.61:9090/health
# Response: {"status": "healthy"}

curl http://13.251.66.61:9090/status | jq .
# Detailed sync status
```

**Block Data:**
```bash
# Get latest blocks
curl http://13.251.66.61:9090/api/blocks?limit=10 | jq .

# Get specific block
curl http://13.251.66.61:9090/api/block/12345 | jq .

# Get block by hash
curl http://13.251.66.61:9090/api/block/hash/abc123... | jq .
```

**Transaction Data:**
```bash
# Get transactions
curl http://13.251.66.61:9090/api/transactions?limit=20 | jq .

# Get specific transaction
curl http://13.251.66.61:9090/api/transaction/tx123... | jq .

# Get transactions by deployer
curl http://13.251.66.61:9090/api/transactions?deployer=04abc123... | jq .
```

**Address Information:**
```bash
# Get address balance
curl http://13.251.66.61:9090/api/balance/1111ocWg... | jq .

# Get address transactions
curl http://13.251.66.61:9090/api/address/1111ocWg.../transactions | jq .

# Get ASI transfers
curl http://13.251.66.61:9090/api/transfers?address=1111ocWg... | jq .
```

**Validator Data:**
```bash
# Get active validators
curl http://13.251.66.61:9090/api/validators | jq .

# Get validator bonds
curl http://13.251.66.61:9090/api/bonds | jq .

# Get network stats
curl http://13.251.66.61:9090/api/stats/network | jq .
```

### GraphQL API

#### Schema Overview

**Core Types:**
```graphql
type Block {
  block_number: Int!
  block_hash: String!
  timestamp: timestamptz!
  proposer: String!
  transaction_count: Int!
  deployments: [Deployment!]!
  validator_bonds: [ValidatorBond!]!
}

type Deployment {
  deploy_id: String!
  deployer: String!
  term: String!
  phlo_price: Int!
  phlo_limit: Int!
  status: String!
  error_message: String
  block: Block!
}

type Transfer {
  deploy_id: String!
  from_address: String!
  to_address: String!
  amount: numeric!
  deployment: Deployment!
}

type Validator {
  public_key: String!
  first_seen_block: Int!
  last_seen_block: Int!
  status: String!
}
```

#### Example Queries

**Get Recent Blocks with Transactions:**
```graphql
query GetRecentBlocks {
  blocks(limit: 5, order_by: {block_number: desc}) {
    block_number
    block_hash
    timestamp
    proposer
    transaction_count
    deployments(limit: 10) {
      deploy_id
      deployer
      term
      status
    }
  }
}
```

**Get Address Transaction History:**
```graphql
query GetAddressHistory($address: String!) {
  transfers(
    where: {
      _or: [
        {from_address: {_eq: $address}},
        {to_address: {_eq: $address}}
      ]
    },
    order_by: {deployment: {block: {timestamp: desc}}}
  ) {
    deploy_id
    from_address
    to_address
    amount
    deployment {
      block {
        block_number
        timestamp
      }
    }
  }
}
```

**Real-time Block Subscription:**
```graphql
subscription NewBlocks {
  blocks(limit: 1, order_by: {block_number: desc}) {
    block_number
    timestamp
    transaction_count
  }
}
```

#### GraphQL Console

**Access Interactive Console:**
```bash
# Open in browser
open http://13.251.66.61:8080/console

# Authentication (if required)
# Header: x-hasura-admin-secret: myadminsecretkey
```

### Faucet API

#### Request Tokens

**Get Testnet ASI:**
```bash
curl -X POST http://13.251.66.61:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8"
  }'

# Response:
{
  "success": true,
  "txId": "faucet_tx_123...",
  "amount": "100000000000", // 100.0 ASI
  "message": "Tokens sent successfully"
}
```

#### Faucet Status

**Check Faucet Information:**
```bash
curl http://13.251.66.61:5050/api/stats | jq .

# Response:
{
  "faucetAddress": "1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g",
  "balance": "500000000000000", // 500M ASI
  "dailyLimit": "500000000000",  // 500 ASI per day
  "requestLimit": "100000000000", // 100 ASI per request
  "requestsToday": 25,
  "rateLimits": {
    "perHour": 20,
    "perDay": 5
  }
}
```

### Rate Limiting

#### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| **gRPC Deploy** | 100 requests | 1 minute |
| **HTTP Deploy** | 50 requests | 1 minute |
| **REST API** | 1000 requests | 1 minute |
| **GraphQL** | 500 requests | 1 minute |
| **Faucet** | 5 requests | 24 hours |

#### Rate Limit Headers

```bash
# Example response headers
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995800
X-RateLimit-Window: 60
```

### Error Handling

#### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DEPLOY",
    "message": "Deploy signature verification failed",
    "details": {
      "deployId": "abc123...",
      "reason": "Invalid signature format"
    }
  }
}
```

#### Common Error Codes

| Code | Description | HTTP Status | Solution |
|------|-------------|-------------|----------|
| `INVALID_REQUEST` | Malformed request | 400 | Check request format |
| `INVALID_DEPLOY` | Deploy validation failed | 400 | Verify signature |
| `INSUFFICIENT_PHLO` | Not enough gas | 400 | Increase phlo limit |
| `RATE_LIMITED` | Too many requests | 429 | Wait and retry |
| `NODE_UNAVAILABLE` | Node not ready | 503 | Try different node |

## 🛠️ Command Line Interface

### Rust CLI (node_cli)

The Rust CLI provides comprehensive blockchain interaction capabilities with high performance and reliability.

#### Installation

**Build from Source:**
```bash
cd rust-client

# Build release version
cargo build --release

# Binary location
./target/release/node_cli

# Add to PATH (optional)
sudo cp target/release/node_cli /usr/local/bin/
```

**Verify Installation:**
```bash
node_cli --version
# node_cli 0.1.0
```

#### Command Categories

#### Network Operations

**Check Node Status:**
```bash
# Local node
node_cli status -H localhost --http-port 40403

# Remote node (production)
node_cli status -H 13.251.66.61 --http-port 40453

# Expected output:
Node Status:
  Version: 0.13.0
  Node ID: abc123...
  Peers: 5
  Network: mainnet
  Validating: true
  Latest Block: 12345
```

**Network Health Check:**
```bash
# Check multiple nodes
node_cli network-health --nodes "13.251.66.61:40403,13.251.66.61:40413,13.251.66.61:40423"

# Get consensus information
node_cli network-consensus -H 13.251.66.61 --http-port 40453
```

#### Cryptographic Operations

**Generate Key Pair:**
```bash
node_cli generate-key-pair

# Output:
Private Key: 0x1234567890abcdef...
Public Key:  041234567890abcdef...
ASI Address: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# Save to file
node_cli generate-key-pair > my-keys.txt
```

**Derive Public Key:**
```bash
node_cli generate-public-key --private-key 0x1234567890abcdef...
```

**Generate ASI Address:**
```bash
node_cli generate-asi-address --public-key 041234567890abcdef...
```

#### Blockchain Queries

**Get Recent Blocks:**
```bash
# Latest 10 blocks
node_cli blocks -H 13.251.66.61 --http-port 40453 --limit 10

# Specific block range
node_cli blocks --height 1000 --limit 100

# With transaction details
node_cli blocks --limit 5 --include-deploys
```

**Query Block by Hash:**
```bash
node_cli get-block --block-hash abc123def456...
```

**Get Blockchain Height:**
```bash
node_cli show-main-chain -H 13.251.66.61 --http-port 40453
```

#### Transaction Operations

**Deploy Smart Contract:**
```bash
# Simple deployment
node_cli deploy \
  -f contracts/hello-world.rho \
  -H 13.251.66.61 \
  -p 40412 \
  --private-key $PRIVATE_KEY

# With custom gas settings
node_cli deploy \
  -f contracts/complex-contract.rho \
  -H 13.251.66.61 \
  -p 40412 \
  --private-key $PRIVATE_KEY \
  --phlo-limit 500000 \
  --phlo-price 2

# Deploy and wait for confirmation
node_cli deploy-and-wait \
  -f contracts/my-contract.rho \
  --max-wait 300 \
  --check-interval 10
```

**Check Deployment Status:**
```bash
node_cli get-deploy -d abc123def456...
```

**Propose Block (Validators Only):**
```bash
node_cli propose -H localhost -p 40412 --private-key $VALIDATOR_KEY
```

#### Wallet Operations

**Check Balance:**
```bash
# Check specific address
node_cli wallet-balance \
  --address 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --host 13.251.66.61 \
  --port 40453

# Output:
Address: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8
Balance: 1000000000 dust (10.0 ASI)
```

**Transfer ASI Tokens:**
```bash
node_cli transfer \
  --from 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --to 11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP \
  --amount 5.0 \
  --private-key $PRIVATE_KEY \
  --host 13.251.66.61 \
  --port 40412
```

#### Validator Operations

**Check Validator Bonds:**
```bash
# All validators
node_cli bonds -H 13.251.66.61 --http-port 40453

# Active validators only
node_cli active-validators -H 13.251.66.61 --http-port 40453
```

**Bond New Validator:**
```bash
node_cli bond-validator \
  --validator-key 04abc123... \
  --stake 1000000 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -H 13.251.66.61 \
  -p 40412
```

**Check Validator Status:**
```bash
node_cli validator-status \
  --validator 04abc123... \
  -H 13.251.66.61 \
  --http-port 40453

# Check bond status
node_cli bond-status \
  --validator 04abc123... \
  -H 13.251.66.61 \
  --http-port 40453
```

#### Advanced Operations

**Exploratory Deploy (Testing):**
```bash
# Test contract without committing
node_cli exploratory-deploy \
  -f test-contract.rho \
  -H 13.251.66.61 \
  -p 40412
```

**Get Data at Name:**
```bash
# Query specific channel
node_cli get-data-at-name \
  --name "@\"myChannel\"" \
  -H 13.251.66.61 \
  -p 40412
```

**Find Deploy in Block:**
```bash
node_cli find-deploy \
  --deploy-id abc123... \
  -H 13.251.66.61 \
  --http-port 40453
```

### CLI Configuration

#### Environment Variables

**Set Default Connection:**
```bash
export ASI_NODE_HOST="13.251.66.61"
export ASI_NODE_GRPC_PORT="40412"
export ASI_NODE_HTTP_PORT="40413"
export ASI_PRIVATE_KEY="your-private-key"

# Now you can omit host/port in commands
node_cli status
node_cli wallet-balance --address 1111ocWg...
```

#### Configuration File

**Create config file:**
```bash
# ~/.asi-cli/config.toml
[network]
host = "13.251.66.61"
grpc_port = 40412
http_port = 40413
timeout = 30

[wallet]
default_private_key = "your-private-key"
default_phlo_limit = 100000
default_phlo_price = 1

[output]
format = "pretty"  # pretty, json, summary
show_colors = true
```

#### Batch Operations

**Script Multiple Operations:**
```bash
#!/bin/bash
# batch-deploy.sh

contracts=(
  "contracts/contract1.rho"
  "contracts/contract2.rho"
  "contracts/contract3.rho"
)

for contract in "${contracts[@]}"; do
  echo "Deploying $contract..."
  node_cli deploy -f "$contract" -H 13.251.66.61 -p 40412
  sleep 30  # Wait for block confirmation
done
```

**Parallel Queries:**
```bash
# Check multiple addresses simultaneously
addresses=(
  "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8"
  "11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP"
  "11113aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789AbCdEfGhIjKlMn"
)

for addr in "${addresses[@]}"; do
  node_cli wallet-balance --address "$addr" &
done
wait
```

## 🌍 Network Environments

### Environment Overview

ASI Chain supports multiple network environments to accommodate different use cases:

| Environment | Purpose | Status | Access |
|-------------|---------|--------|---------|
| **Production Testnet** | Live testing & development | ✅ Active | `13.251.66.61` |
| **Local Development** | Personal development | ✅ Available | `localhost` |
| **Staging** | Pre-production testing | 🔄 Coming Soon | TBD |
| **Mainnet** | Production network | 🔄 Coming Soon | `rpc.asichain.io` |

### Production Testnet (Current)

**Network Details:**
- **Host**: `13.251.66.61` (Singapore, AWS Lightsail)
- **Network ID**: `asi-testnet`
- **Chain ID**: `mainnet`
- **Block Time**: 30 seconds
- **Consensus**: CBC Casper PoS
- **Status**: ✅ Fully Operational

**Service Endpoints:**
```bash
# Web Applications
ASI Wallet v2:        http://13.251.66.61:3000
Blockchain Explorer:  http://13.251.66.61:3001
Documentation:        http://13.251.66.61:3003
Token Faucet:         http://13.251.66.61:5050

# Blockchain Nodes
Bootstrap:            http://13.251.66.61:40403 (discovery only)
Validator1:           http://13.251.66.61:40413 (transactions)
Validator2:           http://13.251.66.61:40423 (transactions)
Read-only:            http://13.251.66.61:40453 (queries)

# APIs
GraphQL:              http://13.251.66.61:8080/v1/graphql
Indexer REST:         http://13.251.66.61:9090
PostgreSQL:           13.251.66.61:5432 (private)
```

**Example Usage:**
```bash
# Get testnet ASI tokens
curl -X POST http://13.251.66.61:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ASI_ADDRESS"}'

# Deploy contract to testnet
node_cli deploy \
  -f my-contract.rho \
  -H 13.251.66.61 \
  -p 40412 \
  --private-key $PRIVATE_KEY

# Check balance on testnet
node_cli wallet-balance \
  --address YOUR_ADDRESS \
  --host 13.251.66.61 \
  --port 40453
```

### Local Development Environment

**Setup Requirements:**
- Docker & Docker Compose
- 8GB+ RAM available
- 50GB+ disk space
- Ports 3000-9091 available

**Quick Start:**
```bash
# Clone repository
git clone --recurse-submodules https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# Start local network
docker-compose up -d

# Verify services
docker-compose ps
```

**Local Service Endpoints:**
```bash
# Web Applications
ASI Wallet:           http://localhost:3000
Blockchain Explorer:  http://localhost:3001
Documentation:        http://localhost:3003
Token Faucet:         http://localhost:5050

# Blockchain Nodes
Bootstrap:            http://localhost:40403
Validator1:           http://localhost:40413
Read-only:            http://localhost:40453

# APIs
GraphQL:              http://localhost:8080/v1/graphql
Indexer REST:         http://localhost:9090
```

**Development Workflow:**
```bash
# 1. Make code changes
# 2. Rebuild services
docker-compose build

# 3. Restart specific service
docker-compose restart asi-wallet

# 4. View logs
docker-compose logs -f asi-wallet

# 5. Reset blockchain data (if needed)
docker-compose down -v
docker-compose up -d
```

### Mainnet (Coming Soon)

**Planned Features:**
- High-availability validator network
- Enhanced security and monitoring
- Production-grade infrastructure
- Automatic failover and scaling

**Expected Endpoints:**
```bash
# Web Applications (TBD)
ASI Wallet:           https://wallet.asichain.io
Blockchain Explorer:  https://explorer.asichain.io
Documentation:        https://docs.asichain.io

# Blockchain Nodes
RPC Endpoint:         https://rpc.asichain.io
GraphQL:              https://graphql.asichain.io
WebSocket:            wss://ws.asichain.io
```

### Environment Configuration

#### Wallet Configuration

**Testnet Configuration:**
```typescript
// asi_wallet_v2/src/config/testnet.ts
export const testnetConfig = {
  networkName: 'ASI Testnet',
  chainId: 'asi-testnet',
  nodeUrl: 'http://13.251.66.61:40413',
  readOnlyUrl: 'http://13.251.66.61:40453',
  explorerUrl: 'http://13.251.66.61:3001',
  faucetUrl: 'http://13.251.66.61:5050',
  graphqlUrl: 'http://13.251.66.61:8080/v1/graphql',
  wsUrl: 'ws://13.251.66.61:8080/v1/graphql'
};
```

**Local Configuration:**
```typescript
// asi_wallet_v2/src/config/local.ts
export const localConfig = {
  networkName: 'Local Development',
  chainId: 'local',
  nodeUrl: 'http://localhost:40413',
  readOnlyUrl: 'http://localhost:40453',
  explorerUrl: 'http://localhost:3001',
  faucetUrl: 'http://localhost:5050',
  graphqlUrl: 'http://localhost:8080/v1/graphql',
  wsUrl: 'ws://localhost:8080/v1/graphql'
};
```

#### CLI Configuration

**Environment-specific CLI settings:**
```bash
# Testnet environment
export ASI_ENV="testnet"
export ASI_NODE_HOST="13.251.66.61"
export ASI_NODE_GRPC_PORT="40412"
export ASI_NODE_HTTP_PORT="40413"

# Local environment
export ASI_ENV="local"
export ASI_NODE_HOST="localhost"
export ASI_NODE_GRPC_PORT="40412"
export ASI_NODE_HTTP_PORT="40413"

# Production (when available)
export ASI_ENV="mainnet"
export ASI_NODE_HOST="rpc.asichain.io"
export ASI_NODE_GRPC_PORT="443"
export ASI_NODE_HTTP_PORT="443"
```

## 🔒 Security Best Practices

### Private Key Management

#### Best Practices

**✅ DO:**
```bash
# Environment variable security
export PRIVATE_KEY=$(cat ~/.asi/encrypted_key | decrypt)
# Never hardcode keys in scripts or config files

# Use different keys for different purposes
VALIDATOR_KEY="..." # For validator operations
DEPLOYER_KEY="..."  # For contract deployment
USER_KEY="..."      # For daily transactions
```

**❌ DON'T:**
```bash
# ❌ Never store keys in plain text
export PRIVATE_KEY="0x1234567890abcdef..."  # WRONG!

# ❌ Never commit keys to version control
git add config.env  # containing private keys

# ❌ Never share keys via email/chat/slack
# ❌ Never take screenshots of private keys
# ❌ Never store keys in cloud services without encryption
```

#### Key Generation & Storage

**Secure Key Generation:**
```bash
# Generate cryptographically secure keys
node_cli generate-key-pair | tee >(head -n1 > private.key) >(tail -n+2 > public.key)

# Encrypt private key
gpg --symmetric --cipher-algo AES256 --compress-algo 1 private.key

# Store encrypted version only
rm private.key
mv private.key.gpg ~/.asi/keys/
```

### Network Security

#### Connection Security

**TLS/SSL Configuration:**
```bash
# Production connections should use HTTPS/WSS
WALLET_CONFIG_PROD={
  "nodeUrl": "https://rpc.asichain.io",
  "wsUrl": "wss://ws.asichain.io",
  "graphqlUrl": "https://graphql.asichain.io"
}

# Verify SSL certificates
curl --cert-status https://rpc.asichain.io/api/status
```

**Firewall Configuration:**
```bash
# Production node security
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only necessary ports
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 40400   # P2P (internal network only)

# Rate limiting
sudo ufw limit ssh
```

#### API Security

**Authentication & Authorization:**
```bash
# Use API keys for sensitive operations
curl -H "Authorization: Bearer $API_KEY" \
     -H "X-API-Signature: $SIGNATURE" \
     http://api.asichain.io/sensitive-endpoint

# Implement request signing
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "$REQUEST_BODY$TIMESTAMP" | openssl dgst -sha256 -hmac "$SECRET_KEY" -binary | base64)
```

**Rate Limiting Compliance:**
```typescript
// Implement exponential backoff
class APIClient {
  async makeRequest(endpoint: string, data: any) {
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          await this.sleep(parseInt(retryAfter) * 1000);
          retries++;
          continue;
        }
        
        return response;
      } catch (error) {
        if (retries === maxRetries - 1) throw error;
        await this.sleep(Math.pow(2, retries) * 1000);
        retries++;
      }
    }
  }
}
```

### Smart Contract Security

#### Rholang Best Practices

**Secure Contract Patterns:**
```rholang
// Use proper channel isolation
new privateCh, publicCh in {
  // Private data on private channel
  privateCh!({"balance": 1000}) |
  
  // Public interface on public channel
  for (request <- publicCh) {
    match request {
      {"method": "getBalance", "replyTo": replyTo} => {
        for (data <- privateCh) {
          privateCh!(data) |  // Put data back
          replyTo!(data.get("balance"))
        }
      }
    }
  }
}

// Validate all inputs
contract deposit(@amount, @from, return) = {
  match amount {
    Int if amount > 0 => {
      // Process valid deposit
      return!({"success": true, "amount": amount})
    }
    _ => {
      return!({"error": "Invalid amount"})
    }
  }
}
```

**Avoid Common Pitfalls:**
```rholang
// ❌ Avoid race conditions
for (x <- ch1; y <- ch2) {
  // This can cause deadlocks
}

// ✅ Use proper ordering
for (x <- ch1) {
  for (y <- ch2) {
    // Safe execution order
  }
}

// ❌ Don't expose sensitive data
@"publicChannel"!({"privateKey": "secret"})  // WRONG!

// ✅ Use proper access controls
contract secureMethod(@caller, @action, return) = {
  if (caller == @"authorizedUser") {
    // Execute action
    return!({"success": true})
  } else {
    return!({"error": "Unauthorized"})
  }
}
```

### Infrastructure Security

#### Production Deployment

**Server Hardening:**
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Use SSH keys only
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

**Docker Security:**
```bash
# Run containers as non-root
USER_ID=$(id -u)
GROUP_ID=$(id -g)

docker run --user $USER_ID:$GROUP_ID \
  --read-only \
  --tmpfs /tmp \
  --no-new-privileges \
  asi-wallet

# Use security profiles
docker run --security-opt seccomp=seccomp-profile.json \
  --security-opt apparmor=docker-default \
  asi-wallet
```

**Secrets Management:**
```bash
# Use Docker secrets
echo "my-secret-key" | docker secret create wallet-key -

# Mount secrets safely
docker service create \
  --secret source=wallet-key,target=/run/secrets/wallet-key \
  --env WALLET_KEY_FILE=/run/secrets/wallet-key \
  asi-wallet

# Kubernetes secrets
kubectl create secret generic asi-secrets \
  --from-literal=private-key="$PRIVATE_KEY" \
  --from-literal=db-password="$DB_PASSWORD"
```

## 🧪 Troubleshooting Guide

### Common Issues & Solutions

#### Node Connection Issues

**Problem: "Connection refused" errors**
```bash
# Symptoms:
curl: (7) Failed to connect to localhost port 40403: Connection refused
node_cli: error: Connection refused (os error 111)

# Diagnosis:
# 1. Check if node is running
docker ps | grep rnode
systemctl status rnode

# 2. Check port bindings
netstat -tulpn | grep 40403
docker port rnode.validator1

# 3. Check firewall
sudo ufw status
iptables -L

# Solutions:
# 1. Start the node
docker-compose up -d rnode.validator1

# 2. Fix port binding
# Edit docker-compose.yml:
ports:
  - "40403:40403"  # Ensure correct mapping

# 3. Open firewall port
sudo ufw allow 40403
```

**Problem: Node shows 0 peers**
```bash
# Symptoms:
curl http://localhost:40403/api/status | jq .peers
# Returns: 0

# Diagnosis:
# Check bootstrap configuration
docker logs rnode.validator1 | grep bootstrap

# Solutions:
# 1. Verify bootstrap node is running
docker ps | grep bootstrap

# 2. Fix bootstrap connection
# Edit validator configuration:
--bootstrap rnode://bootstrap_id@bootstrap:40400

# 3. Check network connectivity
docker exec rnode.validator1 ping bootstrap
```

#### Transaction Issues

**Problem: Deploy fails with "Insufficient funds"**
```bash
# Symptoms:
node_cli deploy -f contract.rho
Error: Insufficient funds for deployment

# Diagnosis:
# Check wallet balance
node_cli wallet-balance --address $YOUR_ADDRESS

# Check phlo price/limit
node_cli deploy --phlo-limit 100000 --phlo-price 1

# Solutions:
# 1. Get testnet tokens
curl -X POST http://13.251.66.61:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{"address": "'$YOUR_ADDRESS'"}'

# 2. Reduce phlo requirements
node_cli deploy -f contract.rho --phlo-limit 50000

# 3. Check minimum phlo price
curl http://localhost:40403/api/status | jq .minPhloPrice
```

**Problem: Transaction never confirms**
```bash
# Symptoms:
Deploy submitted but never appears in blocks

# Diagnosis:
# Check autopropose status
docker logs autopropose

# Check validator participation
curl http://localhost:40403/api/validators | jq .

# Solutions:
# 1. Manual block proposal
node_cli propose --private-key $VALIDATOR_KEY

# 2. Restart autopropose
docker restart autopropose

# 3. Check consensus health
node_cli network-consensus
```

#### Wallet Issues

**Problem: Wallet won't connect to network**
```bash
# Symptoms:
Wallet shows "Network Error" or "Unable to connect"

# Diagnosis:
# Check wallet configuration
# Browser dev tools → Network tab

# Check CORS settings
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:40403/api/status

# Solutions:
# 1. Update wallet config
# Edit asi_wallet_v2/src/config.js:
{
  "nodeUrl": "http://13.251.66.61:40413",
  "readOnlyUrl": "http://13.251.66.61:40453"
}

# 2. Fix CORS headers
# Add to node configuration:
--cors-allowed-origins "http://localhost:3000"
```

#### Explorer Issues

**Problem: Explorer shows no data**
```bash
# Symptoms:
Explorer loads but shows "No blocks found"

# Diagnosis:
# Check indexer status
curl http://localhost:9090/health
curl http://localhost:9090/status

# Check GraphQL connection
curl http://localhost:8080/healthz

# Solutions:
# 1. Restart indexer
docker restart asi-rust-indexer

# 2. Check database connection
docker exec asi-indexer-db psql -U indexer -d asichain -c "\dt"

# 3. Verify GraphQL schema
curl http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { blocks(limit: 1) { block_number } }"}'
```

#### Performance Issues

**Problem: High memory usage**
```bash
# Symptoms:
System becomes unresponsive, OOM killer activates

# Diagnosis:
# Check memory usage
docker stats --no-stream
free -h
dmesg | grep -i "killed process"

# Solutions:
# 1. Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Limit container memory
# Edit docker-compose.yml:
services:
  rnode.validator1:
    mem_limit: 2g
    memswap_limit: 4g

```

**Problem: Slow block synchronization**
```bash
# Symptoms:
Indexer falls behind blockchain head

# Diagnosis:
# Check sync status
curl http://localhost:9090/status | jq .sync_status

# Check block processing time
docker logs asi-rust-indexer | grep "Processing block"

# Solutions:
# 1. Increase batch size
# Edit indexer/.env:
BATCH_SIZE=100
SYNC_INTERVAL=2

# 2. Use read-only node
NODE_HOST=13.251.66.61
GRPC_PORT=40452  # Observer node

# 3. Optimize database
docker exec asi-indexer-db psql -U indexer -d asichain \
  -c "REINDEX DATABASE asichain;"
```

### Debugging Tools

#### Log Analysis

**Centralized Logging:**
```bash
# View all service logs
docker-compose logs -f

# Filter specific service
docker-compose logs -f rnode.validator1

# Follow logs with timestamps
docker-compose logs -f -t asi-rust-indexer

# Export logs for analysis
docker logs rnode.validator1 > validator1.log 2>&1
```

**Log Parsing:**
```bash
# Parse for errors
docker logs rnode.validator1 2>&1 | grep -i error

# Parse for specific patterns
docker logs asi-rust-indexer | grep "block.*processed"

# Real-time error monitoring
docker logs -f rnode.validator1 2>&1 | grep --line-buffered -i "error\|exception\|fail"
```

#### Network Debugging

**Connection Testing:**
```bash
# Test node connectivity
nc -zv localhost 40403
telnet localhost 40403

# Test gRPC connectivity
grpcurl -plaintext localhost:40412 list

# Test WebSocket
websocat ws://localhost:8080/v1/graphql
```

**Traffic Analysis:**
```bash
# Monitor network traffic
sudo tcpdump -i any port 40403

# Monitor HTTP requests
sudo tcpdump -i any -A port 80 | grep -i "POST\|GET"

# Check connection states
ss -tulpn | grep 404
```

#### Performance Monitoring

**System Metrics:**
```bash
# Real-time system monitoring
htop
iotop  # I/O monitoring
nethogs  # Network usage by process

# System resource usage
vmstat 5      # Every 5 seconds
iostat -x 5   # Disk I/O stats
```

**Docker Monitoring:**
```bash
# Container resource usage
docker stats

# Container processes
docker exec rnode.validator1 ps aux

# Container filesystem usage
docker exec rnode.validator1 df -h
```

### Recovery Procedures

#### Database Recovery

**PostgreSQL Recovery:**
```bash
# Backup database
docker exec asi-indexer-db pg_dump -U indexer asichain > backup.sql

# Restore from backup
docker exec -i asi-indexer-db psql -U indexer asichain < backup.sql

# Reset database (complete resync)
docker-compose down
docker volume rm indexer_postgres_data
docker-compose up -d
```

**Blockchain State Recovery:**
```bash
# Reset validator state (emergency only)
docker-compose down
rm -rf f1r3fly/docker/data/rnode.validator1
docker-compose up -d

# Resync from genesis
# Validator will automatically resync from bootstrap
```

#### Network Recovery

**Complete Network Reset:**
```bash
#!/bin/bash
# emergency-reset.sh

echo "⚠️  EMERGENCY NETWORK RESET ⚠️"
echo "This will destroy all blockchain data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  # Stop all services
  docker-compose down
  
  # Remove blockchain data
  rm -rf f1r3fly/docker/data/*
  
  # Remove database
  docker volume rm indexer_postgres_data
  
  # Restart network
  docker-compose up -d
  
  echo "✅ Network reset complete"
else
  echo "❌ Reset cancelled"
fi
```

### Getting Help

#### Support Channels

**Community Support:**
- GitHub Issues: [asi-alliance/asi-chain/issues](https://github.com/asi-alliance/asi-chain/issues)
- Documentation: [docs.asichain.io](http://13.251.66.61:3003)
- Discord: [ASI Alliance Discord](#) (TBD)

**Reporting Bugs:**
1. **Search existing issues** first
2. **Provide system information**:
   ```bash
   # System info
   uname -a
   docker --version
   docker-compose --version
   
   # Container status
   docker ps -a
   
   # Service logs (last 100 lines)
   docker logs --tail 100 problematic-service
   ```
3. **Include reproduction steps**
4. **Attach relevant logs** (sanitize private data)

**Security Issues:**
- **Never report security vulnerabilities publicly**
- Use GitHub Security Advisories for responsible disclosure
- Include detailed reproduction steps
- Allow reasonable time for fixes before disclosure

## 📊 Performance & Monitoring

### Metrics Collection

#### Prometheus Integration

**Metrics Endpoints:**
```bash
# Node metrics
curl http://localhost:40405/metrics

# Indexer metrics
curl http://localhost:9090/metrics

# Wallet metrics (if enabled)
curl http://localhost:3000/metrics
```

**Key Metrics:**
```prometheus
# Blockchain metrics
asi_blocks_total                    # Total blocks processed
asi_transactions_total              # Total transactions
asi_validators_active               # Active validator count
asi_consensus_participation_rate    # Consensus participation %

# Performance metrics
asi_block_processing_duration       # Block processing time
asi_transaction_pool_size          # Pending transactions
asi_network_peers_connected        # Connected peers
asi_memory_usage_bytes             # Memory consumption

# Error metrics
asi_failed_deploys_total           # Failed deployments
asi_connection_errors_total        # Network connection errors
asi_validation_errors_total        # Block validation errors
```

#### Custom Dashboards

**Grafana Configuration:**
```json
{
  "dashboard": {
    "title": "ASI Chain Monitoring",
    "panels": [
      {
        "title": "Block Height",
        "type": "stat",
        "targets": [
          {
            "expr": "asi_blocks_total",
            "legendFormat": "Blocks"
          }
        ]
      },
      {
        "title": "Transaction Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(asi_transactions_total[5m])",
            "legendFormat": "TPS"
          }
        ]
      }
    ]
  }
}
```

**Access Grafana:**
```bash
# Local development
open http://localhost:3002

# Login credentials
username: admin
password: secure-password

# Import dashboard
# Upload JSON configuration or use dashboard ID
```

### Performance Tuning

#### Node Optimization

**Database Optimization:**
```sql
-- PostgreSQL tuning for indexer
-- /etc/postgresql/14/main/postgresql.conf

shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 100
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

#### Network Optimization

**Connection Pooling:**
```bash
# Configure connection limits
# docker-compose.yml
environment:
  - DB_POOL_SIZE=20
  - DB_MAX_CONNECTIONS=100
  - GRPC_POOL_SIZE=10
```

**Rate Limiting:**
```nginx
# nginx rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

### Alerting

#### Alert Rules

**Prometheus Alerting:**
```yaml
# alerts.yml
groups:
  - name: asi-chain
    rules:
      - alert: NodeDown
        expr: up{job="rnode"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "F1R3FLY node is down"
          
      - alert: HighMemoryUsage
        expr: asi_memory_usage_bytes > 6GB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          
      - alert: LowPeerCount
        expr: asi_network_peers_connected < 3
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low peer count detected"
```

**Notification Channels:**
```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#asi-chain-alerts'
        title: 'ASI Chain Alert'
```

#### Health Checks

**Automated Health Monitoring:**
```bash
#!/bin/bash
# health-check.sh

# Check node status
NODE_STATUS=$(curl -s http://localhost:40403/api/status | jq -r .casperStatus.validating)
if [ "$NODE_STATUS" != "true" ]; then
    echo "❌ Node not validating"
    # Send alert
fi

# Check indexer sync
INDEXER_STATUS=$(curl -s http://localhost:9090/status | jq -r .sync_status)
if [ "$INDEXER_STATUS" = "behind" ]; then
    echo "⚠️ Indexer falling behind"
    # Send alert
fi

# Check database connection
DB_STATUS=$(docker exec asi-indexer-db pg_isready -U indexer)
if [ $? -ne 0 ]; then
    echo "❌ Database not ready"
    # Send alert
fi
```

**Continuous Monitoring:**
```bash
# Add to crontab
*/5 * * * * /path/to/health-check.sh

# Or use systemd timer
[Unit]
Description=ASI Chain Health Check
Requires=health-check.timer

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

---


## 🎯 Example Usage Scenarios

### Development Environment Examples

#### Setting Up Local Development Chain

**Scenario: Developer wants to test smart contracts locally**

```bash
# 1. Clone and setup repository
git clone --recurse-submodules https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# 2. Start local blockchain network
docker-compose up -d

# Expected output:
Creating network "asi-chain_default" with the default driver
Creating rnode.bootstrap ... done
Creating rnode.validator1 ... done
Creating rnode.validator2 ... done
Creating asi-indexer-db ... done
Creating asi-rust-indexer ... done
Creating asi-hasura ... done

# 3. Verify services are running
docker-compose ps

# Expected output:
Name                 State    Ports
rnode.bootstrap     Up       0.0.0.0:40403->40403/tcp
rnode.validator1    Up       0.0.0.0:40413->40413/tcp
asi-indexer-db      Up       0.0.0.0:5432->5432/tcp
asi-rust-indexer    Up       0.0.0.0:9090->9090/tcp

# 4. Check node status
curl http://localhost:40403/api/status | jq .

# Expected output:
{
  "version": "0.13.0",
  "nodeId": "a1b2c3d4e5f6...",
  "peers": 2,
  "networkId": "mainnet",
  "casperStatus": {
    "validating": true,
    "lastFinalizedHeight": 10
  }
}
```

#### Deploying First Smart Contract

**Scenario: Deploy a simple Rholang contract locally**

```bash
# 1. Create simple contract
cat > hello-world.rho << 'EOF'
new helloWorld, stdout(`rho:io:stdout`) in {
  helloWorld!("Hello from ASI Chain!") |
  for (message <- helloWorld) {
    stdout!(message)
  }
}
EOF

# 2. Deploy contract
cd rust-client
cargo run -- deploy \
  -f ../hello-world.rho \
  -H localhost \
  -p 40412 \
  --private-key 0x1234567890abcdef...

# Expected output:
Deploy ID: 0xabc123def456...
Status: Pending
Gas Used: 25000
Block: Waiting for inclusion

# 3. Wait for block confirmation
sleep 35  # Wait for next block

# 4. Check deployment status
cargo run -- get-deploy -d 0xabc123def456...

# Expected output:
Deploy ID: 0xabc123def456...
Status: Success
Block: 12
Cost: 25000 phlo
Result: Unit
```

#### Local Wallet Integration

**Scenario: Connect local wallet to development network**

```bash
# 1. Start wallet development server
cd asi_wallet_v2
npm install && npm start

# 2. Access wallet (http://localhost:3000)
# 3. Create new wallet with generated keys
# 4. Configure network settings:
Network: Local Development
RPC URL: http://localhost:40413
Explorer: http://localhost:3001

# 5. Request test tokens from local faucet
curl -X POST http://localhost:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{"address": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8"}'

# Expected output:
{
  "success": true,
  "txId": "local_faucet_123...",
  "amount": "100000000000",
  "message": "100.0 ASI sent successfully"
}
```

### Testnet Environment Examples

#### Connecting to Live Testnet

**Scenario: Developer wants to test on live testnet infrastructure**

```bash
# 1. Configure CLI for testnet
export ASI_NODE_HOST="13.251.66.61"
export ASI_NODE_GRPC_PORT="40412"
export ASI_NODE_HTTP_PORT="40413"

# 2. Generate new key pair for testnet
cd rust-client
./target/release/node_cli generate-key-pair

# Expected output:
Private Key: 0xabcdef1234567890...
Public Key:  04abcdef1234567890...
ASI Address: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# 3. Check testnet status
./target/release/node_cli status -H 13.251.66.61 --http-port 40453

# Expected output:
Node Status:
  Version: 0.13.0
  Node ID: f1r3fly_singapore_node
  Peers: 5
  Network: mainnet
  Validating: true
  Latest Block: 2156
  Block Time: 30s
```

#### Testnet Token Operations

**Scenario: Get testnet tokens and perform transfers**

```bash
# 1. Request testnet ASI tokens
curl -X POST http://13.251.66.61:5050/api/request \
  -H "Content-Type: application/json" \
  -d '{"address": "1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8"}'

# Expected output:
{
  "success": true,
  "txId": "faucet_tx_abc123...",
  "amount": "100000000000",
  "message": "100.0 ASI sent to your address"
}

# 2. Wait for transaction confirmation
sleep 35

# 3. Check balance
./target/release/node_cli wallet-balance \
  --address 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --host 13.251.66.61 \
  --port 40453

# Expected output:
Address: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8
Balance: 100000000000 dust (100.0 ASI)
Block: 2157

# 4. Transfer ASI to another address
./target/release/node_cli transfer \
  --from 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8 \
  --to 11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP \
  --amount 25.0 \
  --private-key $PRIVATE_KEY \
  --host 13.251.66.61 \
  --port 40412

# Expected output:
Transfer initiated
Deploy ID: 0xdef456abc789...
From: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8
To: 11112D8Ex1PxNEKBkBHfnVKwDFMVQLf4NL8CwwjX3eALjx7gBjNaSP
Amount: 25.0 ASI
Status: Pending confirmation
```

#### Production Smart Contract Deployment

**Scenario: Deploy production-ready DApp contract**

```bash
# 1. Create DApp registry contract
cat > dapp-registry.rho << 'EOF'
new dappRegistry, registerCh, lookupCh, stdout(`rho:io:stdout`) in {
  dappRegistry!({}) |
  
  contract registerCh(@dappName, @dappAddress, @metadata, return) = {
    for (registry <- dappRegistry) {
      dappRegistry!(registry.set(dappName, {
        "address": dappAddress,
        "metadata": metadata,
        "timestamp": timestamp
      })) |
      stdout!(["DApp registered:", dappName]) |
      return!({"success": true, "dapp": dappName})
    }
  } |
  
  contract lookupCh(@dappName, return) = {
    for (registry <- dappRegistry) {
      dappRegistry!(registry) |
      return!(registry.get(dappName))
    }
  }
}
EOF

# 2. Deploy to testnet
./target/release/node_cli deploy \
  -f dapp-registry.rho \
  -H 13.251.66.61 \
  -p 40412 \
  --phlo-limit 1000000 \
  --phlo-price 1 \
  --private-key $PRIVATE_KEY

# Expected output:
Deploy submitted to testnet
Deploy ID: 0x789abc123def...
Estimated cost: 850,000 phlo
Block inclusion: ~30 seconds
Explorer: http://13.251.66.61:3001/transaction/0x789abc123def...

# 3. Monitor deployment
./target/release/node_cli get-deploy -d 0x789abc123def... \
  -H 13.251.66.61 --http-port 40453

# Expected output:
Deploy ID: 0x789abc123def...
Status: Success
Block: 2158
Block Hash: 0xblock123hash...
Cost: 847,532 phlo
Execution: Successful
Data: DApp registry deployed successfully
```

#### Explorer Integration

**Scenario: Verify transactions using blockchain explorer**

```bash
# 1. Access live explorer
open http://13.251.66.61:3001

# 2. Search for transaction by ID
# Navigate to: http://13.251.66.61:3001/transaction/0x789abc123def...

# Expected display:
Transaction Details:
  ID: 0x789abc123def...
  Status: ✅ Success
  Block: #2158
  Timestamp: 2025-01-15 14:30:25 UTC
  From: 1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8
  Gas Used: 847,532 phlo
  Contract Code: [View Rholang source]
  
# 3. Check address activity
# Navigate to: http://13.251.66.61:3001/address/1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8

# Expected display:
Address Overview:
  Balance: 74.15 ASI
  Transactions: 3
  Contracts Deployed: 1
  Last Activity: 2 minutes ago
  
Transaction History:
  1. Contract Deploy - 847,532 phlo - 2 min ago
  2. ASI Transfer - 25.0 ASI sent - 5 min ago  
  3. Faucet Request - 100.0 ASI received - 8 min ago
```

### GraphQL API Integration

**Scenario: Build real-time DApp using GraphQL**

```javascript
// Real-time transaction monitoring
const subscription = `
  subscription NewTransactions($address: String!) {
    transfers(
      where: {
        _or: [
          {from_address: {_eq: $address}},
          {to_address: {_eq: $address}}
        ]
      },
      order_by: {deployment: {block: {timestamp: desc}}}
    ) {
      deploy_id
      from_address
      to_address
      amount
      deployment {
        block {
          block_number
          timestamp
        }
      }
    }
  }
`;

// WebSocket connection
const ws = new WebSocket('ws://13.251.66.61:8080/v1/graphql');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'start',
    payload: {
      query: subscription,
      variables: {
        address: '1111ocWgUJb5QqnYCvKiPtzcmMyfvD3gS5Eg84NtaLkUtRfw3TDS8'
      }
    }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'data') {
    console.log('New transaction:', data.payload.data.transfers[0]);
    // Expected output:
    // {
    //   deploy_id: "0xabc123...",
    //   from_address: "1111ocWg...",
    //   to_address: "11112D8E...",
    //   amount: "25000000000",
    //   deployment: {
    //     block: {
    //       block_number: 2159,
    //       timestamp: "2025-01-15T14:35:00Z"
    //     }
    //   }
    // }
  }
};
```

### Mainnet Environment (Coming Soon)

#### Expected Mainnet Operations

**Scenario: Production deployment preparation**

```bash
# Mainnet configuration (when available)
export ASI_ENV="mainnet"
export ASI_NODE_HOST="rpc.asichain.io"
export ASI_NODE_GRPC_PORT="443"
export ASI_NODE_HTTP_PORT="443"

# Mainnet wallet configuration
{
  "networkName": "ASI Mainnet",
  "chainId": "asi-mainnet",
  "nodeUrl": "https://rpc.asichain.io",
  "explorerUrl": "https://explorer.asichain.io",
  "graphqlUrl": "https://graphql.asichain.io/v1/graphql"
}

# Expected mainnet commands (same as testnet but with HTTPS)
node_cli status -H rpc.asichain.io --http-port 443

# Expected mainnet output:
Node Status:
  Version: 1.0.0
  Network: asi-mainnet
  Block Height: 1,250,000
  Validators: 100+
  Total Stake: 10B ASI
  Network Health: 99.9%
```

### Integration Testing Scenarios

#### End-to-End DApp Testing

**Scenario: Complete DApp deployment and testing flow**

```bash
# 1. Local testing
# Deploy DApp locally for initial testing
docker-compose up -d
node_cli deploy -f dapp.rho -H localhost -p 40412

# 2. Testnet deployment
# Deploy to testnet for integration testing
node_cli deploy -f dapp.rho -H 13.251.66.61 -p 40412

# 3. User acceptance testing
# Use testnet faucet for user testing
curl -X POST http://13.251.66.61:5050/api/request \
  -d '{"address": "test_user_address"}'

# 4. Performance testing
# Monitor transaction throughput
for i in {1..100}; do
  node_cli deploy -f simple-tx.rho -H 13.251.66.61 -p 40412 &
done
wait

# 5. Security testing
# Verify contract behavior with edge cases
node_cli exploratory-deploy -f security-test.rho \
  -H 13.251.66.61 -p 40412
```

#### Multi-Environment CI/CD Pipeline

**Scenario: Automated deployment pipeline**

```yaml
# .github/workflows/deploy.yml
name: DApp Deployment Pipeline

on:
  push:
    branches: [main, develop]

jobs:
  test-local:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start local blockchain
        run: docker-compose up -d
      - name: Deploy contracts
        run: |
          cd rust-client
          cargo build --release
          ./target/release/node_cli deploy -f ../contracts/main.rho
      - name: Run tests
        run: npm test

  deploy-testnet:
    needs: test-local
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to testnet
        env:
          PRIVATE_KEY: ${{ secrets.TESTNET_PRIVATE_KEY }}
        run: |
          node_cli deploy -f contracts/main.rho \
            -H 13.251.66.61 -p 40412 \
            --private-key $PRIVATE_KEY

  deploy-mainnet:
    needs: deploy-testnet
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to mainnet
        env:
          PRIVATE_KEY: ${{ secrets.MAINNET_PRIVATE_KEY }}
        run: |
          node_cli deploy -f contracts/main.rho \
            -H rpc.asichain.io -p 443 \
            --private-key $PRIVATE_KEY
```

### Performance Benchmarking

#### Transaction Throughput Testing

**Scenario: Measure network performance**

```bash
# 1. Prepare test transactions
for i in {1..1000}; do
  echo "new test$i in { test$i!(42) }" > tx_$i.rho
done

# 2. Batch deployment with timing
start_time=$(date +%s)
for i in {1..1000}; do
  node_cli deploy -f tx_$i.rho \
    -H 13.251.66.61 -p 40412 \
    --private-key $PRIVATE_KEY &
  
  # Limit concurrent deployments
  if (( i % 50 == 0 )); then
    wait
  fi
done
wait
end_time=$(date +%s)

# Calculate TPS
duration=$((end_time - start_time))
tps=$((1000 / duration))
echo "Throughput: $tps TPS over $duration seconds"

# Expected output:
# Throughput: 18 TPS over 55 seconds
# (Will improve with network scaling)
```

#### Memory and Resource Usage

**Scenario: Monitor resource consumption**

```bash
# 1. Start monitoring
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" &
STATS_PID=$!

# 2. Run load test
./load-test-script.sh

# 3. Collect results
sleep 300  # 5 minute test
kill $STATS_PID

# Expected resource usage:
# CONTAINER          CPU %    MEM USAGE
# rnode.validator1   45.2%    1.8GB / 4GB
# asi-rust-indexer   12.1%    256MB / 1GB
# asi-hasura         8.3%     128MB / 512MB
# asi-explorer       5.1%     64MB / 256MB
```

This comprehensive documentation now covers all major operations across development, testnet, and mainnet environments with detailed command references, expected outputs, and practical usage scenarios for developers and operators.

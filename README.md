<div align="center">

# ASI Chain: Node Infrastructure

[![Status](https://img.shields.io/badge/Status-BETA-FFA500?style=for-the-badge)](https://github.com/asi-alliance/asi-chain)
[![Version](https://img.shields.io/badge/Version-0.1.0-A8E6A3?style=for-the-badge)](https://github.com/asi-alliance/asi-chain/releases)
[![License](https://img.shields.io/badge/License-Apache%202.0-1A1A1A?style=for-the-badge)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-Available-C4F0C1?style=for-the-badge)](https://docs.asichain.io)

<h3>Blockchain node infrastructure and deployment tools for the ASI Chain network</h3>

Part of the [**Artificial Superintelligence Alliance**](https://superintelligence.io) ecosystem

*Uniting Fetch.ai, SingularityNET, and CUDOS*

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Documentation](#documentation)
7. [License](#license)

---

## Overview

ASI Chain is a blockchain platform built on F1R3FLY technology, providing infrastructure for the ASI Alliance ecosystem. This repository contains the node configuration, deployment automation, and utilities needed to run and interact with the ASI Chain network.

The platform uses the CBC Casper consensus mechanism with Proof of Stake, enabling validators to participate in block production and network security. Smart contracts are written in Rholang, a concurrent programming language designed for blockchain applications.

---

## Key Features

- **Automated Deployment** - Deploy a complete testnet with bootstrap, validators, and observer nodes using a single script
- **Validator Configuration** - Complete setup for running validator nodes with bonding support
- **Wallet Generation** - TypeScript utility for generating secp256k1 key pairs compatible with ASI Chain
- **Docker Support** - Containerized deployment for all node types (bootstrap, validator, observer)
- **Deployment Automation** - Bot for continuous contract deployment and block proposal

---

## Quick Start

### Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Java** 17+ (OpenJDK)
- **sbt** 1.9+ (Scala Build Tool)
- **Rust** 1.70+ and Cargo
- **Node.js** 20+ (for wallet-generator)
- **Git** 2.30+
- **Make** and **Perl**

System requirements: 16GB RAM minimum, 4+ CPU cores, 50GB free storage

### Deploy Local Network

The automated deployment script handles the complete setup:

```bash
# Clone with submodules
git clone --recursive https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# Make script executable
chmod +x scripts/deploy.sh

# Run automated deployment
./scripts/deploy.sh
```

The script will:
- Clone the node and CLI repositories (if not present)
- Build the F1R3FLY node Docker image
- Build the Rust CLI tool
- Start all network services (bootstrap, validators, observer)
- Verify network operational status

Monitor deployment progress with:
```bash
docker ps
docker logs -f rnode.bootstrap
```

---

## Architecture

### Network Topology

The DevNet consists of multiple node types working in coordination:

**Bootstrap Node**
- Genesis node that initializes the network
- Coordinates peer discovery for new nodes
- Maintains network topology information

**Validator Nodes (3 Active)**
- Participate in consensus through CBC Casper
- Produce and finalize blocks
- Accept transaction submissions from users and developers
- Interconnected for block propagation and consensus

**Observer Node**
- Read-only access to blockchain state
- Handles query requests from client applications
- Does not participate in consensus or block production
- Optimized for high-throughput read operations

### Participant Roles

**External Participants:**
- **Users** - Interact with the blockchain through client applications (transfers, balance checks)
- **Developers** - Deploy and test smart contracts via validator nodes
- **Node Operators** - Run validator or observer nodes to support network infrastructure

**Client Applications:**
- **Web Wallet** (https://wallet.dev.asichain.io) - Account management and contract deployment
- **Block Explorer** (https://explorer.dev.asichain.io) - Real-time network monitoring
- **Indexer** - Blockchain data indexing for efficient queries
- **Faucet** (https://faucet.dev.asichain.io) - Test token distribution

### Technology Stack

**Core Infrastructure:**
- F1R3FLY Node (Scala) - Blockchain node implementation based on RChain
- Rust Client (CLI) - Command-line interface for node interaction
- Docker - Containerization platform

**Utilities:**
- TypeScript - Wallet key generation
- Bash - Deployment automation scripts
- Rholang - Smart contract programming language

**Dependencies from package.json:**
- @noble/curves 1.4.0 - Elliptic curve cryptography
- @scure/base 1.1.6 - Base encoding utilities
- blakejs 1.2.1 - BLAKE2 hashing
- js-sha3 0.9.3 - SHA-3 hashing
- js-sha256 0.11.0 - SHA-256 hashing
- TypeScript 5.4.5 - Type-safe JavaScript

---

## Project Structure

```
asi-chain/
├── node/                      # F1R3FLY node (Git submodule)
│   └── docker/               # Node Docker configurations
│
├── chain/                     # Node configurations
│   ├── genesis/              # Genesis node configurations
│   │   ├── devnet-bootstrap/ # Bootstrap node setup
│   │   ├── devnet-validator1-3/ # Validator configurations
│   │   └── devnet-observer/  # Observer node setup
│   └── validator/            # External validator setup
│       ├── conf/             # Configuration files
│       ├── scripts/          # Setup and connection scripts
│       ├── configurator.Dockerfile
│       ├── connector.Dockerfile
│       └── validator.yml     # Docker Compose file
│
├── wallet-generator/          # Wallet key generation utility
│   ├── walletGeneratorScript.ts
│   ├── utils.ts
│   ├── package.json
│   └── README.md
│
├── deployer-bot/              # Automated deployment bot
│   ├── bot.sh                # Deployment automation script
│   ├── Dockerfile
│   ├── deployer.yml
│   └── .env.example
│
├── scripts/                   # Utility scripts
│   ├── deploy.sh             # Automated network deployment
│   ├── block-generator.sh
│   └── docker-flush.sh
│
├── contracts/                 # Rholang smart contracts
│   └── hello.rho
│
└── README.md                  # This file
```

**Note:** The `node/` directory is a Git submodule pointing to https://github.com/singnet/f1r3fly-node.git (branch: ticker_rename_applied). Initialize it with `git submodule update --init --recursive`.

---

## Documentation

### Core Documentation

**[CONFIGURATION.md](CONFIGURATION.md)** - Configuration guide
- Environment variables for all components
- Network configuration parameters
- Docker deployment settings

**[DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide
- Local development setup
- Building from source
- Manual deployment steps
- Troubleshooting common issues

### Component Documentation

**[chain/validator/README.md](chain/validator/README.md)** - External validator setup
- Complete validator deployment guide
- Docker image building
- Bonding process
- Node synchronization verification

**[wallet-generator/README.md](wallet-generator/README.md)** - Wallet generation
- Key generation process
- secp256k1 algorithm usage
- Secure key storage recommendations

**[deployer-bot/README.md](deployer-bot/README.md)** - Deployment automation
- Bot configuration
- Automated contract deployment
- Block proposal automation

### External Resources

**Official Documentation Portal:**
- **Main Portal:** https://docs.asichain.io
- **Quick Start:** https://docs.asichain.io/quick-start/join-validator/
- **DevNet Structure:** https://docs.asichain.io/shard-nodes/devnet-structure/

**Web Applications:**
- **ASI Wallet:** https://wallet.dev.asichain.io
- **Block Explorer:** https://explorer.dev.asichain.io
- **Faucet:** https://faucet.dev.asichain.io

**Network Endpoints:**
- **Bootstrap Node:** `rnode://e5e6faf012f36a30176d459ddc0db81435f6f1dc@54.152.57.201?protocol=40400&discovery=40404`
- **Validator HTTP:** http://54.152.57.201:40413
- **Observer HTTP:** http://54.152.57.201:40453

**Repositories:**
- **Core:** https://github.com/asi-alliance/asi-chain
- **Rust Client:** https://github.com/singnet/rust-client
- **Block Explorer:** https://github.com/asi-alliance/asi-chain-explorer
- **Web Wallet:** https://github.com/asi-alliance/asi-chain-wallet
- **Faucet:** https://github.com/asi-alliance/asi-chain-faucet

---

## License

Copyright 2025 Artificial Superintelligence Alliance

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

ASI Alliance founding members: Fetch.ai, SingularityNET, and CUDOS

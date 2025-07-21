# ASI-Chain Documentation Index

Welcome to the ASI-Chain documentation. This index helps you navigate through our organized documentation structure.

**Major Components:**
- **ASI Chain** - Blockchain network with Rholang smart contracts
- **ASI Wallet v2** - Modern web wallet with WalletConnect support
- **Block Explorer** - Real-time blockchain monitoring interface

## 📁 Documentation Structure

```
docs/
├── ARCHITECTURE.md         # System design and technical architecture
├── BLOCK_EXPLORER.md      # Block explorer overview
├── FINALIZER_BOT.md       # Automated block production
├── GETTING_STARTED.md     # Comprehensive getting started guide
├── INDEX.md               # This file
├── REPO_OPERATIONS_AND_MAINTENANCE.md  # Repository management
├── TROUBLESHOOTING.md     # Problem-solving guide
├── WALLET.md              # Complete wallet documentation
└── (All documentation is in the main .md files above)
```

## ⚡ Quick Access

### ASI Wallet v2
- **[Complete Wallet Documentation](WALLET.md)** - All wallet docs in one place
- **[Quick Installation](WALLET.md#installation-guide)** - Get the wallet running
- **[User Guide](WALLET.md#user-guide)** - How to use the wallet
- **[WalletConnect Testing](../asi_wallet_v2/test-dapp-rchain/)** - Test dApp integration

### Block Explorer
- **[Explorer Overview](BLOCK_EXPLORER.md)** - Real-time blockchain monitoring and complete documentation

## 🚀 Getting Started

### New to ASI-Chain?
- **[Getting Started Guide](GETTING_STARTED.md)** - Complete deployment guide
- **[Project Overview](../README.md)** - Understand what ASI-Chain is and its architecture
- **[CLI Tutorial](GETTING_STARTED.md#cli-tutorial)** - Learn how to use the command-line interface

### Installation & Setup
- **[Prerequisites](../README.md#prerequisites)** - What you need before starting
- **[Automated Deployment](../README.md#automated-deployment-recommended)** - Recommended setup process
- **[Manual Deployment](../README.md#manual-deployment)** - Advanced setup options

## 💻 Development

### For Contributors
- **[Repository Operations](REPO_OPERATIONS_AND_MAINTENANCE.md)** - Git workflow, branching, and commit standards

### Technical Architecture
- **[Architecture Overview](ARCHITECTURE.md)** - System design and components
- **[Network Port Architecture](../README.md#network-port-architecture)** - Port mappings and network topology

## 🔧 Operations

### Deployment & Maintenance
- **[Finalizer Bot](FINALIZER_BOT.md)** - Automated block production system
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Deployment Fixes](TROUBLESHOOTING.md#deployment-issues)** - Recent deployment fixes

### Testing & Validation
- **[Testing Guide](GETTING_STARTED.md#testing)** - Testing smart contracts and network

## 📚 Technical Analysis

### Memory Leak Issue (ACTIVE ⚠️)
- **[Deploy Storage Memory Leak](TROUBLESHOOTING.md#memory-leak)** - Critical memory growth analysis
- **Memory Leak Details**: See troubleshooting documentation for analysis
- **Impact**: Validators crash after days/weeks of operation
- **Root Cause**: No deploy garbage collection mechanism
- **Workarounds**: Available, long-term fix requires node modification

### Block 50 Issue (RESOLVED ✅)
- **[Block 50 Resolution](TROUBLESHOOTING.md#block-50-issue)** - How the issue was fixed with VABN support
- **Solution**: CLI modification to support validAfterBlockNumber parameter
- **Status**: Completely resolved

### Consensus & Features
- **[Architecture Overview](ARCHITECTURE.md#consensus)** - Understanding consensus and block proposals
- **[Finalizer Bot](FINALIZER_BOT.md)** - Automated block production system

## 📋 Quick Reference

### Essential Commands

#### Network Deployment
```bash
# Build and Deploy
./scripts/deploy.sh              # Full automated deployment

# Common CLI Operations (from cli/node-cli)
make generate-key-pair SAVE=true # Generate validator keys
make deploy                      # Deploy smart contract
make propose                     # Propose a block
make bonds                       # Check validator bonds
make status                      # Node status
```

#### Wallet Commands
```bash
# Development
cd asi_wallet_v2
npm install                      # Install dependencies
npm start                        # Start development server
npm run build                    # Production build
npm run deploy:gh                # Deploy to GitHub Pages

# Test WalletConnect
PORT=3002 npm start              # Wallet on port 3002
cd test-dapp-rchain && npm run dev # Test dApp on port 3003
```

#### Block Explorer
```bash
cd block-explorer
python parser/enhanced_parser.py # Start parser
python web/app.py                # Start web UI
```

### Important Ports
- **Bootstrap Node**: 40401 (deploy), 40402 (propose)
- **Validators**: 40411-40431 (deploy), 40412-40432 (propose)
- **Observer**: 40453 (queries only)

### Key Concepts
- **Rholang**: Process calculus-based smart contract language
- **CBC Casper**: Consensus mechanism with Proof of Stake
- **Finalizer Bot**: Ensures continuous block production with dynamic VABN
- **DeployLifespan**: Hardcoded limit of 50 blocks for deploy validity
- **validAfterBlockNumber (VABN)**: Deploy parameter that defines when a deploy becomes valid
- **WalletConnect**: Protocol for connecting wallets to dApps
- **REV**: Native token of the RChain network
- **Progressive Web App (PWA)**: Web app that works offline and can be installed

## 🗂️ Documentation by User Type

### New Users
Start with:
1. [Getting Started Guide](GETTING_STARTED.md)
2. [CLI Tutorial](GETTING_STARTED.md#cli-tutorial)
3. [Wallet User Guide](WALLET.md#user-guide)
4. [Troubleshooting](TROUBLESHOOTING.md)

### Developers
Review:
1. [Architecture](ARCHITECTURE.md)
2. [Wallet Development](WALLET.md#development)
3. [Repository Operations](REPO_OPERATIONS_AND_MAINTENANCE.md)
4. [Getting Started](GETTING_STARTED.md)

### Wallet Developers
Focus on:
1. [Wallet Installation](WALLET.md#installation-guide)
2. [Wallet Architecture](WALLET.md#architecture)
3. [API Reference](WALLET.md#api-reference)
4. [Test dApp Guide](../asi_wallet_v2/test-dapp-rchain/README.md)

### Operators
Check:
1. [Repository Operations](REPO_OPERATIONS_AND_MAINTENANCE.md)
2. [Wallet Deployment](WALLET.md#deployment)
3. [Troubleshooting](TROUBLESHOOTING.md)
4. [Finalizer Bot](FINALIZER_BOT.md)

## 📝 Documentation Meta

### Documentation Quality
- All documentation has been consolidated into the main docs directory
- Recent updates are tracked in this INDEX.md file

### Contributing to Docs
Please follow the standards in [Repository Operations](REPO_OPERATIONS_AND_MAINTENANCE.md#documentation-standards).

## 🔄 Recent Updates

- **2025-07-17**: Added comprehensive ASI Wallet v2 documentation
- **2025-07-17**: Integrated test dApp documentation for WalletConnect testing
- **2025-07-17**: Updated all wallet docs with current codebase structure
- **2025-07-15**: Added deploy storage memory leak analysis and solutions
- **2025-07-14**: Major documentation reorganization
- **2025-07-14**: Block 50 issue RESOLVED with VABN support
- **2025-07-14**: Finalizer bot fully operational with Docker container fixes
- **2025-07-14**: All documentation updated with current working state
- **2025-07-14**: New directory structure implemented
- **2025-07-14**: Added comprehensive stress testing guide and tools

## 💰 ASI Wallet v2

### Overview
A modern, secure, and fully decentralized wallet for the RChain network with WalletConnect integration.

### Getting Started with Wallet
- **[Installation Guide](WALLET.md#installation-guide)** - Setup and deployment instructions
- **[User Guide](WALLET.md#user-guide)** - Complete guide for end users
- **[Architecture Overview](WALLET.md#architecture)** - Technical design and principles

### Wallet Development
- **[Development Setup](WALLET.md#development)** - Local development environment
- **[API Reference](WALLET.md#api-reference)** - Complete API documentation
- **[Contributing Guide](WALLET.md#contributing)** - How to contribute

### Wallet Features
- **[WalletConnect Integration](WALLET.md#walletconnect-integration)** - dApp connectivity
- **[IDE Documentation](WALLET.md#ide-documentation)** - Integrated Rholang development
- **[Security Guide](WALLET.md#security)** - Security measures and best practices
- **[Troubleshooting](WALLET.md#troubleshooting)** - Common issues and solutions

### Key Wallet Features
- 🔐 100% Client-Side (no backend servers)
- 🌐 Progressive Web App with offline support
- 🔗 WalletConnect v2 for dApp connectivity
- 💻 Integrated Rholang IDE
- 🎨 Modern UI with dark/light themes
- 🔒 AES-256-GCM encryption for local storage

## 🔍 Block Explorer

### Overview
Real-time blockchain monitoring interface with transaction tracking and wallet balance checking.

### Block Explorer Features
- **Real-time Updates**: Automatic block and transaction tracking
- **REV Transfers**: Extraction and monitoring of token transfers
- **Wallet Integration**: Check balances for any address
- **SQLite Database**: Efficient data storage and querying
- **Web Interface**: Modern UI with auto-refresh capabilities

### Running the Block Explorer
```bash
cd block-explorer
pip install -r requirements.txt
python parser/enhanced_parser.py  # Start data collection
python web/app.py                 # Start web interface
```

Access at http://localhost:8080

## ✅ Current System Status

- **Network**: FULLY OPERATIONAL
- **Block 50 Issue**: COMPLETELY RESOLVED
- **Finalizer Bot**: WORKING CORRECTLY
- **Docker Services**: ALL RUNNING PROPERLY
- **VABN Support**: ACTIVE AND FUNCTIONAL
- **Wallet v2**: PRODUCTION READY
- **Block Explorer**: OPERATIONAL

---

**Need Help?** 
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Browse relevant section above
3. Search the codebase for examples
4. Open an issue on GitHub

**Quick Navigation:**
- [Back to README](../README.md)
- [Getting Started](GETTING_STARTED.md)
- [Architecture](ARCHITECTURE.md)
- [Development](REPO_OPERATIONS_AND_MAINTENANCE.md)
- [Wallet Documentation](WALLET.md)
- [Troubleshooting](TROUBLESHOOTING.md)
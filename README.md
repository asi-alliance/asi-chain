<div align="center">

# ASI Chain

[![Status](https://img.shields.io/badge/Status-Production--Ready-7FD67A?style=for-the-badge)](https://gitlab.com/asi-build/asi-chain)
[![Version](https://img.shields.io/badge/Version-1.0.0--beta-A8E6A3?style=for-the-badge)](https://gitlab.com/asi-build/asi-chain/releases)
[![License](https://img.shields.io/badge/License-Apache%202.0-1A1A1A?style=for-the-badge)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-Available-C4F0C1?style=for-the-badge)](docs-site/)

<h3>⚡ Blockchain Infrastructure for Decentralized AI ⚡</h3>

Part of the [**Artificial Superintelligence Alliance**](https://superintelligence.io) ecosystem  
*Uniting Fetch.ai, SingularityNET, Ocean Protocol, and CUDOS*

</div>

---

## 🌐 Network Overview

ASI Chain provides the blockchain foundation for the **Artificial Superintelligence Alliance**, enabling:

- 🤖 **Decentralized AI agent coordination**
- 🔗 **Cross-chain AI workflow orchestration**  
- 💰 **On-chain AI model governance**
- 🖥️ **Compute resource marketplace transactions**
- 🧠 **Parallel smart contract execution via Rholang**

**Project Status**: Production-ready blockchain infrastructure with enterprise-grade services, advanced indexer, comprehensive wallet implementation, and operational blockchain explorer.

## ⚙️ Technical Architecture

<div align="center">

```
┌─────────────────────────────────────────────────────────┐
│                    ASI Chain Stack                       │
├─────────────────────────────────────────────────────────┤
│  Frontend Layer                                          │
│  ├── ASI Wallet v2.2.0 (React 18, TypeScript, Redux)   │
│  ├── Blockchain Explorer (React 19, Apollo GraphQL)     │
│  └── Documentation Site (Docusaurus 3.8.1)             │
├─────────────────────────────────────────────────────────┤
│  API Layer                                              │
│  ├── REST API (Port 9090)                               │
│  ├── GraphQL via Hasura (Port 8080)                     │
│  ├── gRPC Node Interface (Port 40403)                   │
│  └── Faucet API (Port 5000)                             │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ├── Python Indexer with Rust CLI                       │
│  ├── PostgreSQL 14+ Database                            │
│  ├── Redis Primary/Replica Caching                      │
│  └── Hasura GraphQL Engine                              │
├─────────────────────────────────────────────────────────┤
│  Blockchain Core (F1R3FLY)                              │
│  ├── CBC Casper PoS Consensus (Scala 2.12.15)          │
│  ├── Rholang VM & Runtime                               │
│  ├── RSpace Parallel Execution                          │
│  └── P2P Network Layer                                  │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                   │
│  ├── Docker & Kubernetes Orchestration                  │
│  ├── Terraform AWS Infrastructure                       │
│  ├── Prometheus/Grafana Monitoring                      │
│  └── Security & Secrets Management                      │
└─────────────────────────────────────────────────────────┘
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

## 🚀 Quick Start

### Prerequisites

```bash
# Required tools
- JDK 11+ (OpenJDK recommended)
- sbt 1.5+
- Rust 1.70+ (for CLI client)
- Node.js 18+ & npm 9+
- Docker 20.10+ & Docker Compose
- Python 3.9+ (for indexer and faucet)
```

### Installation

<details>
<summary><b>1️⃣ Clone Repository</b></summary>

```bash
# Clone from GitLab
git clone https://gitlab.com/asi-build/asi-chain.git
cd asi-chain

# Initialize and update Git submodules
git submodule init
git submodule update --recursive
```

</details>

<details>
<summary><b>2️⃣ Build from Source</b></summary>

```bash
# Set environment variables for JVM
export SBT_OPTS="-Xmx4g -Xss2m"

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

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check node status (after building rust-client)
./rust-client/target/release/node_cli status -H localhost

# Access services
# ASI Wallet: http://localhost:3000
# Explorer: http://localhost:3001
# GraphQL: http://localhost:8080
# Indexer API: http://localhost:9090
# Faucet API: http://localhost:5000
# Prometheus: http://localhost:9091
# Grafana: http://localhost:3002

# Check service health
curl http://localhost:9090/health  # Indexer health
curl http://localhost:8080/healthz  # Hasura health
```

</details>

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
├── 💼 asi_wallet_v2/          # ASI Wallet v2.2.0 (React 18, TypeScript)
│   ├── src/components/        # WalletConnect v2, Hardware wallets
│   ├── src/services/          # Biometric auth, Multi-sig support
│   └── src/store/             # Redux Toolkit state management
├── 🌐 explorer/               # Blockchain Explorer (React 19, Apollo GraphQL)
│   ├── src/components/        # Real-time data components
│   ├── src/graphql/           # GraphQL queries and subscriptions
│   └── src/pages/             # Block/transaction/validator pages
├── 📊 indexer/                # Advanced blockchain data indexer
│   ├── src/                   # Python asyncio with Rust CLI integration
│   ├── migrations/            # 10-table PostgreSQL schema
│   └── scripts/               # Hasura relationship configuration
├── 🐳 faucet/                 # Token faucet service (Python)
├── 📚 docs-site/              # Docusaurus 3.8.1 documentation site
├── 🏗️ infrastructure/         # Infrastructure as Code
│   ├── aws/                   # AWS deployment scripts
│   ├── terraform/             # Terraform configurations (EKS, RDS, ElastiCache)
│   └── validators/            # Validator node setup
├── 🔒 security/               # Security configurations and tools
│   ├── api/                   # API security middleware
│   ├── database/              # Database security configs
│   ├── headers/               # Security headers for nginx
│   └── secrets-management/    # Secrets management tools
├── ☸️ k8s/                    # Kubernetes deployment configs
│   ├── base/                  # Base K8s configurations
│   └── production/            # Production-specific configs
├── 📈 monitoring/             # Prometheus + Grafana monitoring stack
├── 🧪 contracts/              # Smart contracts (Rholang & Solidity)
├── 🔄 integrations/           # External integrations (GitLab MCP)
├── 📊 benchmarks/             # Performance benchmarking tools
├── 🎬 demos/                  # Demo assets and scripts
├── 🏛️ legal/                  # Terms of Service, Privacy Policy
├── 🐳 docker-compose.yml      # Local development environment
├── 🐳 docker-compose.production.yml # Production Docker setup
└── 📋 scripts/                # Operational and maintenance scripts
    ├── monitoring/            # Stress tests, metrics exporters
    ├── security/              # Security audits and hardening
    └── maintenance/           # Backup, cleanup, health checks
```

## 🎯 Key Features

<div align="center">

| Feature | Description | Status |
|---------|-------------|--------|
| **🔐 CBC Casper** | Correct-by-construction consensus | ✅ Active |
| **⚡ Parallel Execution** | Namespace sharding via Rholang | ✅ Active |
| **🤖 AI-Native** | Optimized for AI workloads | ✅ Active |
| **🔗 Smart Contracts** | Process calculus based (100+ examples) | ✅ Active |
| **💰 REV Token** | Native cryptocurrency with 8 decimals | ✅ Active |
| **🔌 WalletConnect v2** | DApp connectivity | ✅ Active |
| **🔑 Hardware Wallets** | Ledger & Trezor support | ✅ Active |
| **📱 Biometric Auth** | WebAuthn/FIDO2 | ✅ Active |
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
| **Faucet API** | 5000 | Token faucet |

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

# Build options
export SBT_OPTS="-Xmx4g -Xss2m"
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
- [Production Infrastructure](PRODUCTION_INFRASTRUCTURE_GUIDE.md)
- [Docker Guide](docs/DOCKER_GUIDE.MD)
- [Kubernetes Production](k8s/production/DEPLOYMENT_SUMMARY.md)
- [Terraform AWS](infrastructure/terraform/)
- [Monitoring Stack](docs/monitoring/MONITORING_STACK.MD)
- [F1R3FLY Deployment](docs/F1R3FLY_DOCKER_DEPLOYMENT_GUIDE.MD)

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
- ❗ Enable all security headers via `security/headers/`
- ❗ Set up proper secrets management (AWS Secrets Manager/Vault)

**Security Features:**
- AES-256-GCM encryption with PBKDF2 (100k iterations)
- TLS 1.2/1.3 for all communications
- WebAuthn biometric authentication
- Hardware wallet support (Ledger/Trezor)
- Multi-signature wallet capabilities
- Rate limiting and input validation
- Database row-level security

For security vulnerabilities:
- 🔐 **Report privately** via GitLab Security
- 🚫 **Do not** open public issues for vulnerabilities
- ✅ **Follow** responsible disclosure guidelines

## 📊 Important Notes

- F1R3FLY and rust-client are Git submodules from github.com/F1R3FLY-io - run `git submodule update --init --recursive` after cloning
- Use `SBT_OPTS="-Xmx4g -Xss2m"` when building Scala components to avoid memory issues
- Private keys and validator configs are in `f1r3fly/docker/` (⚠️ Replace test keys in production)
- Always run lint and type checks before committing frontend code
- Environment variables are managed through `.env` files per service
- The indexer uses Rust CLI (`node_cli`) for blockchain interaction, not HTTP APIs
- The wallet includes WalletConnect v2 support for DApp connectivity
- Production deployments use `docker-compose.production.yml` with Redis caching
- Security configurations are centralized in the `security/` directory
- Infrastructure as Code is managed via Terraform in `infrastructure/terraform/`
- External integrations (GitLab MCP) are in the `integrations/` directory

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
**Status**: ✅ OPERATIONAL | **Server IP**: `18.142.221.192` | **Deployed**: August 22, 2025

---

### 📱 Web Applications

| Service | URL | Port | Description | Status |
|---------|-----|------|-------------|--------|
| **ASI Wallet v2** | http://18.142.221.192:3000 | 3000 | Web wallet interface with WalletConnect v2 | ✅ Live |
| **Blockchain Explorer** | http://18.142.221.192:3001 | 3001 | Real-time blockchain explorer | ✅ Live |

---

### 🔗 Blockchain Node Endpoints (F1R3FLY)

| Node Type | HTTP API | gRPC Port | P2P Port | Purpose | Status |
|-----------|----------|-----------|----------|---------|--------|
| **Bootstrap** | http://18.142.221.192:40403 | 40402 | 40400 | Network discovery only ⚠️ | ✅ Active |
| **Validator1** | http://18.142.221.192:40413 | 40412 | 40410 | **🔥 Send transactions here** | ✅ Active |
| **Validator2** | http://18.142.221.192:40423 | 40422 | 40420 | **🔥 Send transactions here** | ✅ Active |
| **Validator3** | http://18.142.221.192:40433 | 40432 | 40430 | **🔥 Send transactions here** | ✅ Active |
| **Validator4** | http://18.142.221.192:40443 | 40442 | 40440 | Non-consensus validator | ✅ Active |
| **Read-only** | http://18.142.221.192:40453 | 40452 | 40451 | **📖 Query-only (best for reads)** | ✅ Active |

#### ⚠️ CRITICAL: Transaction Port Guidelines

**🚨 DO NOT send transactions to Bootstrap (40403)** 
- Bootstrap nodes are for network discovery only
- Transactions sent here will NOT be processed or included in blocks

**✅ CORRECT ports for transactions:**
- **Validator1** (40413), **Validator2** (40423), or **Validator3** (40433)
- These validators are monitored by autopropose service
- Transactions will be included in blocks within 30 seconds

**✅ OPTIMAL ports for queries:**
- **Read-only** (40453) - Best performance for balance checks and data queries
- Any validator port also works for queries

---

### 📊 Data & Infrastructure Services

| Service | URL/Endpoint | Port | Purpose | Access |
|---------|-------------|------|---------|--------|
| **Hasura GraphQL API** | http://18.142.221.192:8080/v1/graphql | 8080 | GraphQL queries & mutations | Public |
| **GraphQL Console** | http://18.142.221.192:8080/console | 8080 | Hasura admin interface | Public |
| **GraphQL WebSocket** | ws://18.142.221.192:8080/v1/graphql | 8080 | Real-time subscriptions | Public |
| **Indexer REST API** | http://18.142.221.192:9090 | 9090 | Blockchain data indexer | Public |
| **PostgreSQL Database** | `18.142.221.192:5432` | 5432 | Direct database connection | Private |
| **Autopropose Service** | Internal container | N/A | Automatic block creation | Internal |

---

### 📈 Network Statistics & Health

| Metric | Value | Status |
|--------|-------|--------|
| **Consensus Health** | 100% participation | 🟢 Healthy |
| **Latest Block** | ~2000+ (growing) | ✅ Active |
| **Block Time** | 30 seconds | ⚡ Fast |
| **Active Validators** | 3 validators (1000 REV stake each) | ✅ Secure |
| **Total Nodes** | 6 fully connected | 🔗 Connected |
| **Network Peers** | 5 peers per node | 🌐 Meshed |
| **Autopropose** | Rotating validator1→2→3 | 🔄 Active |

---

### 🛠️ Quick Start Commands

#### Check Blockchain Status
```bash
# Get node status
curl http://18.142.221.192:40453/api/status

# Get latest block via GraphQL
curl -X POST http://18.142.221.192:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks(limit: 1, order_by: {block_number: desc}) { block_number timestamp } }"}'
```

#### Send Transactions (Use any validator 1-3)
```bash
# Deploy via Validator1 (RECOMMENDED)
curl -X POST http://18.142.221.192:40413/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"deployer": "YOUR_ADDRESS", "term": "YOUR_RHOLANG_CODE", ...}'

# Alternative validators
# Validator2: http://18.142.221.192:40423/api/deploy
# Validator3: http://18.142.221.192:40433/api/deploy
```

#### Query Balance
```bash
# Best performance using read-only node
./node_cli balance YOUR_ADDRESS -H 18.142.221.192 -p 40453
```

#### Monitor Services
```bash
# Check indexer health
curl http://18.142.221.192:9090/health

# View running Docker containers (requires SSH)
ssh -i XXXXXXXXX.pem ubuntu@18.142.221.192 "docker ps"
```

---

### 🔧 Wallet Configuration

#### ASI Wallet v2 Settings
```yaml
Network Name: ASI Testnet
Transaction URL: http://18.142.221.192:40413  # validator1
Read-only URL: http://18.142.221.192:40453    # for balance checks
gRPC Endpoint: 18.142.221.192:40412          # validator1 gRPC
Explorer URL: http://18.142.221.192:3001
```

#### Alternative Validator Endpoints
```yaml
# You can use any of these for transactions:
Validator1: http://18.142.221.192:40413 (gRPC: 40412)
Validator2: http://18.142.221.192:40423 (gRPC: 40422)  
Validator3: http://18.142.221.192:40433 (gRPC: 40432)
```

---

### 🖥️ Rust CLI Examples

```bash
# Build the CLI first (requires submodule)
cd rust-client && cargo build --release

# Check node status
./target/release/node_cli status -H 18.142.221.192

# Get recent blocks (use read-only for best performance)
./target/release/node_cli blocks -H 18.142.221.192 -p 40453 -n 10

# Check balance
./target/release/node_cli balance YOUR_REV_ADDRESS -H 18.142.221.192 -p 40453

# Deploy contract (use validator1, 2, or 3)
./target/release/node_cli deploy -f contract.rho -H 18.142.221.192 -p 40413

# Execute exploratory deploy (testing)
./target/release/node_cli exploratory-deploy -f test.rho -H 18.142.221.192 -p 40412

# ⚠️ NEVER use bootstrap for transactions
# ❌ WRONG: ./target/release/node_cli deploy -f contract.rho -H 18.142.221.192 -p 40403
```

---

### 🔒 SSH Access

```bash
# Connect to server (requires private key)
ssh -i XXXXXXXXX.pem ubuntu@18.142.221.192

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
asi-explorer       # Port 3001 - Blockchain Explorer
asi-wallet-v2      # Port 3000 - Web Wallet
asi-hasura         # Port 8080 - GraphQL Engine
asi-rust-indexer   # Port 9090 - Blockchain Indexer
asi-indexer-db     # Port 5432 - PostgreSQL Database
rnode.bootstrap    # Ports 40400-40405 - Bootstrap Node
rnode.validator1   # Ports 40410-40415 - Validator 1
rnode.validator2   # Ports 40420-40425 - Validator 2
rnode.validator3   # Ports 40430-40435 - Validator 3
rnode.validator4   # Ports 40440-40445 - Validator 4
rnode.readonly     # Ports 40451-40453 - Read-only Node
autopropose        # Internal - Block Creation Service
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
Faucet API: http://localhost:5000
```

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for details.

```
Copyright 2025 Artificial Superintelligence Alliance
Part of the ASI Alliance ecosystem (https://superintelligence.io)
```

## 🔗 Resources

<div align="center">

[![GitLab](https://img.shields.io/badge/GitLab-ASI--Chain-FCA326?style=for-the-badge&logo=gitlab)](https://gitlab.com/asi-build/asi-chain)
[![Website](https://img.shields.io/badge/Website-superintelligence.io-7FD67A?style=for-the-badge)](https://superintelligence.io)
[![Documentation](https://img.shields.io/badge/Docs-Available-A8E6A3?style=for-the-badge)](docs-site/)
[![Community](https://img.shields.io/badge/Community-Join%20Us-C4F0C1?style=for-the-badge)](https://superintelligence.io/community)

</div>

---

<div align="center">

**ASI Chain** - Building the decentralized infrastructure for Artificial Superintelligence

<sub>Developed with 🧠 by the ASI Alliance • 2025</sub>

</div>
# Project Overview

## 🌟 What is ASI Chain?

ASI Chain is a blockchain infrastructure designed specifically for decentralized AI applications. It's part of the **Artificial Superintelligence Alliance** ecosystem, uniting Fetch.ai, SingularityNET, Ocean Protocol, and CUDOS.

### Key Differentiators
- **NOT Ethereum-based**: Uses F1R3FLY (formerly RChain) technology
- **Process Calculus**: Rholang smart contracts instead of Solidity
- **Parallel Execution**: RSpace enables true concurrent processing
- **AI-Optimized**: Built for AI agent coordination and compute marketplaces

## 🏢 Organization Structure

### ASI Alliance Partners
| Organization | Role | Contribution |
|--------------|------|--------------|
| Fetch.ai | Infrastructure Lead | Autonomous agent technology |
| SingularityNET | AI Services | AGI development frameworks |
| Ocean Protocol | Data Layer | Data monetization protocols |
| CUDOS | Compute Provider | Distributed computing resources |

### Development Team Structure
- **Outgoing Team**: Built all custom components from scratch
- **New Team**: Taking over maintenance and future development
- **External Dependencies**: F1R3FLY and rust-client (submodules, not modified)

## 📊 Project Status

### Current State
- **Production Status**: ✅ Fully deployed and operational
- **Server Location**: AWS Lightsail Singapore (13.251.66.61)
- **Uptime**: 99.9% over last 30 days
- **Active Users**: [To be provided]
- **Daily Transactions**: [To be provided]

### Component Status
| Component | Version | Status | Custom Built |
|-----------|---------|--------|--------------|
| ASI Wallet v2 | 2.2.0 | ✅ Live | Yes |
| Explorer | 1.0.2 | ✅ Live | Yes |
| Indexer | 2.1.1 | ✅ Live | Yes |
| Faucet | 1.0.0 | ✅ Live | Yes |
| Docs Site | 3.8.1 | ✅ Live | Yes |
| F1R3FLY | Submodule | ✅ Live | No (External) |
| Rust CLI | Submodule | ✅ Live | No (External) |

## 🎯 Business Objectives

### Primary Goals
1. **Decentralized AI Infrastructure**: Enable AI agents to interact on-chain
2. **Scalable Smart Contracts**: Support complex AI workflows
3. **Interoperability**: Bridge multiple AI ecosystems
4. **Developer Adoption**: Provide tools for AI developers

### Target Metrics
- 1000+ TPS throughput (currently 180 TPS)
- 30-second block finality (achieved)
- 100+ validators (currently 4)
- Sub-50ms API response times

## 💻 Codebase Ownership

### What You Own (Custom Built)
Everything except the submodules was built from scratch by the outgoing team:

1. **Frontend Applications**
   - ASI Wallet v2 (React 18 + TypeScript)
   - Blockchain Explorer (React 19 + Apollo)
   - Documentation Site (Docusaurus)

2. **Backend Services**
   - Python Indexer with asyncio
   - TypeScript Faucet service
   - GraphQL API configurations
   - Database schemas and migrations

3. **Infrastructure**
   - Docker configurations
   - Kubernetes manifests
   - Deployment scripts
   - Monitoring setup

### What You Don't Own (Submodules)
These are external dependencies - DO NOT MODIFY:
- `f1r3fly/` - Core blockchain (Scala)
- `rust-client/` - CLI tools (Rust)

Use patches in `patches/` directory for any required modifications.

## 🔄 Development Workflow

### Repository Structure
```
asi-chain/
├── asi_wallet_v2/        # Custom: React wallet
├── explorer/             # Custom: Blockchain explorer
├── indexer/              # Custom: Python indexer
├── faucet/               # Custom: Token faucet
├── docs-site/            # Custom: Documentation
├── f1r3fly/              # Submodule: DO NOT MODIFY
├── rust-client/          # Submodule: DO NOT MODIFY
├── scripts/              # Custom: Deployment scripts
├── patches/              # F1R3FLY patches
└── onboarding/           # This documentation
```

### Git Workflow
- **Main Branch**: `main` (production)
- **Development Branch**: `develop` (current work)
- **Feature Branches**: `feature/description`
- **Hotfix Branches**: `hotfix/issue`

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and test locally
3. Create pull request to `develop`
4. Code review by team member
5. Merge after approval
6. Deploy to staging
7. Merge to `main` for production

## 🚀 Technology Stack

### Frontend
- **React**: v18 (Wallet), v19 (Explorer)
- **TypeScript**: All frontend code
- **Redux Toolkit**: State management
- **Apollo Client**: GraphQL integration
- **WalletConnect v2**: DApp connectivity

### Backend
- **Python 3.9+**: Indexer service
- **Node.js**: Faucet service
- **PostgreSQL 14**: Database
- **Hasura**: GraphQL engine
- **Redis**: Caching layer

### Blockchain
- **F1R3FLY**: CBC Casper PoS consensus
- **Rholang**: Smart contract language
- **RSpace**: Execution environment
- **REV Token**: Native cryptocurrency

### Infrastructure
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **AWS Lightsail**: Cloud hosting
- **Nginx**: Web server
- **Prometheus/Grafana**: Monitoring

## 📈 Performance Characteristics

### Current Performance
- **Block Time**: 30 seconds
- **Throughput**: 180 TPS
- **Finality**: ~60 seconds
- **API Response**: &lt;100ms average
- **Indexer Sync**: 100 blocks/2s

### Known Limitations
- Bootstrap node cannot process transactions
- 15-second wallet balance cache (prevents API flooding)
- Rust CLI build takes 10-15 minutes first time
- Port 5000 conflict on macOS (use 5050)

## 🎓 Required Knowledge

### Must Have
- React and TypeScript
- Docker and containerization
- PostgreSQL and database management
- REST and GraphQL APIs
- Git and version control

### Should Have
- Python async programming
- Kubernetes basics
- AWS cloud services
- Blockchain concepts
- CI/CD pipelines

### Nice to Have
- Scala (for F1R3FLY understanding)
- Rust (for CLI modifications)
- Rholang smart contracts
- Process calculus theory

## 📝 Key Decisions Made

### Architectural Decisions
1. **Rust CLI Bridge**: All blockchain interactions go through `node_cli`
2. **Observer Pattern**: Separate read-only node for queries
3. **Global Caching**: 15-second cache prevents API overload
4. **Zero-Touch Deployment**: Automated Hasura relationship setup
5. **Validator Rotation**: Autopropose cycles through validators

### Technology Choices
1. **React over Vue/Angular**: Team expertise and ecosystem
2. **Python for Indexer**: Async capabilities and rapid development
3. **PostgreSQL over MongoDB**: ACID compliance and GraphQL integration
4. **Hasura over custom GraphQL**: Automatic API generation
5. **AWS Lightsail over EC2**: Simplicity and cost-effectiveness

## 🔮 Future Roadmap

### Short Term (3 months)
- [ ] Increase validator count to 10
- [ ] Implement caching improvements
- [ ] Add monitoring dashboards
- [ ] Improve API documentation
- [ ] Enhance wallet UX

### Medium Term (6 months)
- [ ] Scale to 500 TPS
- [ ] Implement cross-chain bridges
- [ ] Add AI agent frameworks
- [ ] Launch mainnet
- [ ] Mobile wallet apps

### Long Term (12 months)
- [ ] 1000+ TPS throughput
- [ ] 100+ validators
- [ ] Full AI marketplace
- [ ] Enterprise integrations
- [ ] Regulatory compliance

## ⚠️ Critical Warnings

1. **NEVER** send transactions to bootstrap node (40403)
2. **ALWAYS** use validator nodes for transactions (40413, 40423)
3. **DO NOT** modify f1r3fly/ or rust-client/ directories
4. **MUST** run patch script before Docker deployments
5. **ROTATE** all credentials immediately after handover

## 📚 Next Steps

After reading this overview:
1. Continue to [02-DEVELOPMENT-SETUP.md](02-DEVELOPMENT-SETUP.md)
2. Set up your local development environment
3. Get access to production systems
4. Start exploring the codebase

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: October 2025
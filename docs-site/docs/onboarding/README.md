# 📚 ASI Chain Onboarding Documentation

Welcome to the ASI Chain development team! This folder contains all documentation needed for a complete handover and onboarding to the ASI Chain codebase.

## 🎯 Quick Start

**First Day?** Start here:
1. Read [OVERVIEW.md](OVERVIEW.md) - Project overview and what you're working on
2. Follow [DEVELOPMENT-SETUP.md](DEVELOPMENT-SETUP.md) - Get your environment running
3. Review [SECURITY-CREDENTIALS.md](SECURITY-CREDENTIALS.md) - Access and security requirements

## 📁 Documentation Structure

### Core Documents (Read in Order)

| Document | Purpose | Priority |
|----------|---------|----------|
| [OVERVIEW.md](OVERVIEW.md) | Project overview, team structure, codebase ownership | Day 1 |
| [DEVELOPMENT-SETUP.md](DEVELOPMENT-SETUP.md) | Local development environment setup | Day 1 |
| [SECURITY-CREDENTIALS.md](SECURITY-CREDENTIALS.md) | Security protocols, credentials, access management | Day 1 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture deep dive | Week 1 |
| [PRODUCTION-INFRASTRUCTURE.md](PRODUCTION-INFRASTRUCTURE.md) | Production environment details | Week 1 |

### Component Guides

| Document | Component | Purpose |
|----------|-----------|---------|
| [WALLET-GUIDE.md](WALLET-GUIDE.md) | ASI Wallet v2 | Frontend wallet application |
| [EXPLORER-GUIDE.md](EXPLORER-GUIDE.md) | Blockchain Explorer | Block and transaction explorer |
| [INDEXER-GUIDE.md](INDEXER-GUIDE.md) | Python Indexer | Blockchain data indexing service |
| [FAUCET-GUIDE.md](FAUCET-GUIDE.md) | Token Faucet | Testnet token distribution |
| [DOCS-SITE-GUIDE.md](DOCS-SITE-GUIDE.md) | Documentation Site | Docusaurus documentation |

### Operations & Maintenance

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [DEPLOYMENT-PROCEDURES.md](DEPLOYMENT-PROCEDURES.md) | How to deploy each component | Before deployments |
| [OPERATIONS-RUNBOOK.md](OPERATIONS-RUNBOOK.md) | Daily operations and monitoring | Daily |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions | When issues arise |
| [EMERGENCY-PROCEDURES.md](EMERGENCY-PROCEDURES.md) | Critical incident response | Emergencies only |

### Reference Documents

| Document | Purpose |
|----------|---------|
| [API-REFERENCE.md](API-REFERENCE.md) | API endpoints and GraphQL schemas |
| [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md) | Database structure and migrations |
| [MONITORING-ALERTS.md](MONITORING-ALERTS.md) | Monitoring setup and alert configuration |
| [HANDOVER.md](HANDOVER.md) | Original comprehensive handover document |

## 🚀 Onboarding Timeline

### Week 1: Foundation
- [ ] Complete development environment setup
- [ ] Access all production systems
- [ ] Review architecture documentation
- [ ] Run local versions of all services

### Week 2: Deep Dive
- [ ] Study component-specific guides
- [ ] Review codebase with annotations
- [ ] Understand deployment procedures
- [ ] Shadow production operations

### Week 3: Hands-On
- [ ] Make first code changes
- [ ] Deploy to staging/test environment
- [ ] Handle routine operations tasks
- [ ] Participate in code reviews

### Week 4: Independence
- [ ] Lead a deployment
- [ ] Resolve production issues
- [ ] Document any gaps found
- [ ] Sign off on handover

## 🔑 Critical Information

### Production Server
- **IP**: 13.251.66.61 (AWS Lightsail Singapore)
- **Access**: SSH with key in `XXXXXXX.pem`
- **All Services**: Currently live and operational

### Key URLs
- Wallet: http://13.251.66.61:3000
- Explorer: http://13.251.66.61:3001
- Documentation: http://13.251.66.61:3003
- Faucet: http://13.251.66.61:5050
- GraphQL: http://13.251.66.61:8080/v1/graphql
- Indexer API: http://13.251.66.61:9090

### Emergency Contacts
[To be filled by outgoing team]

## ⚠️ Important Notes

1. **Never modify** the `f1r3fly/` or `rust-client/` directories (Git submodules)
2. **Always use** validator nodes (40413/40423) for transactions, never bootstrap (40403)
3. **Run** `./scripts/apply-f1r3fly-patches.sh` before Docker deployments
4. **Rotate all credentials** immediately after handover

## 📞 Support

For questions during onboarding:
1. Check the relevant guide document
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Consult [HANDOVER.md](HANDOVER.md) for comprehensive details
4. Contact the outgoing team (contacts in each document)

---

**Last Updated**: September 2025  
**Version**: 1.0  
**Maintained by**: ASI Chain Development Team
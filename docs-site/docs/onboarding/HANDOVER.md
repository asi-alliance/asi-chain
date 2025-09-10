# ASI Chain Development Team Handover Document

**Date**: September 2025  
**Prepared for**: New Development Team  
**Repository**: https://github.com/asi-alliance/asi-chain

---

## 🎯 Executive Summary

This document provides a complete handover of the ASI Chain codebase from the outgoing development team to the incoming team. The ASI Chain is a production blockchain infrastructure for decentralized AI, built on F1R3FLY (formerly RChain) technology. The system is currently live on AWS Lightsail with all services operational.

### Codebase Ownership
- **Custom-built by outgoing team**: All code except submodules
- **External submodules** (DO NOT MODIFY):
  - `f1r3fly/` - Core blockchain implementation
  - `rust-client/` - Rust CLI for blockchain interaction
- **Production Status**: Fully deployed and operational at 13.251.66.61

---

## 📋 Pre-Handover Checklist

### Access Requirements
- [ ] GitHub repository access (asi-alliance/asi-chain)
- [ ] AWS Lightsail console access
- [ ] SSH key for server (`XXXXXXX.pem`)
- [ ] Docker Hub access (if using private images)
- [ ] Domain management access (if applicable)
- [ ] Monitoring/alerting systems access

### Knowledge Prerequisites
- [ ] F1R3FLY/RChain blockchain concepts
- [ ] Rholang smart contract language basics
- [ ] React 18/19 and TypeScript
- [ ] Python 3.9+ async programming
- [ ] Docker and Kubernetes
- [ ] PostgreSQL and Hasura GraphQL
- [ ] AWS Lightsail operations

---

## 🏗️ System Architecture Overview

### Component Breakdown

```
Component               | Language/Framework | Version | Custom Code | Status
------------------------|-------------------|---------|-------------|--------
ASI Wallet v2           | React 18/TypeScript| 2.2.0   | ✅ Yes      | Live
Blockchain Explorer     | React 19/Apollo   | 1.0.2   | ✅ Yes      | Live
Python Indexer          | Python 3.9+       | 2.1.1   | ✅ Yes      | Live
TypeScript Faucet       | Node.js/Express   | 1.0.0   | ✅ Yes      | Live
Documentation Site      | Docusaurus        | 3.8.1   | ✅ Yes      | Live
F1R3FLY Blockchain      | Scala 2.12        | Submodule| ❌ No      | Live
Rust CLI Client         | Rust              | Submodule| ❌ No      | Live
```

### Critical Architecture Patterns

1. **Blockchain Communication**: All blockchain interactions MUST go through the Rust CLI (`node_cli`)
2. **Node Selection**:
   - Transactions → Validator nodes (40413, 40423)
   - Queries → Observer node (40452, 40453)
   - NEVER use Bootstrap (40403) for transactions
3. **Data Flow**: F1R3FLY → Rust CLI → Python Indexer → PostgreSQL → Hasura → Frontend
4. **Caching**: 15-second global balance cache in wallet to prevent API flooding

---

## 🚨 Critical Production Information

### Live Infrastructure (AWS Lightsail Singapore)

**Server IP**: `13.251.66.61`  
**SSH Access**: `ssh -i XXXXXXX.pem ubuntu@13.251.66.61`

### Production Services

| Service | URL | Port | Health Check |
|---------|-----|------|--------------|
| ASI Wallet v2 | http://13.251.66.61:3000 | 3000 | `/` |
| Explorer | http://13.251.66.61:3001 | 3001 | `/` |
| Documentation | http://13.251.66.61:3003 | 3003 | `/` |
| Token Faucet | http://13.251.66.61:5050 | 5050 | `/health` |
| GraphQL API | http://13.251.66.61:8080/v1/graphql | 8080 | `/healthz` |
| Indexer API | http://13.251.66.61:9090 | 9090 | `/health` |
| F1R3FLY Observer | http://13.251.66.61:40453 | 40453 | `/api/status` |

### Database Access
- **PostgreSQL**: `13.251.66.61:5432`
- **Database**: `asichain`
- **User**: `indexer`
- **Password**: Check `.env` files in production

---

## 🔑 Secrets and Credentials

### Location of Secrets

1. **SSH Keys**:
   - Production: `XXXXXXX.pem`
   - Permissions MUST be 600: `chmod 600 XXXXXXX.pem`

2. **Environment Variables**:
   - Indexer: `indexer/.env` (production config)
   - Wallet: `asi_wallet_v2/.env.example` (template)
   - Explorer: `explorer/.env.production.secure`
   - Faucet: `faucet/.env`

3. **Critical Secrets to Update**:
   - Hasura admin secret: `HASURA_ADMIN_SECRET`
   - Database passwords: `DATABASE_URL`
   - WalletConnect Project ID: `WALLETCONNECT_PROJECT_ID`
   - Private keys for faucet wallet

### ⚠️ Security Actions Required
1. **Rotate all secrets immediately after handover**
2. **Generate new SSH keys for production access**
3. **Update Hasura admin secret**
4. **Change database passwords**
5. **Audit and rotate API keys**

---

## 📁 Codebase Structure

### Custom Components (Maintain These)

#### 1. ASI Wallet v2 (`asi_wallet_v2/`)
- **Tech Stack**: React 18, Redux Toolkit, TypeScript
- **Key Features**: WalletConnect v2, Hardware wallet support, Rholang IDE
- **Critical Files**:
  - `src/services/RChainService.ts` - Blockchain interaction logic
  - `src/store/` - Redux state management
  - `src/components/WalletConnect/` - DApp connectivity
- **Known Issues**:
  - Balance caching prevents excessive API calls (15s global cache)
  - Hardware wallet integration requires HTTPS in production

#### 2. Blockchain Explorer (`explorer/`)
- **Tech Stack**: React 19, Apollo GraphQL, TypeScript
- **Key Features**: Real-time updates, validator tracking, transaction history
- **Critical Files**:
  - `src/graphql/` - GraphQL queries and subscriptions
  - `src/components/ValidatorsList.tsx` - Validator deduplication logic
- **Known Issues**:
  - Fixed in v1.0.2: Validator duplication bug

#### 3. Python Indexer (`indexer/`)
- **Tech Stack**: Python 3.9+, asyncio, PostgreSQL, Hasura
- **Key Features**: Zero-touch deployment, automatic Hasura setup
- **Critical Files**:
  - `src/rust_indexer.py` - Main indexing logic
  - `migrations/000_comprehensive_initial_schema.sql` - Database schema
  - `scripts/setup-hasura-relationships.sh` - GraphQL setup
- **Architecture**:
  ```
  F1R3FLY Node → Rust CLI → Python Indexer → PostgreSQL → Hasura
  ```
- **Known Issues**:
  - Rust CLI build takes 10-15 minutes first time
  - Must use Observer node (40452) for optimal performance

#### 4. TypeScript Faucet (`faucet/typescript-faucet/`)
- **Tech Stack**: Node.js, Express, TypeScript
- **Key Features**: Rate limiting, transaction history, SQLite storage
- **Critical Files**:
  - `src/services/wallet.ts` - Wallet operations
  - `src/server.ts` - Express server setup
- **Known Issues**:
  - Port 5050 (not 5000) to avoid macOS conflicts
  - Helmet.js HSTS disabled for HTTP deployment

#### 5. Documentation Site (`docs-site/`)
- **Tech Stack**: Docusaurus 3.8.1
- **Key Features**: PWA support, versioned docs, search
- **Deployment**: Docker with Nginx on port 3003

### External Dependencies (DO NOT MODIFY)

#### F1R3FLY Blockchain (`f1r3fly/`)
- Git submodule from github.com/F1R3FLY-io
- Core blockchain implementation in Scala
- Patches applied via `patches/` directory
- Run `./scripts/apply-f1r3fly-patches.sh` before deployment

#### Rust Client (`rust-client/`)
- Git submodule for blockchain CLI
- Required by indexer for all blockchain operations
- Built automatically in Docker containers

---

## 🚀 Day One Tasks

### Immediate Actions (Day 1)

1. **Verify Access**
   ```bash
   # Test SSH access
   ssh -i XXXXXXX.pem ubuntu@13.251.66.61
   
   # Check all services
   curl http://13.251.66.61:9090/health
   curl http://13.251.66.61:40453/api/status
   ```

2. **Review Service Health**
   ```bash
   # On production server
   docker ps --format "table {{.Names}}\t{{.Status}}"
   docker logs asi-rust-indexer --tail 50
   docker logs autopropose --tail 20
   ```

3. **Backup Current State**
   ```bash
   # Backup database
   docker exec asi-indexer-db pg_dump -U indexer asichain > backup_$(date +%Y%m%d).sql
   
   # Document current block height
   curl http://13.251.66.61:9090/status | jq .latest_block
   ```

### First Week Priorities

1. **Security Audit**
   - Rotate all credentials
   - Review firewall rules
   - Audit exposed ports
   - Check for hardcoded secrets

2. **Knowledge Transfer Sessions**
   - F1R3FLY/Rholang basics
   - Indexer architecture walkthrough
   - Wallet/Explorer data flow
   - Deployment procedures

3. **Documentation Review**
   - Read all `*_DEPLOYMENT.md` files
   - Study GraphQL schema at http://13.251.66.61:8080/console

4. **Development Environment Setup**
   ```bash
   # Clone with submodules
   git clone --recursive https://github.com/asi-alliance/asi-chain
   
   # Apply patches
   ./scripts/apply-f1r3fly-patches.sh
   
   # Start local development
   cd indexer && echo "1" | ./deploy.sh
   ```

---

## 🔧 Common Operations

### Deployment Procedures

#### Update ASI Wallet
```bash
cd asi_wallet_v2
npm run build
docker build -t asi-wallet:latest .
docker stop asi-wallet-v2
docker run -d --name asi-wallet-v2 -p 3000:80 asi-wallet:latest
```

#### Update Indexer
```bash
cd indexer
echo "2" | ./deploy.sh  # Option 2 for remote deployment
docker logs asi-rust-indexer -f  # Monitor sync
```

#### Emergency Recovery
```bash
# Full system restart
docker-compose down
docker system prune --volumes
./scripts/apply-f1r3fly-patches.sh
docker-compose up -d

# Indexer only restart
cd indexer
docker-compose -f docker-compose.rust.yml down -v
echo "2" | ./deploy.sh
```

### Monitoring Commands

```bash
# Check blockchain sync
curl http://13.251.66.61:9090/status

# Monitor autopropose (block creation)
docker logs autopropose --tail 50 -f

# Database connections
docker exec asi-indexer-db psql -U indexer -d asichain \
  -c "SELECT count(*) FROM pg_stat_activity;"

# GraphQL performance
time curl -X POST http://13.251.66.61:8080/v1/graphql \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ blocks_aggregate { aggregate { count } } }"}'
```

---

## ⚠️ Known Issues and Gotchas

### Critical Issues

1. **Bootstrap Node Transactions**
   - **Problem**: Transactions sent to port 40403 are ignored
   - **Solution**: Always use validator ports (40413, 40423)

2. **Indexer Rust CLI Build**
   - **Problem**: First build takes 10-15 minutes
   - **Solution**: Pre-built in Docker, patience required

3. **Port Conflicts**
   - **Problem**: macOS uses port 5000 (ControlCenter)
   - **Solution**: Faucet uses 5050 instead

4. **Wallet API Flooding**
   - **Problem**: Excessive balance queries
   - **Solution**: 15-second global cache implemented

5. **Validator Duplication**
   - **Problem**: Explorer showed 6 validators instead of 3
   - **Solution**: Fixed in v1.0.2 with deduplication

### Performance Considerations

- Indexer syncs ~100 blocks per 2 seconds
- GraphQL subscriptions use WebSocket connections
- Database connection pool limited to 20
- Autopropose rotates validators every 30 seconds
- Block time target: 30 seconds

---

## 📚 Essential Documentation

### Must-Read Documents

1. **Development**:
   - `README.md` - Project overview and setup
   - `docs/DEVELOPMENT_GUIDE.MD` - Development practices

2. **Deployment**:
   - `indexer/AWS_LIGHTSAIL_INDEXER_DEPLOYMENT.md`
   - `asi_wallet_v2/AWS_LIGHTSAIL_WALLET_DEPLOYMENT.md`
   - `explorer/AWS_LIGHTSAIL_EXPLORER_DEPLOYMENT.md`
   - `docs/F1R3FLY_QUICK_START.md`

3. **Architecture**:
   - `docs/ARCHITECTURE.md`
   - `indexer/DEPLOYMENT_GUIDE.md`
   - GraphQL Schema: http://13.251.66.61:8080/console

### External Resources

- F1R3FLY Documentation: https://github.com/F1R3FLY-io/f1r3fly
- Rholang Tutorial: https://developer.rchain.coop/tutorial
- Hasura Documentation: https://hasura.io/docs
- ASI Alliance: https://superintelligence.io

---

## 🤝 Support and Escalation

### Knowledge Gaps

Areas requiring additional documentation or training:
1. Rholang smart contract development
2. F1R3FLY consensus mechanism details
3. Custom wallet cryptography implementation
4. Production incident response procedures

### Recommended Training

1. **Week 1**: F1R3FLY/RChain fundamentals
2. **Week 2**: Indexer architecture deep dive
3. **Week 3**: Frontend applications walkthrough
4. **Week 4**: Production operations and monitoring

### Contact Information

[To be filled by outgoing team]
- Technical Lead: 
- DevOps Contact:
- Emergency Escalation:

---

## 📊 Metrics and KPIs

### System Health Metrics

Monitor these daily:
- Block production rate (target: 30s blocks)
- Indexer sync lag (target: &lt;10 blocks behind)
- API response times (target: &lt;100ms)
- Error rates across all services
- Database connection pool usage
- Docker container restarts

### Business Metrics

- Daily active wallets
- Transaction volume
- Faucet distribution rate
- Explorer page views
- API request volume

---

## 🔄 Handover Timeline

### Week 1: Knowledge Transfer
- [ ] System architecture walkthrough
- [ ] Production access setup
- [ ] Security audit and credential rotation
- [ ] Development environment setup

### Week 2: Shadowing
- [ ] Daily operations observation
- [ ] Deployment procedure practice
- [ ] Incident response training
- [ ] Code review sessions

### Week 3: Supervised Operations
- [ ] New team performs deployments with supervision
- [ ] Handle minor issues independently
- [ ] Document any gaps or questions
- [ ] Update this handover document

### Week 4: Independent Operations
- [ ] New team fully operational
- [ ] Final Q&A sessions
- [ ] Handover sign-off
- [ ] Post-handover support agreement

---

## ✅ Handover Completion Checklist

### Outgoing Team
- [ ] All documentation updated
- [ ] Credentials transferred securely
- [ ] Knowledge transfer sessions completed
- [ ] Production access verified
- [ ] Emergency procedures documented

### Incoming Team
- [ ] All systems accessible
- [ ] Documentation reviewed
- [ ] Development environment functional
- [ ] Able to deploy updates independently
- [ ] Emergency contacts established

### Sign-off

**Outgoing Team Lead**: _________________________ Date: _________

**Incoming Team Lead**: _________________________ Date: _________

---

## 📝 Appendices

### A. Emergency Runbooks

#### Service Down
1. Check Docker status: `docker ps`
2. Check logs: `docker logs [container] --tail 100`
3. Restart if needed: `docker restart [container]`
4. Verify health endpoints

#### Database Issues
1. Check connections: `docker exec asi-indexer-db pg_isready`
2. Review logs: `docker logs asi-indexer-db`
3. Check disk space: `df -h`
4. Emergency backup before recovery

#### Blockchain Sync Issues
1. Check Observer node: `curl http://13.251.66.61:40453/api/status`
2. Review indexer logs: `docker logs asi-rust-indexer`
3. Verify Rust CLI: `docker exec asi-rust-indexer ls -la /usr/local/bin/node_cli`
4. Restart indexer if needed

### B. Configuration Templates

See individual `.env.example` files in each service directory.

### C. Database Schema

Complete schema in: `indexer/migrations/000_comprehensive_initial_schema.sql`

---

**End of Handover Document**

*Last Updated: September 2025*
*Version: 1.0*
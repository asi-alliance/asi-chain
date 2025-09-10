# Development Environment Setup

## 📋 Prerequisites

### Required Software
| Software | Version | Installation | Verification |
|----------|---------|--------------|--------------|
| Git | 2.30+ | `brew install git` | `git --version` |
| Node.js | 18+ | `brew install node` | `node --version` |
| npm | 9+ | Comes with Node | `npm --version` |
| Python | 3.9+ | `brew install python@3.9` | `python3 --version` |
| Docker | 20.10+ | [Docker Desktop](https://docker.com) | `docker --version` |
| Docker Compose | 2.0+ | Comes with Docker Desktop | `docker-compose --version` |
| JDK | 11+ | `brew install openjdk@11` | `java --version` |
| sbt | 1.5+ | `brew install sbt` | `sbt --version` |
| Rust | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | `rustc --version` |
| PostgreSQL client | 14+ | `brew install postgresql` | `psql --version` |

### Optional but Recommended
- **VS Code**: Primary IDE with extensions
- **Postman/Insomnia**: API testing
- **TablePlus/DBeaver**: Database GUI
- **k9s**: Kubernetes CLI UI
- **jq**: JSON processor (`brew install jq`)

## 🚀 Initial Setup

### 1. Clone Repository with Submodules

```bash
# Clone the repository with submodules
git clone --recursive https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# If you already cloned without --recursive
git submodule init
git submodule update --recursive

# Verify submodules
git submodule status
# Should show:
# -e9f5693c739405dbe966ff495dfe8117a5569ecc f1r3fly
# -348cd8c1a807dbdae8b44b634f920d3764c5d9ef rust-client
```

### 2. Apply F1R3FLY Patches

**CRITICAL**: Always run this before Docker deployments!

```bash
# Apply patches to F1R3FLY submodule
./scripts/apply-f1r3fly-patches.sh

# Verify patches applied
git -C f1r3fly status
# Should show modified files but DO NOT commit these changes
```

### 3. Environment Configuration

```bash
# Copy environment templates
cp indexer/.env.example indexer/.env
cp faucet/.env.example faucet/.env
cp asi_wallet_v2/.env.example asi_wallet_v2/.env
cp explorer/.env.example explorer/.env

# Edit each .env file with your settings
# For local development, use the defaults
# For production connection, use .env.remote-observer
```

### 4. Build Rust CLI (One-time setup)

```bash
# Install protobuf compiler (required for Rust CLI)
# macOS
brew install protobuf

# Ubuntu/Debian
sudo apt-get install -y protobuf-compiler

# Build Rust CLI
cd rust-client
cargo build --release
cd ..

# Verify build
ls -la rust-client/target/release/node_cli
# Should show the executable
```

## 🐳 Docker Setup

### Start Core Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
docker exec asi-postgres pg_isready
# Should output: accepting connections

# Create databases
docker exec asi-postgres psql -U postgres -c "CREATE DATABASE asichain;"
docker exec asi-postgres psql -U postgres -c "CREATE USER indexer WITH PASSWORD 'indexer_pass';"
docker exec asi-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE asichain TO indexer;"
```

### Deploy F1R3FLY Blockchain (Option 1: Docker)

```bash
# Navigate to F1R3FLY directory
cd f1r3fly/docker

# Start F1R3FLY network with autopropose
docker-compose -f shard-with-autopropose.yml up -d

# Verify nodes are running
docker ps | grep rnode
# Should show: bootstrap, validator1, validator2, readonly, autopropose

# Check node status
curl http://localhost:40403/api/status | jq .
```

### Deploy F1R3FLY Blockchain (Option 2: Kubernetes)

```bash
# Use the automated script
./scripts/deploy-f1r3fly-k8s.sh

# With monitoring
./scripts/deploy-f1r3fly-k8s.sh --monitoring

# Verify deployment
kubectl get pods -n f1r3fly
```

## 🔧 Component Setup

### 1. Indexer Setup

```bash
cd indexer

# Install Python dependencies
pip3 install -r requirements.txt

# For development dependencies
pip3 install pytest pytest-asyncio pytest-cov black flake8 mypy

# Run database migrations
psql postgresql://indexer:indexer_pass@localhost:5432/asichain < migrations/000_comprehensive_initial_schema.sql

# Start indexer with automated setup
echo "1" | ./deploy.sh
# Choose option 1 for local F1R3FLY
# This will:
# - Build Rust CLI in Docker (10-15 min first time)
# - Start PostgreSQL, Hasura, and Indexer
# - Configure GraphQL relationships automatically

# Verify indexer is running
curl http://localhost:9090/health
# Should return: {"status": "healthy"}
```

### 2. ASI Wallet v2 Setup

```bash
cd asi_wallet_v2

# Install dependencies
npm install

# Start development server
npm start
# Opens at http://localhost:3000

# Run tests
npm test

# Check types
npm run type-check

# Lint code
npm run lint
```

### 3. Explorer Setup

```bash
cd explorer

# Install dependencies
npm install

# Start development server
npm start
# Opens at http://localhost:3001

# Run tests
npm test

# Build for production
npm run build
```

### 4. Faucet Setup

```bash
cd faucet/typescript-faucet

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
# Runs on http://localhost:5050

# Run tests
npm test
```

### 5. Documentation Site Setup

```bash
cd docs-site

# Install dependencies
npm install

# Start development server
npm start
# Opens at http://localhost:3003

# Build static site
npm run build

# Serve built site
npm run serve
```

## 🔌 Service Connectivity

### Verify All Services

```bash
# Create a verification script
cat > verify-services.sh << 'EOF'
#!/bin/bash

echo "Checking ASI Chain Services..."
echo "=============================="

# F1R3FLY Nodes
echo -n "F1R3FLY Bootstrap: "
curl -s http://localhost:40403/api/status > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "F1R3FLY Validator1: "
curl -s http://localhost:40413/api/status > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "F1R3FLY ReadOnly: "
curl -s http://localhost:40453/api/status > /dev/null && echo "✅ OK" || echo "❌ Failed"

# Services
echo -n "Indexer API: "
curl -s http://localhost:9090/health > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "GraphQL API: "
curl -s http://localhost:8080/healthz > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "ASI Wallet: "
curl -s http://localhost:3000 > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "Explorer: "
curl -s http://localhost:3001 > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "Faucet: "
curl -s http://localhost:5050/health > /dev/null && echo "✅ OK" || echo "❌ Failed"

echo -n "Documentation: "
curl -s http://localhost:3003 > /dev/null && echo "✅ OK" || echo "❌ Failed"

# Database
echo -n "PostgreSQL: "
docker exec asi-postgres pg_isready > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Failed"

# Docker containers
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(asi-|rnode)"
EOF

chmod +x verify-services.sh
./verify-services.sh
```

## 🧪 Testing Your Setup

### 1. Test Blockchain Connection

```bash
# Get node status
curl http://localhost:40403/api/status | jq .

# Deploy a test contract (use validator, not bootstrap!)
curl -X POST http://localhost:40413/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "term": "new out(`rho:io:stdout`) in { out!(\"Hello from test!\") }",
    "phloLimit": 100000,
    "phloPrice": 1,
    "deployer": "1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g"
  }'
```

### 2. Test Indexer

```bash
# Check indexer status
curl http://localhost:9090/status | jq .

# Query via GraphQL
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: myadminsecretkey" \
  -d '{"query": "{ blocks(limit: 5) { block_number timestamp } }"}'
```

### 3. Test Wallet

```bash
# Open in browser
open http://localhost:3000

# Should see the wallet interface
# Try creating a new wallet
# Check balance display
```

### 4. Test Explorer

```bash
# Open in browser
open http://localhost:3001

# Should see latest blocks
# Click on a block to see details
# Check validator list
```

## 🔧 VS Code Setup

### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "rust-lang.rust-analyzer",
    "scala-lang.scala",
    "GraphQL.vscode-graphql",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "redhat.vscode-yaml",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### Workspace Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 🐛 Common Setup Issues

### Issue: Docker containers not starting
```bash
# Solution: Clean and restart
docker-compose down -v
docker system prune --all --volumes --force
./scripts/apply-f1r3fly-patches.sh
docker-compose up -d
```

### Issue: Port already in use
```bash
# Find process using port
lsof -i :PORT
# Kill process
kill -9 PID
```

### Issue: Rust CLI build fails
```bash
# Install protobuf compiler
brew install protobuf  # macOS
sudo apt-get install -y protobuf-compiler  # Linux
```

### Issue: Indexer not syncing
```bash
# Check logs
docker logs asi-rust-indexer --tail 100
# Verify Rust CLI exists
docker exec asi-rust-indexer ls -la /usr/local/bin/node_cli
```

### Issue: GraphQL relationships missing
```bash
# Run setup script
cd indexer
bash scripts/setup-hasura-relationships.sh
```

## 📝 Development Workflow

### Daily Routine

1. **Morning Setup**
   ```bash
   git pull origin develop
   git submodule update --recursive
   ./scripts/apply-f1r3fly-patches.sh
   docker-compose up -d
   ./verify-services.sh
   ```

2. **Before Coding**
   ```bash
   git checkout -b feature/your-feature
   npm install  # or pip install -r requirements.txt
   npm test     # Run tests first
   ```

3. **After Changes**
   ```bash
   npm run lint
   npm run type-check
   npm test
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature
   ```

4. **End of Day**
   ```bash
   docker-compose down
   git status  # Check for uncommitted changes
   ```

## 🔄 Connecting to Production

To connect your local development environment to production blockchain:

```bash
# Use remote observer configuration
cd indexer
cp .env.remote-observer .env

# Edit .env to use production endpoints
NODE_HOST=13.251.66.61
GRPC_PORT=40452  # Observer gRPC
HTTP_PORT=40453  # Observer HTTP

# Restart indexer
docker-compose -f docker-compose.rust.yml restart rust-indexer
```

## ✅ Setup Checklist

- [ ] All prerequisites installed
- [ ] Repository cloned with submodules
- [ ] F1R3FLY patches applied
- [ ] Environment files configured
- [ ] Rust CLI built successfully
- [ ] Docker containers running
- [ ] All services verified working
- [ ] Can view wallet at localhost:3000
- [ ] Can view explorer at localhost:3001
- [ ] Can query GraphQL at localhost:8080
- [ ] VS Code configured with extensions

## 📚 Next Steps

Once your development environment is set up:
1. Continue to [03-SECURITY-CREDENTIALS.md](03-SECURITY-CREDENTIALS.md)
2. Set up production access
3. Review the architecture guide
4. Start exploring the codebase

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: October 2025
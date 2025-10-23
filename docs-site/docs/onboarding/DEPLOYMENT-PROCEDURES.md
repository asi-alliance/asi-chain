# Deployment Procedures

## 🚀 Deployment Overview

ASI Chain uses Docker-based deployments for all components. Production runs on AWS Lightsail (13.251.66.61) with automated deployment scripts.

## 📋 Pre-Deployment Checklist

### Before ANY Deployment

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations ready
- [ ] Environment variables updated
- [ ] Backup created
- [ ] Deployment window scheduled
- [ ] Team notified
- [ ] Rollback plan prepared

### Production Checklist

- [ ] Change approved by team lead
- [ ] Security scan completed
- [ ] Performance impact assessed
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Customer communication sent (if needed)

## 🔄 Component Deployment Procedures

### 1. ASI Wallet v2 Deployment

#### Local Build & Test
```bash
cd asi_wallet_v2

# Run tests
npm test
npm run lint
npm run type-check

# Build production bundle
npm run build

# Test production build locally
npm run serve
# Open http://localhost:5000
```

#### Docker Deployment
```bash
# Build Docker image
docker build -t asi-wallet:latest .

# Test locally
docker run -p 3000:80 asi-wallet:latest

# Tag for production
docker tag asi-wallet:latest asi-wallet:v2.2.0
```

#### Production Deployment
```bash
# SSH to production
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# Backup current deployment
docker exec asi-wallet-v2 tar -czf /tmp/wallet-backup.tar.gz /usr/share/nginx/html
docker cp asi-wallet-v2:/tmp/wallet-backup.tar.gz ./backups/

# Deploy new version
docker stop asi-wallet-v2
docker rm asi-wallet-v2
docker run -d \
  --name asi-wallet-v2 \
  --restart unless-stopped \
  -p 3000:80 \
  -v /etc/nginx/custom.conf:/etc/nginx/conf.d/default.conf:ro \
  asi-wallet:v2.2.0

# Verify deployment
curl http://localhost:3000
docker logs asi-wallet-v2
```

#### Rollback Procedure
```bash
# Stop new version
docker stop asi-wallet-v2
docker rm asi-wallet-v2

# Restore previous version
docker run -d \
  --name asi-wallet-v2 \
  --restart unless-stopped \
  -p 3000:80 \
  asi-wallet:v2.1.0  # Previous version
```

---

### 2. Explorer Deployment

#### Automated Deployment Script
```bash
cd explorer

# Use the deployment script
./deploy-docker.sh rebuild

# Script handles:
# - Building new image
# - Stopping old container
# - Starting new container
# - Health checks
```

#### Manual Deployment
```bash
# Build and test
npm run build
docker build -t asi-explorer:latest .

# Deploy to production
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

docker stop asi-explorer
docker rm asi-explorer
docker run -d \
  --name asi-explorer \
  --restart unless-stopped \
  -p 3001:80 \
  --env-file .env.production \
  asi-explorer:latest

# Verify
curl http://localhost:3001
```

---

### 3. Indexer Deployment (Most Complex)

#### Pre-deployment Verification
```bash
cd indexer

# Test locally first
make test
make lint

# Check database migrations
psql $DATABASE_URL -c "\dt"
```

#### Zero-Touch Deployment
```bash
# SSH to production
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

cd asi-chain/indexer

# Backup database
docker exec asi-indexer-db pg_dump -U indexer asichain > backup_$(date +%Y%m%d).sql

# Deploy with automatic setup
echo "2" | ./deploy.sh  # Option 2 for remote F1R3FLY

# Monitor deployment
docker logs asi-rust-indexer -f

# Verify indexing
curl http://localhost:9090/status
```

#### Manual Deployment Steps
```bash
# 1. Stop indexer (keeps database)
docker-compose -f docker-compose.rust.yml stop rust-indexer

# 2. Update code
git pull origin main

# 3. Rebuild if needed
docker-compose -f docker-compose.rust.yml build rust-indexer

# 4. Run migrations
docker exec asi-indexer-db psql -U indexer asichain < migrations/new_migration.sql

# 5. Start indexer
docker-compose -f docker-compose.rust.yml up -d rust-indexer

# 6. Verify
curl http://localhost:9090/health
```

#### Indexer Rollback
```bash
# Stop indexer
docker-compose -f docker-compose.rust.yml stop rust-indexer

# Restore database if needed
docker exec -i asi-indexer-db psql -U indexer asichain < backup_20250909.sql

# Start previous version
docker-compose -f docker-compose.rust.yml up -d rust-indexer
```

---

### 4. Faucet Deployment

#### Build and Deploy
```bash
cd faucet/typescript-faucet

# Build
npm run build

# Create Docker image
docker build -t asi-faucet:latest .

# Deploy to production
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# Stop old version
docker stop asi-faucet
docker rm asi-faucet

# Start new version
docker run -d \
  --name asi-faucet \
  --restart unless-stopped \
  -p 5050:5050 \
  --env-file .env.production \
  -v /data/faucet:/app/data \
  asi-faucet:latest

# Verify
curl http://localhost:5050/health
```

---

### 5. Documentation Site Deployment

#### Static Build Deployment
```bash
cd docs-site

# Build static files
npm run build

# Deploy with Docker
docker build -t asi-docs:latest .

# Production deployment
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

docker stop asi-docs
docker rm asi-docs
docker run -d \
  --name asi-docs \
  --restart unless-stopped \
  -p 3003:80 \
  asi-docs:latest
```

---

## 🔧 F1R3FLY Blockchain Deployment

### ⚠️ CRITICAL: F1R3FLY is a submodule - DO NOT MODIFY

#### Docker Compose Deployment
```bash
# Apply patches first (REQUIRED!)
./scripts/apply-f1r3fly-patches.sh

cd f1r3fly/docker

# Start blockchain network
docker-compose -f shard-with-autopropose.yml up -d

# Verify nodes are running
docker ps | grep rnode

# Check node status
curl http://localhost:40403/api/status
curl http://localhost:40413/api/status
curl http://localhost:40453/api/status
```

#### Kubernetes Deployment
```bash
# Use automated script
./scripts/deploy-f1r3fly-k8s.sh

# With custom replicas
./scripts/deploy-f1r3fly-k8s.sh --replicas 5

# With monitoring
./scripts/deploy-f1r3fly-k8s.sh --monitoring

# Verify deployment
kubectl get pods -n f1r3fly
kubectl logs -f f1r3fly0-0 -n f1r3fly
```

---

## 📦 Full Stack Deployment

### Complete System Deployment
```bash
#!/bin/bash
# deploy-all.sh

echo "Starting full stack deployment..."

# 1. Apply F1R3FLY patches
./scripts/apply-f1r3fly-patches.sh

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Start blockchain
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml up -d
cd ../..

# 4. Deploy indexer
cd indexer
echo "2" | ./deploy.sh
cd ..

# 5. Deploy frontend services
docker-compose up -d asi-wallet asi-explorer asi-faucet asi-docs

# 6. Verify all services
./verify-services.sh

echo "Deployment complete!"
```

### Production Deployment Order

1. **Database changes** (if any)
2. **Indexer** (handles blockchain data)
3. **GraphQL/Hasura** (API layer)
4. **Backend services** (Faucet)
5. **Frontend applications** (Wallet, Explorer)
6. **Documentation** (last, non-critical)

---

## 🔄 Blue-Green Deployment

### Setup Blue-Green for Wallet
```bash
# Deploy to blue environment
docker run -d \
  --name asi-wallet-blue \
  -p 3000:80 \
  asi-wallet:new

# Test blue environment
curl http://localhost:3000

# Switch traffic to blue
docker stop asi-wallet-green
docker rename asi-wallet-blue asi-wallet-green

# Keep old version as blue for rollback
docker rename asi-wallet-green asi-wallet-blue
```

---

## 📊 Post-Deployment Verification

### Automated Health Checks
```bash
#!/bin/bash
# post-deploy-check.sh

echo "Running post-deployment checks..."

# Check all services are running
services=("asi-wallet" "asi-explorer" "asi-indexer" "asi-faucet")
for service in "${services[@]}"; do
  if docker ps | grep -q $service; then
    echo "✅ $service is running"
  else
    echo "❌ $service is not running"
    exit 1
  fi
done

# Check endpoints
endpoints=(
  "http://localhost:3000:Wallet"
  "http://localhost:3001:Explorer"
  "http://localhost:5050/health:Faucet"
  "http://localhost:9090/health:Indexer"
  "http://localhost:8080/healthz:GraphQL"
)

for endpoint in "${endpoints[@]}"; do
  IFS=':' read -r url name <<< "$endpoint"
  if curl -f -s "$url" > /dev/null; then
    echo "✅ $name endpoint responding"
  else
    echo "❌ $name endpoint not responding"
    exit 1
  fi
done

# Check database connectivity
if docker exec asi-indexer-db pg_isready > /dev/null; then
  echo "✅ Database is ready"
else
  echo "❌ Database is not ready"
  exit 1
fi

# Check blockchain sync
latest_block=$(curl -s http://localhost:9090/status | jq -r '.latest_block')
if [ "$latest_block" -gt 0 ]; then
  echo "✅ Blockchain syncing (block: $latest_block)"
else
  echo "❌ Blockchain not syncing"
  exit 1
fi

echo "All checks passed!"
```

### Manual Verification Steps

1. **Wallet Verification**
   - Create new wallet
   - Check balance display
   - Send test transaction
   - Verify WalletConnect

2. **Explorer Verification**
   - View latest blocks
   - Search for transaction
   - Check validator list
   - Verify real-time updates

3. **Indexer Verification**
   - Check sync status
   - Query GraphQL endpoint
   - Verify data consistency
   - Monitor performance

4. **Faucet Verification**
   - Request tokens
   - Check rate limiting
   - Verify transaction

---

## 🔄 Rollback Procedures

### General Rollback Strategy
```bash
#!/bin/bash
# rollback.sh

COMPONENT=$1
VERSION=$2

echo "Rolling back $COMPONENT to version $VERSION..."

# Stop current version
docker stop asi-$COMPONENT
docker rm asi-$COMPONENT

# Start previous version
docker run -d \
  --name asi-$COMPONENT \
  --restart unless-stopped \
  -p $PORT:80 \
  asi-$COMPONENT:$VERSION

# Verify rollback
docker ps | grep asi-$COMPONENT
```

### Database Rollback
```bash
# Stop services using database
docker-compose stop rust-indexer hasura

# Restore database backup
docker exec -i asi-indexer-db psql -U indexer asichain < backup.sql

# Restart services
docker-compose up -d rust-indexer hasura
```

---

## 🚦 Deployment Windows

### Recommended Deployment Times

| Component | Best Time | Duration | Impact |
|-----------|-----------|----------|--------|
| Wallet | Off-peak hours | 5 min | User-facing |
| Explorer | Off-peak hours | 5 min | User-facing |
| Indexer | Any time | 15 min | API delays |
| Faucet | Any time | 2 min | Service pause |
| Documentation | Any time | 2 min | None |
| F1R3FLY | Maintenance window | 30 min | Full outage |

### Deployment Communication

```markdown
## Deployment Notification Template

**Subject**: Scheduled Maintenance - [Component] Deployment

**When**: [Date] at [Time] UTC
**Duration**: Approximately [Duration]
**Impact**: [Description of impact]

**What's being deployed**:
- [Feature/Fix 1]
- [Feature/Fix 2]

**Action required**: None / [Specific action]

**Contact**: [Support email/channel]
```

---

## 📈 Deployment Metrics

### Track These Metrics

```yaml
Deployment Success Rate:
  Target: >95%
  Measure: Successful deploys / Total deploys

Mean Time to Deploy:
  Target: &lt;15 minutes
  Measure: Time from start to verification

Rollback Rate:
  Target: &lt;5%
  Measure: Rollbacks / Total deploys

Deployment Frequency:
  Target: Daily deployments
  Measure: Deploys per week

Failed Deployment Recovery:
  Target: &lt;30 minutes
  Measure: Time to restore service
```

---

## 🛠️ Deployment Tools

### Required Tools
```bash
# Install deployment tools
npm install -g pm2  # Process manager
pip install ansible  # Automation
brew install helm    # Kubernetes packages
brew install terraform  # Infrastructure as code
```

### Useful Scripts
```bash
# Create deployment script template
cat > deploy-template.sh << 'EOF'
#!/bin/bash
set -e  # Exit on error

COMPONENT=$1
VERSION=$2
ENVIRONMENT=$3

# Validation
if [ -z "$COMPONENT" ] || [ -z "$VERSION" ]; then
  echo "Usage: $0 <component> <version> [environment]"
  exit 1
fi

# Set environment
ENVIRONMENT=${ENVIRONMENT:-production}

echo "Deploying $COMPONENT v$VERSION to $ENVIRONMENT"

# Pre-deployment checks
./pre-deploy-checks.sh $COMPONENT

# Backup
./backup.sh $COMPONENT

# Deploy
./deploy-$COMPONENT.sh $VERSION

# Post-deployment verification
./post-deploy-checks.sh $COMPONENT

# Notification
./notify-team.sh "Deployed $COMPONENT v$VERSION to $ENVIRONMENT"

echo "Deployment complete!"
EOF

chmod +x deploy-template.sh
```

---

## ✅ Deployment Checklist Template

```markdown
## Deployment: [Component] v[Version]

### Pre-Deployment
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Security scan complete
- [ ] Documentation updated
- [ ] Backup created
- [ ] Team notified

### Deployment
- [ ] Service stopped gracefully
- [ ] New version deployed
- [ ] Configuration updated
- [ ] Service started
- [ ] Health check passed

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring verified
- [ ] Performance acceptable
- [ ] Logs checked for errors
- [ ] Team notified of completion

### Rollback (if needed)
- [ ] Issue identified
- [ ] Rollback decision made
- [ ] Previous version restored
- [ ] Service verified
- [ ] Incident report created
```

---

## 📚 Next Steps

After understanding deployment procedures:
1. Continue to [12-OPERATIONS-RUNBOOK.md](12-OPERATIONS-RUNBOOK.md)
2. Practice deployments in staging
3. Document any missing procedures
4. Create automation scripts

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: After each deployment
# Troubleshooting Guide

## 🚨 Critical Issues (Fix Immediately)

### 1. Bootstrap Node Transaction Issue

**Problem**: Transactions sent to bootstrap node (40403) are silently ignored

**Symptoms**:
- Transaction appears to succeed but never gets included in blocks
- No error message returned
- Balance doesn't change

**Root Cause**: Bootstrap node is for network discovery only, not transaction processing

**Solution**:
```bash
# WRONG - Never use bootstrap
curl -X POST http://13.251.66.61:40403/api/deploy

# CORRECT - Use validator nodes
curl -X POST http://13.251.66.61:40413/api/deploy  # Validator1
curl -X POST http://13.251.66.61:40423/api/deploy  # Validator2
```

**Prevention**: Update all configuration files to use validator endpoints

---

### 2. Indexer Not Syncing

**Problem**: Indexer stops processing new blocks

**Symptoms**:
```bash
curl http://localhost:9090/status
# Shows: latest_indexed_block stuck at old number
```

**Diagnostic Steps**:
```bash
# 1. Check Rust CLI exists
docker exec asi-rust-indexer ls -la /usr/local/bin/node_cli

# 2. Check indexer logs
docker logs asi-rust-indexer --tail 100

# 3. Test Rust CLI manually
docker exec asi-rust-indexer /usr/local/bin/node_cli status \
  --host 13.251.66.61 --port 40452

# 4. Check database connection
docker exec asi-indexer-db pg_isready
```

**Common Fixes**:
```bash
# Fix 1: Restart indexer
docker restart asi-rust-indexer

# Fix 2: Rebuild Rust CLI
cd indexer
docker-compose -f docker-compose.rust.yml build --no-cache rust-indexer

# Fix 3: Reset indexer state
docker-compose -f docker-compose.rust.yml down -v
echo "2" | ./deploy.sh
```

---

### 3. Wallet Balance Not Updating

**Problem**: Wallet shows outdated balance

**Symptoms**:
- Balance doesn't reflect recent transactions
- Stuck at old value for >15 seconds

**Root Cause**: 15-second global cache preventing updates

**Solution**:
```javascript
// Force cache refresh in wallet
balanceCache.clear();
await fetchBalance(address);

// Or wait 15 seconds for automatic refresh
```

**Long-term Fix**: Implement cache invalidation on transaction events

---

## 🔧 Common Issues

### Docker Issues

#### Containers Not Starting

```bash
# Check for port conflicts
lsof -i :3000  # Example for wallet port
# Kill conflicting process
kill -9 <PID>

# Clean restart
docker-compose down -v
docker system prune --all --volumes --force
./scripts/apply-f1r3fly-patches.sh
docker-compose up -d
```

#### Out of Disk Space

```bash
# Check disk usage
df -h
docker system df

# Clean up
docker system prune --all --volumes
docker image prune -a
docker volume prune

# Remove old logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

#### Container Keeps Restarting

```bash
# Check logs
docker logs <container_name> --tail 50

# Common causes:
# 1. Database not ready
docker exec asi-postgres pg_isready

# 2. Missing environment variables
docker exec <container> env

# 3. Permission issues
docker exec <container> ls -la /app
```

### Database Issues

#### Connection Refused

```bash
# Check PostgreSQL is running
docker ps | grep postgres
docker logs asi-indexer-db

# Test connection
docker exec asi-indexer-db psql -U indexer -d asichain -c "SELECT 1"

# Fix connection string
export DATABASE_URL="postgresql://indexer:indexer_pass@localhost:5432/asichain"
```

#### Migration Failures

```bash
# Check current schema
docker exec asi-indexer-db psql -U indexer -d asichain -c "\dt"

# Re-run migrations
psql $DATABASE_URL < indexer/migrations/000_comprehensive_initial_schema.sql

# Reset database (WARNING: Data loss)
docker exec asi-indexer-db psql -U postgres -c "DROP DATABASE asichain"
docker exec asi-indexer-db psql -U postgres -c "CREATE DATABASE asichain"
```

#### Slow Queries

```sql
-- Find slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0lt;0.1
ORDER BY n_distinct DESC;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_blocks_timestamp 
ON blocks(timestamp DESC);
```

### GraphQL/Hasura Issues

#### Relationships Not Working

```bash
# Re-run relationship setup
cd indexer
bash scripts/setup-hasura-relationships.sh

# Verify in Hasura console
open http://localhost:8080/console
# Password: myadminsecretkey
```

#### Subscription Not Updating

```javascript
// Check WebSocket connection
const ws = new WebSocket('ws://localhost:8080/v1/graphql');
ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.error('WebSocket error:', error);

// Test subscription
const subscription = gql`
  subscription TestSub {
    blocks(limit: 1, order_by: {block_number: desc}) {
      block_number
    }
  }
`;
```

### Network Issues

#### F1R3FLY Node Not Responding

```bash
# Check node status
curl http://13.251.66.61:40453/api/status

# Check connectivity
ping 13.251.66.61
telnet 13.251.66.61 40453

# Check firewall
sudo ufw status

# Use alternative node
# Switch from Observer to Validator1
sed -i 's/40453/40413/g' indexer/.env
docker restart asi-rust-indexer
```

#### Autopropose Not Creating Blocks

```bash
# Check autopropose logs
docker logs autopropose --tail 50

# Verify validators are ready
curl http://localhost:40413/api/status
curl http://localhost:40423/api/status

# Restart autopropose
docker restart autopropose

# Manual block proposal (emergency)
docker exec rnode.validator1 \
  /opt/rnode/bin/rnode propose
```

### Build Issues

#### Rust CLI Build Fails

```bash
# Install missing dependencies
# macOS
brew install protobuf

# Ubuntu/Debian
sudo apt-get install -y protobuf-compiler build-essential

# Clear cache and rebuild
cd rust-client
cargo clean
cargo build --release

# Alternative: Use pre-built binary
# Download from releases page
```

#### Node.js Build Errors

```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Use correct Node version
nvm use 18
node --version  # Should be 18+

# Fix permission issues
sudo chown -R $(whoami) ~/.npm
```

#### Python Import Errors

```bash
# Check Python version
python3 --version  # Should be 3.9+

# Reinstall dependencies
pip3 uninstall -r requirements.txt -y
pip3 install -r requirements.txt

# Use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 🔍 Diagnostic Commands

### Health Check Script

```bash
#!/bin/bash
# save as health-check.sh

echo "=== ASI Chain Health Check ==="
echo

# Check Docker
echo "Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(asi-|rnode)"
echo

# Check Services
echo "Service Health:"
services=(
  "http://localhost:40403/api/status:F1R3FLY Bootstrap"
  "http://localhost:40413/api/status:F1R3FLY Validator1"
  "http://localhost:40453/api/status:F1R3FLY Observer"
  "http://localhost:9090/health:Indexer"
  "http://localhost:8080/healthz:Hasura"
  "http://localhost:3000/:Wallet"
  "http://localhost:3001/:Explorer"
  "http://localhost:5050/health:Faucet"
)

for service in "${services[@]}"; do
  IFS=':' read -r url name <<< "$service"
  if curl -s "$url" > /dev/null; then
    echo "✅ $name"
  else
    echo "❌ $name"
  fi
done
echo

# Check Database
echo "Database Status:"
if docker exec asi-indexer-db pg_isready > /dev/null 2>&1; then
  echo "✅ PostgreSQL is ready"
  block_count=$(docker exec asi-indexer-db psql -U indexer -d asichain -t -c "SELECT COUNT(*) FROM blocks" 2>/dev/null)
  echo "   Blocks indexed: $block_count"
else
  echo "❌ PostgreSQL is not ready"
fi
echo

# Check Disk Space
echo "Disk Usage:"
df -h / | tail -1
echo

# Check Memory
echo "Memory Usage:"
free -h | grep Mem
echo

# Check Logs for Errors
echo "Recent Errors (last 10 minutes):"
for container in asi-rust-indexer asi-hasura autopropose; do
  errors=$(docker logs $container --since 10m 2>&1 | grep -i error | wc -l)
  if [ $errors -gt 0 ]; then
    echo "⚠️  $container: $errors errors"
  fi
done
```

### Performance Monitoring

```bash
# Monitor in real-time
watch -n 2 'docker stats --no-stream'

# Check indexer sync speed
watch -n 5 'curl -s http://localhost:9090/status | jq .'

# Monitor block production
watch -n 30 'curl -s http://localhost:40453/api/status | jq .blockNumber'

# Database activity
watch -n 5 'docker exec asi-indexer-db psql -U indexer -d asichain -c "SELECT query, state, wait_event FROM pg_stat_activity WHERE state != '"'"'idle'"'"'"'
```

## 🔄 Recovery Procedures

### Complete System Recovery

```bash
#!/bin/bash
# Emergency recovery script

echo "Starting emergency recovery..."

# 1. Stop everything
docker-compose down -v

# 2. Clean Docker
docker system prune --all --volumes --force

# 3. Backup data if possible
if docker exec asi-indexer-db pg_dump -U indexer asichain > backup_emergency.sql 2>/dev/null; then
  echo "Database backed up"
fi

# 4. Apply patches
./scripts/apply-f1r3fly-patches.sh

# 5. Start infrastructure
docker-compose up -d postgres redis

# 6. Wait for database
sleep 10
docker exec asi-postgres pg_isready

# 7. Start blockchain
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml up -d
cd ../..

# 8. Deploy indexer
cd indexer
echo "2" | ./deploy.sh
cd ..

# 9. Start frontend services
docker-compose up -d asi-wallet asi-explorer asi-faucet

echo "Recovery complete. Check health-check.sh"
```

### Partial Recovery (Indexer Only)

```bash
# Preserve blockchain, recover indexer
cd indexer
docker-compose -f docker-compose.rust.yml down
docker volume rm asi-chain_indexer-db-data
echo "2" | ./deploy.sh
```

## 📊 Monitoring Patterns

### What to Monitor

| Metric | Normal Range | Alert Threshold | Action |
|--------|--------------|-----------------|--------|
| Block time | 30s | >60s | Check autopropose |
| Indexer lag | &lt;10 blocks | >50 blocks | Restart indexer |
| API response | &lt;100ms | >500ms | Check database |
| Memory usage | &lt;80% | >90% | Scale up/restart |
| Disk usage | &lt;70% | >85% | Clean logs/data |
| Error rate | &lt;1% | >5% | Check logs |

### Log Patterns to Watch

```bash
# Critical errors
grep -E "FATAL|CRITICAL|EMERGENCY" /var/log/syslog

# Indexer issues
docker logs asi-rust-indexer | grep -E "failed|error|timeout"

# Database problems
docker logs asi-indexer-db | grep -E "FATAL|ERROR"

# Memory issues
dmesg | grep -i "out of memory"
```

## 🆘 Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Search error messages in logs
3. Verify configuration files
4. Test with minimal setup
5. Document reproduction steps

### Information to Provide

```markdown
## Issue Report Template

**Environment:**
- OS: [e.g., Ubuntu 22.04]
- Docker version: [docker --version]
- Node version: [node --version]
- Python version: [python3 --version]

**Issue:**
- Component affected: [e.g., Indexer]
- Error message: [exact error]
- When it started: [timestamp]

**Steps to reproduce:**
1. [First step]
2. [Second step]
3. [Error occurs]

**Logs:**
```
[Relevant log excerpts]
```

**What I've tried:**
- [Solution 1]
- [Solution 2]
```

### Escalation Path

1. Check documentation
2. Review troubleshooting guide
3. Search GitHub issues
4. Contact team lead
5. Create GitHub issue
6. Emergency hotline (critical production issues only)

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: After each incident
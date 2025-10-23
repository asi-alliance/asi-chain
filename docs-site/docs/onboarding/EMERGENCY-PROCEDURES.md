# Emergency Procedures

## 🚨 Emergency Contact Information

### Escalation Chain

| Priority | Contact | Method | Response Time |
|----------|---------|--------|---------------|
| **P1 - Critical** | On-Call Engineer | Phone/Slack | 15 minutes |
| **P1 - Critical** | Team Lead | Phone | 15 minutes |
| **P2 - High** | On-Call Engineer | Slack/Email | 30 minutes |
| **P3 - Medium** | Dev Team | Slack | 2 hours |
| **P4 - Low** | Dev Team | Email | Next day |

### Emergency Contacts

```
Primary On-Call: [Phone Number]
Secondary On-Call: [Phone Number]
Team Lead: [Phone Number]
AWS Support: [Account-specific number]
Security Team: [Email/Phone]
```

### Communication Channels

```
Incident Slack Channel: #asi-chain-incidents
Status Page: https://status.asichain.io
Emergency Conference Bridge: [Number]
War Room URL: [Zoom/Meet link]
```

## 🔥 Critical Incident Types

### 1. Complete Service Outage

**Symptoms:**
- All services unreachable
- No response from http://13.251.66.61
- Multiple monitoring alerts

**Immediate Actions:**

```bash
# 1. SSH to server (if possible)
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# 2. Check system status
systemctl status
df -h
free -m
top

# 3. Check Docker
docker ps
docker stats

# 4. Emergency restart
sudo reboot  # Last resort
```

**Recovery Steps:**

```bash
# After reboot
./scripts/emergency-recovery.sh

# Manual recovery
docker-compose down
docker system prune --volumes --force
./scripts/apply-f1r3fly-patches.sh
docker-compose up -d
```

### 2. Blockchain Halted

**Symptoms:**
- No new blocks being produced
- Autopropose service down
- Validators not responding

**Immediate Actions:**

```bash
# Check autopropose
docker logs autopropose --tail 100

# Check validators
curl http://localhost:40413/api/status
curl http://localhost:40423/api/status

# Restart autopropose
docker restart autopropose

# Force block proposal
docker exec rnode.validator1 /opt/rnode/bin/rnode propose
```

**Recovery:**

```bash
# Full blockchain restart
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml down
docker-compose -f shard-with-autopropose.yml up -d

# Verify recovery
watch -n 5 'curl http://localhost:40453/api/status | jq .blockNumber'
```

### 3. Database Corruption

**Symptoms:**
- GraphQL errors
- Indexer failing
- Data inconsistencies

**Immediate Actions:**

```bash
# Stop affected services
docker stop asi-rust-indexer asi-hasura

# Check database
docker exec asi-indexer-db psql -U indexer -d asichain -c "SELECT 1"

# Check for corruption
docker exec asi-indexer-db pg_dump -U indexer asichain > emergency_backup.sql
```

**Recovery:**

```bash
# Option 1: Restore from backup
docker exec -i asi-indexer-db psql -U postgres -c "DROP DATABASE asichain"
docker exec -i asi-indexer-db psql -U postgres -c "CREATE DATABASE asichain"
docker exec -i asi-indexer-db psql -U indexer asichain < backup.sql

# Option 2: Rebuild from blockchain
cd indexer
docker-compose -f docker-compose.rust.yml down -v
echo "2" | ./deploy.sh  # Full resync
```

### 4. Security Breach

**Symptoms:**
- Unauthorized access detected
- Suspicious transactions
- Modified files
- Unusual network activity

**Immediate Actions:**

```bash
# 1. ISOLATE IMMEDIATELY
sudo ufw default deny incoming
sudo ufw allow from YOUR_IP to any port 22

# 2. Preserve evidence
docker logs --since 24h > /tmp/docker_logs_evidence.txt
sudo cp /var/log/auth.log /tmp/auth_log_evidence.txt
ps aux > /tmp/processes_evidence.txt
netstat -an > /tmp/network_evidence.txt

# 3. Stop services
docker-compose down

# 4. Check for modifications
find / -mtime -1 -type f 2>/dev/null > /tmp/modified_files.txt
```

**Recovery:**

```bash
# 1. Change all credentials
# 2. Rebuild from clean state
# 3. Restore from verified backup
# 4. Implement additional security measures
# 5. Conduct post-incident review
```

### 5. Disk Space Emergency

**Symptoms:**
- Services crashing
- Cannot write to disk
- Database errors

**Immediate Actions:**

```bash
# Check disk usage
df -h
du -sh /* | sort -h

# Emergency cleanup
docker system prune --all --volumes --force
find /var/log -name "*.log" -mtime +1 -delete
truncate -s 0 /var/log/syslog

# Clear Docker logs
for container in $(docker ps -q); do
  docker inspect $container | grep LogPath | awk '{print $2}' | tr -d '","' | xargs truncate -s 0
done

# Remove old backups
find /backup -mtime +7 -delete
```

### 6. Memory Exhaustion

**Symptoms:**
- OOM killer activated
- Services randomly dying
- System unresponsive

**Immediate Actions:**

```bash
# Check memory
free -h
ps aux --sort=-%mem | head

# Kill memory hogs
pkill -f "process_name"

# Restart heavy services with limits
docker update --memory="2g" --memory-swap="2g" asi-rust-indexer
docker restart asi-rust-indexer

# Clear caches
sync && echo 3 > /proc/sys/vm/drop_caches
```

### 7. Network Attack (DDoS)

**Symptoms:**
- High network traffic
- Services timing out
- Legitimate users cannot connect

**Immediate Actions:**

```bash
# Check connections
netstat -an | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -n

# Block suspicious IPs
sudo ufw deny from SUSPICIOUS_IP

# Enable rate limiting
sudo iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Use fail2ban
sudo fail2ban-client set sshd banip ATTACKER_IP
```

## 📋 Emergency Runbooks

### Runbook: Complete System Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "=== ASI Chain Emergency Recovery ==="
echo "Starting at $(date)"

# Step 1: Stop everything
echo "Step 1: Stopping all services..."
docker-compose down -v

# Step 2: Clean Docker
echo "Step 2: Cleaning Docker..."
docker system prune --all --volumes --force

# Step 3: Check disk space
echo "Step 3: Checking disk space..."
df -h

# Step 4: Apply patches
echo "Step 4: Applying F1R3FLY patches..."
./scripts/apply-f1r3fly-patches.sh

# Step 5: Start infrastructure
echo "Step 5: Starting infrastructure..."
docker-compose up -d postgres redis

# Step 6: Wait for database
echo "Step 6: Waiting for database..."
until docker exec asi-postgres pg_isready; do
  sleep 2
done

# Step 7: Start blockchain
echo "Step 7: Starting blockchain..."
cd f1r3fly/docker
docker-compose -f shard-with-autopropose.yml up -d
cd ../..

# Step 8: Deploy indexer
echo "Step 8: Deploying indexer..."
cd indexer
echo "2" | ./deploy.sh
cd ..

# Step 9: Start frontend services
echo "Step 9: Starting frontend services..."
docker-compose up -d asi-wallet asi-explorer asi-faucet

# Step 10: Verify
echo "Step 10: Verifying services..."
sleep 30
./scripts/health-check.sh

echo "Recovery complete at $(date)"
```

### Runbook: Data Recovery

```bash
#!/bin/bash
# data-recovery.sh

echo "=== Data Recovery Procedure ==="

# Step 1: Stop services
docker-compose stop

# Step 2: Backup current state
echo "Backing up current state..."
docker exec asi-indexer-db pg_dump -U indexer asichain > corrupted_backup_$(date +%Y%m%d_%H%M%S).sql

# Step 3: Find latest good backup
LATEST_BACKUP=$(ls -t /backup/postgres/*.sql.gz | head -1)
echo "Using backup: $LATEST_BACKUP"

# Step 4: Restore database
echo "Restoring database..."
gunzip -c $LATEST_BACKUP | docker exec -i asi-indexer-db psql -U indexer asichain

# Step 5: Restart services
docker-compose up -d

# Step 6: Verify data integrity
echo "Verifying data..."
docker exec asi-indexer-db psql -U indexer asichain -c "SELECT COUNT(*) FROM blocks"
```

### Runbook: Performance Emergency

```bash
#!/bin/bash
# performance-emergency.sh

echo "=== Performance Emergency Response ==="

# Step 1: Identify bottleneck
echo "Checking system resources..."
top -b -n 1 | head -20
docker stats --no-stream

# Step 2: Scale down non-critical services
echo "Scaling down non-critical services..."
docker stop asi-docs asi-faucet

# Step 3: Increase resources for critical services
echo "Increasing resources..."
docker update --cpus="4" --memory="8g" asi-rust-indexer
docker update --cpus="2" --memory="4g" asi-hasura

# Step 4: Clear caches
echo "Clearing caches..."
docker exec asi-redis redis-cli FLUSHALL

# Step 5: Optimize database
echo "Optimizing database..."
docker exec asi-indexer-db vacuumdb -U indexer -d asichain -z

# Step 6: Restart services
echo "Restarting services..."
docker-compose restart

echo "Performance optimization complete"
```

## 🔄 Rollback Procedures

### Application Rollback

```bash
# Wallet rollback
docker stop asi-wallet-v2
docker run -d --name asi-wallet-v2 -p 3000:80 asi-wallet:v2.1.0

# Explorer rollback
docker stop asi-explorer
docker run -d --name asi-explorer -p 3001:80 asi-explorer:v1.0.1

# Indexer rollback
cd indexer
git checkout tags/v2.1.0
docker-compose -f docker-compose.rust.yml build
docker-compose -f docker-compose.rust.yml up -d
```

### Database Rollback

```bash
# Point-in-time recovery
docker exec asi-indexer-db psql -U indexer asichain -c "SELECT pg_export_snapshot()"
# Note snapshot ID

# Restore to snapshot
docker exec asi-indexer-db pg_restore -U indexer -d asichain --clean snapshot_file
```

## 📊 Incident Classification

### Severity Levels

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| **P1** | Complete outage | 15 min | All services down |
| **P2** | Major degradation | 30 min | Wallet not working |
| **P3** | Minor degradation | 2 hours | Slow API responses |
| **P4** | Minimal impact | Next day | Documentation down |

### Incident Lifecycle

```
1. Detection → 2. Triage → 3. Response → 4. Resolution → 5. Post-mortem
```

## 📝 Incident Response Template

```markdown
## Incident Report

**Incident ID**: INC-2025-001
**Date**: [Date]
**Severity**: P1/P2/P3/P4
**Duration**: [Start] - [End]

### Summary
[Brief description of the incident]

### Impact
- Services affected: [List]
- Users affected: [Number/percentage]
- Data loss: [Yes/No]

### Timeline
- **[Time]**: Incident detected
- **[Time]**: Response initiated
- **[Time]**: Root cause identified
- **[Time]**: Fix applied
- **[Time]**: Services restored
- **[Time]**: Incident closed

### Root Cause
[Detailed explanation of what caused the incident]

### Resolution
[Steps taken to resolve the incident]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Process improvement]

### Lessons Learned
[What we learned from this incident]
```

## 🛡️ Prevention Measures

### Proactive Monitoring

```bash
# Set up monitoring alerts
cat > /opt/monitor/alerts.sh << 'EOF'
#!/bin/bash

# Check service health
for service in wallet explorer indexer faucet; do
  if ! curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    alert "Service $service is down"
  fi
done

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ $DISK_USAGE -gt 85 ]; then
  alert "Disk usage critical: ${DISK_USAGE}%"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt 90 ]; then
  alert "Memory usage critical: ${MEM_USAGE}%"
fi
EOF
```

### Automated Backups

```bash
# Automated backup script
0 2 * * * /opt/scripts/backup-all.sh
0 */6 * * * /opt/scripts/backup-database.sh
```

### Capacity Planning

```yaml
Thresholds:
  CPU: Alert at 70%, Critical at 85%
  Memory: Alert at 80%, Critical at 90%
  Disk: Alert at 75%, Critical at 85%
  Network: Alert at 80% of capacity
```

## ✅ Emergency Checklist

### Immediate Response
- [ ] Assess severity
- [ ] Notify stakeholders
- [ ] Start incident channel
- [ ] Begin troubleshooting
- [ ] Document actions

### During Incident
- [ ] Keep communication updated
- [ ] Try quick fixes first
- [ ] Escalate if needed
- [ ] Consider rollback
- [ ] Monitor impact

### After Resolution
- [ ] Verify fix
- [ ] Monitor for recurrence
- [ ] Update documentation
- [ ] Schedule post-mortem
- [ ] Implement improvements

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Review**: After each P1/P2 incident
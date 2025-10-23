# Operations Runbook

## 📋 Daily Operations

### Morning Checklist (Start of Day)

```bash
#!/bin/bash
# morning-check.sh

echo "=== ASI Chain Morning Check - $(date) ==="

# 1. Check all services are running
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(asi-|rnode)"

# 2. Check disk space
df -h | grep -E "/$|/var"

# 3. Check latest block
curl -s http://localhost:9090/status | jq '.latest_block'

# 4. Check for overnight errors
for container in $(docker ps --format "{{.Names}}" | grep -E "asi-|rnode"); do
  errors=$(docker logs $container --since 8h 2>&1 | grep -i error | wc -l)
  if [ $errors -gt 0 ]; then
    echo "⚠️  $container had $errors errors overnight"
  fi
done

# 5. Check backup status
ls -lah /backup/$(date +%Y%m%d)* 2>/dev/null || echo "⚠️  No backup for today"

# 6. Check SSL certificates
echo | openssl s_client -connect 13.251.66.61:443 2>/dev/null | openssl x509 -noout -dates

echo "Morning check complete"
```

### Hourly Monitoring

```bash
# Add to crontab: 0 * * * * /opt/scripts/hourly-check.sh

#!/bin/bash
# hourly-check.sh

# Check block production
LATEST_BLOCK=$(curl -s http://localhost:40453/api/status | jq -r '.blockNumber')
LAST_BLOCK=$(cat /tmp/last_block 2>/dev/null || echo 0)

if [ "$LATEST_BLOCK" -le "$LAST_BLOCK" ]; then
  echo "ALERT: Block production stopped at $LATEST_BLOCK" | mail -s "ASI Chain Alert" ops@team.com
fi

echo $LATEST_BLOCK > /tmp/last_block

# Check indexer lag
INDEXER_STATUS=$(curl -s http://localhost:9090/status)
LAG=$(echo $INDEXER_STATUS | jq -r '.blocks_behind')

if [ "$LAG" -gt 50 ]; then
  echo "ALERT: Indexer lagging by $LAG blocks" | mail -s "ASI Chain Alert" ops@team.com
fi
```

### End of Day Procedures

```bash
#!/bin/bash
# evening-check.sh

echo "=== ASI Chain Evening Check - $(date) ==="

# 1. Create daily backup
./backup-all.sh

# 2. Rotate logs
docker exec asi-rust-indexer sh -c 'mv /app/logs/indexer.log /app/logs/indexer.log.$(date +%Y%m%d)'
docker exec asi-rust-indexer sh -c 'touch /app/logs/indexer.log'

# 3. Clean up old data
docker system prune -f
find /backup -mtime +7 -delete

# 4. Generate daily report
./generate-daily-report.sh > /reports/daily_$(date +%Y%m%d).txt

# 5. Check tomorrow's schedule
echo "Tomorrow's scheduled tasks:"
crontab -l | grep "$(date -d tomorrow +%Y-%m-%d)"

echo "Evening check complete"
```

## 🔄 Regular Maintenance Tasks

### Daily Tasks

| Task | Command/Procedure | Schedule | Owner |
|------|-------------------|----------|-------|
| Backup database | `./backup-database.sh` | 02:00 UTC | DevOps |
| Check disk usage | `df -h` | 09:00 UTC | On-call |
| Review error logs | `./check-errors.sh` | 10:00 UTC | On-call |
| Verify block production | `curl /api/status` | Every hour | Automated |
| Clean Docker images | `docker image prune -f` | 03:00 UTC | Automated |

### Weekly Tasks

| Task | Command/Procedure | Schedule | Owner |
|------|-------------------|----------|-------|
| Full system backup | `./backup-full.sh` | Sunday 00:00 | DevOps |
| Security updates | `apt update && apt upgrade` | Tuesday 14:00 | Security |
| Performance review | `./performance-report.sh` | Friday 16:00 | Tech Lead |
| Certificate check | `./check-certificates.sh` | Monday 10:00 | DevOps |
| Capacity planning | Review metrics | Wednesday | Team |

### Monthly Tasks

| Task | Command/Procedure | Schedule | Owner |
|------|-------------------|----------|-------|
| Security audit | Full scan | 1st Monday | Security |
| Disaster recovery test | `./dr-test.sh` | 15th | DevOps |
| Dependency updates | `npm audit` | Last Friday | Dev Team |
| Access review | Audit permissions | 20th | Security |
| Infrastructure review | Cost & performance | 25th | Management |

## 🔧 Routine Procedures

### Database Backup

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backup/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/asichain_$TIMESTAMP.sql"

echo "Starting database backup..."

# Create backup
docker exec asi-indexer-db pg_dump -U indexer asichain > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE.gz s3://asi-chain-backups/postgres/

# Keep only last 7 days locally
find $BACKUP_DIR -mtime +7 -delete

echo "Backup complete: $BACKUP_FILE.gz"
```

### Log Rotation

```bash
#!/bin/bash
# rotate-logs.sh

SERVICES="asi-rust-indexer asi-wallet asi-explorer asi-faucet"

for SERVICE in $SERVICES; do
  # Get container log size
  SIZE=$(docker inspect $SERVICE | jq -r '.[0].LogPath' | xargs du -h | cut -f1)
  
  echo "Rotating logs for $SERVICE (current size: $SIZE)"
  
  # Export logs
  docker logs $SERVICE > /logs/$SERVICE/$(date +%Y%m%d).log 2>&1
  
  # Truncate container logs
  echo "" > $(docker inspect $SERVICE | jq -r '.[0].LogPath')
done

# Compress old logs
find /logs -name "*.log" -mtime +1 -exec gzip {} \;

# Delete old compressed logs
find /logs -name "*.log.gz" -mtime +30 -delete
```

### Performance Monitoring

```bash
#!/bin/bash
# performance-check.sh

echo "=== Performance Report - $(date) ==="

# API Response Times
echo "API Response Times:"
for i in {1..10}; do
  TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:9090/health)
  echo "  Attempt $i: ${TIME}s"
done

# Database Performance
echo -e "\nDatabase Performance:"
docker exec asi-indexer-db psql -U indexer asichain -c "
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 5;"

# Docker Resource Usage
echo -e "\nDocker Resource Usage:"
docker stats --no-stream

# Network Latency
echo -e "\nNetwork Latency to Production:"
ping -c 5 13.251.66.61 | tail -1

# Block Production Rate
echo -e "\nBlock Production (last hour):"
CURRENT=$(curl -s http://localhost:40453/api/status | jq -r '.blockNumber')
HOURAGO=$(cat /tmp/block_hour_ago 2>/dev/null || echo 0)
echo "Blocks produced: $((CURRENT - HOURAGO))"
echo $CURRENT > /tmp/block_hour_ago
```

### Certificate Management

```bash
#!/bin/bash
# check-certificates.sh

echo "=== Certificate Status ==="

# Check SSL certificate expiry
check_cert() {
  local domain=$1
  local port=$2
  
  expiry=$(echo | openssl s_client -connect $domain:$port 2>/dev/null | \
           openssl x509 -noout -enddate | cut -d= -f2)
  
  expiry_epoch=$(date -d "$expiry" +%s)
  current_epoch=$(date +%s)
  days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
  
  if [ $days_left -lt 30 ]; then
    echo "⚠️  $domain:$port expires in $days_left days!"
  else
    echo "✅ $domain:$port valid for $days_left days"
  fi
}

# Check all certificates
check_cert "13.251.66.61" 443
check_cert "localhost" 3000
```

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

```yaml
Critical Metrics:
  block_production_rate:
    threshold: < 1lt;1 block per 60s
    action: Check autopropose service
    
  indexer_lag:
    threshold: > 50 blocks
    action: Restart indexer
    
  api_response_time:
    threshold: > 500ms
    action: Check database performance
    
  disk_usage:
    threshold: > 85%
    action: Clean logs and old data
    
  memory_usage:
    threshold: > 90%
    action: Restart services or scale up

Business Metrics:
  daily_transactions:
    threshold: < 1lt;10
    action: Check wallet and faucet
    
  active_wallets:
    threshold: < 5lt;5
    action: Verify services accessible
    
  api_error_rate:
    threshold: > 5%
    action: Check logs for issues
```

### Alert Configuration

```bash
# Setup email alerts
cat > /etc/aliases << EOF
ops: devops@company.com
critical: oncall@company.com, manager@company.com
EOF
newaliases

# Configure monitoring script
cat > /opt/monitor/alert.sh << 'EOF'
#!/bin/bash

METRIC=$1
VALUE=$2
THRESHOLD=$3
SEVERITY=$4

if [ "$SEVERITY" = "CRITICAL" ]; then
  RECIPIENT="critical"
else
  RECIPIENT="ops"
fi

echo "Alert: $METRIC = $VALUE (threshold: $THRESHOLD)" | \
  mail -s "[$SEVERITY] ASI Chain Alert: $METRIC" $RECIPIENT

# Also send to Slack (optional)
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"[$SEVERITY] $METRIC = $VALUE\"}" \
  $SLACK_WEBHOOK_URL
EOF
chmod +x /opt/monitor/alert.sh
```

## 🔍 Health Checks

### Service Health Dashboard

```bash
#!/bin/bash
# health-dashboard.sh

clear
echo "╔══════════════════════════════════════════════════════╗"
echo "║          ASI Chain Health Dashboard                   ║"
echo "║          $(date +'%Y-%m-%d %H:%M:%S')                      ║"
echo "╚══════════════════════════════════════════════════════╝"

# Function to check service
check_service() {
  local name=$1
  local url=$2
  
  if curl -s -f "$url" > /dev/null; then
    echo "✅ $name"
  else
    echo "❌ $name"
  fi
}

echo -e "\n🔗 Blockchain Services:"
check_service "Bootstrap  (40403)" "http://localhost:40403/api/status"
check_service "Validator1 (40413)" "http://localhost:40413/api/status"
check_service "Validator2 (40423)" "http://localhost:40423/api/status"
check_service "Observer   (40453)" "http://localhost:40453/api/status"

echo -e "\n🌐 Application Services:"
check_service "Wallet     (3000)" "http://localhost:3000"
check_service "Explorer   (3001)" "http://localhost:3001"
check_service "Faucet     (5050)" "http://localhost:5050/health"
check_service "Docs       (3003)" "http://localhost:3003"

echo -e "\n📊 Data Services:"
check_service "Indexer    (9090)" "http://localhost:9090/health"
check_service "GraphQL    (8080)" "http://localhost:8080/healthz"

echo -e "\n💾 System Resources:"
echo "CPU Usage:    $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "Memory:       $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk:         $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

echo -e "\n📈 Blockchain Status:"
BLOCK=$(curl -s http://localhost:9090/status | jq -r '.latest_block')
LAG=$(curl -s http://localhost:9090/status | jq -r '.blocks_behind')
echo "Latest Block: $BLOCK"
echo "Indexer Lag:  $LAG blocks"

echo -e "\n📝 Recent Errors (last hour):"
for container in asi-rust-indexer asi-wallet asi-explorer; do
  errors=$(docker logs $container --since 1h 2>&1 | grep -i error | wc -l)
  if [ $errors -gt 0 ]; then
    echo "  $container: $errors errors"
  fi
done
```

## 🚨 Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 - Critical | Complete outage | 15 minutes | All services down, data loss |
| P2 - High | Major degradation | 30 minutes | Wallet not working, no blocks |
| P3 - Medium | Minor degradation | 2 hours | Slow API, indexer lag |
| P4 - Low | Minimal impact | Next day | Docs down, UI issues |

### Incident Response Procedure

```markdown
## Incident Response Checklist

### 1. Assess (5 minutes)
- [ ] Identify affected services
- [ ] Determine severity level
- [ ] Check monitoring dashboards
- [ ] Review recent changes

### 2. Communicate (2 minutes)
- [ ] Notify on-call team
- [ ] Update status page
- [ ] Inform stakeholders
- [ ] Create incident channel

### 3. Mitigate (15-30 minutes)
- [ ] Apply immediate fix
- [ ] Rollback if needed
- [ ] Scale resources
- [ ] Redirect traffic

### 4. Resolve
- [ ] Implement permanent fix
- [ ] Verify resolution
- [ ] Monitor for recurrence
- [ ] Update documentation

### 5. Post-Incident
- [ ] Write incident report
- [ ] Conduct retrospective
- [ ] Update runbooks
- [ ] Implement preventions
```

### Common Incident Responses

```bash
# Service Down
systemctl restart service_name
docker restart container_name

# High Load
docker update --cpus="4" container_name
docker update --memory="8g" container_name

# Disk Full
docker system prune --all --volumes --force
find /logs -mtime +1 -delete
truncate -s 0 /var/log/large.log

# Database Issues
docker exec asi-indexer-db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '1 hour';"

# Network Issues
iptables -L -n
netstat -tuln
tcpdump -i any port 40403
```

## 📝 Reporting

### Daily Operations Report

```bash
#!/bin/bash
# daily-report.sh

REPORT_FILE="/reports/daily_$(date +%Y%m%d).txt"

cat > $REPORT_FILE << EOF
ASI Chain Daily Operations Report
Date: $(date)
================================

## Service Availability
$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "asi-|rnode")

## Blockchain Metrics
- Current Block: $(curl -s http://localhost:9090/status | jq -r '.latest_block')
- Blocks Today: $(curl -s http://localhost:9090/stats | jq -r '.blocks_24h')
- Transactions: $(curl -s http://localhost:9090/stats | jq -r '.transactions_24h')

## Performance Metrics
- API Response Time: $(curl -w "%{time_total}s" -o /dev/null -s http://localhost:9090/health)
- Indexer Lag: $(curl -s http://localhost:9090/status | jq -r '.blocks_behind') blocks

## Resource Usage
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}")

## Incidents Today
$(grep "ERROR\|CRITICAL" /logs/*/$(date +%Y%m%d)* | wc -l) errors detected

## Completed Tasks
- Morning checks: ✅
- Backups: ✅
- Log rotation: ✅
- Monitoring: ✅

## Notes
[Add any relevant notes here]

Generated: $(date)
EOF

echo "Report saved to $REPORT_FILE"
```

## 🛠️ Maintenance Scripts

### Cleanup Script

```bash
#!/bin/bash
# cleanup.sh

echo "Starting cleanup..."

# Docker cleanup
docker system prune -f
docker image prune -a -f
docker volume prune -f

# Log cleanup
find /logs -name "*.log" -mtime +30 -delete
find /logs -name "*.gz" -mtime +90 -delete

# Backup cleanup
find /backup -mtime +30 -delete

# Database cleanup
docker exec asi-indexer-db vacuumdb -U indexer -d asichain -z

# Cache cleanup
docker exec asi-redis redis-cli FLUSHDB

echo "Cleanup complete"
```

### Backup Script

```bash
#!/bin/bash
# backup-all.sh

BACKUP_ROOT="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_ROOT

echo "Starting full backup..."

# Database backup
docker exec asi-indexer-db pg_dump -U indexer asichain | \
  gzip > $BACKUP_ROOT/database.sql.gz

# Configuration backup
tar -czf $BACKUP_ROOT/configs.tar.gz \
  indexer/.env \
  asi_wallet_v2/.env \
  explorer/.env \
  faucet/.env

# Docker volumes backup
for volume in $(docker volume ls -q); do
  docker run --rm -v $volume:/data -v $BACKUP_ROOT:/backup \
    alpine tar -czf /backup/${volume}.tar.gz /data
done

# Upload to S3
aws s3 sync $BACKUP_ROOT s3://asi-chain-backups/$(date +%Y%m%d)/

echo "Backup complete: $BACKUP_ROOT"
```

## 📅 On-Call Procedures

### On-Call Responsibilities

1. **Primary On-Call**
   - First responder to alerts
   - Perform initial triage
   - Implement immediate fixes
   - Escalate if needed

2. **Secondary On-Call**
   - Backup for primary
   - Handle escalations
   - Assist with major incidents

### On-Call Handover

```markdown
## On-Call Handover Template

**Outgoing**: [Name]
**Incoming**: [Name]
**Date**: [Date]

### Current Status
- All services: [Green/Yellow/Red]
- Active incidents: [None/List]
- Pending maintenance: [None/List]

### Recent Issues
- [Issue 1]: [Resolution]
- [Issue 2]: [Resolution]

### Watch Items
- [Item 1]: [Why to watch]
- [Item 2]: [Why to watch]

### Notes
[Any additional context]

Handover completed: [Time]
```

## ✅ Operations Checklist

### Daily
- [ ] Morning health check
- [ ] Review overnight alerts
- [ ] Check backup completion
- [ ] Monitor performance metrics
- [ ] Review error logs
- [ ] Evening report

### Weekly
- [ ] Full system backup
- [ ] Security updates
- [ ] Performance review
- [ ] Capacity check
- [ ] Team sync meeting

### Monthly
- [ ] Security audit
- [ ] DR test
- [ ] Access review
- [ ] Cost review
- [ ] Documentation update

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: Monthly
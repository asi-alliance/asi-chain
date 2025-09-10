# F1R3FLY/ASI Chain Operational Runbook

## Table of Contents
1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Tasks](#monthly-tasks)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Backup & Recovery](#backup--recovery)
6. [Performance Tuning](#performance-tuning)
7. [Security Operations](#security-operations)
8. [Emergency Procedures](#emergency-procedures)
9. [Operational Scripts](#operational-scripts)

---

## Daily Operations

### Morning Health Check (09:00 UTC)

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== F1R3FLY Daily Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Container Status
echo "1. CONTAINER STATUS"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""

# 2. Resource Usage
echo "2. RESOURCE USAGE"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
echo ""

# 3. Block Production
echo "3. LATEST BLOCKS"
docker logs rnode.bootstrap --tail 5 | grep "Block #" || echo "No recent blocks in log"
echo ""

# 4. Peer Connectivity
echo "4. NETWORK STATUS"
curl -s http://localhost:40403/status 2>/dev/null | grep -E "peers|nodes" || echo "API not accessible"
echo ""

# 5. Disk Usage
echo "5. DISK USAGE"
df -h | grep -E "/$|/var/lib/docker"
echo ""

# 6. System Load
echo "6. SYSTEM LOAD"
uptime
echo ""

echo "=== Health Check Complete ==="
```

### Monitoring Tasks

| Time | Task | Command/Action |
|------|------|---------------|
| Every Hour | Check block production | `docker logs autopropose --tail 10 \| grep "proposed"` |
| Every 4 Hours | Verify peer count | `curl http://localhost:40403/status` |
| Every 6 Hours | Check disk space | `df -h` |
| Continuous | Monitor container logs | `docker-compose logs -f --tail 100` |

### Daily Log Review

```bash
# Check for errors in last 24 hours
for container in rnode.bootstrap rnode.validator1 rnode.validator2 rnode.validator3 autopropose; do
  echo "=== $container errors ==="
  docker logs $container --since 24h 2>&1 | grep -E "ERROR|FATAL|Exception" | head -10
done
```

---

## Weekly Maintenance

### Sunday Maintenance Window (02:00-04:00 UTC)

#### 1. System Updates
```bash
# Update system packages
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
sudo apt autoclean
```

#### 2. Docker Cleanup
```bash
# Remove unused Docker resources
docker system prune -f
docker volume prune -f
docker image prune -a -f

# Check Docker disk usage
docker system df
```

#### 3. Log Rotation
```bash
# Compress old logs
find /var/lib/docker/containers -name "*.log" -size +100M -exec gzip {} \;

# Delete logs older than 30 days
find /var/lib/docker/containers -name "*.log.gz" -mtime +30 -delete
```

#### 4. Backup Verification
```bash
# Test backup integrity
tar -tzf /backup/blockchain-backup-latest.tar.gz > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup integrity: OK"
else
  echo "Backup integrity: FAILED"
fi
```

#### 5. Performance Check
```bash
# Analyze container performance
for container in $(docker ps --format '{{.Names}}'); do
  echo "=== $container Performance ==="
  docker exec $container cat /proc/1/status | grep -E "VmSize|VmRSS|Threads"
  echo ""
done
```

---

## Monthly Tasks

### First Monday of Month

#### 1. Security Audit
```bash
# Check for security updates
sudo unattended-upgrade --dry-run

# Review SSH access logs
sudo grep "Accepted publickey" /var/log/auth.log | tail -20

# Check for unauthorized containers
docker ps -a | grep -v "f1r3fly\|rnode\|autopropose"
```

#### 2. Capacity Planning
```bash
# Analyze growth trends
echo "=== Storage Growth (Last 30 days) ==="
du -sh /home/ubuntu/f1r3fly/docker/data/
find /home/ubuntu/f1r3fly/docker/data/ -type f -mtime -30 | wc -l

echo "=== Memory Usage Trends ==="
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}' 
```

#### 3. Configuration Backup
```bash
# Backup all configurations
tar -czf configs-$(date +%Y%m%d).tar.gz \
  f1r3fly/docker/*.yml \
  f1r3fly/docker/.env \
  f1r3fly/docker/conf/ \
  f1r3fly/docker/autopropose/config.yml
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Check Command |
|--------|------------------|-------------------|---------------|
| CPU Usage | >70% | >90% | `docker stats --no-stream` |
| Memory Usage | >80% | >95% | `free -h` |
| Disk Usage | >70% | >85% | `df -h` |
| Block Delay | >60s | >120s | Check AutoPropose logs |
| Peer Count | <3 | <2 | API status check |
| Container Restarts | >1/hour | >3/hour | `docker ps` |

### Simple Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Run every 5 minutes via cron

# Configuration (set these as environment variables)
ALERT_EMAIL="${ALERT_EMAIL:-}"  # Set via: export ALERT_EMAIL="your-ops-email"
WEBHOOK_URL="${WEBHOOK_URL:-}"   # Set via: export WEBHOOK_URL="your-webhook-url"

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
  echo "CRITICAL: Disk usage at ${DISK_USAGE}%" | mail -s "ASI Chain Alert" $ALERT_EMAIL
fi

# Check container health
UNHEALTHY=$(docker ps --filter health=unhealthy --format '{{.Names}}' | wc -l)
if [ $UNHEALTHY -gt 0 ]; then
  curl -X POST $WEBHOOK_URL -d "{\"text\":\"WARNING: $UNHEALTHY unhealthy containers\"}"
fi

# Check block production
LAST_BLOCK=$(docker logs autopropose --tail 1 --since 5m 2>&1 | grep "proposed" | wc -l)
if [ $LAST_BLOCK -eq 0 ]; then
  echo "WARNING: No blocks produced in last 5 minutes"
fi
```

---

## Backup & Recovery

### Automated Backup Strategy

#### Daily Backup Script
```bash
#!/bin/bash
# backup.sh - Run daily at 03:00 UTC

BACKUP_DIR="/backup/asi-chain"
DATE=$(date +%Y%m%d)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Stop AutoPropose to ensure consistency
docker stop autopropose

# Backup blockchain data
tar -czf $BACKUP_DIR/blockchain-$DATE.tar.gz \
  --exclude='*.log' \
  --exclude='*/rspace/lock.mdb' \
  f1r3fly/docker/data/

# Backup configurations
tar -czf $BACKUP_DIR/configs-$DATE.tar.gz \
  f1r3fly/docker/*.yml \
  f1r3fly/docker/.env \
  f1r3fly/docker/conf/

# Restart AutoPropose
docker start autopropose

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/blockchain-$DATE.tar.gz s3://your-backup-bucket/

# Clean old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
tar -tzf $BACKUP_DIR/blockchain-$DATE.tar.gz > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup successful: blockchain-$DATE.tar.gz"
else
  [ -n "$ALERT_EMAIL" ] && echo "BACKUP FAILED" | mail -s "ASI Chain Backup Failure" $ALERT_EMAIL
fi
```

### Recovery Procedures

#### Full Recovery from Backup
```bash
#!/bin/bash
# recover.sh - Full recovery from backup

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./recover.sh <backup-file>"
  exit 1
fi

echo "WARNING: This will destroy current blockchain data!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted"
  exit 1
fi

# Stop all containers
docker-compose -f shard-with-autopropose.yml down
docker-compose -f observer.yml down
docker-compose -f validator4.yml down

# Backup current data (just in case)
mv f1r3fly/docker/data f1r3fly/docker/data.old

# Extract backup
tar -xzf $BACKUP_FILE -C /

# Start services
docker-compose -f shard-with-autopropose.yml up -d
sleep 60
docker-compose -f observer.yml up -d
docker-compose -f validator4.yml up -d

echo "Recovery complete. Monitoring startup..."
docker-compose -f shard-with-autopropose.yml logs -f --tail 50
```

---

## Performance Tuning

### Docker Performance Optimization

```bash
# /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "10"
  },
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
```

### Container Resource Limits

```yaml
# docker-compose.yml optimizations
services:
  validator1:
    mem_limit: 2g
    memswap_limit: 2g
    cpu_shares: 1024
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
```

### System Tuning

```bash
# Kernel parameters (/etc/sysctl.conf)
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
vm.swappiness = 10
vm.max_map_count = 262144

# Apply changes
sudo sysctl -p
```

---

## Security Operations

### Daily Security Checks

```bash
#!/bin/bash
# security-check.sh

echo "=== Security Audit ==="

# Check for failed SSH attempts
echo "1. Failed SSH attempts (last 24h):"
grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l

# Check for new SSH keys
echo "2. Authorized SSH keys:"
wc -l ~/.ssh/authorized_keys

# Check running processes
echo "3. Suspicious processes:"
ps aux | grep -v "docker\|rnode\|python" | grep -E "^[0-9]+" | head -5

# Check network connections
echo "4. Unexpected network connections:"
netstat -tulpn | grep -v "404\|22\|::"

# Check Docker images
echo "5. Unknown Docker images:"
docker images | grep -v "f1r3fly\|none"
```

### Security Hardening Checklist

- [ ] Change default SSH port
- [ ] Disable password authentication
- [ ] Enable fail2ban
- [ ] Configure UFW firewall
- [ ] Regular security updates
- [ ] Audit logs regularly
- [ ] Rotate keys quarterly
- [ ] Monitor for CVEs

---

## Emergency Procedures

### Incident Response Plan

#### Severity Levels
- **P1 (Critical)**: Complete network failure, data loss
- **P2 (High)**: Consensus failure, no block production
- **P3 (Medium)**: Single node failure, degraded performance
- **P4 (Low)**: Minor issues, cosmetic problems

### Emergency Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| DevOps Lead | Set via environment | P1-P2 incidents |
| System Admin | Set via environment | Infrastructure issues |
| Developer | Set via environment | Application bugs |

### Common Emergency Procedures

#### 1. Complete Network Failure
```bash
# Emergency restart procedure
./emergency-restart.sh

# If that fails, manual recovery:
docker kill $(docker ps -q)
docker rm $(docker ps -aq)
docker network rm f1r3fly
docker network create f1r3fly
docker-compose -f shard-with-autopropose.yml up -d
```

#### 2. Consensus Failure
```bash
# Reset consensus state
docker-compose -f shard-with-autopropose.yml stop
rm -rf data/*/casper-block-store
rm -rf data/*/rspace
docker-compose -f shard-with-autopropose.yml up -d
```

#### 3. Disk Full Emergency
```bash
# Emergency cleanup
docker system prune -a -f --volumes
find /var/lib/docker -name "*.log" -delete
rm -rf /tmp/*
```

---

## Operational Scripts

### All-in-One Operations Script

```bash
#!/bin/bash
# ops.sh - Master operations script

case "$1" in
  health)
    ./daily-health-check.sh
    ;;
  backup)
    ./backup.sh
    ;;
  restore)
    ./recover.sh $2
    ;;
  restart)
    docker-compose -f shard-with-autopropose.yml restart
    ;;
  logs)
    docker-compose -f shard-with-autopropose.yml logs -f --tail 100
    ;;
  status)
    docker ps --format 'table {{.Names}}\t{{.Status}}'
    ;;
  clean)
    docker system prune -f
    ;;
  monitor)
    watch -n 5 'docker stats --no-stream'
    ;;
  *)
    echo "Usage: $0 {health|backup|restore|restart|logs|status|clean|monitor}"
    exit 1
    ;;
esac
```

### Automated Maintenance Cron

```cron
# Crontab entries for automated maintenance
# Edit with: crontab -e

# Daily health check at 09:00 UTC
0 9 * * * /home/ubuntu/scripts/daily-health-check.sh >> /var/log/asi-chain-health.log 2>&1

# Daily backup at 03:00 UTC
0 3 * * * /home/ubuntu/scripts/backup.sh >> /var/log/asi-chain-backup.log 2>&1

# Monitor every 5 minutes
*/5 * * * * /home/ubuntu/scripts/monitor.sh

# Weekly cleanup Sunday 02:00 UTC
0 2 * * 0 docker system prune -f

# Monthly security audit
0 0 1 * * /home/ubuntu/scripts/security-check.sh | [ -n "$ALERT_EMAIL" ] && mail -s "Monthly Security Audit" $ALERT_EMAIL
```

---

## Appendix: Quick Reference

### Common Commands

| Action | Command |
|--------|---------|
| View all logs | `docker-compose logs -f` |
| Restart validator | `docker restart rnode.validator1` |
| Check peers | `curl http://localhost:40403/status` |
| View blocks | `docker logs rnode.bootstrap \| grep "Block #"` |
| Stop network | `docker-compose down` |
| Start network | `docker-compose up -d` |
| Enter container | `docker exec -it <container> /bin/sh` |
| Copy from container | `docker cp <container>:/path /local/path` |

### File Locations

| Component | Location |
|-----------|----------|
| Docker Compose | `f1r3fly/docker/*.yml` |
| Configuration | `f1r3fly/docker/conf/` |
| Blockchain Data | `f1r3fly/docker/data/` |
| Logs | `/var/lib/docker/containers/*/` |
| Backups | `/backup/asi-chain/` |

### Port Reference

| Service | Internal | External |
|---------|----------|----------|
| Bootstrap API | 40403 | 40403 |
| Validator1 API | 40403 | 40413 |
| Validator2 API | 40403 | 40423 |
| Validator3 API | 40403 | 40433 |
| Validator4 API | 40403 | 40443 |
| Observer API | 40403 | 40453 |

---

**Document Version**: 1.0
**Last Updated**: August 12, 2025
**Next Review**: September 12, 2025

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

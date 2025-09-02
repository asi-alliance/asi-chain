# F1R3FLY/ASI Chain Troubleshooting Guide

## Table of Contents
1. [Container Health Issues](#container-health-issues)
2. [Network Connectivity Problems](#network-connectivity-problems)
3. [Consensus & Block Production](#consensus--block-production)
4. [Resource Management](#resource-management)
5. [Docker-Specific Issues](#docker-specific-issues)
6. [API & gRPC Issues](#api--grpc-issues)
7. [Data & Storage Problems](#data--storage-problems)
8. [Deployment Failures](#deployment-failures)

---

## Container Health Issues

### Problem: AutoPropose Shows "Unhealthy"
**Symptoms**: 
- Container status shows "(unhealthy)" 
- But blocks are being produced normally

**Solution**:
```bash
# Check if it's actually working
docker logs autopropose --tail 20 | grep "proposed"

# Fix health check in shard-with-autopropose.yml
healthcheck:
  test: ["CMD", "test", "-f", "/proc/1/exe"]
```
[See detailed fix](./AUTOPROPOSE_HEALTH_FIX.MD)

### Problem: Container Keeps Restarting
**Symptoms**: 
- Container in restart loop
- Status shows "Restarting (X) Y seconds ago"

**Diagnosis**:
```bash
# Check logs for error
docker logs <container_name> --tail 50

# Check exit code
docker inspect <container_name> | grep -A 5 "State"
```

**Solutions**:
1. **Memory issue**: Increase Docker memory limits
2. **Port conflict**: Check port availability
3. **Missing dependencies**: Verify all required files exist

---

## Network Connectivity Problems

### Problem: Nodes Not Discovering Peers
**Symptoms**:
- API shows "peers": 0
- "No peers available" in logs

**Diagnosis**:
```bash
# Check Docker network
docker network inspect f1r3fly

# Test inter-container connectivity
docker exec rnode.bootstrap ping rnode.validator1
```

**Solutions**:
```bash
# Recreate network
docker network rm f1r3fly
docker network create f1r3fly

# Restart all containers
docker-compose -f shard-with-autopropose.yml restart
```

### Problem: Cannot Access APIs Externally
**Symptoms**:
- APIs work with localhost but not external IP
- Connection refused from outside

**Solutions**:
1. **Check firewall**:
```bash
sudo ufw status
sudo ufw allow 40400:40455/tcp
```

2. **Check AWS Lightsail firewall**:
- Go to AWS Lightsail console
- Instance → Networking → Firewall
- Add custom TCP rules for ports 40400-40455

3. **Verify port bindings**:
```bash
docker ps --format 'table {{.Ports}}'
netstat -tulpn | grep 404
```

---

## Consensus & Block Production

### Problem: Genesis Ceremony Not Completing
**Symptoms**:
- "Waiting for X more approvals" stuck in logs
- No transition to "Running state"

**Diagnosis**:
```bash
# Check bootstrap logs
docker logs rnode.bootstrap | grep -E "approval|ceremony"

# Check validator connections
docker logs rnode.validator1 | grep "connected"
```

**Solutions**:
1. **Restart ceremony**:
```bash
docker-compose -f shard-with-autopropose.yml down
rm -rf data/*
docker-compose -f shard-with-autopropose.yml up -d
```

2. **Check validator keys**: Ensure all validators have correct keys in .env

### Problem: Blocks Not Being Produced
**Symptoms**:
- No new blocks after genesis
- AutoPropose showing errors

**Diagnosis**:
```bash
# Check AutoPropose logs
docker logs autopropose --tail 50

# Check validator readiness
docker logs rnode.validator1 | grep "ready"
```

**Solutions**:
1. **Restart AutoPropose**:
```bash
docker restart autopropose
```

2. **Check AutoPropose config**:
```yaml
# autopropose/config.yml
autopropose:
  enabled: true  # Must be true
  period: 30     # Seconds between blocks
```

---

## Resource Management

### Problem: High Memory Usage
**Symptoms**:
- Containers using >2GB each
- System becoming unresponsive
- OOM killer activated

**Diagnosis**:
```bash
# Check memory usage
docker stats --no-stream
free -h
```

**Solutions**:
1. **Add swap space**:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. **Limit container memory**:
```yaml
# In docker-compose.yml
services:
  validator1:
    mem_limit: 2g
```

3. **Restart containers periodically**:
```bash
# Daily restart cron
0 3 * * * docker restart rnode.validator1 rnode.validator2 rnode.validator3
```

### Problem: Disk Space Full
**Symptoms**:
- "No space left on device" errors
- Containers failing to start

**Diagnosis**:
```bash
df -h
du -sh f1r3fly/docker/data/*
docker system df
```

**Solutions**:
```bash
# Clean Docker resources
docker system prune -a -f
docker volume prune -f

# Remove old logs
find f1r3fly/docker/data -name "*.log" -mtime +7 -delete

# Compress old data
tar -czf backup-$(date +%Y%m%d).tar.gz data/
rm -rf data/*/rspace
```

---

## Docker-Specific Issues

### Problem: Docker Daemon Not Responding
**Symptoms**:
- "Cannot connect to Docker daemon"
- docker commands hang

**Solutions**:
```bash
# Restart Docker
sudo systemctl restart docker

# Check Docker status
sudo systemctl status docker
sudo journalctl -u docker -n 50
```

### Problem: Container Name Conflicts
**Symptoms**:
- "Container name already in use"
- Cannot start containers

**Solutions**:
```bash
# Remove old containers
docker rm -f $(docker ps -aq)

# Clean up properly
docker-compose -f shard-with-autopropose.yml down
docker-compose -f observer.yml down
docker-compose -f validator4.yml down
```

---

## API & gRPC Issues

### Problem: gRPC Connection Refused
**Symptoms**:
- "Connection refused" on port 40402
- Cannot deploy contracts

**Diagnosis**:
```bash
# Test gRPC port
nc -zv localhost 40402
docker logs rnode.validator1 | grep "gRPC"
```

**Solutions**:
1. **Check port mapping**:
```bash
docker port rnode.validator1
```

2. **Verify gRPC is enabled**:
```bash
# In container config
docker exec rnode.validator1 cat /var/lib/rnode/rnode.conf | grep grpc
```

### Problem: HTTP API Returns 404
**Symptoms**:
- /status endpoint not found
- API calls failing

**Solutions**:
```bash
# Correct API endpoints
curl http://localhost:40403/status     # HTTP API
curl http://localhost:40401/api/blocks # Different endpoint

# Check if HTTP API is enabled
docker logs rnode.bootstrap | grep "HTTP"
```

---

## Data & Storage Problems

### Problem: Corrupted Blockchain Data
**Symptoms**:
- "Invalid block hash" errors
- Consensus failures
- Node crashes on startup

**Solutions**:
1. **Clear and resync**:
```bash
# Stop node
docker stop rnode.validator1

# Backup current data
mv data/rnode.validator1 data/rnode.validator1.backup

# Restart to resync
docker start rnode.validator1
```

2. **Complete network reset**:
```bash
docker-compose -f shard-with-autopropose.yml down
rm -rf data/*
docker-compose -f shard-with-autopropose.yml up -d
```

### Problem: LMDB Lock Issues
**Symptoms**:
- "Resource temporarily unavailable" 
- "LMDB environment mapsize reached"

**Solutions**:
```bash
# Increase mapsize in config
LMDB_MAP_SIZE=10737418240  # 10GB

# Clear locks
rm -f data/*/rspace/lock.mdb
```

---

## Deployment Failures

### Problem: Docker Compose Version Mismatch
**Symptoms**:
- "Version in compose file is not supported"
- Syntax errors in YAML

**Solutions**:
```bash
# Update Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Use docker compose (v2) instead
docker compose -f shard-with-autopropose.yml up -d
```

### Problem: Image Pull Failures
**Symptoms**:
- "Pull access denied"
- "Manifest not found"
- Timeout during image download

**Solutions**:
```bash
# Login to registry if needed
docker login

# Pull images manually
docker pull f1r3flyindustries/f1r3fly-scala-node:latest

# Build locally if needed
cd f1r3fly
docker build -t f1r3fly-scala-node .
```

---

## Quick Diagnostic Commands

### Health Check Script
```bash
#!/bin/bash
echo "=== System Resources ==="
free -h
df -h
echo -e "\n=== Docker Status ==="
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo -e "\n=== Network Connectivity ==="
docker exec rnode.bootstrap curl -s http://localhost:40403/status | jq .
echo -e "\n=== Recent Errors ==="
docker-compose -f shard-with-autopropose.yml logs --tail 20 | grep -E "ERROR|WARN"
```

### Recovery Script
```bash
#!/bin/bash
# Emergency recovery
echo "Stopping all containers..."
docker-compose -f shard-with-autopropose.yml down
docker-compose -f observer.yml down
docker-compose -f validator4.yml down

echo "Cleaning up..."
docker system prune -f

echo "Starting fresh..."
docker-compose -f shard-with-autopropose.yml up -d
sleep 300  # Wait for genesis

docker-compose -f observer.yml up -d
docker-compose -f validator4.yml up -d

echo "Recovery complete!"
```

---

## Getting Help

If issues persist after trying these solutions:

1. **Collect Diagnostic Info**:
```bash
# System info
uname -a
docker version
docker-compose version

# Container logs
docker logs <container> --tail 100 > container.log

# Network state
docker network inspect f1r3fly > network.json
```

2. **Check Documentation**:
- [Deployment Guide](../deployment/AWS_LIGHTSAIL_DEPLOYMENT.MD)
- [Operational Runbook](../operations/RUNBOOK.MD)
- Project repository issues (URL to be determined)

3. **Open GitHub Issue** with:
- Error messages
- Steps to reproduce
- System specifications
- Docker/compose versions
- Relevant log excerpts

---

**Last Updated**: August 12, 2025
**Version**: 1.0

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

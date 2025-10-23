# ASI Chain Network Status

## Overview

This document provides guidance for monitoring and maintaining ASI Chain network health and status.

## Network Architecture

ASI Chain operates with a multi-validator architecture:

- **Bootstrap Node**: Coordinates network initialization
- **Validator Nodes**: Participate in consensus and block production
- **Observer Nodes**: Provide read-only access to blockchain state
- **AutoPropose Service**: Automated block proposing with validator rotation

## Monitoring Stack

### Components

| Service | Purpose | Default Port |
|---------|---------|--------------|
| Grafana | Metrics visualization | 3000 |
| Prometheus | Metrics collection | 9090 |
| cAdvisor | Container metrics | 8080 |
| Node Exporter | System metrics | 9100 |

### Access Configuration

```bash
# Set environment variables
export ASI_NODE_HOST="your-node-ip"
export GRAFANA_USER="admin"
export GRAFANA_PASSWORD="your-secure-password"

# Access monitoring services
Grafana:       http://${ASI_NODE_HOST}:3000
Prometheus:    http://${ASI_NODE_HOST}:9090
cAdvisor:      http://${ASI_NODE_HOST}:8080
Node Exporter: http://${ASI_NODE_HOST}:9100
```

## Health Checks

### Node Health

Check individual node status:

```bash
# Using rust-client
./rust-client/target/release/node_cli status -H ${ASI_NODE_HOST}

# Check specific validator
./rust-client/target/release/node_cli status -H ${ASI_NODE_HOST} -p 40413
```

### Network Metrics

Key metrics to monitor:

- **Block Production**: Should maintain 30-second intervals
- **Validator Participation**: All bonded validators should be proposing
- **Peer Connectivity**: Each node should have 5+ peers
- **Resource Usage**: 
  - CPU: < 50% average
  - Memory: < 80% of available
  - Disk: Monitor growth rate

### API Endpoints

| Node Type | HTTP Port | gRPC Port | Admin Port |
|-----------|-----------|-----------|------------|
| Bootstrap | 40403 | 40402 | 40405 |
| Validator1 | 40413 | 40412 | 40415 |
| Validator2 | 40423 | 40422 | 40425 |
| Validator3 | 40433 | 40432 | 40435 |
| Validator4 | 40443 | 40442 | 40445 |
| Observer | 40453 | 40452 | 40455 |

## Alerting Rules

### Critical Alerts

1. **Block Production Stopped**
   - Condition: No new blocks for > 90 seconds
   - Action: Check validator health and AutoPropose service

2. **Validator Offline**
   - Condition: Validator not responding to peers
   - Action: Restart validator container, check logs

3. **High Resource Usage**
   - Condition: CPU > 80% or Memory > 90%
   - Action: Investigate cause, scale resources if needed

### Warning Alerts

1. **Slow Block Times**
   - Condition: Block time > 45 seconds
   - Action: Monitor network latency, check validator performance

2. **Low Peer Count**
   - Condition: Peers < 3
   - Action: Check network connectivity, bootstrap node status

## Troubleshooting Guide

### Common Issues

#### Validator Not Proposing
```bash
# Check validator status
docker exec rnode.validator1 /opt/docker/bin/rnode show-blocks

# Check if bonded
docker exec rnode.validator1 /opt/docker/bin/rnode show-bonds

# Restart if needed
docker restart rnode.validator1
```

#### Observer Sync Issues
```bash
# Check sync status
./rust-client/target/release/node_cli show-main-chain --depth 5 -H ${ASI_NODE_HOST} -p 40452

# Restart observer
docker restart rnode.readonly
```

#### AutoPropose Not Working
```bash
# Check service logs
docker logs autopropose --tail 50

# Restart service
docker restart autopropose
```

## Performance Optimization

### Recommended Settings

1. **System Requirements**
   - CPU: 8+ cores for validators
   - RAM: 16GB minimum, 32GB recommended
   - Storage: NVMe SSD with 500GB+ capacity
   - Network: 100Mbps+ dedicated bandwidth

2. **Docker Configuration**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '4'
         memory: 16G
       reservations:
         cpus: '2'
         memory: 8G
   ```

3. **JVM Tuning**
   ```bash
   JAVA_OPTS="-Xmx12g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
   ```

## Maintenance Procedures

### Routine Maintenance

1. **Daily Tasks**
   - Check block production rate
   - Monitor resource usage
   - Review error logs

2. **Weekly Tasks**
   - Backup validator keys
   - Clean old logs
   - Update monitoring dashboards

3. **Monthly Tasks**
   - Security updates
   - Performance analysis
   - Capacity planning

### Backup Procedures

```bash
# Backup blockchain data
./scripts/maintenance/backup.sh

# Backup validator keys (CRITICAL)
cp -r ~/.rnode/genesis /secure/backup/location/

# Backup monitoring data
docker exec prometheus tar czf /tmp/prometheus-backup.tar.gz /prometheus/
docker cp prometheus:/tmp/prometheus-backup.tar.gz ./backups/
```

## Security Considerations

1. **Key Management**
   - Store validator private keys securely
   - Use hardware security modules (HSM) for production
   - Rotate keys periodically

2. **Network Security**
   - Use firewall rules to restrict access
   - Enable TLS for all API endpoints
   - Monitor for unusual activity

3. **Access Control**
   - Change default passwords immediately
   - Use strong authentication for monitoring tools
   - Implement role-based access control

## References

- [ASI Chain Documentation](../README.md)
- [Monitoring Stack Guide](monitoring/MONITORING_STACK.MD)
- [Troubleshooting Guide](troubleshooting/COMMON_ISSUES.MD)
- [Performance Tuning](performance/PERFORMANCE_TUNING_GUIDE.MD)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
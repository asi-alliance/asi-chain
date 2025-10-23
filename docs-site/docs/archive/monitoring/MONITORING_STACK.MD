# F1R3FLY/ASI Chain Monitoring Stack

## Overview

The monitoring stack provides comprehensive observability for the F1R3FLY blockchain network deployed on AWS Lightsail. It consists of:

- **Prometheus**: Time-series metrics collection and storage
- **Grafana**: Visualization and dashboarding
- **Node Exporter**: System metrics (CPU, memory, disk, network)
- **cAdvisor**: Container metrics and resource usage

## Components

### Prometheus
- **URL**: http://54.254.197.253:9090
- **Purpose**: Collects metrics from all blockchain nodes and exporters
- **Scrape Interval**: 15 seconds
- **Data Retention**: 15 days (default)

### Grafana
- **URL**: http://54.254.197.253:3000
- **Default Login**: admin/admin
- **Purpose**: Visualizes metrics and provides dashboards
- **Data Source**: Prometheus (auto-configured)

### Node Exporter
- **Port**: 9100
- **Purpose**: Exports host system metrics
- **Metrics**: CPU, memory, disk I/O, network, filesystem

### cAdvisor
- **URL**: http://54.254.197.253:8080
- **Purpose**: Container-level resource monitoring
- **Metrics**: Per-container CPU, memory, network, disk usage

## Access URLs

| Service | Internal URL | External URL |
|---------|-------------|-------------|
| Prometheus | http://localhost:9090 | http://54.254.197.253:9090 |
| Grafana | http://localhost:3000 | http://54.254.197.253:3000 |
| cAdvisor | http://localhost:8080 | http://54.254.197.253:8080 |
| Node Exporter | http://localhost:9100 | http://54.254.197.253:9100 |

## Configuration Files

### Docker Compose
- **Location**: `/home/ubuntu/f1r3fly/docker/monitoring.yml`
- **Purpose**: Defines monitoring stack services

### Prometheus Config
- **Location**: `/home/ubuntu/f1r3fly/docker/prometheus.yml`
- **Purpose**: Defines scrape targets and jobs

### Grafana Provisioning
- **Datasources**: `/home/ubuntu/f1r3fly/docker/grafana/provisioning/datasources/`
- **Dashboards**: `/home/ubuntu/f1r3fly/docker/grafana/provisioning/dashboards/`

## Metrics Available

### System Metrics (Node Exporter)
- `node_cpu_seconds_total`: CPU usage
- `node_memory_MemAvailable_bytes`: Available memory
- `node_filesystem_avail_bytes`: Disk space available
- `node_network_receive_bytes_total`: Network traffic received
- `node_network_transmit_bytes_total`: Network traffic sent

### Container Metrics (cAdvisor)
- `container_cpu_usage_seconds_total`: Container CPU usage
- `container_memory_usage_bytes`: Container memory usage
- `container_network_receive_bytes_total`: Container network RX
- `container_network_transmit_bytes_total`: Container network TX
- `container_fs_usage_bytes`: Container filesystem usage

### Blockchain Metrics (Future)
Note: The blockchain nodes currently don't expose Prometheus metrics. Future updates will include:
- Block height and production rate
- Transaction throughput
- Peer connectivity
- Consensus metrics
- Validator performance

## Quick Start Guide

### 1. Access Grafana
```bash
# Open in browser
http://54.254.197.253:3000

# Login with default credentials
Username: admin
Password: admin
```

### 2. View Prometheus Targets
```bash
# Check target health
http://54.254.197.253:9090/targets

# Query metrics
http://54.254.197.253:9090/graph
```

### 3. View Container Metrics
```bash
# cAdvisor UI
http://54.254.197.253:8080/containers/
```

## Common Queries

### System Health
```promql
# CPU Usage (percentage)
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory Usage (percentage)
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk Usage (percentage)
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)
```

### Container Performance
```promql
# Container CPU usage by name
rate(container_cpu_usage_seconds_total{name=~"rnode.*"}[5m]) * 100

# Container memory usage
container_memory_usage_bytes{name=~"rnode.*"}

# Container restart count
count(container_last_seen{name=~"rnode.*"})
```

## Maintenance

### Restart Monitoring Stack
```bash
docker-compose -f monitoring.yml restart
```

### Update Configuration
```bash
# Edit Prometheus config
vim prometheus.yml

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

### Backup Grafana Dashboards
```bash
# Export dashboards
curl -u admin:admin http://localhost:3000/api/dashboards/db/dashboard-name > dashboard.json
```

### Clean Prometheus Data
```bash
# Stop Prometheus
docker stop prometheus

# Clean data (WARNING: Deletes all metrics)
docker volume rm docker_prometheus-data

# Restart
docker start prometheus
```

## Troubleshooting

### Issue: Prometheus Can't Scrape Targets
**Solution**: Ensure containers are on the same Docker network
```bash
docker network connect f1r3fly prometheus
```

### Issue: Grafana Not Loading
**Solution**: Check container logs
```bash
docker logs grafana
```

### Issue: High Memory Usage
**Solution**: Adjust retention and scrape intervals
```yaml
# In prometheus.yml
global:
  scrape_interval: 30s  # Increase interval
```

## Security Considerations

1. **Change Default Passwords**
```bash
# Update Grafana admin password
docker exec -it grafana grafana-cli admin reset-admin-password <new-password>
```

2. **Restrict Access**
```bash
# Use firewall rules to limit access
sudo ufw allow from <trusted-ip> to any port 3000
```

3. **Enable HTTPS** (Production)
- Use reverse proxy (nginx/traefik)
- Configure SSL certificates
- Update Grafana settings

## Performance Tuning

### Prometheus Storage
```yaml
# Adjust retention in docker-compose
command:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=10GB'
```

### Grafana Performance
```ini
# In grafana.ini
[database]
cache_mode = shared

[dataproxy]
timeout = 30
keep_alive_seconds = 30
```

## Integration with Alerts

### Prometheus Alertmanager (Future)
```yaml
# alerts.yml example
groups:
  - name: blockchain
    rules:
      - alert: NodeDown
        expr: up{job=~"f1r3fly.*"} == 0
        for: 5m
        annotations:
          summary: "Node {{ $labels.instance }} is down"
```

### Grafana Alerts
1. Create alert rules in dashboard panels
2. Configure notification channels (email, Slack, etc.)
3. Set thresholds based on metrics

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [cAdvisor Documentation](https://github.com/google/cadvisor)
- [Node Exporter Documentation](https://github.com/prometheus/node_exporter)

---

**Deployed**: August 12, 2025
**Status**: ✅ Operational
**Last Updated**: August 12, 2025

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

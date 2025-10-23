# Configuration Guide

This guide covers all configuration files used in the ASI Chain deployment.

## Configuration Files Overview

The `configs/` directory contains essential configuration files for monitoring and service management:

### 1. Prometheus Configuration (`prometheus.yml`)

**Purpose**: Defines metrics collection targets and scraping intervals for the monitoring stack.

**Key Components**:
- **Global Settings**: 15-second scrape and evaluation intervals
- **Scrape Targets**:
  - Prometheus self-monitoring (port 9090)
  - Node Exporter system metrics (port 9100)
  - cAdvisor container metrics (port 8080)
  - F1R3FLY blockchain nodes (ports 40404, 40402)
  - Custom blockchain metrics exporter (port 9091)

**Node Monitoring**:
- Bootstrap node: `rnode.bootstrap:40404`
- Validator nodes 1-4: `rnode.validator[1-4]:40404`
- Observer node: `rnode.readonly:40402`

**Labels Applied**:
- `node_type`: bootstrap, validator, or observer
- `validator_id`: Unique identifier for validator nodes
- `bonded`: Bonding status for validators

### 2. Systemd Service (`blockchain-exporter.service`)

**Purpose**: Systemd service definition for the blockchain metrics exporter.

**Configuration**:
- **Type**: Simple service
- **User**: ubuntu
- **Auto-restart**: Always with 10-second delay
- **Dependencies**: Requires Docker service
- **Working Directory**: `/home/ubuntu`
- **Command**: Runs Python metrics exporter script

**Installation**:
```bash
sudo cp configs/blockchain-exporter.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable blockchain-exporter
sudo systemctl start blockchain-exporter
```

## Environment-Specific Configuration

### Production Environment
- All node addresses use Docker container names (internal networking)
- Metrics endpoint: `172.17.0.1:9091` (Docker bridge network)
- Alert rules configuration: `/etc/prometheus/alerts.yml` (optional)

### Development Environment
- Modify target addresses to use localhost or specific IPs
- Adjust scrape intervals for testing
- Enable debug logging if needed

## Configuration Updates

### Adding New Nodes
1. Add new job in `prometheus.yml`:
```yaml
- job_name: 'f1r3fly-validator5'
  metrics_path: '/metrics'
  static_configs:
    - targets: ['rnode.validator5:40404']
      labels:
        node_type: 'validator'
        validator_id: '5'
```

2. Reload Prometheus configuration:
```bash
docker-compose restart prometheus
```

### Modifying Scrape Intervals
Edit global settings in `prometheus.yml`:
```yaml
global:
  scrape_interval: 30s  # Increase for lower resource usage
  evaluation_interval: 30s
```

## Monitoring Integration

These configurations integrate with:
- **Grafana**: Visualizes metrics collected by Prometheus
- **Docker Compose**: Network configuration for container communication
- **Blockchain Nodes**: Expose metrics on designated ports

## Troubleshooting

### Common Issues

1. **Metrics Not Appearing**:
   - Verify node is exposing metrics endpoint
   - Check network connectivity between Prometheus and target
   - Review Prometheus targets page: http://localhost:9090/targets

2. **Service Won't Start**:
   - Check systemd logs: `journalctl -u blockchain-exporter`
   - Verify Python path and script location
   - Ensure Docker service is running

3. **High Resource Usage**:
   - Increase scrape interval in global settings
   - Reduce metric retention period
   - Optimize queries in Grafana dashboards

## Best Practices

1. **Version Control**: Keep all configuration changes in Git
2. **Backup**: Regular backups of configuration files
3. **Documentation**: Document any custom labels or metrics
4. **Testing**: Test configuration changes in development first
5. **Monitoring**: Monitor the monitoring stack itself

## Related Documentation

- [Monitoring Stack Guide](monitoring/MONITORING_STACK.md)
- [Deployment Artifacts](operations/DEPLOYMENT_ARTIFACTS.md)
- [Network Status](NETWORK_STATUS.md)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

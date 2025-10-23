# ASI Chain Docker Configuration Guide

## Overview

This guide covers Docker configurations for ASI Chain deployment, including monitoring stack and metrics collection.

## Directory Structure

```
docker/
├── grafana/
│   └── asi-dashboard.json         # Grafana dashboard configuration
└── metrics/
    ├── Dockerfile.metrics         # Docker image for metrics exporter
    └── docker-compose-metrics.yml # Compose file for metrics stack
```

## Components

### 1. Grafana Dashboard (`grafana/asi-dashboard.json`)

Custom Grafana dashboard for visualizing blockchain metrics:

**Dashboard Features**:
- Block height tracking
- Validator status monitoring
- Peer connectivity graphs
- Transaction throughput metrics
- System resource utilization
- Network health indicators

**Import Instructions**:
1. Access Grafana at http://localhost:3000
2. Navigate to Dashboards → Import
3. Upload `f1r3fly-dashboard.json`
4. Select Prometheus as data source
5. Click Import

### 2. Metrics Exporter Docker Image (`metrics/Dockerfile.metrics`)

Containerized blockchain metrics exporter:

**Base Image**: Python 3.9-slim
**Purpose**: Runs the blockchain metrics exporter in an isolated environment
**Exposed Port**: 9091

**Build Command**:
```bash
docker build -f docker/metrics/Dockerfile.metrics -t asi-metrics-exporter .
```

### 3. Docker Compose Stack (`metrics/docker-compose-metrics.yml`)

Complete metrics collection stack configuration:

**Services Included**:
- Prometheus (metrics collection)
- Grafana (visualization)
- Node Exporter (system metrics)
- cAdvisor (container metrics)
- Custom metrics exporter

**Network Configuration**:
- Uses `docker_f1r3fly` network for inter-container communication
- Exposes necessary ports for external access

## Deployment

### Quick Start

1. **Deploy the metrics stack**:
```bash
cd docker/metrics
docker-compose -f docker-compose-metrics.yml up -d
```

2. **Verify services are running**:
```bash
docker-compose -f docker-compose-metrics.yml ps
```

3. **Access interfaces**:
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- cAdvisor: http://localhost:8080

### Production Deployment

For production environments:

1. **Update passwords**:
```yaml
# In docker-compose-metrics.yml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=secure_password_here
```

2. **Configure persistent storage**:
```yaml
volumes:
  - grafana-data:/var/lib/grafana
  - prometheus-data:/prometheus
```

3. **Set resource limits**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
```

## Monitoring Stack Integration

The Docker configuration integrates with:

1. **Blockchain Nodes**: 
   - Nodes expose metrics on port 40404
   - Observer node uses port 40402
   - Metrics collected via Prometheus scraping

2. **System Monitoring**:
   - Node Exporter for OS-level metrics
   - cAdvisor for container-specific metrics
   - Custom exporter for blockchain-specific data

3. **Alerting** (Optional):
   - Configure alert rules in Prometheus
   - Set up notification channels in Grafana

## Container Management

### View logs:
```bash
docker-compose -f docker-compose-metrics.yml logs -f [service_name]
```

### Restart services:
```bash
docker-compose -f docker-compose-metrics.yml restart [service_name]
```

### Update configuration:
```bash
docker-compose -f docker-compose-metrics.yml down
# Make changes to configuration files
docker-compose -f docker-compose-metrics.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   - Check if ports are already in use: `netstat -tulpn | grep [port]`
   - Modify port mappings in docker-compose.yml if needed

2. **Network connectivity**:
   - Ensure all containers are on the same Docker network
   - Verify network exists: `docker network ls`
   - Create if missing: `docker network create docker_f1r3fly`

3. **Resource constraints**:
   - Monitor resource usage: `docker stats`
   - Increase Docker daemon resources if needed
   - Optimize scrape intervals in Prometheus

4. **Dashboard not loading**:
   - Verify Prometheus is collecting data
   - Check data source configuration in Grafana
   - Review dashboard JSON for syntax errors

## Best Practices

1. **Security**:
   - Use secrets management for passwords
   - Implement network segmentation
   - Enable HTTPS for external access
   - Regular security updates

2. **Performance**:
   - Optimize retention policies
   - Use appropriate scrape intervals
   - Implement query caching
   - Monitor resource usage

3. **Maintenance**:
   - Regular backups of Grafana dashboards
   - Document custom metrics
   - Version control for configurations
   - Automated health checks

## Related Documentation

- [Configuration Guide](CONFIG_GUIDE.MD)
- [Monitoring Stack](monitoring/MONITORING_STACK.MD)
- [Deployment Guide](deployment/AWS_LIGHTSAIL_DEPLOYMENT.MD)
- [Network Status](NETWORK_STATUS.MD)

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*
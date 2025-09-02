# F1R3FLY/ASI Chain Deployment Artifacts

This document tracks all scripts, configurations, and artifacts created during the deployment and setup of the F1R3FLY blockchain network on AWS Lightsail.

## Server-Created Files Recovered

### Maintenance Scripts (`scripts/maintenance/`)
- **`health_check.sh`** - Comprehensive system health check script
  - Monitors container status, resource usage, disk space
  - Checks API endpoints and blockchain health
  - Automated maintenance component

- **`backup.sh`** - Automated backup script with rotation
  - Backs up Prometheus/Grafana data
  - 7-day retention policy
  - System backup automation

- **`cleanup.sh`** - System cleanup and maintenance
  - Removes old logs and temporary files
  - Docker image cleanup
  - Resource management automation

### Security Scripts (`scripts/security/`)
- **`security_audit.sh`** - Security audit and assessment
  - Checks SSH configuration, open ports, Docker security
  - System hardening verification
  - Security monitoring automation

- **`security_hardening.sh`** - Security hardening implementation
  - SSH key rotation, firewall configuration
  - Service security improvements
  - Infrastructure security layer

### Monitoring Scripts (`scripts/monitoring/`)
- **`blockchain_metrics_exporter.py`** - Custom Prometheus metrics exporter
  - Exposes F1R3FLY blockchain metrics on port 9091
  - Collects block height, peer count, validator status
  - Performance monitoring implementation

### Docker Configurations (`docker/`)
- **`metrics/Dockerfile.metrics`** - Docker build file for metrics exporter
- **`metrics/docker-compose-metrics.yml`** - Docker Compose for metrics exporter
- **`grafana/f1r3fly-dashboard.json`** - Custom Grafana dashboard configuration

### Configuration Files (`configs/`)
- **`prometheus.yml`** - Prometheus scrape configuration
  - Includes all F1R3FLY nodes and metrics exporter
  - Network-aware container targeting
  
- **`blockchain-exporter.service`** - Systemd service file
  - Service definition for blockchain metrics exporter
  
### Smart Contracts (`contracts/`)
- **`simple_token.rho`** - Basic token contract in Rholang
- **`token_contract.rho`** - More complex token contract with balance queries

## Deployment Components

| Component | Purpose | Status | Key Artifacts |
|-----------|---------|--------|---------------|
| Grafana Dashboards | Monitoring visualization | ✅ Complete | f1r3fly-dashboard.json |
| Validator Network | Blockchain consensus | ✅ Complete | Bonding documentation |
| Security Layer | System hardening | ✅ Complete | security_*.sh scripts |
| Metrics Export | Performance monitoring | ✅ Complete | blockchain_metrics_exporter.py |
| Smart Contracts | Token functionality | ✅ Complete | *.rho contracts |
| Maintenance | Automated operations | ✅ Complete | maintenance/*.sh scripts |

## Server Locations (Original)

For reference, these files were originally created at:

### Scripts Directory
- `/home/ubuntu/scripts/health_check.sh`
- `/home/ubuntu/scripts/backup.sh`
- `/home/ubuntu/scripts/cleanup.sh`
- `/home/ubuntu/scripts/security_audit.sh`
- `/home/ubuntu/scripts/security_hardening.sh`
- `/home/ubuntu/scripts/blockchain_metrics_exporter.py`

### Docker Directory
- `/home/ubuntu/f1r3fly/docker/prometheus.yml`
- `/home/ubuntu/f1r3fly/docker/grafana/dashboards/f1r3fly-dashboard.json`
- `/home/ubuntu/f1r3fly/docker/Dockerfile.metrics`

### System Directory
- `/etc/systemd/system/blockchain-exporter.service`

## Operational Status

### Running Services
- **Blockchain Metrics Exporter**: Docker container in docker_f1r3fly network
- **Prometheus**: Scraping metrics from all nodes and custom exporter
- **Grafana**: Operational with custom dashboard at http://54.254.197.253:3000
- **Health Check**: Cron job running daily
- **Backup System**: Automated daily backups

### Cron Jobs Installed
```bash
# Daily health check at 6 AM UTC
0 6 * * * /home/ubuntu/scripts/health_check.sh > /var/log/f1r3fly-health.log 2>&1

# Daily backup at 2 AM UTC  
0 2 * * * /home/ubuntu/scripts/backup.sh > /var/log/f1r3fly-backup.log 2>&1

# Weekly cleanup on Sunday at 3 AM UTC
0 3 * * 0 /home/ubuntu/scripts/cleanup.sh > /var/log/f1r3fly-cleanup.log 2>&1
```

## Repository Organization Changes

The repository has been reorganized from a messy root directory to a professional structure:

### Before (Messy Root)
```
asi-chain/
├── Dockerfile.metrics
├── blockchain-exporter.service
├── blockchain_metrics_exporter.py
├── docker-compose-metrics.yml
├── prometheus_fixed.yml
├── simple_token.rho
├── token_contract.rho
└── ... (many other files)
```

### After (Organized Structure)
```
asi-chain/
├── scripts/
│   ├── maintenance/
│   ├── monitoring/
│   └── security/
├── docker/
│   ├── grafana/
│   ├── metrics/
│   └── prometheus/
├── configs/
├── contracts/
└── docs/
```

## Verification

All server-created files have been:
- ✅ Copied to the repository
- ✅ Organized into appropriate directories  
- ✅ Documented with purpose and functionality
- ✅ Version controlled in Git
- ✅ Professional directory structure implemented

## Next Steps

1. **Documentation Review**: All documentation updated to reflect new structure
2. **README Updates**: Root README and docs/README updated
3. **Git Commit**: All changes committed with proper messages
4. **Continuous Monitoring**: Maintain operational excellence

Last updated: August 12, 2025

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

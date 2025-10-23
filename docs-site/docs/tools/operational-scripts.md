---
sidebar_position: 2
title: Operational Scripts
---

# ASI Chain Operational Scripts

This directory contains all operational scripts created for the F1R3FLY/ASI Chain network deployment and maintenance.

## Directory Structure

```
scripts/
├── maintenance/        # System maintenance and health monitoring
├── monitoring/        # Custom metrics and monitoring tools
├── security/          # Security audit and hardening
└── README.md         # This file
```

## Maintenance Scripts (`maintenance/`)

### `health_check.sh`
Comprehensive system health monitoring script that checks:
- Docker container status
- Resource usage (CPU, memory, disk)
- API endpoint health
- Blockchain synchronization status
- Log rotation and disk space

**Usage:**
```bash
./scripts/maintenance/health_check.sh
```

**Cron Schedule:** Daily at 6 AM UTC
```bash
0 6 * * * /home/ubuntu/scripts/health_check.sh > /var/log/f1r3fly-health.log 2>&1
```

### `backup.sh`
Automated backup script with retention policy:
- Backs up Prometheus data and configuration
- Backs up Grafana dashboards and settings
- 7-day retention policy
- Compressed archives with timestamps

**Usage:**
```bash
./scripts/maintenance/backup.sh
```

**Cron Schedule:** Daily at 2 AM UTC
```bash
0 2 * * * /home/ubuntu/scripts/backup.sh > /var/log/f1r3fly-backup.log 2>&1
```

### `cleanup.sh`
System cleanup and maintenance:
- Removes old log files (>30 days)
- Cleans up temporary files
- Docker image and container cleanup
- System package cache cleanup

**Usage:**
```bash
./scripts/maintenance/cleanup.sh
```

**Cron Schedule:** Weekly on Sunday at 3 AM UTC
```bash
0 3 * * 0 /home/ubuntu/scripts/cleanup.sh > /var/log/f1r3fly-cleanup.log 2>&1
```

## Monitoring Scripts (`monitoring/`)

### `blockchain_metrics_exporter.py`
Custom Prometheus metrics exporter for F1R3FLY blockchain:
- Exposes metrics on port 9091
- Collects block height, peer count, validator status
- Updates every 30 seconds
- Docker containerized deployment

**Metrics Exported:**
- `f1r3fly_block_height{node="&lt;node_name&gt;"}`
- `f1r3fly_peer_count{node="&lt;node_name&gt;"}`
- `f1r3fly_validator_count`
- `f1r3fly_total_stake`
- `f1r3fly_api_errors_total{node="&lt;node_name&gt;"}`

**Usage:**
```bash
# Run directly
python3 scripts/monitoring/blockchain_metrics_exporter.py

# Run as Docker container (recommended)
docker run -d --name metrics-exporter \
  --network docker_f1r3fly \
  -p 9091:9091 \
  f1r3fly-metrics-exporter
```

**Documentation:** See [docs/monitoring/BLOCKCHAIN_METRICS_EXPORTER.md](monitoring/metrics-exporter.md)

### `network_stress_test.sh`
Comprehensive network stress testing script for F1R3FLY blockchain:
- Tests all documented endpoints (Bootstrap, Validators 1-4, Observer)
- Uses authentic private keys from docker configuration
- Multi-phase testing: endpoints, network health, transactions, concurrent load
- Detailed reporting with success rates and recommendations

**Usage:**
```bash
# Run comprehensive stress test (5 minutes, 10 parallel operations)
./scripts/monitoring/network_stress_test.sh
```

**Test Categories:**
- API endpoint health checks
- Network consensus validation
- Wallet balance queries with authentic keys
- Validator status queries
- Blockchain data retrieval
- Concurrent load testing
- Light transaction testing

### `run_stress_tests.sh`
User-friendly wrapper for network stress testing with multiple configurations:

**Usage:**
```bash
# Quick test (2 minutes, 5 parallel ops)
./scripts/monitoring/run_stress_tests.sh quick

# Standard test (5 minutes, 10 parallel ops) 
./scripts/monitoring/run_stress_tests.sh standard

# Intensive test (10 minutes, 20 parallel ops)
./scripts/monitoring/run_stress_tests.sh intensive

# Endurance test (30 minutes, 15 parallel ops)
./scripts/monitoring/run_stress_tests.sh endurance

# Custom configuration (interactive)
./scripts/monitoring/run_stress_tests.sh custom
```

**Features:**
- Colored real-time progress indicators
- Network connectivity verification
- Comprehensive final reports
- Detailed logging to `/tmp/stress_test_*.log`

**Documentation:** See [docs/monitoring/NETWORK_STRESS_TESTING.md](monitoring/stress-testing.md)

## Security Scripts (`security/`)

### `security_audit.sh`
Security assessment and verification:
- SSH configuration audit
- Open port scanning
- Docker security check
- File permission verification
- User account audit

**Usage:**
```bash
./scripts/security/security_audit.sh
```

**Output:** Generates detailed security report with recommendations

### `security_hardening.sh`
Automated security improvements:
- SSH key rotation
- Firewall rule optimization
- Service security configuration
- Log audit setup
- Access control improvements

**⚠️ Warning:** Review script before running in production

**Usage:**
```bash
# Review first
cat scripts/security/security_hardening.sh

# Run with confirmation
./scripts/security/security_hardening.sh
```

## Script Installation

### Prerequisites
- Ubuntu 22.04+ or compatible Linux distribution
- Docker and Docker Compose
- Python 3.10+ (for monitoring scripts)
- Prometheus and Grafana (for metrics)

### Installation Steps

1. **Copy scripts to server:**
```bash
scp -r scripts/ ubuntu@54.254.197.253:/home/ubuntu/
```

2. **Make scripts executable:**
```bash
chmod +x scripts/maintenance/*.sh
chmod +x scripts/security/*.sh
```

3. **Install Python dependencies (for metrics exporter):**
```bash
pip3 install prometheus_client requests
```

4. **Set up cron jobs:**
```bash
crontab -e
# Add the cron schedules listed above
```

## Configuration Files

Related configuration files are stored in the `configs/` directory:
- `prometheus.yml` - Prometheus scrape configuration
- `blockchain-exporter.service` - Systemd service file

## GitHub Issues

These scripts were created to address specific GitHub issues:

| Script | GitHub Issue | Status |
|--------|-------------|--------|
| health_check.sh | #11 - Automated Maintenance | ✅ Complete |
| backup.sh | #11 - Automated Maintenance | ✅ Complete |
| cleanup.sh | #11 - Automated Maintenance | ✅ Complete |
| blockchain_metrics_exporter.py | #9 - Blockchain Metrics Export | ✅ Complete |
| security_audit.sh | #8 - Security Hardening | ✅ Complete |
| security_hardening.sh | #8 - Security Hardening | ✅ Complete |

## Maintenance

### Log Locations
- Health checks: `/var/log/f1r3fly-health.log`
- Backups: `/var/log/f1r3fly-backup.log`
- Cleanup: `/var/log/f1r3fly-cleanup.log`

### Monitoring Script Status
Check if metrics exporter is running:
```bash
docker ps | grep metrics-exporter
curl http://localhost:9091/metrics | head -10
```

### Script Updates
When updating scripts on the server, ensure they are also committed to the repository:
```bash
# Copy from server to repo
scp ubuntu@54.254.197.253:/home/ubuntu/scripts/script_name.sh scripts/category/

# Commit changes
git add scripts/
git commit -m "Update operational script: script_name.sh"
```

## Security Considerations

- Scripts contain sensitive operations - review before running
- Security hardening script should be tested in staging environment
- Backup files may contain sensitive configuration data
- Monitor script execution logs for anomalies

## Support

For issues with operational scripts:
1. Check script logs in `/var/log/`
2. Verify file permissions and dependencies
3. Review [troubleshooting documentation](troubleshooting/common-issues.md)
4. Open GitHub issue with error details

---

*These scripts are part of the ASI Chain deployment automation and maintenance framework.*
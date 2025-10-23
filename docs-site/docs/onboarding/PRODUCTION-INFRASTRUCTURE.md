# Production Infrastructure

## 🌐 Infrastructure Overview

ASI Chain production infrastructure runs on AWS Lightsail in Singapore region, providing a cost-effective and manageable solution for blockchain deployment.

```
┌──────────────────────────────────────────────────────────┐
│                    AWS Lightsail                          │
│                  Region: ap-southeast-1                   │
│                     (Singapore)                           │
├──────────────────────────────────────────────────────────┤
│  Instance: asi-chain-production                          │
│  IP: 13.251.66.61 (Static)                              │
│  OS: Ubuntu 22.04 LTS                                    │
│  CPU: 8 vCPUs                                           │
│  RAM: 16 GB                                             │
│  Storage: 320 GB SSD                                     │
│  Network: 5 TB transfer                                  │
│  Cost: ~$160/month                                       │
└──────────────────────────────────────────────────────────┘
```

## 🖥️ Server Specifications

### AWS Lightsail Instance Details

| Property | Value | Notes |
|----------|-------|-------|
| **Instance Name** | asi-chain-production | Primary server |
| **Instance ID** | [To be provided] | AWS resource ID |
| **Region** | ap-southeast-1 | Singapore |
| **Availability Zone** | ap-southeast-1a | Single AZ |
| **Instance Plan** | 8 GB RAM plan | $160/month |
| **Static IP** | 13.251.66.61 | Attached permanently |
| **Launch Date** | September 2025 | Initial deployment |
| **OS** | Ubuntu 22.04.3 LTS | Long-term support |
| **Kernel** | 5.15.0-1045-aws | AWS optimized |
| **Docker** | 24.0.6 | Latest stable |
| **Docker Compose** | 2.21.0 | v2 syntax |

### System Resources

```bash
# CPU Information
Architecture:          x86_64
CPU op-mode(s):       32-bit, 64-bit
CPU(s):               8
Thread(s) per core:   2
Core(s) per socket:   4
Socket(s):            1
Model name:           Intel(R) Xeon(R) CPU E5-2686 v4 @ 2.30GHz

# Memory Configuration
Total Memory:         16 GB
Available:           ~12 GB (with all services running)
Swap:                4 GB (SSD backed)

# Storage Layout
/dev/xvda1    320G   85G  220G  28% /
/dev/xvdb     100G   20G   75G  21% /data  # Additional volume
```

## 🔐 Network Configuration

### Public Network

```yaml
Public IP: 13.251.66.61
DNS: Not configured (use IP directly)
Reverse DNS: ec2-13-251-66-61.ap-southeast-1.compute.amazonaws.com

IPv4 CIDR: 13.251.66.61/32
IPv6: Not enabled
```

### Firewall Rules (Lightsail)

| Port Range | Protocol | Source | Purpose |
|------------|----------|--------|---------|
| 22 | TCP | Custom IPs | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP redirect |
| 443 | TCP | 0.0.0.0/0 | HTTPS (future) |
| 3000-3003 | TCP | 0.0.0.0/0 | Web applications |
| 5050 | TCP | 0.0.0.0/0 | Faucet API |
| 5432 | TCP | 127.0.0.1 | PostgreSQL (local only) |
| 6379-6380 | TCP | 127.0.0.1 | Redis (local only) |
| 8080 | TCP | 0.0.0.0/0 | GraphQL API |
| 9090-9091 | TCP | 0.0.0.0/0 | Indexer & Prometheus |
| 40400-40455 | TCP | 0.0.0.0/0 | F1R3FLY nodes |

### UFW Firewall (Ubuntu)

```bash
# Current UFW rules
sudo ufw status verbose

Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

# Rules
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       YOUR_IP/32
3000:3003/tcp             ALLOW       Anywhere
5050/tcp                  ALLOW       Anywhere
8080/tcp                  ALLOW       Anywhere
9090:9091/tcp            ALLOW       Anywhere
40400:40455/tcp          ALLOW       Anywhere
```

## 🐳 Docker Infrastructure

### Docker Configuration

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "metrics-addr": "127.0.0.1:9323",
  "experimental": true,
  "live-restore": true,
  "userland-proxy": false,
  "ip-forward": true,
  "iptables": true
}
```

### Docker Networks

```bash
# Production networks
docker network ls

NETWORK ID     NAME                  DRIVER    SCOPE
a1b2c3d4e5f6   asi-chain_default     bridge    local
b2c3d4e5f6g7   f1r3fly_default       bridge    local
c3d4e5f6g7h8   indexer_default       bridge    local
```

### Docker Volumes

```bash
# Persistent volumes
docker volume ls

VOLUME NAME                    SIZE     MOUNT POINT
asi-chain_postgres-data        45GB     /var/lib/postgresql/data
asi-chain_redis-data           2GB      /data
asi-chain_indexer-data         10GB     /app/data
f1r3fly_bootstrap-data         25GB     /var/lib/rnode
f1r3fly_validator1-data        25GB     /var/lib/rnode
f1r3fly_validator2-data        25GB     /var/lib/rnode
f1r3fly_readonly-data          20GB     /var/lib/rnode
```

## 📦 Service Deployment Map

### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Host (Ubuntu)                     │
├─────────────────────────────────────────────────────────┤
│  Frontend Containers                                      │
│  ├── asi-wallet-v2     (3000:80)    React 18 app        │
│  ├── asi-explorer      (3001:80)    React 19 app        │
│  ├── asi-docs          (3003:80)    Docusaurus          │
│  └── asi-faucet        (5050:5050)  Express API         │
├─────────────────────────────────────────────────────────┤
│  Backend Containers                                       │
│  ├── asi-rust-indexer  (9090:9090)  Python + Rust CLI   │
│  ├── asi-hasura        (8080:8080)  GraphQL Engine      │
│  ├── asi-indexer-db    (5432:5432)  PostgreSQL 14       │
│  └── asi-redis         (6379:6379)  Redis Cache         │
├─────────────────────────────────────────────────────────┤
│  Blockchain Containers                                    │
│  ├── rnode.bootstrap   (40400-40405) Bootstrap node      │
│  ├── rnode.validator1  (40410-40415) Validator 1        │
│  ├── rnode.validator2  (40420-40425) Validator 2        │
│  ├── rnode.readonly    (40450-40455) Observer node      │
│  └── autopropose       (internal)    Block proposer      │
└─────────────────────────────────────────────────────────┘
```

### Service Locations

| Service | Container Name | Internal Port | External Port | Restart Policy |
|---------|---------------|---------------|---------------|----------------|
| Wallet | asi-wallet-v2 | 80 | 3000 | unless-stopped |
| Explorer | asi-explorer | 80 | 3001 | unless-stopped |
| Docs | asi-docs | 80 | 3003 | unless-stopped |
| Faucet | asi-faucet | 5050 | 5050 | unless-stopped |
| Indexer | asi-rust-indexer | 9090 | 9090 | unless-stopped |
| Hasura | asi-hasura | 8080 | 8080 | unless-stopped |
| PostgreSQL | asi-indexer-db | 5432 | 5432 | unless-stopped |
| Redis | asi-redis | 6379 | 6379 | unless-stopped |
| Bootstrap | rnode.bootstrap | 40401-40405 | 40401-40405 | unless-stopped |
| Validator1 | rnode.validator1 | 40411-40415 | 40411-40415 | unless-stopped |
| Validator2 | rnode.validator2 | 40421-40425 | 40421-40425 | unless-stopped |
| Observer | rnode.readonly | 40451-40455 | 40451-40455 | unless-stopped |
| Autopropose | autopropose | N/A | N/A | unless-stopped |

## 🔧 System Configuration

### Kernel Parameters

```bash
# /etc/sysctl.conf optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
fs.file-max = 2097152
fs.nr_open = 2097152
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
```

### System Limits

```bash
# /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
* soft nproc 32768
* hard nproc 32768
root soft nofile 65535
root hard nofile 65535
```

### Systemd Services

```bash
# Custom services
/etc/systemd/system/asi-chain.service    # Main orchestrator
/etc/systemd/system/docker-cleanup.timer # Daily cleanup
/etc/systemd/system/backup.timer         # Daily backups
```

## 📊 Resource Utilization

### Current Usage (Typical)

```yaml
CPU Usage:
  Average: 35-40%
  Peak: 60-70% (during indexing)
  
Memory Usage:
  Used: 12 GB / 16 GB
  Breakdown:
    - F1R3FLY nodes: 6 GB
    - PostgreSQL: 2 GB
    - Indexer: 1.5 GB
    - Hasura: 1 GB
    - Frontend apps: 1 GB
    - System/cache: 0.5 GB

Disk I/O:
  Read: ~50 MB/s average
  Write: ~30 MB/s average
  IOPS: ~2000 average

Network:
  Inbound: ~10 Mbps average
  Outbound: ~15 Mbps average
  Monthly transfer: ~2 TB
```

### Capacity Planning

```yaml
Current Capacity:
  - Blocks stored: ~500,000
  - Database size: 45 GB
  - Transactions/day: ~10,000
  - API requests/day: ~100,000

Growth Projections:
  - 3 months: 70% disk usage
  - 6 months: 85% disk usage
  - 12 months: Need storage expansion

Scaling Triggers:
  - CPU > 80% sustained: Add compute
  - Memory > 90%: Increase RAM
  - Disk > 85%: Add storage volume
  - Network > 4TB/month: Upgrade plan
```

## 🔄 Backup Infrastructure

### Backup Locations

```bash
# Local backups
/backup/
├── daily/
│   ├── postgres/      # Database dumps
│   ├── configs/       # Configuration files
│   └── volumes/       # Docker volumes
├── weekly/
│   └── full/         # Complete system backup
└── monthly/
    └── archive/      # Long-term storage
```

### Backup Schedule

| Type | Frequency | Time (UTC) | Retention | Location |
|------|-----------|------------|-----------|----------|
| Database | Daily | 02:00 | 7 days | /backup/daily/postgres |
| Configs | Daily | 02:30 | 30 days | /backup/daily/configs |
| Full | Weekly | Sun 00:00 | 4 weeks | /backup/weekly/full |
| Archive | Monthly | 1st 00:00 | 12 months | S3 bucket |

### S3 Backup Configuration

```bash
# AWS CLI configuration
aws configure
AWS Access Key ID: [Provided separately]
AWS Secret Access Key: [Provided separately]
Default region: ap-southeast-1
Default output: json

# S3 bucket structure
s3://asi-chain-backups/
├── daily/
├── weekly/
├── monthly/
└── emergency/
```

## 🔍 Monitoring Infrastructure

### Monitoring Stack

```yaml
Prometheus:
  Container: asi-prometheus
  Port: 9091
  Config: /etc/prometheus/prometheus.yml
  Retention: 30 days
  Targets:
    - Node exporter: localhost:9100
    - Docker metrics: localhost:9323
    - Custom metrics: localhost:9090/metrics

Grafana:
  Container: asi-grafana
  Port: 3002
  Admin: admin/[Provided separately]
  Dashboards:
    - System Overview
    - Docker Containers
    - Blockchain Metrics
    - API Performance

Node Exporter:
  Binary: /usr/local/bin/node_exporter
  Port: 9100
  Metrics: System-level metrics
```

### CloudWatch Integration

```bash
# CloudWatch agent configuration
/opt/aws/amazon-cloudwatch-agent/etc/
├── amazon-cloudwatch-agent.json
└── amazon-cloudwatch-agent.toml

# Metrics sent to CloudWatch
- CPU utilization
- Memory usage
- Disk usage
- Network traffic
- Custom application metrics
```

## 🔒 Security Infrastructure

### SSL/TLS Configuration

```nginx
# Nginx SSL configuration (future)
server {
    listen 443 ssl http2;
    server_name asi-chain.io;
    
    ssl_certificate /etc/letsencrypt/live/asi-chain.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/asi-chain.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
}
```

### Fail2ban Configuration

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[docker-api]
enabled = true
port = 8080,9090
logpath = /var/log/docker/*.log
```

### Security Scanning

```bash
# Regular security scans
lynis audit system              # System security audit
docker scan asi-wallet:latest   # Container scanning
npm audit                        # Node.js dependencies
safety check                     # Python dependencies
```

## 🌍 Geographic Distribution

### Current Setup (Single Region)

```yaml
Primary Region: ap-southeast-1 (Singapore)
  Advantages:
    - Low latency for APAC
    - Stable infrastructure
    - Good connectivity
  
  Disadvantages:
    - Single point of failure
    - Higher latency for US/EU
    - No geo-redundancy
```

### Future Multi-Region Plan

```yaml
Phase 1 - Read Replicas:
  - us-east-1: Read-only API
  - eu-west-1: Read-only API
  
Phase 2 - Active-Active:
  - Singapore: Primary write
  - US East: Secondary write
  - Europe: Secondary write
  
Phase 3 - Full Distribution:
  - Global load balancing
  - Geo-distributed validators
  - Regional caching
```

## 🚀 Deployment Pipeline

### Current Deployment Method

```bash
# Manual deployment via SSH
ssh -i XXXXXXX.pem ubuntu@13.251.66.61
cd /home/ubuntu/asi-chain
git pull
docker-compose up -d
```

### CI/CD Pipeline (Planned)

```yaml
GitHub Actions:
  Triggers:
    - Push to main
    - Pull request
    - Manual dispatch
  
  Steps:
    1. Run tests
    2. Build Docker images
    3. Push to registry
    4. Deploy to staging
    5. Run smoke tests
    6. Deploy to production
    7. Verify deployment
```

## 📈 Scaling Strategy

### Vertical Scaling (Current)

```bash
# Upgrade Lightsail instance
Current: 8 GB RAM ($160/month)
Next: 16 GB RAM ($320/month)
Max: 32 GB RAM ($640/month)
```

### Horizontal Scaling (Future)

```yaml
Load Balancer:
  - AWS ALB or Lightsail LB
  - Health checks
  - SSL termination

Application Servers:
  - 2-3 instances
  - Docker Swarm or K8s
  - Shared storage (EFS)

Database:
  - Primary-replica setup
  - Read replicas
  - Connection pooling
```

## 🔄 Disaster Recovery

### RPO/RTO Targets

```yaml
Recovery Point Objective (RPO): 1 hour
  - Maximum acceptable data loss
  
Recovery Time Objective (RTO): 2 hours
  - Maximum acceptable downtime

Backup Strategy:
  - Hourly database snapshots
  - Daily full backups
  - Off-site replication
```

### DR Procedures

```bash
# Disaster recovery runbook
1. Assess damage
2. Activate DR plan
3. Provision new instance
4. Restore from backup
5. Update DNS/IPs
6. Verify services
7. Communicate status
```

## 🔑 Access Management

### SSH Access

```bash
# SSH configuration
Host: 13.251.66.61
Port: 22
User: ubuntu
Key: XXXXXXX.pem

# Additional users
ubuntu: Primary admin
deployer: Deployment only
monitor: Read-only monitoring
```

### AWS Access

```yaml
AWS Account: [Account ID]
Region: ap-southeast-1

IAM Roles:
  - AdminRole: Full access
  - DeployRole: Lightsail + S3
  - MonitorRole: Read-only

Required Permissions:
  - Lightsail:*
  - S3:* (for backups)
  - CloudWatch:*
  - Route53:* (future)
```

## 📋 Infrastructure Checklist

### Daily Checks
- [ ] Instance health
- [ ] Disk usage < 8lt;80%
- [ ] Memory usage < 9lt;90%
- [ ] Network usage < daily limit
- [ ] Backup completion

### Weekly Checks
- [ ] Security updates
- [ ] Docker image updates
- [ ] Log rotation
- [ ] Metrics review
- [ ] Cost analysis

### Monthly Checks
- [ ] Full backup test
- [ ] DR drill
- [ ] Security audit
- [ ] Capacity planning
- [ ] Cost optimization

## 📚 Additional Resources

### AWS Lightsail Documentation
- [Instance management](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-managing-your-instances)
- [Networking](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/understanding-public-ip-and-private-ip-addresses-in-amazon-lightsail)
- [Snapshots](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-snapshots)

### Monitoring Dashboards
- System: http://13.251.66.61:3002/d/system
- Docker: http://13.251.66.61:3002/d/docker
- Blockchain: http://13.251.66.61:3002/d/blockchain

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Next Review**: Monthly
# Monitoring and Alerts Guide

## 🎯 Monitoring Overview

ASI Chain employs multi-layer monitoring across infrastructure, application, and blockchain metrics to ensure system reliability and performance.

### Monitoring Stack
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Node Exporter**: System metrics
- **Custom Exporters**: Blockchain-specific metrics
- **CloudWatch**: AWS infrastructure monitoring
- **Application Insights**: Application performance monitoring

## 📊 Metrics Collection

### System Metrics

#### Node Exporter Configuration
```yaml
# docker-compose.monitoring.yml
node-exporter:
  image: prom/node-exporter:latest
  container_name: asi-node-exporter
  ports:
    - "9100:9100"
  command:
    - '--path.procfs=/host/proc'
    - '--path.sysfs=/host/sys'
    - '--path.rootfs=/rootfs'
    - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  restart: unless-stopped
```

#### Key System Metrics
```promql
# CPU Usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory Usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk Usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100

# Network Traffic
rate(node_network_receive_bytes_total[5m])
rate(node_network_transmit_bytes_total[5m])

# Disk I/O
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])
```

### Application Metrics

#### Indexer Metrics
```python
# indexer/src/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Define metrics
blocks_processed = Counter('indexer_blocks_processed_total', 'Total blocks processed')
deployments_indexed = Counter('indexer_deployments_indexed_total', 'Total deployments indexed')
indexing_duration = Histogram('indexer_processing_duration_seconds', 'Block processing time')
sync_lag = Gauge('indexer_sync_lag_blocks', 'Blocks behind chain head')
last_indexed_block = Gauge('indexer_last_block', 'Last indexed block number')

# Start metrics server
start_http_server(8000)

# Update metrics in code
blocks_processed.inc()
with indexing_duration.time():
    process_block()
sync_lag.set(chain_height - current_block)
```

#### Wallet Metrics
```typescript
// asi_wallet_v2/src/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Transaction metrics
export const transactionCounter = new Counter({
  name: 'wallet_transactions_total',
  help: 'Total wallet transactions',
  labelNames: ['type', 'status']
});

// API call metrics
export const apiCallDuration = new Histogram({
  name: 'wallet_api_duration_seconds',
  help: 'API call duration',
  labelNames: ['endpoint', 'method']
});

// Active connections
export const activeConnections = new Gauge({
  name: 'wallet_active_connections',
  help: 'Active WebSocket connections'
});

// Export metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

### Blockchain Metrics

#### F1R3FLY Node Metrics
```bash
# Metrics endpoint
curl http://localhost:40405/metrics

# Key metrics to monitor
rnode_block_height              # Current block height
rnode_peers_connected           # Connected peer count
rnode_validator_bonds           # Validator stake amounts
rnode_deploy_queue_size         # Pending deployments
rnode_casper_block_time         # Block production time
rnode_memory_usage_bytes        # Node memory usage
```

#### Custom Blockchain Exporter
```python
# monitoring/blockchain_exporter.py
import requests
from prometheus_client import Gauge, start_http_server
import time

# Define metrics
block_height = Gauge('blockchain_block_height', 'Current block height')
peer_count = Gauge('blockchain_peer_count', 'Connected peers')
validator_count = Gauge('blockchain_validator_count', 'Active validators')
transaction_pool = Gauge('blockchain_tx_pool_size', 'Transaction pool size')

def collect_metrics():
    while True:
        # Collect from F1R3FLY API
        response = requests.get('http://localhost:40403/api/status')
        data = response.json()
        
        block_height.set(data['blockNumber'])
        peer_count.set(data['peers'])
        
        # Collect validator info
        validators = requests.get('http://localhost:9090/validators').json()
        validator_count.set(len(validators))
        
        time.sleep(15)

if __name__ == '__main__':
    start_http_server(8001)
    collect_metrics()
```

## 🔔 Alert Configuration

### Prometheus Alert Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: system_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: (100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% (current value: {{ $value }}%)"
      
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 90% (current value: {{ $value }}%)"
      
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 1lt;15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk space is below 15% (current value: {{ $value }}%)"

  - name: blockchain_alerts
    interval: 30s
    rules:
      - alert: BlockProductionStopped
        expr: increase(blockchain_block_height[5m]) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Block production has stopped"
          description: "No new blocks in the last 5 minutes"
      
      - alert: IndexerLagging
        expr: indexer_sync_lag_blocks > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Indexer lagging behind chain"
          description: "Indexer is {{ $value }} blocks behind"
      
      - alert: ValidatorOffline
        expr: blockchain_validator_count < 3lt;3
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Validator count below minimum"
          description: "Only {{ $value }} validators online"

  - name: application_alerts
    interval: 30s
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(wallet_api_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "95th percentile latency is {{ $value }}s"
      
      - alert: ServiceDown
        expr: up{job=~"wallet|explorer|indexer|faucet"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for 2 minutes"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value }} per second"
```

### AlertManager Configuration

```yaml
# alertmanager/config.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#asi-chain-alerts'
        title: 'ASI Chain Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'

  - name: 'critical'
    slack_configs:
      - channel: '#asi-chain-critical'
        title: '🚨 CRITICAL ALERT'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'warning'
    slack_configs:
      - channel: '#asi-chain-warnings'
        title: '⚠️ Warning'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## 📈 Grafana Dashboards

### System Dashboard Configuration

```json
{
  "dashboard": {
    "title": "ASI Chain System Metrics",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{ instance }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{ instance }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Disk I/O",
        "targets": [
          {
            "expr": "rate(node_disk_read_bytes_total[5m])",
            "legendFormat": "Read {{ device }}"
          },
          {
            "expr": "rate(node_disk_written_bytes_total[5m])",
            "legendFormat": "Write {{ device }}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Blockchain Dashboard

```json
{
  "dashboard": {
    "title": "ASI Chain Blockchain Metrics",
    "panels": [
      {
        "title": "Block Height",
        "targets": [
          {
            "expr": "blockchain_block_height",
            "legendFormat": "Current Height"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Block Production Rate",
        "targets": [
          {
            "expr": "rate(blockchain_block_height[5m]) * 60",
            "legendFormat": "Blocks/min"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Validator Status",
        "targets": [
          {
            "expr": "blockchain_validator_count",
            "legendFormat": "Active Validators"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Transaction Pool",
        "targets": [
          {
            "expr": "blockchain_tx_pool_size",
            "legendFormat": "Pending TXs"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## 🔍 Log Aggregation

### Docker Logging Configuration

```yaml
# docker-compose.yml
services:
  asi-wallet:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=wallet"
        
  asi-indexer:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "indexer.{{.Name}}"
```

### Fluentd Configuration

```conf
# fluentd/fluent.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<filter **>
  @type parser
  key_name log
  <parse>
    @type json
  </parse>
</filter>

<match indexer.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name indexer
  type_name _doc
</match>

<match wallet.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name wallet
  type_name _doc
</match>

<match **>
  @type stdout
</match>
```

### Log Patterns to Monitor

```bash
# Critical errors
grep -E "CRITICAL|FATAL|PANIC" /var/log/asi-chain/*.log

# Transaction failures
grep "transaction failed" /var/log/asi-chain/indexer.log

# Connection issues
grep -E "connection refused|timeout" /var/log/asi-chain/*.log

# Out of memory
grep -E "OOM|out of memory" /var/log/syslog
```

## 🚨 Health Checks

### Service Health Endpoints

```yaml
# docker-compose.yml healthchecks
services:
  asi-wallet:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
      
  asi-indexer:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      
  asi-explorer:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Health Check Script

```bash
#!/bin/bash
# monitoring/health_check.sh

SERVICES=(
  "http://localhost:3000/health:Wallet"
  "http://localhost:3001/health:Explorer"
  "http://localhost:9090/health:Indexer"
  "http://localhost:5050/health:Faucet"
  "http://localhost:8080/healthz:Hasura"
  "http://localhost:40403/api/status:F1R3FLY"
)

for service in "${SERVICES[@]}"; do
  IFS=':' read -r url name <<< "$service"
  if curl -f -s "$url" > /dev/null; then
    echo "✅ $name is healthy"
  else
    echo "❌ $name is down"
    # Send alert
    curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"🚨 $name service is down!\"}"
  fi
done
```

## 📱 Notification Channels

### Slack Integration

```python
# monitoring/slack_notifier.py
import requests
import json

class SlackNotifier:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url
    
    def send_alert(self, severity, title, description):
        emoji = {
            'critical': '🚨',
            'warning': '⚠️',
            'info': 'ℹ️'
        }.get(severity, '📢')
        
        payload = {
            'text': f"{emoji} *{title}*",
            'attachments': [{
                'color': {
                    'critical': 'danger',
                    'warning': 'warning',
                    'info': 'good'
                }.get(severity, '#808080'),
                'text': description,
                'footer': 'ASI Chain Monitoring',
                'ts': int(time.time())
            }]
        }
        
        requests.post(self.webhook_url, json=payload)
```

### Email Notifications

```python
# monitoring/email_notifier.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_alert_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg['From'] = 'alerts@asichain.io'
    msg['To'] = to_email
    msg['Subject'] = f"[ASI Chain Alert] {subject}"
    
    msg.attach(MIMEText(body, 'html'))
    
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('alerts@asichain.io', 'password')
        server.send_message(msg)
```

## 🎯 Monitoring Deployment

### Docker Compose Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: asi-prometheus
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: asi-grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=redis-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: asi-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'wallet'
    static_configs:
      - targets: ['asi-wallet:3000']
    metrics_path: '/metrics'

  - job_name: 'indexer'
    static_configs:
      - targets: ['asi-indexer:8000']

  - job_name: 'blockchain'
    static_configs:
      - targets: ['localhost:8001']

  - job_name: 'f1r3fly'
    static_configs:
      - targets: 
          - 'localhost:40405'
          - 'localhost:40415'
          - 'localhost:40425'
```

## 🔧 Maintenance Scripts

### Cleanup Old Metrics

```bash
#!/bin/bash
# monitoring/cleanup_metrics.sh

# Clean Prometheus data older than 30 days
curl -X POST http://localhost:9091/api/v1/admin/tsdb/clean_tombstones

# Clean Grafana snapshots
find /var/lib/grafana/snapshots -mtime +7 -delete

# Clean logs
find /var/log/asi-chain -name "*.log" -mtime +30 -delete

# Rotate Docker logs
docker system prune -f
for container in $(docker ps -q); do
    docker inspect $container | grep LogPath | \
    awk '{print $2}' | tr -d ',"' | xargs truncate -s 0
done
```

### Performance Tuning

```bash
#!/bin/bash
# monitoring/tune_monitoring.sh

# Optimize Prometheus retention
curl -X POST http://localhost:9091/api/v1/admin/tsdb/compact

# Set memory limits
docker update --memory="2g" --memory-swap="2g" asi-prometheus
docker update --memory="1g" --memory-swap="1g" asi-grafana

# Optimize query performance
cat > /tmp/prometheus_tune.yml << EOF
storage.tsdb.retention.time: 15d
storage.tsdb.retention.size: 10GB
query.max-samples: 50000000
query.timeout: 2m
EOF
```

## 📋 Monitoring Checklist

### Daily Tasks
- [ ] Check all service health endpoints
- [ ] Review alert history
- [ ] Check disk space usage
- [ ] Verify backup completion
- [ ] Review error logs

### Weekly Tasks
- [ ] Analyze performance trends
- [ ] Update alert thresholds if needed
- [ ] Clean up old logs and metrics
- [ ] Test alert notifications
- [ ] Review dashboard accuracy

### Monthly Tasks
- [ ] Audit monitoring coverage
- [ ] Update Grafana dashboards
- [ ] Review and tune alert rules
- [ ] Performance baseline update
- [ ] Disaster recovery test

---

**Document Version**: 1.0  
**Last Updated**: September 2025  
**Monitoring Stack**: Prometheus 2.40+, Grafana 9.0+
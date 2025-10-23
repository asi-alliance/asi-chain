# F1R3FLY Blockchain Metrics Exporter

## Overview

The Blockchain Metrics Exporter is a custom Python-based metrics collector that exposes F1R3FLY blockchain metrics in Prometheus format. It runs as a Docker container alongside the blockchain nodes and provides real-time metrics about the network's health and performance.

## Architecture

- **Language**: Python 3.10
- **Libraries**: prometheus_client, requests
- **Port**: 9091
- **Format**: Prometheus metrics exposition format
- **Update Interval**: 30 seconds

## Metrics Exposed

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `f1r3fly_block_height` | Gauge | Current block height of each node | `node` |
| `f1r3fly_peer_count` | Gauge | Number of connected peers per node | `node` |
| `f1r3fly_node_count` | Gauge | Total number of known nodes | `node` |
| `f1r3fly_validator_count` | Gauge | Number of bonded validators | - |
| `f1r3fly_total_stake` | Gauge | Total amount staked in the network | - |
| `f1r3fly_api_errors_total` | Counter | Total API errors encountered | `node` |

## Installation

### Using Docker (Recommended)

The metrics exporter runs as a Docker container in the same network as the blockchain nodes:

```bash
# Build the Docker image
docker build -f Dockerfile.metrics -t f1r3fly-metrics-exporter .

# Run the container
docker run -d \
  --name metrics-exporter \
  --network docker_f1r3fly \
  -p 9091:9091 \
  f1r3fly-metrics-exporter
```

### Manual Installation

```bash
# Install dependencies
pip3 install prometheus_client requests

# Run the exporter
python3 blockchain_metrics_exporter.py
```

## Configuration

The exporter is configured to monitor the following nodes:

```python
NODES = {
    'bootstrap': {'host': 'rnode.bootstrap', 'port': 40403},
    'validator1': {'host': 'rnode.validator1', 'port': 40403},
    'validator2': {'host': 'rnode.validator2', 'port': 40403},
    'validator3': {'host': 'rnode.validator3', 'port': 40403},
    'validator4': {'host': 'rnode.validator4', 'port': 40403},
    'observer': {'host': 'rnode.readonly', 'port': 40403}
}
```

## Prometheus Integration

Add the following job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'f1r3fly-blockchain-metrics'
    static_configs:
      - targets: ['metrics-exporter:9091']
        labels:
          service: 'blockchain-exporter'
          type: 'custom-metrics'
```

**Important**: Ensure Prometheus is connected to the same Docker network as the metrics exporter:

```bash
docker network connect docker_f1r3fly prometheus
```

## Verification

### Check Metrics Endpoint

```bash
# From the host
curl http://localhost:9091/metrics | grep f1r3fly_

# Example output:
# f1r3fly_block_height{node="bootstrap"} 325.0
# f1r3fly_peer_count{node="bootstrap"} 5.0
# f1r3fly_validator_count 3.0
```

### Query in Prometheus

```bash
# Check if metrics are being collected
curl http://localhost:9090/api/v1/query?query=f1r3fly_block_height

# Check target health
curl http://localhost:9090/api/v1/targets | grep blockchain
```

### View in Grafana

1. Access Grafana at http://54.254.197.253:3000
2. Create a new dashboard
3. Add queries for F1R3FLY metrics:
   - `f1r3fly_block_height{node="$node"}`
   - `f1r3fly_peer_count{node="$node"}`
   - `rate(f1r3fly_api_errors_total[5m])`

## Monitoring

### Check Container Status

```bash
docker ps | grep metrics-exporter
docker logs metrics-exporter
```

### Systemd Service (Alternative)

For production deployments, you can run the exporter as a systemd service:

```ini
[Unit]
Description=F1R3FLY Blockchain Metrics Exporter
After=network.target docker.service

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/python3 /home/ubuntu/scripts/blockchain_metrics_exporter.py
Restart=always
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Container Can't Resolve Node Names

Ensure the metrics exporter is in the same Docker network as the blockchain nodes:

```bash
docker network ls
docker inspect metrics-exporter | grep NetworkMode
```

### Prometheus Can't Scrape Metrics

1. Check network connectivity:
```bash
docker exec prometheus wget -qO- http://metrics-exporter:9091/metrics
```

2. Ensure both containers are in the same network:
```bash
docker network connect docker_f1r3fly prometheus
```

### No Metrics Appearing

Check the exporter logs for errors:
```bash
docker logs --tail 50 metrics-exporter
```

## Example Grafana Dashboard Queries

### Block Height Chart
```promql
f1r3fly_block_height{node=~"validator.*"}
```

### Network Peers
```promql
sum(f1r3fly_peer_count)
```

### API Error Rate
```promql
rate(f1r3fly_api_errors_total[5m])
```

### Validator Status
```promql
f1r3fly_validator_count
```

## Files

- `/home/ubuntu/scripts/blockchain_metrics_exporter.py` - Main exporter script
- `/home/ubuntu/f1r3fly/docker/Dockerfile.metrics` - Docker build file
- `/home/ubuntu/f1r3fly/docker/prometheus.yml` - Prometheus configuration

## Network Access

- **Internal Port**: 9091 (metrics endpoint)
- **External Access**: http://54.254.197.253:9091/metrics
- **Prometheus Scrape**: Every 15 seconds
- **Update Frequency**: Every 30 seconds

## Current Status

✅ **Operational** - Successfully collecting metrics from all 6 nodes
- Bootstrap: ✅ 
- Validator1: ✅
- Validator2: ✅
- Validator3: ✅
- Validator4: ✅
- Observer: ✅

Last verified: August 12, 2025

---

*Last Updated: 2025*  
*Part of the [Artificial Superintelligence Alliance](https://superintelligence.io)*

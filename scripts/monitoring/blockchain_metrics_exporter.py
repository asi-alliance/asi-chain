#\!/usr/bin/env python3
"""
F1R3FLY Blockchain Metrics Exporter for Prometheus
Exposes blockchain metrics on port 9091
"""

import json
import time
import requests
from prometheus_client import start_http_server, Gauge, Counter
from datetime import datetime

# Define Prometheus metrics
block_height = Gauge('f1r3fly_block_height', 'Current block height', ['node'])
peer_count = Gauge('f1r3fly_peer_count', 'Number of connected peers', ['node'])
node_count = Gauge('f1r3fly_node_count', 'Number of known nodes', ['node'])
validator_count = Gauge('f1r3fly_validator_count', 'Number of bonded validators')
total_stake = Gauge('f1r3fly_total_stake', 'Total staked amount')
api_errors = Counter('f1r3fly_api_errors_total', 'Total API errors', ['node'])

# Node configurations
NODES = {
    'bootstrap': {'host': 'localhost', 'port': 40403},
    'validator1': {'host': 'localhost', 'port': 40413},
    'validator2': {'host': 'localhost', 'port': 40423},
    'validator3': {'host': 'localhost', 'port': 40433},
    'validator4': {'host': 'localhost', 'port': 40443},
    'observer': {'host': 'localhost', 'port': 40453}
}

def get_node_status(node_name, config):
    """Get status from a node"""
    try:
        url = f"http://{config['host']}:{config['port']}/status"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            peer_count.labels(node=node_name).set(data.get('peers', 0))
            node_count.labels(node=node_name).set(data.get('nodes', 0))
            return True
    except Exception as e:
        api_errors.labels(node=node_name).inc()
        print(f"Error getting status from {node_name}: {e}")
        return False

def get_blocks(node_name, config):
    """Get latest block height"""
    try:
        url = f"http://{config['host']}:{config['port']}/api/blocks/1"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                height = data[0].get('blockNumber', 0)
                block_height.labels(node=node_name).set(height)
            return True
    except Exception as e:
        print(f"Error getting blocks from {node_name}: {e}")
        return False

def update_metrics():
    """Update all metrics"""
    for node_name, config in NODES.items():
        get_node_status(node_name, config)
        get_blocks(node_name, config)
    
    # Set some static values for now
    validator_count.set(3)  # Known validators
    total_stake.set(3000)    # Known total stake

def main():
    """Main loop"""
    # Start Prometheus metrics server
    start_http_server(9091, addr="0.0.0.0")
    print("Blockchain metrics exporter started on port 9091")
    
    # Update metrics every 30 seconds
    while True:
        update_metrics()
        time.sleep(30)

if __name__ == '__main__':
    main()

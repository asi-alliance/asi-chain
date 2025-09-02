# ASI Chain Production Monitoring & Alerting Guide

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2025-08-14  
**Target Launch:** August 31st Testnet

## Executive Summary

This comprehensive guide establishes a production-grade monitoring and alerting infrastructure for ASI Chain, designed to ensure 99.9% uptime and optimal performance for the August 31st testnet launch. The monitoring stack provides complete observability across infrastructure, applications, and blockchain-specific metrics.

## Architecture Overview

### 🏗️ Monitoring Stack Architecture

```
┌─── Data Collection Layer ───┐
│                             │
├─── Prometheus (Metrics)     │
│    ├─── Node Exporter       │
│    ├─── cAdvisor            │
│    ├─── Kube State Metrics  │
│    ├─── Custom App Metrics  │
│    └─── Blockchain Metrics  │
│                             │
├─── Grafana (Visualization)  │
│    ├─── Infrastructure      │
│    ├─── Application         │
│    ├─── Blockchain          │
│    └─── Business KPIs       │
│                             │
├─── AlertManager (Alerting)  │
│    ├─── Severity Levels     │
│    ├─── Routing Rules       │
│    ├─── Notification        │
│    └─── Escalation          │
│                             │
├─── Jaeger (Tracing)         │
├─── ELK Stack (Logging)      │
└─── Uptime Monitoring        │
```

### 🎯 Service Level Indicators (SLIs)
- **Availability:** 99.9% uptime (8.77 hours downtime/year)
- **Latency:** 95th percentile API response <500ms
- **Throughput:** >1000 concurrent users
- **Error Rate:** <0.1% for critical operations
- **Data Freshness:** Block indexing lag <30 seconds

### 📊 Service Level Objectives (SLOs)
- **API Response Time:** P95 <500ms, P99 <1000ms
- **Database Query Time:** P95 <100ms
- **Cache Hit Ratio:** >90%
- **Error Rate:** <0.1% for 4xx, <0.01% for 5xx
- **Blockchain Sync:** <1 block behind network tip

## Prometheus Configuration

### 🔧 Core Prometheus Setup

#### Prometheus Server Configuration
```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: asi-chain
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'asi-chain-production'
        environment: 'production'
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093
    
    scrape_configs:
      # Kubernetes API Server
      - job_name: 'kubernetes-apiservers'
        kubernetes_sd_configs:
        - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
          action: keep
          regex: default;kubernetes;https
      
      # Kubernetes Nodes
      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
        - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/${1}/proxy/metrics
      
      # Node Exporter
      - job_name: 'node-exporter'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_endpoints_name]
          action: keep
          regex: node-exporter
        - source_labels: [__meta_kubernetes_endpoint_address_target_name]
          target_label: instance
      
      # cAdvisor
      - job_name: 'kubernetes-cadvisor'
        kubernetes_sd_configs:
        - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - action: labelmap
          regex: __meta_kubernetes_node_label_(.+)
        - target_label: __address__
          replacement: kubernetes.default.svc:443
        - source_labels: [__meta_kubernetes_node_name]
          regex: (.+)
          target_label: __metrics_path__
          replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
      
      # Kube State Metrics
      - job_name: 'kube-state-metrics'
        static_configs:
        - targets: ['kube-state-metrics:8080']
      
      # ASI Chain Application Metrics
      - job_name: 'asi-wallet'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          action: keep
          regex: asi-wallet
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          action: keep
          regex: metrics
      
      - job_name: 'asi-explorer'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          action: keep
          regex: asi-explorer
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          action: keep
          regex: metrics
      
      - job_name: 'asi-indexer'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          action: keep
          regex: asi-indexer
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          action: keep
          regex: metrics
      
      - job_name: 'asi-hasura'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_name]
          action: keep
          regex: asi-hasura
        - source_labels: [__meta_kubernetes_endpoint_port_name]
          action: keep
          regex: metrics
      
      # Redis Metrics
      - job_name: 'redis'
        static_configs:
        - targets: ['redis-exporter:9121']
      
      # PostgreSQL Metrics
      - job_name: 'postgres'
        static_configs:
        - targets: ['postgres-exporter:9187']
      
      # NGINX Ingress Metrics
      - job_name: 'nginx-ingress'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
          action: keep
          regex: ingress-nginx
        - source_labels: [__meta_kubernetes_pod_container_port_number]
          action: keep
          regex: "10254"
      
      # Blockchain Node Metrics
      - job_name: 'rchain-node'
        static_configs:
        - targets: ['rnode-validator:40403']
        metrics_path: /metrics
        scrape_interval: 30s
      
      # Custom Business Metrics
      - job_name: 'asi-business-metrics'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
```

#### Prometheus Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: asi-chain
  labels:
    app: prometheus
    component: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
        component: monitoring
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        ports:
        - containerPort: 9090
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus/'
        - '--web.console.libraries=/etc/prometheus/console_libraries'
        - '--web.console.templates=/etc/prometheus/consoles'
        - '--storage.tsdb.retention.time=30d'
        - '--storage.tsdb.retention.size=50GB'
        - '--web.enable-lifecycle'
        - '--web.enable-admin-api'
        - '--log.level=info'
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-rules
          mountPath: /etc/prometheus/rules
        - name: prometheus-storage
          mountPath: /prometheus
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 5
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-rules
        configMap:
          name: prometheus-rules
      - name: prometheus-storage
        persistentVolumeClaim:
          claimName: prometheus-storage
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: prometheus
            topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: asi-chain
  labels:
    app: prometheus
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-storage
  namespace: asi-chain
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: gp3
EOF
```

### 📋 Prometheus Alert Rules

#### Infrastructure Alert Rules
```yaml
# prometheus-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: asi-chain
data:
  infrastructure.yml: |
    groups:
    - name: infrastructure.rules
      rules:
      # Node Health
      - alert: NodeDown
        expr: up{job="node-exporter"} == 0
        for: 5m
        labels:
          severity: critical
          category: infrastructure
        annotations:
          summary: "Node {{ $labels.instance }} is down"
          description: "Node {{ $labels.instance }} has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/node-down"
      
      - alert: NodeHighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
          category: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
          runbook_url: "https://docs.asichain.io/runbooks/high-cpu"
      
      - alert: NodeHighMemory
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 10m
        labels:
          severity: warning
          category: infrastructure
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"
          runbook_url: "https://docs.asichain.io/runbooks/high-memory"
      
      - alert: NodeDiskSpaceLow
        expr: (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
          category: infrastructure
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk space is {{ $value }}% full on {{ $labels.instance }} ({{ $labels.mountpoint }})"
          runbook_url: "https://docs.asichain.io/runbooks/low-disk-space"
      
      # Kubernetes Cluster Health
      - alert: KubernetesNodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 10m
        labels:
          severity: critical
          category: kubernetes
        annotations:
          summary: "Kubernetes node {{ $labels.node }} is not ready"
          description: "Node {{ $labels.node }} has been not ready for more than 10 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/node-not-ready"
      
      - alert: KubernetesPodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: warning
          category: kubernetes
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"
          runbook_url: "https://docs.asichain.io/runbooks/pod-crash-loop"
      
      - alert: KubernetesPodNotRunning
        expr: kube_pod_status_phase{phase!="Running",phase!="Succeeded"} == 1
        for: 15m
        labels:
          severity: warning
          category: kubernetes
        annotations:
          summary: "Pod {{ $labels.pod }} is not running"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has been in {{ $labels.phase }} state for more than 15 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/pod-not-running"
  
  application.yml: |
    groups:
    - name: application.rules
      rules:
      # ASI Chain Application Health
      - alert: ASIWalletDown
        expr: up{job="asi-wallet"} == 0
        for: 5m
        labels:
          severity: critical
          category: application
          service: wallet
        annotations:
          summary: "ASI Wallet service is down"
          description: "ASI Wallet has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/wallet-down"
      
      - alert: ASIExplorerDown
        expr: up{job="asi-explorer"} == 0
        for: 5m
        labels:
          severity: critical
          category: application
          service: explorer
        annotations:
          summary: "ASI Explorer service is down"
          description: "ASI Explorer has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/explorer-down"
      
      - alert: ASIIndexerDown
        expr: up{job="asi-indexer"} == 0
        for: 5m
        labels:
          severity: critical
          category: application
          service: indexer
        annotations:
          summary: "ASI Indexer service is down"
          description: "ASI Indexer has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/indexer-down"
      
      - alert: ASIHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 10m
        labels:
          severity: warning
          category: application
        annotations:
          summary: "High error rate for {{ $labels.service }}"
          description: "Error rate is {{ $value }}% for {{ $labels.service }}"
          runbook_url: "https://docs.asichain.io/runbooks/high-error-rate"
      
      - alert: ASIHighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 15m
        labels:
          severity: warning
          category: application
        annotations:
          summary: "High latency for {{ $labels.service }}"
          description: "95th percentile latency is {{ $value }}s for {{ $labels.service }}"
          runbook_url: "https://docs.asichain.io/runbooks/high-latency"
      
      # Database and Cache Health
      - alert: PostgreSQLDown
        expr: up{job="postgres"} == 0
        for: 5m
        labels:
          severity: critical
          category: database
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL database has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/postgres-down"
      
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 5m
        labels:
          severity: critical
          category: cache
        annotations:
          summary: "Redis is down"
          description: "Redis cache has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/redis-down"
      
      - alert: DatabaseHighConnections
        expr: pg_stat_database_numbackends / pg_settings_max_connections * 100 > 80
        for: 10m
        labels:
          severity: warning
          category: database
        annotations:
          summary: "High database connections"
          description: "Database connections are at {{ $value }}% of maximum"
          runbook_url: "https://docs.asichain.io/runbooks/high-db-connections"
      
      - alert: CacheLowHitRatio
        expr: redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100 < 70
        for: 15m
        labels:
          severity: warning
          category: cache
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio is {{ $value }}%"
          runbook_url: "https://docs.asichain.io/runbooks/low-cache-hit-ratio"
  
  blockchain.yml: |
    groups:
    - name: blockchain.rules
      rules:
      # Blockchain Node Health
      - alert: RChainNodeDown
        expr: up{job="rchain-node"} == 0
        for: 5m
        labels:
          severity: critical
          category: blockchain
        annotations:
          summary: "RChain node is down"
          description: "RChain blockchain node has been down for more than 5 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/rchain-node-down"
      
      - alert: BlockIndexingLag
        expr: (time() - asi_indexer_last_block_timestamp) > 300
        for: 10m
        labels:
          severity: warning
          category: blockchain
        annotations:
          summary: "Block indexing is lagging"
          description: "Block indexing is {{ $value }} seconds behind"
          runbook_url: "https://docs.asichain.io/runbooks/block-indexing-lag"
      
      - alert: BlockProductionStopped
        expr: increase(rchain_blocks_total[10m]) == 0
        for: 10m
        labels:
          severity: critical
          category: blockchain
        annotations:
          summary: "Block production has stopped"
          description: "No new blocks have been produced in the last 10 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/block-production-stopped"
      
      - alert: HighBlockTime
        expr: avg_over_time(rchain_block_time_seconds[30m]) > 60
        for: 15m
        labels:
          severity: warning
          category: blockchain
        annotations:
          summary: "High block time detected"
          description: "Average block time is {{ $value }} seconds over the last 30 minutes"
          runbook_url: "https://docs.asichain.io/runbooks/high-block-time"
      
      # Network Health
      - alert: ValidatorNodeDown
        expr: sum(up{job="rchain-node",role="validator"}) < 3
        for: 5m
        labels:
          severity: critical
          category: blockchain
        annotations:
          summary: "Insufficient validator nodes"
          description: "Only {{ $value }} validator nodes are running"
          runbook_url: "https://docs.asichain.io/runbooks/insufficient-validators"
      
      - alert: PeerCountLow
        expr: rchain_peers_total < 2
        for: 10m
        labels:
          severity: warning
          category: blockchain
        annotations:
          summary: "Low peer count"
          description: "Node has only {{ $value }} peers connected"
          runbook_url: "https://docs.asichain.io/runbooks/low-peer-count"
```

## Grafana Dashboard Configuration

### 🎨 Infrastructure Dashboard

#### Grafana Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: asi-chain
  labels:
    app: grafana
    component: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
        component: monitoring
    spec:
      serviceAccountName: grafana
      containers:
      - name: grafana
        image: grafana/grafana:10.0.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secrets
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel,grafana-clock-panel"
        - name: GF_SERVER_ROOT_URL
          value: "https://monitoring.asichain.io"
        - name: GF_DATABASE_TYPE
          value: "postgres"
        - name: GF_DATABASE_HOST
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DB_HOST
        - name: GF_DATABASE_NAME
          value: "grafana"
        - name: GF_DATABASE_USER
          value: "grafana"
        - name: GF_DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secrets
              key: db-password
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-config
          mountPath: /etc/grafana
        - name: grafana-dashboards
          mountPath: /var/lib/grafana/dashboards
        - name: grafana-datasources
          mountPath: /etc/grafana/provisioning/datasources
        - name: grafana-dashboard-providers
          mountPath: /etc/grafana/provisioning/dashboards
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          runAsUser: 472
          allowPrivilegeEscalation: false
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-storage
      - name: grafana-config
        configMap:
          name: grafana-config
      - name: grafana-dashboards
        configMap:
          name: grafana-dashboards
      - name: grafana-datasources
        configMap:
          name: grafana-datasources
      - name: grafana-dashboard-providers
        configMap:
          name: grafana-dashboard-providers
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: grafana
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: asi-chain
  labels:
    app: grafana
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-storage
  namespace: asi-chain
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp3
EOF
```

#### Grafana Data Sources Configuration
```yaml
# grafana-datasources.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: asi-chain
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      editable: true
      jsonData:
        timeInterval: "15s"
        queryTimeout: "60s"
        httpMethod: "POST"
        
    - name: Jaeger
      type: jaeger
      access: proxy
      url: http://jaeger:16686
      editable: true
      
    - name: Loki
      type: loki
      access: proxy
      url: http://loki:3100
      editable: true
      jsonData:
        maxLines: 1000
        
    - name: PostgreSQL
      type: postgres
      access: proxy
      host: ${GF_DATABASE_HOST}:5432
      database: asichain
      user: readonly_user
      secureJsonData:
        password: ${POSTGRES_READONLY_PASSWORD}
      jsonData:
        sslmode: require
        postgresVersion: 1500
        timescaledb: false
```

#### Infrastructure Dashboard JSON
```json
{
  "dashboard": {
    "id": null,
    "title": "ASI Chain Infrastructure Overview",
    "tags": ["asi-chain", "infrastructure"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Cluster Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "count(up{job=\"kubernetes-nodes\"} == 1)",
            "legendFormat": "Active Nodes"
          },
          {
            "expr": "count(kube_pod_status_phase{phase=\"Running\",namespace=\"asi-chain\"})",
            "legendFormat": "Running Pods"
          },
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"asi-chain\"}[5m]))",
            "legendFormat": "CPU Usage"
          },
          {
            "expr": "sum(container_memory_usage_bytes{namespace=\"asi-chain\"}) / 1024 / 1024 / 1024",
            "legendFormat": "Memory Usage (GB)"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list",
              "orientation": "horizontal"
            },
            "mappings": [],
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Node CPU Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": 0,
              "drawStyle": "line",
              "fillOpacity": 10,
              "gradientMode": "none",
              "hideFrom": {
                "legend": false,
                "tooltip": false,
                "vis": false
              },
              "lineInterpolation": "linear",
              "lineWidth": 1,
              "pointSize": 5,
              "scaleDistribution": {
                "type": "linear"
              },
              "showPoints": "never",
              "spanNulls": false,
              "stacking": {
                "group": "A",
                "mode": "none"
              },
              "thresholdsStyle": {
                "mode": "off"
              }
            },
            "mappings": [],
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            },
            "unit": "percent"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 3,
        "title": "Node Memory Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "{{instance}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "percent"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {},
    "timezone": "",
    "title": "ASI Chain Infrastructure",
    "uid": "asi-infrastructure",
    "version": 1
  }
}
```

### 📊 Application Performance Dashboard

#### Application Metrics Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "ASI Chain Application Performance",
    "tags": ["asi-chain", "application", "performance"],
    "panels": [
      {
        "id": 1,
        "title": "Service Availability",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(up{job=~\"asi-.*\"})",
            "legendFormat": "Overall Availability"
          },
          {
            "expr": "up{job=\"asi-wallet\"}",
            "legendFormat": "Wallet"
          },
          {
            "expr": "up{job=\"asi-explorer\"}",
            "legendFormat": "Explorer"
          },
          {
            "expr": "up{job=\"asi-indexer\"}",
            "legendFormat": "Indexer"
          },
          {
            "expr": "up{job=\"asi-hasura\"}",
            "legendFormat": "Hasura"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "DOWN"
                  },
                  "1": {
                    "text": "UP"
                  }
                },
                "type": "value"
              }
            ],
            "thresholds": {
              "steps": [
                {
                  "color": "red",
                  "value": null
                },
                {
                  "color": "green",
                  "value": 1
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 3,
        "title": "Response Time (95th percentile)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 0.5
                },
                {
                  "color": "red",
                  "value": 1
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100",
            "legendFormat": "{{service}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 1
                },
                {
                  "color": "red",
                  "value": 5
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 16
        }
      },
      {
        "id": 5,
        "title": "Database Performance",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(pg_stat_database_tup_returned[5m])",
            "legendFormat": "Rows Returned/sec"
          },
          {
            "expr": "rate(pg_stat_database_tup_fetched[5m])",
            "legendFormat": "Rows Fetched/sec"
          },
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active Connections"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 16
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s",
    "uid": "asi-application",
    "version": 1
  }
}
```

### 🔗 Blockchain Metrics Dashboard

#### Blockchain Performance Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "ASI Chain Blockchain Metrics",
    "tags": ["asi-chain", "blockchain", "rchain"],
    "panels": [
      {
        "id": 1,
        "title": "Blockchain Health Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "rchain_block_height",
            "legendFormat": "Current Block"
          },
          {
            "expr": "sum(up{job=\"rchain-node\"})",
            "legendFormat": "Active Nodes"
          },
          {
            "expr": "rate(rchain_blocks_total[1h])",
            "legendFormat": "Blocks/Hour"
          },
          {
            "expr": "rchain_peers_total",
            "legendFormat": "Peer Count"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Block Production Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rchain_blocks_total[5m]) * 60",
            "legendFormat": "Blocks per minute"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "custom": {
              "drawStyle": "line",
              "lineInterpolation": "linear",
              "fillOpacity": 10
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 8
        }
      },
      {
        "id": 3,
        "title": "Block Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rchain_block_time_seconds",
            "legendFormat": "Block Time"
          },
          {
            "expr": "avg_over_time(rchain_block_time_seconds[30m])",
            "legendFormat": "30min Average"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 45
                },
                {
                  "color": "red",
                  "value": 60
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 8
        }
      },
      {
        "id": 4,
        "title": "Transaction Volume",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rchain_transactions_total[5m]) * 60",
            "legendFormat": "Transactions per minute"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 16
        }
      },
      {
        "id": 5,
        "title": "Indexer Performance",
        "type": "timeseries",
        "targets": [
          {
            "expr": "asi_indexer_blocks_processed_total",
            "legendFormat": "Blocks Processed"
          },
          {
            "expr": "asi_indexer_current_block - rchain_block_height",
            "legendFormat": "Indexing Lag"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 16
        }
      }
    ],
    "time": {
      "from": "now-4h",
      "to": "now"
    },
    "refresh": "30s",
    "uid": "asi-blockchain",
    "version": 1
  }
}
```

## AlertManager Configuration

### 🚨 AlertManager Setup

#### AlertManager Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: asi-chain
  labels:
    app: alertmanager
    component: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
        component: monitoring
    spec:
      serviceAccountName: alertmanager
      containers:
      - name: alertmanager
        image: prom/alertmanager:v0.25.0
        ports:
        - containerPort: 9093
        args:
        - '--config.file=/etc/alertmanager/config.yml'
        - '--storage.path=/alertmanager'
        - '--web.external-url=https://alerts.asichain.io'
        - '--cluster.listen-address=0.0.0.0:9094'
        - '--cluster.peer=alertmanager-0.alertmanager.asi-chain.svc.cluster.local:9094'
        - '--cluster.peer=alertmanager-1.alertmanager.asi-chain.svc.cluster.local:9094'
        volumeMounts:
        - name: alertmanager-config
          mountPath: /etc/alertmanager
        - name: alertmanager-storage
          mountPath: /alertmanager
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9093
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 9093
          initialDelaySeconds: 30
          periodSeconds: 5
      volumes:
      - name: alertmanager-config
        configMap:
          name: alertmanager-config
      - name: alertmanager-storage
        persistentVolumeClaim:
          claimName: alertmanager-storage
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: alertmanager
            topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: alertmanager
  namespace: asi-chain
  labels:
    app: alertmanager
spec:
  selector:
    app: alertmanager
  ports:
  - name: web
    port: 9093
    targetPort: 9093
  - name: cluster
    port: 9094
    targetPort: 9094
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: alertmanager-storage
  namespace: asi-chain
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: gp3
EOF
```

#### AlertManager Configuration
```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: asi-chain
data:
  config.yml: |
    global:
      smtp_smarthost: 'smtp.sendgrid.net:587'
      smtp_from: 'alerts@asichain.io'
      smtp_auth_username: 'apikey'
      smtp_auth_password: '${SENDGRID_API_KEY}'
      slack_api_url: '${SLACK_WEBHOOK_URL}'
      
    templates:
    - '/etc/alertmanager/templates/*.tmpl'
    
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'default'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
        group_wait: 10s
        group_interval: 1m
        repeat_interval: 1h
      - match:
          severity: warning
        receiver: 'warning-alerts'
        group_wait: 30s
        group_interval: 5m
        repeat_interval: 4h
      - match:
          category: blockchain
        receiver: 'blockchain-alerts'
        group_wait: 15s
        group_interval: 2m
        repeat_interval: 2h
    
    inhibit_rules:
    - source_match:
        severity: 'critical'
      target_match:
        severity: 'warning'
      equal: ['alertname', 'cluster', 'service']
    
    receivers:
    - name: 'default'
      email_configs:
      - to: 'team@asichain.io'
        subject: '[ASI Chain] Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Service: {{ .Labels.service }}
          {{ end }}
    
    - name: 'critical-alerts'
      email_configs:
      - to: 'oncall@asichain.io'
        subject: '[CRITICAL] ASI Chain Alert: {{ .GroupLabels.alertname }}'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Service: {{ .Labels.service }}
          Runbook: {{ .Annotations.runbook_url }}
          
          Labels:
          {{ range .Labels.SortedPairs }}  {{ .Name }}: {{ .Value }}
          {{ end }}
          {{ end }}
      slack_configs:
      - channel: '#asi-chain-alerts'
        title: '🚨 Critical Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          *Service:* {{ .Labels.service }}
          *Runbook:* {{ .Annotations.runbook_url }}
          {{ end }}
        send_resolved: true
    
    - name: 'warning-alerts'
      email_configs:
      - to: 'team@asichain.io'
        subject: '[WARNING] ASI Chain Alert: {{ .GroupLabels.alertname }}'
        body: |
          ⚠️ WARNING ALERT ⚠️
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Service: {{ .Labels.service }}
          Runbook: {{ .Annotations.runbook_url }}
          {{ end }}
      slack_configs:
      - channel: '#asi-chain-monitoring'
        title: '⚠️ Warning: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Service:* {{ .Labels.service }}
          {{ end }}
    
    - name: 'blockchain-alerts'
      email_configs:
      - to: 'blockchain-team@asichain.io'
        subject: '[BLOCKCHAIN] ASI Chain Alert: {{ .GroupLabels.alertname }}'
        body: |
          🔗 BLOCKCHAIN ALERT 🔗
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Runbook: {{ .Annotations.runbook_url }}
          {{ end }}
      slack_configs:
      - channel: '#asi-chain-blockchain'
        title: '🔗 Blockchain Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Runbook:* {{ .Annotations.runbook_url }}
          {{ end }}
```

## Custom Metrics and Exporters

### 📈 Application-Specific Metrics

#### ASI Indexer Custom Metrics
```python
# Custom metrics for ASI Indexer
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Business Metrics
blocks_processed_total = Counter('asi_indexer_blocks_processed_total', 
                                'Total number of blocks processed by the indexer')

block_processing_duration = Histogram('asi_indexer_block_processing_seconds',
                                    'Time spent processing each block',
                                    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0])

current_block_height = Gauge('asi_indexer_current_block',
                            'Current block height being processed')

indexing_lag = Gauge('asi_indexer_lag_seconds',
                    'Number of seconds behind the network tip')

database_operations_total = Counter('asi_indexer_database_operations_total',
                                  'Total database operations',
                                  ['operation', 'status'])

cache_operations_total = Counter('asi_indexer_cache_operations_total',
                                'Total cache operations',
                                ['operation', 'result'])

# Network Metrics
rchain_api_requests_total = Counter('asi_indexer_rchain_api_requests_total',
                                  'Total RChain API requests',
                                  ['endpoint', 'status'])

rchain_api_duration = Histogram('asi_indexer_rchain_api_duration_seconds',
                               'RChain API request duration',
                               ['endpoint'])

# Error Metrics
processing_errors_total = Counter('asi_indexer_processing_errors_total',
                                 'Total processing errors',
                                 ['error_type'])

def track_block_processing():
    """Example function showing metric collection"""
    with block_processing_duration.time():
        # Process block
        blocks_processed_total.inc()
        current_block_height.set(get_current_block_height())
        
        # Calculate lag
        network_tip = get_network_tip()
        current_height = get_current_block_height()
        indexing_lag.set(network_tip - current_height)

def track_database_operation(operation, success):
    """Track database operations"""
    status = 'success' if success else 'error'
    database_operations_total.labels(operation=operation, status=status).inc()

def track_cache_operation(operation, hit):
    """Track cache operations"""
    result = 'hit' if hit else 'miss'
    cache_operations_total.labels(operation=operation, result=result).inc()

# Start metrics server
start_http_server(9090)
```

#### Business Logic Metrics
```python
# Business-specific metrics for ASI Chain
from prometheus_client import Counter, Histogram, Gauge

# Wallet Metrics
wallet_transactions_total = Counter('asi_wallet_transactions_total',
                                  'Total wallet transactions',
                                  ['transaction_type', 'status'])

wallet_balance_checks_total = Counter('asi_wallet_balance_checks_total',
                                    'Total balance check requests')

wallet_connection_duration = Histogram('asi_wallet_connection_duration_seconds',
                                     'Time for wallet connections to establish')

active_wallet_sessions = Gauge('asi_wallet_active_sessions',
                              'Number of active wallet sessions')

# Explorer Metrics
explorer_page_views_total = Counter('asi_explorer_page_views_total',
                                  'Total page views',
                                  ['page_type'])

block_detail_requests_total = Counter('asi_explorer_block_detail_requests_total',
                                     'Block detail page requests')

search_requests_total = Counter('asi_explorer_search_requests_total',
                               'Search requests',
                               ['search_type'])

# API Metrics
graphql_queries_total = Counter('asi_hasura_graphql_queries_total',
                               'Total GraphQL queries',
                               ['query_name', 'status'])

graphql_query_duration = Histogram('asi_hasura_graphql_query_duration_seconds',
                                  'GraphQL query execution time',
                                  ['query_name'])

graphql_subscription_count = Gauge('asi_hasura_active_subscriptions',
                                  'Number of active GraphQL subscriptions')

# Blockchain-specific Metrics
rev_transfers_processed = Counter('asi_indexer_rev_transfers_processed_total',
                                'Total REV transfers processed')

contract_deployments_processed = Counter('asi_indexer_contract_deployments_total',
                                        'Total contract deployments processed')

validator_performance = Gauge('asi_chain_validator_performance_score',
                             'Validator performance score',
                             ['validator_id'])
```

### 🔍 Custom Monitoring Exporters

#### RChain Node Exporter
```python
#!/usr/bin/env python3
"""
Custom RChain Node Exporter for Prometheus
Exports blockchain-specific metrics from RChain nodes
"""

import requests
import time
import json
from prometheus_client import start_http_server, Gauge, Counter, Histogram
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Prometheus metrics
node_block_height = Gauge('rchain_node_block_height', 'Current block height', ['node'])
node_peer_count = Gauge('rchain_node_peer_count', 'Number of connected peers', ['node'])
node_uptime = Gauge('rchain_node_uptime_seconds', 'Node uptime in seconds', ['node'])
node_memory_usage = Gauge('rchain_node_memory_usage_bytes', 'Node memory usage', ['node'])
node_cpu_usage = Gauge('rchain_node_cpu_usage_percent', 'Node CPU usage percentage', ['node'])

blocks_total = Counter('rchain_blocks_total', 'Total blocks produced', ['node'])
transactions_total = Counter('rchain_transactions_total', 'Total transactions processed', ['node'])
deploys_total = Counter('rchain_deploys_total', 'Total deploys processed', ['node'])

block_processing_time = Histogram('rchain_block_processing_seconds', 
                                'Time to process a block', ['node'])
deploy_processing_time = Histogram('rchain_deploy_processing_seconds',
                                 'Time to process a deploy', ['node'])

class RChainExporter:
    def __init__(self, node_urls, port=9100):
        self.node_urls = node_urls
        self.port = port
        
    def collect_metrics(self):
        """Collect metrics from all RChain nodes"""
        for node_url in self.node_urls:
            try:
                self.collect_node_metrics(node_url)
            except Exception as e:
                logger.error(f"Failed to collect metrics from {node_url}: {e}")
    
    def collect_node_metrics(self, node_url):
        """Collect metrics from a single RChain node"""
        node_name = node_url.split('://')[1].split(':')[0]
        
        # Get node status
        status_response = requests.get(f"{node_url}/api/status", timeout=10)
        status_data = status_response.json()
        
        # Update basic metrics
        node_block_height.labels(node=node_name).set(status_data.get('blockNumber', 0))
        node_peer_count.labels(node=node_name).set(status_data.get('peers', 0))
        node_uptime.labels(node=node_name).set(status_data.get('uptime', 0))
        
        # Get performance metrics
        perf_response = requests.get(f"{node_url}/api/metrics", timeout=10)
        perf_data = perf_response.json()
        
        node_memory_usage.labels(node=node_name).set(perf_data.get('memoryUsage', 0))
        node_cpu_usage.labels(node=node_name).set(perf_data.get('cpuUsage', 0))
        
        # Get blockchain metrics
        blockchain_response = requests.get(f"{node_url}/api/blocks", timeout=10)
        blockchain_data = blockchain_response.json()
        
        blocks_total.labels(node=node_name)._value._value = blockchain_data.get('totalBlocks', 0)
        transactions_total.labels(node=node_name)._value._value = blockchain_data.get('totalTransactions', 0)
        deploys_total.labels(node=node_name)._value._value = blockchain_data.get('totalDeploys', 0)
        
        logger.info(f"Collected metrics from {node_name}")
    
    def run(self):
        """Run the exporter"""
        start_http_server(self.port)
        logger.info(f"RChain exporter started on port {self.port}")
        
        while True:
            try:
                self.collect_metrics()
                time.sleep(30)  # Collect metrics every 30 seconds
            except KeyboardInterrupt:
                logger.info("Exporter stopped")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(60)  # Wait longer on error

if __name__ == "__main__":
    # Configuration
    node_urls = [
        "http://rnode-validator-1:40403",
        "http://rnode-validator-2:40403",
        "http://rnode-validator-3:40403",
        "http://rnode-observer:40403"
    ]
    
    exporter = RChainExporter(node_urls)
    exporter.run()
```

## Log Aggregation and Analysis

### 📋 ELK Stack Configuration

#### Elasticsearch Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: asi-chain
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: elasticsearch:8.8.0
        ports:
        - containerPort: 9200
        - containerPort: 9300
        env:
        - name: discovery.type
          value: zen
        - name: cluster.name
          value: asi-chain-logs
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        volumeMounts:
        - name: elasticsearch-data
          mountPath: /usr/share/elasticsearch/data
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: elasticsearch-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: gp3
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: asi-chain
spec:
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    targetPort: 9200
  type: ClusterIP
EOF
```

#### Logstash Configuration
```bash
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: logstash-config
  namespace: asi-chain
data:
  logstash.yml: |
    http.host: "0.0.0.0"
    path.config: /usr/share/logstash/pipeline
    xpack.monitoring.elasticsearch.hosts: ["http://elasticsearch:9200"]
    
  pipelines.yml: |
    - pipeline.id: main
      path.config: "/usr/share/logstash/pipeline/logstash.conf"
      
  logstash.conf: |
    input {
      beats {
        port => 5044
      }
    }
    
    filter {
      if [kubernetes][container][name] == "asi-wallet" {
        grok {
          match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
        }
        mutate {
          add_field => { "service" => "wallet" }
        }
      }
      
      if [kubernetes][container][name] == "asi-explorer" {
        grok {
          match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}" }
        }
        mutate {
          add_field => { "service" => "explorer" }
        }
      }
      
      if [kubernetes][container][name] == "asi-indexer" {
        json {
          source => "message"
        }
        mutate {
          add_field => { "service" => "indexer" }
        }
      }
      
      if [kubernetes][container][name] == "hasura" {
        json {
          source => "message"
        }
        mutate {
          add_field => { "service" => "hasura" }
        }
      }
      
      # Parse error logs for alerting
      if [level] == "ERROR" or [level] == "FATAL" {
        mutate {
          add_tag => [ "error" ]
        }
      }
      
      # Add timestamp
      date {
        match => [ "timestamp", "ISO8601" ]
      }
    }
    
    output {
      elasticsearch {
        hosts => ["http://elasticsearch:9200"]
        index => "asi-chain-logs-%{+YYYY.MM.dd}"
      }
      
      # Send errors to dead letter queue for alerting
      if "error" in [tags] {
        elasticsearch {
          hosts => ["http://elasticsearch:9200"]
          index => "asi-chain-errors-%{+YYYY.MM.dd}"
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logstash
  namespace: asi-chain
spec:
  replicas: 2
  selector:
    matchLabels:
      app: logstash
  template:
    metadata:
      labels:
        app: logstash
    spec:
      containers:
      - name: logstash
        image: logstash:8.8.0
        ports:
        - containerPort: 5044
        volumeMounts:
        - name: logstash-config
          mountPath: /usr/share/logstash/config
        - name: logstash-pipeline
          mountPath: /usr/share/logstash/pipeline
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: logstash-config
        configMap:
          name: logstash-config
          items:
          - key: logstash.yml
            path: logstash.yml
          - key: pipelines.yml
            path: pipelines.yml
      - name: logstash-pipeline
        configMap:
          name: logstash-config
          items:
          - key: logstash.conf
            path: logstash.conf
---
apiVersion: v1
kind: Service
metadata:
  name: logstash
  namespace: asi-chain
spec:
  selector:
    app: logstash
  ports:
  - port: 5044
    targetPort: 5044
  type: ClusterIP
EOF
```

## Uptime Monitoring

### 🌐 External Monitoring Setup

#### Uptime Robot Configuration
```bash
# Create uptime monitoring script
cat > /usr/local/bin/uptime-monitor.sh << 'EOF'
#!/bin/bash

# External uptime monitoring for ASI Chain services
# This script should run from an external server

ENDPOINTS=(
    "https://wallet.asichain.io/health"
    "https://explorer.asichain.io/health"
    "https://api.asichain.io/healthz"
    "https://monitoring.asichain.io/api/health"
)

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

check_endpoint() {
    local url=$1
    local service=$(echo $url | cut -d'/' -f3 | cut -d'.' -f1)
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")
    
    if [ "$response" -eq 200 ]; then
        echo "✅ $service is up (HTTP $response)"
        return 0
    else
        echo "❌ $service is down (HTTP $response)"
        
        # Send Slack alert
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 $service is down! HTTP status: $response\"}" \
            "$SLACK_WEBHOOK"
        
        return 1
    fi
}

main() {
    echo "🔍 Checking ASI Chain services..."
    
    failed_services=0
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if ! check_endpoint "$endpoint"; then
            ((failed_services++))
        fi
        sleep 2
    done
    
    if [ $failed_services -eq 0 ]; then
        echo "✅ All services are healthy"
    else
        echo "❌ $failed_services service(s) are down"
        exit 1
    fi
}

main "$@"
EOF

chmod +x /usr/local/bin/uptime-monitor.sh

# Add to crontab for every 5 minutes
echo "*/5 * * * * /usr/local/bin/uptime-monitor.sh" | crontab -
```

#### Pingdom Integration
```python
#!/usr/bin/env python3
"""
Pingdom API integration for ASI Chain monitoring
"""

import requests
import json
import os
from datetime import datetime

class PingdomMonitor:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.pingdom.com/api/3.1"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def create_check(self, name, url, expected_status=200):
        """Create a new uptime check"""
        data = {
            "name": name,
            "type": "http",
            "host": url,
            "encryption": True,
            "port": 443,
            "shouldcontain": "",
            "shouldnotcontain": "",
            "postdata": "",
            "requestheaders": {},
            "tags": ["asi-chain", "production"],
            "resolution": 1,  # Check every minute
            "sendnotificationwhendown": 3,  # Send notification after 3 failed checks
            "notifyagainevery": 10,  # Notify every 10 minutes
            "notifywhenbackup": True
        }
        
        response = requests.post(
            f"{self.base_url}/checks",
            headers=self.headers,
            json=data
        )
        
        if response.status_code == 200:
            print(f"✅ Created check for {name}")
            return response.json()
        else:
            print(f"❌ Failed to create check for {name}: {response.text}")
            return None
    
    def get_check_status(self, check_id):
        """Get status of a specific check"""
        response = requests.get(
            f"{self.base_url}/checks/{check_id}",
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def setup_asi_chain_monitoring(self):
        """Setup monitoring for all ASI Chain services"""
        services = [
            ("ASI Wallet", "https://wallet.asichain.io/health"),
            ("ASI Explorer", "https://explorer.asichain.io/health"),
            ("ASI API", "https://api.asichain.io/healthz"),
            ("ASI Monitoring", "https://monitoring.asichain.io/api/health")
        ]
        
        for name, url in services:
            self.create_check(name, url)

if __name__ == "__main__":
    api_token = os.getenv("PINGDOM_API_TOKEN")
    if not api_token:
        print("Please set PINGDOM_API_TOKEN environment variable")
        exit(1)
    
    monitor = PingdomMonitor(api_token)
    monitor.setup_asi_chain_monitoring()
```

## Performance Monitoring

### 📊 Application Performance Monitoring (APM)

#### Jaeger Tracing Setup
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: asi-chain
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.45
        ports:
        - containerPort: 16686  # UI
        - containerPort: 14268  # HTTP collector
        - containerPort: 14250  # gRPC collector
        - containerPort: 6831   # UDP agent
        - containerPort: 6832   # UDP agent
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: ":9411"
        - name: SPAN_STORAGE_TYPE
          value: "elasticsearch"
        - name: ES_SERVER_URLS
          value: "http://elasticsearch:9200"
        - name: ES_INDEX_PREFIX
          value: "asi-jaeger"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: asi-chain
spec:
  selector:
    app: jaeger
  ports:
  - name: ui
    port: 16686
    targetPort: 16686
  - name: http-collector
    port: 14268
    targetPort: 14268
  - name: grpc-collector
    port: 14250
    targetPort: 14250
  - name: udp-agent-1
    port: 6831
    targetPort: 6831
    protocol: UDP
  - name: udp-agent-2
    port: 6832
    targetPort: 6832
    protocol: UDP
  type: ClusterIP
EOF
```

#### Node.js Application Tracing
```javascript
// tracing.js - Add to ASI applications
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'asi-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('Tracing initialized');
```

## SLA and SLO Monitoring

### 🎯 Service Level Indicators (SLIs)

#### SLI/SLO Dashboard Configuration
```json
{
  "dashboard": {
    "title": "ASI Chain SLA/SLO Dashboard",
    "panels": [
      {
        "id": 1,
        "title": "Service Availability SLO",
        "type": "stat",
        "targets": [
          {
            "expr": "avg_over_time(up{job=~\"asi-.*\"}[30d]) * 100",
            "legendFormat": "30-day Availability %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {
                  "color": "red",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 99
                },
                {
                  "color": "green",
                  "value": 99.9
                }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "API Response Time SLO (95th percentile)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{service}} - 95th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 0.5
                },
                {
                  "color": "red",
                  "value": 1
                }
              ]
            }
          }
        }
      },
      {
        "id": 3,
        "title": "Error Budget Burn Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(1 - (sum(rate(http_requests_total{status!~\"5..\"}[1h])) / sum(rate(http_requests_total[1h])))) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "yellow",
                  "value": 0.1
                },
                {
                  "color": "red",
                  "value": 1
                }
              ]
            }
          }
        }
      }
    ]
  }
}
```

#### Error Budget Alerts
```yaml
# error-budget-alerts.yml
groups:
- name: slo.rules
  rules:
  - alert: ErrorBudgetBurn
    expr: |
      (
        sum(rate(http_requests_total{status=~"5.."}[1h])) /
        sum(rate(http_requests_total[1h]))
      ) > (14.4 * 0.001)  # 14.4x the SLO error rate (0.1%)
    for: 2m
    labels:
      severity: critical
      category: slo
    annotations:
      summary: "High error budget burn rate"
      description: "Error budget is burning at {{ $value | humanizePercentage }} per hour"
      
  - alert: ErrorBudgetBurnSlow
    expr: |
      (
        sum(rate(http_requests_total{status=~"5.."}[6h])) /
        sum(rate(http_requests_total[6h]))
      ) > (6 * 0.001)  # 6x the SLO error rate
    for: 15m
    labels:
      severity: warning
      category: slo
    annotations:
      summary: "Sustained error budget burn"
      description: "Error budget is burning at {{ $value | humanizePercentage }} over 6 hours"
```

## Incident Response Integration

### 🚨 PagerDuty Integration

#### PagerDuty Webhook Configuration
```python
#!/usr/bin/env python3
"""
PagerDuty integration for ASI Chain alerts
"""

import requests
import json
from datetime import datetime

class PagerDutyIntegration:
    def __init__(self, integration_key):
        self.integration_key = integration_key
        self.api_url = "https://events.pagerduty.com/v2/enqueue"
    
    def trigger_incident(self, summary, source, severity="error", details=None):
        """Trigger a PagerDuty incident"""
        payload = {
            "routing_key": self.integration_key,
            "event_action": "trigger",
            "dedup_key": f"asi-chain-{source}-{datetime.now().strftime('%Y%m%d-%H%M')}",
            "payload": {
                "summary": summary,
                "source": source,
                "severity": severity,
                "component": "asi-chain",
                "group": "production",
                "class": "monitoring",
                "custom_details": details or {}
            }
        }
        
        response = requests.post(
            self.api_url,
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        if response.status_code == 202:
            print(f"✅ PagerDuty incident triggered: {summary}")
        else:
            print(f"❌ Failed to trigger PagerDuty incident: {response.text}")
    
    def resolve_incident(self, dedup_key):
        """Resolve a PagerDuty incident"""
        payload = {
            "routing_key": self.integration_key,
            "event_action": "resolve",
            "dedup_key": dedup_key
        }
        
        response = requests.post(
            self.api_url,
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        return response.status_code == 202

# Example usage
if __name__ == "__main__":
    pd = PagerDutyIntegration("YOUR_INTEGRATION_KEY")
    pd.trigger_incident(
        summary="ASI Chain Wallet Service Down",
        source="monitoring.asichain.io",
        severity="critical",
        details={
            "service": "asi-wallet",
            "error_rate": "100%",
            "duration": "5 minutes",
            "affected_users": "all"
        }
    )
```

## Monitoring Runbook Procedures

### 📋 Daily Operations Checklist

#### Daily Monitoring Tasks
```bash
#!/bin/bash
# daily-monitoring-check.sh

echo "🔍 ASI Chain Daily Monitoring Checklist"
echo "========================================"

# Check service availability
echo "1. Service Availability Check:"
services=("wallet" "explorer" "indexer" "hasura")
for service in "${services[@]}"; do
    if curl -s "https://${service}.asichain.io/health" | grep -q "healthy"; then
        echo "  ✅ $service is healthy"
    else
        echo "  ❌ $service is DOWN"
    fi
done

# Check Prometheus targets
echo -e "\n2. Prometheus Targets:"
targets_down=$(curl -s "http://prometheus:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.health == "down") | .scrapeUrl' | wc -l)
echo "  Targets down: $targets_down"

# Check alert status
echo -e "\n3. Active Alerts:"
active_alerts=$(curl -s "http://alertmanager:9093/api/v1/alerts" | jq '.data[] | select(.status.state == "active") | .labels.alertname' | wc -l)
echo "  Active alerts: $active_alerts"

# Check disk usage
echo -e "\n4. Storage Usage:"
kubectl top nodes | awk 'NR>1 {print "  Node "$1": Disk usage not available via kubectl top"}'

# Check error rates
echo -e "\n5. Error Rates (last 1h):"
error_rate=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[1h])/rate(http_requests_total[1h])*100" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
echo "  Error rate: ${error_rate}%"

# Check response times
echo -e "\n6. Response Times (95th percentile):"
response_time=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
echo "  95th percentile: ${response_time}s"

echo -e "\n✅ Daily monitoring check completed"
```

#### Weekly Performance Review
```bash
#!/bin/bash
# weekly-performance-review.sh

echo "📊 ASI Chain Weekly Performance Review"
echo "====================================="

# Generate weekly report
echo "Generating weekly performance report..."

# CPU utilization trend
echo "CPU Utilization (7-day average):"
kubectl top nodes | awk 'NR>1 {print "  "$1": "$3}'

# Memory utilization trend
echo -e "\nMemory Utilization (7-day average):"
kubectl top nodes | awk 'NR>1 {print "  "$1": "$5}'

# Error rate trend
echo -e "\nError Rate Trend (7-day):"
curl -s "http://prometheus:9090/api/v1/query_range?query=rate(http_requests_total{status=~\"5..\"}[1h])/rate(http_requests_total[1h])*100&start=$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)&step=1h" | jq -r '.data.result[0].values[] | .[1]' | awk '{sum+=$1; count++} END {print "  Average: " sum/count "%"}'

# Response time trend
echo -e "\nResponse Time Trend (7-day):"
curl -s "http://prometheus:9090/api/v1/query_range?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[1h]))&start=$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)&step=1h" | jq -r '.data.result[0].values[] | .[1]' | awk '{sum+=$1; count++} END {print "  Average: " sum/count "s"}'

# Scaling events
echo -e "\nAuto-scaling Events (7-day):"
kubectl get events --sort-by='.metadata.creationTimestamp' | grep -i "scaled" | wc -l | awk '{print "  Scaling events: "$1}'

echo -e "\n✅ Weekly performance review completed"
```

## Troubleshooting Guide

### 🔧 Common Monitoring Issues

#### Prometheus Issues
```bash
# Check Prometheus health
kubectl exec -it deployment/prometheus -n asi-chain -- /bin/sh
# Inside container:
wget -qO- http://localhost:9090/-/healthy
wget -qO- http://localhost:9090/-/ready

# Check configuration
wget -qO- http://localhost:9090/api/v1/status/config

# Check targets
wget -qO- http://localhost:9090/api/v1/targets

# Reload configuration
curl -X POST http://localhost:9090/-/reload
```

#### Grafana Issues
```bash
# Check Grafana logs
kubectl logs deployment/grafana -n asi-chain

# Reset admin password
kubectl exec -it deployment/grafana -n asi-chain -- grafana-cli admin reset-admin-password newpassword

# Check database connection
kubectl exec -it deployment/grafana -n asi-chain -- /bin/sh
# Inside container:
nc -zv postgres 5432
```

#### AlertManager Issues
```bash
# Check AlertManager configuration
curl http://alertmanager:9093/api/v1/status

# Check active alerts
curl http://alertmanager:9093/api/v1/alerts

# Silence alerts
curl -X POST http://alertmanager:9093/api/v1/silences -d '{
  "matchers": [{"name": "alertname", "value": "NodeDown"}],
  "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "endsAt": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)'",
  "comment": "Maintenance window"
}'
```

## Production Monitoring Checklist

### ✅ Pre-Launch Checklist
- [ ] Prometheus server deployed and healthy
- [ ] All application metrics endpoints configured
- [ ] Grafana dashboards created and tested
- [ ] AlertManager configured with notification channels
- [ ] Alert rules defined for all critical scenarios
- [ ] Log aggregation (ELK stack) operational
- [ ] Distributed tracing (Jaeger) configured
- [ ] External uptime monitoring configured
- [ ] SLA/SLO dashboards created
- [ ] Incident response procedures documented
- [ ] Monitoring team trained on dashboards
- [ ] Runbook procedures tested

### ✅ Post-Launch Checklist
- [ ] All services showing green status
- [ ] Metrics flowing into Prometheus
- [ ] Dashboards displaying real-time data
- [ ] Alerts tested and firing correctly
- [ ] Log aggregation working
- [ ] External monitoring confirming uptime
- [ ] Performance baselines established
- [ ] Error budget tracking active
- [ ] Incident response tested
- [ ] Team notifications working

## Quick Reference

### 📊 Key Dashboards
- **Infrastructure Overview:** http://monitoring.asichain.io/d/asi-infrastructure
- **Application Performance:** http://monitoring.asichain.io/d/asi-application
- **Blockchain Metrics:** http://monitoring.asichain.io/d/asi-blockchain
- **SLA/SLO Dashboard:** http://monitoring.asichain.io/d/asi-slo

### 🎯 Critical Metrics
- **Service Availability:** >99.9%
- **API Response Time (P95):** <500ms
- **Error Rate:** <0.1%
- **Block Indexing Lag:** <30 seconds
- **Cache Hit Ratio:** >90%

### 🚨 Emergency Procedures
```bash
# Check all services
kubectl get pods -n asi-chain
curl https://wallet.asichain.io/health
curl https://explorer.asichain.io/health
curl https://api.asichain.io/healthz

# Check active alerts
curl http://alertmanager:9093/api/v1/alerts

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets
```

This comprehensive monitoring guide provides complete observability for the ASI Chain platform, ensuring 99.9% uptime and optimal performance for the August 31st testnet launch.
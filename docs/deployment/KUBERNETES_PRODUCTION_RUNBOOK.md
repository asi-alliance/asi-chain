# ASI Chain Kubernetes Production Runbook

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2025-08-14  
**Target Launch:** August 31st Testnet

## Executive Summary

This runbook provides comprehensive operational procedures for managing the ASI Chain Kubernetes infrastructure in production. It covers deployment strategies, scaling operations, troubleshooting procedures, and emergency response protocols for the August 31st testnet launch.

## Architecture Overview

### 🏗️ Kubernetes Infrastructure Layout

```
Production Namespace: asi-chain
├── Frontend Tier
│   ├── ASI Wallet (3-10 pods, HPA enabled)
│   └── ASI Explorer (2-6 pods, HPA enabled)
├── API Tier  
│   ├── Hasura GraphQL (2-6 pods, HPA enabled)
│   └── Indexer Service (3-8 pods, HPA enabled)
├── Data Tier
│   ├── Redis Cache (StatefulSet, 2 replicas)
│   └── PostgreSQL (External RDS)
├── Infrastructure
│   ├── Monitoring (Prometheus, Grafana)
│   ├── Ingress Controller (NGINX)
│   ├── Certificate Management (cert-manager)
│   └── Backup System (Velero)
└── Security
    ├── Network Policies
    ├── RBAC Configuration
    └── Secret Management
```

### 🎯 Service Level Objectives (SLOs)
- **Availability:** 99.9% uptime
- **Performance:** <500ms API response time (95th percentile)
- **Scalability:** Support 1000+ concurrent users
- **Recovery:** <30 minutes RTO, <5 minutes RPO

## Pre-Deployment Checklist

### ✅ Infrastructure Prerequisites
```bash
# Verify cluster connectivity
kubectl cluster-info
kubectl get nodes -o wide

# Check cluster health
kubectl get pods -n kube-system
kubectl get componentstatuses

# Verify required storage classes
kubectl get storageclass

# Check RBAC configuration
kubectl auth can-i create pods --namespace=asi-chain
kubectl auth can-i create services --namespace=asi-chain

# Verify network policies are supported
kubectl api-resources | grep networkpolicy
```

### 🔧 Required Tools and Versions
```bash
# Tool versions for production deployment
kubectl version --client  # v1.28+
helm version             # v3.12+
istioctl version        # v1.19+ (if using service mesh)
velero version          # v1.12+ (for backups)

# Container runtime versions
docker --version       # 24.0+
containerd --version   # 1.7+
```

## Deployment Procedures

### Phase 1: Namespace and RBAC Setup

#### 1.1 Create Production Namespace
```bash
# Apply namespace configuration
kubectl apply -f - << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: asi-chain
  labels:
    name: asi-chain
    environment: production
    project: asi-blockchain
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: asi-chain-quota
  namespace: asi-chain
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: "10"
    pods: "50"
    services: "10"
    secrets: "20"
    configmaps: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: asi-chain-limits
  namespace: asi-chain
spec:
  limits:
  - default:
      cpu: "1000m"
      memory: "2Gi"
    defaultRequest:
      cpu: "100m"
      memory: "256Mi"
    type: Container
  - max:
      cpu: "4000m"
      memory: "8Gi"
    min:
      cpu: "10m"
      memory: "64Mi"
    type: Container
EOF

# Verify namespace creation
kubectl get namespace asi-chain -o yaml
kubectl describe resourcequota asi-chain-quota -n asi-chain
```

#### 1.2 Configure Service Accounts and RBAC
```bash
# Create service accounts for each component
kubectl apply -f - << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: asi-wallet-sa
  namespace: asi-chain
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ASI-Wallet-ServiceRole
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: asi-explorer-sa
  namespace: asi-chain
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ASI-Explorer-ServiceRole
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: asi-indexer-sa
  namespace: asi-chain
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ASI-Indexer-ServiceRole
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: asi-hasura-sa
  namespace: asi-chain
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/ASI-Hasura-ServiceRole
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: asi-chain
  name: asi-app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets", "pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: asi-app-binding
  namespace: asi-chain
subjects:
- kind: ServiceAccount
  name: asi-wallet-sa
  namespace: asi-chain
- kind: ServiceAccount
  name: asi-explorer-sa
  namespace: asi-chain
- kind: ServiceAccount
  name: asi-indexer-sa
  namespace: asi-chain
- kind: ServiceAccount
  name: asi-hasura-sa
  namespace: asi-chain
roleRef:
  kind: Role
  name: asi-app-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### Phase 2: Secret Management

#### 2.1 Configure External Secrets Operator
```bash
# Install External Secrets Operator if not already installed
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Create SecretStore for AWS Secrets Manager
kubectl apply -f - << EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: asi-chain
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyID:
            name: aws-credentials
            key: access-key-id
          secretAccessKey:
            name: aws-credentials
            key: secret-access-key
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: asi-chain
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@{{ .endpoint }}/{{ .database }}"
        DB_USERNAME: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
        DB_HOST: "{{ .endpoint }}"
        DB_NAME: "{{ .database }}"
  data:
  - secretKey: username
    remoteRef:
      key: asi-chain/database-credentials
      property: username
  - secretKey: password
    remoteRef:
      key: asi-chain/database-credentials
      property: password
  - secretKey: endpoint
    remoteRef:
      key: asi-chain/database-credentials
      property: endpoint
  - secretKey: database
    remoteRef:
      key: asi-chain/database-credentials
      property: database
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redis-credentials
  namespace: asi-chain
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: redis-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        REDIS_URL: "redis://:{{ .auth_token }}@{{ .endpoint }}:6379"
        REDIS_HOST: "{{ .endpoint }}"
        REDIS_AUTH_TOKEN: "{{ .auth_token }}"
  data:
  - secretKey: endpoint
    remoteRef:
      key: asi-chain/redis-credentials
      property: endpoint
  - secretKey: auth_token
    remoteRef:
      key: asi-chain/redis-credentials
      property: auth_token
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: application-secrets
  namespace: asi-chain
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: application-secrets
    creationPolicy: Owner
  data:
  - secretKey: hasura-admin-secret
    remoteRef:
      key: asi-chain/application-secrets
      property: hasura-admin-secret
  - secretKey: jwt-secret
    remoteRef:
      key: asi-chain/application-secrets
      property: jwt-secret
  - secretKey: encryption-key
    remoteRef:
      key: asi-chain/application-secrets
      property: encryption-key
EOF

# Verify secrets are created
kubectl get externalsecret -n asi-chain
kubectl get secret -n asi-chain
```

### Phase 3: ConfigMap Deployment

#### 3.1 Application Configuration
```bash
# Create ConfigMaps for application settings
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: asi-wallet-config
  namespace: asi-chain
data:
  NODE_ENV: "production"
  API_TIMEOUT: "30000"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "100"
  ENABLE_ANALYTICS: "true"
  SENTRY_ENVIRONMENT: "production"
  LOG_LEVEL: "info"
  NETWORK_NAME: "ASI Chain Mainnet"
  CHAIN_ID: "1"
  DEFAULT_GAS_LIMIT: "21000"
  WALLET_CONNECT_PROJECT_ID: "asi-chain-mainnet"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: asi-explorer-config
  namespace: asi-chain
data:
  NODE_ENV: "production"
  REACT_APP_ENVIRONMENT: "production"
  REACT_APP_API_TIMEOUT: "30000"
  REACT_APP_BRAND_NAME: "ASI Chain Explorer"
  REACT_APP_NETWORK_NAME: "ASI Chain Mainnet"
  REACT_APP_REFRESH_INTERVAL: "10000"
  REACT_APP_PAGINATION_SIZE: "25"
  REACT_APP_MAX_BLOCK_DISPLAY: "100"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: asi-indexer-config
  namespace: asi-chain
data:
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  SYNC_INTERVAL: "5"
  BATCH_SIZE: "50"
  MAX_CONCURRENT_REQUESTS: "10"
  REQUEST_TIMEOUT: "30"
  RETRY_ATTEMPTS: "3"
  RETRY_DELAY: "5"
  HEALTH_CHECK_INTERVAL: "30"
  PROMETHEUS_ENABLED: "true"
  PROMETHEUS_PORT: "9090"
  CACHE_TTL: "300"
  ENABLE_CACHING: "true"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: asi-hasura-config
  namespace: asi-chain
data:
  HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
  HASURA_GRAPHQL_ENABLED_LOG_TYPES: "startup, http-log, webhook-log, websocket-log, query-log"
  HASURA_GRAPHQL_LOG_LEVEL: "info"
  HASURA_GRAPHQL_UNAUTHORIZED_ROLE: "public"
  HASURA_GRAPHQL_CORS_DOMAIN: "*"
  HASURA_GRAPHQL_ENABLE_TELEMETRY: "false"
  HASURA_GRAPHQL_WS_READ_COOKIE: "false"
  HASURA_GRAPHQL_STRINGIFY_NUMERIC_TYPES: "true"
  HASURA_GRAPHQL_LIVE_QUERIES_MULTIPLEXED_REFETCH_INTERVAL: "500"
  HASURA_GRAPHQL_LIVE_QUERIES_MULTIPLEXED_BATCH_SIZE: "100"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: asi-chain
data:
  nginx.conf: |
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /tmp/nginx.pid;
    
    events {
        worker_connections 1024;
        use epoll;
        multi_accept on;
    }
    
    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        
        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
        
        access_log /var/log/nginx/access.log main;
        
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        types_hash_max_size 2048;
        client_max_body_size 50M;
        
        gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types
            text/plain
            text/css
            text/xml
            text/javascript
            application/json
            application/javascript
            application/xml+rss
            application/atom+xml
            image/svg+xml;
        
        upstream wallet_backend {
            least_conn;
            server asi-wallet:3000 max_fails=3 fail_timeout=30s;
        }
        
        upstream explorer_backend {
            least_conn;
            server asi-explorer:3000 max_fails=3 fail_timeout=30s;
        }
        
        upstream api_backend {
            least_conn;
            server asi-hasura:8080 max_fails=3 fail_timeout=30s;
        }
        
        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req_zone $binary_remote_addr zone=wallet:10m rate=5r/s;
        
        server {
            listen 80;
            server_name wallet.asichain.io;
            
            location / {
                limit_req zone=wallet burst=20 nodelay;
                proxy_pass http://wallet_backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
            
            location /health {
                proxy_pass http://wallet_backend/health;
                access_log off;
            }
        }
        
        server {
            listen 80;
            server_name explorer.asichain.io;
            
            location / {
                proxy_pass http://explorer_backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
            
            location /health {
                proxy_pass http://explorer_backend/health;
                access_log off;
            }
        }
        
        server {
            listen 80;
            server_name api.asichain.io;
            
            location / {
                limit_req zone=api burst=50 nodelay;
                proxy_pass http://api_backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
            
            location /healthz {
                proxy_pass http://api_backend/healthz;
                access_log off;
            }
        }
    }
EOF
```

### Phase 4: Application Deployment

#### 4.1 PostgreSQL StatefulSet (for local development)
```bash
# Note: In production, use RDS. This is for completeness
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: asi-chain
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        envFrom:
        - secretRef:
            name: database-credentials
        env:
        - name: POSTGRES_DB
          value: "asichain"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DB_USERNAME
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DB_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
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
  name: postgres
  namespace: asi-chain
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
EOF
```

#### 4.2 Redis StatefulSet
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-primary
  namespace: asi-chain
spec:
  serviceName: redis-primary
  replicas: 1
  selector:
    matchLabels:
      app: redis
      role: primary
  template:
    metadata:
      labels:
        app: redis
        role: primary
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - /etc/redis/redis.conf
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
      storageClassName: gp3
---
apiVersion: v1
kind: Service
metadata:
  name: redis-primary
  namespace: asi-chain
spec:
  selector:
    app: redis
    role: primary
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: asi-chain
data:
  redis.conf: |
    port 6379
    tcp-backlog 511
    timeout 300
    tcp-keepalive 300
    daemonize no
    supervised no
    pidfile /var/run/redis.pid
    loglevel notice
    logfile ""
    databases 16
    always-show-logo yes
    save 900 1
    save 300 10
    save 60 10000
    stop-writes-on-bgsave-error yes
    rdbcompression yes
    rdbchecksum yes
    dbfilename dump.rdb
    dir /data
    maxmemory 512mb
    maxmemory-policy allkeys-lru
    appendonly yes
    appendfilename "appendonly.aof"
    appendfsync everysec
    no-appendfsync-on-rewrite no
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
EOF
```

#### 4.3 ASI Indexer Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-indexer
  namespace: asi-chain
  labels:
    app: asi-indexer
    component: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: asi-indexer
  template:
    metadata:
      labels:
        app: asi-indexer
        component: backend
    spec:
      serviceAccountName: asi-indexer-sa
      containers:
      - name: asi-indexer
        image: asichain/indexer:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: asi-indexer-config
        - secretRef:
            name: database-credentials
        - secretRef:
            name: redis-credentials
        env:
        - name: NODE_URL
          value: "http://rnode-validator:40453"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: REDIS_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: asi-indexer
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: asi-indexer
  namespace: asi-chain
  labels:
    app: asi-indexer
spec:
  selector:
    app: asi-indexer
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
EOF
```

#### 4.4 Hasura GraphQL Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-hasura
  namespace: asi-chain
  labels:
    app: asi-hasura
    component: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: asi-hasura
  template:
    metadata:
      labels:
        app: asi-hasura
        component: api
    spec:
      serviceAccountName: asi-hasura-sa
      containers:
      - name: hasura
        image: hasura/graphql-engine:v2.36.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: asi-hasura-config
        - secretRef:
            name: database-credentials
        - secretRef:
            name: application-secrets
        env:
        - name: HASURA_GRAPHQL_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DATABASE_URL
        - name: HASURA_GRAPHQL_ADMIN_SECRET
          valueFrom:
            secretKeyRef:
              name: application-secrets
              key: hasura-admin-secret
        - name: HASURA_GRAPHQL_JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: application-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: asi-hasura
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: asi-hasura
  namespace: asi-chain
  labels:
    app: asi-hasura
spec:
  selector:
    app: asi-hasura
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
EOF
```

#### 4.5 ASI Explorer Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-explorer
  namespace: asi-chain
  labels:
    app: asi-explorer
    component: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: asi-explorer
  template:
    metadata:
      labels:
        app: asi-explorer
        component: frontend
    spec:
      serviceAccountName: asi-explorer-sa
      containers:
      - name: asi-explorer
        image: asichain/explorer:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: asi-explorer-config
        env:
        - name: REACT_APP_GRAPHQL_URL
          value: "https://api.asichain.io/v1/graphql"
        - name: REACT_APP_GRAPHQL_WS_URL
          value: "wss://api.asichain.io/v1/graphql"
        - name: REACT_APP_RCHAIN_NODE_URL
          value: "https://api.asichain.io/rnode"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: nginx-cache
          mountPath: /var/cache/nginx
        - name: nginx-run
          mountPath: /var/run
      volumes:
      - name: tmp
        emptyDir: {}
      - name: nginx-cache
        emptyDir: {}
      - name: nginx-run
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: asi-explorer
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: asi-explorer
  namespace: asi-chain
  labels:
    app: asi-explorer
spec:
  selector:
    app: asi-explorer
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF
```

#### 4.6 ASI Wallet Deployment
```bash
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-wallet
  namespace: asi-chain
  labels:
    app: asi-wallet
    component: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: asi-wallet
  template:
    metadata:
      labels:
        app: asi-wallet
        component: frontend
    spec:
      serviceAccountName: asi-wallet-sa
      containers:
      - name: asi-wallet
        image: asichain/wallet:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: asi-wallet-config
        env:
        - name: REACT_APP_GRAPHQL_URL
          value: "https://api.asichain.io/v1/graphql"
        - name: REACT_APP_RCHAIN_NODE_URL
          value: "https://api.asichain.io/rnode"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: nginx-cache
          mountPath: /var/cache/nginx
        - name: nginx-run
          mountPath: /var/run
      volumes:
      - name: tmp
        emptyDir: {}
      - name: nginx-cache
        emptyDir: {}
      - name: nginx-run
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: asi-wallet
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: asi-wallet
  namespace: asi-chain
  labels:
    app: asi-wallet
spec:
  selector:
    app: asi-wallet
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF
```

### Phase 5: Auto-Scaling Configuration

#### 5.1 Horizontal Pod Autoscaler (HPA)
```bash
kubectl apply -f - << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asi-wallet-hpa
  namespace: asi-chain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-wallet
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asi-explorer-hpa
  namespace: asi-chain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-explorer
  minReplicas: 2
  maxReplicas: 6
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asi-indexer-hpa
  namespace: asi-chain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-indexer
  minReplicas: 3
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asi-hasura-hpa
  namespace: asi-chain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-hasura
  minReplicas: 2
  maxReplicas: 6
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
EOF

# Verify HPA configuration
kubectl get hpa -n asi-chain
kubectl describe hpa -n asi-chain
```

#### 5.2 Vertical Pod Autoscaler (VPA)
```bash
# Install VPA if not already installed
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-crd.yaml
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-rbac.yaml
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-deployment.yaml

# Configure VPA for ASI components
kubectl apply -f - << EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: asi-wallet-vpa
  namespace: asi-chain
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-wallet
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: asi-wallet
      minAllowed:
        cpu: 50m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: asi-explorer-vpa
  namespace: asi-chain
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-explorer
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: asi-explorer
      minAllowed:
        cpu: 50m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: asi-indexer-vpa
  namespace: asi-chain
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-indexer
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: asi-indexer
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: asi-hasura-vpa
  namespace: asi-chain
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-hasura
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: hasura
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
EOF
```

### Phase 6: Ingress and Load Balancing

#### 6.1 SSL Certificate Management
```bash
# Install cert-manager if not already installed
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - << EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@asichain.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@asichain.io
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### 6.2 Ingress Configuration
```bash
kubectl apply -f - << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: asi-chain-ingress
  namespace: asi-chain
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$binary_remote_addr"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"
spec:
  tls:
  - hosts:
    - wallet.asichain.io
    - explorer.asichain.io
    - api.asichain.io
    - monitoring.asichain.io
    secretName: asi-chain-tls
  rules:
  - host: wallet.asichain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: asi-wallet
            port:
              number: 3000
  - host: explorer.asichain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: asi-explorer
            port:
              number: 3000
  - host: api.asichain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: asi-hasura
            port:
              number: 8080
      - path: /metrics
        pathType: Prefix
        backend:
          service:
            name: asi-indexer
            port:
              number: 9090
  - host: monitoring.asichain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
EOF

# Verify ingress deployment
kubectl get ingress -n asi-chain
kubectl describe ingress asi-chain-ingress -n asi-chain
```

### Phase 7: Network Policies

#### 7.1 Security Network Policies
```bash
kubectl apply -f - << EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: asi-chain-network-policy
  namespace: asi-chain
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from:
    - podSelector:
        matchLabels:
          component: frontend
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - podSelector:
        matchLabels:
          component: api
    ports:
    - protocol: TCP
      port: 8080
  - from:
    - podSelector:
        matchLabels:
          component: backend
    ports:
    - protocol: TCP
      port: 8080
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-network-policy
  namespace: asi-chain
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          component: backend
    - podSelector:
        matchLabels:
          component: api
    ports:
    - protocol: TCP
      port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-network-policy
  namespace: asi-chain
spec:
  podSelector:
    matchLabels:
      app: redis
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          component: backend
    - podSelector:
        matchLabels:
          component: api
    ports:
    - protocol: TCP
      port: 6379
EOF
```

## Operational Procedures

### 🚀 Rolling Updates

#### Zero-Downtime Deployment Strategy
```bash
# Update deployment with new image
kubectl set image deployment/asi-wallet asi-wallet=asichain/wallet:v2.1.0 -n asi-chain

# Monitor rollout progress
kubectl rollout status deployment/asi-wallet -n asi-chain

# Check rollout history
kubectl rollout history deployment/asi-wallet -n asi-chain

# Rollback if needed
kubectl rollout undo deployment/asi-wallet -n asi-chain

# Rollback to specific revision
kubectl rollout undo deployment/asi-wallet --to-revision=2 -n asi-chain
```

#### Canary Deployment with Argo Rollouts
```bash
# Install Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Create Rollout configuration
kubectl apply -f - << EOF
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: asi-wallet-rollout
  namespace: asi-chain
spec:
  replicas: 5
  strategy:
    canary:
      canaryService: asi-wallet-canary
      stableService: asi-wallet-stable
      steps:
      - setWeight: 20
      - pause: {duration: 2m}
      - setWeight: 40
      - pause: {duration: 2m}
      - setWeight: 60
      - pause: {duration: 2m}
      - setWeight: 80
      - pause: {duration: 2m}
  selector:
    matchLabels:
      app: asi-wallet
  template:
    metadata:
      labels:
        app: asi-wallet
    spec:
      containers:
      - name: asi-wallet
        image: asichain/wallet:latest
        ports:
        - containerPort: 3000
EOF
```

### 📊 Monitoring and Health Checks

#### Health Check Procedures
```bash
# Check all pods status
kubectl get pods -n asi-chain -o wide

# Check service endpoints
kubectl get endpoints -n asi-chain

# Check resource usage
kubectl top pods -n asi-chain
kubectl top nodes

# Check HPA status
kubectl get hpa -n asi-chain
kubectl describe hpa asi-wallet-hpa -n asi-chain

# Check ingress status
kubectl get ingress -n asi-chain
kubectl describe ingress asi-chain-ingress -n asi-chain

# Test external connectivity
curl -k https://wallet.asichain.io/health
curl -k https://explorer.asichain.io/health
curl -k https://api.asichain.io/healthz
```

#### Performance Monitoring
```bash
# Monitor API response times
kubectl exec -it deployment/asi-indexer -n asi-chain -- curl localhost:8080/metrics | grep http_request_duration

# Check database connections
kubectl exec -it deployment/asi-hasura -n asi-chain -- curl localhost:8080/healthz

# Monitor Redis performance
kubectl exec -it redis-primary-0 -n asi-chain -- redis-cli info stats

# Check cache hit ratios
kubectl exec -it redis-primary-0 -n asi-chain -- redis-cli info stats | grep hit
```

### 🔧 Troubleshooting Procedures

#### Pod Issues
```bash
# Check pod events
kubectl describe pod <pod-name> -n asi-chain

# View pod logs
kubectl logs <pod-name> -n asi-chain --previous
kubectl logs -f deployment/asi-wallet -n asi-chain

# Debug pod networking
kubectl exec -it <pod-name> -n asi-chain -- nslookup asi-hasura
kubectl exec -it <pod-name> -n asi-chain -- ping asi-redis

# Debug pod resources
kubectl top pod <pod-name> -n asi-chain
kubectl describe pod <pod-name> -n asi-chain | grep -A 10 "Limits\|Requests"
```

#### Service Discovery Issues
```bash
# Check service status
kubectl get services -n asi-chain
kubectl describe service asi-wallet -n asi-chain

# Check endpoints
kubectl get endpoints asi-wallet -n asi-chain
kubectl describe endpoints asi-wallet -n asi-chain

# Test service connectivity
kubectl run debug --image=nicolaka/netshoot --rm -it -- /bin/bash
# Inside debug pod:
nslookup asi-wallet.asi-chain.svc.cluster.local
curl asi-wallet.asi-chain.svc.cluster.local:3000/health
```

#### Ingress Issues
```bash
# Check ingress controller logs
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx

# Check ingress status
kubectl describe ingress asi-chain-ingress -n asi-chain

# Check certificate status
kubectl get certificates -n asi-chain
kubectl describe certificate asi-chain-tls -n asi-chain

# Test ingress connectivity
kubectl port-forward service/ingress-nginx-controller 8080:80 -n ingress-nginx
curl localhost:8080 -H "Host: wallet.asichain.io"
```

#### Database Connection Issues
```bash
# Check database connectivity from indexer
kubectl exec -it deployment/asi-indexer -n asi-chain -- sh
# Inside pod:
nc -zv postgres 5432
psql $DATABASE_URL -c "SELECT 1"

# Check secret availability
kubectl get secret database-credentials -n asi-chain -o yaml

# Test Redis connectivity
kubectl exec -it deployment/asi-indexer -n asi-chain -- sh
# Inside pod:
nc -zv redis-primary 6379
redis-cli -h redis-primary ping
```

### 🔄 Scaling Operations

#### Manual Scaling
```bash
# Scale specific deployment
kubectl scale deployment asi-wallet --replicas=8 -n asi-chain

# Scale all deployments
kubectl scale deployment --all --replicas=5 -n asi-chain

# Scale based on CPU usage
kubectl autoscale deployment asi-wallet --cpu-percent=70 --min=3 --max=10 -n asi-chain
```

#### Custom Metrics Scaling
```bash
# Install metrics server if not available
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Create custom HPA with multiple metrics
kubectl apply -f - << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: asi-indexer-custom-hpa
  namespace: asi-chain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: asi-indexer
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: block_processing_lag
      target:
        type: AverageValue
        averageValue: "10"
EOF
```

### 🛡️ Security Operations

#### Security Scanning
```bash
# Scan images for vulnerabilities
trivy image asichain/wallet:latest
trivy image asichain/explorer:latest
trivy image asichain/indexer:latest

# Scan Kubernetes configurations
kubectl-who-can create pods --namespace asi-chain
kubectl auth can-i create secrets --namespace asi-chain --as system:serviceaccount:asi-chain:asi-wallet-sa

# Check network policies
kubectl get networkpolicy -n asi-chain
kubectl describe networkpolicy asi-chain-network-policy -n asi-chain
```

#### Secret Rotation
```bash
# Rotate database password
aws secretsmanager update-secret \
    --secret-id asi-chain/database-credentials \
    --secret-string '{"password":"'$(openssl rand -base64 32)'"}'

# Restart deployments to pick up new secrets
kubectl rollout restart deployment/asi-indexer -n asi-chain
kubectl rollout restart deployment/asi-hasura -n asi-chain

# Verify secret rotation
kubectl get secret database-credentials -n asi-chain -o jsonpath='{.data.password}' | base64 -d
```

### 📦 Backup and Recovery

#### Backup Procedures
```bash
# Create backup of all resources
kubectl get all,configmap,secret,pvc,ingress -n asi-chain -o yaml > asi-chain-backup-$(date +%Y%m%d).yaml

# Backup using Velero
velero backup create asi-chain-backup-$(date +%Y%m%d) \
    --include-namespaces asi-chain \
    --wait

# Backup persistent volumes
velero backup create asi-chain-pv-backup-$(date +%Y%m%d) \
    --include-resources persistentvolumeclaims \
    --include-namespaces asi-chain

# Check backup status
velero backup get
velero backup describe asi-chain-backup-$(date +%Y%m%d)
```

#### Recovery Procedures
```bash
# Restore from Velero backup
velero restore create asi-chain-restore-$(date +%Y%m%d) \
    --from-backup asi-chain-backup-20240814 \
    --wait

# Restore specific resources
velero restore create asi-chain-config-restore \
    --from-backup asi-chain-backup-20240814 \
    --include-resources configmaps,secrets

# Monitor restore progress
velero restore get
velero restore describe asi-chain-restore-$(date +%Y%m%d)

# Verify restored applications
kubectl get pods -n asi-chain
kubectl get services -n asi-chain
```

## Performance Optimization

### 🚀 Resource Tuning

#### JVM Tuning for Java Applications
```bash
# Update JVM settings for Hasura (if applicable)
kubectl patch deployment asi-hasura -n asi-chain -p '{"spec":{"template":{"spec":{"containers":[{"name":"hasura","env":[{"name":"HASURA_GRAPHQL_SERVER_HOST","value":"0.0.0.0"},{"name":"HASURA_GRAPHQL_SERVER_PORT","value":"8080"}]}]}}}}'
```

#### Database Connection Pooling
```bash
# Update connection pool settings
kubectl patch deployment asi-indexer -n asi-chain -p '{"spec":{"template":{"spec":{"containers":[{"name":"asi-indexer","env":[{"name":"DATABASE_POOL_SIZE","value":"20"},{"name":"DATABASE_POOL_TIMEOUT","value":"10000"}]}]}}}}'
```

#### Cache Optimization
```bash
# Update Redis configuration for better performance
kubectl patch configmap redis-config -n asi-chain --patch '{"data":{"redis.conf":"maxmemory 1gb\nmaxmemory-policy allkeys-lru\ntcp-keepalive 300\ntimeout 300"}}'

# Restart Redis to apply changes
kubectl rollout restart statefulset/redis-primary -n asi-chain
```

### 📈 Monitoring and Alerting

#### Custom Metrics Collection
```bash
# Deploy ServiceMonitor for Prometheus scraping
kubectl apply -f - << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: asi-chain-metrics
  namespace: asi-chain
spec:
  selector:
    matchLabels:
      app: asi-indexer
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: asi-hasura-metrics
  namespace: asi-chain
spec:
  selector:
    matchLabels:
      app: asi-hasura
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
EOF
```

#### Alert Rules
```bash
# Create Prometheus alert rules
kubectl apply -f - << EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: asi-chain-alerts
  namespace: asi-chain
spec:
  groups:
  - name: asi-chain.rules
    rules:
    - alert: ASIChainHighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} for {{ $labels.instance }}"
    
    - alert: ASIChainHighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected"
        description: "95th percentile latency is {{ $value }}s for {{ $labels.instance }}"
    
    - alert: ASIChainPodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Pod is crash looping"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is crash looping"
    
    - alert: ASIChainHighMemoryUsage
      expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage"
        description: "Memory usage is {{ $value | humanizePercentage }} for {{ $labels.pod }}"
EOF
```

## Emergency Procedures

### 🚨 Incident Response

#### Emergency Scale-Up
```bash
# Emergency scale-up all services
kubectl scale deployment asi-wallet --replicas=10 -n asi-chain
kubectl scale deployment asi-explorer --replicas=8 -n asi-chain
kubectl scale deployment asi-indexer --replicas=10 -n asi-chain
kubectl scale deployment asi-hasura --replicas=8 -n asi-chain

# Verify scaling
kubectl get pods -n asi-chain | grep Running | wc -l
```

#### Emergency Rollback
```bash
# Quick rollback to previous version
kubectl rollout undo deployment/asi-wallet -n asi-chain
kubectl rollout undo deployment/asi-explorer -n asi-chain
kubectl rollout undo deployment/asi-indexer -n asi-chain
kubectl rollout undo deployment/asi-hasura -n asi-chain

# Monitor rollback progress
kubectl rollout status deployment/asi-wallet -n asi-chain
kubectl rollout status deployment/asi-explorer -n asi-chain
kubectl rollout status deployment/asi-indexer -n asi-chain
kubectl rollout status deployment/asi-hasura -n asi-chain
```

#### Circuit Breaker Activation
```bash
# Temporarily disable non-essential services
kubectl scale deployment asi-explorer --replicas=0 -n asi-chain

# Route traffic only to essential services
kubectl patch ingress asi-chain-ingress -n asi-chain --type='json' -p='[{"op": "remove", "path": "/spec/rules/1"}]'

# Enable maintenance mode
kubectl create configmap maintenance-mode --from-literal=enabled=true -n asi-chain
```

### 🔧 Emergency Troubleshooting

#### Quick Diagnostics
```bash
# Get cluster overview
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running
kubectl get events --sort-by=.metadata.creationTimestamp | tail -20

# Check critical services
kubectl get pods -n asi-chain -o wide
kubectl get services -n asi-chain
kubectl get ingress -n asi-chain

# Check resource usage
kubectl top nodes
kubectl top pods -n asi-chain

# Check logs for errors
kubectl logs -l app=asi-indexer -n asi-chain --tail=100 | grep ERROR
kubectl logs -l app=asi-hasura -n asi-chain --tail=100 | grep ERROR
```

#### Network Connectivity Issues
```bash
# Test DNS resolution
kubectl run debug --image=nicolaka/netshoot --rm -it -- nslookup kubernetes.default.svc.cluster.local

# Test ingress connectivity
kubectl get ingress -n asi-chain
kubectl describe ingress asi-chain-ingress -n asi-chain

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx
```

## Maintenance Procedures

### 🔄 Regular Maintenance

#### Weekly Maintenance
```bash
#!/bin/bash
# Weekly maintenance script

echo "Starting weekly maintenance..."

# Update all deployments to latest images
kubectl set image deployment/asi-wallet asi-wallet=asichain/wallet:latest -n asi-chain
kubectl set image deployment/asi-explorer asi-explorer=asichain/explorer:latest -n asi-chain
kubectl set image deployment/asi-indexer asi-indexer=asichain/indexer:latest -n asi-chain

# Wait for rollouts to complete
kubectl rollout status deployment/asi-wallet -n asi-chain
kubectl rollout status deployment/asi-explorer -n asi-chain
kubectl rollout status deployment/asi-indexer -n asi-chain

# Clean up old ReplicaSets
kubectl delete replicaset $(kubectl get rs -n asi-chain -o jsonpath='{.items[?(@.spec.replicas==0)].metadata.name}') -n asi-chain

# Clean up unused images
kubectl run cleanup --image=docker --rm -it --restart=Never -- docker system prune -f

# Restart Redis for memory optimization
kubectl rollout restart statefulset/redis-primary -n asi-chain

# Create weekly backup
velero backup create asi-chain-weekly-$(date +%Y%m%d) \
    --include-namespaces asi-chain \
    --ttl 720h

echo "Weekly maintenance completed."
```

#### Monthly Maintenance
```bash
#!/bin/bash
# Monthly maintenance script

echo "Starting monthly maintenance..."

# Update cluster components
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Update cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Update ingress controller
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --reuse-values

# Security scan
trivy image asichain/wallet:latest
trivy image asichain/explorer:latest
trivy image asichain/indexer:latest

# Performance review
kubectl top nodes
kubectl top pods -n asi-chain
kubectl get hpa -n asi-chain

# Clean up old backups (keep last 12 monthly backups)
velero backup delete $(velero backup get -o jsonpath='{.items[?(@.metadata.creationTimestamp<"'$(date -d '1 year ago' -u +%Y-%m-%dT%H:%M:%SZ)'")].metadata.name}')

echo "Monthly maintenance completed."
```

## Production Runbook Checklists

### ✅ Pre-Deployment Checklist
- [ ] Kubernetes cluster health verified
- [ ] Required namespaces created
- [ ] RBAC and service accounts configured
- [ ] Secrets and ConfigMaps deployed
- [ ] Network policies applied
- [ ] Storage classes available
- [ ] Load balancer and ingress ready
- [ ] SSL certificates configured
- [ ] Monitoring stack deployed
- [ ] Backup system configured
- [ ] DNS records configured
- [ ] Performance testing completed

### ✅ Post-Deployment Checklist
- [ ] All pods running and healthy
- [ ] Services responding to health checks
- [ ] Ingress routing correctly
- [ ] SSL certificates valid
- [ ] Auto-scaling functioning
- [ ] Monitoring data flowing
- [ ] Alerts configured and tested
- [ ] Backup jobs running
- [ ] Performance metrics within SLA
- [ ] Security scans completed
- [ ] Documentation updated
- [ ] Team notified of deployment

### ✅ Incident Response Checklist
- [ ] Incident severity assessed
- [ ] Stakeholders notified
- [ ] Diagnostic data collected
- [ ] Immediate mitigation applied
- [ ] Root cause identified
- [ ] Permanent fix implemented
- [ ] Post-incident review conducted
- [ ] Documentation updated
- [ ] Lessons learned documented
- [ ] Prevention measures implemented

## Quick Reference

### 📋 Essential Commands
```bash
# Health checks
kubectl get pods -n asi-chain
kubectl get services -n asi-chain
kubectl get ingress -n asi-chain
kubectl top pods -n asi-chain

# Scaling
kubectl scale deployment asi-wallet --replicas=5 -n asi-chain
kubectl get hpa -n asi-chain

# Troubleshooting
kubectl describe pod <pod-name> -n asi-chain
kubectl logs -f deployment/asi-indexer -n asi-chain
kubectl exec -it <pod-name> -n asi-chain -- /bin/bash

# Updates
kubectl set image deployment/asi-wallet asi-wallet=asichain/wallet:v2.0.0 -n asi-chain
kubectl rollout status deployment/asi-wallet -n asi-chain
kubectl rollout undo deployment/asi-wallet -n asi-chain

# Backups
velero backup create asi-chain-backup-$(date +%Y%m%d) --include-namespaces asi-chain
velero restore create asi-chain-restore --from-backup asi-chain-backup-20240814
```

### 🎯 Key Metrics
- **Pod CPU Usage:** <70%
- **Pod Memory Usage:** <80%
- **Pod Restart Count:** 0
- **Service Response Time:** <500ms
- **Error Rate:** <1%
- **Cache Hit Ratio:** >80%

### 🔗 Important URLs
- **Wallet:** https://wallet.asichain.io
- **Explorer:** https://explorer.asichain.io
- **GraphQL API:** https://api.asichain.io/v1/graphql
- **Monitoring:** https://monitoring.asichain.io
- **Hasura Console:** https://api.asichain.io/console

This comprehensive Kubernetes Production Runbook provides all the necessary procedures and commands for successful production deployment and operations of the ASI Chain platform. The runbook is designed to support the August 31st testnet launch with confidence and reliability.
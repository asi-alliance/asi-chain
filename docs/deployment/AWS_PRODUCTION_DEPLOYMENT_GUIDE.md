# ASI Chain AWS Production Deployment Guide

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2025-08-14  
**Target Launch:** August 31st Testnet

## Executive Summary

This guide provides comprehensive step-by-step instructions for deploying ASI Chain infrastructure on AWS, supporting 1000+ concurrent users with auto-scaling, high availability, and comprehensive monitoring. The infrastructure is designed for the August 31st testnet launch with production-grade reliability.

## Architecture Overview

### 🏗️ AWS Infrastructure Stack

```
┌─── Application Load Balancer (ALB) ─── CloudFront CDN
│
├─── EKS Cluster (Kubernetes 1.28+)
│    ├─── ASI Wallet Pods (3-10 replicas)
│    ├─── ASI Explorer Pods (2-6 replicas)  
│    ├─── Indexer Pods (3-8 replicas)
│    ├─── Hasura GraphQL Pods (2-6 replicas)
│    └─── Monitoring Stack (Prometheus/Grafana)
│
├─── RDS PostgreSQL 15 (Multi-AZ)
│    ├─── Primary Instance (r6g.large)
│    └─── Read Replica (r6g.large)
│
├─── ElastiCache Redis 7.0 (Cluster Mode)
│    ├─── Primary Node Group (r6g.large)
│    └─── Replica Node Group (r6g.large)
│
├─── EFS (Shared Storage)
├─── S3 (Backups & Static Assets)
├─── CloudWatch (Monitoring & Alerting)
├─── AWS Secrets Manager (Secrets)
└─── Route 53 (DNS)
```

### 🎯 Performance Targets
- **Concurrent Users:** 1000+
- **API Response Time:** <500ms (95th percentile)
- **Uptime:** 99.9%
- **Auto-scaling:** CPU/Memory based with custom metrics
- **RTO:** <30 minutes (Recovery Time Objective)
- **RPO:** <5 minutes (Recovery Point Objective)

## Prerequisites

### 🛠️ Required Tools
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Terraform (optional for infrastructure as code)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### 🔐 AWS Permissions Required
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:*",
                "rds:*",
                "elasticache:*",
                "s3:*",
                "iam:*",
                "route53:*",
                "cloudformation:*",
                "cloudwatch:*",
                "logs:*",
                "secretsmanager:*",
                "efs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Step-by-Step Deployment

### Phase 1: Foundation Infrastructure

#### 1.1 Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

#### 1.2 Create VPC and Networking
```bash
# Create VPC for ASI Chain
aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=asi-chain-vpc},{Key=Environment,Value=production}]'

# Store VPC ID
export VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=asi-chain-vpc" --query 'Vpcs[0].VpcId' --output text)

# Create public subnets (for load balancers)
aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-public-1a},{Key=kubernetes.io/role/elb,Value=1}]'

aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-public-1b},{Key=kubernetes.io/role/elb,Value=1}]'

# Create private subnets (for application workloads)
aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.10.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-private-1a},{Key=kubernetes.io/role/internal-elb,Value=1}]'

aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.11.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-private-1b},{Key=kubernetes.io/role/internal-elb,Value=1}]'

# Create database subnets (isolated)
aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.20.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-db-1a}]'

aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.21.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=asi-db-1b}]'

# Store subnet IDs
export PUBLIC_SUBNET_1A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-public-1a" --query 'Subnets[0].SubnetId' --output text)
export PUBLIC_SUBNET_1B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-public-1b" --query 'Subnets[0].SubnetId' --output text)
export PRIVATE_SUBNET_1A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-private-1a" --query 'Subnets[0].SubnetId' --output text)
export PRIVATE_SUBNET_1B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-private-1b" --query 'Subnets[0].SubnetId' --output text)
export DB_SUBNET_1A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-db-1a" --query 'Subnets[0].SubnetId' --output text)
export DB_SUBNET_1B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=asi-db-1b" --query 'Subnets[0].SubnetId' --output text)
```

#### 1.3 Setup Internet Gateway and NAT Gateway
```bash
# Create Internet Gateway
aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=asi-igw}]'

export IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=asi-igw" --query 'InternetGateways[0].InternetGatewayId' --output text)

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create Elastic IP for NAT Gateway
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=asi-nat-eip}]'

export NAT_EIP=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=asi-nat-eip" --query 'Addresses[0].AllocationId' --output text)

# Create NAT Gateway
aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1A \
    --allocation-id $NAT_EIP \
    --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=asi-nat-gateway}]'

export NAT_GW_ID=$(aws ec2 describe-nat-gateways --filter "Name=tag:Name,Values=asi-nat-gateway" --query 'NatGateways[0].NatGatewayId' --output text)
```

#### 1.4 Configure Route Tables
```bash
# Create route table for public subnets
aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=asi-public-rt}]'

export PUBLIC_RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=asi-public-rt" --query 'RouteTables[0].RouteTableId' --output text)

# Add route to Internet Gateway
aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate public subnets
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1A --route-table-id $PUBLIC_RT_ID
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1B --route-table-id $PUBLIC_RT_ID

# Create route table for private subnets
aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=asi-private-rt}]'

export PRIVATE_RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=asi-private-rt" --query 'RouteTables[0].RouteTableId' --output text)

# Add route to NAT Gateway
aws ec2 create-route --route-table-id $PRIVATE_RT_ID --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GW_ID

# Associate private subnets
aws ec2 associate-route-table --subnet-id $PRIVATE_SUBNET_1A --route-table-id $PRIVATE_RT_ID
aws ec2 associate-route-table --subnet-id $PRIVATE_SUBNET_1B --route-table-id $PRIVATE_RT_ID
```

### Phase 2: Managed Services Setup

#### 2.1 Create RDS PostgreSQL Database
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name asi-db-subnet-group \
    --db-subnet-group-description "ASI Chain database subnet group" \
    --subnet-ids $DB_SUBNET_1A $DB_SUBNET_1B \
    --tags Key=Name,Value=asi-db-subnet-group

# Create security group for RDS
aws ec2 create-security-group \
    --group-name asi-rds-sg \
    --description "Security group for ASI Chain RDS" \
    --vpc-id $VPC_ID

export RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=asi-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Allow PostgreSQL access from private subnets
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 10.0.10.0/24

aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 10.0.11.0/24

# Store database password in AWS Secrets Manager
aws secretsmanager create-secret \
    --name asi-chain/database-password \
    --description "ASI Chain database password" \
    --secret-string '{"password":"'"$(openssl rand -base64 32)"'"}'

# Create RDS instance
aws rds create-db-instance \
    --db-name asichain \
    --db-instance-identifier asi-chain-db \
    --db-instance-class db.r6g.large \
    --engine postgres \
    --engine-version 15.4 \
    --master-username asiuser \
    --manage-master-user-password \
    --master-user-secret-kms-key-id alias/aws/rds \
    --allocated-storage 100 \
    --storage-type gp3 \
    --storage-encrypted \
    --vpc-security-group-ids $RDS_SG_ID \
    --db-subnet-group-name asi-db-subnet-group \
    --backup-retention-period 30 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --multi-az \
    --auto-minor-version-upgrade \
    --tags Key=Name,Value=asi-chain-db,Key=Environment,Value=production

# Wait for RDS to be available (this takes 10-15 minutes)
aws rds wait db-instance-available --db-instance-identifier asi-chain-db

# Create read replica for read-heavy workloads
aws rds create-db-instance-read-replica \
    --db-instance-identifier asi-chain-db-replica \
    --source-db-instance-identifier asi-chain-db \
    --db-instance-class db.r6g.large \
    --publicly-accessible false \
    --tags Key=Name,Value=asi-chain-db-replica,Key=Environment,Value=production
```

#### 2.2 Setup ElastiCache Redis Cluster
```bash
# Create security group for Redis
aws ec2 create-security-group \
    --group-name asi-redis-sg \
    --description "Security group for ASI Chain Redis" \
    --vpc-id $VPC_ID

export REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=asi-redis-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Allow Redis access from private subnets
aws ec2 authorize-security-group-ingress \
    --group-id $REDIS_SG_ID \
    --protocol tcp \
    --port 6379 \
    --cidr 10.0.10.0/24

aws ec2 authorize-security-group-ingress \
    --group-id $REDIS_SG_ID \
    --protocol tcp \
    --port 6379 \
    --cidr 10.0.11.0/24

# Create Redis subnet group
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name asi-redis-subnet-group \
    --cache-subnet-group-description "ASI Chain Redis subnet group" \
    --subnet-ids $DB_SUBNET_1A $DB_SUBNET_1B

# Create Redis replication group
aws elasticache create-replication-group \
    --replication-group-id asi-chain-redis \
    --description "ASI Chain Redis cluster" \
    --num-cache-clusters 2 \
    --cache-node-type cache.r6g.large \
    --engine redis \
    --engine-version 7.0 \
    --cache-parameter-group-name default.redis7 \
    --cache-subnet-group-name asi-redis-subnet-group \
    --security-group-ids $REDIS_SG_ID \
    --automatic-failover-enabled \
    --multi-az-enabled \
    --at-rest-encryption-enabled \
    --transit-encryption-enabled \
    --tags Key=Name,Value=asi-chain-redis,Key=Environment,Value=production

# Wait for Redis cluster to be available
aws elasticache wait replication-group-available --replication-group-id asi-chain-redis
```

#### 2.3 Create EFS for Shared Storage
```bash
# Create security group for EFS
aws ec2 create-security-group \
    --group-name asi-efs-sg \
    --description "Security group for ASI Chain EFS" \
    --vpc-id $VPC_ID

export EFS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=asi-efs-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Allow NFS access from private subnets
aws ec2 authorize-security-group-ingress \
    --group-id $EFS_SG_ID \
    --protocol tcp \
    --port 2049 \
    --cidr 10.0.10.0/24

aws ec2 authorize-security-group-ingress \
    --group-id $EFS_SG_ID \
    --protocol tcp \
    --port 2049 \
    --cidr 10.0.11.0/24

# Create EFS file system
aws efs create-file-system \
    --creation-token asi-chain-efs-$(date +%s) \
    --performance-mode generalPurpose \
    --throughput-mode provisioned \
    --provisioned-throughput-in-mibps 100 \
    --encrypted \
    --tags Key=Name,Value=asi-chain-efs,Key=Environment,Value=production

export EFS_ID=$(aws efs describe-file-systems --query 'FileSystems[?Tags[?Key==`Name` && Value==`asi-chain-efs`]].FileSystemId' --output text)

# Create EFS mount targets
aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $PRIVATE_SUBNET_1A \
    --security-groups $EFS_SG_ID

aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $PRIVATE_SUBNET_1B \
    --security-groups $EFS_SG_ID
```

### Phase 3: EKS Cluster Setup

#### 3.1 Create EKS Cluster
```bash
# Create cluster configuration file
cat > asi-cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: asi-chain
  region: us-east-1
  version: "1.28"

vpc:
  id: $VPC_ID
  subnets:
    private:
      us-east-1a:
        id: $PRIVATE_SUBNET_1A
      us-east-1b:
        id: $PRIVATE_SUBNET_1B
    public:
      us-east-1a:
        id: $PUBLIC_SUBNET_1A
      us-east-1b:
        id: $PUBLIC_SUBNET_1B

managedNodeGroups:
  - name: asi-workers
    instanceType: t3.large
    minSize: 3
    maxSize: 20
    desiredCapacity: 5
    privateNetworking: true
    volumeSize: 50
    volumeType: gp3
    volumeEncrypted: true
    tags:
      Environment: production
      Project: asi-chain
    iam:
      withAddonPolicies:
        autoScaler: true
        ebs: true
        efs: true
        cloudWatch: true

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
  - name: aws-efs-csi-driver
    version: latest

cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]

iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: aws-load-balancer-controller
        namespace: kube-system
      wellKnownPolicies:
        awsLoadBalancerController: true
    - metadata:
        name: cluster-autoscaler
        namespace: kube-system
      wellKnownPolicies:
        autoScaler: true
    - metadata:
        name: external-secrets
        namespace: kube-system
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/SecretsManagerReadWrite
EOF

# Create EKS cluster (this takes 15-20 minutes)
eksctl create cluster -f asi-cluster-config.yaml

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name asi-chain

# Verify cluster is working
kubectl get nodes
```

#### 3.2 Install Essential Add-ons
```bash
# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=asi-chain \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Install Cluster Autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

kubectl patch deployment cluster-autoscaler \
  -n kube-system \
  -p '{"spec":{"template":{"metadata":{"annotations":{"cluster-autoscaler.kubernetes.io/safe-to-evict":"false"}}}}}'

kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n kube-system

# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb"
```

### Phase 4: Application Deployment

#### 4.1 Deploy ASI Chain Applications
```bash
# Apply namespace and base configurations
kubectl apply -f k8s/base/namespace.yaml

# Create external secrets for database and Redis
cat > external-secrets.yaml << EOF
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
  data:
  - secretKey: password
    remoteRef:
      key: asi-chain/database-password
      property: password
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redis-auth
  namespace: asi-chain
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: redis-auth
    creationPolicy: Owner
  data:
  - secretKey: auth-token
    remoteRef:
      key: asi-chain/redis-auth
      property: auth-token
EOF

kubectl apply -f external-secrets.yaml

# Deploy all ASI Chain components
kubectl apply -f k8s/base/

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=600s deployment --all -n asi-chain

# Check deployment status
kubectl get pods -n asi-chain
kubectl get services -n asi-chain
kubectl get ingress -n asi-chain
```

#### 4.2 Configure Horizontal Pod Autoscaling
```bash
# Create custom HPA configurations
cat > hpa-configs.yaml << EOF
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
EOF

kubectl apply -f hpa-configs.yaml
```

### Phase 5: Monitoring and Observability

#### 5.1 Deploy Monitoring Stack
```bash
# Deploy Prometheus and Grafana
kubectl apply -f k8s/base/monitoring-deployment.yaml

# Wait for monitoring pods to be ready
kubectl wait --for=condition=available --timeout=600s deployment/prometheus -n asi-chain
kubectl wait --for=condition=available --timeout=600s deployment/grafana -n asi-chain

# Create ingress for monitoring services
cat > monitoring-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: asi-chain
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - monitoring.asichain.io
    - prometheus.asichain.io
    secretName: monitoring-tls
  rules:
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
  - host: prometheus.asichain.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prometheus
            port:
              number: 9090
EOF

kubectl apply -f monitoring-ingress.yaml
```

#### 5.2 Configure CloudWatch Integration
```bash
# Install CloudWatch Agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml

kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-serviceaccount.yaml

curl -O https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-configmap.yaml

kubectl apply -f cwagent-configmap.yaml

kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-daemonset.yaml

# Install Fluent Bit for log forwarding
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/fluent-bit/fluent-bit.yaml
```

### Phase 6: Security and Compliance

#### 6.1 Configure Network Policies
```bash
# Apply network policies for security
cat > network-policies.yaml << EOF
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
    - namespaceSelector:
        matchLabels:
          name: asi-chain
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
  - to:
    - namespaceSelector:
        matchLabels:
          name: asi-chain
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF

kubectl apply -f network-policies.yaml
```

#### 6.2 Setup Certificate Management
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=600s deployment/cert-manager -n cert-manager

# Create Let's Encrypt cluster issuer
cat > letsencrypt-issuer.yaml << EOF
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
EOF

kubectl apply -f letsencrypt-issuer.yaml
```

### Phase 7: DNS and Domain Configuration

#### 7.1 Configure Route 53
```bash
# Create hosted zone for asichain.io
aws route53 create-hosted-zone \
    --name asichain.io \
    --caller-reference asi-chain-$(date +%s) \
    --hosted-zone-config Comment="ASI Chain production domain"

export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[?Name==`asichain.io.`].Id' --output text | cut -d'/' -f3)

# Get load balancer DNS name
export LB_DNS_NAME=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create DNS records
cat > dns-records.json << EOF
{
    "Changes": [
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "wallet.asichain.io",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$LB_DNS_NAME"
                    }
                ]
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "explorer.asichain.io",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$LB_DNS_NAME"
                    }
                ]
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.asichain.io",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$LB_DNS_NAME"
                    }
                ]
            }
        },
        {
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "monitoring.asichain.io",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$LB_DNS_NAME"
                    }
                ]
            }
        }
    ]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file://dns-records.json
```

## Validation and Testing

### 🧪 Infrastructure Health Checks
```bash
# Check cluster health
kubectl get nodes
kubectl get pods -A
kubectl top nodes
kubectl top pods -A

# Check RDS status
aws rds describe-db-instances --db-instance-identifier asi-chain-db

# Check Redis status  
aws elasticache describe-replication-groups --replication-group-id asi-chain-redis

# Check auto-scaling
kubectl get hpa -n asi-chain
kubectl describe hpa -n asi-chain

# Check ingress and services
kubectl get ingress -n asi-chain
kubectl get services -n asi-chain

# Test external access
curl -k https://wallet.asichain.io/health
curl -k https://explorer.asichain.io/health
curl -k https://api.asichain.io/health
```

### 📊 Performance Testing
```bash
# Install k6 for load testing
kubectl apply -f https://github.com/grafana/k6-operator/releases/latest/download/bundle.yaml

# Create load test script
cat > load-test.yaml << EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: asi-chain-load-test
  namespace: asi-chain
spec:
  parallelism: 10
  script:
    configMap:
      name: load-test-script
      file: script.js
EOF

# Create load test script ConfigMap
kubectl create configmap load-test-script -n asi-chain --from-literal=script.js='
import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "5m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "5m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
};

export default function() {
  let responses = http.batch([
    ["GET", "https://wallet.asichain.io/health"],
    ["GET", "https://explorer.asichain.io/health"],
    ["GET", "https://api.asichain.io/graphql"],
  ]);
  
  check(responses[0], {
    "wallet status is 200": (r) => r.status === 200,
    "wallet response time < 500ms": (r) => r.timings.duration < 500,
  });
  
  check(responses[1], {
    "explorer status is 200": (r) => r.status === 200,
    "explorer response time < 500ms": (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
'

kubectl apply -f load-test.yaml
```

## Backup and Disaster Recovery

### 💾 Automated Backup Setup
```bash
# Create S3 bucket for backups
aws s3api create-bucket \
    --bucket asi-chain-backups-$(date +%s) \
    --region us-east-1

export BACKUP_BUCKET=$(aws s3api list-buckets --query 'Buckets[?starts_with(Name, `asi-chain-backups`)].Name' --output text)

# Install Velero for Kubernetes backups
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Create IAM policy for Velero
cat > velero-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::$BACKUP_BUCKET/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::$BACKUP_BUCKET"
        }
    ]
}
EOF

aws iam create-policy \
    --policy-name VeleroBackupPolicy \
    --policy-document file://velero-policy.json

# Install Velero
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket $BACKUP_BUCKET \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero

# Create backup schedule
velero schedule create daily-asi-chain-backup \
    --schedule="@daily" \
    --include-namespaces asi-chain \
    --ttl 720h0m0s
```

### 🚑 Disaster Recovery Testing
```bash
# Test disaster recovery procedure
./scripts/disaster-recovery.sh test-recovery

# Simulate database failure recovery
./scripts/disaster-recovery.sh recover-db $(date -d yesterday +%Y/%m/%d)

# Test full system recovery
./scripts/disaster-recovery.sh full-recovery $(date -d yesterday +%Y/%m/%d) daily-backup-name
```

## Monitoring and Alerting

### 📈 CloudWatch Dashboards
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "ASI-Chain-Production" \
    --dashboard-body file://cloudwatch-dashboard.json

# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
    --alarm-name "ASI-Chain-High-CPU" \
    --alarm-description "High CPU usage in EKS cluster" \
    --metric-name CPUUtilization \
    --namespace AWS/EKS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2

aws cloudwatch put-metric-alarm \
    --alarm-name "ASI-Chain-RDS-High-CPU" \
    --alarm-description "High CPU usage in RDS" \
    --metric-name CPUUtilization \
    --namespace AWS/RDS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --dimensions Name=DBInstanceIdentifier,Value=asi-chain-db
```

### 🚨 Alert Configuration
```bash
# Create SNS topic for alerts
aws sns create-topic --name asi-chain-alerts

export SNS_TOPIC_ARN=$(aws sns list-topics --query 'Topics[?ends_with(TopicArn, `asi-chain-alerts`)].TopicArn' --output text)

# Subscribe to alerts
aws sns subscribe \
    --topic-arn $SNS_TOPIC_ARN \
    --protocol email \
    --notification-endpoint admin@asichain.io

# Configure alarm actions
aws cloudwatch put-metric-alarm \
    --alarm-name "ASI-Chain-API-Errors" \
    --alarm-description "High API error rate" \
    --metric-name 4XXError \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 300 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN
```

## Cost Optimization

### 💰 Resource Optimization
```bash
# Enable Cost Explorer
aws ce get-cost-and-usage \
    --time-period Start=2024-08-01,End=2024-08-14 \
    --granularity DAILY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE

# Set up cost budgets
aws budgets create-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget '{
        "BudgetName": "ASI-Chain-Monthly-Budget",
        "BudgetLimit": {
            "Amount": "1000",
            "Unit": "USD"
        },
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST"
    }'

# Configure Spot instances for non-critical workloads
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  nodes.max: "20"
  nodes.min: "3"
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"
  skip-nodes-with-local-storage: "false"
  skip-nodes-with-system-pods: "false"
EOF
```

## Production Checklist

### ✅ Pre-Launch Verification
- [ ] All services healthy and running
- [ ] SSL certificates installed and valid
- [ ] DNS records configured correctly
- [ ] Load balancer responding to requests
- [ ] Database connections working
- [ ] Redis cache operational
- [ ] Monitoring dashboards showing data
- [ ] Alerts configured and tested
- [ ] Backup procedures validated
- [ ] Disaster recovery tested
- [ ] Security scans completed
- [ ] Performance targets met
- [ ] Auto-scaling functioning
- [ ] Log aggregation working

### 🚀 Launch Day Operations
```bash
# Final health check
kubectl get pods -n asi-chain
kubectl get services -n asi-chain
kubectl get ingress -n asi-chain

# Check external endpoints
curl -s https://wallet.asichain.io/health | jq
curl -s https://explorer.asichain.io/health | jq
curl -s https://api.asichain.io/health | jq

# Monitor key metrics
kubectl top pods -n asi-chain
kubectl get hpa -n asi-chain

# Check auto-scaling responsiveness
kubectl scale deployment asi-wallet --replicas=6 -n asi-chain
kubectl rollout status deployment/asi-wallet -n asi-chain

# Verify backup systems
velero backup get
aws rds describe-db-snapshots --db-instance-identifier asi-chain-db

# Monitor costs
aws ce get-dimension-values \
    --time-period Start=2024-08-01,End=2024-08-14 \
    --dimension SERVICE \
    --context COST_AND_USAGE
```

## Troubleshooting Guide

### 🔍 Common Issues and Solutions

#### EKS Cluster Issues
```bash
# Check cluster status
eksctl get cluster
aws eks describe-cluster --name asi-chain

# Check node group status
eksctl get nodegroup --cluster asi-chain
kubectl get nodes -o wide

# Check system pods
kubectl get pods -n kube-system
kubectl describe pod <failing-pod> -n kube-system
```

#### Database Connection Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier asi-chain-db

# Test database connectivity from pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- bash
# Inside the pod:
psql -h <rds-endpoint> -U asiuser -d asichain

# Check security groups
aws ec2 describe-security-groups --group-ids $RDS_SG_ID
```

#### Redis Connection Issues
```bash
# Check Redis status
aws elasticache describe-replication-groups --replication-group-id asi-chain-redis

# Test Redis connectivity
kubectl run -it --rm redis-test --image=redis:7 --restart=Never -- bash
# Inside the pod:
redis-cli -h <redis-endpoint> ping
```

#### Application Pod Issues
```bash
# Check pod status
kubectl get pods -n asi-chain
kubectl describe pod <pod-name> -n asi-chain
kubectl logs <pod-name> -n asi-chain

# Check resource usage
kubectl top pods -n asi-chain
kubectl describe hpa -n asi-chain

# Check ingress
kubectl get ingress -n asi-chain
kubectl describe ingress <ingress-name> -n asi-chain
```

## Security Best Practices

### 🛡️ Security Hardening Checklist
- [ ] Network policies implemented
- [ ] RBAC configured for least privilege
- [ ] Secrets stored in AWS Secrets Manager
- [ ] TLS encryption for all traffic
- [ ] Database encrypted at rest and in transit
- [ ] Regular security scans scheduled
- [ ] Container images scanned for vulnerabilities
- [ ] VPC flow logs enabled
- [ ] CloudTrail logging enabled
- [ ] GuardDuty enabled for threat detection

### 🔐 Security Monitoring
```bash
# Enable VPC Flow Logs
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-group-name /aws/vpc/flowlogs

# Enable CloudTrail
aws cloudtrail create-trail \
    --name asi-chain-audit-trail \
    --s3-bucket-name asi-chain-audit-logs \
    --include-global-service-events \
    --is-multi-region-trail \
    --enable-log-file-validation

# Enable GuardDuty
aws guardduty create-detector --enable
```

## Maintenance Procedures

### 🔄 Regular Maintenance Tasks

#### Daily
- Monitor dashboards and alerts
- Check system resource usage
- Verify backup completion
- Review security alerts

#### Weekly
- Review performance metrics
- Update monitoring thresholds
- Test disaster recovery procedures
- Security vulnerability scans

#### Monthly
- Update Kubernetes cluster
- Update application images
- Review and optimize costs
- Comprehensive security audit

## Support and Escalation

### 📞 Emergency Procedures
```bash
# Emergency scale-up
kubectl scale deployment asi-wallet --replicas=10 -n asi-chain
kubectl scale deployment asi-explorer --replicas=8 -n asi-chain
kubectl scale deployment asi-indexer --replicas=10 -n asi-chain

# Emergency database failover
aws rds failover-db-cluster --db-cluster-identifier asi-chain-db

# Emergency Redis failover
aws elasticache test-failover \
    --replication-group-id asi-chain-redis \
    --node-group-id asi-chain-redis-001

# Emergency backup restoration
./scripts/disaster-recovery.sh emergency-restore latest
```

### 📋 Incident Response
1. **Assess Impact:** Determine scope and severity
2. **Communicate:** Notify stakeholders via established channels
3. **Mitigate:** Apply immediate fixes or workarounds
4. **Restore:** Implement permanent solutions
5. **Document:** Record incident details and lessons learned
6. **Review:** Conduct post-incident analysis

---

## Quick Reference

### 🔗 Important Endpoints
- **Wallet:** https://wallet.asichain.io
- **Explorer:** https://explorer.asichain.io
- **GraphQL API:** https://api.asichain.io/graphql
- **Monitoring:** https://monitoring.asichain.io
- **Prometheus:** https://prometheus.asichain.io

### ⚡ Emergency Commands
```bash
# Quick health check
kubectl get pods -n asi-chain
aws rds describe-db-instances --db-instance-identifier asi-chain-db
aws elasticache describe-replication-groups --replication-group-id asi-chain-redis

# Emergency scale-up
kubectl scale deployment asi-wallet --replicas=10 -n asi-chain

# Check costs
aws ce get-cost-and-usage --time-period Start=$(date -d '7 days ago' '+%Y-%m-%d'),End=$(date '+%Y-%m-%d') --granularity DAILY --metrics BlendedCost

# Disaster recovery
./scripts/disaster-recovery.sh health
```

### 📊 Key Metrics to Monitor
- Pod CPU/Memory usage: <70%
- Database connections: <80% of max
- API response time: <500ms (95th percentile)
- Error rate: <1%
- Cache hit ratio: >80%
- Cluster node utilization: 40-80%

This comprehensive AWS deployment guide provides a production-ready infrastructure for ASI Chain, designed to handle the August 31st testnet launch with confidence. The infrastructure supports horizontal scaling, high availability, comprehensive monitoring, and automated disaster recovery procedures.
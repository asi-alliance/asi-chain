#!/bin/bash

# ASI Chain AWS Deployment Script
# Complete infrastructure deployment automation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
ENVIRONMENT="testnet"
PROJECT="asi-chain"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not installed"
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform not installed"
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not installed"
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        error "Helm not installed"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
    fi
    
    log "Prerequisites check passed ✓"
}

# Create S3 backend for Terraform
create_terraform_backend() {
    log "Creating Terraform backend..."
    
    BUCKET_NAME="${PROJECT}-${ENVIRONMENT}-terraform-state"
    TABLE_NAME="${PROJECT}-${ENVIRONMENT}-terraform-lock"
    
    # Create S3 bucket
    if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --acl private
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BUCKET_NAME" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        log "S3 bucket created: $BUCKET_NAME"
    else
        log "S3 bucket already exists: $BUCKET_NAME"
    fi
    
    # Create DynamoDB table for state locking
    if ! aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "$AWS_REGION"
        
        log "DynamoDB table created: $TABLE_NAME"
    else
        log "DynamoDB table already exists: $TABLE_NAME"
    fi
}

# Deploy VPC and networking
deploy_networking() {
    log "Deploying VPC and networking..."
    
    cd infrastructure/terraform
    
    terraform init \
        -backend-config="bucket=${PROJECT}-${ENVIRONMENT}-terraform-state" \
        -backend-config="key=networking/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=${PROJECT}-${ENVIRONMENT}-terraform-lock"
    
    terraform plan -out=networking.tfplan
    terraform apply networking.tfplan
    
    log "Networking deployed ✓"
}

# Deploy EKS cluster
deploy_eks() {
    log "Deploying EKS cluster..."
    
    terraform apply -target=module.eks -auto-approve
    
    # Update kubeconfig
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "${PROJECT}-${ENVIRONMENT}"
    
    # Verify cluster
    kubectl get nodes
    
    log "EKS cluster deployed ✓"
}

# Deploy databases
deploy_databases() {
    log "Deploying RDS and ElastiCache..."
    
    terraform apply \
        -target=aws_db_instance.postgres \
        -target=aws_elasticache_replication_group.redis \
        -auto-approve
    
    log "Databases deployed ✓"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Add Prometheus Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
        --wait
    
    # Deploy Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace monitoring \
        --set persistence.enabled=true \
        --set persistence.size=10Gi \
        --set adminPassword="${GRAFANA_ADMIN_PASSWORD:-admin123}" \
        --wait
    
    log "Monitoring stack deployed ✓"
}

# Deploy cert-manager for SSL
deploy_cert_manager() {
    log "Deploying cert-manager..."
    
    # Add Jetstack Helm repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Install cert-manager
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.13.0 \
        --set installCRDs=true \
        --wait
    
    # Create ClusterIssuer for Let's Encrypt
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@asi-chain.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    log "cert-manager deployed ✓"
}

# Deploy NGINX Ingress Controller
deploy_ingress() {
    log "Deploying NGINX Ingress Controller..."
    
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"=true \
        --set controller.podAnnotations."prometheus\.io/port"=10254 \
        --wait
    
    # Get Load Balancer URL
    LB_URL=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    log "Ingress Controller deployed. Load Balancer: $LB_URL"
}

# Deploy ASI Chain services
deploy_services() {
    log "Deploying ASI Chain services..."
    
    # Create namespace
    kubectl create namespace asi-chain --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/production/
    
    # Wait for deployments
    kubectl rollout status deployment/validator -n asi-chain --timeout=600s
    kubectl rollout status deployment/explorer -n asi-chain --timeout=600s
    kubectl rollout status deployment/indexer -n asi-chain --timeout=600s
    kubectl rollout status deployment/wallet-api -n asi-chain --timeout=600s
    
    log "ASI Chain services deployed ✓"
}

# Setup CloudWatch Container Insights
setup_cloudwatch() {
    log "Setting up CloudWatch Container Insights..."
    
    # Deploy CloudWatch agent
    curl https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluent-bit-quickstart.yaml | \
        sed "s/{{cluster_name}}/${PROJECT}-${ENVIRONMENT}/" | \
        sed "s/{{region_name}}/${AWS_REGION}/" | \
        kubectl apply -f -
    
    log "CloudWatch Container Insights deployed ✓"
}

# Configure autoscaling
configure_autoscaling() {
    log "Configuring autoscaling..."
    
    # Deploy metrics-server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Deploy cluster-autoscaler
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/${PROJECT}-${ENVIRONMENT},k8s.io/cluster-autoscaler/enabled
EOF
    
    log "Autoscaling configured ✓"
}

# Setup backup automation
setup_backups() {
    log "Setting up backup automation..."
    
    # Create backup CronJob
    kubectl apply -f infrastructure/backup/k8s-backup-cronjob.yaml
    
    # Setup Velero for Kubernetes backups
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo update
    
    helm upgrade --install velero vmware-tanzu/velero \
        --namespace velero \
        --create-namespace \
        --set configuration.provider=aws \
        --set configuration.backupStorageLocation.bucket="${PROJECT}-${ENVIRONMENT}-backups" \
        --set configuration.backupStorageLocation.config.region="${AWS_REGION}" \
        --set configuration.volumeSnapshotLocation.config.region="${AWS_REGION}" \
        --set initContainers[0].image=velero/velero-plugin-for-aws:v1.8.0 \
        --wait
    
    log "Backup automation configured ✓"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check pods
    kubectl get pods -n asi-chain
    
    # Check services
    kubectl get svc -n asi-chain
    
    # Check ingress
    kubectl get ingress -n asi-chain
    
    # Test endpoints
    ENDPOINTS=(
        "https://api.testnet.asi-chain.io/health"
        "https://explorer.testnet.asi-chain.io"
        "https://wallet.testnet.asi-chain.io"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -f -s -o /dev/null "$endpoint"; then
            log "✓ $endpoint is accessible"
        else
            warning "✗ $endpoint is not accessible yet"
        fi
    done
    
    log "Deployment verification complete"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    cat <<EOF > deployment-report.md
# ASI Chain Deployment Report
Date: $(date)
Environment: ${ENVIRONMENT}
Region: ${AWS_REGION}

## Infrastructure Status
- EKS Cluster: DEPLOYED
- RDS PostgreSQL: DEPLOYED
- ElastiCache Redis: DEPLOYED
- Load Balancers: DEPLOYED
- Monitoring: DEPLOYED

## Services Status
- Validators: $(kubectl get pods -n asi-chain -l app=validator --no-headers | wc -l) running
- Explorer: $(kubectl get pods -n asi-chain -l app=explorer --no-headers | wc -l) running
- Indexer: $(kubectl get pods -n asi-chain -l app=indexer --no-headers | wc -l) running
- Wallet API: $(kubectl get pods -n asi-chain -l app=wallet-api --no-headers | wc -l) running

## Endpoints
- API: https://api.testnet.asi-chain.io
- Explorer: https://explorer.testnet.asi-chain.io
- Wallet: https://wallet.testnet.asi-chain.io
- Faucet: https://faucet.testnet.asi-chain.io

## Next Steps
1. Configure DNS records
2. Run integration tests
3. Perform load testing
4. Security audit
EOF
    
    log "Report generated: deployment-report.md"
}

# Main deployment flow
main() {
    log "Starting ASI Chain AWS deployment..."
    
    check_prerequisites
    create_terraform_backend
    deploy_networking
    deploy_eks
    deploy_databases
    deploy_monitoring
    deploy_cert_manager
    deploy_ingress
    deploy_services
    setup_cloudwatch
    configure_autoscaling
    setup_backups
    verify_deployment
    generate_report
    
    log "🎉 ASI Chain deployment complete!"
    log "Access the dashboard at: https://explorer.testnet.asi-chain.io"
}

# Run main function
main "$@"
#!/bin/bash

# AWS Configuration for ASI Chain Testnet
# Production deployment configuration

# AWS Account Configuration
export AWS_ACCOUNT_ID="123456789012"  # Replace with actual account ID
export AWS_REGION="us-east-1"
export AWS_PROFILE="asi-chain-prod"

# Network Configuration
export ENVIRONMENT="testnet"
export PROJECT_NAME="asi-chain"
export DOMAIN_NAME="asi-chain.io"

# Budget Configuration (per web3guru888)
export MONTHLY_BUDGET="5000"  # USD per month
export BUDGET_ALERT_EMAIL="admin@asi-chain.io"

# Resource Sizing
export EKS_NODE_TYPE="m5.2xlarge"
export EKS_MIN_NODES="4"
export EKS_MAX_NODES="8"
export RDS_INSTANCE_TYPE="db.r6g.xlarge"
export REDIS_NODE_TYPE="cache.r6g.xlarge"

# Network Configuration
export VPC_CIDR="10.0.0.0/16"
export PUBLIC_SUBNETS=("10.0.101.0/24" "10.0.102.0/24" "10.0.103.0/24")
export PRIVATE_SUBNETS=("10.0.1.0/24" "10.0.2.0/24" "10.0.3.0/24")
export DATABASE_SUBNETS=("10.0.201.0/24" "10.0.202.0/24" "10.0.203.0/24")

# Availability Zones
export AZ1="${AWS_REGION}a"
export AZ2="${AWS_REGION}b"
export AZ3="${AWS_REGION}c"

# Blockchain Configuration
export CHAIN_ID="42161"
export NETWORK_NAME="asi-testnet"
export NUM_VALIDATORS="4"
export BLOCK_TIME="2"
export GAS_LIMIT="30000000"

# Security Configuration
export ENABLE_WAF="true"
export ENABLE_SHIELD="true"
export ENABLE_GUARDDUTY="true"
export ENABLE_CLOUDTRAIL="true"
export ENABLE_SECURITY_HUB="true"

# Backup Configuration
export BACKUP_RETENTION_DAYS="30"
export SNAPSHOT_FREQUENCY="daily"
export CROSS_REGION_BACKUP="true"
export BACKUP_REGION="us-west-2"

# Monitoring Configuration
export ENABLE_CLOUDWATCH="true"
export ENABLE_XRAY="true"
export LOG_RETENTION_DAYS="30"
export METRICS_RETENTION_DAYS="90"

# SSL Configuration
export SSL_PROVIDER="letsencrypt"
export SSL_EMAIL="ssl@asi-chain.io"

# Tags
export TAGS=(
  "Environment=${ENVIRONMENT}"
  "Project=${PROJECT_NAME}"
  "ManagedBy=Terraform"
  "CostCenter=Blockchain"
  "Owner=web3guru888"
  "LaunchDate=2025-08-31"
)

# Endpoints
export API_ENDPOINT="https://api.${ENVIRONMENT}.${DOMAIN_NAME}"
export EXPLORER_ENDPOINT="https://explorer.${ENVIRONMENT}.${DOMAIN_NAME}"
export WALLET_ENDPOINT="https://wallet.${ENVIRONMENT}.${DOMAIN_NAME}"
export FAUCET_ENDPOINT="https://faucet.${ENVIRONMENT}.${DOMAIN_NAME}"
export RPC_ENDPOINT="https://rpc.${ENVIRONMENT}.${DOMAIN_NAME}"
export WS_ENDPOINT="wss://ws.${ENVIRONMENT}.${DOMAIN_NAME}"

# Secrets (will be stored in AWS Secrets Manager)
export DB_NAME="asichain"
export DB_USERNAME="asichain_admin"
export REDIS_AUTH_ENABLED="true"

# Kubernetes Configuration
export K8S_VERSION="1.28"
export NAMESPACE="asi-chain"

# Docker Registry
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export IMAGE_TAG="latest"

# Cost Optimization
export USE_SPOT_INSTANCES="false"  # For production stability
export ENABLE_COST_ALLOCATION_TAGS="true"

# Compliance
export ENABLE_ENCRYPTION_AT_REST="true"
export ENABLE_ENCRYPTION_IN_TRANSIT="true"
export ENABLE_AUDIT_LOGGING="true"

# Function to check prerequisites
check_prerequisites() {
    echo "Checking AWS prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "ERROR: AWS CLI not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile ${AWS_PROFILE} &> /dev/null 2>&1; then
        echo "ERROR: AWS credentials not configured for profile ${AWS_PROFILE}"
        echo "Run: aws configure --profile ${AWS_PROFILE}"
        exit 1
    fi
    
    # Check required tools
    for tool in terraform kubectl helm jq; do
        if ! command -v $tool &> /dev/null; then
            echo "ERROR: $tool not installed"
            exit 1
        fi
    done
    
    echo "✅ All prerequisites met"
}

# Function to create AWS profile if needed
setup_aws_profile() {
    if ! aws configure list --profile ${AWS_PROFILE} &> /dev/null 2>&1; then
        echo "Setting up AWS profile ${AWS_PROFILE}..."
        aws configure set region ${AWS_REGION} --profile ${AWS_PROFILE}
        echo "Please configure AWS credentials:"
        aws configure --profile ${AWS_PROFILE}
    fi
}

# Export functions
export -f check_prerequisites
export -f setup_aws_profile

echo "AWS Configuration loaded for ASI Chain ${ENVIRONMENT}"
echo "Budget: $${MONTHLY_BUDGET}/month"
echo "Region: ${AWS_REGION}"
echo "Domain: ${DOMAIN_NAME}"
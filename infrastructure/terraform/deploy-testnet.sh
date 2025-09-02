#!/bin/bash

# ASI Chain Testnet Terraform Deployment Script
# Automated infrastructure deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENVIRONMENT="testnet"
AWS_REGION="us-east-1"
TERRAFORM_DIR="environments/testnet"

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
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform not installed. Please install terraform first."
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not installed. Please install AWS CLI first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    log "Prerequisites check passed ✓"
}

# Create S3 backend
create_backend() {
    log "Creating Terraform backend..."
    
    BUCKET_NAME="asi-chain-${ENVIRONMENT}-terraform-state"
    TABLE_NAME="asi-chain-${ENVIRONMENT}-terraform-lock"
    
    # Create S3 bucket
    if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        log "Creating S3 bucket: $BUCKET_NAME"
        
        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3api create-bucket \
                --bucket "$BUCKET_NAME" \
                --region "$AWS_REGION"
        else
            aws s3api create-bucket \
                --bucket "$BUCKET_NAME" \
                --region "$AWS_REGION" \
                --create-bucket-configuration LocationConstraint="$AWS_REGION"
        fi
        
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
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket "$BUCKET_NAME" \
            --public-access-block-configuration \
                "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        
        log "S3 bucket created successfully"
    else
        log "S3 bucket already exists: $BUCKET_NAME"
    fi
    
    # Create DynamoDB table for state locking
    if ! aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
        log "Creating DynamoDB table: $TABLE_NAME"
        
        aws dynamodb create-table \
            --table-name "$TABLE_NAME" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION"
        
        # Wait for table to be active
        aws dynamodb wait table-exists --table-name "$TABLE_NAME"
        
        log "DynamoDB table created successfully"
    else
        log "DynamoDB table already exists: $TABLE_NAME"
    fi
}

# Initialize Terraform
init_terraform() {
    log "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="bucket=asi-chain-${ENVIRONMENT}-terraform-state" \
        -backend-config="key=infrastructure/terraform.tfstate" \
        -backend-config="region=${AWS_REGION}" \
        -backend-config="dynamodb_table=asi-chain-${ENVIRONMENT}-terraform-lock" \
        -backend-config="encrypt=true"
    
    log "Terraform initialized successfully"
}

# Validate Terraform configuration
validate_terraform() {
    log "Validating Terraform configuration..."
    
    terraform validate
    
    if [ $? -eq 0 ]; then
        log "Terraform configuration is valid ✓"
    else
        error "Terraform validation failed"
    fi
}

# Plan Terraform deployment
plan_terraform() {
    log "Planning Terraform deployment..."
    
    terraform plan -out=tfplan
    
    log "Terraform plan created successfully"
    
    # Ask for confirmation
    echo -e "${YELLOW}Please review the plan above.${NC}"
    read -p "Do you want to proceed with the deployment? (yes/no): " -r
    
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        warning "Deployment cancelled by user"
        exit 0
    fi
}

# Apply Terraform configuration
apply_terraform() {
    log "Applying Terraform configuration..."
    
    terraform apply tfplan
    
    if [ $? -eq 0 ]; then
        log "Terraform apply completed successfully ✓"
    else
        error "Terraform apply failed"
    fi
}

# Save outputs
save_outputs() {
    log "Saving Terraform outputs..."
    
    terraform output -json > outputs.json
    
    # Extract important values
    VPC_ID=$(terraform output -raw vpc_id)
    EKS_ENDPOINT=$(terraform output -raw eks_cluster_endpoint)
    RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
    ALB_DNS=$(terraform output -raw load_balancer_dns)
    CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain)
    
    cat > deployment-info.txt <<EOF
ASI Chain Testnet Deployment Information
========================================
Date: $(date)
Environment: ${ENVIRONMENT}
Region: ${AWS_REGION}

Infrastructure Details:
----------------------
VPC ID: ${VPC_ID}
EKS Endpoint: ${EKS_ENDPOINT}
RDS Endpoint: ${RDS_ENDPOINT}
Redis Endpoint: ${REDIS_ENDPOINT}
Load Balancer: ${ALB_DNS}
CloudFront: ${CLOUDFRONT_DOMAIN}

Next Steps:
----------
1. Configure kubectl: aws eks update-kubeconfig --region ${AWS_REGION} --name asi-chain-${ENVIRONMENT}
2. Deploy applications: kubectl apply -f k8s/
3. Configure DNS records in Route53
4. Test all endpoints
5. Run smoke tests

Access URLs:
-----------
API: https://api.${ENVIRONMENT}.asi-chain.io
Explorer: https://explorer.${ENVIRONMENT}.asi-chain.io
Wallet: https://wallet.${ENVIRONMENT}.asi-chain.io
Faucet: https://faucet.${ENVIRONMENT}.asi-chain.io
EOF
    
    log "Deployment information saved to deployment-info.txt"
}

# Update kubeconfig
update_kubeconfig() {
    log "Updating kubeconfig..."
    
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "asi-chain-${ENVIRONMENT}"
    
    # Verify connection
    if kubectl get nodes &>/dev/null; then
        log "Kubernetes cluster connection successful ✓"
        kubectl get nodes
    else
        warning "Could not connect to Kubernetes cluster"
    fi
}

# Main execution
main() {
    log "Starting ASI Chain Testnet infrastructure deployment..."
    log "Environment: ${ENVIRONMENT}"
    log "Region: ${AWS_REGION}"
    
    check_prerequisites
    create_backend
    init_terraform
    validate_terraform
    plan_terraform
    apply_terraform
    save_outputs
    update_kubeconfig
    
    log "🎉 ASI Chain Testnet infrastructure deployment completed successfully!"
    log "Check deployment-info.txt for access details"
}

# Run main function
main "$@"
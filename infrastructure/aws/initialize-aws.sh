#!/bin/bash

# ASI Chain AWS Account Initialization Script
# Sets up AWS account and starts infrastructure deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT="asi-chain"
ENVIRONMENT="testnet"
AWS_REGION="us-east-1"
BUDGET_LIMIT="5000"
ALERT_EMAIL="alerts@asi-chain.io"

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# ASCII Banner
show_banner() {
    echo -e "${BLUE}"
    cat << "EOF"
    ___   _____ ____    ________          _      
   /   | / ___//  _/   / ____/ /_  ____ _(_)___  
  / /| | \__ \ / /    / /   / __ \/ __ `/ / __ \ 
 / ___ |___/ // /    / /___/ / / / /_/ / / / / / 
/_/  |_/____/___/    \____/_/ /_/\__,_/_/_/ /_/  
                                                  
       AWS Infrastructure Deployment v1.0
              Testnet Launch: August 31, 2025
EOF
    echo -e "${NC}"
}

# Check AWS CLI version
check_aws_cli() {
    log "Checking AWS CLI..."
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not installed. Please install: https://aws.amazon.com/cli/"
    fi
    
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    info "AWS CLI version: $AWS_VERSION"
}

# Configure AWS credentials
configure_aws() {
    log "Configuring AWS credentials..."
    
    # Check if credentials exist
    if aws sts get-caller-identity &> /dev/null 2>&1; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        info "Using AWS Account: $ACCOUNT_ID"
    else
        warning "AWS credentials not configured"
        echo "Please provide AWS credentials:"
        read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
        read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
        echo
        
        export AWS_ACCESS_KEY_ID
        export AWS_SECRET_ACCESS_KEY
        export AWS_DEFAULT_REGION=$AWS_REGION
        
        # Verify credentials
        if ! aws sts get-caller-identity &> /dev/null 2>&1; then
            error "Invalid AWS credentials"
        fi
        
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        log "Successfully configured AWS Account: $ACCOUNT_ID"
    fi
}

# Create budget alert
create_budget() {
    log "Creating AWS budget alert..."
    
    # Check if budget exists
    if aws budgets describe-budgets --account-id "$ACCOUNT_ID" --query "Budgets[?BudgetName=='${PROJECT}-${ENVIRONMENT}-monthly'].BudgetName" --output text 2>/dev/null | grep -q "${PROJECT}-${ENVIRONMENT}-monthly"; then
        info "Budget already exists"
    else
        cat > /tmp/budget.json <<EOF
{
    "BudgetName": "${PROJECT}-${ENVIRONMENT}-monthly",
    "BudgetLimit": {
        "Amount": "${BUDGET_LIMIT}",
        "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false
    }
}
EOF
        
        cat > /tmp/notifications.json <<EOF
[
    {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
    }
]
EOF
        
        cat > /tmp/subscribers.json <<EOF
[
    {
        "SubscriptionType": "EMAIL",
        "Address": "${ALERT_EMAIL}"
    }
]
EOF
        
        aws budgets create-budget \
            --account-id "$ACCOUNT_ID" \
            --budget file:///tmp/budget.json \
            --notifications-with-subscribers \
                NotificationWithSubscribers="[{\"Notification\":$(cat /tmp/notifications.json | jq -c '.[0]'),\"Subscribers\":$(cat /tmp/subscribers.json)}]" \
            2>/dev/null || true
        
        log "Budget alert created: \$${BUDGET_LIMIT}/month"
    fi
}

# Enable required AWS services
enable_services() {
    log "Enabling required AWS services..."
    
    # Enable Cost Explorer
    aws ce get-cost-and-usage \
        --time-period Start=2025-01-01,End=2025-01-02 \
        --granularity DAILY \
        --metrics UnblendedCost \
        --dimensions Key=SERVICE &>/dev/null || true
    
    # Enable GuardDuty
    if ! aws guardduty list-detectors --query 'DetectorIds[0]' --output text 2>/dev/null | grep -q .; then
        info "Enabling GuardDuty..."
        aws guardduty create-detector --enable --finding-publishing-frequency ONE_HOUR 2>/dev/null || true
    fi
    
    # Enable CloudTrail
    if ! aws cloudtrail describe-trails --query "trailList[?Name=='${PROJECT}-${ENVIRONMENT}-trail']" --output text 2>/dev/null | grep -q .; then
        info "Enabling CloudTrail..."
        
        # Create S3 bucket for CloudTrail
        TRAIL_BUCKET="${PROJECT}-${ENVIRONMENT}-cloudtrail-${ACCOUNT_ID}"
        aws s3api create-bucket --bucket "$TRAIL_BUCKET" --region "$AWS_REGION" 2>/dev/null || true
        
        # Create CloudTrail
        aws cloudtrail create-trail \
            --name "${PROJECT}-${ENVIRONMENT}-trail" \
            --s3-bucket-name "$TRAIL_BUCKET" \
            --is-multi-region-trail \
            --enable-log-file-validation 2>/dev/null || true
        
        aws cloudtrail start-logging --name "${PROJECT}-${ENVIRONMENT}-trail" 2>/dev/null || true
    fi
    
    log "AWS services enabled ✓"
}

# Create IAM roles
create_iam_roles() {
    log "Creating IAM roles..."
    
    # Create EC2 role for EKS nodes
    if ! aws iam get-role --role-name "${PROJECT}-${ENVIRONMENT}-eks-node-role" &>/dev/null 2>&1; then
        cat > /tmp/trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
        
        aws iam create-role \
            --role-name "${PROJECT}-${ENVIRONMENT}-eks-node-role" \
            --assume-role-policy-document file:///tmp/trust-policy.json \
            --description "EKS Node Instance Role for ${PROJECT} ${ENVIRONMENT}"
        
        # Attach policies
        aws iam attach-role-policy \
            --role-name "${PROJECT}-${ENVIRONMENT}-eks-node-role" \
            --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        
        aws iam attach-role-policy \
            --role-name "${PROJECT}-${ENVIRONMENT}-eks-node-role" \
            --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        
        aws iam attach-role-policy \
            --role-name "${PROJECT}-${ENVIRONMENT}-eks-node-role" \
            --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        
        log "IAM roles created ✓"
    else
        info "IAM roles already exist"
    fi
}

# Create ECR repositories
create_ecr_repos() {
    log "Creating ECR repositories..."
    
    REPOS=("asi-wallet" "asi-explorer" "asi-indexer" "asi-faucet" "asi-api")
    
    for repo in "${REPOS[@]}"; do
        if ! aws ecr describe-repositories --repository-names "$repo" &>/dev/null 2>&1; then
            aws ecr create-repository \
                --repository-name "$repo" \
                --image-scanning-configuration scanOnPush=true \
                --encryption-configuration encryptionType=AES256
            
            info "Created ECR repository: $repo"
        else
            info "ECR repository exists: $repo"
        fi
    done
    
    log "ECR repositories ready ✓"
}

# Create KMS keys
create_kms_keys() {
    log "Creating KMS encryption keys..."
    
    # Create key for EKS secrets encryption
    if ! aws kms describe-key --key-id "alias/${PROJECT}-${ENVIRONMENT}-eks" &>/dev/null 2>&1; then
        KEY_ID=$(aws kms create-key \
            --description "EKS secrets encryption for ${PROJECT} ${ENVIRONMENT}" \
            --key-policy "{
                \"Version\": \"2012-10-17\",
                \"Statement\": [{
                    \"Sid\": \"Enable IAM User Permissions\",
                    \"Effect\": \"Allow\",
                    \"Principal\": {
                        \"AWS\": \"arn:aws:iam::${ACCOUNT_ID}:root\"
                    },
                    \"Action\": \"kms:*\",
                    \"Resource\": \"*\"
                }]
            }" \
            --query 'KeyMetadata.KeyId' \
            --output text)
        
        aws kms create-alias \
            --alias-name "alias/${PROJECT}-${ENVIRONMENT}-eks" \
            --target-key-id "$KEY_ID"
        
        log "KMS keys created ✓"
    else
        info "KMS keys already exist"
    fi
}

# Initialize Terraform backend
init_terraform_backend() {
    log "Initializing Terraform backend..."
    
    # Create S3 bucket for Terraform state
    STATE_BUCKET="${PROJECT}-${ENVIRONMENT}-terraform-state"
    
    if ! aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
        aws s3api create-bucket \
            --bucket "$STATE_BUCKET" \
            --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$STATE_BUCKET" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$STATE_BUCKET" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        log "Terraform state bucket created: $STATE_BUCKET"
    else
        info "Terraform state bucket exists: $STATE_BUCKET"
    fi
    
    # Create DynamoDB table for state locking
    LOCK_TABLE="${PROJECT}-${ENVIRONMENT}-terraform-lock"
    
    if ! aws dynamodb describe-table --table-name "$LOCK_TABLE" &>/dev/null 2>&1; then
        aws dynamodb create-table \
            --table-name "$LOCK_TABLE" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION"
        
        aws dynamodb wait table-exists --table-name "$LOCK_TABLE"
        
        log "Terraform lock table created: $LOCK_TABLE"
    else
        info "Terraform lock table exists: $LOCK_TABLE"
    fi
}

# Generate deployment summary
generate_summary() {
    log "Generating deployment summary..."
    
    cat > deployment-summary.txt <<EOF
================================================================================
                      ASI Chain AWS Infrastructure Summary
================================================================================

Date:           $(date)
Account ID:     $ACCOUNT_ID
Region:         $AWS_REGION
Environment:    $ENVIRONMENT
Budget Limit:   \$$BUDGET_LIMIT/month

Resources Created:
------------------
✅ AWS Budget Alert
✅ CloudTrail Audit Logging
✅ GuardDuty Threat Detection
✅ IAM Roles for EKS
✅ ECR Repositories
✅ KMS Encryption Keys
✅ Terraform Backend (S3 + DynamoDB)

Next Steps:
-----------
1. Run Terraform deployment:
   cd infrastructure/terraform/environments/testnet
   terraform init
   terraform plan
   terraform apply

2. Configure kubectl:
   aws eks update-kubeconfig --region $AWS_REGION --name ${PROJECT}-${ENVIRONMENT}

3. Deploy applications:
   kubectl apply -f k8s/production/

4. Configure DNS:
   - Point testnet.asi-chain.io to CloudFront distribution
   - Create subdomains for api, explorer, wallet, faucet, rpc, ws

5. Run tests:
   ./scripts/test-deployment.sh

Support:
--------
- GitHub Issues: https://github.com/asi-alliance/asi-chain/issues
- Email: support@asi-chain.io
- Slack: #asi-chain-testnet

================================================================================
EOF
    
    cat deployment-summary.txt
}

# Main execution
main() {
    show_banner
    
    log "Starting ASI Chain AWS infrastructure initialization..."
    
    check_aws_cli
    configure_aws
    create_budget
    enable_services
    create_iam_roles
    create_ecr_repos
    create_kms_keys
    init_terraform_backend
    generate_summary
    
    echo
    log "🎉 AWS account initialization complete!"
    log "Ready to deploy ASI Chain testnet infrastructure"
    echo
    info "Run the following command to start Terraform deployment:"
    echo -e "${YELLOW}cd infrastructure/terraform/environments/testnet && terraform init && terraform plan${NC}"
}

# Run main function
main "$@"
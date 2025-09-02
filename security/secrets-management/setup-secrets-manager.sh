#!/bin/bash
# ASI Chain - Secrets Management Setup Script
# This script configures AWS Secrets Manager integration for production secrets

set -euo pipefail

echo "🔐 ASI Chain Secrets Management Setup"
echo "======================================"

# Configuration
REGION=${AWS_REGION:-us-east-1}
SECRET_PREFIX="asi-chain"

# Function to create or update secret
create_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    echo "Creating secret: ${SECRET_PREFIX}/${secret_name}"
    
    if aws secretsmanager describe-secret --secret-id "${SECRET_PREFIX}/${secret_name}" --region "$REGION" >/dev/null 2>&1; then
        echo "Secret exists, updating..."
        aws secretsmanager update-secret \
            --secret-id "${SECRET_PREFIX}/${secret_name}" \
            --secret-string "$secret_value" \
            --region "$REGION"
    else
        echo "Creating new secret..."
        aws secretsmanager create-secret \
            --name "${SECRET_PREFIX}/${secret_name}" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$REGION"
    fi
}

# Generate secure random passwords
HASURA_ADMIN_SECRET=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
WALLETCONNECT_SECRET=$(openssl rand -base64 32)

# Create secrets in AWS Secrets Manager
echo "📝 Creating secrets in AWS Secrets Manager..."

create_secret "hasura-admin-secret" "$HASURA_ADMIN_SECRET" "Hasura GraphQL admin secret for ASI Chain Explorer"
create_secret "database-password" "$DATABASE_PASSWORD" "PostgreSQL database password for ASI Chain Indexer"
create_secret "jwt-secret" "$JWT_SECRET" "JWT signing secret for API authentication"
create_secret "encryption-key" "$ENCRYPTION_KEY" "AES encryption key for sensitive data"
create_secret "walletconnect-secret" "$WALLETCONNECT_SECRET" "WalletConnect integration secret"

# Create database configuration secret
DATABASE_CONFIG=$(cat <<EOF
{
  "host": "asi-indexer-db",
  "port": "5432",
  "database": "asichain",
  "username": "indexer",
  "password": "$DATABASE_PASSWORD",
  "ssl": true,
  "pool_size": 20
}
EOF
)

create_secret "database-config" "$DATABASE_CONFIG" "Complete database configuration with credentials"

# Create API configuration secret
API_CONFIG=$(cat <<EOF
{
  "rate_limit_per_minute": 100,
  "cors_origins": ["https://wallet.asi-chain.io", "https://explorer.asi-chain.io"],
  "jwt_secret": "$JWT_SECRET",
  "encryption_key": "$ENCRYPTION_KEY"
}
EOF
)

create_secret "api-config" "$API_CONFIG" "API security configuration and credentials"

echo "✅ Secrets created successfully!"
echo ""
echo "🔗 IAM Policy Required:"
echo "Grant your application the following IAM policy:"
echo ""
cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${REGION}:*:secret:${SECRET_PREFIX}/*"
      ]
    }
  ]
}
EOF

echo ""
echo "📋 Environment Variables to Set:"
echo "AWS_REGION=$REGION"
echo "AWS_SECRET_PREFIX=$SECRET_PREFIX"
echo ""
echo "🎯 Next Steps:"
echo "1. Update Docker Compose files to use secrets retrieval"
echo "2. Implement secrets loading in application startup"
echo "3. Update CI/CD pipeline to inject secrets at runtime"
echo "4. Test secret rotation procedures"
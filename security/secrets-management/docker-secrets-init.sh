#!/bin/bash
# ASI Chain - Docker Secrets Initialization Script
# This script loads secrets from AWS Secrets Manager and sets environment variables

set -euo pipefail

echo "🔐 Loading secrets from AWS Secrets Manager..."

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
SECRET_PREFIX=${AWS_SECRET_PREFIX:-asi-chain}

# Function to get secret value
get_secret() {
    local secret_name="$1"
    local full_name="${SECRET_PREFIX}/${secret_name}"
    
    aws secretsmanager get-secret-value \
        --secret-id "$full_name" \
        --region "$AWS_REGION" \
        --query SecretString \
        --output text 2>/dev/null || {
        echo "ERROR: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Function to extract JSON field
extract_json_field() {
    local json="$1"
    local field="$2"
    echo "$json" | jq -r ".$field" 2>/dev/null || echo ""
}

# Load secrets and set environment variables
echo "📥 Loading Hasura admin secret..."
export HASURA_ADMIN_SECRET=$(get_secret "hasura-admin-secret")

echo "📥 Loading database configuration..."
DB_CONFIG=$(get_secret "database-config")
export DATABASE_HOST=$(extract_json_field "$DB_CONFIG" "host")
export DATABASE_PORT=$(extract_json_field "$DB_CONFIG" "port")
export DATABASE_NAME=$(extract_json_field "$DB_CONFIG" "database")
export DATABASE_USER=$(extract_json_field "$DB_CONFIG" "username")
export DATABASE_PASSWORD=$(extract_json_field "$DB_CONFIG" "password")
export DATABASE_SSL=$(extract_json_field "$DB_CONFIG" "ssl")
export DATABASE_POOL_SIZE=$(extract_json_field "$DB_CONFIG" "pool_size")

# Construct database URL
export DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?sslmode=require"

echo "📥 Loading API configuration..."
API_CONFIG=$(get_secret "api-config")
export JWT_SECRET=$(extract_json_field "$API_CONFIG" "jwt_secret")
export ENCRYPTION_KEY=$(extract_json_field "$API_CONFIG" "encryption_key")
export RATE_LIMIT_PER_MINUTE=$(extract_json_field "$API_CONFIG" "rate_limit_per_minute")

# Load CORS origins as space-separated string for easy parsing
CORS_ORIGINS=$(extract_json_field "$API_CONFIG" "cors_origins")
export CORS_ALLOWED_ORIGINS=$(echo "$CORS_ORIGINS" | jq -r '. | join(" ")' 2>/dev/null || echo "")

echo "📥 Loading additional secrets..."
export WALLETCONNECT_SECRET=$(get_secret "walletconnect-secret")

# Validate required secrets are loaded
validate_secrets() {
    local required_vars=(
        "HASURA_ADMIN_SECRET"
        "DATABASE_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            echo "ERROR: Required secret $var is not set" >&2
            exit 1
        fi
    done
}

validate_secrets

echo "✅ All secrets loaded successfully!"
echo "🚀 Starting application with secure configuration..."

# Execute the main application
exec "$@"
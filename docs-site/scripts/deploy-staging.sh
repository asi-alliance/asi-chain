#!/bin/bash

# ASI Chain Documentation - Staging Deployment Script
# Following Repository Operations standards (Section 5.2)

set -e

echo "====================================="
echo "ASI Chain Docs - Staging Deployment"
echo "====================================="

# Configuration
STAGING_HOST="${STAGING_HOST:-staging.docs.asi-chain.io}"
STAGING_USER="${STAGING_USER:-ubuntu}"
STAGING_PATH="/var/www/docs-staging"
BUILD_DIR="./build"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Pre-deployment checks (Repository Operations Section 9.1)
echo "Running pre-deployment checks..."

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build directory not found. Run 'npm run build' first."
fi

# Run tests (100% success rate required)
echo "Running test suite..."
npm test || print_error "Tests failed. 100% success rate required."

# Run link checker
echo "Checking for broken links..."
npm run check-links || print_error "Broken links detected."

# Build the documentation
echo "Building documentation..."
npm run build || print_error "Build failed."

# Deploy to staging
echo "Deploying to staging server..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    "$BUILD_DIR/" \
    "${STAGING_USER}@${STAGING_HOST}:${STAGING_PATH}/"

# Restart services on staging
echo "Restarting services..."
ssh "${STAGING_USER}@${STAGING_HOST}" << 'EOF'
    sudo systemctl restart nginx
    sudo systemctl restart pm2-docs
    
    # Health check
    sleep 5
    curl -f http://localhost:3000/health || exit 1
EOF

print_status "Deployment to staging completed successfully!"

# Run post-deployment tests
echo "Running post-deployment tests..."
curl -f "https://${STAGING_HOST}" || print_error "Site not accessible"
curl -f "https://${STAGING_HOST}/docs/intro" || print_error "Docs not accessible"

print_status "Post-deployment tests passed!"

echo "====================================="
echo "Staging URL: https://${STAGING_HOST}"
echo "====================================="
#!/bin/bash

# ASI Chain Documentation - Production Deployment Script
# Following Repository Operations standards (Section 5.2)

set -e

echo "======================================"
echo "ASI Chain Docs - Production Deployment"
echo "======================================"

# Configuration
PROD_HOST="${PROD_HOST:-docs.asi-chain.io}"
PROD_USER="${PROD_USER:-ubuntu}"
PROD_PATH="/var/www/docs"
BUILD_DIR="./build"
BACKUP_DIR="/var/backups/docs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Confirmation for production deployment
echo -e "${YELLOW}WARNING: You are about to deploy to PRODUCTION!${NC}"
read -p "Are you sure? (type 'yes' to continue): " confirmation
if [ "$confirmation" != "yes" ]; then
    print_error "Deployment cancelled."
fi

# Pre-deployment checks (Repository Operations Section 9.1)
echo "Running comprehensive pre-deployment checks..."

# 1. Test suite must pass at 100%
echo "Running full test suite..."
npm test || print_error "Tests failed. 100% success rate required for production."
npm run test:integration || print_error "Integration tests failed."
npm run test:performance || print_error "Performance tests failed."

# 2. Security audit
echo "Running security audit..."
npm audit --audit-level=moderate || print_error "Security vulnerabilities detected."

# 3. Lighthouse audit
echo "Running Lighthouse performance audit..."
npm run lighthouse || print_error "Lighthouse score below threshold (90)."

# 4. Build the documentation
echo "Building documentation for production..."
NODE_ENV=production npm run build || print_error "Production build failed."

# 5. Create backup of current production
echo "Creating backup of current production..."
ssh "${PROD_USER}@${PROD_HOST}" << EOF
    if [ -d "${PROD_PATH}" ]; then
        sudo mkdir -p "${BACKUP_DIR}"
        sudo tar -czf "${BACKUP_DIR}/backup-\$(date +%Y%m%d-%H%M%S).tar.gz" "${PROD_PATH}"
        echo "Backup created successfully"
    fi
EOF

# 6. Deploy to production
echo "Deploying to production server..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    "$BUILD_DIR/" \
    "${PROD_USER}@${PROD_HOST}:${PROD_PATH}/"

# 7. Update and restart services
echo "Updating production services..."
ssh "${PROD_USER}@${PROD_HOST}" << 'ENDSSH'
    # Reload Nginx configuration
    sudo nginx -t && sudo systemctl reload nginx
    
    # Restart PM2 process
    pm2 restart docs-site
    pm2 save
    
    # Clear CDN cache if configured
    if [ -n "$CDN_PURGE_URL" ]; then
        curl -X POST "$CDN_PURGE_URL"
    fi
    
    # Health check
    sleep 10
    curl -f http://localhost:3000/health || exit 1
ENDSSH

print_status "Deployment to production completed!"

# 8. Post-deployment verification
echo "Running post-deployment verification..."

# Check main site
curl -f "https://${PROD_HOST}" || print_error "Main site not accessible"

# Check documentation
curl -f "https://${PROD_HOST}/docs/intro" || print_error "Documentation not accessible"

# Check API endpoints
curl -f "https://${PROD_HOST}/api/health" || print_warning "API health check failed"

# Check sitemap
curl -f "https://${PROD_HOST}/sitemap.xml" || print_warning "Sitemap not accessible"

# 9. Monitor for 5 minutes
echo "Monitoring deployment for 5 minutes..."
for i in {1..5}; do
    sleep 60
    echo "Minute $i/5: Checking site health..."
    curl -sf "https://${PROD_HOST}/health" || print_warning "Health check failed at minute $i"
done

print_status "Production deployment successful and stable!"

# 10. Send notification
echo "Sending deployment notification..."
cat << EOF > /tmp/deployment-notification.txt
ASI Chain Documentation Deployed to Production

Time: $(date)
Version: $(git rev-parse --short HEAD)
URL: https://${PROD_HOST}

All tests passed, deployment successful.
EOF

# Send notification (configure your notification method)
# mail -s "ASI Docs Production Deployment" team@asi-chain.io < /tmp/deployment-notification.txt

echo "======================================"
echo "Production URL: https://${PROD_HOST}"
echo "Deployment Complete!"
echo "======================================" 
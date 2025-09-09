#!/bin/bash
# ASI Chain Documentation Deployment Script
# Deploy to AWS Lightsail server

set -e

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="${1:-docs.asi-chain.io}"
REMOTE_DIR="/var/www/asi-docs"
BUILD_DIR="./build"
PM2_APP_NAME="asi-docs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ASI Chain Documentation Deployment${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if host is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./deploy.sh <server-ip-or-domain>${NC}"
    echo -e "${YELLOW}Example: ./deploy.sh 54.123.45.67${NC}"
    echo -e "${YELLOW}Using default: docs.asi-chain.io${NC}"
fi

# Build the documentation
echo -e "\n${GREEN}Building documentation...${NC}"
npm run build

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}Build failed! Build directory not found.${NC}"
    exit 1
fi

# Create tar archive of build
echo -e "\n${GREEN}Creating deployment archive...${NC}"
tar -czf docs-build.tar.gz -C $BUILD_DIR .

# Upload to server
echo -e "\n${GREEN}Uploading to server...${NC}"
scp docs-build.tar.gz $REMOTE_USER@$REMOTE_HOST:/tmp/

# Deploy on server
echo -e "\n${GREEN}Deploying on server...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
    set -e
    
    # Create backup of current deployment
    if [ -d "/var/www/asi-docs" ]; then
        echo "Creating backup..."
        sudo tar -czf /var/www/asi-docs-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www/asi-docs .
    fi
    
    # Extract new deployment
    echo "Extracting new deployment..."
    sudo mkdir -p /var/www/asi-docs
    sudo tar -xzf /tmp/docs-build.tar.gz -C /var/www/asi-docs
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/asi-docs
    sudo chmod -R 755 /var/www/asi-docs
    
    # Clean up
    rm /tmp/docs-build.tar.gz
    
    # Reload Nginx
    echo "Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "Deployment complete!"
ENDSSH

# Clean up local archive
rm docs-build.tar.gz

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment successful!${NC}"
echo -e "${GREEN}Site: https://${REMOTE_HOST}${NC}"
echo -e "${GREEN}=====================================${NC}"
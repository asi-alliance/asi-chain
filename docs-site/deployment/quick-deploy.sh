#!/bin/bash
# Quick deployment script - run from local machine
# This builds locally and deploys to server

set -e

# Configuration
SERVER_IP="${1:-13.251.66.61}"
SSH_KEY="${2:-/XXXXXXX.pem}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ASI Chain Docs - Quick Deploy${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this from the docs-site directory${NC}"
    exit 1
fi

# Build documentation locally
echo -e "\n${GREEN}Building documentation locally...${NC}"
npm install
npm run build

# Create deployment package
echo -e "\n${GREEN}Creating deployment package...${NC}"
tar -czf deploy-package.tar.gz build/ deployment/

# Copy package to server
echo -e "\n${GREEN}Copying to server...${NC}"
scp -i $SSH_KEY deploy-package.tar.gz ubuntu@$SERVER_IP:/tmp/

# Setup and deploy on server
echo -e "\n${GREEN}Setting up server...${NC}"
ssh -i $SSH_KEY ubuntu@$SERVER_IP << 'ENDSSH'
set -e

# Colors for remote output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Installing dependencies...${NC}"

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx ufw

# Install PM2
sudo npm install -g pm2

# Extract deployment package
cd /tmp
tar -xzf deploy-package.tar.gz

# Setup web directory
sudo mkdir -p /var/www/asi-docs
sudo cp -r build/* /var/www/asi-docs/
sudo chown -R www-data:www-data /var/www/asi-docs

# Configure Nginx
sudo tee /etc/nginx/sites-available/asi-docs > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    root /var/www/asi-docs;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/asi-docs /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Clean up
rm /tmp/deploy-package.tar.gz
rm -rf /tmp/build /tmp/deployment

echo -e "${GREEN}Server setup complete!${NC}"
ENDSSH

# Clean up local package
rm deploy-package.tar.gz

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Site: http://$SERVER_IP${NC}"
echo -e "${GREEN}=====================================${NC}"
#!/bin/bash
# ASI Chain Documentation Server Setup
# Run this after creating AWS Lightsail instance

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ASI Chain Documentation Server Setup${NC}"
echo -e "${GREEN}=====================================${NC}"

# Update system
echo -e "\n${GREEN}Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install essential packages
echo -e "\n${GREEN}Installing essential packages...${NC}"
sudo apt-get install -y \
    curl \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

# Install Node.js 20.x
echo -e "\n${GREEN}Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)
echo -e "${GREEN}Node.js installed: $node_version${NC}"
echo -e "${GREEN}npm installed: $npm_version${NC}"

# Install PM2
echo -e "\n${GREEN}Installing PM2...${NC}"
sudo npm install -g pm2

# Create web directory
echo -e "\n${GREEN}Creating web directory...${NC}"
sudo mkdir -p /var/www/asi-docs
sudo chown -R $USER:www-data /var/www/asi-docs
sudo chmod -R 755 /var/www/asi-docs

# Clone repository
echo -e "\n${GREEN}Cloning ASI Chain repository...${NC}"
cd /tmp
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain/docs-site

# Install dependencies
echo -e "\n${GREEN}Installing dependencies...${NC}"
npm install

# Build documentation
echo -e "\n${GREEN}Building documentation...${NC}"
npm run build

# Copy build to web directory
echo -e "\n${GREEN}Copying build to web directory...${NC}"
sudo cp -r build/* /var/www/asi-docs/
sudo chown -R www-data:www-data /var/www/asi-docs

# Configure Nginx
echo -e "\n${GREEN}Configuring Nginx...${NC}"
sudo cp nginx/docs-site.conf /etc/nginx/sites-available/asi-docs
sudo ln -sf /etc/nginx/sites-available/asi-docs /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Configure firewall
echo -e "\n${GREEN}Configuring firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Restart Nginx
echo -e "\n${GREEN}Starting Nginx...${NC}"
sudo systemctl restart nginx
sudo systemctl enable nginx

# Set up PM2 startup
echo -e "\n${GREEN}Setting up PM2 startup...${NC}"
pm2 startup systemd -u $USER --hp $HOME
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Clean up
echo -e "\n${GREEN}Cleaning up...${NC}"
cd /
rm -rf /tmp/asi-chain

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Server setup complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Point your domain to this server's IP${NC}"
echo -e "${YELLOW}2. Run: sudo certbot --nginx -d your-domain.com${NC}"
echo -e "${YELLOW}3. Visit: http://your-server-ip${NC}"
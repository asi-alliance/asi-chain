#!/bin/bash
# SSL Certificate Setup for ASI Chain Documentation
# Run this after domain is pointing to server

set -e

# Configuration
DOMAIN="${1:-docs.asi-chain.io}"
EMAIL="${2:-admin@asi-chain.io}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}SSL Certificate Setup${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./ssl-setup.sh <domain> [email]${NC}"
    echo -e "${YELLOW}Example: ./ssl-setup.sh docs.asi-chain.io admin@asi-chain.io${NC}"
    echo -e "${YELLOW}Using defaults: $DOMAIN $EMAIL${NC}"
fi

# Test if domain is pointing to this server
echo -e "\n${GREEN}Testing domain DNS...${NC}"
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo -e "${RED}Warning: Domain $DOMAIN (IP: $DOMAIN_IP) is not pointing to this server (IP: $SERVER_IP)${NC}"
    echo -e "${YELLOW}Make sure your DNS is configured correctly before continuing.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo -e "\n${GREEN}Installing Certbot...${NC}"
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
echo -e "\n${GREEN}Obtaining SSL certificate for $DOMAIN...${NC}"
sudo certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

# Test auto-renewal
echo -e "\n${GREEN}Testing certificate renewal...${NC}"
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo -e "\n${GREEN}Setting up auto-renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Restart Nginx
echo -e "\n${GREEN}Restarting Nginx...${NC}"
sudo systemctl restart nginx

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}SSL setup complete!${NC}"
echo -e "${GREEN}Site: https://$DOMAIN${NC}"
echo -e "${GREEN}Certificate will auto-renew${NC}"
echo -e "${GREEN}=====================================${NC}"
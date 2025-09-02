#!/bin/bash
# AWS Lightsail Launch Script for ASI Chain Documentation
# This script runs on first boot to set up the server

# Update system
apt-get update
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create web directory
mkdir -p /var/www/asi-docs

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create deployment user (optional)
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy
usermod -aG www-data deploy

# Set up PM2 startup
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "==================================="
echo "Server initialization complete!"
echo "==================================="
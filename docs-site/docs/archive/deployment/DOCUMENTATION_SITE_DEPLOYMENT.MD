# ASI Chain Documentation Site Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the ASI Chain documentation site to AWS Lightsail, following Repository Operations standards.

## Prerequisites

### Local Development
- Node.js 20.x LTS
- npm 10.x or higher
- Git
- Docker (optional, for local testing)

### AWS Lightsail Instance
- Ubuntu 22.04 LTS
- Minimum 2GB RAM, 2 vCPUs
- 60GB SSD storage
- Static IP assigned
- Ports 80, 443, 22 open

## Initial Server Setup

### 1. Connect to Server
```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### 3. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x
```

### 4. Install PM2
```bash
sudo npm install -g pm2
pm2 startup systemd
# Follow the command provided by PM2
```

### 5. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 6. Install Certbot for SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
```

## Deployment Steps

### 1. Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/asi-alliance/asi-chain.git
sudo chown -R ubuntu:ubuntu asi-chain
cd asi-chain/docs-site
```

### 2. Install Dependencies
```bash
npm ci --production
```

### 3. Build Documentation
```bash
npm run build
```

### 4. Configure Nginx
```bash
# Copy configuration
sudo cp nginx/docs-site.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/docs-site.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Obtain SSL Certificate
```bash
sudo certbot --nginx -d docs.asi-chain.io
# Follow the prompts
```

### 6. Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

## Environment Configuration

### Environment Variables
Create `/var/www/asi-chain/docs-site/.env`:
```env
NODE_ENV=production
PORT=3000
SITE_URL=https://docs.asi-chain.io
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_api_key
```

### Secrets Management
Store sensitive data in environment variables:
```bash
# Add to ~/.bashrc or /etc/environment
export PROD_HOST=docs.asi-chain.io
export PROD_USER=ubuntu
export STAGING_HOST=staging.docs.asi-chain.io
```

## Monitoring Setup

### 1. PM2 Monitoring
```bash
# View logs
pm2 logs asi-docs

# Monitor processes
pm2 monit

# View metrics
pm2 info asi-docs
```

### 2. Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/docs-asi-chain-access.log

# Error logs
tail -f /var/log/nginx/docs-asi-chain-error.log
```

### 3. Health Checks
```bash
# Internal health check
curl http://localhost:3000/health

# External health check
curl https://docs.asi-chain.io/health
```

## Automated Deployment

### GitHub Actions Setup
1. Add secrets to GitHub repository:
   - `PROD_HOST`: Production server IP
   - `PROD_USER`: SSH username
   - `PROD_SSH_KEY`: Private SSH key
   - `STAGING_HOST`: Staging server IP
   - `STAGING_USER`: Staging SSH username
   - `STAGING_SSH_KEY`: Staging private SSH key

2. Push to trigger deployment:
```bash
# Deploy to staging
git push origin feature/documentation-site

# Deploy to production
git push origin main
```

### Manual Deployment
```bash
# From local machine
npm run deploy:staging  # Deploy to staging
npm run deploy:production  # Deploy to production
```

## Backup Procedures

### Automated Backups
Create `/etc/cron.d/asi-docs-backup`:
```cron
0 2 * * * ubuntu /var/www/asi-chain/docs-site/scripts/backup.sh
```

### Manual Backup
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/asi-chain/docs-site/build
```

## Rollback Procedures

### Quick Rollback
```bash
# Stop current version
pm2 stop asi-docs

# Restore from backup
cd /var/www/asi-chain/docs-site
tar -xzf /var/backups/docs/backup-YYYYMMDD.tar.gz

# Restart service
pm2 restart asi-docs
```

### Git-based Rollback
```bash
cd /var/www/asi-chain
git fetch origin
git checkout <previous-commit-hash>
cd docs-site
npm ci
npm run build
pm2 restart asi-docs
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules build
npm ci
npm run build
```

#### 2. PM2 Not Starting
```bash
# Check logs
pm2 logs asi-docs --lines 100

# Restart with verbose output
pm2 delete asi-docs
pm2 start ecosystem.config.js --env production --log-type json
```

#### 3. Nginx 502 Bad Gateway
```bash
# Check if PM2 is running
pm2 status

# Check port binding
sudo netstat -tlnp | grep 3000

# Restart services
pm2 restart asi-docs
sudo systemctl restart nginx
```

#### 4. SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

## Performance Optimization

### 1. Enable Caching
Already configured in Nginx configuration.

### 2. CDN Setup (Optional)
```bash
# CloudFlare configuration
# Point domain to CloudFlare
# Enable caching and optimization features
```

### 3. Compression
Gzip compression enabled in Nginx configuration.

## Security Hardening

### 1. Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Setup
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Regular Updates
```bash
# Set up unattended upgrades
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## Monitoring Alerts

### Setup Uptime Monitoring
1. Register with UptimeRobot or similar
2. Add monitor for https://docs.asi-chain.io
3. Configure alerts for downtime

### Log Monitoring
```bash
# Install logwatch
sudo apt install logwatch

# Configure daily reports
sudo vi /etc/cron.daily/00logwatch
```

## Maintenance Schedule

### Daily
- Check health endpoint
- Review error logs
- Monitor disk space

### Weekly  
- Review access logs
- Check SSL certificate expiry
- Update dependencies (staging first)

### Monthly
- Security updates
- Performance review
- Backup verification

## Contact Information

### Support
- GitHub Issues: https://github.com/asi-alliance/asi-chain/issues
- Email: support@asi-chain.io

### Emergency Contacts
- DevOps Lead: devops@asi-chain.io
- On-call: Available in PagerDuty

---

*Last Updated: 2025*  
*Part of the ASI Chain Documentation*
# AWS Lightsail Deployment Guide

Complete guide for deploying ASI Chain documentation to AWS Lightsail.

## Prerequisites

- AWS account with Lightsail access
- Domain name (optional, for custom domain)
- SSH key pair for server access

## Step 1: Create Lightsail Instance

### 1.1 Login to AWS Lightsail Console
Navigate to: https://lightsail.aws.amazon.com/

### 1.2 Create Instance
1. Click **"Create instance"**
2. Select platform: **Linux/Unix**
3. Select blueprint: **OS Only → Ubuntu 22.04 LTS**
4. Choose instance plan:
   - **Recommended**: $10 USD/month (2 GB RAM, 1 vCPU, 60 GB SSD)
   - **Minimum**: $5 USD/month (1 GB RAM, 1 vCPU, 40 GB SSD)
5. Name your instance: `asi-docs-server`
6. Add launch script:
   ```bash
   #!/bin/bash
   curl -o /tmp/lightsail-launch.sh https://raw.githubusercontent.com/asi-alliance/asi-chain/main/docs-site/deployment/lightsail-launch-script.sh
   chmod +x /tmp/lightsail-launch.sh
   /tmp/lightsail-launch.sh
   ```
7. Create instance

### 1.3 Wait for Instance to Start
- Status will change from "Pending" to "Running"
- This typically takes 2-3 minutes

## Step 2: Connect to Server

### 2.1 Download SSH Key
1. Go to **Account → SSH keys**
2. Download default key or create new one
3. Save as `asi-docs.pem`
4. Set permissions:
   ```bash
   chmod 400 ~/Downloads/asi-docs.pem
   ```

### 2.2 Get Instance IP
1. Click on your instance name
2. Note the **Public IP** address

### 2.3 Connect via SSH
```bash
ssh -i ~/Downloads/asi-docs.pem ubuntu@YOUR_SERVER_IP
```

## Step 3: Setup Server

### 3.1 Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain/docs-site/deployment
```

### 3.2 Run Setup Script
```bash
chmod +x server-setup.sh
./server-setup.sh
```

This script will:
- Update system packages
- Install Node.js 20.x
- Install PM2 and Nginx
- Build documentation
- Configure web server
- Setup firewall

### 3.3 Verify Installation
```bash
# Check Node.js
node -v  # Should show v20.x.x

# Check Nginx
sudo systemctl status nginx  # Should show "active (running)"

# Check site
curl http://localhost  # Should return HTML
```

## Step 4: Configure Domain (Optional)

### 4.1 Create Static IP
1. Go to Lightsail **Networking** tab
2. Click **"Create static IP"**
3. Attach to your instance
4. Name it: `asi-docs-ip`

### 4.2 Configure DNS
Add DNS records to your domain:
- **A Record**: `docs` → `YOUR_STATIC_IP`
- **A Record**: `www.docs` → `YOUR_STATIC_IP`

### 4.3 Wait for DNS Propagation
```bash
# Test DNS
dig docs.asi-chain.io
nslookup docs.asi-chain.io
```

## Step 5: Setup SSL Certificate

### 5.1 Run SSL Setup Script
```bash
cd /home/ubuntu/asi-chain/docs-site/deployment
chmod +x ssl-setup.sh
./ssl-setup.sh docs.asi-chain.io admin@asi-chain.io
```

### 5.2 Verify SSL
- Visit: https://docs.asi-chain.io
- Check for green padlock in browser

## Step 6: Deploy Updates

### 6.1 From Local Machine
```bash
cd /path/to/asi-chain/docs-site
./deployment/deploy.sh YOUR_SERVER_IP
```

### 6.2 From GitHub Actions
Push to main branch triggers automatic deployment.

## Step 7: Monitoring

### 7.1 Setup Monitoring
```bash
# On server
cd /home/ubuntu/asi-chain/docs-site/deployment
chmod +x monitoring-setup.sh
./monitoring-setup.sh
```

### 7.2 Check Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PM2 logs (if using for Node.js app)
pm2 logs
```

### 7.3 Server Metrics
In Lightsail console:
1. Click on instance
2. Go to **Metrics** tab
3. View CPU, Network, Disk metrics

## Step 8: Backup Configuration

### 8.1 Create Snapshot
In Lightsail console:
1. Go to **Snapshots** tab
2. Create manual snapshot
3. Name: `asi-docs-backup-YYYY-MM-DD`

### 8.2 Enable Automatic Snapshots
1. Go to **Snapshots** tab
2. Enable automatic snapshots
3. Set time: 3:00 AM UTC
4. Retention: 7 days

## Maintenance

### Update Documentation
```bash
# From local machine
cd asi-chain/docs-site
npm run build
./deployment/deploy.sh docs.asi-chain.io
```

### Update Server Software
```bash
# On server
sudo apt update
sudo apt upgrade -y
sudo reboot  # If kernel updates
```

### Renew SSL Certificate
```bash
# Automatic renewal is configured
# Manual renewal if needed:
sudo certbot renew
```

## Troubleshooting

### Site Not Loading
```bash
# Check Nginx
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx

# Check firewall
sudo ufw status
sudo ufw allow 'Nginx Full'
```

### SSL Certificate Issues
```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Build Failures
```bash
# Check Node.js version
node -v  # Should be 20.x

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Server Out of Space
```bash
# Check disk usage
df -h

# Clean up old backups
ls -la /var/www/ | grep backup
sudo rm /var/www/asi-docs-backup-*.tar.gz

# Clean npm cache
npm cache clean --force
```

## Security Best Practices

1. **Keep Server Updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure Firewall**
   ```bash
   sudo ufw status
   # Only SSH, HTTP, HTTPS should be allowed
   ```

3. **Use SSH Keys Only**
   ```bash
   # Disable password authentication
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

4. **Regular Backups**
   - Enable automatic snapshots
   - Test restore procedure

5. **Monitor Access Logs**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

## Estimated Costs

- **Lightsail Instance**: $10/month (recommended)
- **Static IP**: Free (while attached)
- **Snapshots**: $0.05/GB/month
- **Data Transfer**: 
  - First 3TB free
  - $0.09/GB after that
- **Total**: ~$10-15/month

## Support

For issues or questions:
- GitHub Issues: https://github.com/asi-alliance/asi-chain/issues
- Documentation: https://docs.asi-chain.io
- AWS Support: https://console.aws.amazon.com/support
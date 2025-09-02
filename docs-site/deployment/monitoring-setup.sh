#!/bin/bash
# Monitoring Setup for ASI Chain Documentation Server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Monitoring Setup${NC}"
echo -e "${GREEN}=====================================${NC}"

# Install monitoring tools
echo -e "\n${GREEN}Installing monitoring tools...${NC}"
sudo apt-get update
sudo apt-get install -y \
    htop \
    iotop \
    nethogs \
    ncdu \
    vnstat

# Setup log rotation for Nginx
echo -e "\n${GREEN}Configuring log rotation...${NC}"
cat << 'EOF' | sudo tee /etc/logrotate.d/asi-docs
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

# Create monitoring script
echo -e "\n${GREEN}Creating health check script...${NC}"
cat << 'EOF' | sudo tee /usr/local/bin/check-asi-docs
#!/bin/bash
# ASI Docs Health Check

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "ERROR: Nginx is not running"
    sudo systemctl start nginx
    echo "Attempted to restart Nginx"
fi

# Check if site is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
    echo "ERROR: Site returned HTTP $HTTP_CODE"
    sudo systemctl restart nginx
    echo "Restarted Nginx due to bad HTTP response"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "WARNING: Disk usage is at ${DISK_USAGE}%"
    # Clean old logs
    find /var/log -type f -name "*.gz" -mtime +30 -delete
    echo "Cleaned old compressed logs"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "WARNING: Memory usage is at ${MEM_USAGE}%"
fi

echo "Health check completed at $(date)"
EOF

sudo chmod +x /usr/local/bin/check-asi-docs

# Setup cron job for health checks
echo -e "\n${GREEN}Setting up automated health checks...${NC}"
(crontab -l 2>/dev/null || true; echo "*/5 * * * * /usr/local/bin/check-asi-docs >> /var/log/asi-docs-health.log 2>&1") | crontab -

# Create status dashboard script
echo -e "\n${GREEN}Creating status dashboard...${NC}"
cat << 'EOF' | sudo tee /usr/local/bin/asi-docs-status
#!/bin/bash
# ASI Docs Status Dashboard

clear
echo "======================================"
echo "ASI Chain Documentation Server Status"
echo "======================================"
echo ""

# System Info
echo "System Information:"
echo "-------------------"
echo "Hostname: $(hostname)"
echo "IP Address: $(curl -s ifconfig.me)"
echo "Uptime: $(uptime -p)"
echo ""

# Service Status
echo "Service Status:"
echo "---------------"
echo -n "Nginx: "
systemctl is-active nginx || echo "STOPPED"
echo -n "UFW Firewall: "
sudo ufw status | grep -q "Status: active" && echo "ACTIVE" || echo "INACTIVE"
echo ""

# Resource Usage
echo "Resource Usage:"
echo "---------------"
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -h | awk 'NR==2 {printf "%s/%s (%.1f%%)\n", $3, $2, $3/$2*100}')"
echo "Disk: $(df -h / | awk 'NR==2 {printf "%s/%s (%s)\n", $3, $2, $5}')"
echo ""

# Network Stats
echo "Network Statistics (last 24h):"
echo "------------------------------"
vnstat -d 1 2>/dev/null || echo "Network stats not available yet"
echo ""

# Recent Errors
echo "Recent Nginx Errors (last 10):"
echo "-------------------------------"
sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null | grep -v "^\s*$" || echo "No recent errors"
echo ""

# SSL Certificate Status
echo "SSL Certificate Status:"
echo "----------------------"
if [ -f /etc/letsencrypt/renewal/docs.asi-chain.io.conf ]; then
    sudo certbot certificates 2>/dev/null | grep -E "Domains:|Expiry" || echo "Certificate info not available"
else
    echo "No SSL certificate configured"
fi
EOF

sudo chmod +x /usr/local/bin/asi-docs-status

# Create simple web endpoint for monitoring
echo -e "\n${GREEN}Creating monitoring endpoint...${NC}"
cat << 'EOF' | sudo tee /var/www/asi-docs/health
{
  "status": "healthy",
  "timestamp": "$(date -Iseconds)",
  "service": "asi-chain-docs"
}
EOF

# Setup network monitoring
echo -e "\n${GREEN}Configuring network monitoring...${NC}"
sudo systemctl enable vnstat
sudo systemctl start vnstat

# Create backup script
echo -e "\n${GREEN}Creating backup script...${NC}"
cat << 'EOF' | sudo tee /usr/local/bin/backup-asi-docs
#!/bin/bash
# Backup ASI Docs

BACKUP_DIR="/var/backups/asi-docs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/asi-docs-$TIMESTAMP.tar.gz"

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Create backup
sudo tar -czf $BACKUP_FILE -C /var/www asi-docs

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_FILE"
EOF

sudo chmod +x /usr/local/bin/backup-asi-docs

# Setup daily backup
(crontab -l 2>/dev/null || true; echo "0 3 * * * /usr/local/bin/backup-asi-docs >> /var/log/asi-docs-backup.log 2>&1") | crontab -

echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Monitoring setup complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${YELLOW}Available commands:${NC}"
echo -e "${YELLOW}- asi-docs-status    : View server status${NC}"
echo -e "${YELLOW}- check-asi-docs     : Run health check${NC}"
echo -e "${YELLOW}- backup-asi-docs    : Create manual backup${NC}"
echo -e "${YELLOW}- htop               : Interactive process viewer${NC}"
echo -e "${YELLOW}- vnstat             : Network statistics${NC}"
#\!/bin/bash
# Security hardening script for F1R3FLY

echo "Starting security hardening..."

# 1. SSH Hardening
echo "Configuring SSH..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
echo "SSH configuration updated (backup saved)"

# 2. Install fail2ban
echo "Installing fail2ban..."
sudo apt-get update > /dev/null 2>&1
sudo apt-get install -y fail2ban > /dev/null 2>&1
echo "fail2ban installed"

# 3. Configure fail2ban for SSH
echo "Configuring fail2ban..."
sudo cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
F2B
sudo systemctl restart fail2ban
echo "fail2ban configured"

# 4. Set file permissions
echo "Setting file permissions..."
chmod 600 /home/ubuntu/f1r3fly/docker/.env
chmod 600 /home/ubuntu/devnet.pem 2>/dev/null
echo "File permissions updated"

# 5. Create secure password for services
echo "Generating secure passwords..."
GRAFANA_PASS=$(openssl rand -base64 20)
echo "New Grafana password: $GRAFANA_PASS"
echo "Grafana password: $GRAFANA_PASS" > /home/ubuntu/.credentials
chmod 600 /home/ubuntu/.credentials

# 6. Enable automatic security updates
echo "Enabling automatic security updates..."
sudo apt-get install -y unattended-upgrades > /dev/null 2>&1
sudo dpkg-reconfigure -plow unattended-upgrades

echo ""
echo "Security hardening complete\!"
echo ""
echo "IMPORTANT ACTIONS REQUIRED:"
echo "1. Restart SSH service: sudo systemctl restart sshd"
echo "2. Update Grafana password with value in ~/.credentials"
echo "3. Review and restrict firewall rules for production"
echo "4. Replace test keys in .env file"
echo ""
echo "WARNING: After SSH restart, only key-based auth will work\!"

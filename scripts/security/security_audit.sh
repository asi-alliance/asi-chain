#\!/bin/bash
# Security audit script

echo "====================================="
echo "F1R3FLY Security Audit"
echo "Date: $(date)"
echo "====================================="

echo -e "\n1. SSH Security"
echo "----------------"
grep -E "^PermitRootLogin|^PasswordAuthentication" /etc/ssh/sshd_config || echo "Default SSH settings"

echo -e "\n2. Open Ports"
echo "-------------"
sudo ss -tulpn | grep LISTEN | grep -v "127.0.0.1"

echo -e "\n3. Failed Login Attempts (last 24h)"
echo "------------------------------------"
sudo grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %e')" | wc -l

echo -e "\n4. Docker Security"
echo "------------------"
docker version --format 'Docker {{.Server.Version}}'
echo "Containers running as root:"
docker ps --format 'table {{.Names}}\t{{.Image}}' | head -10

echo -e "\n5. Firewall Status"
echo "------------------"
sudo ufw status numbered

echo -e "\n6. System Updates"
echo "-----------------"
apt list --upgradable 2>/dev/null | head -5

echo -e "\n7. Sensitive Files"
echo "------------------"
echo "Checking for exposed keys..."
find /home/ubuntu/f1r3fly/docker -name "*.env" -o -name "*.key" 2>/dev/null | head -5

echo -e "\nSecurity audit complete\!"

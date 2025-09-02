#\!/bin/bash
# Daily health check script

echo "====================================="
echo "F1R3FLY Network Health Check"
echo "Date: $(date)"
echo "====================================="

# Container status
echo -e "\n1. CONTAINER STATUS"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'rnode|autopropose|NAME'

# Resource usage
echo -e "\n2. RESOURCE USAGE"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'

# Disk usage
echo -e "\n3. DISK USAGE"
df -h /

# System load
echo -e "\n4. SYSTEM LOAD"
uptime

# Check API
echo -e "\n5. API STATUS"
curl -s http://localhost:40403/status > /dev/null && echo "Bootstrap API: OK" || echo "Bootstrap API: FAILED"

echo -e "\n====================================="

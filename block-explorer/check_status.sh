#!/bin/bash

echo "=== Block Explorer Status Check ==="
echo "Time: $(date)"
echo

# Check container status
echo "1. Docker Container Status:"
docker ps -a | grep -E "(NAMES|readonly)" | grep -v grep
echo

# Check latest block
echo "2. Latest Block in Database:"
sqlite3 data/asi-chain.db "SELECT block_number, block_hash, datetime(created_at) as timestamp FROM blocks ORDER BY block_number DESC LIMIT 1;" 2>/dev/null
echo

# Check parser process
echo "3. Parser Process:"
ps aux | grep -E "log_parser.py" | grep -v grep || echo "Parser not running!"
echo

# Check web app
echo "4. Web App Process:"
ps aux | grep -E "app.py" | grep -v grep || echo "Web app not running!"
echo

# Check database size
echo "5. Database Size:"
ls -lh data/asi-chain.db 2>/dev/null
echo

# Check if web interface is accessible
echo "6. Web Interface:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080 || echo "Web interface not accessible!"
echo

echo "=== End Status Check ==="
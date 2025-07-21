#!/bin/bash
# Start all block explorer components

echo "Starting ASI-Chain Block Explorer..."
echo "=================================="

# Kill any existing processes
echo "Cleaning up old processes..."
pkill -f "log_parser.py" 2>/dev/null
pkill -f "app.py" 2>/dev/null
sleep 2

# Start the enhanced parser (with full hashes)
echo "Starting enhanced parser..."
(cd parser && nohup python enhanced_parser.py > ../enhanced_parser.log 2>&1 &)
echo "Enhanced parser started."

# Start the web app
echo "Starting web application..."
(cd web && nohup python app.py > ../webapp.log 2>&1 &)
echo "Web app started."

sleep 3

# Check status
echo ""
echo "Checking status..."
./check_status.sh

echo ""
echo "Block Explorer is running!"
echo "Access it at: http://localhost:8080"
echo ""
echo "To monitor services, run in another terminal:"
echo "python monitor_services.py"
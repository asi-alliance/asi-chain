#!/bin/bash
# Docker entrypoint for ASI Chain Block Explorer

echo "Starting ASI Chain Block Explorer..."
echo "Configuration:"
echo "  - RNode Container: $RNODE_CONTAINER_NAME"
echo "  - Database: $DB_PATH"
echo "  - Web Port: $WEB_PORT"
echo "  - Update Interval: $UPDATE_INTERVAL seconds"

# Start parser in background
echo "Starting blockchain parser..."
python parser/docker_enhanced_parser.py &
PARSER_PID=$!

# Start web server
echo "Starting web interface on port $WEB_PORT..."
python web/docker_app.py &
WEB_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $PARSER_PID $WEB_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT

# Wait for both processes
wait $PARSER_PID $WEB_PID
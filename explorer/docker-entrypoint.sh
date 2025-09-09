#!/bin/sh

# ASI-Chain Explorer Docker Entrypoint Script
# This script handles environment variable substitution in production builds

set -e

# Function to replace environment variables in built files
replace_env_vars() {
    echo "🔧 Configuring environment variables..."
    
    # Find the main JS file
    MAIN_JS=$(find /usr/share/nginx/html/static/js -name "main.*.js" | head -1)
    
    if [ -n "$MAIN_JS" ]; then
        echo "📄 Found main JS file: $MAIN_JS"
        
        # Replace environment variables
        sed -i "s|REACT_APP_GRAPHQL_URL_PLACEHOLDER|${REACT_APP_GRAPHQL_URL:-http://localhost:8080/v1/graphql}|g" "$MAIN_JS"
        sed -i "s|REACT_APP_GRAPHQL_WS_URL_PLACEHOLDER|${REACT_APP_GRAPHQL_WS_URL:-ws://localhost:8080/v1/graphql}|g" "$MAIN_JS"
        sed -i "s|REACT_APP_RCHAIN_NODE_URL_PLACEHOLDER|${REACT_APP_RCHAIN_NODE_URL:-http://localhost:40453}|g" "$MAIN_JS"
        
        echo "✅ Environment variables configured"
    else
        echo "⚠️  Main JS file not found, using default configuration"
    fi
}

# Replace environment variables if in production mode
if [ "${NODE_ENV:-production}" = "production" ]; then
    replace_env_vars
fi

echo "🚀 Starting ASI-Chain Explorer..."

# Execute the main command
exec "$@"
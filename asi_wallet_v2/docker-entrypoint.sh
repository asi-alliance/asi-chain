#!/bin/sh

# This script injects environment variables into the built React app at runtime
# React apps normally bake in env vars at build time, but we want runtime configuration

# Create a config file that will be loaded by the app
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  REACT_APP_WALLETCONNECT_PROJECT_ID: "${REACT_APP_WALLETCONNECT_PROJECT_ID}",
  REACT_APP_RCHAIN_HTTP_URL: "${REACT_APP_RCHAIN_HTTP_URL}",
  REACT_APP_RCHAIN_GRPC_URL: "${REACT_APP_RCHAIN_GRPC_URL}",
  REACT_APP_RCHAIN_READONLY_URL: "${REACT_APP_RCHAIN_READONLY_URL}"
};
EOF

# Inject the script into index.html before other scripts
if [ -f /usr/share/nginx/html/index.html ]; then
  # Add env-config.js script tag to index.html if it doesn't exist
  if ! grep -q "env-config.js" /usr/share/nginx/html/index.html; then
    sed -i 's|</head>|<script src="/env-config.js"></script></head>|' /usr/share/nginx/html/index.html
  fi
fi

# Replace environment variables in nginx config
envsubst '${REACT_APP_RCHAIN_HTTP_URL} ${REACT_APP_RCHAIN_GRPC_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the CMD
exec "$@"
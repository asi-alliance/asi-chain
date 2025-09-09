# Explorer Environment Configuration Guide

## Overview

The ASI Chain Explorer can be configured to connect to different GraphQL endpoints using environment variables. This guide explains the available configurations.

## Environment Files

### 1. `.env` (Default)
- Points to **production server** (AWS Lightsail - 13.251.66.61)
- Used when no specific environment is set
- Does NOT include Hasura admin secret for security

### 2. `.env.local` 
- Points to **local Docker services** (localhost)
- Used for local development
- Includes Hasura admin secret for local testing

### 3. `.env.production`
- Points to **production server** (AWS Lightsail)
- Used for production builds
- Does NOT include Hasura admin secret (secure)

### 4. `.env.production.secure`
- Points to **production server** with admin secret
- ⚠️ **WARNING**: Contains Hasura admin secret
- Only use for testing or if you have proper security measures

## Usage

### Local Development
```bash
# Use local environment
cp .env.local .env
npm start
```

### Production Build (Secure)
```bash
# Use production environment without secrets
cp .env.production .env
npm run build
```

### Production Testing (With Admin Access)
```bash
# Use production environment with admin secret
# ⚠️ WARNING: Only for testing, not for public deployment
cp .env.production.secure .env
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_GRAPHQL_URL` | GraphQL HTTP endpoint | `http://13.251.66.61:8080/v1/graphql` |
| `REACT_APP_GRAPHQL_WS_URL` | GraphQL WebSocket endpoint | `ws://13.251.66.61:8080/v1/graphql` |
| `REACT_APP_INDEXER_API_URL` | Indexer REST API endpoint | `http://13.251.66.61:9090` |
| `REACT_APP_HASURA_ADMIN_SECRET` | Hasura admin secret (⚠️ sensitive) | `myadminsecretkey` |
| `REACT_APP_AUTH_TOKEN` | JWT auth token (if using auth) | Bearer token |
| `REACT_APP_NETWORK_NAME` | Network display name | `ASI Chain` |
| `REACT_APP_ENABLE_WEBSOCKETS` | Enable real-time updates | `true` |
| `REACT_APP_POLLING_INTERVAL` | Data refresh interval (ms) | `5000` |
| `REACT_APP_DEBUG_MODE` | Enable debug logging | `false` |

## Security Considerations

### ⚠️ Important Security Notes

1. **Never commit `.env` files with secrets to version control**
   - Add `.env*` to `.gitignore`
   - Use `.env.example` for templates

2. **Hasura Admin Secret**
   - Should NOT be exposed in client-side code
   - Ideally, use a backend proxy service
   - Only include for development/testing

3. **Production Deployment**
   - Use environment variables from CI/CD
   - Set up proper CORS policies
   - Consider using JWT authentication instead of admin secret

4. **Backend Proxy (Recommended)**
   - Create a backend service to proxy GraphQL requests
   - Keep admin secret on server-side only
   - Implement proper authentication/authorization

## Testing Connection

After setting up your environment:

```bash
# Test GraphQL endpoint
curl -X POST $REACT_APP_GRAPHQL_URL \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $REACT_APP_HASURA_ADMIN_SECRET" \
  -d '{"query": "{ blocks_aggregate { aggregate { count } } }"}'

# Test Indexer API
curl $REACT_APP_INDEXER_API_URL/status
```

## Troubleshooting

### Connection Refused
- Check if the server is running
- Verify firewall rules allow ports 8080 and 9090
- Ensure correct IP address/hostname

### Authentication Error
- Verify Hasura admin secret is correct
- Check if server requires authentication
- Ensure headers are properly set in apollo-client.ts

### WebSocket Connection Failed
- Check if WebSocket URL uses correct protocol (ws:// vs wss://)
- Verify server supports WebSocket connections
- Check firewall allows WebSocket traffic

## Next Steps

1. Choose appropriate environment file
2. Copy to `.env`
3. Run `npm start` or `npm run build`
4. Verify connection in browser console

For production deployment, consider setting up a backend proxy service to handle GraphQL requests securely.
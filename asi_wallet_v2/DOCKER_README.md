# ASI Wallet v2 - Docker Deployment Guide

This guide explains how to run ASI Wallet v2 using Docker Desktop on your local machine.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)
- 2GB of free disk space for the image

## Quick Start

1. **Build and run the wallet:**
   ```bash
   docker-compose up -d
   ```
   
   Note: First build may take 5-10 minutes due to npm dependencies

2. **Access the wallet:**
   Open your browser and go to: http://localhost:3000

3. **Stop the wallet:**
   ```bash
   docker-compose down
   ```

## Troubleshooting

If you encounter build errors related to module resolution:
1. Ensure the `config-overrides.js` file has proper webpack polyfills
2. The Docker image uses `npm install --legacy-peer-deps` to handle dependency conflicts
3. Check Docker logs: `docker-compose logs asi-wallet`

## Configuration

### Default Configuration

By default, the wallet will try to connect to a local RChain node running on your host machine at:
- HTTP API: http://localhost:40403
- gRPC: http://localhost:40401
- Read-only: http://localhost:40403

### Custom RChain Node

To connect to a different RChain node, create a `.env` file:

```bash
# .env
RCHAIN_HTTP_URL=http://your-rchain-node:40403
RCHAIN_GRPC_URL=http://your-rchain-node:40401
RCHAIN_READONLY_URL=http://your-rchain-node:40403
```

Then run:
```bash
docker-compose up -d
```

### Connecting to Docker RChain Network

If your RChain nodes are running in Docker, uncomment the network configuration in `docker-compose.yml`:

```yaml
services:
  asi-wallet:
    # ... other config ...
    environment:
      - REACT_APP_RCHAIN_HTTP_URL=http://rnode.readonly:40403
      - REACT_APP_RCHAIN_GRPC_URL=http://rnode.bootstrap:40401
      - REACT_APP_RCHAIN_READONLY_URL=http://rnode.readonly:40403
    networks:
      - rchain-network

networks:
  rchain-network:
    external: true
    name: node_rchain-network
```

## Build Commands

### Build the image:
```bash
docker build -t asi-wallet-v2 .
```

### Run without docker-compose:
```bash
docker run -d \
  --name asi-wallet \
  -p 3000:80 \
  -e REACT_APP_RCHAIN_HTTP_URL=http://host.docker.internal:40403 \
  -e REACT_APP_RCHAIN_GRPC_URL=http://host.docker.internal:40401 \
  -e REACT_APP_RCHAIN_READONLY_URL=http://host.docker.internal:40403 \
  asi-wallet-v2
```

### View logs:
```bash
docker logs asi-wallet
```

### Health check:
```bash
curl http://localhost:3000/health
```

## Features

- ✅ Production-ready nginx server
- ✅ Runtime environment configuration
- ✅ Health check endpoint
- ✅ Optimized build with gzip compression
- ✅ Security headers configured
- ✅ WalletConnect support
- ✅ Single Page Application routing

## Troubleshooting

### Cannot connect to RChain node

1. **If RChain is on host machine:**
   - Ensure RChain is running and accessible
   - Use `host.docker.internal` instead of `localhost`
   - Check firewall settings

2. **If RChain is in Docker:**
   - Ensure both containers are on the same network
   - Use container names instead of localhost

### WalletConnect issues

The default WalletConnect project ID is included. For production, create your own at:
https://cloud.walletconnect.com

### Build errors

If you encounter build errors:
```bash
# Clean build
docker-compose build --no-cache

# Remove old containers and volumes
docker-compose down -v
```

## Performance

- Initial build: ~2-3 minutes
- Subsequent builds: ~30 seconds (with cache)
- Image size: ~25MB (production image)
- Memory usage: ~50MB
- CPU usage: Minimal

## Security Notes

- The wallet runs entirely in your browser
- Private keys never leave your browser
- All sensitive data is encrypted locally
- No data is sent to external servers (except WalletConnect relay)

## Development

To run in development mode with hot reload:

```bash
# Install dependencies locally
npm install

# Run development server
npm start
```

The development server will be available at http://localhost:3000 with hot module replacement.
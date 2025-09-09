# ASI Chain Explorer

## Overview

The ASI Chain Explorer is a modern, real-time blockchain explorer for the ASI Chain (F1R3FLY/RChain) network. It provides comprehensive insights into blocks, transactions, validators, and network statistics through an intuitive web interface.

## Status

✅ **Production Ready** - Version 1.0.2

The explorer is fully functional with real-time data synchronization:

- ✅ React 19 frontend with TypeScript
- ✅ Apollo GraphQL client with real-time subscriptions
- ✅ Hasura GraphQL Engine connection to production
- ✅ PostgreSQL database with 322+ indexed blocks
- ✅ Python indexer service for continuous synchronization
- ✅ Docker deployment (tested and verified)
- ✅ Production deployment on AWS Lightsail
- ✅ Validator deduplication fix (shows 3 validators correctly)

### Latest Deployment (September 2025)
- Fixed validator duplication issue showing 6 instead of 3 validators
- Successfully deployed via Docker with validator deduplication logic
- Connected to production GraphQL endpoint (13.251.66.61)
- All services operational and health checks passing

## Features

### Core Functionality
- **Block Explorer**: Real-time block monitoring with detailed information
- **Transaction Viewer**: Comprehensive transaction details including deployments and transfers
- **Validator Dashboard**: Active validator monitoring with stake distribution (deduplication fixed)
- **Network Statistics**: Simplified Network Dashboard view
- **Search**: Universal search for blocks, transactions, and addresses
- **Genesis Funding**: Complete visibility of initial token distribution

### Recent UI/UX Improvements
- **Validator Deduplication Fix**: Resolved database duplicate entries showing 6 validators instead of 3
  - Implemented smart key normalization for both full and abbreviated public keys
  - Logic handles keys like `04837a4c...b2df065f` and full 130+ character keys
  - Correctly identifies and merges duplicate validator entries
- **Enhanced Transaction Display**: Clear data counts showing total available (300+) vs displayed (20 per page)
- **Simplified Statistics**: Removed tabs, showing only Network Dashboard
- **Improved Navigation**: Pagination controls with items per page selector
- **Responsive Design**: Mobile-friendly layouts with glass morphism effects
- **File Organization**: Non-essential files moved to `archive/` directory

## Technology Stack

- **Frontend**: React 19, TypeScript 5.x
- **State Management**: Apollo Client 3.x with caching
- **API**: GraphQL via Hasura with subscriptions
- **Styling**: CSS-in-JS with custom ASI theme
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **Build Tool**: Create React App with custom webpack config
- **Deployment**: Docker with Nginx Alpine

## Quick Start

### Docker Deployment (Recommended)
```bash
# Deploy with script
./deploy-docker.sh start

# Other commands
./deploy-docker.sh stop     # Stop the explorer
./deploy-docker.sh restart  # Restart the explorer
./deploy-docker.sh logs     # View logs
./deploy-docker.sh status   # Check status
./deploy-docker.sh rebuild  # Rebuild after code changes
```

### Manual Docker Deployment
```bash
# Build and run
docker-compose -f docker-compose.standalone.yml up -d

# View logs
docker logs -f asi-explorer

# Stop
docker-compose -f docker-compose.standalone.yml down
```

### Development Mode
```bash
cd explorer
npm install
npm start  # Runs on http://localhost:3001
```

## Environment Configuration

### Core Environment Variables
```env
# Production (.env.production.secure)
REACT_APP_GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql
REACT_APP_GRAPHQL_WS_URL=ws://13.251.66.61:8080/v1/graphql
REACT_APP_INDEXER_API_URL=http://13.251.66.61:9090
REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey
REACT_APP_NETWORK_NAME=ASI Chain
REACT_APP_ENVIRONMENT=production

# Local Development (.env)
REACT_APP_GRAPHQL_URL=http://localhost:8080/v1/graphql
REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey
```

## API Endpoints

### Production (AWS Lightsail)
- **GraphQL**: `http://13.251.66.61:8080/v1/graphql`
- **WebSocket**: `ws://13.251.66.61:8080/v1/graphql`
- **Indexer API**: `http://13.251.66.61:9090`

### Local Development
- **Explorer UI**: `http://localhost:3001`
- **GraphQL**: `http://localhost:8080/v1/graphql` (if running locally)

## Available Pages

- `/` - Home dashboard with network overview
- `/blocks` - Block explorer with pagination
- `/block/:number` - Individual block details
- `/transactions` - Transaction list with improved count display
- `/transaction/:id` - Transaction details
- `/validators` - Active validator list (deduplicated)
- `/validator/:pubkey` - Validator details and history
- `/deployments` - Smart contract deployments
- `/transfers` - Token transfer history
- `/statistics` - Network Dashboard only
- `/search` - Advanced search interface
- `/indexer-status` - Indexer health monitoring

## Docker Container Management

```bash
# Check container status
docker ps | grep asi-explorer

# View container health
docker inspect asi-explorer --format='{{.State.Health.Status}}'

# Check environment variables
docker exec asi-explorer printenv | grep REACT_APP

# Remove container and image
docker stop asi-explorer
docker rm asi-explorer
docker rmi asi-explorer:latest
```

## File Structure

### Essential Files (Production Required)
- `src/` - React application source
- `public/` - Static assets
- `package.json`, `package-lock.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `Dockerfile` - Container definition
- `docker-compose.standalone.yml` - Docker Compose config
- `docker-entrypoint.sh` - Runtime configuration
- `nginx.conf` - Web server config
- `.env.production.secure` - Production environment
- `deploy-docker.sh` - Deployment automation

### Archived Files
All documentation and utility scripts have been moved to `archive/` directory for cleaner organization.

## Recent Updates

### Version 1.0.2 (September 2025)
- **Critical Fix**: Resolved validator duplication bug in ValidatorsPage.tsx
  - Fixed normalizeValidatorKey function to handle abbreviated keys with ellipsis
  - Database had 6 entries (3 full keys + 3 abbreviated) now correctly shows 3 validators
  - Implemented proper deduplication logic for mixed key formats
- Docker deployment tested and verified with fix
- All validator calculations (stakes, percentages) now accurate

### Version 1.0.1 (December 2024)
- Fixed validator duplication issue (shows correct 3 validators)
- Improved transaction count transparency (shows "X of Y total")
- Simplified statistics page (Network Dashboard only)
- Cleaned up file structure (moved non-essential to archive/)
- Verified Docker deployment after purge
- Updated all documentation

### Version 1.0.0 (December 2024)
- Initial production release
- Full indexer integration
- Real-time GraphQL subscriptions
- Comprehensive search functionality

## Performance Metrics

- **Initial Load**: < 2 seconds
- **Block Updates**: Real-time via WebSocket
- **Search Response**: < 500ms
- **Bundle Size**: ~533KB gzipped
- **Docker Image**: ~50MB (Alpine Linux)
- **Memory Usage**: ~100MB
- **Network Data**: 322+ blocks indexed

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Ensure Docker is running: `docker info`
   - Check port 3001 is available: `lsof -i :3001`

2. **No data showing**
   - Verify GraphQL endpoint: `curl http://13.251.66.61:8080/v1/graphql`
   - Check container logs: `docker logs asi-explorer`

3. **Build failures**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild: `./deploy-docker.sh rebuild`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

Please see the main [Contributing Guide](../CONTRIBUTING.md) for details on contributing to the explorer.

## License

Part of the ASI Chain project - see [LICENSE](../LICENSE) for details.

## Support

For issues or questions:
- GitHub Issues: [asi-chain/explorer](https://github.com/asi-alliance/asi-chain/issues)
- Documentation: [ASI Chain Docs](../docs/)
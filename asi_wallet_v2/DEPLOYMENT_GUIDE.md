# ASI Wallet v2 Deployment Guide

## Overview
ASI Wallet v2.2.0-dappconnect is a React-based blockchain wallet with WalletConnect v2 support, hardware wallet integration, and multi-signature capabilities.

## Quick Start

### Development
```bash
cd asi_wallet_v2
npm install --legacy-peer-deps
npm start
# Access at http://localhost:3000
```

### Testing
```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testNamePattern="WalletConnect"

# Type checking
npm run type-check

# Linting
npm run lint
```

### Production Build
```bash
npm run build
# Output in build/ directory
```

## Docker Deployment

### Local Development
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.local.yml up -d

# Or use the convenience script
./start-wallet.sh
```

### Production
```bash
# Build production image
docker build -t asi-wallet:v2.2.0 .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e REACT_APP_API_URL=https://api.asi-chain.com \
  -e REACT_APP_NETWORK=mainnet \
  --name asi-wallet \
  asi-wallet:v2.2.0
```

## Environment Configuration

Create `.env.local` for development or `.env.production` for production:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:9090
REACT_APP_GRAPHQL_URL=http://localhost:8080/v1/graphql
REACT_APP_WEBSOCKET_URL=ws://localhost:8080/v1/graphql

# Network Configuration
REACT_APP_NETWORK=testnet
REACT_APP_CHAIN_ID=1

# WalletConnect Configuration
REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id
REACT_APP_WALLETCONNECT_RELAY_URL=wss://relay.walletconnect.com

# Security
REACT_APP_ENABLE_2FA=true
REACT_APP_ENABLE_BIOMETRIC=true
REACT_APP_SESSION_TIMEOUT=900000
```

## Deployment Checklist

### Pre-deployment
- [ ] Run type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally: `serve -s build`

### Security
- [ ] Configure CORS policies for production API
- [ ] Set up HTTPS/TLS certificates
- [ ] Enable rate limiting on API endpoints
- [ ] Configure CSP headers
- [ ] Set secure session management
- [ ] Enable audit logging

### Infrastructure
- [ ] Configure load balancer
- [ ] Set up CDN for static assets
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up error tracking (Sentry)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Post-deployment
- [ ] Verify all API endpoints are accessible
- [ ] Test WalletConnect v2 integration
- [ ] Verify hardware wallet connectivity
- [ ] Test multi-signature wallet creation
- [ ] Monitor error logs
- [ ] Check performance metrics

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**
   - Ensure `config-overrides.js` includes all necessary polyfills
   - Run `npm install --legacy-peer-deps` to handle peer dependency conflicts

2. **TypeScript Errors**
   - Check `src/types/modules.d.ts` for missing type declarations
   - Ensure theme types match in `styled.d.ts` and `theme.ts`

3. **WalletConnect Issues**
   - Verify project ID is configured in environment variables
   - Check network connectivity to relay servers
   - Ensure proper CORS configuration

4. **Hardware Wallet Connection**
   - USB permissions may be required on Linux
   - Ensure browser supports WebUSB/WebHID
   - Check device firmware is up to date

## Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3000/health
```

### Metrics
- Response time: < 100ms
- Bundle size: ~2MB gzipped
- Test coverage: 27.58% overall, 62.88% store modules

### Logs
- Application logs: Browser console
- Error tracking: Configure Sentry DSN
- Performance monitoring: Use React DevTools Profiler

## Support

For issues or questions:
- Check `docs/troubleshooting/` for common problems
- Review GitLab issues for known bugs
- Contact the development team

## Recent Fixes (Latest Deployment)

- Fixed webpack module resolution for `process/browser`
- Updated styled-components theme typing
- Fixed QRCode import issues
- Added missing SecureStorage methods
- Created type declarations for speakeasy and validator
- Removed unused backend code from frontend
- Resolved all TypeScript compilation errors

## Version History

- v2.2.0-dappconnect: WalletConnect v2 integration
- v2.1.0: Hardware wallet support
- v2.0.0: Multi-signature wallets
- v1.0.0: Initial release
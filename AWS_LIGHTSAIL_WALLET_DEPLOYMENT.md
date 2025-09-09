# AWS Lightsail ASI Wallet v2 Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying ASI Wallet v2 to AWS Lightsail. The ASI Wallet v2 is a React-based blockchain wallet with WalletConnect integration, hardware wallet support, and a built-in Rholang IDE for smart contract development.

## Prerequisites

### Local Development Environment
- Docker and Docker Compose installed
- SSH client (OpenSSH or equivalent)
- Git repository access to ASI Chain
- Valid SSH private key for server access

### AWS Lightsail Server Requirements
- **Instance Type**: Minimum 2 vCPU, 4 GB RAM (recommended: 4 vCPU, 8 GB RAM)
- **OS**: Ubuntu 20.04 LTS or later
- **Storage**: Minimum 40 GB SSD
- **Network**: Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (wallet)
- **Location**: Singapore region (for F1R3FLY network proximity)

## Server Configuration

### Current Production Server
- **IP Address**: `13.251.66.61`
- **Region**: Singapore (ap-southeast-1)
- **SSH Key**: `XXXXXX.pem`
- **Deployed Services**:
  - ASI Wallet v2: Port 3000
  - F1R3FLY Blockchain: Ports 40403, 40413, 40453
  - GraphQL/Hasura: Port 8080
  - Indexer API: Port 9090

## SSH Access Setup

### 1. Prepare SSH Key
```bash
# Ensure SSH key has correct permissions
chmod 600 /path/to/XXXXXX.pem

# Test SSH connectivity
ssh -i /path/to/XXXXXX.pem -o ConnectTimeout=10 ubuntu@13.251.66.61
```

### 2. Verify Server Access
```bash
# Check system information
ubuntu@server:~$ uname -a
ubuntu@server:~$ docker --version
ubuntu@server:~$ docker-compose --version
```

## Pre-Deployment Setup

### 1. Server Preparation
```bash
# Connect to server
ssh -i XXXXXXX.pem ubuntu@13.251.66.61

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y docker.io docker-compose git curl wget

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in for group changes to take effect
exit
ssh -i XXXXXX.pem ubuntu@13.251.66.61
```

### 2. Project Setup
```bash
# Clone or update the ASI Chain repository
git clone https://github.com/asi-alliance/asi-chain.git
cd asi-chain

# Switch to the correct branch
git checkout feature/major-refactor

# Navigate to wallet directory
cd asi_wallet_v2
```

## Environment Configuration

### 1. Environment Variables Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

### 2. Required Environment Variables
```bash
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id-here

# F1R3FLY Network Endpoints - Current Singapore Production
REACT_APP_RCHAIN_HTTP_URL=http://13.251.66.61:40413
REACT_APP_RCHAIN_GRPC_URL=http://13.251.66.61:40412
REACT_APP_RCHAIN_READONLY_URL=http://13.251.66.61:40453

# GraphQL/Indexer endpoints
REACT_APP_GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql
REACT_APP_INDEXER_API_URL=http://13.251.66.61:9090

# Network configuration
REACT_APP_NETWORK_NAME=F1R3FLY Network
REACT_APP_NETWORK_ID=f1r3fly-mainnet

# Performance optimizations
REACT_APP_BALANCE_POLLING_INTERVAL=30000
REACT_APP_DEPLOY_STATUS_POLLING_INTERVAL=5000
```

## Wallet Architecture Overview

### Core Features
- **Multi-Account Management**: Create, import, and manage multiple blockchain accounts
- **WalletConnect v2 Integration**: Connect to dApps with industry-standard protocol
- **Hardware Wallet Support**: Ledger and Trezor integration
- **Rholang IDE**: Built-in smart contract development environment with Monaco Editor
- **Transaction Management**: Send/receive REV tokens with real-time status updates
- **Network Management**: Connect to mainnet, testnet, or custom F1R3FLY networks
- **Security Features**: Encrypted storage, password protection, secure key management

### Technical Stack
- **Frontend**: React 18, TypeScript, Redux Toolkit
- **Styling**: Tailwind CSS, custom ASI theme
- **Blockchain Integration**: Custom RChain/F1R3FLY service layer
- **State Management**: Redux with persistence
- **Build System**: React App Rewired with custom webpack configurations
- **Container**: Multi-stage Docker build with nginx production server

## Deployment Process

### 1. Build and Deploy Script
Create a deployment script for easy management:

```bash
# Create deployment script
cat > deploy-wallet.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting ASI Wallet v2 deployment..."

# Stop existing containers
echo "⏹️ Stopping existing containers..."
docker-compose down

# Build and start the wallet
echo "🔨 Building and starting ASI Wallet v2..."
docker-compose up -d --build

# Wait for container to be ready
echo "⏳ Waiting for wallet to be ready..."
sleep 30

# Check container status
echo "📊 Container Status:"
docker-compose ps

# Check health endpoint
echo "🏥 Health Check:"
curl -f http://localhost:3000/health || echo "Health check endpoint not available"

# Test wallet accessibility
echo "🌐 Testing wallet accessibility:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 && echo " ✅ Wallet is accessible" || echo " ❌ Wallet is not accessible"

echo "🎉 Deployment completed!"
echo "📱 ASI Wallet v2 is now available at: http://13.251.66.61:3000"
EOF

chmod +x deploy-wallet.sh
```

### 2. Execute Deployment
```bash
# Run deployment script
./deploy-wallet.sh
```

### 3. Manual Deployment Steps (Alternative)
```bash
# Stop existing containers
docker-compose down

# Pull latest images and rebuild
docker-compose build --no-cache

# Start services
docker-compose up -d

# Monitor logs
docker-compose logs -f asi-wallet-v2
```

## Docker Configuration

### 1. Production Docker Compose Configuration
The `docker-compose.yml` file is configured for production deployment:

```yaml
version: '3.8'
services:
  asi-wallet:
    build: .
    container_name: asi-wallet-v2
    ports:
      - "3000:80"
    environment:
      # Network Configuration (Current AWS Lightsail - Singapore)
      - REACT_APP_RCHAIN_HTTP_URL=http://13.251.66.61:40413
      - REACT_APP_RCHAIN_GRPC_URL=http://13.251.66.61:40412
      - REACT_APP_RCHAIN_READONLY_URL=http://13.251.66.61:40453
      - REACT_APP_GRAPHQL_URL=http://13.251.66.61:8080/v1/graphql
      - REACT_APP_INDEXER_API_URL=http://13.251.66.61:9090
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

### 2. Multi-Stage Dockerfile
The wallet uses an optimized multi-stage build:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Performance Optimizations

### 1. Balance Caching Implementation
The wallet implements global balance caching to prevent excessive API calls:

```typescript
// Global balance cache to prevent excessive API calls
const globalBalanceCache: Map<string, { balance: string; timestamp: number }> = new Map();
const BALANCE_CACHE_TTL = 15000; // 15 seconds cache

async getBalance(revAddress: string): Promise<string> {
  const cacheKey = `${revAddress}_${this.readOnlyUrl}`;
  const cached = globalBalanceCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < BALANCE_CACHE_TTL) {
    console.log(`[Balance Cache] Using cached balance for ${revAddress}: ${cached.balance} REV`);
    return cached.balance;
  }
  
  // Fetch fresh balance and cache it
  const balance = await this.fetchBalanceFromChain(revAddress);
  globalBalanceCache.set(cacheKey, { balance, timestamp: now });
  return balance;
}
```

### 2. Environment-Specific Configurations
```bash
# Production optimizations
REACT_APP_BALANCE_POLLING_INTERVAL=30000    # 30 second balance polling
REACT_APP_DEPLOY_STATUS_POLLING_INTERVAL=5000  # 5 second deploy status polling
GENERATE_SOURCEMAP=false                    # Disable source maps in production
REACT_APP_NODE_ENV=production               # Production mode
```

## Network Configuration

### 1. F1R3FLY Network Endpoints
The wallet connects to the following F1R3FLY network services:

```typescript
const defaultNetworks: Network[] = [
  {
    id: 'custom',
    name: 'Custom Network',
    url: 'http://13.251.66.61:40413',          // Validator HTTP API
    readOnlyUrl: 'http://13.251.66.61:40453',  // Observer read-only API
    graphqlUrl: 'http://13.251.66.61:8080/v1/graphql', // Hasura GraphQL
    shardId: 'root',
  },
  {
    id: 'mainnet',
    name: 'Mainnet',
    url: 'http://13.251.66.61:40413',
    readOnlyUrl: 'http://13.251.66.61:40453',
    graphqlUrl: 'http://13.251.66.61:8080/v1/graphql',
    shardId: '',
  }
];
```

### 2. Port Configuration
- **3000**: ASI Wallet v2 HTTP port
- **40413**: F1R3FLY Validator HTTP API (for transactions)
- **40453**: F1R3FLY Observer read-only API (for balance queries)
- **8080**: Hasura GraphQL endpoint
- **9090**: Indexer REST API

## Security Considerations

### 1. Network Security
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Wallet
```

### 2. SSL/TLS Configuration (Optional)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Data Protection
- Private keys are encrypted and stored locally
- Session management with secure token handling
- CORS configuration for production deployment
- Content Security Policy headers

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Container health check
docker-compose ps

# Application health check
curl -f http://localhost:3000/health

# Log monitoring
docker-compose logs -f asi-wallet-v2
```

### 2. System Monitoring
```bash
# System resource usage
htop
df -h
free -h

# Docker resource usage
docker stats asi-wallet-v2

# Network connectivity
curl -I http://13.251.66.61:40413/api/status
curl -I http://13.251.66.61:8080/healthz
```

### 3. Backup Procedures
```bash
# Backup wallet configuration
tar -czf wallet-backup-$(date +%Y%m%d).tar.gz asi_wallet_v2/

# Backup container volumes (if any)
docker run --rm -v asi-wallet-data:/data -v $(pwd):/backup ubuntu tar czf /backup/wallet-data-backup.tar.gz /data
```

## Troubleshooting

### 1. Common Issues

#### Container Won't Start
```bash
# Check Docker logs
docker-compose logs asi-wallet-v2

# Check system resources
free -h
df -h

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Network Connectivity Issues
```bash
# Test F1R3FLY connectivity
curl -v http://13.251.66.61:40413/api/status

# Test GraphQL endpoint
curl -v http://13.251.66.61:8080/healthz

# Check container networking
docker exec asi-wallet-v2 ping 13.251.66.61
```

#### Performance Issues
```bash
# Monitor balance API calls in browser console
# Look for excessive "rchain.ts" logs
# Verify balance caching is working

# Check container resources
docker stats asi-wallet-v2

# Restart container if needed
docker-compose restart asi-wallet-v2
```

### 2. Log Analysis
```bash
# Application logs
docker-compose logs -f --tail=100 asi-wallet-v2

# System logs
sudo journalctl -u docker -f

# Nginx access logs (if using reverse proxy)
sudo tail -f /var/log/nginx/access.log
```

### 3. Emergency Recovery
```bash
# Quick restart
docker-compose restart asi-wallet-v2

# Full restart with rebuild
docker-compose down
docker-compose up -d --build

# Reset to clean state
docker-compose down -v
docker system prune -f
./deploy-wallet.sh
```

## Updates and Maintenance

### 1. Application Updates
```bash
# Pull latest code
git pull origin feature/major-refactor

# Rebuild and deploy
./deploy-wallet.sh

# Verify deployment
curl -s http://localhost:3000 | grep -i "asi wallet"
```

### 2. System Updates
```bash
# System package updates
sudo apt update && sudo apt upgrade -y

# Docker updates
sudo apt install docker.io docker-compose

# Restart services after system updates
sudo systemctl restart docker
docker-compose restart
```

### 3. Configuration Updates
```bash
# Update environment variables
nano .env

# Apply changes
docker-compose down
docker-compose up -d

# Verify changes
docker-compose exec asi-wallet-v2 printenv | grep REACT_APP
```

## Performance Metrics

### Expected Performance
- **Load Time**: < 3 seconds initial load
- **Transaction Time**: 30-60 seconds confirmation
- **Balance Updates**: Real-time with 15-second cache
- **Memory Usage**: < 512 MB container RAM
- **CPU Usage**: < 10% under normal load

### Performance Monitoring
```bash
# Container resource usage
docker stats asi-wallet-v2 --no-stream

# Application response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000

# Network latency to blockchain
ping -c 5 13.251.66.61
```

## Conclusion

This deployment guide provides a comprehensive approach to deploying ASI Wallet v2 on AWS Lightsail. The wallet is now successfully running at `http://13.251.66.61:3000` with:

- ✅ Optimized balance caching (15-second TTL)
- ✅ Updated network configuration (Singapore server endpoints)
- ✅ Production-ready Docker configuration
- ✅ Health monitoring and auto-restart
- ✅ Security hardening and performance optimization

For ongoing maintenance, use the monitoring commands and follow the update procedures outlined in this guide. The deployment is designed to be resilient and self-healing with proper health checks and restart policies.

## Additional Resources

- **ASI Chain Documentation**: `docs/`
- **F1R3FLY Network Guide**: `docs/F1R3FLY_QUICK_START.md`
- **Explorer Deployment**: `AWS_LIGHTSAIL_EXPLORER_DEPLOYMENT.md`
- **Indexer Deployment**: `indexer/AWS_LIGHTSAIL_INDEXER_DEPLOYMENT.md`

## Support

For technical support or deployment issues:
1. Check the troubleshooting section above
2. Review container logs: `docker-compose logs asi-wallet-v2`
3. Verify network connectivity to F1R3FLY services
4. Ensure all environment variables are correctly configured
5. Test with a fresh deployment if issues persist
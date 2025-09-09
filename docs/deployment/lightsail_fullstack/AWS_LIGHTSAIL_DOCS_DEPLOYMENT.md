# ASI Chain Documentation Site - AWS Lightsail Deployment Guide

**Version**: 1.0.0 | **Updated**: January 2025  
**Status**: ✅ DEPLOYED | **Server**: `13.251.66.61` (Singapore)  
**Public URL**: http://13.251.66.61:3003

This guide documents the deployment of the ASI Chain documentation site on AWS Lightsail using Docker and Docusaurus.

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Deployment Steps](#deployment-steps)
- [Service Configuration](#service-configuration)
- [Verification](#verification)
- [Management](#management)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Overview

The ASI Chain documentation site provides:
- **Interactive Documentation**: Built with Docusaurus 3.8.1
- **API References**: Comprehensive API documentation
- **Architecture Guides**: System design and blockchain architecture
- **Deployment Tutorials**: Step-by-step deployment instructions
- **Smart Contract Documentation**: Rholang programming guides
- **Static Site Generation**: Optimized for performance
- **Docker Deployment**: Containerized with Nginx for production

### Current Deployment
- **Server IP**: `13.251.66.61`
- **Port**: `3003`
- **Container**: `asi-docs`
- **Image**: `docs-site-docs`
- **Status**: Running and healthy ✅

## Prerequisites

### AWS Lightsail Instance
- **OS**: Ubuntu 24.04 LTS
- **Minimum RAM**: 2GB (4GB recommended)
- **Docker & Docker Compose**: Installed
- **Open Ports**: 3003 (documentation site)
- **SSH Key**: Required for deployment

### Local Machine
- SSH access with key (`XXXXXXX.pem`)
- Git for repository management
- Docker for local testing (optional)

## Architecture

```
                    Internet
                        |
                   Port 3003
                        |
              AWS Lightsail Instance
                 (13.251.66.61)
                        |
                 Docker Container
                   (asi-docs)
                        |
    ┌─────────────────────────────────────┐
    │          Nginx Alpine Server         │
    │                                      │
    │    ┌─────────────────────────┐      │
    │    │   Static Docusaurus     │      │
    │    │     Site (build/)       │      │
    │    └─────────────────────────┘      │
    │                                      │
    │  Features:                          │
    │  - Gzip compression                 │
    │  - Security headers                 │
    │  - Cache optimization               │
    │  - Health checks                    │
    └─────────────────────────────────────┘
```

## Deployment Steps

### 1. Prepare Documentation Site Locally

```bash
# Navigate to docs-site directory
cd /path/to/asi-chain/docs-site

# Install dependencies
npm install

# Build site locally (optional, for testing)
npm run build

# Test locally (optional)
npm run serve
```

### 2. Create Docker Configuration

#### Dockerfile (Multi-stage build)
```dockerfile
# Stage 1: Build the documentation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install --save-dev

# Copy all source files
COPY . .

# Build the static site
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built static files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nginx-group && \
    adduser -S nginx-user -u 1001 -G nginx-group && \
    chown -R nginx-user:nginx-group /usr/share/nginx/html && \
    chown -R nginx-user:nginx-group /var/cache/nginx && \
    chown -R nginx-user:nginx-group /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx-user:nginx-group /var/run/nginx.pid

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Switch to non-root user
USER nginx-user

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml
```yaml
services:
  docs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: asi-docs
    ports:
      - "3003:80"  # Port 3003 to avoid conflicts
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - asi-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    labels:
      - "com.asi-chain.service=documentation"
      - "com.asi-chain.description=ASI Chain Documentation Site"
      - "com.asi-chain.version=1.0.0"

networks:
  asi-network:
    external: true
    name: asi-network
```

### 3. Create Deployment Package

```bash
# Create deployment archive
cd /path/to/asi-chain
tar -czf docs-site-deployment.tar.gz \
  --exclude='node_modules' \
  --exclude='.docusaurus' \
  --exclude='build' \
  --exclude='.cache' \
  --exclude='*.log' \
  docs-site/
```

### 4. Transfer to Server

```bash
# Copy deployment package to Lightsail
scp -i XXXXXXXX.pem \
  docs-site-deployment.tar.gz \
  ubuntu@13.251.66.61:~/
```

### 5. Deploy on Server

```bash
# SSH into server
ssh -i ~/path/to/XXXXXX.pem ubuntu@13.251.66.61

# Extract deployment files
tar -xzf docs-site-deployment.tar.gz

# Navigate to docs-site directory
cd docs-site

# Create Docker network (if not exists)
docker network create asi-network 2>/dev/null || true

# Build Docker image
docker-compose build --no-cache

# Start container
docker-compose up -d

# Check status
docker ps | grep asi-docs
```

## Service Configuration

### Nginx Configuration (nginx/default.conf)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html index.htm;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Location for root
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle 404s gracefully
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Nginx Main Configuration (nginx/nginx.conf)

```nginx
user nginx-user;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/rss+xml
        application/atom+xml
        image/svg+xml;
    gzip_disable "msie6";

    # Include server configuration
    include /etc/nginx/conf.d/*.conf;
}
```

## Verification

### 1. Check Container Status

```bash
# Check if container is running
docker ps | grep asi-docs

# Expected output:
# b9e6adcdff5c   docs-site-docs   ... Up 8 seconds (healthy) ...   asi-docs
```

### 2. Test Local Access (on server)

```bash
# Test from server
curl -I http://localhost:3003

# Expected: HTTP/1.1 200 OK
```

### 3. Test Public Access

```bash
# Test from your local machine
curl -I http://13.251.66.61:3003

# Or open in browser:
# http://13.251.66.61:3003
```

### 4. Check Container Logs

```bash
# View logs
docker logs asi-docs

# Follow logs
docker logs -f asi-docs
```

### 5. Health Check

```bash
# Check health endpoint
curl http://13.251.66.61:3003/health

# Expected: healthy
```

## Management

### Service Control Commands

```bash
# Stop the documentation site
cd ~/docs-site
docker-compose down

# Start the documentation site
docker-compose up -d

# Restart the documentation site
docker-compose restart

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# View real-time logs
docker-compose logs -f
```

### Update Documentation

```bash
# 1. Update local docs-site
cd /path/to/asi-chain/docs-site
# Make your changes...

# 2. Create new deployment package
cd ..
tar -czf docs-site-deployment.tar.gz \
  --exclude='node_modules' \
  --exclude='.docusaurus' \
  --exclude='build' \
  docs-site/

# 3. Transfer to server
scp -i XXXXXXXC.pem \
  docs-site-deployment.tar.gz \
  ubuntu@13.251.66.61:~/

# 4. Deploy update on server
ssh -i XXXXXXX.pem ubuntu@13.251.66.61
cd docs-site
docker-compose down
cd ..
rm -rf docs-site
tar -xzf docs-site-deployment.tar.gz
cd docs-site
docker-compose build --no-cache
docker-compose up -d
```

### Monitor Resources

```bash
# Check container resource usage
docker stats asi-docs --no-stream

# Check disk usage
docker system df

# Check container details
docker inspect asi-docs
```

## Troubleshooting

### Issue: Container Won't Start

```bash
# Check logs for errors
docker logs asi-docs

# Check if port is already in use
sudo lsof -i :3003

# Remove and recreate container
docker-compose down
docker-compose up -d
```

### Issue: Site Not Accessible

```bash
# Check firewall rules on AWS Lightsail
# Ensure port 3003 is open in the instance firewall

# Check if container is healthy
docker ps | grep asi-docs

# Test from server
curl http://localhost:3003

# Check nginx error logs
docker exec asi-docs cat /var/log/nginx/error.log
```

### Issue: Build Failures

```bash
# Clear Docker cache
docker system prune -a

# Check available disk space
df -h

# Build with verbose output
docker-compose build --no-cache --progress=plain
```

### Issue: Broken Links Warning

The build process may show warnings about broken markdown links. These are typically due to:
- References to files outside the docs directory
- Links to blog posts (if blog is not configured)
- Case sensitivity in file paths

These warnings don't prevent the build but should be fixed for better documentation quality.

## Maintenance

### Regular Tasks

1. **Weekly Health Checks**
   ```bash
   # Check container status
   docker ps | grep asi-docs
   
   # Check logs for errors
   docker logs asi-docs --since 7d | grep ERROR
   
   # Check disk usage
   df -h
   docker system df
   ```

2. **Monthly Updates**
   - Update Docusaurus dependencies
   - Update Docker base images
   - Review and fix broken links
   - Update documentation content

3. **Backup Strategy**
   ```bash
   # Backup docs-site directory
   tar -czf docs-site-backup-$(date +%Y%m%d).tar.gz docs-site/
   
   # Store in S3 or other backup location
   ```

### Performance Optimization

1. **Enable CDN** (Optional)
   - Configure CloudFront or similar CDN
   - Point to http://13.251.66.61:3003
   - Set appropriate cache headers

2. **Enable HTTPS** (Recommended)
   - Use nginx reverse proxy with Let's Encrypt
   - Or configure AWS Application Load Balancer

3. **Resource Scaling**
   - Monitor container memory usage
   - Scale Lightsail instance if needed
   - Consider horizontal scaling for high traffic

## Security Considerations

1. **Use HTTPS in Production**
   - Configure SSL certificates
   - Redirect HTTP to HTTPS

2. **Restrict Access** (if needed)
   - Implement basic authentication
   - Use IP whitelisting
   - Configure WAF rules

3. **Regular Updates**
   - Keep Docker images updated
   - Update Node.js dependencies
   - Apply security patches

4. **Monitoring**
   - Set up log aggregation
   - Configure alerts for errors
   - Monitor for suspicious activity

## Support

For issues or questions:
- **Documentation Issues**: Check Docusaurus documentation
- **Deployment Issues**: Review Docker logs
- **AWS Issues**: Check Lightsail console
- **ASI Chain Specific**: See main README.md

## Version History

- **v1.0.0** (Current): Initial deployment with Docusaurus 3.8.1
  - Multi-stage Docker build
  - Nginx optimization
  - Health checks
  - Security headers
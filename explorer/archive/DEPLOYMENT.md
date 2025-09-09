# ASI Chain Explorer Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Access to ASI Chain indexer GraphQL endpoint (default: http://localhost:8080)
- (Optional) Access to RChain node for wallet balance queries

## Quick Deployment

### 1. Using Docker Compose (Recommended)

```bash
# Clone repository
git clone <repository>
cd explorer

# Build and start the explorer
docker-compose build asi-explorer
docker-compose up -d asi-explorer

# Check status
docker ps --filter name=asi-explorer

# View logs
docker logs -f asi-explorer
```

The explorer will be available at: **http://localhost:3001**

### 2. Manual Docker Build

```bash
# Build the Docker image
docker build -t asi-explorer:latest .

# Run the container
docker run -d \
  --name asi-explorer \
  -p 3001:80 \
  -e REACT_APP_GRAPHQL_URL=http://host.docker.internal:8080/v1/graphql \
  -e REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey \
  asi-explorer:latest

# Check health
curl http://localhost:3001
```

## Configuration

### Environment Variables

Configure these in `docker-compose.yml` or pass via `-e` flags:

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_GRAPHQL_URL` | Hasura GraphQL HTTP endpoint | http://localhost:8080/v1/graphql |
| `REACT_APP_GRAPHQL_WS_URL` | Hasura GraphQL WebSocket endpoint | ws://localhost:8080/v1/graphql |
| `REACT_APP_HASURA_ADMIN_SECRET` | Hasura admin secret | myadminsecretkey |
| `REACT_APP_RCHAIN_NODE_URL` | RChain node HTTP endpoint | http://localhost:40453 |
| `REACT_APP_ENVIRONMENT` | Environment (production/development) | production |
| `REACT_APP_API_TIMEOUT` | API request timeout in ms | 30000 |
| `REACT_APP_BRAND_NAME` | Explorer brand name | ASI Chain Explorer |

### Docker Compose Configuration

The `docker-compose.yml` includes:

```yaml
services:
  asi-explorer:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: asi-explorer
    ports:
      - "3001:80"
    environment:
      # Configure your endpoints here
      - REACT_APP_GRAPHQL_URL=http://localhost:8080/v1/graphql
      - REACT_APP_HASURA_ADMIN_SECRET=myadminsecretkey
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Development Deployment

For development with hot reload:

```bash
# Start development container
docker-compose --profile dev up asi-explorer-dev

# Access at http://localhost:3002
# Code changes will auto-reload
```

## Production Deployment

### 1. Build for Production

```bash
# Build optimized production image
docker-compose build asi-explorer

# Or build with specific tag
docker build -t asi-explorer:v1.0.0 --target production .
```

### 2. Deploy with Docker Swarm

```bash
# Initialize swarm (if not already)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml asi-explorer-stack

# Check service status
docker service ls
docker service logs asi-explorer-stack_asi-explorer
```

### 3. Deploy with Kubernetes

Create a deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asi-explorer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: asi-explorer
  template:
    metadata:
      labels:
        app: asi-explorer
    spec:
      containers:
      - name: asi-explorer
        image: asi-explorer:latest
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_GRAPHQL_URL
          value: "http://hasura-service:8080/v1/graphql"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: asi-explorer-service
spec:
  selector:
    app: asi-explorer
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Health Checks

The explorer includes health check endpoints:

- **Main health check**: `GET /`
  - Returns 200 if the application is serving
  - Used by Docker health checks

- **API connectivity**: The explorer will show connection errors if it cannot reach the GraphQL endpoint

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker logs asi-explorer
   ```

2. Verify port availability:
   ```bash
   lsof -i :3001
   ```

3. Check Docker resources:
   ```bash
   docker system df
   docker system prune
   ```

### GraphQL connection errors

1. Verify Hasura is running:
   ```bash
   curl http://localhost:8080/v1/graphql \
     -H "x-hasura-admin-secret: myadminsecretkey" \
     -d '{"query":"{ __typename }"}'
   ```

2. Check network connectivity:
   ```bash
   docker network ls
   docker network inspect bridge
   ```

3. Use correct host for Docker:
   - From host: `localhost:8080`
   - From container: `host.docker.internal:8080` (Mac/Windows)
   - From container: `172.17.0.1:8080` (Linux)

### Build failures

1. Clear Docker cache:
   ```bash
   docker-compose build --no-cache asi-explorer
   ```

2. Check Node.js compatibility:
   - Required: Node.js 18+
   - Check Dockerfile base image

3. Verify TypeScript compilation:
   ```bash
   docker run --rm -it \
     -v $(pwd):/app \
     -w /app \
     node:18-alpine \
     sh -c "npm ci && npm run build"
   ```

## Monitoring

### View logs

```bash
# Live logs
docker logs -f asi-explorer

# Last 100 lines
docker logs --tail 100 asi-explorer

# With timestamps
docker logs -t asi-explorer
```

### Resource usage

```bash
# Container stats
docker stats asi-explorer

# Detailed inspection
docker inspect asi-explorer
```

### Network traffic

```bash
# Monitor nginx access logs
docker exec asi-explorer tail -f /var/log/nginx/access.log

# Monitor nginx error logs
docker exec asi-explorer tail -f /var/log/nginx/error.log
```

## Updating

To update the explorer:

1. Pull latest code:
   ```bash
   git pull origin main
   ```

2. Rebuild image:
   ```bash
   docker-compose build asi-explorer
   ```

3. Restart container:
   ```bash
   docker-compose down asi-explorer
   docker-compose up -d asi-explorer
   ```

4. Verify update:
   ```bash
   docker logs asi-explorer | head -20
   ```

## Security Considerations

1. **Admin Secret**: Always change the default Hasura admin secret in production
2. **HTTPS**: Use a reverse proxy (nginx, Traefik) for SSL termination
3. **Rate Limiting**: Implement rate limiting at the reverse proxy level
4. **CORS**: Configure appropriate CORS headers for your domain
5. **Container Security**: Run containers as non-root user in production

## Performance Optimization

1. **Enable gzip compression**: Already configured in nginx.conf
2. **Browser caching**: Static assets cached for 1 year
3. **CDN**: Consider using a CDN for static assets
4. **Horizontal scaling**: Deploy multiple replicas behind a load balancer

## Backup and Recovery

The explorer is stateless and doesn't require backups. All data comes from the GraphQL endpoint.

To preserve configuration:

```bash
# Backup environment configuration
docker-compose config > docker-compose.backup.yml

# Backup Docker image
docker save asi-explorer:latest | gzip > asi-explorer-backup.tar.gz

# Restore Docker image
docker load < asi-explorer-backup.tar.gz
```
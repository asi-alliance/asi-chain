# ASI Chain Faucet - Docker Deployment

This directory contains a Dockerized version of the ASI Chain RChain-compatible faucet service.

## Quick Start

1. **Clone and setup:**
   ```bash
   cd faucet/
   cp .env.example .env
   ```

2. **Configure environment:**
   Edit `.env` file with your settings:
   ```bash
   FAUCET_PRIVATE_KEY=your_private_key_here
   FAUCET_AMOUNT=100
   VALIDATOR_URL=http://18.142.221.192:40413
   READONLY_URL=http://18.142.221.192:40453
   ```

3. **Start the faucet:**
   ```bash
   docker-compose up -d
   ```

4. **Access the faucet:**
   - Web interface: http://localhost:5000
   - Health check: http://localhost:5000/health
   - Stats API: http://localhost:5000/stats

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FAUCET_PRIVATE_KEY` | Hex private key for faucet account | - | ✅ |
| `FAUCET_AMOUNT` | REV tokens per request | 100 | ❌ |
| `VALIDATOR_URL` | F1R3FLY validator endpoint | http://18.142.221.192:40413 | ❌ |
| `READONLY_URL` | F1R3FLY read-only endpoint | http://18.142.221.192:40453 | ❌ |
| `PHLO_LIMIT` | Transaction gas limit | 500000 | ❌ |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret | - | ❌ |

### Network Configuration

The faucet connects to ASI Chain F1R3FLY nodes:
- **Validator Node** (port 40413): For sending transactions
- **Read-Only Node** (port 40453): For balance queries
- **Rust Client**: Used internally for reliable gRPC communication

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services  
docker-compose down

# Rebuild and restart
docker-compose down && docker-compose build && docker-compose up -d

# Check status
docker-compose ps
```

## API Endpoints

### Web Interface
- `GET /` - Faucet web interface

### API Endpoints
- `POST /request` - Request tokens
  - Body: `address=REV_ADDRESS`
  - Rate limit: 20 requests/hour per IP
  - Daily limit: 5 requests per address

- `GET /stats` - Get faucet statistics
- `GET /health` - Health check endpoint

## Health Monitoring

The container includes health checks:
```bash
# Check container health
docker ps

# View health check logs
docker inspect asi-chain-faucet | grep Health -A 10
```

## Data Persistence

Database is stored in Docker volume `faucet_data`:
```bash
# Backup database
docker cp asi-chain-faucet:/app/data/faucet.db ./backup.db

# View volume info
docker volume inspect faucet_faucet_data
```

## Security Features

- **Rate Limiting**: 20 requests/hour per IP
- **Address Validation**: REV address format validation
- **CAPTCHA Support**: Optional Google reCAPTCHA integration
- **Non-root User**: Container runs as unprivileged user
- **Resource Limits**: Docker memory and CPU limits

## Production Deployment

For production deployment:

1. **Use environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Enable HTTPS** (recommended):
   ```bash
   # Add reverse proxy (nginx/traefik)
   # Configure SSL certificates
   ```

3. **Monitor resources:**
   ```bash
   docker stats asi-chain-faucet
   ```

4. **Set resource limits:**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

## Troubleshooting

### Common Issues

1. **Container won't start:**
   ```bash
   docker-compose logs faucet
   # Check FAUCET_PRIVATE_KEY is set
   ```

2. **Network connectivity:**
   ```bash
   docker exec -it asi-chain-faucet curl http://18.142.221.192:40413/api/status
   ```

3. **Database permissions:**
   ```bash
   # Ensure volume has correct permissions
   docker exec -it asi-chain-faucet ls -la /app/data/
   ```

### Reset Database

```bash
docker-compose down
docker volume rm faucet_faucet_data
docker-compose up -d
```

## Development

For development with hot reload:
```bash
# Mount source code
docker run -it --rm \
  -p 5000:5000 \
  -v $(pwd):/app \
  -e FAUCET_PRIVATE_KEY=your_key \
  python:3.12-slim \
  bash -c "cd /app && pip install -r requirements_rchain.txt && python rchain_faucet.py"
```

## Support

- Check logs: `docker-compose logs -f`
- Health status: `curl http://localhost:5000/health`
- Stats: `curl http://localhost:5000/stats`
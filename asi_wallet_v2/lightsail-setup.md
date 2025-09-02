# AWS Lightsail Deployment Guide for ASI Wallet v2

## Prerequisites

1. **AWS Account** with Lightsail access
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```
3. **Docker** installed locally
4. **Node.js 18+** for local development

## Quick Start

### 1. One-Command Deployment

For staging:
```bash
chmod +x lightsail-deploy.sh
./lightsail-deploy.sh staging
```

For production:
```bash
./lightsail-deploy.sh production
```

## Manual Setup Steps

### 1. Create Lightsail Container Service

```bash
# Create container service
aws lightsail create-container-service \
  --service-name asi-wallet-v2 \
  --power micro \
  --scale 1 \
  --region us-east-1

# Wait for service to be READY (takes ~5 minutes)
aws lightsail get-container-services \
  --service-name asi-wallet-v2 \
  --region us-east-1
```

### 2. Build and Push Docker Image

```bash
# Build Docker image
docker build -t asi-wallet-v2:latest .

# Push to Lightsail registry
aws lightsail push-container-image \
  --service-name asi-wallet-v2 \
  --label asi-wallet \
  --image asi-wallet-v2:latest \
  --region us-east-1
```

### 3. Deploy Container

Create deployment configuration:
```json
{
  "serviceName": "asi-wallet-v2",
  "containers": {
    "wallet": {
      "image": ":asi-wallet-v2.asi-wallet.X",
      "ports": {
        "80": "HTTP"
      },
      "environment": {
        "REACT_APP_WALLETCONNECT_PROJECT_ID": "your-project-id",
        "REACT_APP_RCHAIN_HTTP_URL": "https://your-node.com:40403"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "wallet",
    "containerPort": 80,
    "healthCheck": {
      "path": "/health"
    }
  }
}
```

Deploy:
```bash
aws lightsail create-container-service-deployment \
  --cli-input-json file://deployment.json \
  --region us-east-1
```

## Service Configurations

### Recommended Power and Scale Settings

| Environment | Power  | Scale | Monthly Cost |
|------------|--------|-------|--------------|
| Dev/Test   | micro  | 1     | ~$10         |
| Staging    | small  | 1     | ~$20         |
| Production | medium | 2     | ~$80         |
| High Load  | large  | 3     | ~$240        |

### Update Service Power/Scale

```bash
# Scale up for production
aws lightsail update-container-service \
  --service-name asi-wallet-v2 \
  --power medium \
  --scale 2 \
  --region us-east-1
```

## Custom Domain Setup

### 1. Create Static IP

```bash
aws lightsail allocate-static-ip \
  --static-ip-name asi-wallet-ip \
  --region us-east-1
```

### 2. Attach to Container Service

```bash
aws lightsail attach-static-ip \
  --static-ip-name asi-wallet-ip \
  --instance-name asi-wallet-v2 \
  --region us-east-1
```

### 3. Create SSL Certificate

```bash
aws lightsail create-certificate \
  --certificate-name asi-wallet-cert \
  --domain-name wallet.asi-chain.com \
  --subject-alternative-names www.wallet.asi-chain.com \
  --region us-east-1
```

### 4. Create Distribution (CDN)

```bash
aws lightsail create-distribution \
  --distribution-name asi-wallet-cdn \
  --origin '{
    "name": "asi-wallet-v2",
    "regionName": "us-east-1",
    "protocolPolicy": "https-only"
  }' \
  --default-cache-behavior '{
    "behavior": "cache"
  }' \
  --certificate-name asi-wallet-cert \
  --bundle-id small_1_0 \
  --region us-east-1
```

### 5. Update DNS Records

Point your domain to the Lightsail distribution:
- Type: CNAME
- Name: wallet.asi-chain.com
- Value: [distribution-domain].cloudfront.net

## Environment Variables

Update environment variables without redeployment:

```bash
# Create new deployment with updated env vars
aws lightsail create-container-service-deployment \
  --service-name asi-wallet-v2 \
  --containers '{
    "wallet": {
      "image": "current-image",
      "environment": {
        "NEW_VAR": "value"
      }
    }
  }' \
  --region us-east-1
```

## Monitoring

### View Logs

```bash
# Get container logs
aws lightsail get-container-log \
  --service-name asi-wallet-v2 \
  --container-name wallet \
  --region us-east-1
```

### Check Metrics

```bash
# Get service metrics
aws lightsail get-container-service-metric-data \
  --service-name asi-wallet-v2 \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

### Available Metrics
- CPUUtilization
- MemoryUtilization
- NetworkIn
- NetworkOut

## Backup and Recovery

### Create Snapshot

```bash
# Create container image from current deployment
aws lightsail create-container-service-registry-login \
  --region us-east-1

# Tag and push backup
docker tag asi-wallet-v2:latest \
  [registry-url]/asi-wallet-v2:backup-$(date +%Y%m%d)
docker push [registry-url]/asi-wallet-v2:backup-$(date +%Y%m%d)
```

### Rollback Deployment

```bash
# List available images
aws lightsail get-container-images \
  --service-name asi-wallet-v2 \
  --region us-east-1

# Deploy previous version
aws lightsail create-container-service-deployment \
  --service-name asi-wallet-v2 \
  --containers '{
    "wallet": {
      "image": ":asi-wallet-v2.asi-wallet.PREVIOUS_VERSION"
    }
  }' \
  --region us-east-1
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Lightsail

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and Deploy
        run: |
          ./lightsail-deploy.sh production
```

### GitLab CI Example

```yaml
deploy:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache aws-cli
  script:
    - ./lightsail-deploy.sh production
  only:
    - main
```

## Cost Optimization

1. **Use Lightsail CDN** for static assets (included in distribution bundle)
2. **Enable auto-snapshots** for disaster recovery
3. **Monitor metrics** to right-size power/scale settings
4. **Use reserved capacity** for production (save ~30%)

## Troubleshooting

### Container Won't Start
```bash
# Check container logs
aws lightsail get-container-log \
  --service-name asi-wallet-v2 \
  --container-name wallet \
  --region us-east-1

# Common issues:
# - Missing environment variables
# - Port mismatch (ensure container exposes port 80)
# - Health check failing
```

### High Memory Usage
```bash
# Scale up the service
aws lightsail update-container-service \
  --service-name asi-wallet-v2 \
  --power small \
  --region us-east-1
```

### SSL Certificate Issues
```bash
# Validate certificate
aws lightsail get-certificates \
  --region us-east-1

# Renew if needed
aws lightsail create-certificate \
  --certificate-name asi-wallet-cert-new \
  --domain-name wallet.asi-chain.com \
  --region us-east-1
```

## Security Best Practices

1. **Use secrets manager** for sensitive env vars
2. **Enable WAF** on CloudFront distribution
3. **Restrict CORS** to your domain only
4. **Regular security updates** of base images
5. **Enable container insights** for monitoring
6. **Use private container registry** for production

## Support

- AWS Lightsail Documentation: https://docs.aws.amazon.com/lightsail/
- AWS Support: https://console.aws.amazon.com/support/
- ASI Chain Support: support@asi-chain.com
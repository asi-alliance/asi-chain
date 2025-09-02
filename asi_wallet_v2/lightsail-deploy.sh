#!/bin/bash

# AWS Lightsail Deployment Script for ASI Wallet v2
# Usage: ./lightsail-deploy.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
APP_NAME="asi-wallet-v2"
REGION="us-east-1"
CONTAINER_IMAGE="${APP_NAME}:latest"
PORT=80

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}ASI Wallet v2 - AWS Lightsail Deployment${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}======================================${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${YELLOW}Loading environment variables from .env.${ENVIRONMENT}${NC}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}No .env.${ENVIRONMENT} file found, using defaults${NC}"
fi

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${CONTAINER_IMAGE} .

# Create Lightsail container service if it doesn't exist
SERVICE_NAME="${APP_NAME}-${ENVIRONMENT}"
echo -e "${YELLOW}Checking if Lightsail container service exists...${NC}"

if aws lightsail get-container-services --service-name ${SERVICE_NAME} --region ${REGION} 2>/dev/null; then
    echo -e "${GREEN}Container service ${SERVICE_NAME} already exists${NC}"
else
    echo -e "${YELLOW}Creating new container service ${SERVICE_NAME}...${NC}"
    aws lightsail create-container-service \
        --service-name ${SERVICE_NAME} \
        --power micro \
        --scale 1 \
        --region ${REGION}
    
    # Wait for service to be ready
    echo -e "${YELLOW}Waiting for container service to be ready...${NC}"
    while true; do
        STATE=$(aws lightsail get-container-services --service-name ${SERVICE_NAME} --region ${REGION} --query 'containerServices[0].state' --output text)
        if [ "$STATE" = "READY" ]; then
            break
        fi
        echo -e "${YELLOW}Current state: $STATE. Waiting...${NC}"
        sleep 30
    done
fi

# Push Docker image to Lightsail
echo -e "${YELLOW}Pushing Docker image to Lightsail...${NC}"
aws lightsail push-container-image \
    --service-name ${SERVICE_NAME} \
    --label ${APP_NAME} \
    --image ${CONTAINER_IMAGE} \
    --region ${REGION}

# Get the pushed image name
IMAGE_NAME=$(aws lightsail get-container-images --service-name ${SERVICE_NAME} --region ${REGION} --query 'images[0].image' --output text)
echo -e "${GREEN}Image pushed: ${IMAGE_NAME}${NC}"

# Create deployment configuration
echo -e "${YELLOW}Creating deployment configuration...${NC}"
cat > /tmp/containers.json <<EOF
{
    "wallet": {
        "image": "${IMAGE_NAME}",
        "ports": {
            "${PORT}": "HTTP"
        },
        "environment": {
            "REACT_APP_WALLETCONNECT_PROJECT_ID": "${REACT_APP_WALLETCONNECT_PROJECT_ID:-4c8ec18817ffbbce4b824f14928d0f8b}",
            "REACT_APP_RCHAIN_HTTP_URL": "${REACT_APP_RCHAIN_HTTP_URL:-http://localhost:40403}",
            "REACT_APP_RCHAIN_GRPC_URL": "${REACT_APP_RCHAIN_GRPC_URL:-http://localhost:40401}",
            "REACT_APP_RCHAIN_READONLY_URL": "${REACT_APP_RCHAIN_READONLY_URL:-http://localhost:40403}",
            "REACT_APP_ENVIRONMENT": "${ENVIRONMENT}"
        }
    }
}
EOF

cat > /tmp/publicEndpoint.json <<EOF
{
    "containerName": "wallet",
    "containerPort": ${PORT},
    "healthCheck": {
        "healthyThreshold": 2,
        "unhealthyThreshold": 2,
        "timeoutSeconds": 5,
        "intervalSeconds": 30,
        "path": "/",
        "successCodes": "200-399"
    }
}
EOF

# Deploy the container
echo -e "${YELLOW}Deploying container...${NC}"
aws lightsail create-container-service-deployment \
    --service-name ${SERVICE_NAME} \
    --containers file:///tmp/containers.json \
    --public-endpoint file:///tmp/publicEndpoint.json \
    --region ${REGION}

# Wait for deployment to complete
echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
while true; do
    STATE=$(aws lightsail get-container-service-deployments --service-name ${SERVICE_NAME} --region ${REGION} --query 'deployments[0].state' --output text)
    if [ "$STATE" = "ACTIVE" ]; then
        break
    elif [ "$STATE" = "FAILED" ]; then
        echo -e "${RED}Deployment failed!${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Deployment state: $STATE. Waiting...${NC}"
    sleep 10
done

# Get the public URL
PUBLIC_URL=$(aws lightsail get-container-services --service-name ${SERVICE_NAME} --region ${REGION} --query 'containerServices[0].url' --output text)

# Clean up temp files
rm -f /tmp/containers.json /tmp/publicEndpoint.json

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}Service: ${SERVICE_NAME}${NC}"
echo -e "${GREEN}URL: ${PUBLIC_URL}${NC}"
echo -e "${GREEN}======================================${NC}"

# Optional: Set up custom domain
echo -e "${YELLOW}To set up a custom domain:${NC}"
echo -e "1. Create a Lightsail static IP"
echo -e "2. Attach it to your container service"
echo -e "3. Create a Lightsail distribution (CDN)"
echo -e "4. Configure your DNS to point to the distribution"
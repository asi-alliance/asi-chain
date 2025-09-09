#!/bin/bash

# Quick deployment script for ASI Wallet v2 to AWS Lightsail
# This is a simplified version for immediate deployment

set -e

echo "ASI Wallet v2 - Quick Deploy to AWS Lightsail"
echo "============================================="

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required but not installed. Aborting." >&2; exit 1; }

# Configuration
SERVICE_NAME="asi-wallet-v2-prod"
REGION="us-east-1"

# Build the Docker image
echo "Building Docker image..."
docker build -t asi-wallet:latest .

# Create or update container service
echo "Setting up Lightsail container service..."
if aws lightsail get-container-services --service-name ${SERVICE_NAME} --region ${REGION} 2>/dev/null; then
    echo "Service exists, proceeding with deployment..."
else
    echo "Creating new container service..."
    aws lightsail create-container-service \
        --service-name ${SERVICE_NAME} \
        --power micro \
        --scale 1 \
        --region ${REGION}
    
    echo "Waiting for service to be ready (this takes ~5 minutes)..."
    sleep 300
fi

# Push image to Lightsail
echo "Pushing image to Lightsail..."
aws lightsail push-container-image \
    --service-name ${SERVICE_NAME} \
    --label wallet \
    --image asi-wallet:latest \
    --region ${REGION}

# Get the image name
IMAGE=$(aws lightsail get-container-images --service-name ${SERVICE_NAME} --region ${REGION} --query 'images[0].image' --output text)

# Deploy
echo "Deploying application..."
aws lightsail create-container-service-deployment \
    --service-name ${SERVICE_NAME} \
    --containers "{
        \"wallet\": {
            \"image\": \"${IMAGE}\",
            \"ports\": {
                \"80\": \"HTTP\"
            }
        }
    }" \
    --public-endpoint "{
        \"containerName\": \"wallet\",
        \"containerPort\": 80,
        \"healthCheck\": {
            \"path\": \"/\"
        }
    }" \
    --region ${REGION}

echo "Waiting for deployment..."
sleep 30

# Get URL
URL=$(aws lightsail get-container-services --service-name ${SERVICE_NAME} --region ${REGION} --query 'containerServices[0].url' --output text)

echo "============================================="
echo "Deployment complete!"
echo "Your wallet is available at: ${URL}"
echo "============================================="
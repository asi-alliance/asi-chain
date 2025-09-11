#!/bin/bash

# ASI Chain Explorer Docker Deployment Script
# Deploys the explorer locally with connection to production GraphQL endpoint

set -e

echo "🚀 ASI Chain Explorer Docker Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Parse command line arguments
ACTION=${1:-"start"}

case $ACTION in
    start)
        echo "Starting ASI Chain Explorer..."
        echo ""
        
        # Build the Docker image
        print_status "Building Docker image..."
        docker compose -f docker-compose.standalone.yml build
        
        # Start the container
        print_status "Starting container..."
        docker compose -f docker-compose.standalone.yml up -d
        
        # Wait for health check
        echo ""
        print_status "Waiting for service to be healthy..."
        sleep 5
        
        # Check if container is running
        if docker ps | grep -q asi-explorer; then
            print_status "Explorer is running!"
            echo ""
            echo "📊 Service Information:"
            echo "  • Local URL: http://localhost:3001"
            echo "  • GraphQL Endpoint: http://13.251.66.61:8080/v1/graphql"
            echo "  • Indexer API: http://13.251.66.61:9090"
            echo ""
            echo "📝 View logs: docker logs -f asi-explorer"
        else
            print_error "Failed to start explorer container"
            docker compose -f docker-compose.standalone.yml logs
            exit 1
        fi
        ;;
        
    stop)
        echo "Stopping ASI Chain Explorer..."
        docker compose -f docker-compose.standalone.yml down
        print_status "Explorer stopped"
        ;;
        
    restart)
        echo "Restarting ASI Chain Explorer..."
        docker compose -f docker-compose.standalone.yml restart
        print_status "Explorer restarted"
        ;;
        
    logs)
        echo "Showing explorer logs..."
        docker logs -f asi-explorer
        ;;
        
    status)
        echo "Checking explorer status..."
        if docker ps | grep -q asi-explorer; then
            print_status "Explorer is running"
            docker ps | grep asi-explorer
        else
            print_warning "Explorer is not running"
        fi
        ;;
        
    rebuild)
        echo "Rebuilding ASI Chain Explorer..."
        docker compose -f docker-compose.standalone.yml down
        docker compose -f docker-compose.standalone.yml build --no-cache
        docker compose -f docker-compose.standalone.yml up -d
        print_status "Explorer rebuilt and started"
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|rebuild}"
        echo ""
        echo "Commands:"
        echo "  start   - Build and start the explorer"
        echo "  stop    - Stop the explorer"
        echo "  restart - Restart the explorer"
        echo "  logs    - Show explorer logs"
        echo "  status  - Check if explorer is running"
        echo "  rebuild - Rebuild and restart with fresh image"
        exit 1
        ;;
esac
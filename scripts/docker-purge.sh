#!/bin/bash

# Docker Complete Purge Script
# 
# This script completely purges all Docker resources including:
# - All running and stopped containers
# - All Docker images (including intermediate layers)
# - All Docker volumes (including named and anonymous volumes)
# - All Docker networks (except default ones)
# - All build cache and build contexts
# - All Docker system cache and temporary files
#
# WARNING: This will delete ALL Docker data on your system!
# Use with caution - this action cannot be undone.
#
# Created: 2025-09-09
# Version: 1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "========================================="
echo "🧹 Docker Complete Purge Script v1.0.0"
echo "========================================="
echo ""

# Check if Docker is running
print_info "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Show current Docker usage before purge
echo ""
print_info "Current Docker usage:"
echo "Containers: $(docker ps -aq | wc -l | tr -d ' ')"
echo "Images: $(docker images -q | wc -l | tr -d ' ')"
echo "Volumes: $(docker volume ls -q | wc -l | tr -d ' ')"
echo "Networks: $(docker network ls -q | wc -l | tr -d ' ')"

# Get disk usage before
DISK_BEFORE=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}" 2>/dev/null || echo "N/A")

# Final confirmation
echo ""
print_warning "WARNING: This will permanently delete ALL Docker data!"
print_warning "This includes:"
echo "  • All containers (running and stopped)"
echo "  • All Docker images and layers"
echo "  • All Docker volumes and their data"
echo "  • All custom Docker networks"
echo "  • All build cache and contexts"
echo "  • All Docker system cache"
echo ""
print_warning "This action cannot be undone!"
echo ""

read -p "Are you absolutely sure you want to proceed? (type 'YES' to confirm): " -r
if [[ $REPLY != "YES" ]]; then
    print_info "Operation cancelled by user"
    exit 0
fi

echo ""
print_info "Starting Docker purge process..."

# Step 1: Stop all running containers
echo ""
print_info "Step 1: Stopping all running containers..."
RUNNING_CONTAINERS=$(docker ps -q)
if [ -n "$RUNNING_CONTAINERS" ]; then
    docker stop $RUNNING_CONTAINERS
    print_success "Stopped $(echo $RUNNING_CONTAINERS | wc -w | tr -d ' ') running containers"
else
    print_info "No running containers to stop"
fi

# Step 2: Remove all containers
echo ""
print_info "Step 2: Removing all containers..."
ALL_CONTAINERS=$(docker ps -aq)
if [ -n "$ALL_CONTAINERS" ]; then
    docker rm $ALL_CONTAINERS
    print_success "Removed $(echo $ALL_CONTAINERS | wc -w | tr -d ' ') containers"
else
    print_info "No containers to remove"
fi

# Step 3: Remove all images
echo ""
print_info "Step 3: Removing all images..."
ALL_IMAGES=$(docker images -q)
if [ -n "$ALL_IMAGES" ]; then
    docker rmi $ALL_IMAGES --force
    print_success "Removed $(echo $ALL_IMAGES | wc -w | tr -d ' ') images"
else
    print_info "No images to remove"
fi

# Step 4: Remove all volumes
echo ""
print_info "Step 4: Removing all volumes..."
ALL_VOLUMES=$(docker volume ls -q)
if [ -n "$ALL_VOLUMES" ]; then
    docker volume rm $ALL_VOLUMES --force
    print_success "Removed $(echo $ALL_VOLUMES | wc -w | tr -d ' ') volumes"
else
    print_info "No volumes to remove"
fi

# Step 5: Remove all custom networks
echo ""
print_info "Step 5: Removing custom networks..."
# Get all networks except the default ones (bridge, host, none)
CUSTOM_NETWORKS=$(docker network ls --filter type=custom -q)
if [ -n "$CUSTOM_NETWORKS" ]; then
    docker network rm $CUSTOM_NETWORKS
    print_success "Removed $(echo $CUSTOM_NETWORKS | wc -w | tr -d ' ') custom networks"
else
    print_info "No custom networks to remove"
fi

# Step 6: Clear build cache
echo ""
print_info "Step 6: Clearing build cache..."
BUILD_CACHE_OUTPUT=$(docker builder prune --all --force 2>&1)
if echo "$BUILD_CACHE_OUTPUT" | grep -q "Total reclaimed space"; then
    RECLAIMED_CACHE=$(echo "$BUILD_CACHE_OUTPUT" | grep "Total reclaimed space" | awk '{print $4" "$5}')
    print_success "Cleared build cache - reclaimed: $RECLAIMED_CACHE"
else
    print_success "Build cache cleared"
fi

# Step 7: System prune (comprehensive cleanup)
echo ""
print_info "Step 7: Running comprehensive system cleanup..."
SYSTEM_PRUNE_OUTPUT=$(docker system prune --all --volumes --force 2>&1)
if echo "$SYSTEM_PRUNE_OUTPUT" | grep -q "Total reclaimed space"; then
    RECLAIMED_SYSTEM=$(echo "$SYSTEM_PRUNE_OUTPUT" | grep "Total reclaimed space" | awk '{print $4" "$5}')
    print_success "System cleanup completed - reclaimed: $RECLAIMED_SYSTEM"
else
    print_success "System cleanup completed"
fi

# Step 8: Verify cleanup
echo ""
print_info "Step 8: Verifying cleanup..."

# Check remaining resources
REMAINING_CONTAINERS=$(docker ps -aq | wc -l | tr -d ' ')
REMAINING_IMAGES=$(docker images -q | wc -l | tr -d ' ')
REMAINING_VOLUMES=$(docker volume ls -q | wc -l | tr -d ' ')
REMAINING_NETWORKS=$(docker network ls -q | wc -l | tr -d ' ')

echo ""
print_info "Cleanup verification:"
echo "Remaining containers: $REMAINING_CONTAINERS"
echo "Remaining images: $REMAINING_IMAGES"  
echo "Remaining volumes: $REMAINING_VOLUMES"
echo "Remaining networks: $REMAINING_NETWORKS (default networks: bridge, host, none)"

# Final status
echo ""
if [ "$REMAINING_CONTAINERS" -eq 0 ] && [ "$REMAINING_IMAGES" -eq 0 ] && [ "$REMAINING_VOLUMES" -eq 0 ]; then
    print_success "Docker purge completed successfully!"
    print_success "All containers, images, and volumes have been removed"
else
    print_warning "Purge completed with some resources remaining"
    print_info "This may be normal for system images or protected resources"
fi

# Show current disk usage after purge
echo ""
print_info "Current Docker disk usage:"
docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}" 2>/dev/null || print_info "No Docker resources consuming disk space"

echo ""
print_info "Docker purge process completed!"
print_info "You can now start fresh with Docker deployments"
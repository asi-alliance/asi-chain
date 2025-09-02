#\!/bin/bash
# Docker cleanup script

echo "Starting Docker cleanup at $(date)"

# Remove unused containers
echo "Removing stopped containers..."
docker container prune -f

# Remove unused images
echo "Removing unused images..."
docker image prune -f

# Remove unused volumes (be careful\!)
echo "Removing unused volumes..."
docker volume prune -f

# Clean build cache
echo "Cleaning build cache..."
docker builder prune -f

# Show disk usage after cleanup
echo -e "\nDisk usage after cleanup:"
docker system df
df -h /

echo "Cleanup completed at $(date)"

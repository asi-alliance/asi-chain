#!/bin/bash

# ==============================================================================
# ==> WARNING: DESTRUCTIVE SCRIPT <==
#
# This script will COMPLETELY WIPE your local Docker environment. It will:
#   - Stop all running containers
#   - Delete all containers (stopped or running)
#   - Delete all Docker images
#   - Delete all Docker volumes (where persistent data is stored)
#   - Delete all Docker networks
#   - Delete the Docker build cache
#
# This action is IRREVERSIBLE. Please be absolutely sure before you proceed.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!!                          DANGER ZONE                               !!!"
echo "!!! This script will permanently delete all Docker containers, images, !!!"
echo "!!! volumes, and networks. This cannot be undone.                    !!!"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo

read -p "Are you absolutely sure you want to completely flush Docker? (y/N): " -r
echo
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborted. No changes were made."
    exit 1
fi

echo "--- Starting Docker Flush Process ---"

# Step 1: Stop all running containers
echo "--- Step 1: Stopping all running Docker containers... ---"
# The `docker ps -q` command lists the IDs of all running containers.
# If the list is not empty, it passes them to `docker stop`.
if [ -n "$(docker ps -q)" ]; then
   docker stop $(docker ps -q)
else
   echo "No running containers to stop."
fi
echo "--- All containers stopped. ---"
echo

# Step 2: Delete all containers
echo "--- Step 2: Deleting all Docker containers... ---"
# The `docker ps -a -q` command lists the IDs of all containers (running or stopped).
# If the list is not empty, it passes them to `docker rm`.
if [ -n "$(docker ps -a -q)" ]; then
   docker rm $(docker ps -a -q)
else
   echo "No containers to delete."
fi
echo "--- All containers deleted. ---"
echo

# Step 3: Delete all Docker images
echo "--- Step 3: Deleting all Docker images... ---"
# The `docker images -q` command lists the IDs of all images.
# If the list is not empty, it passes them to `docker rmi -f` to force removal.
if [ -n "$(docker images -q)" ]; then
   docker rmi -f $(docker images -q)
else
   echo "No images to delete."
fi
echo "--- All images deleted. ---"
echo

# Step 4: Delete all Docker volumes
echo "--- Step 4: Deleting all Docker volumes... ---"
# The `docker volume ls -q` command lists the names of all volumes.
# If the list is not empty, it passes them to `docker volume rm`.
if [ -n "$(docker volume ls -q)" ]; then
   docker volume rm $(docker volume ls -q)
else
   echo "No volumes to delete."
fi
echo "--- All volumes deleted. ---"
echo

# Step 5: Perform a full system prune
echo "--- Step 5: Pruning Docker system (build cache, unused networks, etc.)... ---"
# The `--all` flag removes all unused images, not just dangling ones.
# The `--force` flag prevents the command from asking for confirmation again.
docker system prune --all --force --volumes
echo "--- Docker system pruned. ---"
echo

echo "--- Docker Flush Process Completed ---"
echo "Your Docker environment has been completely reset."
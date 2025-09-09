#!/bin/bash

# Script to apply patches to F1R3FLY submodule
# This allows us to make necessary fixes without modifying the submodule directly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory and repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${GREEN}F1R3FLY Patch Application Script${NC}"
echo "=================================="
echo

# Change to repository root
cd "$REPO_ROOT"

# Check if we're in the right repository
if [ ! -d "f1r3fly" ]; then
    echo -e "${RED}Error: f1r3fly directory not found. Are you in the asi-chain repository?${NC}"
    exit 1
fi

# Check if patches directory exists
if [ ! -d "patches" ]; then
    echo -e "${RED}Error: patches directory not found${NC}"
    exit 1
fi

# Function to apply a patch
apply_patch() {
    local patch_file=$1
    local patch_name=$(basename "$patch_file")
    
    echo -e "${YELLOW}Applying patch: $patch_name${NC}"
    
    # Check if patch is already applied
    cd f1r3fly
    if git apply --check --reverse "../patches/$patch_name" 2>/dev/null; then
        echo -e "${GREEN}✓ Patch $patch_name is already applied${NC}"
        cd ..
        return 0
    fi
    
    # Try to apply the patch
    if git apply --check "../patches/$patch_name" 2>/dev/null; then
        git apply "../patches/$patch_name"
        echo -e "${GREEN}✓ Successfully applied $patch_name${NC}"
    else
        echo -e "${RED}✗ Failed to apply $patch_name - it may already be applied or conflicts exist${NC}"
        cd ..
        return 1
    fi
    
    cd ..
}

# Apply all patches
echo "Applying patches to F1R3FLY submodule..."
echo

# Apply the docker-compose environment variable fix
if [ -f "patches/f1r3fly-docker-compose-env-fix.patch" ]; then
    apply_patch "f1r3fly-docker-compose-env-fix.patch"
else
    echo -e "${YELLOW}No docker-compose patch found${NC}"
fi

# Check for any other patches
for patch in patches/f1r3fly-*.patch; do
    if [ -f "$patch" ] && [ "$patch" != "patches/f1r3fly-docker-compose-env-fix.patch" ]; then
        apply_patch "$(basename "$patch")"
    fi
done

echo
echo -e "${GREEN}Patch application complete!${NC}"
echo

# Show current status
echo "Current F1R3FLY submodule status:"
cd f1r3fly
git status --short
cd ..

echo
echo -e "${YELLOW}Note: These changes are local only and won't be committed to the submodule.${NC}"
echo -e "${YELLOW}To revert all patches, run: ${NC}cd f1r3fly && git checkout ."
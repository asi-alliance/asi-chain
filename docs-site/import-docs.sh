#!/bin/bash
# Import all ASI Chain documentation into Docusaurus

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Importing ASI Chain Documentation${NC}"
echo -e "${GREEN}=====================================${NC}"

# Source documentation directory
SOURCE_DOCS="./docs"
# Destination docs directory
DEST_DOCS="./docs"

# Clean up old default content
echo -e "\n${YELLOW}Cleaning up default content...${NC}"
rm -f $DEST_DOCS/intro.md
rm -f $DEST_DOCS/api-reference.md
rm -f $DEST_DOCS/smart-contracts.md

# Create directory structure
echo -e "\n${YELLOW}Creating documentation structure...${NC}"
mkdir -p $DEST_DOCS/getting-started
mkdir -p $DEST_DOCS/architecture
mkdir -p $DEST_DOCS/development
mkdir -p $DEST_DOCS/deployment
mkdir -p $DEST_DOCS/operations
mkdir -p $DEST_DOCS/monitoring
mkdir -p $DEST_DOCS/api
mkdir -p $DEST_DOCS/smart-contracts
mkdir -p $DEST_DOCS/troubleshooting
mkdir -p $DEST_DOCS/performance
mkdir -p $DEST_DOCS/tools
mkdir -p $DEST_DOCS/governance

# Create main index page
echo -e "\n${YELLOW}Creating main documentation index...${NC}"
cat > $DEST_DOCS/intro.md << 'EOF'
---
sidebar_position: 1
title: Documentation Overview
slug: /intro
---

# ASI Chain Documentation

Welcome to the ASI Chain documentation. ASI Chain is the blockchain infrastructure for the Artificial Superintelligence Alliance, built on F1R3FLY/RChain architecture.

## Quick Links

- [Architecture Overview](/docs/architecture/overview) - Understand the system design
- [Development Guide](/docs/development/guide) - Start building on ASI Chain
- [API Reference](/docs/api/reference) - Complete API documentation
- [Deployment Guide](/docs/deployment/docker-guide) - Deploy your own network

## Key Features

- **CBC Casper Consensus**: Proof-of-stake with 30-second block times
- **Rholang Smart Contracts**: Concurrent process calculus language
- **Multi-validator Support**: Scalable validator network
- **Production Ready**: 100% test success rates with monitoring

## Network Information

- **Current Network**: ASI Chain Testnet
- **Block Time**: 30 seconds
- **Consensus**: CBC Casper PoS
- **Smart Contracts**: Rholang

## Getting Started

1. [Installation Guide](/docs/getting-started/installation)
2. [Connect to Network](/docs/getting-started/connect-network)
3. [Your First Smart Contract](/docs/smart-contracts/first-contract)

## Support

- GitHub: [asi-alliance/asi-chain](https://github.com/asi-alliance/asi-chain)
- Issues: [GitHub Issues](https://github.com/asi-alliance/asi-chain/issues)
EOF

# Copy and organize documentation files
echo -e "\n${YELLOW}Importing documentation files...${NC}"

# Architecture documents
cp "$SOURCE_DOCS/ARCHITECTURE_OVERVIEW.MD" "$DEST_DOCS/architecture/overview.md"
cp "$SOURCE_DOCS/F1R3FLY_NODE.MD" "$DEST_DOCS/architecture/f1r3fly-node.md"

# Development documents
cp "$SOURCE_DOCS/DEVELOPMENT_GUIDE.MD" "$DEST_DOCS/development/guide.md"
cp "$SOURCE_DOCS/CONFIG_GUIDE.MD" "$DEST_DOCS/development/configuration.md"
cp "$SOURCE_DOCS/RHOLANG_PROGRAMMING_GUIDE.MD" "$DEST_DOCS/smart-contracts/rholang-guide.md"

# API documentation
cp "$SOURCE_DOCS/API_REFERENCE.MD" "$DEST_DOCS/api/reference.md"

# Deployment documents
cp "$SOURCE_DOCS/DOCKER_GUIDE.MD" "$DEST_DOCS/deployment/docker-guide.md"
cp "$SOURCE_DOCS/F1R3FLY_DOCKER_DEPLOYMENT_GUIDE.MD" "$DEST_DOCS/deployment/f1r3fly-deployment.md"
cp "$SOURCE_DOCS/DOCKER_CONFIGURATION_CHANGES.MD" "$DEST_DOCS/deployment/docker-config-changes.md"
cp "$SOURCE_DOCS/deployment/AWS_LIGHTSAIL_DEPLOYMENT.MD" "$DEST_DOCS/deployment/aws-lightsail.md"
cp "$SOURCE_DOCS/deployment/AWS_LIGHTSAIL_SERVER_SPECS.MD" "$DEST_DOCS/deployment/server-specs.md"

# Operations documents
cp "$SOURCE_DOCS/operations/REPOSITORY_OPERATIONS.MD" "$DEST_DOCS/operations/repository-ops.md"
cp "$SOURCE_DOCS/operations/RUNBOOK.MD" "$DEST_DOCS/operations/runbook.md"
cp "$SOURCE_DOCS/operations/DEPLOYMENT_ARTIFACTS.MD" "$DEST_DOCS/operations/artifacts.md"

# Monitoring documents
cp "$SOURCE_DOCS/monitoring/MONITORING_STACK.MD" "$DEST_DOCS/monitoring/stack.md"
cp "$SOURCE_DOCS/monitoring/BLOCKCHAIN_METRICS_EXPORTER.MD" "$DEST_DOCS/monitoring/metrics-exporter.md"
cp "$SOURCE_DOCS/monitoring/NETWORK_STRESS_TESTING.MD" "$DEST_DOCS/monitoring/stress-testing.md"
cp "$SOURCE_DOCS/NETWORK_STATUS.MD" "$DEST_DOCS/monitoring/network-status.md"

# Performance documents
cp "$SOURCE_DOCS/performance/PERFORMANCE_TUNING_GUIDE.MD" "$DEST_DOCS/performance/tuning-guide.md"
cp "$SOURCE_DOCS/BENCHMARKS.md" "$DEST_DOCS/performance/benchmarks.md"

# Tools documentation
cp "$SOURCE_DOCS/tools/RUST_CLIENT_GUIDE.MD" "$DEST_DOCS/tools/rust-client.md"
cp "$SOURCE_DOCS/tools/RUST_CLIENT_TEST_RESULTS.MD" "$DEST_DOCS/tools/rust-client-tests.md"

# Troubleshooting documents
cp "$SOURCE_DOCS/troubleshooting/COMMON_ISSUES.MD" "$DEST_DOCS/troubleshooting/common-issues.md"
cp "$SOURCE_DOCS/troubleshooting/AUTOPROPOSE_HEALTH_FIX.MD" "$DEST_DOCS/troubleshooting/autopropose-fix.md"

# Smart contracts documentation
cp "$SOURCE_DOCS/smart-contracts/SMART_CONTRACT_TESTING.MD" "$DEST_DOCS/smart-contracts/testing.md"
cp "$SOURCE_DOCS/CASPER_CONSENSUS_GUIDE.MD" "$DEST_DOCS/smart-contracts/casper-consensus.md"

# Governance documents
cp "$SOURCE_DOCS/ASIP_PROCESS.md" "$DEST_DOCS/governance/asip-process.md"
cp "$SOURCE_DOCS/ASI_BRAND_GUIDELINES.md" "$DEST_DOCS/governance/brand-guidelines.md"

# Copy scripts README as tools documentation
cp "./asi-chain/scripts/README.MD" "$DEST_DOCS/tools/operational-scripts.md"

# Add frontmatter to all imported files
echo -e "\n${YELLOW}Adding frontmatter to documentation...${NC}"

# Function to add frontmatter
add_frontmatter() {
    local file=$1
    local title=$2
    local position=$3
    
    # Create temp file with frontmatter
    echo "---" > temp.md
    echo "sidebar_position: $position" >> temp.md
    echo "title: $title" >> temp.md
    echo "---" >> temp.md
    echo "" >> temp.md
    cat "$file" >> temp.md
    mv temp.md "$file"
}

# Add frontmatter to files
add_frontmatter "$DEST_DOCS/architecture/overview.md" "Architecture Overview" 1
add_frontmatter "$DEST_DOCS/architecture/f1r3fly-node.md" "F1R3FLY Node" 2
add_frontmatter "$DEST_DOCS/development/guide.md" "Development Guide" 1
add_frontmatter "$DEST_DOCS/development/configuration.md" "Configuration Guide" 2
add_frontmatter "$DEST_DOCS/api/reference.md" "API Reference" 1
add_frontmatter "$DEST_DOCS/deployment/docker-guide.md" "Docker Deployment" 1
add_frontmatter "$DEST_DOCS/deployment/f1r3fly-deployment.md" "F1R3FLY Deployment" 2
add_frontmatter "$DEST_DOCS/deployment/aws-lightsail.md" "AWS Lightsail" 3
add_frontmatter "$DEST_DOCS/operations/repository-ops.md" "Repository Operations" 1
add_frontmatter "$DEST_DOCS/operations/runbook.md" "Runbook" 2
add_frontmatter "$DEST_DOCS/monitoring/stack.md" "Monitoring Stack" 1
add_frontmatter "$DEST_DOCS/monitoring/network-status.md" "Network Status" 2
add_frontmatter "$DEST_DOCS/smart-contracts/rholang-guide.md" "Rholang Guide" 1
add_frontmatter "$DEST_DOCS/smart-contracts/testing.md" "Contract Testing" 2
add_frontmatter "$DEST_DOCS/troubleshooting/common-issues.md" "Common Issues" 1
add_frontmatter "$DEST_DOCS/tools/rust-client.md" "Rust Client" 1
add_frontmatter "$DEST_DOCS/tools/operational-scripts.md" "Operational Scripts" 2

echo -e "\n${GREEN}Documentation import complete!${NC}"
echo -e "${GREEN}Total files imported: $(find $DEST_DOCS -name "*.md" | wc -l)${NC}"
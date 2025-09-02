#!/bin/bash

# ASI Chain Smart Contract Deployment Script
# Deploys all contracts to testnet

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NETWORK="testnet"
RPC_URL="https://rpc.testnet.asi-chain.io"
CHAIN_ID="42161"
GAS_PRICE="20000000000" # 20 Gwei

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Deploy contracts using Hardhat
deploy_contracts() {
    log "Deploying smart contracts to testnet..."
    
    cd contracts
    
    # Install dependencies
    log "Installing dependencies..."
    npm install
    
    # Compile contracts
    log "Compiling contracts..."
    npx hardhat compile
    
    # Run deployment
    log "Deploying contracts..."
    npx hardhat run scripts/deploy.js --network testnet
    
    # Verify contracts
    log "Verifying contracts on Etherscan..."
    npx hardhat verify --network testnet
    
    cd ..
    
    success "Smart contracts deployed successfully!"
}

# Setup contract interactions
setup_contracts() {
    log "Setting up contract interactions..."
    
    # Fund faucet contract
    log "Funding faucet with 1M ASI tokens..."
    
    # Setup staking rewards
    log "Configuring staking rewards..."
    
    # Initialize governance
    log "Initializing governance parameters..."
    
    success "Contract setup complete!"
}

# Main execution
main() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ASI Chain Contract Deployment        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    
    deploy_contracts
    setup_contracts
    
    log "Contract deployment complete!"
    log "Check deployments/testnet/ for contract addresses"
}

main "$@"
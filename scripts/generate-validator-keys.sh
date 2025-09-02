#!/bin/bash

# ASI Chain Validator Key Generation Script
# Generates secure validator keys for production deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NUM_VALIDATORS=4
KEY_DIR="./validator-keys"
BACKUP_DIR="./validator-keys-backup-$(date +%Y%m%d-%H%M%S)"

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

# Create key directories
create_directories() {
    log "Creating key directories..."
    
    # Backup existing keys if they exist
    if [ -d "$KEY_DIR" ]; then
        warning "Existing keys found, backing up to $BACKUP_DIR"
        mv "$KEY_DIR" "$BACKUP_DIR"
    fi
    
    mkdir -p "$KEY_DIR"
    chmod 700 "$KEY_DIR"
    
    success "Directories created"
}

# Generate validator keys using Web3
generate_validator_keys() {
    log "Generating validator keys..."
    
    cat > generate-keys.js <<'EOF'
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const NUM_VALIDATORS = 4;
const KEY_DIR = './validator-keys';

// Generate keys for each validator
for (let i = 1; i <= NUM_VALIDATORS; i++) {
    // Generate a new random wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Extract key information
    const keyData = {
        validatorId: i,
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        mnemonic: wallet.mnemonic.phrase,
        path: wallet.mnemonic.path
    };
    
    // Save to JSON file (encrypted in production)
    const keyFile = path.join(KEY_DIR, `validator-${i}.json`);
    fs.writeFileSync(keyFile, JSON.stringify(keyData, null, 2));
    fs.chmodSync(keyFile, 0o600);
    
    // Save address separately for easy access
    const addressFile = path.join(KEY_DIR, `validator-${i}.address`);
    fs.writeFileSync(addressFile, wallet.address);
    
    console.log(`Validator ${i}:`);
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Key saved to: ${keyFile}`);
}

// Generate genesis allocations
const genesis = {
    validators: [],
    allocations: {}
};

for (let i = 1; i <= NUM_VALIDATORS; i++) {
    const keyFile = path.join(KEY_DIR, `validator-${i}.json`);
    const keyData = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    
    genesis.validators.push(keyData.address);
    genesis.allocations[keyData.address] = {
        balance: "1000000000000000000000000" // 1M ETH for testing
    };
}

// Add faucet account
const faucetWallet = ethers.Wallet.createRandom();
genesis.allocations[faucetWallet.address] = {
    balance: "100000000000000000000000000" // 100M ETH for faucet
};

fs.writeFileSync(
    path.join(KEY_DIR, 'faucet.json'),
    JSON.stringify({
        address: faucetWallet.address,
        privateKey: faucetWallet.privateKey
    }, null, 2)
);

// Save genesis configuration
fs.writeFileSync(
    path.join(KEY_DIR, 'genesis-config.json'),
    JSON.stringify(genesis, null, 2)
);

console.log('\n✅ All validator keys generated successfully!');
console.log(`📁 Keys saved to: ${KEY_DIR}`);
console.log(`📋 Genesis config saved to: ${KEY_DIR}/genesis-config.json`);
EOF
    
    # Check if Node.js and ethers are available
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
    fi
    
    # Install ethers if not present
    if [ ! -d "node_modules/ethers" ]; then
        log "Installing ethers.js..."
        npm install ethers
    fi
    
    # Generate the keys
    node generate-keys.js
    
    # Clean up
    rm generate-keys.js
    
    success "Validator keys generated"
}

# Store keys in AWS Secrets Manager
store_keys_aws() {
    log "Storing keys in AWS Secrets Manager..."
    
    for i in $(seq 1 $NUM_VALIDATORS); do
        KEY_FILE="$KEY_DIR/validator-$i.json"
        SECRET_NAME="asi-chain/testnet/validator-$i"
        
        # Check if secret exists
        if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &>/dev/null 2>&1; then
            log "Updating existing secret: $SECRET_NAME"
            aws secretsmanager update-secret \
                --secret-id "$SECRET_NAME" \
                --secret-string file://"$KEY_FILE"
        else
            log "Creating new secret: $SECRET_NAME"
            aws secretsmanager create-secret \
                --name "$SECRET_NAME" \
                --description "ASI Chain Testnet Validator $i Private Key" \
                --secret-string file://"$KEY_FILE"
        fi
    done
    
    # Store faucet key
    aws secretsmanager create-secret \
        --name "asi-chain/testnet/faucet" \
        --description "ASI Chain Testnet Faucet Private Key" \
        --secret-string file://"$KEY_DIR/faucet.json" || \
    aws secretsmanager update-secret \
        --secret-id "asi-chain/testnet/faucet" \
        --secret-string file://"$KEY_DIR/faucet.json"
    
    success "Keys stored in AWS Secrets Manager"
}

# Create Kubernetes secrets
create_k8s_secrets() {
    log "Creating Kubernetes secrets..."
    
    for i in $(seq 1 $NUM_VALIDATORS); do
        KEY_FILE="$KEY_DIR/validator-$i.json"
        KEY_DATA=$(cat "$KEY_FILE")
        ADDRESS=$(jq -r '.address' "$KEY_FILE")
        PRIVATE_KEY=$(jq -r '.privateKey' "$KEY_FILE")
        
        kubectl create secret generic validator-$i-keys \
            --namespace=asi-chain \
            --from-literal=address="$ADDRESS" \
            --from-literal=privateKey="$PRIVATE_KEY" \
            --dry-run=client -o yaml | kubectl apply -f -
    done
    
    # Create faucet secret
    FAUCET_DATA=$(cat "$KEY_DIR/faucet.json")
    FAUCET_ADDRESS=$(echo "$FAUCET_DATA" | jq -r '.address')
    FAUCET_KEY=$(echo "$FAUCET_DATA" | jq -r '.privateKey')
    
    kubectl create secret generic faucet-credentials \
        --namespace=asi-chain \
        --from-literal=address="$FAUCET_ADDRESS" \
        --from-literal=private-key="$FAUCET_KEY" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Kubernetes secrets created"
}

# Generate key summary
generate_summary() {
    log "Generating key summary..."
    
    cat > "$KEY_DIR/KEYS_SUMMARY.md" <<EOF
# ASI Chain Validator Keys Summary

**Generated**: $(date)
**Environment**: Testnet
**Number of Validators**: $NUM_VALIDATORS

## Validator Addresses

EOF
    
    for i in $(seq 1 $NUM_VALIDATORS); do
        ADDRESS=$(cat "$KEY_DIR/validator-$i.address")
        echo "- **Validator $i**: \`$ADDRESS\`" >> "$KEY_DIR/KEYS_SUMMARY.md"
    done
    
    FAUCET_ADDRESS=$(jq -r '.address' "$KEY_DIR/faucet.json")
    echo "- **Faucet**: \`$FAUCET_ADDRESS\`" >> "$KEY_DIR/KEYS_SUMMARY.md"
    
    cat >> "$KEY_DIR/KEYS_SUMMARY.md" <<EOF

## Security Notes

⚠️ **CRITICAL SECURITY INFORMATION**
- Private keys are stored in \`$KEY_DIR\`
- Keys are backed up in AWS Secrets Manager
- Never commit private keys to Git
- Rotate keys regularly
- Use hardware wallets for mainnet

## Key Storage Locations

1. **Local**: \`$KEY_DIR/\`
2. **AWS Secrets Manager**: \`asi-chain/testnet/validator-*\`
3. **Kubernetes Secrets**: \`validator-*-keys\` in \`asi-chain\` namespace

## Next Steps

1. Fund validator accounts with ETH for gas
2. Deploy genesis block with validator set
3. Start validator nodes
4. Verify block production

---
*Keep this information secure and never share private keys*
EOF
    
    cat "$KEY_DIR/KEYS_SUMMARY.md"
    
    success "Summary generated: $KEY_DIR/KEYS_SUMMARY.md"
}

# Main execution
main() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ASI Chain Validator Key Generation   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    
    create_directories
    generate_validator_keys
    
    # Only store in AWS if CLI is configured
    if aws sts get-caller-identity &>/dev/null 2>&1; then
        store_keys_aws
    else
        warning "AWS CLI not configured, skipping AWS Secrets Manager"
    fi
    
    # Only create K8s secrets if kubectl is configured
    if kubectl cluster-info &>/dev/null 2>&1; then
        create_k8s_secrets
    else
        warning "kubectl not configured, skipping Kubernetes secrets"
    fi
    
    generate_summary
    
    echo
    log "🔐 Validator keys generated successfully!"
    log "⚠️ IMPORTANT: Secure the private keys immediately!"
    log "📁 Keys location: $KEY_DIR"
}

main "$@"
#!/bin/bash
# Generate F1R3FLY validator keys and addresses
# This replaces the Ethereum key generation script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}F1R3FLY Validator Key Generator${NC}"
echo "================================="
echo ""

# Function to generate a random hex string
generate_random_hex() {
    openssl rand -hex 32
}

# Function to derive public key from private key
# Note: F1R3FLY uses secp256k1 like Bitcoin/Ethereum
derive_public_key() {
    local private_key=$1
    # This would need the actual F1R3FLY key derivation tool
    # For now, we'll use openssl as placeholder
    echo "04$(openssl ec -in <(echo -n "302e0201010420${private_key}a00706052b8104000a" | xxd -r -p) -pubout -outform DER 2>/dev/null | tail -c 65 | xxd -p -c 65)"
}

# Function to derive ETH address from public key
# F1R3FLY still uses ETH addresses internally
derive_eth_address() {
    local public_key=$1
    # Remove 04 prefix and hash with keccak256, take last 20 bytes
    echo "${public_key:2}" | xxd -r -p | openssl dgst -sha3-256 | cut -d' ' -f2 | tail -c 41
}

# Function to derive REV address from ETH address
# REV addresses are base58 encoded with prefix
derive_rev_address() {
    local eth_address=$1
    # This would need the actual REV address derivation
    # Placeholder: prepend with "1111" for now
    echo "1111${eth_address}REV"
}

# Check if number of validators is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <number_of_validators>"
    echo "Example: $0 4"
    exit 1
fi

NUM_VALIDATORS=$1

# Create output directory
OUTPUT_DIR="./f1r3fly-keys-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "Generating keys for $NUM_VALIDATORS validators..."
echo ""

# Arrays to store all keys for bonds.txt
declare -a PUBLIC_KEYS
declare -a REV_ADDRESSES

# Generate keys for each validator
for i in $(seq 1 $NUM_VALIDATORS); do
    echo -e "${YELLOW}Validator $i:${NC}"
    
    # Generate private key
    PRIVATE_KEY=$(generate_random_hex)
    
    # Derive public key
    PUBLIC_KEY=$(derive_public_key "$PRIVATE_KEY")
    
    # Derive ETH address
    ETH_ADDRESS=$(derive_eth_address "$PUBLIC_KEY")
    
    # Derive REV address
    REV_ADDRESS=$(derive_rev_address "$ETH_ADDRESS")
    
    # Store in arrays
    PUBLIC_KEYS+=("$PUBLIC_KEY")
    REV_ADDRESSES+=("$REV_ADDRESS")
    
    # Create validator directory
    VALIDATOR_DIR="$OUTPUT_DIR/validator$i"
    mkdir -p "$VALIDATOR_DIR"
    
    # Save keys to files
    echo "$PRIVATE_KEY" > "$VALIDATOR_DIR/private.key"
    echo "$PUBLIC_KEY" > "$VALIDATOR_DIR/public.key"
    echo "$ETH_ADDRESS" > "$VALIDATOR_DIR/eth.address"
    echo "$REV_ADDRESS" > "$VALIDATOR_DIR/rev.address"
    
    # Create a summary file for this validator
    cat > "$VALIDATOR_DIR/validator.info" <<EOF
Validator $i Information
========================
Private Key: $PRIVATE_KEY
Public Key:  $PUBLIC_KEY
ETH Address: $ETH_ADDRESS
REV Address: $REV_ADDRESS
EOF
    
    # Display summary
    echo "  Private Key: ${PRIVATE_KEY:0:16}..."
    echo "  Public Key:  ${PUBLIC_KEY:0:16}..."
    echo "  ETH Address: $ETH_ADDRESS"
    echo "  REV Address: $REV_ADDRESS"
    echo ""
    
    # Create Kubernetes secret YAML
    cat > "$VALIDATOR_DIR/k8s-secret.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: f1r3fly-validator-${i}-keys
  namespace: asi-chain
type: Opaque
data:
  private-key: $(echo -n "$PRIVATE_KEY" | base64)
  public-key: $(echo -n "$PUBLIC_KEY" | base64)
  eth-address: $(echo -n "$ETH_ADDRESS" | base64)
  rev-address: $(echo -n "$REV_ADDRESS" | base64)
EOF
done

# Generate bonds.txt file
echo -e "${GREEN}Generating bonds.txt...${NC}"
BONDS_FILE="$OUTPUT_DIR/bonds.txt"
echo "# F1R3FLY Validator Bonds" > "$BONDS_FILE"
echo "# Format: <public_key> <stake_amount>" >> "$BONDS_FILE"
for i in $(seq 0 $((NUM_VALIDATORS - 1))); do
    echo "${PUBLIC_KEYS[$i]} 1000" >> "$BONDS_FILE"
done

# Generate wallets.txt file
echo -e "${GREEN}Generating wallets.txt...${NC}"
WALLETS_FILE="$OUTPUT_DIR/wallets.txt"
echo "# F1R3FLY Initial Wallet Distribution" > "$WALLETS_FILE"
echo "# Format: <rev_address>,<initial_balance>,<initial_nonce>" >> "$WALLETS_FILE"
for i in $(seq 0 $((NUM_VALIDATORS - 1))); do
    echo "${REV_ADDRESSES[$i]},1000000,0" >> "$WALLETS_FILE"
done

# Generate Docker Compose environment file
echo -e "${GREEN}Generating Docker Compose .env file...${NC}"
ENV_FILE="$OUTPUT_DIR/.env"
cat > "$ENV_FILE" <<EOF
# F1R3FLY Validator Environment Variables
# Generated on $(date)

EOF

for i in $(seq 1 $NUM_VALIDATORS); do
    j=$((i - 1))
    cat >> "$ENV_FILE" <<EOF
VALIDATOR${i}_PRIVATE_KEY=$(cat "$OUTPUT_DIR/validator$i/private.key")
VALIDATOR${i}_PUBLIC_KEY=${PUBLIC_KEYS[$j]}
VALIDATOR${i}_HOST=f1r3fly-validator-${i}

EOF
done

# Generate summary file
SUMMARY_FILE="$OUTPUT_DIR/summary.txt"
cat > "$SUMMARY_FILE" <<EOF
F1R3FLY Validator Keys Generation Summary
=========================================
Generated on: $(date)
Number of Validators: $NUM_VALIDATORS
Output Directory: $OUTPUT_DIR

Files Generated:
- bonds.txt: Validator bonds configuration
- wallets.txt: Initial wallet distribution
- .env: Docker Compose environment variables
- validator*/: Individual validator keys and configs

Next Steps:
1. Copy bonds.txt and wallets.txt to genesis/ directory
2. Copy .env file to docker deployment directory
3. Apply Kubernetes secrets:
   kubectl apply -f validator*/k8s-secret.yaml

IMPORTANT: Keep private keys secure and never commit them to git!
EOF

echo -e "${GREEN}✓ Key generation complete!${NC}"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo -e "${YELLOW}Files generated:${NC}"
echo "  - bonds.txt (validator bonds)"
echo "  - wallets.txt (initial distribution)"
echo "  - .env (Docker environment)"
echo "  - validator*/ (individual validator keys)"
echo ""
echo -e "${RED}⚠️  SECURITY WARNING:${NC}"
echo "  Keep all private keys secure!"
echo "  Never commit private keys to version control!"
echo ""
echo "See $SUMMARY_FILE for detailed information."
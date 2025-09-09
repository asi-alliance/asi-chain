#!/bin/bash
# Deploy Rholang smart contracts to F1R3FLY network
# Replaces Solidity contract deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
F1R3FLY_NODE=${F1R3FLY_NODE:-"http://localhost:40403"}
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:-""}
DEPLOYER_ADDRESS=${DEPLOYER_ADDRESS:-""}
CONTRACTS_DIR=${CONTRACTS_DIR:-"./rholang-contracts"}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --node <url>       F1R3FLY node URL (default: http://localhost:40403)"
    echo "  -k, --key <key>        Deployer private key"
    echo "  -a, --address <addr>   Deployer REV address"
    echo "  -d, --dir <path>       Contracts directory (default: ./rholang-contracts)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --node http://localhost:40403 --key <private_key>"
    echo "  $0 -n http://validator1:40403 -k <key> -d ./contracts"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--node)
            F1R3FLY_NODE="$2"
            shift 2
            ;;
        -k|--key)
            DEPLOYER_PRIVATE_KEY="$2"
            shift 2
            ;;
        -a|--address)
            DEPLOYER_ADDRESS="$2"
            shift 2
            ;;
        -d|--dir)
            CONTRACTS_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check required parameters
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo -e "${RED}Error: Deployer private key is required${NC}"
    usage
fi

echo -e "${BLUE}F1R3FLY Smart Contract Deployer${NC}"
echo "================================="
echo "Node: $F1R3FLY_NODE"
echo "Contracts Directory: $CONTRACTS_DIR"
echo ""

# Function to deploy a Rholang contract
deploy_contract() {
    local contract_file=$1
    local contract_name=$(basename "$contract_file" .rho)
    
    echo -e "${YELLOW}Deploying contract: $contract_name${NC}"
    
    # Read contract content
    if [ ! -f "$contract_file" ]; then
        echo -e "${RED}Contract file not found: $contract_file${NC}"
        return 1
    fi
    
    CONTRACT_TERM=$(cat "$contract_file")
    
    # Create deployment JSON
    DEPLOY_JSON=$(cat <<EOF
{
    "term": $(echo "$CONTRACT_TERM" | jq -Rs .),
    "phloPrice": 1,
    "phloLimit": 1000000,
    "deployer": "$DEPLOYER_ADDRESS",
    "privateKey": "$DEPLOYER_PRIVATE_KEY"
}
EOF
    )
    
    # Send deployment request
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$DEPLOY_JSON" \
        "$F1R3FLY_NODE/api/deploy")
    
    # Check response
    deploy_id=$(echo "$response" | jq -r '.deployId // .deploy_id // empty')
    
    if [ -z "$deploy_id" ]; then
        echo -e "${RED}Failed to deploy contract${NC}"
        echo "Response: $response"
        return 1
    fi
    
    echo "  Deploy ID: $deploy_id"
    
    # Wait for confirmation
    echo -n "  Waiting for confirmation..."
    
    for i in {1..30}; do
        sleep 2
        
        status_response=$(curl -s "$F1R3FLY_NODE/api/deploy/$deploy_id")
        block_hash=$(echo "$status_response" | jq -r '.blockHash // .block_hash // empty')
        
        if [ ! -z "$block_hash" ]; then
            echo -e " ${GREEN}✓${NC}"
            echo "  Block Hash: $block_hash"
            echo ""
            return 0
        fi
        
        echo -n "."
    done
    
    echo -e " ${YELLOW}timeout${NC}"
    echo "  Deploy submitted but not confirmed within 60 seconds"
    echo ""
    return 2
}

# Function to deploy system contracts
deploy_system_contracts() {
    echo -e "${GREEN}Deploying System Contracts${NC}"
    echo "--------------------------"
    echo ""
    
    # Create sample Rholang contracts if they don't exist
    mkdir -p "$CONTRACTS_DIR"
    
    # Sample Token Contract
    if [ ! -f "$CONTRACTS_DIR/token.rho" ]; then
        cat > "$CONTRACTS_DIR/token.rho" <<'EOF'
new token, rl(`rho:registry:lookup`), stdout(`rho:io:stdout`) in {
  contract token(@"init", @name, @symbol, @totalSupply, return) = {
    new balances, allowances in {
      balances!({"deployer": totalSupply}) |
      allowances!(Map()) |
      return!({"name": name, "symbol": symbol, "totalSupply": totalSupply})
    }
  } |
  
  contract token(@"transfer", @from, @to, @amount, return) = {
    for (@balanceMap <- balances) {
      match balanceMap.get(from) {
        Nil => {
          balances!(balanceMap) |
          return!({"success": false, "error": "Insufficient balance"})
        }
        balance => {
          if (balance >= amount) {
            balances!(
              balanceMap
                .set(from, balance - amount)
                .set(to, balanceMap.getOrElse(to, 0) + amount)
            ) |
            return!({"success": true})
          } else {
            balances!(balanceMap) |
            return!({"success": false, "error": "Insufficient balance"})
          }
        }
      }
    }
  } |
  
  contract token(@"balanceOf", @address, return) = {
    for (@balanceMap <- balances) {
      balances!(balanceMap) |
      return!(balanceMap.getOrElse(address, 0))
    }
  }
}
EOF
        echo "Created sample token.rho contract"
    fi
    
    # Sample MultiSig Contract
    if [ ! -f "$CONTRACTS_DIR/multisig.rho" ]; then
        cat > "$CONTRACTS_DIR/multisig.rho" <<'EOF'
new multisig, stdout(`rho:io:stdout`) in {
  contract multisig(@"init", @owners, @required, return) = {
    new transactions, confirmations in {
      transactions!(Map()) |
      confirmations!(Map()) |
      return!({
        "owners": owners,
        "required": required,
        "address": *multisig
      })
    }
  } |
  
  contract multisig(@"submit", @destination, @value, @data, @owner, return) = {
    for (@txMap <- transactions; @confMap <- confirmations) {
      new txId in {
        txId!(txMap.size()) |
        for (@id <- txId) {
          transactions!(txMap.set(id, {
            "destination": destination,
            "value": value,
            "data": data,
            "executed": false
          })) |
          confirmations!(confMap.set(id, Set(owner))) |
          return!({"txId": id})
        }
      }
    }
  }
}
EOF
        echo "Created sample multisig.rho contract"
    fi
    
    # Sample Registry Contract
    if [ ! -f "$CONTRACTS_DIR/registry.rho" ]; then
        cat > "$CONTRACTS_DIR/registry.rho" <<'EOF'
new registry, insertArbitrary(`rho:registry:insertArbitrary`) in {
  contract registry(@"register", @name, @value, return) = {
    new uriCh in {
      insertArbitrary!(value, *uriCh) |
      for (@uri <- uriCh) {
        return!({"name": name, "uri": uri})
      }
    }
  }
}
EOF
        echo "Created sample registry.rho contract"
    fi
    
    echo ""
}

# Function to check node connectivity
check_node() {
    echo -e "${BLUE}Checking F1R3FLY node connectivity...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" "$F1R3FLY_NODE/api/status" | tail -n 1)
    
    if [ "$response" != "200" ]; then
        echo -e "${RED}Cannot connect to F1R3FLY node at $F1R3FLY_NODE${NC}"
        echo "Please ensure the node is running and accessible"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node is accessible${NC}"
    echo ""
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting F1R3FLY contract deployment...${NC}"
    echo ""
    
    # Check node connectivity
    check_node
    
    # Create system contracts if needed
    if [ ! -d "$CONTRACTS_DIR" ] || [ -z "$(ls -A $CONTRACTS_DIR 2>/dev/null)" ]; then
        echo "Contracts directory is empty, creating sample contracts..."
        deploy_system_contracts
    fi
    
    # Deploy all contracts in directory
    echo -e "${GREEN}Deploying contracts from $CONTRACTS_DIR${NC}"
    echo "----------------------------------------"
    echo ""
    
    success_count=0
    fail_count=0
    
    for contract_file in "$CONTRACTS_DIR"/*.rho; do
        if [ -f "$contract_file" ]; then
            if deploy_contract "$contract_file"; then
                ((success_count++))
            else
                ((fail_count++))
            fi
        fi
    done
    
    # Summary
    echo "========================================="
    echo -e "${GREEN}Deployment Summary${NC}"
    echo "========================================="
    echo "Successfully deployed: $success_count contracts"
    if [ $fail_count -gt 0 ]; then
        echo -e "${RED}Failed: $fail_count contracts${NC}"
    fi
    echo ""
    
    # Create deployment record
    DEPLOYMENT_RECORD="$CONTRACTS_DIR/deployment-$(date +%Y%m%d-%H%M%S).json"
    cat > "$DEPLOYMENT_RECORD" <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "node": "$F1R3FLY_NODE",
    "deployer": "$DEPLOYER_ADDRESS",
    "contracts_deployed": $success_count,
    "contracts_failed": $fail_count,
    "contracts_dir": "$CONTRACTS_DIR"
}
EOF
    
    echo "Deployment record saved to: $DEPLOYMENT_RECORD"
    
    if [ $fail_count -gt 0 ]; then
        exit 1
    fi
}

# Run main function
main
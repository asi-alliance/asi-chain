#!/bin/bash

# =================================================================
# F1R3FLY Complete Network Deployment Script
# =================================================================
# Deploys complete F1R3FLY network infrastructure:
# - Bootstrap node + 3 validators with autopropose
# - Observer node for read-only access
# - Validator4 with funding and bonding
# =================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
F1R3FLY_DIR="$ROOT_DIR/f1r3fly/docker"
RUST_CLIENT_DIR="$ROOT_DIR/rust-client"

# Default values
CLEANUP=false
RESET_DATA=false
SKIP_PATCHES=false
SKIP_BUILD=false
VERBOSE=false
DRY_RUN=false

# Timing configuration
NETWORK_INIT_WAIT=60
AUTOPROPOSE_WAIT=120
SYNC_WAIT=30
BOND_WAIT=60

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

print_step() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Complete F1R3FLY network deployment with all components

OPTIONS:
    -h, --help              Show this help message
    -c, --cleanup           Stop and remove all containers before starting
    -r, --reset             Reset all node data (fresh genesis)
    -s, --skip-patches      Skip applying F1R3FLY patches
    -b, --skip-build        Skip building rust client
    -v, --verbose           Show detailed output
    -d, --dry-run           Show what would be done without executing
    --stop                  Stop all containers and exit
    --status                Check complete network status

COMPONENTS DEPLOYED:
    1. Bootstrap node (ceremony master)
    2. Validator1, Validator2, Validator3 (genesis validators)
    3. Autopropose service (automated block production)
    4. Observer node (read-only access)
    5. Validator4 (bonded after genesis)

EXAMPLES:
    # Full deployment from scratch
    $0 --cleanup --reset

    # Quick deployment (keeping existing data)
    $0

    # Check network status
    $0 --status

    # Stop everything
    $0 --stop

EOF
    exit 0
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"
    
    local missing=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("Docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing+=("Docker Compose")
    fi
    
    # Check Rust/Cargo
    if ! command -v cargo &> /dev/null; then
        missing+=("Rust/Cargo")
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if F1R3FLY directory exists
    if [ ! -d "$F1R3FLY_DIR" ]; then
        print_error "F1R3FLY directory not found at $F1R3FLY_DIR"
        print_info "Please ensure the f1r3fly submodule is initialized:"
        echo "  git submodule init && git submodule update --recursive"
        exit 1
    fi
    
    # Check if rust-client exists
    if [ ! -d "$RUST_CLIENT_DIR" ]; then
        print_error "Rust client directory not found at $RUST_CLIENT_DIR"
        print_info "Please ensure the rust-client submodule is initialized"
        exit 1
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing[*]}"
        print_info "Please install missing dependencies and try again"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Function to apply patches
apply_patches() {
    if [ "$SKIP_PATCHES" = false ]; then
        print_step "Applying F1R3FLY Patches"
        
        # Check if .env file already exists with required environment variables
        # If it does, patches are likely already applied
        if [ -f "$F1R3FLY_DIR/.env" ] && grep -q "BOOTSTRAP_NODE_ID" "$F1R3FLY_DIR/.env"; then
            print_info "F1R3FLY patches appear to be already applied (found .env file)"
            print_success "Skipping patch application"
        elif [ -f "$SCRIPT_DIR/apply-f1r3fly-patches.sh" ]; then
            "$SCRIPT_DIR/apply-f1r3fly-patches.sh" || print_warning "Some patches may have already been applied"
        else
            print_warning "Patch script not found, skipping patches"
        fi
    fi
}

# Function to build rust client
build_rust_client() {
    if [ "$SKIP_BUILD" = false ]; then
        print_step "Building Rust Client"
        cd "$RUST_CLIENT_DIR"
        
        if [ "$VERBOSE" = true ]; then
            cargo build --release
        else
            print_info "Building rust client (this may take a few minutes)..."
            cargo build --release 2>&1 | tail -5
        fi
        
        if [ -f "$RUST_CLIENT_DIR/target/release/node_cli" ]; then
            print_success "Rust client built successfully"
        else
            print_error "Failed to build rust client"
            exit 1
        fi
    fi
}

# Function to cleanup
cleanup() {
    print_step "Cleaning Up Previous Deployment"
    
    cd "$F1R3FLY_DIR"
    
    print_info "Stopping all containers..."
    docker-compose -f shard-with-autopropose.yml down 2>/dev/null || true
    docker-compose -f observer.yml down 2>/dev/null || true
    docker-compose -f validator4.yml down 2>/dev/null || true
    
    if [ "$RESET_DATA" = true ]; then
        print_info "Resetting node data..."
        rm -rf data/* 2>/dev/null || true
        print_success "Node data reset"
    fi
    
    # Prune Docker system
    print_info "Pruning Docker system..."
    docker system prune -f &>/dev/null
    print_success "Cleanup complete"
}

# Function to deploy shard with autopropose
deploy_shard() {
    print_step "Deploying F1R3FLY Shard with Autopropose"
    
    cd "$F1R3FLY_DIR"
    
    print_info "Starting bootstrap node and validators..."
    docker-compose -f shard-with-autopropose.yml up -d
    
    print_info "Waiting for network initialization ($NETWORK_INIT_WAIT seconds)..."
    sleep $NETWORK_INIT_WAIT
    
    # Check health of all validators
    local all_healthy=true
    for node in bootstrap validator1 validator2 validator3; do
        if docker inspect rnode.$node --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
            print_success "$node is healthy"
        else
            print_warning "$node is not healthy yet"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        print_success "All validators are healthy"
    else
        print_warning "Some validators are still initializing"
    fi
    
    # Check autopropose
    if docker ps | grep -q autopropose; then
        print_success "Autopropose service is running"
        print_info "Waiting for autopropose to start proposing blocks ($AUTOPROPOSE_WAIT seconds)..."
        sleep $AUTOPROPOSE_WAIT
        
        # Verify block production
        local blocks=$(curl -s http://localhost:40403/api/blocks/10 2>/dev/null | grep -c "blockHash" || echo "0")
        print_success "Network has produced $blocks blocks"
    else
        print_error "Autopropose service failed to start"
        exit 1
    fi
    
    # Additional wait before observer deployment
    print_info "Waiting 240 seconds for network to stabilize before deploying observer..."
    sleep 240
}

# Function to deploy observer
deploy_observer() {
    print_step "Deploying Observer Node"
    
    cd "$F1R3FLY_DIR"
    
    print_info "Starting observer node..."
    docker-compose -f observer.yml up -d
    
    print_info "Waiting for observer to sync ($SYNC_WAIT seconds)..."
    sleep $SYNC_WAIT
    
    # Check observer health
    if docker ps | grep -q readonly; then
        local peers=$(curl -s http://localhost:40453/api/status 2>/dev/null | jq -r '.peers' || echo "0")
        if [ "$peers" -gt 0 ]; then
            print_success "Observer connected with $peers peers"
        else
            print_warning "Observer started but has no peers yet"
        fi
    else
        print_error "Observer failed to start"
        exit 1
    fi
}

# Function to deploy and bond validator4
deploy_validator4() {
    print_step "Deploying and Bonding Validator4"
    
    cd "$F1R3FLY_DIR"
    
    # Start validator4
    print_info "Starting validator4 node..."
    docker-compose -f validator4.yml up -d
    
    print_info "Waiting for validator4 to sync ($SYNC_WAIT seconds)..."
    sleep $SYNC_WAIT
    
    # Check validator4 connectivity
    local peers=$(curl -s http://localhost:40443/api/status 2>/dev/null | jq -r '.peers' || echo "0")
    if [ "$peers" -gt 0 ]; then
        print_success "Validator4 connected with $peers peers"
    else
        print_error "Validator4 failed to connect to network"
        exit 1
    fi
    
    # Use rust client for operations
    cd "$RUST_CLIENT_DIR"
    local CLI="./target/release/node_cli"
    
    # Check validator4 balance
    print_info "Checking validator4 balance..."
    # Extract balance - it comes after the colon, format: "Balance for ADDRESS: NUMBER REV"
    local balance=$($CLI wallet-balance --address 1111La6tHaCtGjRiv4wkffbTAAjGyMsVhzSUNzQxH1jjZH9jtEi3M 2>/dev/null | grep "Balance for" | sed 's/.*: \([0-9]*\) REV.*/\1/' || echo "0")
    # Ensure balance is a valid number
    balance=${balance:-0}
    
    if [ -z "$balance" ] || [ "$balance" = "0" ] || [ "$balance" -eq 0 ] 2>/dev/null; then
        print_info "Validator4 has no funds, transferring 2000 REV..."
        
        # Transfer funds from bootstrap
        $CLI transfer \
            --to-address 1111La6tHaCtGjRiv4wkffbTAAjGyMsVhzSUNzQxH1jjZH9jtEi3M \
            --amount 2000 \
            --private-key 5f668a7ee96d944a4494cc947e4005e172d7ab3461ee5538f1f2a45a835e9657 \
            --port 40402 \
            --propose true || {
                print_error "Transfer failed"
                exit 1
            }
        
        print_info "Waiting for transfer to complete..."
        sleep 60
        
        # Verify transfer
        balance=$($CLI wallet-balance --address 1111La6tHaCtGjRiv4wkffbTAAjGyMsVhzSUNzQxH1jjZH9jtEi3M 2>/dev/null | grep "Balance for" | grep -oE "[0-9]+" | head -1 || echo "0")
        if [ "$balance" -gt 0 ]; then
            print_success "Transfer successful, validator4 now has $balance REV"
        else
            print_error "Transfer verification failed"
            exit 1
        fi
    else
        print_success "Validator4 already has $balance REV"
    fi
    
    # Check if already bonded
    print_info "Checking validator4 bond status..."
    # Force a value even if command fails completely
    local is_bonded="0"
    is_bonded=$($CLI bonds 2>/dev/null | grep -c "04d26c61" || true)
    # Ensure is_bonded is a single integer value, default to 0 if empty
    is_bonded=$(echo "${is_bonded:-0}" | tr -d '[:space:]' | head -n1)
    is_bonded="${is_bonded:-0}"
    
    # Debug output
    if [ "$VERBOSE" = true ]; then
        echo "DEBUG: is_bonded value = '$is_bonded'"
    fi
    
    if [ -z "$is_bonded" ] || [ "$is_bonded" = "0" ]; then
        print_info "Bonding validator4 with 1000 REV stake..."
        
        $CLI bond-validator \
            --stake 1000 \
            --private-key 5ff3514bf79a7d18e8dd974c699678ba63b7762ce8d78c532346e52f0ad219cd \
            --propose true || {
                print_error "Bonding failed"
                exit 1
            }
        
        print_info "Waiting for bonding to complete ($BOND_WAIT seconds)..."
        sleep $BOND_WAIT
        
        # Verify bonding
        is_bonded=$($CLI bonds 2>/dev/null | grep -c "04d26c61" || echo "0")
        # Clean the value to ensure it's a single integer
        is_bonded=$(echo "${is_bonded:-0}" | tr -d '[:space:]' | head -n1)
        is_bonded="${is_bonded:-0}"
        
        if [ "$is_bonded" != "0" ] && [ "$is_bonded" -gt 0 ] 2>/dev/null; then
            print_success "Validator4 successfully bonded"
        else
            print_error "Bonding verification failed"
            exit 1
        fi
    else
        print_success "Validator4 is already bonded"
    fi
    
    # Check validator4 status
    print_info "Checking validator4 participation status..."
    $CLI validator-status -k 04d26c6103d7269773b943d7a9c456f9eb227e0d8b1fe30bccee4fca963f4446e3385d99f6386317f2c1ad36b9e6b0d5f97bb0a0041f05781c60a5ebca124a251d 2>/dev/null | grep -E "(BONDED|ACTIVE)" || true
}

# Function to configure autopropose for validator4
configure_autopropose_validator4() {
    print_step "Configuring Autopropose for Validator4"
    
    cd "$F1R3FLY_DIR"
    
    # Check if validator4 is already in config
    if grep -q "validator4" autopropose/config.yml; then
        print_success "Validator4 already configured in autopropose"
    else
        print_info "Adding validator4 to autopropose configuration..."
        
        # Backup original config
        cp autopropose/config.yml autopropose/config.yml.bak
        
        # Add validator4 to config (before bootstrap entry)
        sed -i.tmp '/- name: bootstrap/i\
  - name: validator4\
    host: rnode.validator4\
    grpc_port: 40402\
    enabled: true\
' autopropose/config.yml
        
        print_info "Restarting autopropose service..."
        docker-compose -f shard-with-autopropose.yml restart autopropose
        
        sleep 10
        print_success "Autopropose reconfigured with validator4"
    fi
}

# Function to check complete network status
check_network_status() {
    print_step "Network Status Report"
    
    cd "$RUST_CLIENT_DIR"
    local CLI="./target/release/node_cli"
    
    echo -e "\n${BLUE}=== Container Status ===${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(rnode|autopropose)" || echo "No F1R3FLY containers running"
    
    echo -e "\n${BLUE}=== Network Health ===${NC}"
    $CLI network-health 2>/dev/null || echo "Network health check failed"
    
    echo -e "\n${BLUE}=== Active Validators ===${NC}"
    $CLI active-validators 2>/dev/null || echo "Could not retrieve active validators"
    
    echo -e "\n${BLUE}=== Recent Blocks ===${NC}"
    curl -s http://localhost:40403/api/blocks/5 2>/dev/null | jq -r '.[] | "Block #\(.blockNumber) by \(.sender[0:8])..."' || echo "Could not retrieve blocks"
    
    echo -e "\n${BLUE}=== Autopropose Activity ===${NC}"
    docker logs autopropose --tail 5 2>/dev/null | grep -E "(Proposing|successful)" || echo "Autopropose not running"
}

# Function to stop all containers
stop_all() {
    print_step "Stopping All F1R3FLY Containers"
    
    cd "$F1R3FLY_DIR"
    
    docker-compose -f shard-with-autopropose.yml down
    docker-compose -f observer.yml down
    docker-compose -f validator4.yml down
    
    print_success "All containers stopped"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -c|--cleanup)
            CLEANUP=true
            shift
            ;;
        -r|--reset)
            RESET_DATA=true
            shift
            ;;
        -s|--skip-patches)
            SKIP_PATCHES=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --stop)
            check_prerequisites
            stop_all
            exit 0
            ;;
        --status)
            check_prerequisites
            check_network_status
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     F1R3FLY Complete Network Deployment                     ║${NC}"
    echo -e "${BLUE}║     Bootstrap + 3 Validators + Autopropose                  ║${NC}"
    echo -e "${BLUE}║     + Observer + Validator4 (Bonded)                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
        echo ""
    fi
    
    # Run deployment steps
    check_prerequisites
    
    if [ "$DRY_RUN" = false ]; then
        build_rust_client
        apply_patches
        
        if [ "$CLEANUP" = true ]; then
            cleanup
        fi
        
        deploy_shard
        deploy_observer
        deploy_validator4
        configure_autopropose_validator4
        
        echo ""
        print_success "🎉 Complete F1R3FLY network deployed successfully!"
        echo ""
        
        check_network_status
        
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}Network is ready for use!${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Access points:"
        echo "  Bootstrap API:  http://localhost:40403"
        echo "  Validator1 API: http://localhost:40413"
        echo "  Validator2 API: http://localhost:40423"
        echo "  Validator3 API: http://localhost:40433"
        echo "  Validator4 API: http://localhost:40443"
        echo "  Observer API:   http://localhost:40453"
        echo ""
        echo "Useful commands:"
        echo "  Check status:  $0 --status"
        echo "  Stop all:      $0 --stop"
        echo "  Monitor logs:  docker logs -f autopropose"
    else
        echo ""
        print_info "Dry run complete. Run without -d flag to execute."
    fi
}

# Run main function
main
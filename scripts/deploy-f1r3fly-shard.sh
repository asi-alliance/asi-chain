#!/bin/bash

# =================================================================
# F1R3FLY Shard Deployment Script with Autopropose
# =================================================================
# Deploys a F1R3FLY blockchain shard with automated block proposing
# Includes bootstrap node, 3 validators, and autopropose service
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

# Default values
CLEANUP=false
MONITORING=false
RESET_DATA=false
DETACHED=true
WAIT_TIME=240
SKIP_PATCHES=false

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

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy F1R3FLY blockchain shard with autopropose service

OPTIONS:
    -h, --help              Show this help message
    -c, --cleanup           Stop and remove all containers before starting
    -r, --reset             Reset all node data (fresh genesis)
    -m, --monitoring        Enable monitoring output after deployment
    -f, --foreground        Run in foreground (not detached)
    -w, --wait TIME         Wait time for initialization (default: 240s)
    -s, --skip-patches      Skip applying F1R3FLY patches
    --stop                  Stop all containers and exit
    --status                Check status of all nodes
    --logs NODE             Show logs for specific node (bootstrap|validator1|validator2|validator3|autopropose)
    --restart               Restart all containers

EXAMPLES:
    # Deploy with default settings
    $0

    # Clean deployment with fresh data
    $0 --cleanup --reset

    # Deploy with monitoring
    $0 --monitoring

    # Check status
    $0 --status

    # View logs
    $0 --logs validator3

EOF
    exit 0
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
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
    
    print_success "Prerequisites check passed"
}

# Function to apply patches
apply_patches() {
    if [ "$SKIP_PATCHES" = false ]; then
        print_info "Applying F1R3FLY patches..."
        if [ -f "$SCRIPT_DIR/apply-f1r3fly-patches.sh" ]; then
            "$SCRIPT_DIR/apply-f1r3fly-patches.sh" || print_warning "Some patches may have already been applied"
        else
            print_warning "Patch script not found, skipping patches"
        fi
    fi
}

# Function to stop containers
stop_containers() {
    print_info "Stopping F1R3FLY containers..."
    cd "$F1R3FLY_DIR"
    docker-compose -f shard-with-autopropose.yml down 2>/dev/null || true
    print_success "Containers stopped"
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up..."
    stop_containers
    
    if [ "$RESET_DATA" = true ]; then
        print_info "Resetting node data..."
        cd "$F1R3FLY_DIR"
        rm -rf data/* 2>/dev/null || true
        print_success "Node data reset"
    fi
    
    # Prune Docker system
    print_info "Pruning Docker system..."
    docker system prune -f &>/dev/null
    print_success "Docker system pruned"
}

# Function to deploy
deploy() {
    print_info "Deploying F1R3FLY shard with autopropose..."
    
    cd "$F1R3FLY_DIR"
    
    # Check configuration
    if [ -f "conf/bootstrap-ceremony.conf" ]; then
        REQUIRED_SIGS=$(grep "required-signatures" conf/bootstrap-ceremony.conf | grep -oE '[0-9]+' | head -1)
        print_info "Genesis ceremony requires $REQUIRED_SIGS validator signatures"
    fi
    
    # Deploy based on detached mode
    if [ "$DETACHED" = true ]; then
        docker-compose -f shard-with-autopropose.yml up -d
        print_success "F1R3FLY shard deployed in background"
    else
        print_info "Starting in foreground mode (Ctrl+C to stop)..."
        docker-compose -f shard-with-autopropose.yml up
    fi
}

# Function to wait for initialization
wait_for_init() {
    if [ "$DETACHED" = true ]; then
        print_info "Waiting for network initialization..."
        
        # Wait for containers to be healthy
        local count=0
        local max_attempts=30
        
        while [ $count -lt $max_attempts ]; do
            if docker ps --format "{{.Names}}" | grep -q "rnode.bootstrap"; then
                if docker inspect rnode.bootstrap --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
                    print_success "Bootstrap node is healthy"
                    break
                fi
            fi
            sleep 10
            count=$((count + 1))
            echo -n "."
        done
        echo ""
        
        # Check all validators
        for validator in validator1 validator2 validator3; do
            if docker inspect rnode.$validator --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
                print_success "$validator is healthy"
            else
                print_warning "$validator is not healthy yet"
            fi
        done
        
        print_info "Autopropose service will start proposing blocks in ~4 minutes"
    fi
}

# Function to check status
check_status() {
    print_info "Checking F1R3FLY network status..."
    
    echo -e "\n${BLUE}=== Container Status ===${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(validator|bootstrap|autopropose)" || echo "No F1R3FLY containers running"
    
    echo -e "\n${BLUE}=== Network Connectivity ===${NC}"
    for port in 40403 40413 40423 40433; do
        case $port in
            40403) node="Bootstrap" ;;
            40413) node="Validator1" ;;
            40423) node="Validator2" ;;
            40433) node="Validator3" ;;
        esac
        
        if curl -s http://localhost:$port/api/status &>/dev/null; then
            peers=$(curl -s http://localhost:$port/api/status | grep -oE '"peers":[0-9]+' | cut -d: -f2)
            echo "$node (port $port): ✅ Online, $peers peers"
        else
            echo "$node (port $port): ❌ Offline or initializing"
        fi
    done
    
    echo -e "\n${BLUE}=== Block Production ===${NC}"
    blocks=$(curl -s http://localhost:40403/api/blocks/10 2>/dev/null | grep -c "blockHash" || echo "0")
    echo "Total blocks: $blocks"
    
    echo -e "\n${BLUE}=== Autopropose Status ===${NC}"
    if docker ps | grep -q autopropose; then
        docker logs autopropose --tail 5 2>/dev/null | grep -E "(Proposing|successful|ERROR|WARNING)" || echo "Autopropose initializing..."
    else
        echo "Autopropose not running"
    fi
}

# Function to show logs
show_logs() {
    local node=$1
    
    case $node in
        bootstrap|validator1|validator2|validator3)
            docker logs rnode.$node --tail 50
            ;;
        autopropose)
            docker logs autopropose --tail 50
            ;;
        *)
            print_error "Unknown node: $node"
            echo "Valid options: bootstrap, validator1, validator2, validator3, autopropose"
            exit 1
            ;;
    esac
}

# Function to monitor
monitor() {
    print_info "Monitoring F1R3FLY network (Ctrl+C to stop)..."
    
    while true; do
        clear
        echo -e "${BLUE}=== F1R3FLY Network Monitor ===${NC}"
        echo "Time: $(date)"
        echo ""
        
        # Container status
        echo "Container Health:"
        for node in bootstrap validator1 validator2 validator3; do
            health=$(docker inspect rnode.$node --format='{{.State.Health.Status}}' 2>/dev/null || echo "not found")
            printf "  %-12s: %s\n" "$node" "$health"
        done
        
        # Block count
        blocks=$(curl -s http://localhost:40403/api/blocks/10 2>/dev/null | grep -c "blockHash" || echo "0")
        echo -e "\nBlocks: $blocks"
        
        # Latest autopropose activity
        echo -e "\nLatest Activity:"
        docker logs autopropose --tail 3 2>/dev/null | grep -E "(Proposing|successful)" || echo "  Waiting for autopropose..."
        
        sleep 10
    done
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
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        -f|--foreground)
            DETACHED=false
            shift
            ;;
        -w|--wait)
            WAIT_TIME="$2"
            shift 2
            ;;
        -s|--skip-patches)
            SKIP_PATCHES=true
            shift
            ;;
        --stop)
            check_prerequisites
            stop_containers
            exit 0
            ;;
        --status)
            check_prerequisites
            check_status
            exit 0
            ;;
        --logs)
            check_prerequisites
            show_logs "$2"
            exit 0
            ;;
        --restart)
            check_prerequisites
            stop_containers
            deploy
            wait_for_init
            check_status
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
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     F1R3FLY Shard Deployment with Autopropose       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_prerequisites
    apply_patches
    
    if [ "$CLEANUP" = true ]; then
        cleanup
    fi
    
    deploy
    wait_for_init
    check_status
    
    if [ "$MONITORING" = true ] && [ "$DETACHED" = true ]; then
        echo ""
        print_info "Starting monitoring mode..."
        sleep 3
        monitor
    fi
    
    echo ""
    print_success "Deployment complete!"
    
    if [ "$DETACHED" = true ]; then
        echo ""
        echo "Useful commands:"
        echo "  Check status:  $0 --status"
        echo "  View logs:     $0 --logs validator1"
        echo "  Monitor:       $0 --monitoring"
        echo "  Stop:          $0 --stop"
    fi
}

# Run main function
main
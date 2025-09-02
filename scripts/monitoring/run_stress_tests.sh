#!/bin/bash

# F1R3FLY Network Stress Test Runner
# Provides different stress test configurations and usage instructions

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
STRESS_TEST_SCRIPT="$SCRIPT_DIR/network_stress_test.sh"

show_usage() {
    echo -e "${BLUE}F1R3FLY Network Stress Test Runner${NC}"
    echo ""
    echo "USAGE:"
    echo "  $0 [test_type]"
    echo ""
    echo "TEST TYPES:"
    echo -e "  ${GREEN}quick${NC}     - Quick stress test (2 minutes, 5 parallel ops)"
    echo -e "  ${YELLOW}standard${NC}  - Standard stress test (5 minutes, 10 parallel ops) [DEFAULT]"
    echo -e "  ${RED}intensive${NC} - Intensive stress test (10 minutes, 20 parallel ops)"
    echo -e "  ${CYAN}endurance${NC} - Endurance test (30 minutes, 15 parallel ops)"
    echo -e "  ${PURPLE}custom${NC}    - Custom configuration (interactive)"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                    # Run standard stress test"
    echo "  $0 quick             # Run quick test"
    echo "  $0 intensive         # Run intensive test"
    echo ""
    echo "NETWORK INFORMATION:"
    echo "  Target: 54.254.197.253"
    echo "  Endpoints: Bootstrap, Validator1-4, Observer"
    echo "  Uses private keys from docker/config for authentic testing"
    echo ""
    echo "OUTPUT:"
    echo "  - Real-time progress with colored output"
    echo "  - Detailed logs in /tmp/stress_test_*.log"
    echo "  - Comprehensive final report"
    echo ""
}

run_quick_test() {
    echo -e "${GREEN}🚀 Running QUICK Stress Test${NC}"
    echo -e "${GREEN}Duration: 2 minutes | Parallel Ops: 5${NC}"
    echo ""
    
    # Modify the stress test script for quick test
    sed -i 's/DURATION_SECONDS=300/DURATION_SECONDS=120/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=10/PARALLEL_OPERATIONS=5/' "$STRESS_TEST_SCRIPT"
    
    "$STRESS_TEST_SCRIPT"
    
    # Restore defaults
    sed -i 's/DURATION_SECONDS=120/DURATION_SECONDS=300/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=5/PARALLEL_OPERATIONS=10/' "$STRESS_TEST_SCRIPT"
}

run_standard_test() {
    echo -e "${YELLOW}🚀 Running STANDARD Stress Test${NC}"
    echo -e "${YELLOW}Duration: 5 minutes | Parallel Ops: 10${NC}"
    echo ""
    
    "$STRESS_TEST_SCRIPT"
}

run_intensive_test() {
    echo -e "${RED}🚀 Running INTENSIVE Stress Test${NC}"
    echo -e "${RED}Duration: 10 minutes | Parallel Ops: 20${NC}"
    echo -e "${YELLOW}⚠️  This test may put significant load on the network${NC}"
    echo ""
    
    read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Test cancelled."
        exit 0
    fi
    
    # Modify the stress test script for intensive test
    sed -i 's/DURATION_SECONDS=300/DURATION_SECONDS=600/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=10/PARALLEL_OPERATIONS=20/' "$STRESS_TEST_SCRIPT"
    
    "$STRESS_TEST_SCRIPT"
    
    # Restore defaults
    sed -i 's/DURATION_SECONDS=600/DURATION_SECONDS=300/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=20/PARALLEL_OPERATIONS=10/' "$STRESS_TEST_SCRIPT"
}

run_endurance_test() {
    echo -e "${CYAN}🚀 Running ENDURANCE Test${NC}"
    echo -e "${CYAN}Duration: 30 minutes | Parallel Ops: 15${NC}"
    echo -e "${YELLOW}⚠️  This is a long-running test for network stability assessment${NC}"
    echo ""
    
    read -p "Are you sure you want to run a 30-minute test? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Test cancelled."
        exit 0
    fi
    
    # Modify the stress test script for endurance test
    sed -i 's/DURATION_SECONDS=300/DURATION_SECONDS=1800/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=10/PARALLEL_OPERATIONS=15/' "$STRESS_TEST_SCRIPT"
    
    "$STRESS_TEST_SCRIPT"
    
    # Restore defaults
    sed -i 's/DURATION_SECONDS=1800/DURATION_SECONDS=300/' "$STRESS_TEST_SCRIPT"
    sed -i 's/PARALLEL_OPERATIONS=15/PARALLEL_OPERATIONS=10/' "$STRESS_TEST_SCRIPT"
}

run_custom_test() {
    echo -e "${PURPLE}🚀 Custom Stress Test Configuration${NC}"
    echo ""
    
    # Get custom duration
    read -p "Enter test duration in minutes (default 5): " duration_minutes
    duration_minutes=${duration_minutes:-5}
    duration_seconds=$((duration_minutes * 60))
    
    # Get custom parallel operations
    read -p "Enter number of parallel operations (default 10): " parallel_ops
    parallel_ops=${parallel_ops:-10}
    
    echo ""
    echo -e "${PURPLE}Configuration:${NC}"
    echo -e "  Duration: ${duration_minutes} minutes"
    echo -e "  Parallel Operations: ${parallel_ops}"
    echo ""
    
    read -p "Proceed with this configuration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Test cancelled."
        exit 0
    fi
    
    # Modify the stress test script for custom test
    sed -i "s/DURATION_SECONDS=300/DURATION_SECONDS=$duration_seconds/" "$STRESS_TEST_SCRIPT"
    sed -i "s/PARALLEL_OPERATIONS=10/PARALLEL_OPERATIONS=$parallel_ops/" "$STRESS_TEST_SCRIPT"
    
    "$STRESS_TEST_SCRIPT"
    
    # Restore defaults
    sed -i "s/DURATION_SECONDS=$duration_seconds/DURATION_SECONDS=300/" "$STRESS_TEST_SCRIPT"
    sed -i "s/PARALLEL_OPERATIONS=$parallel_ops/PARALLEL_OPERATIONS=10/" "$STRESS_TEST_SCRIPT"
}

check_prerequisites() {
    if [[ ! -f "$STRESS_TEST_SCRIPT" ]]; then
        echo -e "${RED}Error: Stress test script not found at $STRESS_TEST_SCRIPT${NC}"
        exit 1
    fi
    
    if [[ ! -x "$STRESS_TEST_SCRIPT" ]]; then
        chmod +x "$STRESS_TEST_SCRIPT"
    fi
    
    # Check if rust client exists
    if [[ ! -f "$(dirname "$0")/../../rust-client/target/release/node_cli" ]]; then
        echo -e "${RED}Error: Rust client not found. Please build it first:${NC}"
        echo "  cd rust-client && cargo build --release"
        exit 1
    fi
    
    # Check network connectivity
    if ! curl -s --connect-timeout 5 http://54.254.197.253:40403/status > /dev/null; then
        echo -e "${RED}Error: Cannot reach F1R3FLY network at 54.254.197.253${NC}"
        echo "  Please check network connectivity and ensure the network is running"
        exit 1
    fi
}

show_network_status() {
    echo -e "${BLUE}Current Network Status:${NC}"
    echo -n "  Bootstrap: "
    if curl -s --connect-timeout 3 http://54.254.197.253:40403/status | jq -r '.peers' 2>/dev/null; then
        echo -e "${GREEN}Online${NC}"
    else
        echo -e "${RED}Offline${NC}"
    fi
    
    echo -n "  Metrics: "
    if curl -s --connect-timeout 3 http://54.254.197.253:9091/metrics | grep -q f1r3fly 2>/dev/null; then
        echo -e "${GREEN}Available${NC}"
    else
        echo -e "${RED}Unavailable${NC}"
    fi
    echo ""
}

main() {
    local test_type="${1:-standard}"
    
    case "$test_type" in
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        "quick")
            check_prerequisites
            show_network_status
            run_quick_test
            ;;
        "standard"|"")
            check_prerequisites
            show_network_status
            run_standard_test
            ;;
        "intensive")
            check_prerequisites
            show_network_status
            run_intensive_test
            ;;
        "endurance")
            check_prerequisites
            show_network_status
            run_endurance_test
            ;;
        "custom")
            check_prerequisites
            show_network_status
            run_custom_test
            ;;
        *)
            echo -e "${RED}Error: Unknown test type '$test_type'${NC}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Stress test interrupted by user${NC}"; exit 130' INT

main "$@"
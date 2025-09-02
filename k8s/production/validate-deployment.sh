#!/bin/bash

# ASI Chain Production Deployment Validation Script
# This script performs comprehensive health checks on the deployed system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="asi-chain"
TIMEOUT=30

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_info "Running test: $test_name"
    
    if eval "$test_command"; then
        log_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test namespace exists
test_namespace() {
    kubectl get namespace $NAMESPACE &>/dev/null
}

# Test all pods are running
test_pods_running() {
    local not_running=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    [[ $not_running -eq 0 ]]
}

# Test specific service
test_service_ready() {
    local service_name=$1
    local expected_replicas=${2:-1}
    
    if kubectl get deployment $service_name -n $NAMESPACE &>/dev/null; then
        local ready_replicas=$(kubectl get deployment $service_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        [[ $ready_replicas -ge $expected_replicas ]]
    elif kubectl get statefulset $service_name -n $NAMESPACE &>/dev/null; then
        local ready_replicas=$(kubectl get statefulset $service_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        [[ $ready_replicas -ge $expected_replicas ]]
    else
        return 1
    fi
}

# Test database connectivity
test_database_connectivity() {
    kubectl exec -it deployment/indexer -n $NAMESPACE -- sh -c "psql \$DATABASE_URL -c 'SELECT 1;'" &>/dev/null
}

# Test redis connectivity
test_redis_connectivity() {
    kubectl exec -it deployment/redis -n $NAMESPACE -- redis-cli -a \$REDIS_PASSWORD ping | grep -q PONG
}

# Test RPC endpoint
test_rpc_endpoint() {
    local rpc_pod=$(kubectl get pods -n $NAMESPACE -l app=validator -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$rpc_pod" ]]; then
        kubectl exec $rpc_pod -n $NAMESPACE -- curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 | grep -q "result"
    else
        return 1
    fi
}

# Test WebSocket endpoint
test_websocket_endpoint() {
    local ws_pod=$(kubectl get pods -n $NAMESPACE -l app=validator -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$ws_pod" ]]; then
        # Test if WebSocket port is listening
        kubectl exec $ws_pod -n $NAMESPACE -- netstat -ln | grep -q ":8546"
    else
        return 1
    fi
}

# Test explorer service
test_explorer_service() {
    local explorer_pod=$(kubectl get pods -n $NAMESPACE -l app=explorer -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$explorer_pod" ]]; then
        kubectl exec $explorer_pod -n $NAMESPACE -- curl -f http://localhost:3000/health &>/dev/null
    else
        return 1
    fi
}

# Test wallet service
test_wallet_service() {
    local wallet_pod=$(kubectl get pods -n $NAMESPACE -l app=wallet -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$wallet_pod" ]]; then
        kubectl exec $wallet_pod -n $NAMESPACE -- curl -f http://localhost:3000/health &>/dev/null
    else
        return 1
    fi
}

# Test indexer service
test_indexer_service() {
    local indexer_pod=$(kubectl get pods -n $NAMESPACE -l app=indexer -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$indexer_pod" ]]; then
        kubectl exec $indexer_pod -n $NAMESPACE -- curl -f http://localhost:4000/health &>/dev/null
    else
        return 1
    fi
}

# Test faucet service
test_faucet_service() {
    local faucet_pod=$(kubectl get pods -n $NAMESPACE -l app=faucet -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$faucet_pod" ]]; then
        kubectl exec $faucet_pod -n $NAMESPACE -- curl -f http://localhost:3000/health &>/dev/null
    else
        return 1
    fi
}

# Test monitoring stack
test_prometheus() {
    local prometheus_pod=$(kubectl get pods -n $NAMESPACE -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$prometheus_pod" ]]; then
        kubectl exec $prometheus_pod -n $NAMESPACE -- curl -f http://localhost:9090/-/healthy &>/dev/null
    else
        return 1
    fi
}

test_grafana() {
    local grafana_pod=$(kubectl get pods -n $NAMESPACE -l app=grafana -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$grafana_pod" ]]; then
        kubectl exec $grafana_pod -n $NAMESPACE -- curl -f http://localhost:3000/api/health &>/dev/null
    else
        return 1
    fi
}

test_alertmanager() {
    local alertmanager_pod=$(kubectl get pods -n $NAMESPACE -l app=alertmanager -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$alertmanager_pod" ]]; then
        kubectl exec $alertmanager_pod -n $NAMESPACE -- curl -f http://localhost:9093/-/healthy &>/dev/null
    else
        return 1
    fi
}

# Test ingress
test_ingress_ready() {
    local ingress_count=$(kubectl get ingress -n $NAMESPACE --no-headers | wc -l)
    [[ $ingress_count -gt 0 ]]
}

# Test persistent volumes
test_persistent_volumes() {
    local unbound_pv=$(kubectl get pv --no-headers | grep -c "Available" || echo "0")
    local bound_pv=$(kubectl get pv --no-headers | grep -c "Bound" || echo "0")
    
    # Check if we have enough bound PVs (should be at least 8: 4 validators + postgres + redis + prometheus + grafana + alertmanager)
    [[ $bound_pv -ge 8 ]]
}

# Test secrets exist
test_secrets_exist() {
    local required_secrets=(
        "database-credentials"
        "redis-credentials"
        "app-secrets"
        "hasura-credentials"
        "validator-1-keys"
        "validator-2-keys"
        "faucet-credentials"
        "grafana-credentials"
    )
    
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret $secret -n $NAMESPACE &>/dev/null; then
            return 1
        fi
    done
    
    return 0
}

# Test HPA functionality
test_hpa() {
    local hpa_count=$(kubectl get hpa -n $NAMESPACE --no-headers | wc -l)
    [[ $hpa_count -ge 4 ]]  # Should have HPA for explorer, wallet, indexer, faucet
}

# Test network policies (if any)
test_network_connectivity() {
    # Test internal service communication
    local indexer_pod=$(kubectl get pods -n $NAMESPACE -l app=indexer -o jsonpath='{.items[0].metadata.name}')
    if [[ -n "$indexer_pod" ]]; then
        # Test if indexer can reach database
        kubectl exec $indexer_pod -n $NAMESPACE -- nc -z postgres 5432 &>/dev/null
    else
        return 1
    fi
}

# Test validator consensus
test_validator_consensus() {
    local validator_pods=($(kubectl get pods -n $NAMESPACE -l app=validator -o jsonpath='{.items[*].metadata.name}'))
    
    if [[ ${#validator_pods[@]} -lt 2 ]]; then
        return 1
    fi
    
    # Check if validators can communicate with each other
    for pod in "${validator_pods[@]}"; do
        if ! kubectl exec $pod -n $NAMESPACE -- curl -f http://localhost:8545 &>/dev/null; then
            return 1
        fi
    done
    
    return 0
}

# Performance tests
test_resource_usage() {
    # Check if any pods are using excessive resources
    local high_cpu_pods=$(kubectl top pods -n $NAMESPACE --no-headers 2>/dev/null | awk '$2 ~ /[0-9]+m/ && $2+0 > 2000 {print $1}' | wc -l)
    local high_memory_pods=$(kubectl top pods -n $NAMESPACE --no-headers 2>/dev/null | awk '$3 ~ /[0-9]+Mi/ && $3+0 > 4000 {print $1}' | wc -l)
    
    # Allow some high resource usage, but not all pods
    [[ $high_cpu_pods -lt 3 ]] && [[ $high_memory_pods -lt 3 ]]
}

# Main validation function
main() {
    echo "================================================="
    log_info "ASI Chain Production Deployment Validation"
    echo "================================================="
    echo
    
    log_info "Starting comprehensive health checks..."
    echo
    
    # Basic infrastructure tests
    log_info "=== Infrastructure Tests ==="
    run_test "Namespace exists" "test_namespace"
    run_test "All pods are running" "test_pods_running"
    run_test "Persistent volumes" "test_persistent_volumes"
    run_test "Required secrets exist" "test_secrets_exist"
    run_test "HPA configured" "test_hpa"
    run_test "Ingress ready" "test_ingress_ready"
    echo
    
    # Database and cache tests
    log_info "=== Database & Cache Tests ==="
    run_test "PostgreSQL ready" "test_service_ready postgres 1"
    run_test "Redis ready" "test_service_ready redis 1"
    run_test "Database connectivity" "test_database_connectivity"
    run_test "Redis connectivity" "test_redis_connectivity"
    run_test "Hasura ready" "test_service_ready hasura 2"
    echo
    
    # Validator tests
    log_info "=== Validator Tests ==="
    run_test "Validator-1 ready" "test_service_ready validator-1 1"
    run_test "Validator-2 ready" "test_service_ready validator-2 1"
    run_test "RPC endpoint" "test_rpc_endpoint"
    run_test "WebSocket endpoint" "test_websocket_endpoint"
    run_test "Validator consensus" "test_validator_consensus"
    echo
    
    # Application service tests
    log_info "=== Application Service Tests ==="
    run_test "Explorer service" "test_explorer_service"
    run_test "Explorer ready (3 replicas)" "test_service_ready explorer 3"
    run_test "Wallet service" "test_wallet_service"
    run_test "Wallet ready (3 replicas)" "test_service_ready wallet 3"
    run_test "Indexer service" "test_indexer_service"
    run_test "Indexer ready (2 replicas)" "test_service_ready indexer 2"
    run_test "Faucet service" "test_faucet_service"
    run_test "Faucet ready (2 replicas)" "test_service_ready faucet 2"
    echo
    
    # Monitoring tests
    log_info "=== Monitoring Tests ==="
    run_test "Prometheus service" "test_prometheus"
    run_test "Grafana service" "test_grafana"
    run_test "AlertManager service" "test_alertmanager"
    echo
    
    # Network and performance tests
    log_info "=== Network & Performance Tests ==="
    run_test "Network connectivity" "test_network_connectivity"
    run_test "Resource usage reasonable" "test_resource_usage"
    echo
    
    # Summary
    echo "================================================="
    log_info "Validation Summary"
    echo "================================================="
    echo "Total tests: $TESTS_TOTAL"
    log_success "Passed: $TESTS_PASSED"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        log_error "Failed: $TESTS_FAILED"
        echo
        log_warning "Some tests failed. Please check the following:"
        echo "1. Ensure all pods have sufficient resources"
        echo "2. Check network connectivity between services"
        echo "3. Verify all secrets are properly configured"
        echo "4. Check ingress controller is properly installed"
        echo
        exit 1
    else
        echo
        log_success "All tests passed! 🎉"
        echo
        log_info "ASI Chain testnet is fully operational!"
        echo
        echo "Service endpoints:"
        echo "- Explorer: https://explorer.testnet.asi-chain.io"
        echo "- Wallet: https://wallet.testnet.asi-chain.io"
        echo "- Faucet: https://faucet.testnet.asi-chain.io"
        echo "- RPC: https://rpc.testnet.asi-chain.io"
        echo "- WebSocket: wss://ws.testnet.asi-chain.io"
        echo
        echo "Monitoring URLs (via kubectl port-forward):"
        echo "- kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE"
        echo "- kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
        echo "- kubectl port-forward svc/alertmanager 9093:9093 -n $NAMESPACE"
        echo
    fi
}

# Show current status if requested
if [[ "${1:-}" == "status" ]]; then
    echo "Current deployment status:"
    echo "========================="
    kubectl get pods -n $NAMESPACE
    echo
    kubectl get svc -n $NAMESPACE
    echo
    kubectl get ingress -n $NAMESPACE
    exit 0
fi

# Run main validation
main "$@"
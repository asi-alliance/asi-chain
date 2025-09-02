#!/bin/bash

# ASI Chain Health Check Script
# Monitors all critical services and reports status

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="asi-chain"
EXPECTED_VALIDATORS=4
SERVICES=("wallet" "explorer" "indexer" "faucet")
ENDPOINTS=(
    "https://api.testnet.asi-chain.io/health"
    "https://rpc.testnet.asi-chain.io"
    "https://explorer.testnet.asi-chain.io"
    "https://wallet.testnet.asi-chain.io"
    "https://faucet.testnet.asi-chain.io"
)

# Health status
HEALTH_STATUS="HEALTHY"
ISSUES=()

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    HEALTH_STATUS="UNHEALTHY"
    ISSUES+=("$1")
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    if [ "$HEALTH_STATUS" != "UNHEALTHY" ]; then
        HEALTH_STATUS="DEGRADED"
    fi
    ISSUES+=("$1")
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

# Check Kubernetes pods
check_pods() {
    log "Checking Kubernetes pods..."
    
    # Check validator pods
    RUNNING_VALIDATORS=$(kubectl get pods -n $NAMESPACE -l app=validator --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    if [ "$RUNNING_VALIDATORS" -eq "$EXPECTED_VALIDATORS" ]; then
        success "All $EXPECTED_VALIDATORS validators running"
    else
        error "Only $RUNNING_VALIDATORS/$EXPECTED_VALIDATORS validators running"
    fi
    
    # Check service pods
    for service in "${SERVICES[@]}"; do
        RUNNING=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
        DESIRED=$(kubectl get deployment -n $NAMESPACE $service -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [ "$RUNNING" -eq "$DESIRED" ] && [ "$DESIRED" -gt 0 ]; then
            success "$service: $RUNNING/$DESIRED pods running"
        else
            warning "$service: $RUNNING/$DESIRED pods running"
        fi
    done
}

# Check endpoints
check_endpoints() {
    log "Checking service endpoints..."
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -fsS --max-time 5 "$endpoint" &>/dev/null; then
            success "Endpoint accessible: $endpoint"
        else
            warning "Endpoint not accessible: $endpoint"
        fi
    done
}

# Check block production
check_block_production() {
    log "Checking block production..."
    
    # Get current block height
    BLOCK_HEIGHT=$(curl -sS --max-time 5 https://rpc.testnet.asi-chain.io \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | \
        grep -oP '"result":"\K[^"]+' | xargs printf "%d\n" 2>/dev/null || echo "0")
    
    if [ "$BLOCK_HEIGHT" -gt 0 ]; then
        success "Block height: $BLOCK_HEIGHT"
        
        # Wait and check if blocks are being produced
        sleep 5
        NEW_BLOCK_HEIGHT=$(curl -sS --max-time 5 https://rpc.testnet.asi-chain.io \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null | \
            grep -oP '"result":"\K[^"]+' | xargs printf "%d\n" 2>/dev/null || echo "0")
        
        if [ "$NEW_BLOCK_HEIGHT" -gt "$BLOCK_HEIGHT" ]; then
            success "Blocks being produced: $(($NEW_BLOCK_HEIGHT - $BLOCK_HEIGHT)) new blocks"
        else
            error "No new blocks produced in 5 seconds"
        fi
    else
        error "Cannot get block height"
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    # Check if database pods can connect
    DB_POD=$(kubectl get pod -n $NAMESPACE -l app=indexer -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$DB_POD" ]; then
        if kubectl exec -n $NAMESPACE "$DB_POD" -- pg_isready -h $DATABASE_HOST 2>/dev/null; then
            success "Database connection healthy"
        else
            warning "Database connection issues"
        fi
    else
        warning "Cannot check database (no indexer pod)"
    fi
}

# Check metrics
check_metrics() {
    log "Checking metrics collection..."
    
    # Check if Prometheus is collecting metrics
    PROMETHEUS_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$PROMETHEUS_POD" ]; then
        METRIC_COUNT=$(kubectl exec -n monitoring "$PROMETHEUS_POD" -- \
            curl -s http://localhost:9090/api/v1/label/__name__/values 2>/dev/null | \
            grep -c "asi_chain" || echo "0")
        
        if [ "$METRIC_COUNT" -gt 0 ]; then
            success "Metrics being collected: $METRIC_COUNT ASI Chain metrics"
        else
            warning "No ASI Chain metrics found"
        fi
    else
        warning "Prometheus not found"
    fi
}

# Generate health report
generate_report() {
    echo
    echo "════════════════════════════════════════════════════════"
    echo "                ASI CHAIN HEALTH REPORT                 "
    echo "════════════════════════════════════════════════════════"
    echo "Timestamp: $(date)"
    echo "Environment: Testnet"
    echo "Status: $HEALTH_STATUS"
    echo
    
    if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
        echo -e "${GREEN}✅ All systems operational${NC}"
    elif [ "$HEALTH_STATUS" = "DEGRADED" ]; then
        echo -e "${YELLOW}⚠️ System degraded - some issues detected${NC}"
    else
        echo -e "${RED}❌ System unhealthy - critical issues detected${NC}"
    fi
    
    if [ ${#ISSUES[@]} -gt 0 ]; then
        echo
        echo "Issues detected:"
        for issue in "${ISSUES[@]}"; do
            echo "  - $issue"
        done
    fi
    
    echo "════════════════════════════════════════════════════════"
    
    # Exit with appropriate code
    if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
        exit 0
    elif [ "$HEALTH_STATUS" = "DEGRADED" ]; then
        exit 1
    else
        exit 2
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting ASI Chain health check...${NC}"
    
    check_pods
    check_endpoints
    check_block_production
    check_database
    check_metrics
    
    generate_report
}

main "$@"
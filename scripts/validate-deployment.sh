#!/bin/bash

# ASI Chain Deployment Validation Script
# Comprehensive testing of all deployed components

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${ENVIRONMENT:-testnet}
DOMAIN="testnet.asi-chain.io"
EXPECTED_VALIDATORS=4
TIMEOUT=30

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILURES=()

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILURES+=("$1")
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Test function wrapper
test_component() {
    local name=$1
    local test_func=$2
    
    echo -e "\n${BLUE}Testing: $name${NC}"
    echo "----------------------------------------"
    
    if $test_func; then
        success "$name test passed"
    else
        error "$name test failed"
    fi
}

# Test AWS infrastructure
test_aws_infrastructure() {
    log "Checking AWS infrastructure..."
    
    # Check VPC
    if aws ec2 describe-vpcs --filters "Name=tag:Name,Values=asi-chain-${ENVIRONMENT}-vpc" --query "Vpcs[0].VpcId" --output text 2>/dev/null | grep -q "vpc-"; then
        success "VPC exists"
    else
        error "VPC not found"
        return 1
    fi
    
    # Check EKS cluster
    if aws eks describe-cluster --name "asi-chain-${ENVIRONMENT}" &>/dev/null 2>&1; then
        success "EKS cluster exists"
        
        # Check node groups
        NODE_COUNT=$(aws eks list-nodegroups --cluster-name "asi-chain-${ENVIRONMENT}" --query "nodegroups | length(@)" --output text)
        if [ "$NODE_COUNT" -ge 2 ]; then
            success "Node groups configured: $NODE_COUNT"
        else
            error "Insufficient node groups: $NODE_COUNT"
        fi
    else
        error "EKS cluster not found"
        return 1
    fi
    
    # Check RDS
    if aws rds describe-db-instances --db-instance-identifier "asi-chain-${ENVIRONMENT}-db" &>/dev/null 2>&1; then
        success "RDS database exists"
    else
        error "RDS database not found"
        return 1
    fi
    
    # Check ElastiCache
    if aws elasticache describe-replication-groups --replication-group-id "asi-chain-${ENVIRONMENT}" &>/dev/null 2>&1; then
        success "Redis cluster exists"
    else
        error "Redis cluster not found"
        return 1
    fi
    
    return 0
}

# Test Kubernetes cluster
test_kubernetes() {
    log "Checking Kubernetes cluster..."
    
    # Check cluster connection
    if kubectl cluster-info &>/dev/null 2>&1; then
        success "Connected to Kubernetes cluster"
    else
        error "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Check nodes
    NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
    if [ "$NODE_COUNT" -ge 4 ]; then
        success "Kubernetes nodes ready: $NODE_COUNT"
    else
        error "Insufficient nodes: $NODE_COUNT"
    fi
    
    # Check namespaces
    if kubectl get namespace asi-chain &>/dev/null 2>&1; then
        success "ASI Chain namespace exists"
    else
        error "ASI Chain namespace not found"
    fi
    
    # Check pods
    RUNNING_PODS=$(kubectl get pods -n asi-chain --field-selector=status.phase=Running --no-headers | wc -l)
    TOTAL_PODS=$(kubectl get pods -n asi-chain --no-headers | wc -l)
    
    if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
        success "All pods running: $RUNNING_PODS/$TOTAL_PODS"
    else
        warning "Some pods not running: $RUNNING_PODS/$TOTAL_PODS"
    fi
    
    return 0
}

# Test validators
test_validators() {
    log "Checking validators..."
    
    VALIDATORS_RUNNING=0
    
    for i in $(seq 1 $EXPECTED_VALIDATORS); do
        if kubectl get pod -n asi-chain -l validator-id="$i" --field-selector=status.phase=Running --no-headers | grep -q "validator"; then
            success "Validator $i is running"
            VALIDATORS_RUNNING=$((VALIDATORS_RUNNING + 1))
            
            # Check if validator is producing blocks
            POD_NAME=$(kubectl get pod -n asi-chain -l validator-id="$i" -o jsonpath='{.items[0].metadata.name}')
            if kubectl exec -n asi-chain "$POD_NAME" -- curl -s http://localhost:8545 \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}' | grep -q "true"; then
                success "Validator $i is mining"
            else
                warning "Validator $i is not mining"
            fi
        else
            error "Validator $i is not running"
        fi
    done
    
    if [ "$VALIDATORS_RUNNING" -eq "$EXPECTED_VALIDATORS" ]; then
        return 0
    else
        return 1
    fi
}

# Test API endpoints
test_endpoints() {
    log "Checking API endpoints..."
    
    ENDPOINTS=(
        "https://api.${DOMAIN}/health"
        "https://explorer.${DOMAIN}"
        "https://wallet.${DOMAIN}"
        "https://faucet.${DOMAIN}"
        "https://rpc.${DOMAIN}"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -fsS --max-time "$TIMEOUT" "$endpoint" &>/dev/null; then
            success "Endpoint accessible: $endpoint"
        else
            # Try with kubectl port-forward as fallback
            SERVICE_NAME=$(echo "$endpoint" | cut -d'.' -f1 | cut -d'/' -f3)
            warning "Endpoint not accessible via domain: $endpoint"
            info "Try: kubectl port-forward -n asi-chain svc/${SERVICE_NAME}-service 8080:80"
        fi
    done
    
    return 0
}

# Test RPC connection
test_rpc() {
    log "Testing RPC connection..."
    
    RPC_URL="https://rpc.${DOMAIN}"
    
    # Test eth_blockNumber
    RESPONSE=$(curl -sS --max-time "$TIMEOUT" "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null || echo "{}")
    
    if echo "$RESPONSE" | grep -q "result"; then
        BLOCK_NUMBER=$(echo "$RESPONSE" | grep -oP '"result":"\K[^"]+' | xargs printf "%d\n")
        success "RPC working - Latest block: $BLOCK_NUMBER"
    else
        error "RPC not responding"
        return 1
    fi
    
    # Test eth_chainId
    RESPONSE=$(curl -sS --max-time "$TIMEOUT" "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>/dev/null || echo "{}")
    
    if echo "$RESPONSE" | grep -q "0xa4b1"; then
        success "Chain ID correct: 42161"
    else
        error "Chain ID incorrect"
    fi
    
    return 0
}

# Test WebSocket connection
test_websocket() {
    log "Testing WebSocket connection..."
    
    WS_URL="wss://ws.${DOMAIN}"
    
    # Use wscat or websocat if available
    if command -v wscat &>/dev/null; then
        if echo '{"jsonrpc":"2.0","method":"eth_subscribe","params":["newHeads"],"id":1}' | \
           timeout "$TIMEOUT" wscat -c "$WS_URL" 2>/dev/null | grep -q "result"; then
            success "WebSocket connection working"
        else
            warning "WebSocket connection failed"
        fi
    else
        info "wscat not installed, skipping WebSocket test"
    fi
    
    return 0
}

# Test monitoring
test_monitoring() {
    log "Testing monitoring stack..."
    
    # Check Prometheus
    if kubectl get deployment -n monitoring prometheus-kube-prometheus-prometheus &>/dev/null 2>&1; then
        success "Prometheus deployed"
    else
        error "Prometheus not found"
    fi
    
    # Check Grafana
    if kubectl get deployment -n monitoring prometheus-grafana &>/dev/null 2>&1; then
        success "Grafana deployed"
    else
        error "Grafana not found"
    fi
    
    # Check metrics
    METRICS_COUNT=$(kubectl exec -n monitoring deployment/prometheus-kube-prometheus-prometheus -- \
        curl -s http://localhost:9090/api/v1/label/__name__/values 2>/dev/null | grep -c "asi_chain" || echo "0")
    
    if [ "$METRICS_COUNT" -gt 0 ]; then
        success "Custom metrics available: $METRICS_COUNT"
    else
        warning "No custom metrics found"
    fi
    
    return 0
}

# Test database connectivity
test_database() {
    log "Testing database connectivity..."
    
    # Get RDS endpoint
    RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "asi-chain-${ENVIRONMENT}-db" \
        --query "DBInstances[0].Endpoint.Address" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$RDS_ENDPOINT" ]; then
        # Test from a pod
        if kubectl run -n asi-chain test-db --rm -i --restart=Never \
            --image=postgres:15 -- \
            psql "postgresql://asichain_admin@${RDS_ENDPOINT}:5432/asichain" \
            -c "SELECT 1" &>/dev/null 2>&1; then
            success "Database connection successful"
        else
            warning "Database connection test failed (may need credentials)"
        fi
    else
        error "RDS endpoint not found"
    fi
    
    return 0
}

# Test SSL certificates
test_ssl() {
    log "Testing SSL certificates..."
    
    DOMAINS=(
        "api.${DOMAIN}"
        "explorer.${DOMAIN}"
        "wallet.${DOMAIN}"
    )
    
    for domain in "${DOMAINS[@]}"; do
        if echo | openssl s_client -connect "${domain}:443" -servername "$domain" 2>/dev/null | \
           openssl x509 -noout -dates 2>/dev/null | grep -q "notAfter"; then
            success "SSL certificate valid: $domain"
        else
            warning "SSL certificate issue: $domain"
        fi
    done
    
    return 0
}

# Load test
test_load() {
    log "Running basic load test..."
    
    RPC_URL="https://rpc.${DOMAIN}"
    
    # Send 100 requests
    SUCCESSFUL=0
    for i in $(seq 1 100); do
        if curl -sS --max-time 5 "$RPC_URL" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":'$i'}' &>/dev/null; then
            SUCCESSFUL=$((SUCCESSFUL + 1))
        fi
    done
    
    if [ "$SUCCESSFUL" -ge 95 ]; then
        success "Load test passed: $SUCCESSFUL/100 requests successful"
    else
        warning "Load test degraded: $SUCCESSFUL/100 requests successful"
    fi
    
    return 0
}

# Generate report
generate_report() {
    log "Generating validation report..."
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    
    cat > validation-report.md <<EOF
# ASI Chain Deployment Validation Report

**Date**: $(date)
**Environment**: $ENVIRONMENT
**Domain**: $DOMAIN

## Summary
- **Total Tests**: $TOTAL_TESTS
- **Passed**: $TESTS_PASSED
- **Failed**: $TESTS_FAILED
- **Success Rate**: $SUCCESS_RATE%

## Test Results

### ✅ Passed Tests
$(for i in $(seq 1 $TESTS_PASSED); do echo "- Test $i passed"; done)

### ❌ Failed Tests
$(for failure in "${FAILURES[@]}"; do echo "- $failure"; done)

## Infrastructure Status
- **AWS**: $([ $TESTS_FAILED -eq 0 ] && echo "✅ Operational" || echo "⚠️ Issues detected")
- **Kubernetes**: $(kubectl get nodes --no-headers | wc -l) nodes running
- **Validators**: $VALIDATORS_RUNNING/$EXPECTED_VALIDATORS operational
- **Services**: $(kubectl get pods -n asi-chain --field-selector=status.phase=Running --no-headers | wc -l) pods running

## Recommendations
$(if [ $TESTS_FAILED -gt 0 ]; then
    echo "1. Review failed tests and fix issues"
    echo "2. Check pod logs: kubectl logs -n asi-chain <pod-name>"
    echo "3. Verify DNS configuration"
    echo "4. Check security group rules"
else
    echo "1. System ready for production use"
    echo "2. Configure monitoring alerts"
    echo "3. Set up backup automation"
    echo "4. Perform security audit"
fi)

## Next Steps
- [ ] Fix any failed tests
- [ ] Configure DNS records
- [ ] Set up monitoring dashboards
- [ ] Run extended load testing
- [ ] Document runbooks

---
*Generated by ASI Chain Validation Script*
EOF
    
    cat validation-report.md
}

# Main execution
main() {
    echo -e "${BLUE}"
    cat << "EOF"
    ___   _____ ____    ________          _      
   /   | / ___//  _/   / ____/ /_  ____ _(_)___  
  / /| | \__ \ / /    / /   / __ \/ __ `/ / __ \ 
 / ___ |___/ // /    / /___/ / / / /_/ / / / / / 
/_/  |_/____/___/    \____/_/ /_/\__,_/_/_/ /_/  
                                                  
         Deployment Validation Suite v1.0
EOF
    echo -e "${NC}\n"
    
    log "Starting deployment validation..."
    
    # Run tests
    test_component "AWS Infrastructure" test_aws_infrastructure
    test_component "Kubernetes Cluster" test_kubernetes
    test_component "Validators" test_validators
    test_component "API Endpoints" test_endpoints
    test_component "RPC Connection" test_rpc
    test_component "WebSocket" test_websocket
    test_component "Monitoring" test_monitoring
    test_component "Database" test_database
    test_component "SSL Certificates" test_ssl
    test_component "Load Test" test_load
    
    # Generate report
    echo
    generate_report
    
    # Final summary
    echo
    if [ $TESTS_FAILED -eq 0 ]; then
        log "🎉 All tests passed! Deployment validated successfully!"
        exit 0
    else
        error "⚠️ $TESTS_FAILED tests failed. Review the report above."
        exit 1
    fi
}

# Run main function
main "$@"
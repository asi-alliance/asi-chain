#!/bin/bash

# ASI Chain Production Deployment Script
# This script deploys all components in the correct order with dependency checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="asi-chain"
KUBECTL_TIMEOUT="300s"
MAX_RETRIES=5
RETRY_DELAY=30

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if running as cluster admin
    if ! kubectl auth can-i '*' '*' --all-namespaces &> /dev/null; then
        log_warning "You may not have cluster admin permissions. Some operations might fail."
    fi
    
    log_success "Prerequisites check passed"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local deployment_name=$1
    local namespace=$2
    local timeout=${3:-$KUBECTL_TIMEOUT}
    
    log_info "Waiting for deployment $deployment_name to be ready..."
    
    if kubectl wait --for=condition=available --timeout=$timeout deployment/$deployment_name -n $namespace; then
        log_success "Deployment $deployment_name is ready"
        return 0
    else
        log_error "Deployment $deployment_name failed to become ready within $timeout"
        return 1
    fi
}

# Wait for StatefulSet to be ready
wait_for_statefulset() {
    local statefulset_name=$1
    local namespace=$2
    local replicas=$3
    local timeout=${4:-$KUBECTL_TIMEOUT}
    
    log_info "Waiting for StatefulSet $statefulset_name to be ready..."
    
    if kubectl wait --for=jsonpath='{.status.readyReplicas}'=$replicas --timeout=$timeout statefulset/$statefulset_name -n $namespace; then
        log_success "StatefulSet $statefulset_name is ready"
        return 0
    else
        log_error "StatefulSet $statefulset_name failed to become ready within $timeout"
        return 1
    fi
}

# Wait for pods to be ready
wait_for_pods() {
    local label_selector=$1
    local namespace=$2
    local expected_count=$3
    local timeout=${4:-$KUBECTL_TIMEOUT}
    
    log_info "Waiting for pods with selector '$label_selector' to be ready..."
    
    for ((i=1; i<=MAX_RETRIES; i++)); do
        ready_pods=$(kubectl get pods -l "$label_selector" -n $namespace --field-selector=status.phase=Running -o json | jq '.items | length')
        
        if [[ $ready_pods -eq $expected_count ]]; then
            log_success "All $expected_count pods are ready"
            return 0
        fi
        
        log_info "Attempt $i/$MAX_RETRIES: $ready_pods/$expected_count pods ready"
        
        if [[ $i -lt $MAX_RETRIES ]]; then
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "Pods did not become ready within expected time"
    return 1
}

# Check service health
check_service_health() {
    local service_name=$1
    local namespace=$2
    local port=$3
    local path=${4:-"/health"}
    
    log_info "Checking health of service $service_name..."
    
    # Port forward to check service health
    kubectl port-forward svc/$service_name $port:$port -n $namespace &
    local pf_pid=$!
    
    sleep 5  # Give port-forward time to establish
    
    if curl -f "http://localhost:$port$path" &> /dev/null; then
        log_success "Service $service_name is healthy"
        kill $pf_pid 2>/dev/null || true
        return 0
    else
        log_warning "Service $service_name health check failed"
        kill $pf_pid 2>/dev/null || true
        return 1
    fi
}

# Deploy function with retry logic
deploy_manifest() {
    local manifest_file=$1
    local description=$2
    
    log_info "Deploying $description..."
    
    for ((i=1; i<=MAX_RETRIES; i++)); do
        if kubectl apply -f "$manifest_file"; then
            log_success "$description deployed successfully"
            return 0
        else
            log_warning "Attempt $i/$MAX_RETRIES failed for $description"
            if [[ $i -lt $MAX_RETRIES ]]; then
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    log_error "Failed to deploy $description after $MAX_RETRIES attempts"
    return 1
}

# Main deployment sequence
main() {
    log_info "Starting ASI Chain Production Deployment"
    echo "================================================="
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Create namespace and basic resources
    log_info "Phase 1: Creating namespace and basic resources"
    deploy_manifest "namespace.yaml" "Namespace and ResourceQuota"
    
    # Step 3: Deploy infrastructure (databases, cache, monitoring)
    log_info "Phase 2: Deploying infrastructure components"
    deploy_manifest "infrastructure.yaml" "Infrastructure components (PostgreSQL, Redis, Hasura)"
    
    # Wait for databases to be ready
    wait_for_statefulset "postgres" $NAMESPACE 1
    wait_for_deployment "redis" $NAMESPACE
    wait_for_deployment "hasura" $NAMESPACE
    
    # Step 4: Deploy monitoring stack
    log_info "Phase 3: Deploying monitoring stack"
    deploy_manifest "monitoring.yaml" "Monitoring stack (Prometheus, Grafana, AlertManager)"
    
    wait_for_deployment "prometheus" $NAMESPACE
    wait_for_deployment "grafana" $NAMESPACE
    wait_for_deployment "alertmanager" $NAMESPACE
    
    # Step 5: Deploy validators (the core blockchain nodes)
    log_info "Phase 4: Deploying validator nodes"
    deploy_manifest "validators.yaml" "Validator nodes"
    
    # Wait for all validators to be ready
    wait_for_statefulset "validator-1" $NAMESPACE 1
    wait_for_statefulset "validator-2" $NAMESPACE 1
    
    # Step 6: Deploy application services
    log_info "Phase 5: Deploying application services"
    deploy_manifest "indexer.yaml" "Indexer service"
    wait_for_deployment "indexer" $NAMESPACE
    
    deploy_manifest "explorer.yaml" "Explorer service"
    wait_for_deployment "explorer" $NAMESPACE
    
    deploy_manifest "wallet.yaml" "Wallet service"
    wait_for_deployment "wallet" $NAMESPACE
    
    deploy_manifest "faucet.yaml" "Faucet service"
    wait_for_deployment "faucet" $NAMESPACE
    
    # Step 7: Deploy ingress and networking
    log_info "Phase 6: Deploying ingress and networking"
    deploy_manifest "ingress.yaml" "Ingress and networking"
    
    # Step 8: Verify deployment
    log_info "Phase 7: Verifying deployment"
    
    # Check all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    # Check services
    log_info "Checking services..."
    kubectl get svc -n $NAMESPACE
    
    # Check ingress
    log_info "Checking ingress..."
    kubectl get ingress -n $NAMESPACE
    
    # Step 9: Display access information
    log_info "Phase 8: Deployment complete!"
    echo "================================================="
    echo
    log_success "ASI Chain testnet has been successfully deployed!"
    echo
    echo "Service endpoints:"
    echo "- Explorer: https://explorer.testnet.asi-chain.io"
    echo "- Wallet: https://wallet.testnet.asi-chain.io"  
    echo "- Faucet: https://faucet.testnet.asi-chain.io"
    echo "- RPC: https://rpc.testnet.asi-chain.io"
    echo "- WebSocket: wss://ws.testnet.asi-chain.io"
    echo
    echo "Monitoring:"
    echo "- Prometheus: http://$(kubectl get svc prometheus -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):9090"
    echo "- Grafana: http://$(kubectl get svc grafana -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):3000"
    echo "  Default credentials: admin / admin123!@#"
    echo
    echo "Next steps:"
    echo "1. Update DNS records to point to the LoadBalancer IPs"
    echo "2. Configure SSL certificates"
    echo "3. Update validator keys in the secrets"
    echo "4. Configure monitoring alerts"
    echo "5. Run the validation tests"
    echo
    log_info "Run './validate-deployment.sh' to perform health checks"
}

# Cleanup function for failed deployments
cleanup() {
    log_warning "Deployment failed. To clean up, run:"
    echo "kubectl delete namespace $NAMESPACE"
}

# Trap cleanup on exit if deployment fails
trap cleanup ERR

# Run main deployment
main "$@"
#!/bin/bash

# F1R3FLY Kubernetes Deployment Script
# Automates the complete deployment of F1R3FLY blockchain on Kubernetes
# Usage: ./deploy-f1r3fly-k8s.sh [options]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CLUSTER_NAME="f1r3fly-local"
NAMESPACE="f1r3fly"
REPLICAS=4
CLEANUP=false
MONITORING=false
INGRESS=false
SKIP_PREREQ=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists kubectl; then
        missing_deps+=("kubectl")
    fi
    
    if ! command_exists kind; then
        missing_deps+=("kind")
    fi
    
    if ! command_exists helm; then
        missing_deps+=("helm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Installing missing dependencies..."
        
        # Detect OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if ! command_exists brew; then
                print_error "Homebrew is required. Please install from https://brew.sh"
                exit 1
            fi
            
            for dep in "${missing_deps[@]}"; do
                print_status "Installing $dep..."
                brew install "$dep"
            done
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            for dep in "${missing_deps[@]}"; do
                case "$dep" in
                    docker)
                        curl -fsSL https://get.docker.com | sh
                        sudo usermod -aG docker $USER
                        print_warning "Please log out and back in for docker group changes to take effect"
                        ;;
                    kubectl)
                        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                        chmod +x kubectl
                        sudo mv kubectl /usr/local/bin/
                        ;;
                    kind)
                        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
                        chmod +x ./kind
                        sudo mv ./kind /usr/local/bin/kind
                        ;;
                    helm)
                        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
                        ;;
                esac
            done
        else
            print_error "Unsupported OS. Please install dependencies manually."
            exit 1
        fi
    fi
    
    # Check Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to create kind cluster
create_kind_cluster() {
    print_status "Creating kind cluster: $CLUSTER_NAME"
    
    # Check if cluster already exists
    if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
        print_warning "Cluster $CLUSTER_NAME already exists"
        read -p "Delete and recreate? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kind delete cluster --name "$CLUSTER_NAME"
        else
            print_status "Using existing cluster"
            return
        fi
    fi
    
    # Create kind config
    cat <<EOF > /tmp/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  # Bootstrap node API
  - containerPort: 30003
    hostPort: 40403
    protocol: TCP
  # Validator 1 API
  - containerPort: 30013
    hostPort: 40413
    protocol: TCP
  # Validator 2 API
  - containerPort: 30023
    hostPort: 40423
    protocol: TCP
  # Validator 3 API
  - containerPort: 30033
    hostPort: 40433
    protocol: TCP
  # Bootstrap metrics
  - containerPort: 30005
    hostPort: 40405
    protocol: TCP
  # Grafana (if monitoring enabled)
  - containerPort: 30080
    hostPort: 3000
    protocol: TCP
EOF
    
    # Create cluster
    kind create cluster --name "$CLUSTER_NAME" --config /tmp/kind-config.yaml
    
    # Set kubectl context
    kubectl config use-context "kind-${CLUSTER_NAME}"
    
    print_success "Kind cluster created successfully"
}

# Function to load Docker images to kind
load_images_to_kind() {
    print_status "Loading F1R3FLY Docker image to kind cluster..."
    
    # Pull the image first
    docker pull f1r3flyindustries/f1r3fly-scala-node:latest
    
    # Load to kind
    kind load docker-image f1r3flyindustries/f1r3fly-scala-node:latest --name "$CLUSTER_NAME"
    
    print_success "Docker image loaded to kind"
}

# Function to deploy F1R3FLY using Helm
deploy_f1r3fly() {
    print_status "Deploying F1R3FLY with Helm..."
    
    # Check if namespace exists
    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
    fi
    
    # Create custom values file
    cat <<EOF > /tmp/f1r3fly-values.yaml
shardConfig:
  deployableReplicas: $REPLICAS
  readOnlyReplicas: 0
  syncConstraintThreshold: 0.34
  
image:
  repository: f1r3flyindustries/f1r3fly-scala-node
  pullPolicy: IfNotPresent
  tag: "latest"

resources:
  limits:
    cpu: 2
    memory: 2Gi
  requests:
    cpu: 1
    memory: 1Gi

persistence:
  storageClassName: "standard"
  size: 10Gi

service:
  type: NodePort
EOF
    
    # Add monitoring if enabled
    if [ "$MONITORING" = true ]; then
        cat <<EOF >> /tmp/f1r3fly-values.yaml

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
EOF
    fi
    
    # Add ingress if enabled
    if [ "$INGRESS" = true ]; then
        cat <<EOF >> /tmp/f1r3fly-values.yaml

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: f1r3fly.local
      paths:
        - path: /
          pathType: Prefix
EOF
    fi
    
    # Deploy with Helm (path relative to f1r3fly/docker directory)
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    HELM_CHART_PATH="${SCRIPT_DIR}/../f1r3fly/docker/helm/f1r3fly"
    
    if [ ! -d "$HELM_CHART_PATH" ]; then
        print_error "Helm chart not found at $HELM_CHART_PATH"
        exit 1
    fi
    
    helm upgrade --install f1r3fly "$HELM_CHART_PATH" \
        -n "$NAMESPACE" \
        -f /tmp/f1r3fly-values.yaml \
        --wait --timeout 10m
    
    print_success "F1R3FLY deployed successfully"
}

# Function to wait for pods to be ready
wait_for_pods() {
    print_status "Waiting for all pods to be ready..."
    
    kubectl wait --for=condition=ready pod \
        -l app=f1r3fly \
        -n "$NAMESPACE" \
        --timeout=300s
    
    print_success "All pods are ready"
}

# Function to deploy monitoring stack
deploy_monitoring() {
    if [ "$MONITORING" != true ]; then
        return
    fi
    
    print_status "Deploying monitoring stack..."
    
    # Add Prometheus repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        -n "$NAMESPACE" \
        --set prometheus.service.type=NodePort \
        --set prometheus.service.nodePort=30090 \
        --set grafana.service.type=NodePort \
        --set grafana.service.nodePort=30080 \
        --set grafana.adminPassword=admin
    
    print_success "Monitoring stack deployed"
    print_status "Grafana: http://localhost:3000 (admin/admin)"
}

# Function to deploy ingress controller
deploy_ingress() {
    if [ "$INGRESS" != true ]; then
        return
    fi
    
    print_status "Deploying NGINX Ingress Controller..."
    
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=90s
    
    print_success "Ingress controller deployed"
}

# Function to test deployment
test_deployment() {
    print_status "Testing F1R3FLY deployment..."
    
    # Test API endpoint
    print_status "Testing bootstrap node API..."
    
    # Wait a bit for services to be ready
    sleep 5
    
    # Test the API
    if curl -s http://localhost:40403/api/status >/dev/null 2>&1; then
        print_success "Bootstrap node API is accessible"
        
        # Get status
        STATUS=$(curl -s http://localhost:40403/api/status)
        
        # Extract peers count
        PEERS=$(echo "$STATUS" | grep -o '"peers":[0-9]*' | cut -d: -f2)
        
        print_status "Bootstrap node status:"
        echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
        
        if [ "$PEERS" -ge 1 ]; then
            print_success "Network is healthy with $PEERS peers connected"
        else
            print_warning "No peers connected yet"
        fi
    else
        print_error "Cannot connect to bootstrap node API"
        print_status "Checking pod logs..."
        kubectl logs f1r3fly0-0 -n "$NAMESPACE" --tail=50
    fi
    
    # Deploy a test contract
    print_status "Deploying test smart contract..."
    
    RESPONSE=$(curl -s -X POST http://localhost:40403/api/deploy \
        -H "Content-Type: application/json" \
        -d '{
            "term": "new out(`rho:io:stdout`) in { out!(\"Hello F1R3FLY on Kubernetes!\") }",
            "phloLimit": 100000,
            "phloPrice": 1,
            "deployer": "1111AtahZeefej4tvVR6ti9TJtv8yxLebT31SCEVDCKMNikBk5r3g"
        }')
    
    if echo "$RESPONSE" | grep -q "deployId"; then
        print_success "Test contract deployed successfully"
    else
        print_warning "Test contract deployment may have failed"
        echo "$RESPONSE"
    fi
}

# Function to show connection info
show_connection_info() {
    echo
    print_success "======================================"
    print_success "F1R3FLY Cluster Deployed Successfully!"
    print_success "======================================"
    echo
    print_status "Connection Information:"
    echo "  Bootstrap Node API: http://localhost:40403"
    echo "  Validator 1 API:    http://localhost:40413"
    echo "  Validator 2 API:    http://localhost:40423"
    echo "  Validator 3 API:    http://localhost:40433"
    echo "  Metrics:            http://localhost:40405/metrics"
    
    if [ "$MONITORING" = true ]; then
        echo "  Grafana Dashboard:  http://localhost:3000 (admin/admin)"
    fi
    
    echo
    print_status "Useful Commands:"
    echo "  View pods:        kubectl get pods -n $NAMESPACE"
    echo "  View logs:        kubectl logs -f f1r3fly0-0 -n $NAMESPACE"
    echo "  Check status:     curl http://localhost:40403/api/status | jq ."
    echo "  Deploy contract:  See docs/F1R3FLY_QUICK_START.md"
    echo "  Delete cluster:   ./deploy-f1r3fly-k8s.sh --cleanup"
    echo
}

# Function to cleanup
cleanup() {
    print_warning "Cleaning up F1R3FLY deployment..."
    
    # Uninstall Helm releases
    helm uninstall f1r3fly -n "$NAMESPACE" 2>/dev/null || true
    
    if [ "$MONITORING" = true ]; then
        helm uninstall prometheus -n "$NAMESPACE" 2>/dev/null || true
    fi
    
    # Delete namespace
    kubectl delete namespace "$NAMESPACE" --wait=false 2>/dev/null || true
    
    # Delete kind cluster
    kind delete cluster --name "$CLUSTER_NAME"
    
    print_success "Cleanup complete"
}

# Function to show usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Deploy F1R3FLY blockchain on Kubernetes locally using kind.

OPTIONS:
    -h, --help          Show this help message
    -c, --cluster NAME  Kind cluster name (default: f1r3fly-local)
    -n, --namespace NS  Kubernetes namespace (default: f1r3fly)
    -r, --replicas NUM  Number of validator nodes (default: 4)
    -m, --monitoring    Deploy Prometheus and Grafana
    -i, --ingress       Deploy NGINX Ingress Controller
    -s, --skip-prereq   Skip prerequisite checks
    --cleanup           Remove F1R3FLY deployment and kind cluster

EXAMPLES:
    # Basic deployment with 4 nodes
    $0

    # Deploy with monitoring
    $0 --monitoring

    # Deploy with custom replica count
    $0 --replicas 8

    # Clean up everything
    $0 --cleanup

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--replicas)
            REPLICAS="$2"
            shift 2
            ;;
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        -i|--ingress)
            INGRESS=true
            shift
            ;;
        -s|--skip-prereq)
            SKIP_PREREQ=true
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo
    print_status "F1R3FLY Kubernetes Deployment Script"
    print_status "====================================="
    echo
    
    # Handle cleanup
    if [ "$CLEANUP" = true ]; then
        cleanup
        exit 0
    fi
    
    # Check prerequisites
    if [ "$SKIP_PREREQ" != true ]; then
        check_prerequisites
    fi
    
    # Create kind cluster
    create_kind_cluster
    
    # Load images
    load_images_to_kind
    
    # Deploy ingress if requested
    deploy_ingress
    
    # Deploy F1R3FLY
    deploy_f1r3fly
    
    # Wait for pods
    wait_for_pods
    
    # Deploy monitoring if requested
    deploy_monitoring
    
    # Test deployment
    test_deployment
    
    # Show connection info
    show_connection_info
}

# Run main function
main
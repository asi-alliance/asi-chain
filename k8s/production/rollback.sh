#!/bin/bash

# ASI Chain Production Rollback Script
# This script provides various rollback strategies for production issues

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="asi-chain"
BACKUP_DIR="/tmp/asi-chain-backups"

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

# Backup current state before rollback
backup_current_state() {
    log_info "Creating backup of current state..."
    
    mkdir -p "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    
    # Backup manifests
    kubectl get all -n $NAMESPACE -o yaml > "$backup_path/current-state.yaml"
    kubectl get configmaps -n $NAMESPACE -o yaml > "$backup_path/configmaps.yaml"
    kubectl get secrets -n $NAMESPACE -o yaml > "$backup_path/secrets.yaml"
    kubectl get pvc -n $NAMESPACE -o yaml > "$backup_path/pvcs.yaml"
    
    # Backup database
    log_info "Backing up database..."
    kubectl exec statefulset/postgres -n $NAMESPACE -- pg_dump -U asichain asichain > "$backup_path/database.sql"
    
    log_success "Backup created at: $backup_path"
}

# Rollback to previous deployment
rollback_deployment() {
    local service_name="$1"
    local revision="${2:-}"
    
    log_info "Rolling back $service_name..."
    
    if [[ -n "$revision" ]]; then
        kubectl rollout undo deployment/$service_name -n $NAMESPACE --to-revision=$revision
    else
        kubectl rollout undo deployment/$service_name -n $NAMESPACE
    fi
    
    # Wait for rollback to complete
    kubectl rollout status deployment/$service_name -n $NAMESPACE --timeout=300s
    
    log_success "$service_name rolled back successfully"
}

# Rollback StatefulSet
rollback_statefulset() {
    local statefulset_name="$1"
    local revision="${2:-}"
    
    log_warning "Rolling back StatefulSet $statefulset_name..."
    log_warning "Note: StatefulSet rollbacks require manual intervention"
    
    if [[ -n "$revision" ]]; then
        kubectl rollout undo statefulset/$statefulset_name -n $NAMESPACE --to-revision=$revision
    else
        kubectl rollout undo statefulset/$statefulset_name -n $NAMESPACE
    fi
    
    # Wait for rollback to complete
    kubectl rollout status statefulset/$statefulset_name -n $NAMESPACE --timeout=600s
    
    log_success "$statefulset_name rolled back successfully"
}

# Quick rollback - rollback all services to previous version
quick_rollback() {
    log_warning "Performing quick rollback of all services..."
    
    backup_current_state
    
    # Rollback application services first
    local services=("explorer" "wallet" "indexer" "faucet")
    
    for service in "${services[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            rollback_deployment $service
        fi
    done
    
    # Rollback infrastructure if needed
    read -p "Rollback infrastructure components (postgres, redis)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if kubectl get deployment redis -n $NAMESPACE &>/dev/null; then
            rollback_deployment redis
        fi
        
        if kubectl get statefulset postgres -n $NAMESPACE &>/dev/null; then
            rollback_statefulset postgres
        fi
    fi
    
    log_success "Quick rollback completed"
}

# Service-specific rollback
service_rollback() {
    local service_name="$1"
    local revision="${2:-}"
    
    log_info "Rolling back service: $service_name"
    
    backup_current_state
    
    # Check if it's a deployment or statefulset
    if kubectl get deployment $service_name -n $NAMESPACE &>/dev/null; then
        rollback_deployment $service_name $revision
    elif kubectl get statefulset $service_name -n $NAMESPACE &>/dev/null; then
        rollback_statefulset $service_name $revision
    else
        log_error "Service $service_name not found"
        exit 1
    fi
}

# Complete infrastructure rollback
infrastructure_rollback() {
    log_warning "Performing complete infrastructure rollback..."
    log_warning "This will rollback validators, database, cache, and monitoring"
    
    read -p "Are you sure you want to continue? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    backup_current_state
    
    # Stop application services first
    log_info "Scaling down application services..."
    kubectl scale deployment/explorer --replicas=0 -n $NAMESPACE || true
    kubectl scale deployment/wallet --replicas=0 -n $NAMESPACE || true
    kubectl scale deployment/indexer --replicas=0 -n $NAMESPACE || true
    kubectl scale deployment/faucet --replicas=0 -n $NAMESPACE || true
    
    # Rollback infrastructure
    log_info "Rolling back infrastructure components..."
    
    # Rollback validators
    local validators=("validator-1" "validator-2")
    for validator in "${validators[@]}"; do
        if kubectl get statefulset $validator -n $NAMESPACE &>/dev/null; then
            rollback_statefulset $validator
        fi
    done
    
    # Rollback database and cache
    if kubectl get statefulset postgres -n $NAMESPACE &>/dev/null; then
        rollback_statefulset postgres
    fi
    
    if kubectl get deployment redis -n $NAMESPACE &>/dev/null; then
        rollback_deployment redis
    fi
    
    # Rollback monitoring
    local monitoring_services=("prometheus" "grafana" "alertmanager")
    for service in "${monitoring_services[@]}"; do
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            rollback_deployment $service
        fi
    done
    
    # Restart application services
    log_info "Restarting application services..."
    kubectl scale deployment/indexer --replicas=2 -n $NAMESPACE || true
    kubectl scale deployment/explorer --replicas=3 -n $NAMESPACE || true
    kubectl scale deployment/wallet --replicas=3 -n $NAMESPACE || true
    kubectl scale deployment/faucet --replicas=2 -n $NAMESPACE || true
    
    log_success "Infrastructure rollback completed"
}

# Emergency stop - scale down all services
emergency_stop() {
    log_warning "Performing emergency stop - scaling down all services..."
    
    read -p "Are you sure you want to stop all services? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Emergency stop cancelled"
        exit 0
    fi
    
    backup_current_state
    
    # Scale down all deployments
    local deployments=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    for deployment in $deployments; do
        log_info "Scaling down $deployment..."
        kubectl scale deployment/$deployment --replicas=0 -n $NAMESPACE
    done
    
    log_warning "All services stopped. To restart, run: ./rollback.sh restart"
}

# Restart all services
restart_services() {
    log_info "Restarting all services with default replica counts..."
    
    # Start infrastructure first
    kubectl scale deployment/redis --replicas=1 -n $NAMESPACE || true
    kubectl scale deployment/hasura --replicas=2 -n $NAMESPACE || true
    
    # Wait for infrastructure
    sleep 30
    
    # Start monitoring
    kubectl scale deployment/prometheus --replicas=1 -n $NAMESPACE || true
    kubectl scale deployment/grafana --replicas=1 -n $NAMESPACE || true
    kubectl scale deployment/alertmanager --replicas=1 -n $NAMESPACE || true
    
    # Start application services
    kubectl scale deployment/indexer --replicas=2 -n $NAMESPACE || true
    kubectl scale deployment/explorer --replicas=3 -n $NAMESPACE || true
    kubectl scale deployment/wallet --replicas=3 -n $NAMESPACE || true
    kubectl scale deployment/faucet --replicas=2 -n $NAMESPACE || true
    
    log_success "All services restarted"
}

# Database rollback
database_rollback() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "Rolling back database from backup: $backup_file"
    
    read -p "This will overwrite the current database. Continue? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Database rollback cancelled"
        exit 0
    fi
    
    # Stop services that use the database
    log_info "Stopping services that use the database..."
    kubectl scale deployment/indexer --replicas=0 -n $NAMESPACE
    kubectl scale deployment/explorer --replicas=0 -n $NAMESPACE
    kubectl scale deployment/hasura --replicas=0 -n $NAMESPACE
    
    # Wait for services to stop
    sleep 30
    
    # Restore database
    log_info "Restoring database..."
    kubectl exec -i statefulset/postgres -n $NAMESPACE -- psql -U asichain -d asichain < "$backup_file"
    
    # Restart services
    log_info "Restarting services..."
    kubectl scale deployment/hasura --replicas=2 -n $NAMESPACE
    kubectl scale deployment/indexer --replicas=2 -n $NAMESPACE
    kubectl scale deployment/explorer --replicas=3 -n $NAMESPACE
    
    log_success "Database rollback completed"
}

# Show rollback history
show_history() {
    log_info "Deployment rollback history:"
    echo
    
    local deployments=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    for deployment in $deployments; do
        echo "=== $deployment ==="
        kubectl rollout history deployment/$deployment -n $NAMESPACE
        echo
    done
    
    local statefulsets=$(kubectl get statefulsets -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    for statefulset in $statefulsets; do
        echo "=== $statefulset ==="
        kubectl rollout history statefulset/$statefulset -n $NAMESPACE
        echo
    done
}

# Show available backups
show_backups() {
    log_info "Available backups:"
    echo
    
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -la "$BACKUP_DIR"/
    else
        log_warning "No backups directory found at $BACKUP_DIR"
    fi
}

# Main function
main() {
    case "${1:-}" in
        "quick")
            quick_rollback
            ;;
        "service")
            if [[ -z "${2:-}" ]]; then
                log_error "Service name required. Usage: $0 service <service-name> [revision]"
                exit 1
            fi
            service_rollback "$2" "${3:-}"
            ;;
        "infrastructure")
            infrastructure_rollback
            ;;
        "database")
            if [[ -z "${2:-}" ]]; then
                log_error "Backup file required. Usage: $0 database <backup-file>"
                exit 1
            fi
            database_rollback "$2"
            ;;
        "emergency-stop")
            emergency_stop
            ;;
        "restart")
            restart_services
            ;;
        "history")
            show_history
            ;;
        "backups")
            show_backups
            ;;
        *)
            echo "ASI Chain Production Rollback Script"
            echo "====================================="
            echo
            echo "Usage: $0 <command> [options]"
            echo
            echo "Commands:"
            echo "  quick                    - Quick rollback of all application services"
            echo "  service <name> [rev]     - Rollback specific service to previous or specific revision"
            echo "  infrastructure          - Complete infrastructure rollback (WARNING: High impact)"
            echo "  database <backup-file>   - Restore database from backup file"
            echo "  emergency-stop          - Emergency stop all services"
            echo "  restart                 - Restart all services with default replica counts"
            echo "  history                 - Show rollback history for all services"
            echo "  backups                 - Show available backup files"
            echo
            echo "Examples:"
            echo "  $0 quick                           # Quick rollback all services"
            echo "  $0 service explorer                # Rollback explorer to previous version"
            echo "  $0 service validator-1 3          # Rollback validator-1 to revision 3"
            echo "  $0 database /path/to/backup.sql    # Restore database from backup"
            echo "  $0 emergency-stop                  # Stop all services immediately"
            echo
            echo "Before running any rollback:"
            echo "1. Assess the impact and scope of the rollback"
            echo "2. Notify the team about the rollback"
            echo "3. Ensure you have recent backups"
            echo "4. Have the troubleshooting guide available"
            echo
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
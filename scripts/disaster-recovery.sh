#!/bin/bash
# ASI Chain Disaster Recovery Script
# Automated recovery procedures for production infrastructure

set -euo pipefail

# Configuration
NAMESPACE="asi-chain"
BACKUP_BUCKET="asi-chain-backups"
AWS_REGION="us-east-1"
RECOVERY_LOG="/var/log/asi-chain-recovery.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RECOVERY_LOG"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error_exit "kubectl not found"
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI not found"
    fi
    
    # Check Velero
    if ! command -v velero &> /dev/null; then
        error_exit "Velero CLI not found"
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    log "Prerequisites check passed"
}

# Database recovery
recover_database() {
    local backup_date=$1
    log "Starting database recovery for date: $backup_date"
    
    # Find latest backup for the date
    BACKUP_FILE=$(aws s3 ls s3://$BACKUP_BUCKET/postgres/$backup_date/ | \
                  sort | tail -n 1 | awk '{print $4}')
    
    if [[ -z "$BACKUP_FILE" ]]; then
        error_exit "No backup found for date: $backup_date"
    fi
    
    log "Found backup file: $BACKUP_FILE"
    
    # Download backup
    aws s3 cp s3://$BACKUP_BUCKET/postgres/$backup_date/$BACKUP_FILE /tmp/
    gunzip /tmp/$BACKUP_FILE
    
    # Scale down services that use the database
    log "Scaling down services..."
    kubectl scale deployment asi-indexer --replicas=0 -n $NAMESPACE
    kubectl scale deployment hasura --replicas=0 -n $NAMESPACE
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod -l app=asi-indexer -n $NAMESPACE --timeout=300s
    kubectl wait --for=delete pod -l app=hasura -n $NAMESPACE --timeout=300s
    
    # Restore database
    log "Restoring database..."
    kubectl exec -n $NAMESPACE postgres-primary-0 -- bash -c "
        export PGPASSWORD=\$POSTGRES_PASSWORD
        dropdb -h localhost -U indexer asichain --if-exists
        createdb -h localhost -U indexer asichain
    "
    
    # Import backup
    kubectl cp /tmp/${BACKUP_FILE%.gz} $NAMESPACE/postgres-primary-0:/tmp/restore.sql
    kubectl exec -n $NAMESPACE postgres-primary-0 -- bash -c "
        export PGPASSWORD=\$POSTGRES_PASSWORD
        psql -h localhost -U indexer -d asichain < /tmp/restore.sql
        rm /tmp/restore.sql
    "
    
    # Scale services back up
    log "Scaling services back up..."
    kubectl scale deployment asi-indexer --replicas=3 -n $NAMESPACE
    kubectl scale deployment hasura --replicas=2 -n $NAMESPACE
    
    # Wait for services to be ready
    kubectl wait --for=condition=available deployment/asi-indexer -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=available deployment/hasura -n $NAMESPACE --timeout=300s
    
    # Clean up
    rm /tmp/${BACKUP_FILE%.gz}
    
    log "Database recovery completed successfully"
}

# Redis recovery
recover_redis() {
    local backup_date=$1
    log "Starting Redis recovery for date: $backup_date"
    
    # Find latest backup for the date
    BACKUP_FILE=$(aws s3 ls s3://$BACKUP_BUCKET/redis/$backup_date/ | \
                  sort | tail -n 1 | awk '{print $4}')
    
    if [[ -z "$BACKUP_FILE" ]]; then
        log "No Redis backup found for date: $backup_date, skipping..."
        return 0
    fi
    
    log "Found Redis backup file: $BACKUP_FILE"
    
    # Download backup
    aws s3 cp s3://$BACKUP_BUCKET/redis/$backup_date/$BACKUP_FILE /tmp/
    gunzip /tmp/$BACKUP_FILE
    
    # Scale down Redis
    kubectl scale deployment redis-primary --replicas=0 -n $NAMESPACE
    kubectl wait --for=delete pod -l app=redis,component=primary -n $NAMESPACE --timeout=300s
    
    # Copy backup to Redis data volume
    kubectl cp /tmp/${BACKUP_FILE%.gz} $NAMESPACE/redis-primary:/data/dump.rdb
    
    # Scale Redis back up
    kubectl scale deployment redis-primary --replicas=1 -n $NAMESPACE
    kubectl wait --for=condition=available deployment/redis-primary -n $NAMESPACE --timeout=300s
    
    # Clean up
    rm /tmp/${BACKUP_FILE%.gz}
    
    log "Redis recovery completed successfully"
}

# Kubernetes resources recovery using Velero
recover_k8s_resources() {
    local backup_name=$1
    log "Starting Kubernetes resources recovery from backup: $backup_name"
    
    # Check if backup exists
    if ! velero backup get $backup_name &> /dev/null; then
        error_exit "Backup not found: $backup_name"
    fi
    
    # Create restore
    RESTORE_NAME="restore-$(date +%Y%m%d%H%M%S)"
    velero restore create $RESTORE_NAME --from-backup $backup_name \
        --namespace-mappings asi-chain:asi-chain-restored
    
    # Wait for restore to complete
    log "Waiting for restore to complete..."
    while [[ $(velero restore get $RESTORE_NAME -o jsonpath='{.status.phase}') != "Completed" ]]; do
        sleep 10
        PHASE=$(velero restore get $RESTORE_NAME -o jsonpath='{.status.phase}')
        log "Restore phase: $PHASE"
        
        if [[ "$PHASE" == "Failed" ]]; then
            error_exit "Restore failed: $RESTORE_NAME"
        fi
    done
    
    log "Kubernetes resources recovery completed: $RESTORE_NAME"
}

# Full disaster recovery
full_recovery() {
    local backup_date=$1
    local k8s_backup_name=${2:-""}
    
    log "Starting FULL disaster recovery for date: $backup_date"
    
    # Recover Kubernetes resources first if backup name provided
    if [[ -n "$k8s_backup_name" ]]; then
        recover_k8s_resources "$k8s_backup_name"
    fi
    
    # Recover database
    recover_database "$backup_date"
    
    # Recover Redis
    recover_redis "$backup_date"
    
    # Wait for all services to stabilize
    log "Waiting for all services to stabilize..."
    sleep 60
    
    # Health check
    health_check
    
    log "FULL disaster recovery completed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check all deployments are ready
    DEPLOYMENTS=(asi-wallet asi-explorer asi-indexer hasura postgres-primary redis-primary)
    
    for deployment in "${DEPLOYMENTS[@]}"; do
        if ! kubectl wait --for=condition=available deployment/$deployment -n $NAMESPACE --timeout=300s; then
            error_exit "Deployment $deployment is not ready"
        fi
        log "✓ $deployment is healthy"
    done
    
    # Check service endpoints
    log "Checking service endpoints..."
    
    # Test database connection
    if kubectl exec -n $NAMESPACE postgres-primary-0 -- pg_isready -U indexer -d asichain; then
        log "✓ Database is responding"
    else
        log "⚠ Database health check failed"
    fi
    
    # Test Redis connection
    if kubectl exec -n $NAMESPACE deployment/redis-primary -- redis-cli ping | grep -q PONG; then
        log "✓ Redis is responding"
    else
        log "⚠ Redis health check failed"
    fi
    
    log "Health check completed"
}

# Show usage
usage() {
    cat << EOF
ASI Chain Disaster Recovery Script

Usage:
    $0 [COMMAND] [OPTIONS]

Commands:
    check               - Check prerequisites and system health
    recover-db DATE     - Recover database from backup (format: YYYY/MM/DD)
    recover-redis DATE  - Recover Redis from backup (format: YYYY/MM/DD)
    recover-k8s NAME    - Recover Kubernetes resources from Velero backup
    full-recovery DATE [K8S_BACKUP] - Full disaster recovery
    health              - Perform health check

Examples:
    $0 check
    $0 recover-db 2024/08/14
    $0 recover-redis 2024/08/14
    $0 recover-k8s asi-chain-daily-backup-20240814010000
    $0 full-recovery 2024/08/14 asi-chain-daily-backup-20240814010000
    $0 health

EOF
}

# Main script logic
main() {
    case "${1:-}" in
        check)
            check_prerequisites
            health_check
            ;;
        recover-db)
            [[ $# -lt 2 ]] && { usage; exit 1; }
            check_prerequisites
            recover_database "$2"
            ;;
        recover-redis)
            [[ $# -lt 2 ]] && { usage; exit 1; }
            check_prerequisites
            recover_redis "$2"
            ;;
        recover-k8s)
            [[ $# -lt 2 ]] && { usage; exit 1; }
            check_prerequisites
            recover_k8s_resources "$2"
            ;;
        full-recovery)
            [[ $# -lt 2 ]] && { usage; exit 1; }
            check_prerequisites
            full_recovery "$2" "${3:-}"
            ;;
        health)
            check_prerequisites
            health_check
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
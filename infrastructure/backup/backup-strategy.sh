#!/bin/bash

# ASI Chain Backup and Recovery Strategy
# Production-grade backup solution with multiple redundancy levels

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/asi-chain"
S3_BUCKET="s3://asi-chain-backups"
RETENTION_DAYS=30
POSTGRES_HOST="postgres"
POSTGRES_USER="asichain"
POSTGRES_DB="asichain"
REDIS_HOST="redis"
BLOCKCHAIN_DATA="/var/lib/asi-chain"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="asi-chain-backup-${TIMESTAMP}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a ${BACKUP_DIR}/backup.log
}

# Create backup directories
init_backup_dirs() {
    mkdir -p ${BACKUP_DIR}/{database,blockchain,configs,keys,redis,wallets}
    log "INFO: Backup directories initialized"
}

# Backup PostgreSQL Database
backup_postgres() {
    log "INFO: Starting PostgreSQL backup..."
    
    # Full database dump
    PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
        -h ${POSTGRES_HOST} \
        -U ${POSTGRES_USER} \
        -d ${POSTGRES_DB} \
        --format=custom \
        --verbose \
        --file=${BACKUP_DIR}/database/${BACKUP_PREFIX}-postgres.dump
    
    # Also create SQL format for portability
    PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
        -h ${POSTGRES_HOST} \
        -U ${POSTGRES_USER} \
        -d ${POSTGRES_DB} \
        --format=plain \
        --verbose \
        --file=${BACKUP_DIR}/database/${BACKUP_PREFIX}-postgres.sql
    
    # Compress SQL backup
    gzip ${BACKUP_DIR}/database/${BACKUP_PREFIX}-postgres.sql
    
    log "INFO: PostgreSQL backup completed"
}

# Backup Redis Data
backup_redis() {
    log "INFO: Starting Redis backup..."
    
    # Trigger Redis BGSAVE
    redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} BGSAVE
    
    # Wait for background save to complete
    while [ $(redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LASTSAVE) -eq $(redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} LASTSAVE) ]; do
        sleep 1
    done
    
    # Copy dump file
    docker cp asi-redis:/data/dump.rdb ${BACKUP_DIR}/redis/${BACKUP_PREFIX}-redis.rdb
    
    log "INFO: Redis backup completed"
}

# Backup Blockchain Data
backup_blockchain() {
    log "INFO: Starting blockchain data backup..."
    
    # Stop validator nodes gracefully
    docker-compose -f infrastructure/validator-nodes/docker-compose.validators.yml stop
    
    # Create snapshot of blockchain data
    for i in {1..4}; do
        tar -czf ${BACKUP_DIR}/blockchain/${BACKUP_PREFIX}-validator${i}.tar.gz \
            -C ${BLOCKCHAIN_DATA} validator${i}-data/
    done
    
    # Restart validator nodes
    docker-compose -f infrastructure/validator-nodes/docker-compose.validators.yml start
    
    log "INFO: Blockchain data backup completed"
}

# Backup Configuration Files
backup_configs() {
    log "INFO: Starting configuration backup..."
    
    tar -czf ${BACKUP_DIR}/configs/${BACKUP_PREFIX}-configs.tar.gz \
        infrastructure/validator-nodes/genesis.json \
        infrastructure/validator-nodes/haproxy.cfg \
        infrastructure/monitoring/prometheus.yml \
        infrastructure/monitoring/alertmanager.yml \
        infrastructure/monitoring/alerts.yml \
        docker-compose.yml \
        .env.production
    
    log "INFO: Configuration backup completed"
}

# Backup Wallet Keys (Encrypted)
backup_wallet_keys() {
    log "INFO: Starting wallet keys backup..."
    
    # Encrypt sensitive keystore data
    tar -czf - infrastructure/validator-nodes/keystore/ | \
        openssl enc -aes-256-cbc -salt -pass pass:${ENCRYPTION_KEY} \
        -out ${BACKUP_DIR}/keys/${BACKUP_PREFIX}-keystore.tar.gz.enc
    
    log "INFO: Wallet keys backup completed (encrypted)"
}

# Upload to S3
upload_to_s3() {
    log "INFO: Uploading backups to S3..."
    
    aws s3 sync ${BACKUP_DIR}/ ${S3_BUCKET}/${TIMESTAMP}/ \
        --exclude "*.log" \
        --storage-class GLACIER_IR
    
    # Keep recent backups in STANDARD storage
    aws s3 sync ${BACKUP_DIR}/ ${S3_BUCKET}/latest/ \
        --exclude "*.log" \
        --delete
    
    log "INFO: S3 upload completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO: Cleaning up old backups..."
    
    # Local cleanup
    find ${BACKUP_DIR} -type f -mtime +${RETENTION_DAYS} -delete
    
    # S3 cleanup
    aws s3 ls ${S3_BUCKET}/ | while read -r line; do
        createDate=$(echo $line | awk '{print $1" "$2}')
        createDate=$(date -d "$createDate" +%s)
        olderThan=$(date -d "${RETENTION_DAYS} days ago" +%s)
        if [[ $createDate -lt $olderThan ]]; then
            folder=$(echo $line | awk '{print $4}')
            if [[ $folder != "latest/" ]]; then
                aws s3 rm --recursive ${S3_BUCKET}/${folder}
            fi
        fi
    done
    
    log "INFO: Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    log "INFO: Verifying backup integrity..."
    
    # Test PostgreSQL backup
    pg_restore --list ${BACKUP_DIR}/database/${BACKUP_PREFIX}-postgres.dump > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log "INFO: PostgreSQL backup verified successfully"
    else
        log "ERROR: PostgreSQL backup verification failed"
        exit 1
    fi
    
    # Test tar archives
    for archive in ${BACKUP_DIR}/*/*.tar.gz; do
        tar -tzf $archive > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            log "INFO: Archive $archive verified successfully"
        else
            log "ERROR: Archive $archive verification failed"
            exit 1
        fi
    done
    
    log "INFO: Backup verification completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Backup ${status}: ${message}\"}" \
        ${SLACK_WEBHOOK_URL}
    
    # Email notification
    echo "${message}" | mail -s "ASI Chain Backup ${status}" ${ADMIN_EMAIL}
}

# Recovery function
recover_from_backup() {
    local backup_timestamp=$1
    
    log "INFO: Starting recovery from backup ${backup_timestamp}..."
    
    # Download from S3 if needed
    if [ ! -d "${BACKUP_DIR}/${backup_timestamp}" ]; then
        aws s3 sync ${S3_BUCKET}/${backup_timestamp}/ ${BACKUP_DIR}/${backup_timestamp}/
    fi
    
    # Restore PostgreSQL
    PGPASSWORD=${POSTGRES_PASSWORD} pg_restore \
        -h ${POSTGRES_HOST} \
        -U ${POSTGRES_USER} \
        -d ${POSTGRES_DB} \
        --clean \
        --verbose \
        ${BACKUP_DIR}/${backup_timestamp}/database/*-postgres.dump
    
    # Restore Redis
    docker cp ${BACKUP_DIR}/${backup_timestamp}/redis/*-redis.rdb asi-redis:/data/dump.rdb
    docker restart asi-redis
    
    # Restore blockchain data
    docker-compose -f infrastructure/validator-nodes/docker-compose.validators.yml stop
    
    for i in {1..4}; do
        tar -xzf ${BACKUP_DIR}/${backup_timestamp}/blockchain/*-validator${i}.tar.gz \
            -C ${BLOCKCHAIN_DATA}
    done
    
    docker-compose -f infrastructure/validator-nodes/docker-compose.validators.yml start
    
    log "INFO: Recovery completed"
}

# Main execution
main() {
    case ${1:-backup} in
        backup)
            init_backup_dirs
            backup_postgres
            backup_redis
            backup_blockchain
            backup_configs
            backup_wallet_keys
            upload_to_s3
            verify_backup
            cleanup_old_backups
            send_notification "SUCCESS" "Backup completed successfully at ${TIMESTAMP}"
            ;;
        recover)
            if [ -z "${2:-}" ]; then
                echo "Usage: $0 recover <backup_timestamp>"
                exit 1
            fi
            recover_from_backup $2
            send_notification "SUCCESS" "Recovery completed from backup $2"
            ;;
        verify)
            verify_backup
            ;;
        *)
            echo "Usage: $0 {backup|recover|verify}"
            exit 1
            ;;
    esac
}

# Error handling
trap 'send_notification "FAILURE" "Backup failed with error at line $LINENO"' ERR

# Run main function
main "$@"
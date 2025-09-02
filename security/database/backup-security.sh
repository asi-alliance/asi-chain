#!/bin/bash
# ASI Chain Database Backup with Encryption
# This script creates encrypted backups of the ASI Chain database

set -euo pipefail

# Configuration
BACKUP_DIR=${BACKUP_DIR:-/var/backups/asichain}
RETENTION_DAYS=${RETENTION_DAYS:-30}
DATABASE_NAME=${DATABASE_NAME:-asichain}
DATABASE_USER=${DATABASE_USER:-asi_backup}
ENCRYPTION_KEY_FILE=${ENCRYPTION_KEY_FILE:-/etc/ssl/private/backup.key}
COMPRESSION_LEVEL=${COMPRESSION_LEVEL:-9}

# AWS S3 Configuration (optional)
S3_BUCKET=${S3_BUCKET:-""}
AWS_REGION=${AWS_REGION:-us-east-1}

# Logging
LOG_FILE="/var/log/asichain/backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Verify prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if PostgreSQL client is available
    if ! command -v pg_dump >/dev/null 2>&1; then
        error_exit "pg_dump not found. Please install PostgreSQL client."
    fi
    
    # Check if OpenSSL is available for encryption
    if ! command -v openssl >/dev/null 2>&1; then
        error_exit "openssl not found. Please install OpenSSL."
    fi
    
    # Check if gzip is available for compression
    if ! command -v gzip >/dev/null 2>&1; then
        error_exit "gzip not found. Please install gzip."
    fi
    
    # Check backup directory
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
    fi
    
    # Check encryption key file
    if [[ ! -f "$ENCRYPTION_KEY_FILE" ]]; then
        log "Generating new encryption key..."
        openssl rand -out "$ENCRYPTION_KEY_FILE" 32
        chmod 600 "$ENCRYPTION_KEY_FILE"
        log "Encryption key generated: $ENCRYPTION_KEY_FILE"
    fi
    
    log "Prerequisites check completed successfully"
}

# Generate backup filename
generate_backup_filename() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    echo "${DATABASE_NAME}_backup_${timestamp}.sql.gz.enc"
}

# Create encrypted database backup
create_backup() {
    local backup_file="$1"
    local temp_sql_file="${backup_file%.gz.enc}"
    local temp_gz_file="${backup_file%.enc}"
    
    log "Starting backup of database: $DATABASE_NAME"
    
    # Create SQL dump
    log "Creating SQL dump..."
    if ! pg_dump \
        --username="$DATABASE_USER" \
        --host=localhost \
        --port=5432 \
        --dbname="$DATABASE_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --encoding=UTF8 \
        --no-password \
        --file="$temp_sql_file"; then
        error_exit "Failed to create SQL dump"
    fi
    
    # Compress the dump
    log "Compressing backup..."
    if ! gzip -"$COMPRESSION_LEVEL" "$temp_sql_file"; then
        error_exit "Failed to compress backup"
    fi
    
    # Encrypt the compressed backup
    log "Encrypting backup..."
    if ! openssl enc -aes-256-cbc \
        -salt \
        -in "$temp_gz_file" \
        -out "$backup_file" \
        -pass file:"$ENCRYPTION_KEY_FILE"; then
        error_exit "Failed to encrypt backup"
    fi
    
    # Remove temporary files
    rm -f "$temp_gz_file"
    
    # Verify backup file
    if [[ ! -f "$backup_file" ]]; then
        error_exit "Backup file not created: $backup_file"
    fi
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    log "Backup created successfully: $backup_file (Size: $backup_size)"
}

# Upload backup to S3 (optional)
upload_to_s3() {
    local backup_file="$1"
    
    if [[ -z "$S3_BUCKET" ]]; then
        log "S3 backup not configured, skipping upload"
        return 0
    fi
    
    log "Uploading backup to S3..."
    
    if ! aws s3 cp "$backup_file" "s3://$S3_BUCKET/backups/database/" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256; then
        log "WARNING: Failed to upload backup to S3"
        return 1
    fi
    
    log "Backup uploaded to S3 successfully"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "${DATABASE_NAME}_backup_*.sql.gz.enc" \
        -type f -mtime +$RETENTION_DAYS -delete
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "backups/database/" \
            --query "Contents[?LastModified<='$cutoff_date'].Key" \
            --output text | \
        while read -r key; do
            if [[ -n "$key" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
                log "Deleted old S3 backup: $key"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Test decryption
    local test_file="${backup_file}.test"
    if ! openssl enc -aes-256-cbc -d \
        -in "$backup_file" \
        -out "$test_file" \
        -pass file:"$ENCRYPTION_KEY_FILE"; then
        error_exit "Backup verification failed: cannot decrypt"
    fi
    
    # Test decompression
    if ! gzip -t "$test_file"; then
        rm -f "$test_file"
        error_exit "Backup verification failed: corrupted compression"
    fi
    
    # Clean up test file
    rm -f "$test_file"
    
    log "Backup verification successful"
}

# Calculate backup checksum
calculate_checksum() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    
    log "Calculating backup checksum..."
    
    if ! sha256sum "$backup_file" > "$checksum_file"; then
        log "WARNING: Failed to calculate checksum"
        return 1
    fi
    
    log "Checksum saved to: $checksum_file"
}

# Send notification (implement based on your notification system)
send_notification() {
    local status="$1"
    local message="$2"
    
    # Example: Send to a webhook or email service
    # curl -X POST "YOUR_WEBHOOK_URL" \
    #      -H "Content-Type: application/json" \
    #      -d "{\"status\":\"$status\",\"message\":\"$message\"}"
    
    log "Notification: $status - $message"
}

# Main execution
main() {
    log "Starting ASI Chain database backup process"
    
    # Check prerequisites
    check_prerequisites
    
    # Generate backup filename
    local backup_filename=$(generate_backup_filename)
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    # Create backup
    if create_backup "$backup_path"; then
        verify_backup "$backup_path"
        calculate_checksum "$backup_path"
        upload_to_s3 "$backup_path"
        cleanup_old_backups
        
        local backup_size=$(du -h "$backup_path" | cut -f1)
        send_notification "SUCCESS" "Backup completed: $backup_filename (Size: $backup_size)"
        log "Backup process completed successfully"
    else
        send_notification "FAILED" "Backup process failed"
        error_exit "Backup process failed"
    fi
}

# Signal handlers for cleanup
trap 'log "Backup interrupted by signal"; exit 1' INT TERM

# Run main function
main "$@"
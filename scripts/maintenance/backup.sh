#\!/bin/bash
# Automated backup script

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Docker volumes
echo "Backing up Docker volumes..."
docker run --rm -v docker_prometheus-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/prometheus-$DATE.tar.gz -C /data .
docker run --rm -v docker_grafana-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/grafana-$DATE.tar.gz -C /data .

# Backup configurations
echo "Backing up configurations..."
tar czf $BACKUP_DIR/configs-$DATE.tar.gz \
  /home/ubuntu/f1r3fly/docker/*.yml \
  /home/ubuntu/f1r3fly/docker/.env \
  /home/ubuntu/f1r3fly/docker/autopropose/config.yml \
  2>/dev/null

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR"
ls -lh $BACKUP_DIR/*.tar.gz | tail -5

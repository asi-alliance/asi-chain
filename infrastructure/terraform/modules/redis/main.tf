# Redis Module for ASI Chain
# Creates ElastiCache Redis cluster with replication

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Random auth token for Redis
resource "random_password" "redis_auth" {
  length  = 32
  special = false  # Redis auth tokens don't support special characters
}

# Subnet Group for ElastiCache
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-redis-subnet-group"
  subnet_ids = var.subnet_ids
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project}-${var.environment}-redis-subnet-group"
    }
  )
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "${var.project}-${var.environment}-redis-"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "Redis access from application"
  }
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "Redis access from allowed CIDR blocks"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project}-${var.environment}-redis-sg"
    }
  )
  
  lifecycle {
    create_before_destroy = true
  }
}

# Parameter Group for Redis
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project}-${var.environment}-redis-params"
  family = var.parameter_group_family
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
  
  parameter {
    name  = "tcp-backlog"
    value = "511"
  }
  
  parameter {
    name  = "databases"
    value = "16"
  }
  
  parameter {
    name  = "activedefrag"
    value = "yes"
  }
  
  parameter {
    name  = "active-defrag-ignore-bytes"
    value = "104857600"
  }
  
  parameter {
    name  = "active-defrag-threshold-lower"
    value = "10"
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project}-${var.environment}-redis-params"
    }
  )
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis" {
  count = var.enable_logs ? 1 : 0
  
  name              = "/aws/elasticache/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days
  
  tags = var.tags
}

# ElastiCache Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project}-${var.environment}"
  description                = "Redis cluster for ${var.project} ${var.environment}"
  
  # Engine
  engine               = "redis"
  engine_version       = var.engine_version
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  
  # Nodes
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled          = var.multi_az_enabled
  
  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                = var.transit_encryption_enabled ? random_password.redis_auth.result : null
  
  # Backup
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window         = var.snapshot_window
  
  # Maintenance
  maintenance_window = var.maintenance_window
  auto_minor_version_upgrade = false
  
  # Notifications
  notification_topic_arn = var.notification_topic_arn
  
  # Logs
  dynamic "log_delivery_configuration" {
    for_each = var.enable_logs ? ["slow-log", "engine-log"] : []
    content {
      destination      = aws_cloudwatch_log_group.redis[0].name
      destination_type = "cloudwatch-logs"
      log_format       = "json"
      log_type        = log_delivery_configuration.value
    }
  }
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project}-${var.environment}-redis"
    }
  )
  
  apply_immediately = false
  
  lifecycle {
    ignore_changes = [auth_token]
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.project}-${var.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alarm_cpu_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.project}-${var.environment}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alarm_memory_threshold
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_evictions" {
  alarm_name          = "${var.project}-${var.environment}-redis-high-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.alarm_evictions_threshold
  alarm_description   = "This metric monitors Redis evictions"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_connections" {
  alarm_name          = "${var.project}-${var.environment}-redis-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.alarm_connections_threshold
  alarm_description   = "This metric monitors Redis connection count"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }
  
  tags = var.tags
}

# Store auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  count = var.transit_encryption_enabled ? 1 : 0
  
  name = "${var.project}-${var.environment}-redis-auth"
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project}-${var.environment}-redis-auth"
    }
  )
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  count = var.transit_encryption_enabled ? 1 : 0
  
  secret_id = aws_secretsmanager_secret.redis_auth[0].id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    endpoint   = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = 6379
  })
}

# Outputs
output "replication_group_id" {
  value = aws_elasticache_replication_group.redis.id
}

output "primary_endpoint_address" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "reader_endpoint_address" {
  value = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "member_clusters" {
  value = aws_elasticache_replication_group.redis.member_clusters
}

output "auth_token_secret_arn" {
  value = var.transit_encryption_enabled ? aws_secretsmanager_secret.redis_auth[0].arn : null
}

output "security_group_id" {
  value = aws_security_group.redis.id
}

output "port" {
  value = 6379
}
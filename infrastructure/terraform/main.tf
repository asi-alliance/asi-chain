# ASI Chain Infrastructure - Terraform Configuration
# Multi-cloud ready (AWS, GCP, Azure)

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    bucket = "asi-chain-terraform-state"
    key    = "testnet/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "ASI-Chain"
      ManagedBy   = "Terraform"
      CostCenter  = "Blockchain"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "testnet"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "asi-chain-${var.environment}"
  cidr = "10.0.0.0/16"
  
  azs             = var.availability_zones
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true
  
  tags = {
    "kubernetes.io/cluster/asi-chain-${var.environment}" = "shared"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "19.0.0"
  
  cluster_name    = "asi-chain-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  enable_irsa = true
  
  eks_managed_node_groups = {
    validators = {
      min_size     = 4
      max_size     = 8
      desired_size = 4
      
      instance_types = ["m5.2xlarge"]
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "validator"
      }
      
      taints = [{
        key    = "validator"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
    
    general = {
      min_size     = 3
      max_size     = 10
      desired_size = 5
      
      instance_types = ["m5.xlarge"]
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "general"
      }
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "asi-chain-${var.environment}-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type         = "gp3"
  iops                 = 3000
  
  db_name  = "asichain"
  username = "asichain"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "asi-chain-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = {
    Name = "asi-chain-${var.environment}-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "asi-chain-${var.environment}"
  replication_group_description = "Redis cluster for ASI Chain ${var.environment}"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = "cache.r6g.xlarge"
  number_cache_clusters = 3
  
  port = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:05:00-sun:07:00"
  
  notification_topic_arn = aws_sns_topic.alerts.arn
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type        = "slow-log"
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-redis"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "backups" {
  bucket = "asi-chain-${var.environment}-backups"
  
  lifecycle_rule {
    enabled = true
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  versioning {
    enabled = true
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-backups"
  }
}

# Load Balancer
resource "aws_lb" "main" {
  name               = "asi-chain-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  access_logs {
    bucket  = aws_s3_bucket.lb_logs.bucket
    enabled = true
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-alb"
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "ASI Chain ${var.environment} CDN"
  default_root_object = "index.html"
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.id}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.main.id}"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  price_class = "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  web_acl_id = aws_wafv2_web_acl.main.arn
  
  tags = {
    Name = "asi-chain-${var.environment}-cdn"
  }
}

# WAF Configuration
resource "aws_wafv2_web_acl" "main" {
  name  = "asi-chain-${var.environment}-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "asi-chain-waf"
    sampled_requests_enabled   = true
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-waf"
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "validator_keys" {
  name = "asi-chain-${var.environment}-validator-keys"
  
  rotation_rules {
    automatically_after_days = 90
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-validator-keys"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/asi-chain/${var.environment}"
  retention_in_days = 30
  
  tags = {
    Name = "asi-chain-${var.environment}-logs"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "asi-chain-${var.environment}-alerts"
  
  tags = {
    Name = "asi-chain-${var.environment}-alerts"
  }
}

# Route53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = "asi-chain.com"
  
  tags = {
    Name = "asi-chain-${var.environment}"
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "*.asi-chain.com"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "asi-chain.com",
    "*.testnet.asi-chain.com"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name = "asi-chain-${var.environment}-cert"
  }
}

# Outputs
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "load_balancer_dns" {
  value = aws_lb.main.dns_name
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}
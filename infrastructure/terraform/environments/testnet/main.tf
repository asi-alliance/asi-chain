# ASI Chain Testnet Infrastructure
# Main configuration for production deployment

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "s3" {
    bucket         = "asi-chain-testnet-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "asi-chain-testnet-terraform-lock"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = local.common_tags
  }
}

# Data Sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local Variables
locals {
  project     = "asi-chain"
  environment = "testnet"
  
  common_tags = {
    Environment = local.environment
    Project     = local.project
    ManagedBy   = "Terraform"
    CostCenter  = "Blockchain"
    Owner       = "web3guru888"
    LaunchDate  = "2025-08-31"
  }
  
  vpc_cidr = "10.0.0.0/16"
  
  public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  database_subnet_cidrs = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
  
  domain_name = "asi-chain.io"
  
  # Budget limit per web3guru888
  monthly_budget = 5000
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"
  
  project               = local.project
  environment          = local.environment
  aws_region           = var.aws_region
  vpc_cidr             = local.vpc_cidr
  public_subnet_cidrs  = local.public_subnet_cidrs
  private_subnet_cidrs = local.private_subnet_cidrs
  database_subnet_cidrs = local.database_subnet_cidrs
  enable_nat_gateway   = true
  enable_flow_logs     = true
  flow_log_retention_days = 30
  tags                 = local.common_tags
}

# EKS Module
module "eks" {
  source = "../../modules/eks"
  
  project                     = local.project
  environment                = local.environment
  aws_region                 = var.aws_region
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  public_subnet_ids          = module.vpc.public_subnet_ids
  kubernetes_version         = "1.28"
  
  # Validator nodes
  validator_nodes_min_size    = 4
  validator_nodes_desired_size = 4
  validator_nodes_max_size    = 8
  validator_instance_types    = ["m5.2xlarge"]
  
  # General nodes
  general_nodes_min_size      = 3
  general_nodes_desired_size  = 5
  general_nodes_max_size      = 10
  general_instance_types      = ["m5.xlarge"]
  
  node_disk_size              = 100
  cluster_log_retention_days  = 30
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]  # Restrict in production
  
  tags = local.common_tags
}

# RDS PostgreSQL Module
module "rds" {
  source = "../../modules/rds"
  
  project                 = local.project
  environment            = local.environment
  vpc_id                 = module.vpc.vpc_id
  database_subnet_ids    = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]
  allowed_cidr_blocks    = []
  
  engine_version         = "15.4"
  instance_class         = "db.r6g.xlarge"
  allocated_storage      = 100
  max_allocated_storage  = 1000
  iops                  = 3000
  storage_throughput    = 125
  
  database_name         = "asichain"
  master_username       = "asichain_admin"
  max_connections       = "500"
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az              = true
  deletion_protection   = true
  
  performance_insights_enabled  = true
  enhanced_monitoring_interval  = 60
  
  create_read_replica           = true
  read_replica_instance_class   = "db.r6g.large"
  
  alarm_cpu_threshold        = 75
  alarm_storage_threshold    = 20  # GB
  alarm_connections_threshold = 400
  alarm_sns_topic_arn       = aws_sns_topic.alerts.arn
  
  tags = local.common_tags
}

# ElastiCache Redis Module
module "redis" {
  source = "../../modules/redis"
  
  project                 = local.project
  environment            = local.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]
  allowed_cidr_blocks    = []
  
  engine_version         = "7.0"
  parameter_group_family = "redis7"
  node_type             = "cache.r6g.xlarge"
  num_cache_clusters    = 3
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  enable_logs            = true
  log_retention_days     = 30
  
  alarm_cpu_threshold        = 75
  alarm_memory_threshold     = 85
  alarm_evictions_threshold  = 1000
  alarm_connections_threshold = 1000
  alarm_sns_topic_arn       = aws_sns_topic.alerts.arn
  notification_topic_arn    = aws_sns_topic.alerts.arn
  
  tags = local.common_tags
}

# S3 Buckets
resource "aws_s3_bucket" "backups" {
  bucket = "${local.project}-${local.environment}-backups"
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-backups"
    }
  )
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  
  rule {
    id     = "transition-old-backups"
    status = "Enabled"
    
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
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${local.project}-${local.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnet_ids
  
  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-alb"
    }
  )
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${local.project}-${local.environment}-alb-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-alb-sg"
    }
  )
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.project}-${local.environment}-alerts"
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-alerts"
    }
  )
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/${local.project}/${local.environment}"
  retention_in_days = 30
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-logs"
    }
  )
}

# Route53 Hosted Zone (will need to be imported if already exists)
resource "aws_route53_zone" "main" {
  name = "${local.environment}.${local.domain_name}"
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.environment}.${local.domain_name}"
    }
  )
}

# ACM Certificate for SSL
resource "aws_acm_certificate" "main" {
  domain_name       = "*.${local.environment}.${local.domain_name}"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "${local.environment}.${local.domain_name}",
    "*.${local.environment}.${local.domain_name}"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-cert"
    }
  )
}

# Certificate Validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Secrets Manager for Application Secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${local.project}-${local.environment}-app-secrets"
  
  rotation_rules {
    automatically_after_days = 90
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-app-secrets"
    }
  )
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  provider = aws.us-east-1  # WAF for CloudFront must be in us-east-1
  
  name  = "${local.project}-${local.environment}-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
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
  
  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${local.project}-${local.environment}-waf"
    sampled_requests_enabled   = true
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-waf"
    }
  )
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "ASI Chain ${local.environment} CDN"
  default_root_object = "index.html"
  aliases            = ["${local.environment}.${local.domain_name}", "*.${local.environment}.${local.domain_name}"]
  
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
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }
  
  web_acl_id = aws_wafv2_web_acl.main.arn
  
  tags = merge(
    local.common_tags,
    {
      Name = "${local.project}-${local.environment}-cdn"
    }
  )
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  value = module.redis.primary_endpoint_address
}

output "load_balancer_dns" {
  value = aws_lb.main.dns_name
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "route53_zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "certificate_arn" {
  value = aws_acm_certificate.main.arn
}
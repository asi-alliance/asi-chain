# Variables for ASI Chain Testnet Environment

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = "alerts@asi-chain.io"
}

# Provider alias for us-east-1 (required for CloudFront WAF)
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}
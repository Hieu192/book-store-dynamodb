# Dev Environment Variables

variable "aws_region" {
  description = "AWS region for dev environment"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "bookstore"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Primary domain name (leave empty to skip Route53 setup)"
  type        = string
  default     = ""  # Dev: No custom domain by default
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name (shared with backend)"
  type        = string
  default     = "BookStore"
}

variable "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID (optional for dev)"
  type        = string
  default     = ""
}

variable "cloudfront_url" {
  description = "CloudFront URL for frontend (auto-populated)"
  type        = string
  default     = ""
}

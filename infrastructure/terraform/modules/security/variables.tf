variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
}

variable "allow_cloudfront_only" {
  description = "Restrict ALB access to CloudFront IPs only (recommended for prod)"
  type        = bool
  default     = true
}

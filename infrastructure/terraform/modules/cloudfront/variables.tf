variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_versioning" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_200"  # US, Europe, Asia (not Australia, South America)
}

variable "domain_aliases" {
  description = "Domain aliases for CloudFront (e.g., example.com, www.example.com)"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1)"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name for backend API origin"
  type        = string
}

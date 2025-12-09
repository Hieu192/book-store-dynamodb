variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  description = "Primary domain name (e.g., example.com)"
  type        = string
  default     = ""
}

variable "alb_domain_name" {
  description = "ALB subdomain (e.g., api.example.com)"
  type        = string
  default     = ""
}

variable "subject_alternative_names" {
  description = "Additional domains for CloudFront cert (e.g., www.example.com)"
  type        = list(string)
  default     = []
}

variable "create_cloudfront_certificate" {
  description = "Create ACM certificate for CloudFront (requires us-east-1 provider)"
  type        = bool
  default     = false
}

variable "create_alb_certificate" {
  description = "Create ACM certificate for ALB"
  type        = bool
  default     = false
}

# CloudFront info (from cloudfront module)
variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
  default     = ""
}

variable "cloudfront_zone_id" {
  description = "CloudFront hosted zone ID (constant: Z2FDTNDATAQYW2)"
  type        = string
  default     = "Z2FDTNDATAQYW2"
}

# ALB info (from alb module)
variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = ""
}

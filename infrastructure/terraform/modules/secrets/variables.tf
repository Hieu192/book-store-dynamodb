variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "recovery_window_in_days" {
  description = "Number of days to retain secret after deletion (7-30)"
  type        = number
  default     = 7
}

# Secret values (optional - can be set manually via AWS console)
# For security, it's recommended to set these via AWS console or CI/CD
# instead of committing them to terraform.tfvars

variable "jwt_secret_value" {
  description = "JWT secret value (leave empty to set manually)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_uri_value" {
  description = "Database URI (leave empty to set manually)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_access_key_value" {
  description = "AWS Access Key ID (leave empty to set manually)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_secret_key_value" {
  description = "AWS Secret Access Key (leave empty to set manually)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "s3_bucket_value" {
  description = "S3 bucket name (can be auto-populated from S3 module)"
  type        = string
  default     = ""
}

variable "cloudfront_url_value" {
  description = "CloudFront URL (can be auto-populated from CloudFront module)"
  type        = string
  default     = ""
}

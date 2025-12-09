variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "bookstore"
}

variable "dynamodb_table_name" {
  description = "Existing DynamoDB table name"
  type        = string
  default     = "BookStore"
}

variable "jwt_secret_name" {
  description = "Existing JWT secret name in Secrets Manager"
  type        = string
  default     = "bookstore/dev/jwt-secret"  # Fixed: actual secret name
}

variable "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID (leave empty initially, update after creating KB)"
  type        = string
  default     = ""
}

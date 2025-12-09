variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name (shared with backend)"
  type        = string
}

variable "jwt_secret_name" {
  description = "Secrets Manager secret name for JWT (e.g., bookstore/dev/jwt-secret)"
  type        = string
}

variable "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID (create manually in AWS Console first)"
  type        = string
  default     = ""
}

variable "lambda_source_dir" {
  description = "Path to Lambda source code directory"
  type        = string
  default     = "../../../../chatbot/lambda"
}

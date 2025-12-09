variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "secret_arns" {
  description = "List of Secrets Manager secret ARNs for ECS task execution role"
  type        = list(string)
  default     = []
}

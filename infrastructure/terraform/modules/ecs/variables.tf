variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

# Cluster
variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true
}

# Task Definition
variable "task_cpu" {
  description = "CPU units for task (256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Memory (MB) for task"
  type        = string
  default     = "1024"
}

variable "backend_image" {
  description = "Docker image for backend (ECR URL:tag)"
  type        = string
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 4000
}

variable "node_env" {
  description = "NODE_ENV value"
  type        = string
  default     = "production"
}

variable "frontend_url" {
  description = "Frontend URL for CORS"
  type        = string
}

variable "redis_host" {
  description = "Redis endpoint"
  type        = string
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "secret_arns" {
  description = "List of secret ARNs for container (DB_URI, JWT_SECRET, etc.)"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "log_group_name" {
  description = "CloudWatch log group name (auto-generated if not set)"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# IAM Roles
variable "execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

# Service
variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = true
}

# Auto Scaling
variable "enable_auto_scaling" {
  description = "Enable auto-scaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 4
}

variable "cpu_target_value" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "memory_target_value" {
  description = "Target memory utilization for auto-scaling"
  type        = number
  default     = 80
}

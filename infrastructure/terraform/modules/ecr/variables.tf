variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "force_delete" {
  description = "Force delete repository with images (useful for dev)"
  type        = bool
  default     = false
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "image_count_limit" {
  description = "Number of images to keep (older images will be deleted)"
  type        = number
  default     = 10
}

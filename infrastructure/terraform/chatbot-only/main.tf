# Chatbot Standalone Deployment
# Only deploys chatbot infrastructure (Lambda + API Gateway + S3 KB)
# Assumes: DynamoDB table and Secrets Manager already exist

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "production"
      ManagedBy   = "Terraform"
      Component   = "Chatbot"
    }
  }
}

# Use chatbot module
module "chatbot" {
  source = "../modules/chatbot"
  
  project_name         = var.project_name
  environment          = "production"  # Using existing production resources
  dynamodb_table_name  = var.dynamodb_table_name
  jwt_secret_name      = var.jwt_secret_name
  knowledge_base_id    = var.knowledge_base_id
  lambda_source_dir    = "../../../chatbot/lambda"
}

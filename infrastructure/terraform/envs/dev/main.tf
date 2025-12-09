# Dev Environment - Main Configuration
# This file composes all modules for development environment

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary provider (ap-southeast-1)
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "dev"
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# Secondary provider for CloudFront certificates (us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = "dev"
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================================================
# MODULE 1: NETWORK
# ============================================================================

module "network" {
  source = "../../modules/network"
  
  project_name       = var.project_name
  environment        = "dev"
  vpc_cidr           = var.vpc_cidr
  enable_nat_gateway = true  # ✅ REQUIRED for ECS tasks to access ECR, DynamoDB, Secrets Manager
  
  tags = {
    CostCenter = "Development"
  }
}

# NOTE: NAT Gateway costs ~$32/month but is REQUIRED for private subnets
# Without NAT:
# - ECS tasks cannot pull Docker images from ECR
# - Cannot access DynamoDB, Secrets Manager, S3
# - Tasks will fail to start
#
# To save cost in dev, you can:
# 1. Deploy ECS in public subnets (less secure, not recommended)
# 2. Stop/scale down ECS when not in use
# 3. Use VPC Endpoints (complex, similar cost)

# ============================================================================
# MODULE 2: SECURITY GROUPS
# ============================================================================

module "security" {
  source = "../../modules/security"
  
  project_name          = var.project_name
  environment           = "dev"
  vpc_id                = module.network.vpc_id
  allow_cloudfront_only = false  # Dev: Allow direct access for testing
}

# ============================================================================
# MODULE 3: IAM ROLES
# ============================================================================

module "iam" {
  source = "../../modules/iam"
  
  project_name = var.project_name
  environment  = "dev"
  
  # Will be populated after secrets module
  secret_arns = module.secrets.secret_arns_list
}

# ============================================================================
# MODULE 4: ECR
# ============================================================================

module "ecr" {
  source = "../../modules/ecr"
  
  project_name     = var.project_name
  environment      = "dev"
  
  # SAME AS PROD/ORIGINAL
  force_delete     = true           # Allow force delete (easier cleanup)
  scan_on_push     = true           # Enable image scanning (same as original)
  image_count_limit = 10            # Keep last 10 images (same as original)
}

# ============================================================================
# MODULE 5: ALB
# ============================================================================

module "alb" {
  source = "../../modules/alb"
  
  project_name               = var.project_name
  environment                = "dev"
  vpc_id                     = module.network.vpc_id
  public_subnet_ids          = module.network.public_subnet_ids
  alb_security_group_id      = module.security.alb_security_group_id
  certificate_arn            = module.route53.alb_certificate_arn
  backend_port               = 4000
  health_check_path          = "/health"
  enable_deletion_protection = false  # Dev: Allow easy cleanup
}

# ============================================================================
# MODULE 6: ELASTICACHE (REDIS)
# ============================================================================

module "elasticache" {
  source = "../../modules/elasticache"
  
  project_name           = var.project_name
  environment            = "dev"
  subnet_ids             = module.network.private_subnet_ids
  security_group_ids     = [module.security.redis_security_group_id]
  
  # SAME AS PROD/ORIGINAL
  node_type              = "cache.t4g.small"  # Same as original (1.5GB RAM)
  num_cache_nodes        = 1                   # Single node (same as original)
  engine_version         = "7.0"               # Same as original
  parameter_group_name   = "default.redis7"    # Same as original
  
  # Maintenance & Backup
  maintenance_window       = "sun:05:00-sun:06:00"  # Same as original
  snapshot_window          = "03:00-04:00"           # Same as original
  snapshot_retention_limit = 1                       # Same as original (1 day)
}

# ============================================================================
# MODULE 7: SECRETS MANAGER
# ============================================================================

module "secrets" {
  source = "../../modules/secrets"
  
  project_name            = var.project_name
  environment             = "dev"
  recovery_window_in_days = 7
  
  # Note: Secret values should be set manually via AWS Console or CLI
  # Or set via TF_VAR environment variables (don't commit!)
}

# ============================================================================
# MODULE 8: ECS
# ============================================================================

module "ecs" {
  source = "../../modules/ecs"
  
  project_name       = var.project_name
  environment        = "dev"
  aws_region         = var.aws_region
  
  # Task Configuration (SAME AS PROD/ORIGINAL)
  task_cpu           = "512"   # Same as original (0.5 vCPU)
  task_memory        = "1024"  # Same as original (1 GB)
  backend_image      = "${module.ecr.repository_url}:latest"
  container_port     = 4000
  node_env           = "production"  # Use production mode even in dev
  
  # Container Insights
  enable_container_insights = true  # Same as original
  
  # Environment Variables
  frontend_url   = var.cloudfront_url != "" ? var.cloudfront_url : "http://localhost:3000"
  redis_host     = module.elasticache.redis_endpoint
  redis_port     = module.elasticache.redis_port
  
  # Secrets
  secret_arns = module.secrets.secret_arns_for_ecs
  
  # IAM Roles
  execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn
  
  # Service Configuration (SAME AS PROD/ORIGINAL)
  desired_count          = 1      # Start with 1, can scale to 4
  private_subnet_ids     = module.network.private_subnet_ids
  security_group_id      = module.security.ecs_tasks_security_group_id
  target_group_arn       = module.alb.target_group_arn
  enable_execute_command = true
  
  # Auto Scaling (SAME AS PROD/ORIGINAL)
  enable_auto_scaling = true   # Enable auto-scaling
  min_capacity        = 1      # Same as original
  max_capacity        = 4      # Same as original
  cpu_target_value    = 70     # Same as original
  memory_target_value = 80     # Same as original
  
  # Logging (production retention)
  log_retention_days = 30  # Same as original (30 days)
}

# ============================================================================
# MODULE 9: CLOUDFRONT + S3
# ============================================================================

module "cloudfront" {
  source = "../../modules/cloudfront"
  
  project_name       = var.project_name
  environment        = "dev"
  
  # SAME AS PROD/ORIGINAL
  enable_versioning  = true                  # Enable versioning (same as original)
  price_class        = "PriceClass_200"      # Same as original (US, Europe, Asia)
  domain_aliases     = var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}"] : []
  certificate_arn    = module.route53.cloudfront_certificate_arn
  alb_dns_name       = module.alb.alb_dns_name
}

# ============================================================================
# MODULE 10: ROUTE53 (Optional for Dev)
# ============================================================================

module "route53" {
  source = "../../modules/route53"
  
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  
  project_name        = var.project_name
  environment         = "dev"
  domain_name         = var.domain_name  # Set to "" to disable
  alb_domain_name     = var.domain_name != "" ? "api-dev.${var.domain_name}" : ""
  
  # Only create certs if domain is specified
  create_cloudfront_certificate = var.domain_name != ""
  create_alb_certificate        = var.domain_name != ""
  
  # CloudFront info
  cloudfront_domain_name = module.cloudfront.cloudfront_domain_name
  
  # ALB info
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
}

# ============================================================================
# MODULE 11: CHATBOT (Optional)
# ============================================================================

module "chatbot" {
  source = "../../modules/chatbot"
  
  project_name         = var.project_name
  environment          = "dev"
  dynamodb_table_name  = var.dynamodb_table_name
  jwt_secret_name      = "${var.project_name}/dev/jwt-secret"
  knowledge_base_id    = var.knowledge_base_id  # Leave empty initially
  lambda_source_dir    = "../../../../chatbot/lambda"
}

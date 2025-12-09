# Terraform Infrastructure - Modular Multi-Environment Setup

## 📋 Tổng quan

Đây là hướng dẫn refactor Terraform infrastructure từ **monolithic structure** sang **modular, multi-environment structure** theo best practices.

### Cấu trúc cũ (Hiện tại)
```
infrastructure/terraform/
├── main.tf                  (11KB - VPC, ALB, ECS Cluster, IAM)
├── ecs-backend.tf           (5KB - ECS Task, Service)
├── elasticache-redis.tf     (2KB - Redis)
├── s3-cloudfront.tf         (5KB - S3 + CloudFront)
├── route53.tf               (4KB - DNS + ACM)
├── secrets.tf               (2KB - Secrets Manager)
├── chatbot.tf              (14KB - Lambda + API Gateway)
├── chatbot-variables.tf     (3KB - Chatbot vars)
└── alb-health-rule.tf       (0.3KB - ALB rule)
```

**Vấn đề:**
- ❌ Tất cả resources trong 1 state file
- ❌ Không tách biệt dev/prod
- ❌ Code lặp lại (copy/paste resources)
- ❌ Khó maintain khi project lớn
- ❌ Apply 1 thay đổi nhỏ phải scan toàn bộ infra
- ❌ Risk cao khi deploy

---

### Cấu trúc mới (Best Practice)

```
infrastructure/terraform/
├── README.md                    # ← File này
│
├── global/                      # Global configs (shared)
│   ├── versions.tf             # Terraform + provider versions
│   └── backend.tf              # S3 backend config
│
├── modules/                     # Reusable modules
│   ├── network/                # VPC, Subnets, NAT, IGW
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── security/               # Security Groups
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── alb/                    # Application Load Balancer
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── ecs/                    # ECS Cluster + Service
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── elasticache/            # Redis cluster
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── cloudfront/             # S3 + CloudFront (Frontend)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── route53/                # DNS + ACM Certificates
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── secrets/                # Secrets Manager
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── chatbot/                # Lambda + API Gateway WebSocket
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── envs/                        # Environment-specific configs
│   ├── dev/
│   │   ├── backend.tf          # S3 backend (dev state)
│   │   ├── main.tf             # Module composition
│   │   ├── variables.tf        # Input variables
│   │   ├── terraform.tfvars    # Dev values (gitignored)
│   │   └── outputs.tf          # Outputs
│   │
│   └── prod/
│       ├── backend.tf          # S3 backend (prod state)
│       ├── main.tf             # Module composition
│       ├── variables.tf        # Input variables
│       ├── terraform.tfvars    # Prod values (gitignored)
│       └── outputs.tf          # Outputs
│
└── [legacy files - to be deleted after migration]
    ├── main.tf
    ├── ecs-backend.tf
    └── ...
```

**Ưu điểm:**
- ✅ Tách biệt dev/prod hoàn toàn
- ✅ Reusable modules (DRY principle)
- ✅ Isolated state files (dev ≠ prod)
- ✅ Easy to test changes in dev first
- ✅ Parallel development (team work)
- ✅ Clear separation of concerns

---

## 🏗️ Migration Guide

### Phase 1: Tạo Global Configs

#### File: `global/versions.tf`
```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}
```

#### File: `global/backend.tf`
```hcl
# S3 backend configuration template
# Copy this to envs/dev/backend.tf and envs/prod/backend.tf
# Update the 'key' for each environment

terraform {
  backend "s3" {
    bucket         = "bookstore-tf-state-hieu192"
    # Dev:  key = "bookstore/dev/terraform.tfstate"
    # Prod: key = "bookstore/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

### Phase 2: Tạo Modules (Code Examples)

#### Module 1: Network (`modules/network/`)

**File: `modules/network/variables.tf`**
```hcl
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

**File: `modules/network/main.tf`**
```hcl
# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-vpc"
      Environment = var.environment
    },
    var.tags
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# Public Subnets (2 AZs)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
  }
}

# Private Subnets (2 AZs)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-${var.environment}-private-subnet-${count.index + 1}"
  }
}

# NAT Gateway (conditional)
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-${var.environment}-nat"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[0].id
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

**File: `modules/network/outputs.tf`**
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_id" {
  description = "NAT Gateway ID"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[0].id : null
}
```

---

#### Module 2: Security (`modules/security/`)

**File: `modules/security/variables.tf`**
```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "allow_cloudfront_only" {
  description = "Restrict ALB to CloudFront IPs only"
  type        = bool
  default     = true
}
```

**File: `modules/security/main.tf`**
```hcl
# CloudFront Managed Prefix List
data "aws_ec2_managed_prefix_list" "cloudfront" {
  count = var.allow_cloudfront_only ? 1 : 0
  
  filter {
    name   = "prefix-list-name"
    values = ["com.amazonaws.global.cloudfront.origin-facing"]
  }
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  # HTTP from CloudFront
  dynamic "ingress" {
    for_each = var.allow_cloudfront_only ? [1] : []
    content {
      from_port       = 80
      to_port         = 80
      protocol        = "tcp"
      prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront[0].id]
      description     = "HTTP from CloudFront only"
    }
  }

  # HTTPS from CloudFront
  dynamic "ingress" {
    for_each = var.allow_cloudfront_only ? [1] : []
    content {
      from_port       = 443
      to_port         = 443
      protocol        = "tcp"
      prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront[0].id]
      description     = "HTTPS from CloudFront only"
    }
  }

  # HTTP from anywhere (if CloudFront restriction disabled)
  dynamic "ingress" {
    for_each = var.allow_cloudfront_only ? [] : [1]
    content {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP from anywhere"
    }
  }

  # HTTPS from anywhere (if CloudFront restriction disabled)
  dynamic "ingress" {
    for_each = var.allow_cloudfront_only ? [] : [1]
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS from anywhere"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# ECS Tasks Security Group
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  # App port from ALB
  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "App port from ALB"
  }

  # HTTP from ALB
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "HTTP from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for Redis"
  vpc_id      = var.vpc_id

  # Redis port from ECS tasks
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Redis from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}
```

**File: `modules/security/outputs.tf`**
```hcl
output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  value = aws_security_group.ecs_tasks.id
}

output "redis_security_group_id" {
  value = aws_security_group.redis.id
}
```

---

#### Module 3: Chatbot (Simplified Example)

**File: `modules/chatbot/variables.tf`**
```hcl
variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "dynamodb_table_name" {
  type = string
}

variable "jwt_secret_name" {
  type = string
}

variable "knowledge_base_id" {
  type        = string
  default     = ""
  description = "Bedrock Knowledge Base ID"
}
```

**File: `modules/chatbot/main.tf`**
```hcl
# Copy nội dung từ chatbot.tf hiện tại
# Thay các hardcoded values bằng variables
# Example:

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# S3 Bucket for Knowledge Base
resource "aws_s3_bucket" "chatbot_kb" {
  bucket = "${var.project_name}-${var.environment}-chatbot-kb-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-chatbot-kb"
    Environment = var.environment
  }
}

# ... rest of chatbot resources
# Lambda functions, API Gateway, etc.
```

**File: `modules/chatbot/outputs.tf`**
```hcl
output "websocket_url" {
  description = "WebSocket URL for chatbot"
  value       = "wss://${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}"
}

output "kb_bucket_name" {
  description = "Knowledge Base S3 bucket name"
  value       = aws_s3_bucket.chatbot_kb.id
}
```

---

### Phase 3: Environment Configs

#### Dev Environment (`envs/dev/`)

**File: `envs/dev/backend.tf`**
```hcl
terraform {
  backend "s3" {
    bucket         = "bookstore-tf-state-hieu192"
    key            = "bookstore/dev/terraform.tfstate"  # ← Dev state
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

**File: `envs/dev/main.tf`**
```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "dev"
      Project     = "bookstore"
      ManagedBy   = "Terraform"
    }
  }
}

# Network Module
module "network" {
  source = "../../modules/network"
  
  project_name       = var.project_name
  environment        = "dev"
  vpc_cidr           = var.vpc_cidr
  enable_nat_gateway = false  # ← Dev: Disable NAT to save cost
}

# Security Module
module "security" {
  source = "../../modules/security"
  
  project_name          = var.project_name
  environment           = "dev"
  vpc_id                = module.network.vpc_id
  allow_cloudfront_only = false  # ← Dev: Allow direct access for testing
}

# ECS Module
module "ecs" {
  source = "../../modules/ecs"
  
  project_name           = var.project_name
  environment            = "dev"
  vpc_id                 = module.network.vpc_id
  private_subnet_ids     = module.network.private_subnet_ids
  ecs_task_sg_id         = module.security.ecs_tasks_security_group_id
  desired_count          = 1  # ← Dev: 1 task only
  cpu                    = 256  # ← Dev: Smaller size
  memory                 = 512
  # ... other variables
}

# ElastiCache Module
module "elasticache" {
  source = "../../modules/elasticache"
  
  project_name       = var.project_name
  environment        = "dev"
  vpc_id             = module.network.vpc_id
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = [module.security.redis_security_group_id]
  node_type          = "cache.t3.micro"  # ← Dev: Smallest instance
  num_cache_nodes    = 1  # ← Dev: Single node
}

# CloudFront Module
module "cloudfront" {
  source = "../../modules/cloudfront"
  
  project_name    = var.project_name
  environment     = "dev"
  domain_name     = "dev.anonymous.id.vn"  # ← Dev subdomain
  alb_dns_name    = module.alb.dns_name
  # ... other variables
}

# Chatbot Module (optional in dev)
module "chatbot" {
  source = "../../modules/chatbot"
  
  project_name         = var.project_name
  environment          = "dev"
  dynamodb_table_name  = var.dynamodb_table_name
  jwt_secret_name      = "bookstore/dev/jwt-secret"  # ← Dev secret
  knowledge_base_id    = ""  # ← Dev: Empty for now
}
```

**File: `envs/dev/variables.tf`**
```hcl
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

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "BookStore-Dev"
}

# ... other variables
```

**File: `envs/dev/terraform.tfvars`** (gitignore this!)
```hcl
# Dev environment specific values
aws_region           = "ap-southeast-1"
project_name         = "bookstore"
vpc_cidr             = "10.0.0.0/16"
dynamodb_table_name  = "BookStore-Dev"

# Sensitive values (from env vars or vault)
# jwt_secret = "" # Don't commit secrets!
```

**File: `envs/dev/outputs.tf`**
```hcl
output "alb_dns_name" {
  value = module.alb.dns_name
}

output "cloudfront_url" {
  value = module.cloudfront.domain_name
}

output "chatbot_websocket_url" {
  value = module.chatbot.websocket_url
}

# ... other outputs
```

---

#### Prod Environment (`envs/prod/`)

**File: `envs/prod/backend.tf`**
```hcl
terraform {
  backend "s3" {
    bucket = "bookstore-tf-state-hieu192"
    key            = "bookstore/prod/terraform.tfstate"  # ← Prod state
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

**File: `envs/prod/main.tf`**
```hcl
# Same structure as dev/main.tf but with prod values:

module "network" {
  source = "../../modules/network"
  
  project_name       = var.project_name
  environment        = "prod"
  vpc_cidr           = var.vpc_cidr
  enable_nat_gateway = true  # ← Prod: Enable NAT
}

module "security" {
  source = "../../modules/security"
  
  project_name          = var.project_name
  environment           = "prod"
  vpc_id                = module.network.vpc_id
  allow_cloudfront_only = true  # ← Prod: Restrict to CloudFront
}

module "ecs" {
  source = "../../modules/ecs"
  
  project_name       = var.project_name
  environment        = "prod"
  # ...
  desired_count      = 2  # ← Prod: 2 tasks for HA
  cpu                = 512  # ← Prod: Larger
  memory             = 1024
}

module "elasticache" {
  source = "../../modules/elasticache"
  
  project_name    = var.project_name
  environment     = "prod"
  # ...
  node_type       = "cache.t3.small"  # ← Prod: Bigger instance
  num_cache_nodes = 2  # ← Prod: Multi-node for HA
}

# ... other modules with prod configs
```

---

## 🚀 Deployment Workflow

### Deploy to Dev
```bash
cd infrastructure/terraform/envs/dev

# Initialize
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

### Deploy to Prod
```bash
cd infrastructure/terraform/envs/prod

# Initialize (different state!)
terraform init

# Plan
terraform plan -out=tfplan

# Review carefully!
terraform apply tfplan
```

---

## 📊 Comparison: Dev vs Prod

| Resource | Dev | Prod |
|----------|-----|------|
| **NAT Gateway** | ❌ Disabled (save $) | ✅ Enabled (HA) |
| **ECS Tasks** | 1 task | 2+ tasks |
| **Task CPU** | 256 | 512-1024 |
| **Task Memory** | 512 MB | 1-2 GB |
| **Redis** | `t3.micro`, 1 node | `t3.small`, 2+ nodes |
| **CloudFront** | Optional | Required |
| **ALB Restriction** | Open (testing) | CloudFront only |
| **Domain** | `dev.example.com` | `example.com` |
| **Monitoring** | Basic | Full (alarms) |
| **Backups** | Daily | Hourly |

---

## 🔄 Migration Steps (Detail)

### Step 1: Create Module Structure
```bash
cd infrastructure/terraform

# Create all module directories
mkdir -p modules/{network,security,alb,ecs,elasticache,cloudfront,route53,secrets,chatbot}

# Create env directories
mkdir -p envs/{dev,prod} global
```

### Step 2: Extract Modules One by One

**Order matters! Start with foundations:**

1. **Network** (no dependencies)
   - Copy VPC, Subnets, NAT code from `main.tf` → `modules/network/main.tf`
   - Parameterize with variables
   - Add outputs

2. **Security** (depends on Network)
   - Copy Security Groups from `main.tf` → `modules/security/main.tf`
   - Pass `vpc_id` as variable

3. **ALB** (depends on Network + Security)
   - Copy ALB resources from `main.tf` → `modules/alb/main.tf`

4. **ECS** (depends on Network + Security + ALB)
   - Copy from `ecs-backend.tf` → `modules/ecs/main.tf`

5. **ElastiCache** (depends on Network + Security)
   - Copy from `elasticache-redis.tf` → `modules/elasticache/main.tf`

6. **CloudFront** (depends on ALB)
   - Copy from `s3-cloudfront.tf` → `modules/cloudfront/main.tf`

7. **Route53** (depends on ALB + CloudFront)
   - Copy from `route53.tf` → `modules/route53/main.tf`

8. **Secrets** (standalone)
   - Copy from `secrets.tf` → `modules/secrets/main.tf`

9. **Chatbot** (depends on Network + Secrets)
   - Copy from `chatbot.tf` + `chatbot-variables.tf` → `modules/chatbot/main.tf`

### Step 3: Create Dev Environment

```bash
cd envs/dev

# Create backend.tf
# Create main.tf with module calls
# Create variables.tf
# Create terraform.tfvars
# Create outputs.tf

# Initialize dev
terraform init

# Import existing resources (if any)
terraform import module.network.aws_vpc.main vpc-xxxxx
# ... import all existing resources

# Or destroy old and recreate (safer)
cd ../../  # back to old structure
terraform destroy  # destroy old
cd envs/dev
terraform apply  # create new
```

### Step 4: Test in Dev

```bash
cd envs/dev

# Deploy
terraform apply

# Test application
# Verify all services work

# Make a change
# terraform apply again

# Verify change works
```

### Step 5: Create Prod Environment

```bash
cd envs/prod

# Copy from dev, adjust values
cp ../dev/*.tf .

# Edit terraform.tfvars for prod values
# Edit main.tf for prod configs

# Initialize
terraform init

# Import existing prod resources
terraform import ...

# Or plan from scratch
terraform plan
```

### Step 6: Cleanup Legacy Files

```bash
cd infrastructure/terraform

# After successful migration, delete old files
rm main.tf ecs-backend.tf elasticache-redis.tf s3-cloudfront.tf route53.tf secrets.tf chatbot.tf chatbot-variables.tf alb-health-rule.tf

# Keep only:
# - modules/
# - envs/
# - global/
# - README.md
```

---

## 🔐 Secrets Management

### Option 1: AWS Secrets Manager (Current)
```bash
# Create dev secret
aws secretsmanager create-secret \
  --name bookstore/dev/jwt-secret \
  --secret-string "DEV_JWT_SECRET_VALUE" \
  --region ap-southeast-1

# Create prod secret
aws secretsmanager create-secret \
  --name bookstore/prod/jwt-secret \
  --secret-string "PROD_JWT_SECRET_VALUE" \
  --region ap-southeast-1
```

### Option 2: Environment Variables
```bash
# Set in CI/CD or local
export TF_VAR_jwt_secret="your-secret"

terraform apply
```

### Option 3: Terraform Cloud/Enterprise
- Store secrets in Terraform Cloud workspace variables
- Encrypt at rest
- Access control with RBAC

---

## 📝 Best Practices

### 1. Module Design
- ✅ **Single Responsibility**: 1 module = 1 logical component
- ✅ **Reusable**: Works in dev, prod, staging
- ✅ **Well-documented**: README + variable descriptions
- ✅ **Versioned**: Tag module versions (v1.0.0)

### 2. Variable Management
```hcl
# Good: Descriptive, typed, with defaults
variable "instance_type" {
  description = "EC2 instance type for ECS tasks"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = can(regex("^t3\\.", var.instance_type))
    error_message = "Only t3 family allowed."
  }
}

# Bad: No description, no type
variable "it" {}
```

### 3. Outputs
```hcl
# Good: Descriptive, useful
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

# Bad: Exposing sensitive data
output "database_password" {  # DON'T DO THIS!
  value = random_password.db.result
}
```

### 4. State Management
- ✅ **Remote state**: Always use S3 + DynamoDB locking
- ✅ **Separate states**: dev.tfstate ≠ prod.tfstate
- ✅ **Backup**: Enable S3 versioning
- ✅ **Encryption**: `encrypt = true`

### 5. Naming Convention
```
Format: {project}-{environment}-{resource}-{identifier}

Examples:
- bookstore-prod-vpc
- bookstore-dev-ecs-cluster
- bookstore-prod-alb-sg-web
```

### 6. Git Strategy
```
.gitignore:
*.tfstate
*.tfstate.backup
.terraform/
.terraform.lock.hcl  # or commit for version pinning
terraform.tfvars     # NEVER commit!
*.tfvars             # NEVER commit!
```

---

## 🧪 Testing Strategy

### 1. Dev Environment = Test Ground
```bash
# Make changes in dev first
cd envs/dev
terraform apply

# Test thoroughly
curl https://dev.example.com/api/health

# If success, replicate to prod
cd ../prod
# Copy changes
terraform apply
```

### 2. Terraform Validate
```bash
terraform fmt -recursive    # Format code
terraform validate          # Check syntax
terraform plan             # Preview changes
```

### 3. Pre-commit Hooks
```bash
# Install pre-commit
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
```

---

## 📚 Additional Resources

### Terraform Best Practices
- [Terraform Style Guide](https://www.terraform.io/docs/language/syntax/style.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform Module Registry](https://registry.terraform.io/)

### Module Examples
- Network: https://github.com/terraform-aws-modules/terraform-aws-vpc
- ECS: https://github.com/terraform-aws-modules/terraform-aws-ecs
- ALB: https://github.com/terraform-aws-modules/terraform-aws-alb

---

## 🆘 Troubleshooting

### Issue: "Resource already exists"
```bash
# Import existing resource
terraform import module.network.aws_vpc.main vpc-xxxxx

# Or use terraform state mv
terraform state mv aws_vpc.main module.network.aws_vpc.main
```

### Issue: "Module not found"
```bash
# Re-initialize to download modules
terraform init -upgrade
```

### Issue: "State lock"
```bash
# Force unlock (caution!)
terraform force-unlock LOCK_ID
```

---

## 🎯 Next Steps

1. ✅ **Read this README** thoroughly
2. ✅ **Create global/** configs
3. ✅ **Create modules/** one by one (start with network)
4. ✅ **Create envs/dev/** and test
5. ✅ **Create envs/prod/** when dev is stable
6. ✅ **Migrate existing resources** (import or recreate)
7. ✅ **Delete legacy files**
8. ✅ **Update CI/CD** to use new structure
9. ✅ **Document team workflow**

---

## 📞 Support

If you encounter issues:
1. Check Terraform docs: https://www.terraform.io/docs
2. AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
3. Review this README
4. Ask team lead

---

**Happy Terraforming! 🚀**

*Last updated: 2025-12-09*
*Version: 1.0.0*

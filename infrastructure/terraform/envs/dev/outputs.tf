# Dev Environment Outputs

# Network
output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.network.private_subnet_ids
}

# ALB
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_url" {
  description = "ALB URL"
  value       = "https://${module.alb.alb_dns_name}"
}

# ECR
output "ecr_repository_url" {
  description = "ECR repository URL for backend"
  value       = module.ecr.repository_url
}

# ECS
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

# ElastiCache
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.redis_endpoint
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = module.elasticache.redis_connection_string
  sensitive   = true
}

# CloudFront
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.cloudfront_domain_name
}

output "cloudfront_url" {
  description = "CloudFront URL"
  value       = module.cloudfront.cloudfront_url
}

output "s3_frontend_bucket" {
  description = "S3 bucket name for frontend"
  value       = module.cloudfront.s3_bucket_name
}

# Route53
output "domain_nameservers" {
  description = "Domain nameservers (if Route53 enabled)"
  value       = module.route53.nameservers
}

# Chatbot
output "chatbot_websocket_url" {
  description = "Chatbot WebSocket URL"
  value       = module.chatbot.websocket_url
}

output "chatbot_kb_bucket" {
  description = "Chatbot Knowledge Base S3 bucket"
  value       = module.chatbot.kb_bucket_name
}

# Secrets
output "secret_arns" {
  description = "Secrets Manager secret ARNs"
  value = {
    jwt_secret  = module.secrets.jwt_secret_arn
    db_uri      = module.secrets.db_uri_arn
  }
  sensitive = true
}

# ============================================================================
# DEPLOYMENT INSTRUCTIONS
# ============================================================================

output "next_steps" {
  description = "Next steps after deployment"
  value = <<-EOT
  
  🎉 Dev Environment Deployed Successfully!
  
  📝 Next Steps:
  
  1️⃣ Build & Push Docker Image:
     cd ../../../backend
     docker build -t ${module.ecr.repository_url}:latest .
     aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.ecr.repository_url}
     docker push ${module.ecr.repository_url}:latest
  
  2️⃣ Set Secrets in AWS Console:
     - JWT_SECRET: AWS Console → Secrets Manager → ${var.project_name}/dev/jwt-secret
     - DB_URI: ${var.project_name}/dev/db-uri
     - AWS credentials: ${var.project_name}/dev/aws-access-key-id, etc.
  
  3️⃣ Deploy Frontend to S3:
     cd ../../../frontend
     npm run build
     aws s3 sync build/ s3://${module.cloudfront.s3_bucket_name}/ --delete
     aws cloudfront create-invalidation --distribution-id ${module.cloudfront.cloudfront_distribution_id} --paths "/*"
  
  4️⃣ Access Your Application:
     - Frontend: ${module.cloudfront.cloudfront_url}
     - Backend API: https://${module.alb.alb_dns_name}/api/health
     - Chatbot: ${module.chatbot.websocket_url}
  
  5️⃣ (Optional) Setup Custom Domain:
     - Update terraform.tfvars: domain_name = "yourdomain.com"
     - terraform apply
     - Point your domain nameservers to AWS Route53
  
  6️⃣ (Optional) Enable Chatbot Knowledge Base:
     - Create KB in AWS Bedrock console
     - Upload docs to s3://${module.chatbot.kb_bucket_name}/
     - Update terraform.tfvars: knowledge_base_id = "YOUR_KB_ID"
     - terraform apply
  
  📊 Cost Estimate (Dev with Prod Settings):
     - NAT Gateway: ~$32/month (required)
     - ECS Fargate: ~$20/month (1-4 tasks, 0.5 vCPU, 1GB)
     - Redis: ~$24/month (cache.t4g.small, same as prod)
     - ALB: ~$16/month + data transfer
     - S3 + CloudFront: ~$2-10/month (with versioning)
     - Total: ~$95-110/month (PROD-EQUIVALENT SETTINGS)
  
  💡 Why Dev = Prod Settings?
     - ✅ Learn production infrastructure
     - ✅ Test real-world scenarios
     - ✅ No surprises when deploying to actual prod
     - ✅ Same performance characteristics
  
  💰 Cost Optimization (if needed):
     - Scale ECS to 0 tasks when not in use: ~$20/month savings
     - Use smaller instances (t3.micro Redis): ~$12/month savings
     - Disable auto-scaling: No cost impact, just less flexibility
     - Disable versioning: Minimal savings (~$1/month)
  
  EOT
}

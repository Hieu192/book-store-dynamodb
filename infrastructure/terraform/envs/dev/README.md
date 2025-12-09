# Dev Environment - README

## Quick Start

```bash
# 1. Navigate to dev environment
cd infrastructure/terraform/envs/dev

# 2. Copy example tfvars
cp terraform.tfvars.example terraform.tfvars

# 3. Initialize Terraform
terraform init

# 4. Review plan
terraform plan

# 5. Deploy
terraform apply
```

## Prerequisites

1. **AWS Credentials**: Configure AWS CLI with appropriate credentials
   ```bash
   aws configure
   ```

2. **S3 Backend**: Ensure S3 bucket exists for state storage
   ```bash
   aws s3 mb s3://bookstore-tf-state-hieu192 --region us-east-1
   ```

3. **DynamoDB Lock Table**: Create table for state locking
   ```bash
   aws dynamodb create-table \
     --table-name terraform-state-lock \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

## Configuration

Edit `terraform.tfvars`:

```hcl
# Required
aws_region          = "ap-southeast-1"
project_name        = "bookstore"
dynamodb_table_name = "BookStore"

# Optional
domain_name         = "dev.yourdomain.com"  # or "" for CloudFront default
knowledge_base_id   = "kb-xxx"              # after creating Bedrock KB
```

## Post-Deployment

### 1. Set Secrets

```bash
# JWT Secret
aws secretsmanager put-secret-value \
  --secret-id bookstore/dev/jwt-secret \
  --secret-string "YOUR_JWT_SECRET_HERE" \
  --region ap-southeast-1

# Repeat for other secrets
```

### 2. Build & Deploy Backend

```bash
# Get ECR URL from output
ECR_URL=$(terraform output -raw ecr_repository_url)

# Build and push
cd ../../../../backend
docker build -t $ECR_URL:latest .
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $ECR_URL
docker push $ECR_URL:latest

# ECS will auto-deploy the new image
```

### 3. Deploy Frontend

```bash
# Get S3 bucket from output
S3_BUCKET=$(terraform output -raw s3_frontend_bucket)
CF_DIST=$(terraform output -raw cloudfront_distribution_id)

# Build and upload
cd ../../../../frontend
npm run build
aws s3 sync build/ s3://$S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*"
```

## Dev Environment = Production Settings

**Philosophy**: Dev environment uses **SAME settings as production** to avoid surprises and learn real infrastructure.

| Resource | Dev (= Prod) | Original Files |
|----------|--------------|----------------|
| **ECS Task** | 512 CPU, 1024 MB | ✅ Same |
| **Redis** | cache.t4g.small | ✅ Same |
| **NAT Gateway** | Enabled | ✅ Same |
| **Auto-scaling** | Enabled (1-4 tasks) | ✅ Same |
| **Container Insights** | Enabled | ✅ Same |
| **S3 Versioning** | Enabled | ✅ Same |
| **CloudFront** | PriceClass_200 | ✅ Same |
| **Image Scanning** | Enabled | ✅ Same |
| **Log Retention** | 30 days | ✅ Same |

### Why Dev = Prod?

**Benefits:**
- ✅ Learn **real production infrastructure**
- ✅ Test at **production scale**
- ✅ No configuration drift
- ✅ Catch issues before prod
- ✅ Easier to promote to prod (just change environment tag)

**Trade-off:**
- Higher cost (~$100/month vs ~$50/month for minimal dev)
- But you're learning REAL infrastructure!

## Cost Optimization

```bash
# Stop ECS service when not in use
aws ecs update-service \
  --cluster bookstore-dev-cluster \
  --service bookstore-dev-backend-service \
  --desired-count 0 \
  --region ap-southeast-1

# Start again when needed
aws ecs update-service \
  --cluster bookstore-dev-cluster \
  --service bookstore-dev-backend-service \
  --desired-count 1 \
  --region ap-southeast-1
```

## Cleanup

```bash
# Destroy all resources
terraform destroy

# Note: Some resources may need manual cleanup:
# - S3 buckets with versioning
# - ECR images
# - Secrets in deletion waiting period
```

## Troubleshooting

### Issue: "Backend initialization failed"
**Solution**: Ensure S3 bucket and DynamoDB table exist

### Issue: "Error creating ALB"
**Solution**: Check security group limits in your AWS account

### Issue: "ECR push denied"
**Solution**: Login to ECR first
```bash
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <ECR_URL>
```

### Issue: "ECS task unhealthy"
**Solution**: Check CloudWatch logs
```bash
aws logs tail /ecs/bookstore/dev/backend --follow
```

## Next: Production Environment

After testing in dev, deploy to prod:
```bash
cd ../prod
cp ../dev/terraform.tfvars terraform.tfvars
# Edit with prod values (larger instances, HA, etc.)
terraform init
terraform apply
```

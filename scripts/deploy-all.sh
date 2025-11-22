#!/bin/bash

# Deploy toàn bộ infrastructure + application lên AWS

set -e

echo "🚀 Starting full deployment to AWS..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_NAME="bookstore"
AWS_REGION="ap-southeast-1"

# Functions
print_step() {
  echo -e "${GREEN}==>${NC} $1"
}

print_error() {
  echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}WARNING:${NC} $1"
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
  print_error "AWS CLI not installed"
  exit 1
fi

if ! command -v terraform &> /dev/null; then
  print_error "Terraform not installed"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  print_error "Docker not installed"
  exit 1
fi

print_step "✅ All prerequisites installed"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_step "AWS Account ID: ${AWS_ACCOUNT_ID}"

# Step 1: Deploy infrastructure
print_step "Step 1: Deploying infrastructure with Terraform..."
cd infrastructure/terraform

terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Get outputs
ECR_BACKEND_URL=$(terraform output -raw ecr_backend_url)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
ALB_DNS=$(terraform output -raw alb_dns_name)

cd ../..

print_step "✅ Infrastructure deployed"
echo "  ECR Backend: ${ECR_BACKEND_URL}"
echo "  S3 Bucket: ${S3_BUCKET}"
echo "  CloudFront: ${CLOUDFRONT_DOMAIN}"
echo "  ALB: ${ALB_DNS}"

# Step 2: Build and push backend image
print_step "Step 2: Building and pushing backend Docker image..."

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_BACKEND_URL}

# Build
cd backend
docker build -t ${PROJECT_NAME}/backend:latest .

# Tag and push
docker tag ${PROJECT_NAME}/backend:latest ${ECR_BACKEND_URL}:latest
docker push ${ECR_BACKEND_URL}:latest

cd ..

print_step "✅ Backend image pushed to ECR"

# Step 3: Build and deploy frontend
print_step "Step 3: Building and deploying frontend..."

cd frontend

# Install dependencies
npm install

# Build
REACT_APP_API_URL=https://${CLOUDFRONT_DOMAIN}/api npm run build

# Upload to S3
aws s3 sync build/ s3://${S3_BUCKET}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://${S3_BUCKET}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Upload service-worker.js with no-cache (if exists)
if [ -f build/service-worker.js ]; then
  aws s3 cp build/service-worker.js s3://${S3_BUCKET}/service-worker.js \
    --cache-control "no-cache, no-store, must-revalidate"
fi

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"

cd ..

print_step "✅ Frontend deployed to S3 + CloudFront"

# Step 4: Wait for ECS service to be stable
print_step "Step 4: Waiting for ECS service to be stable..."

aws ecs wait services-stable \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-backend-service \
  --region ${AWS_REGION}

print_step "✅ ECS service is stable"

# Step 5: Verify deployment
print_step "Step 5: Verifying deployment..."

# Check ECS service
RUNNING_COUNT=$(aws ecs describe-services \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-backend-service \
  --query 'services[0].runningCount' \
  --output text)

DESIRED_COUNT=$(aws ecs describe-services \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-backend-service \
  --query 'services[0].desiredCount' \
  --output text)

if [ "${RUNNING_COUNT}" -eq "${DESIRED_COUNT}" ]; then
  print_step "✅ ECS service healthy (${RUNNING_COUNT}/${DESIRED_COUNT} tasks running)"
else
  print_warning "ECS service not fully healthy (${RUNNING_COUNT}/${DESIRED_COUNT} tasks running)"
fi

# Test frontend
print_step "Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${CLOUDFRONT_DOMAIN})

if [ "${FRONTEND_STATUS}" -eq "200" ]; then
  print_step "✅ Frontend is accessible"
else
  print_warning "Frontend returned status code: ${FRONTEND_STATUS}"
fi

# Test backend API
print_step "Testing backend API..."
sleep 10  # Wait for CloudFront to propagate

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${CLOUDFRONT_DOMAIN}/api/health)

if [ "${API_STATUS}" -eq "200" ]; then
  print_step "✅ Backend API is accessible"
else
  print_warning "Backend API returned status code: ${API_STATUS}"
fi

# Summary
echo ""
echo "=========================================="
echo "🎉 DEPLOYMENT COMPLETED!"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "  Frontend URL: https://${CLOUDFRONT_DOMAIN}"
echo "  Backend API: https://${CLOUDFRONT_DOMAIN}/api"
echo "  ECS Cluster: ${PROJECT_NAME}-cluster"
echo "  ECS Service: ${PROJECT_NAME}-backend-service"
echo "  Running Tasks: ${RUNNING_COUNT}/${DESIRED_COUNT}"
echo ""
echo "💰 Estimated Monthly Cost: ~$125"
echo ""
echo "📝 Next Steps:"
echo "  1. Configure custom domain (Route 53)"
echo "  2. Add SSL certificate (ACM)"
echo "  3. Set up monitoring (CloudWatch)"
echo "  4. Configure auto-scaling policies"
echo ""
echo "🔍 Useful Commands:"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME}/backend --follow"
echo "  Update backend: ./scripts/deploy-backend.sh"
echo "  Update frontend: ./scripts/deploy-frontend.sh"
echo "  Destroy all: cd infrastructure/terraform && terraform destroy"
echo ""

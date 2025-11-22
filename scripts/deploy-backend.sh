#!/bin/bash

# Deploy Backend to ECS Fargate

set -e

echo "🚀 Deploying Backend to ECS Fargate..."

# Variables
PROJECT_NAME="bookstore"
AWS_REGION="ap-southeast-1"

# Get ECR URL
cd infrastructure/terraform
ECR_URL=$(terraform output -raw ecr_backend_url)
cd ../..

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_URL}

# Build image
echo "🐳 Building Docker image..."
cd backend
docker build -t ${PROJECT_NAME}/backend:latest .

# Tag with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag ${PROJECT_NAME}/backend:latest ${ECR_URL}:${TIMESTAMP}
docker tag ${PROJECT_NAME}/backend:latest ${ECR_URL}:latest

# Push images
echo "☁️  Pushing to ECR..."
docker push ${ECR_URL}:${TIMESTAMP}
docker push ${ECR_URL}:latest

cd ..

# Force new deployment
echo "🔄 Triggering ECS deployment..."
aws ecs update-service \
  --cluster ${PROJECT_NAME}-cluster \
  --service ${PROJECT_NAME}-backend-service \
  --force-new-deployment \
  --region ${AWS_REGION} \
  > /dev/null

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-backend-service \
  --region ${AWS_REGION}

# Verify
RUNNING_COUNT=$(aws ecs describe-services \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-backend-service \
  --query 'services[0].runningCount' \
  --output text)

echo "✅ Backend deployed successfully!"
echo "📊 Running tasks: ${RUNNING_COUNT}"
echo "🏷️  Image tag: ${TIMESTAMP}"
echo ""
echo "🔍 View logs:"
echo "  aws logs tail /ecs/${PROJECT_NAME}/backend --follow"

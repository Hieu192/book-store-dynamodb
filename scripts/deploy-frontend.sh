#!/bin/bash

# Deploy Frontend to S3 + CloudFront

set -e

echo "🚀 Deploying Frontend to S3 + CloudFront..."

# Variables
PROJECT_NAME="bookstore"
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="${PROJECT_NAME}-frontend-${AWS_ACCOUNT_ID}"
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${PROJECT_NAME} frontend distribution'].Id" \
  --output text)

# 1. Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Sync to S3
echo "☁️  Uploading to S3..."
aws s3 sync frontend/build/ s3://${S3_BUCKET}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js"

# Upload index.html với no-cache
aws s3 cp frontend/build/index.html s3://${S3_BUCKET}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Upload service-worker.js với no-cache (nếu có)
if [ -f frontend/build/service-worker.js ]; then
  aws s3 cp frontend/build/service-worker.js s3://${S3_BUCKET}/service-worker.js \
    --cache-control "no-cache, no-store, must-revalidate"
fi

# 3. Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"

echo "✅ Frontend deployed successfully!"
echo "🌐 CloudFront URL: https://$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DomainName' --output text)"

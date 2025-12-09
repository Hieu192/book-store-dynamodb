# Chatbot Standalone Deployment

Deploy ONLY chatbot infrastructure (Lambda + API Gateway + S3 KB)

## Prerequisites

Ensure these resources already exist:
- ✅ DynamoDB table: `BookStore`
- ✅ Secrets Manager secret: `bookstore/jwt-secret`

Verify:
```bash
# Check DynamoDB
aws dynamodb describe-table --table-name BookStore --region ap-southeast-1

# Check JWT Secret
aws secretsmanager get-secret-value --secret-id bookstore/jwt-secret --region ap-southeast-1
```

## Quick Start

```bash
# 1. Navigate here
cd d:\AWS\book\infrastructure\terraform\chatbot-only

# 2. Copy config
cp terraform.tfvars.example terraform.tfvars

# 3. Edit if needed (review table/secret names)
code terraform.tfvars

# 4. Initialize
terraform init

# 5. Review
terraform plan

# 6. Deploy
terraform apply
```

## What Gets Deployed

- ✅ 4 Lambda functions (connect, disconnect, send-message, upload-document)
- ✅ 1 Lambda Layer (shared utilities)
- ✅ 1 API Gateway WebSocket
- ✅ 1 S3 bucket for Knowledge Base
- ✅ CloudWatch Log Groups
- ✅ IAM roles & policies

**Resources: ~15-20**  
**Cost: ~$3-7/month**

## After Deployment

1. **Get WebSocket URL:**
   ```bash
   terraform output websocket_url
   ```

2. **Upload sample document:**
   ```bash
   KB_BUCKET=$(terraform output -raw kb_bucket_name)
   echo "Sample bookstore document" > sample.txt
   aws s3 cp sample.txt s3://$KB_BUCKET/docs/
   ```

3. **Create Bedrock Knowledge Base** (AWS Console)
   - URL: https://ap-southeast-1.console.aws.amazon.com/bedrock/home#/knowledge-bases
   - S3 URI: From output `kb_bucket_name`

4. **Update terraform.tfvars with KB ID:**
   ```hcl
   knowledge_base_id = "KB4JS8F9X2L"
   ```

5. **Re-apply:**
   ```bash
   terraform apply
   ```

6. **Test:**
   ```bash
   wscat -c $(terraform output -raw websocket_url)
   # Send: {"type":"message","message":"Hello","userId":"test"}
   ```

## Cleanup

```bash
# Destroy all chatbot resources
terraform destroy
```

## Troubleshooting

**Error: DynamoDB table not found**
- Verify table exists: `aws dynamodb list-tables --region ap-southeast-1`

**Error: Secret not found**
- Create secret: `aws secretsmanager create-secret --name bookstore/jwt-secret --secret-string $(openssl rand -base64 32)`

**Lambda timeout**
- Check CloudWatch logs: `aws logs tail /aws/lambda/bookstore-production-chatbot-send-message --follow`

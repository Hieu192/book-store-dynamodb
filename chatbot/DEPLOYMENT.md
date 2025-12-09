# 🤖 CHATBOT DEPLOYMENT GUIDE

Hướng dẫn triển khai FULL CHATBOT với Lambda + API Gateway WebSocket + Bedrock

---

## 📋 **Prerequisites**

Trước khi deploy, đảm bảo bạn đã có:

- ✅ **AWS Account** với quyền Administrator
- ✅ **AWS CLI** configured: `aws configure`
- ✅ **Terraform** installed: `terraform --version`
- ✅ **JWT Secret** đã tạo trong Secrets Manager: `bookstore/dev/jwt-secret`
- ✅ **DynamoDB table** tên `BookStore` đã tồn tại

---

## 🚀 **STEP-BY-STEP DEPLOYMENT**

### **Step 1: Verify JWT Secret**

```bash
# Check JWT secret exists
aws secretsmanager get-secret-value \
  --secret-id bookstore/dev/jwt-secret \
  --region ap-southeast-1 \
  --query 'SecretString' \
  --output text
```

**Expected**: Your JWT secret string

❌ **If not found**, create it:
```bash
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
  --name bookstore/dev/jwt-secret \
  --secret-string "$JWT_SECRET" \
  --region ap-southeast-1
```

---

### **Step 2: Verify DynamoDB Table**

```bash
# Check table exists
aws dynamodb describe-table \
  --table-name BookStore \
  --region ap-southeast-1
```

❌ **If not found**, tạo table trước (hoặc deploy backend infrastructure trước)

---

### **Step 3: Deploy Infrastructure với Terraform**

```bash
# Navigate to dev environment
cd infrastructure/terraform/envs/dev

# Initialize Terraform (first time only)
terraform init

# Review plan
terraform plan

# Deploy all infrastructure (including chatbot)
terraform apply -auto-approve
```

**What gets deployed:**
- ✅ Lambda functions (4 functions)
- ✅ Lambda Layer (shared utilities)
- ✅ API Gateway WebSocket
- ✅ S3 bucket for Knowledge Base
- ✅ IAM roles & policies
- ✅ CloudWatch Log Groups

---

### **Step 4: Get Chatbot Outputs**

```bash
# Get WebSocket URL
WS_URL=$(terraform output -raw chatbot_websocket_url)
echo "Chatbot WebSocket URL: $WS_URL"

# Get KB bucket name
KB_BUCKET=$(terraform output -raw chatbot_kb_bucket)
echo "Knowledge Base Bucket: $KB_BUCKET"

# Save for later
echo $WS_URL > ../../chatbot_ws_url.txt
echo $KB_BUCKET > ../../kb_bucket.txt
```

---

### **Step 5: Create Bedrock Knowledge Base (AWS Console)**

**⚠️ QUAN TRỌNG**: Knowledge Base phải tạo manual trong AWS Console!

#### **5.1. Navigate to Bedrock Console**

URL: https://ap-southeast-1.console.aws.amazon.com/bedrock/home?region=ap-southeast-1#/knowledge-bases

#### **5.2. Create Knowledge Base**

1. Click **"Create knowledge base"**

2. **Knowledge base details:**
   - Name: `bookstore-chatbot-kb`
   - Description: `Knowledge base for bookstore chatbot`
   - IAM permissions: `Create and use a new service role`

3. **Data source:**
   - Data source name: `bookstore-docs`
   - S3 URI: `s3://<YOUR_KB_BUCKET>/` (from Step 4)
   - Chunking strategy: `Default chunking`

4. **Embeddings model:**
   - Model: `Titan Embeddings G1 - Text`
   - Dimensions: `1536`

5. **Vector database:**
   - Vector database: `Quick create a new vector store - Recommended`
   
6. Click **"Create"**

**⏳ Deployment takes ~5-10 minutes**

#### **5.3. Get Knowledge Base ID**

After creation:
```bash
# List all knowledge bases
aws bedrock-agent list-knowledge-bases --region ap-southeast-1

# Get ID from output (format: KB123ABC...)
```

**Copy the Knowledge Base ID!** Example: `KB4JS8F9X2L`

---

### **Step 6: Update Terraform with KB ID**

```bash
# Edit terraform.tfvars
cd infrastructure/terraform/envs/dev
nano terraform.tfvars

# Add this line:
knowledge_base_id = "KB4JS8F9X2L"  # Your actual KB ID

# Re-deploy to update Lambda environment variables
terraform apply -auto-approve
```

---

### **Step 7: Upload Sample Documents to Knowledge Base**

```bash
# Create sample docs
cat > sample-book-info.txt << 'EOF'
Welcome to BookStore!

Our store offers:
- Fiction books: Novels, short stories, poetry
- Non-fiction: Biography, history, science
- Children's books: Picture books, young adult

Popular authors:
- J.K. Rowling (Harry Potter series)
- Stephen King (Horror novels)
- Agatha Christie (Mystery novels)

Opening hours: 9 AM - 9 PM (Mon-Sun)
Contact: support@bookstore.com
Phone: 1-800-BOOKS
EOF

# Upload to S3 KB bucket
KB_BUCKET=$(cat ../../kb_bucket.txt)
aws s3 cp sample-book-info.txt s3://$KB_BUCKET/docs/

# Verify
aws s3 ls s3://$KB_BUCKET/docs/
```

---

### **Step 8: Sync Knowledge Base**

```bash
# After uploading docs, trigger sync
KB_ID="KB4JS8F9X2L"  # Your KB ID
DATA_SOURCE_ID="<YOUR_DATA_SOURCE_ID>"  # From Bedrock console

aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $KB_ID \
  --data-source-id $DATA_SOURCE_ID \
  --region ap-southeast-1
```

**Or sync via Console:**
1. Go to Bedrock → Knowledge bases → Select your KB
2. Click **"Sync"** button
3. Wait for sync to complete (~2-5 minutes)

---

### **Step 9: Test Chatbot via CLI**

#### **9.1. Install WebSocket Client**

```bash
# Install wscat (Node.js WebSocket client)
npm install -g wscat
```

#### **9.2. Connect to WebSocket**

```bash
WS_URL=$(cat ../../chatbot_ws_url.txt)

# Connect
wscat -c "$WS_URL"

# Expected:
Connected (press CTRL+C to quit)
```

#### **9.3. Send Test Message**

```json
{
  "type": "message",
  "message": "Hello! Tell me about your books",
  "userId": "test-user-123"
}
```

**Expected response:**
```json
{
  "type": "response",
  "message": "Welcome to BookStore! We offer a wide range of books including fiction, non-fiction, and children's books...",
  "timestamp": "2025-12-09T15:00:00Z"
}
```

---

### **Step 10: Integrate with Frontend**

#### **10.1. Update Frontend Environment**

```bash
cd ../../../../frontend

# Create .env file
cat > .env << EOF
REACT_APP_CHATBOT_WS_URL=$WS_URL
EOF

# Restart frontend
npm start
```

#### **10.2. Test in Browser**

1. Open frontend: http://localhost:3000
2. Look for chatbot icon (bottom right)
3. Click to open chat
4. Send message: "What books do you have?"
5. Verify AI response

---

## 🔍 **TROUBLESHOOTING**

### **Issue 1: Lambda cannot connect to DynamoDB**

```bash
# Check IAM permissions
aws iam get-role-policy \
  --role-name bookstore-dev-chatbot-lambda-role \
  --policy-name bookstore-dev-chatbot-lambda-policy

# Should see DynamoDB permissions
```

**Fix**: Re-deploy Terraform

---

### **Issue 2: "Knowledge Base not found"**

**Symptoms**: Lambda returns error about KB

**Fix**:
```bash
# Verify KB ID in Lambda environment
aws lambda get-function-configuration \
  --function-name bookstore-dev-chatbot-send-message \
  --region ap-southeast-1 \
  --query 'Environment.Variables.KNOWLEDGE_BASE_ID'

# Should match your actual KB ID
```

---

### **Issue 3: WebSocket connection refused**

```bash
# Check API Gateway deployment
aws apigatewayv2 get-apis --region ap-southeast-1

# Check if stage is deployed
aws apigatewayv2 get-stages \
  --api-id <API_ID> \
  --region ap-southeast-1
```

**Fix**: Redeploy API Gateway stage in console

---

### **Issue 4: Lambda timeout**

**Symptoms**: No response after 30 seconds

**Check CloudWatch Logs:**
```bash
# View logs
aws logs tail /aws/lambda/bookstore-dev-chatbot-send-message \
  --follow \
  --region ap-southeast-1
```

**Common causes:**
- Bedrock model not responding
- Knowledge Base sync not complete
- VPC configuration issues

---

## 📊 **Verify Deployment**

Run this checklist:

```bash
# 1. Lambda functions exist
aws lambda list-functions \
  --region ap-southeast-1 \
  --query 'Functions[?starts_with(FunctionName, `bookstore-dev-chatbot`)].FunctionName'

# Expected: 4 functions (connect, disconnect, send-message, upload-document)

# 2. API Gateway exists
aws apigatewayv2 get-apis \
  --region ap-southeast-1 \
  --query 'Items[?Name==`bookstore-dev-chatbot-ws`]'

# 3. S3 KB bucket exists
aws s3 ls | grep chatbot-kb

# 4. Knowledge Base exists
aws bedrock-agent list-knowledge-bases --region ap-southeast-1

# 5. Test WebSocket connection
wscat -c $(cat ../../chatbot_ws_url.txt)
```

---

## 📝 **Post-Deployment Checklist**

- ✅ JWT Secret created
- ✅ Terraform deployed
- ✅ Lambda functions deployed
- ✅ API Gateway WebSocket created
- ✅ S3 KB bucket created
- ✅ Bedrock Knowledge Base created
- ✅ Sample documents uploaded
- ✅ Knowledge Base synced
- ✅ WebSocket connection tested
- ✅ Frontend integrated
- ✅ End-to-end test passed

---

## 🎯 **Next Steps**

1. **Upload more documents** to Knowledge Base
2. **Customize AI responses** (edit Lambda code)
3. **Add authentication** (JWT validation)
4. **Monitor usage** (CloudWatch metrics)
5. **Optimize costs** (Lambda concurrency limits)

---

## 💰 **Cost Estimate**

| Service | Cost/Month |
|---------|-----------|
| Lambda (10K requests/month) | ~$0.20 |
| API Gateway WS (10K connections) | ~$1 |
| Bedrock Knowledge Base | ~$0 (no index yet) |
| Bedrock LLM (1K requests) | ~$1-5 |
| S3 KB Storage | ~$0.10 |
| CloudWatch Logs | ~$0.50 |
| **Total** | **~$3-7/month** |

**Free Tier:**
- Lambda: 1M requests/month FREE
- API Gateway: 1M requests/month FREE

---

## 🆘 **Support**

**CloudWatch Logs:**
```bash
# Connect Lambda
aws logs tail /aws/lambda/bookstore-dev-chatbot-connect --follow

# Send Message Lambda
aws logs tail /aws/lambda/bookstore-dev-chatbot-send-message --follow
```

**Terraform State:**
```bash
cd infrastructure/terraform/envs/dev
terraform show
```

---

**🎉 DONE! Your chatbot is ready!** 🤖

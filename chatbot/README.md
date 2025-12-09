# Chatbot - AWS Serverless với Bedrock Knowledge Base

Chatbot thông minh sử dụng API Gateway WebSocket + Lambda + Bedrock RAG cho website bán sách.

## 📁 Cấu trúc

```
chatbot/
├── lambda/                    # Lambda functions
│   ├── shared/               # Shared utilities
│   ├── connect/              # WebSocket $connect
│   ├── disconnect/           # WebSocket $disconnect
│   ├── send-message/         # Main chat logic
│   └── upload-document/      # Admin upload KB docs
├── scripts/                  # Deployment scripts
│   └── install-lambda-deps.sh
└── README.md                 # This file
```

## 🚀 Deployment

### Bước 1: Chuẩn bị môi trường

```bash
# Install dependencies for Lambda functions
cd chatbot/scripts
chmod +x install-lambda-deps.sh
./install-lambda-deps.sh
```

### Bước 2: Tạo JWT Secret (nếu chưa có)

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name bookstore/jwt-secret \
  --secret-string "your-jwt-secret-here" \
  --region ap-southeast-1
```

**Lưu ý**: Phải dùng CÙNG JWT_SECRET với backend hiện tại!

### Bước 3: Deploy Infrastructure với Terraform

```bash
cd ../../infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Deploy
terraform apply
```

### Bước 4: Tạo Bedrock Knowledge Base (Manual)

1. Vào AWS Console → Bedrock → Knowledge Base
2. Create Knowledge Base:
   - **Name**: `bookstore-chatbot-kb`
   - **Data source**: S3
   - **S3 URI**: Lấy từ Terraform output `chatbot_kb_bucket_name`
3. Copy Knowledge Base ID
4. Update `terraform.tfvars`:
   ```hcl
   knowledge_base_id = "YOUR_KB_ID_HERE"
   ```
5. Apply lại Terraform:
   ```bash
   terraform apply
   ```

### Bước 5: Upload tài liệu vào Knowledge Base

```bash
# Upload file PDF/TXT vào S3
aws s3 cp products.pdf s3://YOUR-BUCKET-NAME/products/

# Sync Knowledge Base (tự động mỗi 5-15 phút, hoặc manual trigger)
```

### Bước 6: Configure Frontend

Thêm vào `frontend/.env`:

```env
REACT_APP_CHATBOT_WS_URL=wss://YOUR-API-ID.execute-api.ap-southeast-1.amazonaws.com/prod
```

Lấy URL từ Terraform output: `chatbot_websocket_url`

## 🧪 Testing

### Test WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
WS_URL=$(cd infrastructure/terraform && terraform output -raw chatbot_websocket_url)
wscat -c "$WS_URL?temp=123"

# Connected! Now send auth message:
{"type":"authenticate","token":"YOUR_JWT_TOKEN"}

# Then send chat:
{"type":"chat_message","message":"Hello chatbot!"}
```

### Test Lambda Functions

```bash
# Test locally with AWS SAM (optional)
sam local invoke chatbot-send-message --event events/test-message.json
```

## 📊 Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/bookstore-chatbot-send-message --follow

# Or use CloudWatch Insights:
# AWS Console → CloudWatch → Log groups
```

### Metrics

- API Gateway metrics: Connection count, Message count, Errors
- Lambda metrics: Invocations, Duration, Errors
- DynamoDB metrics: Read/Write capacity

## 💰 Cost Estimate

**Giả sử 500 users/day, 10 messages/user:**

```
- API Gateway:     15K messages × $1/million = $0.015
- Lambda:          15K invocations × $0.20/million = $0.003
                   15K × 2s × $0.0000166667/GB-sec = $0.50
- Bedrock:         15K calls × $0.00075 (Haiku) = $11.25
- DynamoDB:        Minimal (dùng chung table) = $3.00
- S3:              Storage = $0.50
─────────────────────────────────────────────────────
Total: ~$15/month
```

## 🔧 Troubleshooting

### Lambda không connect được DynamoDB

```bash
# Check IAM permissions
aws iam get-role-policy --role-name bookstore-chatbot-lambda-role --policy-name bookstore-chatbot-lambda-policy
```

### WebSocket connection failed

1. Check API Gateway Stage is deployed
2. Check Lambda permissions for API Gateway
3. Verify CORS settings (if browser blocks)

### Bedrock errors

1. Enable Bedrock models in AWS Console
2. Request access to Claude models (if needed)
3. Check IAM permissions for Bedrock

## 📝 Environment Variables

Lambda functions cần các biến môi trường sau:

```bash
TABLE_NAME=BookStore
JWT_SECRET=your-secret
AWS_REGION=ap-southeast-1
KNOWLEDGE_BASE_ID=KB123...
APIGW_ENDPOINT=https://xxx.execute-api.ap-southeast-1.amazonaws.com/prod
KB_BUCKET_NAME=bookstore-chatbot-kb-xxx
```

Terraform tự động set các biến này.

## 🔒 Security

- ✅ JWT token verification (same as backend)
- ✅ Connection-level authentication
- ✅ Message-level authorization
- ✅ Input sanitization
- ✅ Rate limiting (API Gateway)
- ✅ Secrets in Secrets Manager
- ✅ IAM least privilege

## 📚 Resources

- [Lambda Code README](./lambda/README.md)
- [Implementation Plan](../../../.gemini/antigravity/brain/.../implementation_plan.md)
- [AWS API Gateway WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [AWS Bedrock](https://docs.aws.amazon.com/bedrock/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

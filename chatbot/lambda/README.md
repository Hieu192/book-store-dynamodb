# Chatbot Lambda Functions

AWS Lambda functions cho chatbot với WebSocket API Gateway và Bedrock Knowledge Base.

## 📁 Cấu trúc

```
lambda/
├── connect/              # WebSocket $connect handler
├── disconnect/           # WebSocket $disconnect handler
├── send-message/         # WebSocket $default handler (main logic)
├── upload-document/      # Admin: upload documents to KB
└── shared/              # Shared utilities
    ├── dynamodb.js      # DynamoDB client
    ├── bedrock.js       # Bedrock RAG client
    ├── auth.js          # JWT verification
    └── utils.js         # Helper functions
```

## 🔑 Environment Variables

Các Lambda functions cần các environment variables sau:

### Common Variables (all functions)
- `AWS_REGION`: AWS region (default: ap-southeast-1)
- `TABLE_NAME`: DynamoDB table name (BookStore)

### Authentication Variables
- `JWT_SECRET`: JWT secret key (same as backend)

### Bedrock Variables
- `KNOWLEDGE_BASE_ID`: Bedrock Knowledge Base ID
- `DATA_SOURCE_ID`: (Optional) Data source ID for manual sync

### WebSocket Variables
- `APIGW_ENDPOINT`: API Gateway WebSocket endpoint

### S3 Variables (upload-document only)
- `KB_BUCKET_NAME`: S3 bucket for Knowledge Base documents

## 🚀 Deployment

### Option 1: Manual (for testing)

```bash
# Install dependencies for each function
cd lambda/connect && npm install
cd ../disconnect && npm install
cd ../send-message && npm install
cd ../upload-document && npm install

# Zip each function
cd lambda/connect && zip -r connect.zip .
cd ../disconnect && zip -r disconnect.zip .
cd ../send-message && zip -r send-message.zip .
cd ../upload-document && zip -r upload-document.zip .

# Upload via AWS CLI
aws lambda update-function-code \
  --function-name bookstore-chatbot-connect \
  --zip-file fileb://connect.zip

# Repeat for other functions...
```

### Option 2: Terraform (recommended)

Terraform sẽ tự động package và deploy. See `infrastructure/terraform/chatbot-lambda.tf`

```bash
cd infrastructure/terraform
terraform apply -target=aws_lambda_function.chatbot_connect
terraform apply -target=aws_lambda_function.chatbot_disconnect
terraform apply -target=aws_lambda_function.chatbot_send_message
terraform apply -target=aws_lambda_function.chatbot_upload_document
```

## 📝 Message Types

### Client → Server

#### 1. Authenticate
```json
{
  "type": "authenticate",
  "token": "JWT_TOKEN_HERE"
}
```

**Response:**
```json
{
  "type": "auth_success",
  "userId": "user123",
  "message": "Successfully authenticated"
}
```

#### 2. Chat Message
```json
{
  "type": "chat_message",
  "message": "Tôi muốn mua sách về AI",
  "conversationId": "optional-uuid"
}
```

**Response:**
```json
{
  "type": "chat_response",
  "conversationId": "uuid",
  "message": {
    "id": "msg-uuid",
    "content": "Chúng tôi có nhiều sách về AI...",
    "timestamp": "2025-12-08T...",
    "sender": "bot",
    "sources": [...]
  }
}
```

#### 3. Ping (Keep-alive)
```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": "2025-12-08T..."
}
```

### Server → Client

#### Typing Indicator
```json
{
  "type": "typing",
  "conversationId": "uuid"
}
```

#### Error
```json
{
  "type": "error",
  "message": "Error description"
}
```

## 🧪 Testing

### Test WebSocket Connection

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod?temp=123');

ws.on('open', () => {
  console.log('Connected');
  
  // Authenticate
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'YOUR_JWT_TOKEN'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'auth_success') {
    // Send chat message
    ws.send(JSON.stringify({
      type: 'chat_message',
      message: 'Hello chatbot!'
    }));
  }
});
```

### Test Locally with SAM

```bash
# Install AWS SAM CLI
# Create template.yaml for local testing

sam local invoke ChatbotConnect --event events/connect.json
sam local invoke ChatbotSendMessage --event events/message.json
```

## 🔒 Security

- ✅ JWT token verification using same secret as backend
- ✅ Connection state validation (PENDING_AUTH → AUTHENTICATED)
- ✅ Input sanitization
- ✅ Rate limiting (TODO: implement in future)
- ✅ TTL for stale connections
- ✅ Admin-only upload function

## 📊 DynamoDB Schema

### Connection
```
PK: CONNECTION#<connectionId>
SK: METADATA
status: PENDING_AUTH | AUTHENTICATED
userId: <userId>  (after auth)
email: <email>
connectedAt: ISO timestamp
ttl: Unix timestamp
```

### Conversation
```
PK: CONVERSATION#<conversationId>
SK: METADATA
userId: <userId>
title: <first message preview>
lastMessageAt: ISO timestamp
createdAt: ISO timestamp
```

### Message
```
PK: CONVERSATION#<conversationId>
SK: MESSAGE#<timestamp>#<messageId>
messageId: <uuid>
sender: user | bot
content: <message text>
timestamp: ISO timestamp
metadata: { sources, model, ... }
```

### Document (Knowledge Base)
```
PK: DOCUMENT#<documentId>
SK: METADATA
s3Key: <s3 path>
documentType: products | faqs | policies | guides
uploadedBy: <userId>
uploadedAt: ISO timestamp
status: uploaded | processing | indexed
```

## 🐛 Debugging

### View Logs

```bash
# CloudWatch Logs
aws logs tail /aws/lambda/bookstore-chatbot-send-message --follow

# Or via console
# https://console.aws.amazon.com/cloudwatch/home?region=ap-southeast-1#logsV2:log-groups
```

### Common Issues

1. **"Not authenticated" error**
   - Check JWT_SECRET matches backend
   - Verify token is not expired
   - Check token format

2. **Knowledge Base query fails**
   - Verify KNOWLEDGE_BASE_ID is set
   - Check IAM permissions for Bedrock
   - Ensure KB has data

3. **Can't send message back to client**
   - Check APIGW_ENDPOINT is correct
   - Verify Lambda has execute-api:ManageConnections permission
   - Connection might be stale (check TTL)

## 📚 Resources

- [AWS Lambda Node.js](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [API Gateway WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [Bedrock Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [AWS SDK v2 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)

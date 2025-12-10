# SƠ ĐỒ LUỒNG TÀI NGUYÊN HOẠT ĐỘNG CHATBOT
## AWS Bedrock RAG Chatbot - Kiến Trúc Đầy Đủ

---

## 📊 SƠ ĐỒ TỔNG QUAN

```mermaid
graph TB
    subgraph "1. USER LAYER - Người dùng"
        A[👤 Web Browser<br/>React Frontend]
    end
    
    subgraph "2. API GATEWAY - Cổng vào"
        B[🔌 API Gateway WebSocket<br/>wss://xxx.execute-api.region.amazonaws.com/prod]
        B1[Route: $connect]
        B2[Route: $disconnect]
        B3[Route: $default]
    end
    
    subgraph "3. AUTHENTICATION - Xác thực"
        C[🔐 AWS Secrets Manager<br/>JWT Secret Token]
    end
    
    subgraph "4. LAMBDA FUNCTIONS - Xử lý logic"
        D1[📥 Lambda: Connect<br/>Thiết lập kết nối<br/>256MB - 10s timeout]
        D2[📤 Lambda: Disconnect<br/>Đóng kết nối<br/>256MB - 10s timeout]
        D3[💬 Lambda: Send Message<br/>Xử lý tin nhắn chính<br/>1024MB - 30s timeout]
        D4[📤 Lambda: Upload Document<br/>Tải tài liệu lên KB<br/>512MB - 60s timeout]
        D5[📦 Lambda Layer<br/>Shared Utilities]
    end
    
    subgraph "5. DATA STORAGE - Lưu trữ dữ liệu"
        E1[(🗄️ DynamoDB Table<br/>BookStore<br/>Connection tracking<br/>User sessions)]
        E2[🪣 S3 Bucket<br/>chatbot-kb-{account-id}<br/>Knowledge Base Documents<br/>Versioning enabled]
    end
    
    subgraph "6. AI PROCESSING - Xử lý AI"
        F1[🧠 AWS Bedrock<br/>Foundation Models]
        F2[📚 Knowledge Base<br/>RAG - Retrieval Augmented<br/>Generation]
        F3[🔍 Vector Search<br/>OpenSearch Serverless]
    end
    
    subgraph "7. MONITORING - Giám sát"
        G[📊 CloudWatch Logs<br/>Lambda execution logs<br/>7-14 days retention]
    end
    
    subgraph "8. RESPONSE - Phản hồi"
        H[⚡ API Gateway Management API<br/>POST @connections/{connectionId}]
    end

    %% Flow connections - Luồng kết nối
    A -->|1. WebSocket Connect| B
    B --> B1
    B --> B2
    B --> B3
    
    B1 -->|2. Invoke| D1
    B2 -->|Invoke| D2
    B3 -->|3. Invoke| D3
    
    D1 -.->|Validate Token| C
    D3 -.->|Validate Token| C
    D4 -.->|Validate Token| C
    
    D1 -->|4. Save connectionId| E1
    D2 -->|Delete connectionId| E1
    D3 -->|5. Query user session| E1
    
    D3 -->|6. Query with RAG| F2
    D4 -->|7. Upload docs| E2
    
    F2 -->|8. Retrieve context| F3
    F2 -->|9. Generate response| F1
    E2 -->|Index documents| F3
    
    D1 --> G
    D2 --> G
    D3 --> G
    D4 --> G
    
    F1 -->|10. AI Response| D3
    D3 -->|11. Send to client| H
    H -->|12. WebSocket Message| A
    
    D5 -.->|Used by| D1
    D5 -.->|Used by| D2
    D5 -.->|Used by| D3
    D5 -.->|Used by| D4

    style A fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    style B fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style C fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    style D3 fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px
    style E1 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style E2 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style F1 fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style F2 fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style H fill:#e0f2f1,stroke:#004d40,stroke-width:2px
```

---

## 🔄 LUỒNG HOẠT ĐỘNG CHI TIẾT

### **BƯỚC 1-2: KẾT NỐI (Connection Phase)**

#### 📍 **1.1. User mở WebSocket từ Frontend**
```javascript
// Frontend code
const ws = new WebSocket('wss://xxx.execute-api.ap-southeast-1.amazonaws.com/prod?token=JWT_TOKEN');
```

**Chi tiết:**
- User click vào chatbot icon trên website React
- Frontend tạo WebSocket connection với token JWT trong query parameter
- Token này được lấy từ localStorage sau khi user đăng nhập thành công

#### 📍 **1.2. API Gateway nhận request**
```
API Gateway WebSocket API ID: abc123xyz
Route: $connect → Lambda: chatbot-connect
```

**Tài nguyên AWS:**
- `aws_apigatewayv2_api.chatbot` - WebSocket API chính
- `aws_apigatewayv2_route.connect` - Route xử lý $connect event
- `aws_apigatewayv2_integration.connect` - Tích hợp với Lambda

**Thông số:**
- Protocol: `WEBSOCKET`
- Route Selection Expression: `$request.body.type`
- Auto Deploy: `true`

#### 📍 **1.3. Lambda Connect Handler được trigger**

**Mã hóa Lambda:**
```javascript
// File: chatbot/lambda/connect/index.js
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;
  
  // 1. Validate JWT token
  const user = await validateToken(token);
  
  // 2. Save connection to DynamoDB
  await dynamodb.put({
    TableName: 'BookStore',
    Item: {
      PK: `CONNECTION#${connectionId}`,
      SK: `USER#${user.id}`,
      connectionId,
      userId: user.id,
      userEmail: user.email,
      connectedAt: new Date().toISOString(),
      TTL: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    }
  });
  
  return { statusCode: 200, body: 'Connected' };
};
```

**Tài nguyên sử dụng:**
- ✅ **Lambda**: `bookstore-chatbot-connect`
  - Runtime: Node.js 18.x
  - Memory: 256 MB
  - Timeout: 10 seconds
  - IAM Role: Có quyền DynamoDB PutItem, Secrets Manager GetSecretValue

- ✅ **DynamoDB**: Table `BookStore`
  - Lưu mapping: `connectionId ↔ userId`
  - GSI: Query connections by userId
  - TTL: Auto delete sau 24 giờ

- ✅ **Secrets Manager**: Secret `bookstore/jwt-secret`
  - Chứa JWT_SECRET để verify token

**CloudWatch Logs:**
```
Log Group: /aws/lambda/bookstore-chatbot-connect
Retention: 7 days
```

---

### **BƯỚC 3-6: GỬI TIN NHẮN (Message Phase)**

#### 📍 **3.1. User gửi tin nhắn**
```javascript
// Frontend sends message
ws.send(JSON.stringify({
  type: 'message',
  data: {
    message: 'Giới thiệu về sách Harry Potter?',
    conversationId: 'conv-123',
    useRAG: true
  }
}));
```

#### 📍 **3.2. API Gateway route $default**
```
Route: $default → Lambda: chatbot-send-message
```

#### 📍 **3.3. Lambda Send Message - XỬ LÝ CHÍNH**

**Đây là Lambda quan trọng nhất!**

```javascript
// File: chatbot/lambda/send-message/index.js
const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body);
  
  // 1️⃣ LẤY THÔNG TIN USER TỪ DYNAMODB
  const connection = await dynamodb.get({
    TableName: 'BookStore',
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `USER#${connection.userId}`
    }
  });
  
  const userId = connection.userId;
  
  // 2️⃣ CHUẨN BỊ CONTEXT - Lấy lịch sử chat
  const conversationHistory = await getConversationHistory(userId, body.conversationId);
  
  // 3️⃣ GỌI BEDROCK RAG
  const bedrockClient = new BedrockAgentRuntimeClient({ region: 'ap-southeast-1' });
  
  const ragCommand = new RetrieveAndGenerateCommand({
    input: {
      text: body.message
    },
    retrieveAndGenerateConfiguration: {
      type: 'KNOWLEDGE_BASE',
      knowledgeBaseConfiguration: {
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID, // Từ Terraform variable
        modelArn: 'arn:aws:bedrock:ap-southeast-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 5, // Lấy 5 documents liên quan nhất
            overrideSearchType: 'HYBRID' // Hybrid search: vector + keyword
          }
        },
        generationConfiguration: {
          promptTemplate: {
            textPromptTemplate: `Bạn là trợ lý thông minh của bookstore. 
            Dựa vào context sau để trả lời:
            
            <context>
            $search_results$
            </context>
            
            Lịch sử chat:
            ${conversationHistory}
            
            Câu hỏi: $query$
            
            Trả lời ngắn gọn, thân thiện bằng tiếng Việt.`
          }
        }
      }
    }
  });
  
  const ragResponse = await bedrockClient.send(ragCommand);
  
  // 4️⃣ LƯU VÀO DYNAMODB (Chat history)
  await saveChatMessage({
    userId,
    conversationId: body.conversationId,
    userMessage: body.message,
    botResponse: ragResponse.output.text,
    citations: ragResponse.citations, // Nguồn trích dẫn từ KB
    timestamp: new Date().toISOString()
  });
  
  // 5️⃣ GỬI PHẢN HỒI VỀ CLIENT qua WebSocket
  const apigwClient = new ApiGatewayManagementApiClient({
    endpoint: process.env.APIGW_ENDPOINT
  });
  
  await apigwClient.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: 'response',
      data: {
        message: ragResponse.output.text,
        citations: ragResponse.citations,
        conversationId: body.conversationId
      }
    })
  }));
  
  return { statusCode: 200 };
};
```

**Tài nguyên sử dụng:**

✅ **Lambda**: `bookstore-chatbot-send-message`
- Runtime: Node.js 18.x
- Memory: **1024 MB** (cần nhiều RAM cho AI processing)
- Timeout: **30 seconds** (RAG mất thời gian)
- Environment Variables:
  - `TABLE_NAME`: BookStore
  - `JWT_SECRET`: (từ Secrets Manager)
  - `KNOWLEDGE_BASE_ID`: kb-xxx123xxx (manual setup)
  - `APIGW_ENDPOINT`: https://xxx.execute-api.region.amazonaws.com/prod

✅ **AWS Bedrock**:
- **Foundation Model**: `anthropic.claude-3-sonnet-20240229-v1:0`
- **API**: `RetrieveAndGenerate` (RAG API)
- **Cost**: ~$0.003 per 1000 input tokens, $0.015 per 1000 output tokens

✅ **Knowledge Base**:
- **Type**: Bedrock Knowledge Base
- **Vector Store**: OpenSearch Serverless
- **Embedding Model**: `amazon.titan-embed-text-v1`
- **Data Source**: S3 bucket `bookstore-chatbot-kb-{account-id}`

✅ **IAM Permissions** (Lambda Role cần có):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "execute-api:ManageConnections",
      "Resource": "arn:aws:execute-api:*:*:*/@connections/*"
    }
  ]
}
```

---

### **BƯỚC 7-9: TẢI TÀI LIỆU (Document Upload Phase)**

#### 📍 **7.1. Admin upload tài liệu mới**
```javascript
// Frontend admin panel
ws.send(JSON.stringify({
  type: 'uploadDocument',
  data: {
    fileName: 'harry-potter-review.pdf',
    fileContent: base64Content,
    metadata: {
      category: 'book-review',
      tags: ['fantasy', 'bestseller']
    }
  }
}));
```

#### 📍 **7.2. Lambda Upload Document**

```javascript
// File: chatbot/lambda/upload-document/index.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { BedrockAgentClient, StartIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  
  // 1. Upload to S3
  const s3Client = new S3Client({ region: 'ap-southeast-1' });
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.KB_BUCKET_NAME,
    Key: `documents/${body.fileName}`,
    Body: Buffer.from(body.fileContent, 'base64'),
    Metadata: body.metadata
  }));
  
  // 2. Trigger Knowledge Base sync (Ingestion Job)
  const bedrockClient = new BedrockAgentClient({ region: 'ap-southeast-1' });
  await bedrockClient.send(new StartIngestionJobCommand({
    knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
    dataSourceId: 'xxx' // Data source ID
  }));
  
  return { statusCode: 200, body: 'Document uploaded and indexing started' };
};
```

**Quá trình Indexing:**
1. S3 trigger → Bedrock Knowledge Base
2. Bedrock đọc file PDF/TXT/DOCX
3. Chia nhỏ thành chunks (~500 tokens/chunk)
4. Convert sang embeddings (vector 1536 dimensions)
5. Lưu vào OpenSearch Serverless
6. Sẵn sàng cho RAG queries

**Tài nguyên:**
- ✅ **S3 Bucket**: `bookstore-chatbot-kb-{account-id}`
  - Versioning: Enabled
  - Lifecycle: Delete old versions after 90 days
  - Structure:
    ```
    documents/
      ├── book-reviews/
      ├── product-info/
      └── faq/
    ```

- ✅ **OpenSearch Serverless**:
  - Type: Vector engine
  - OCU (OpenSearch Compute Units): Auto-scaling
  - Index settings:
    - Dimensions: 1536
    - Similarity: Cosine

---

### **BƯỚC 10-12: PHẢN HỒI (Response Phase)**

#### 📍 **10. Bedrock trả về kết quả**
```json
{
  "output": {
    "text": "Harry Potter là series sách fantasy nổi tiếng của J.K. Rowling..."
  },
  "citations": [
    {
      "retrievedReferences": [
        {
          "content": { "text": "Harry Potter is a series of seven fantasy novels..." },
          "location": { "s3Location": { "uri": "s3://bucket/documents/hp-review.pdf" } }
        }
      ]
    }
  ]
}
```

#### 📍 **11. Lambda gửi về client qua API Gateway Management API**
```javascript
POST https://abc123.execute-api.ap-southeast-1.amazonaws.com/prod/@connections/{connectionId}

Body: {
  "type": "response",
  "data": {
    "message": "...",
    "citations": [...]
  }
}
```

#### 📍 **12. Frontend nhận tin nhắn**
```javascript
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  // Hiển thị tin nhắn trong UI
  displayBotMessage(response.data.message);
};
```

---

## 📊 TÀI NGUYÊN AWS VÀ CHI PHÍ

### **Tài nguyên chính:**

| Dịch vụ | Resource | Cấu hình | Chi phí/tháng (ước tính) |
|---------|----------|----------|--------------------------|
| **API Gateway** | WebSocket API | 1 API, ~10K connections/month | ~$1 |
| **Lambda** | 4 functions | Connect, Disconnect, SendMessage, Upload | ~$5 |
| **DynamoDB** | BookStore table | On-demand, ~100K requests/month | ~$1 |
| **S3** | KB bucket | ~10 GB storage, ~1K uploads/month | ~$0.5 |
| **Bedrock** | Claude 3 Sonnet | ~50K tokens/day | ~$15 |
| **OpenSearch Serverless** | Vector store | 2 OCU minimum | ~$140 |
| **CloudWatch** | Logs | 5 log groups, 7-14 days retention | ~$2 |
| **Secrets Manager** | JWT secret | 1 secret | ~$0.5 |
| **TOTAL** | | | **~$165/month** |

---

## 🔒 BẢO MẬT VÀ PHÂN QUYỀN

### **1. Authentication Flow:**
```
1. User login → Backend tạo JWT token
2. Frontend lưu token vào localStorage
3. WebSocket connect → Token trong query param
4. Lambda Connect → Validate token với JWT_SECRET
5. Nếu hợp lệ → Lưu connectionId vào DynamoDB
6. Nếu không → Return 401 Unauthorized
```

### **2. IAM Roles:**

**Lambda Execution Role:**
```yaml
Policies:
  - AWSLambdaBasicExecutionRole (CloudWatch Logs)
  - Custom Policy:
      - DynamoDB: GetItem, PutItem, Query, UpdateItem
      - Bedrock: InvokeModel, Retrieve, RetrieveAndGenerate
      - S3: GetObject, PutObject (KB bucket only)
      - Secrets Manager: GetSecretValue
      - API Gateway: ManageConnections
```

### **3. Network Security:**
- Lambda trong VPC: ❌ (không cần, vì dùng AWS managed services)
- S3 Bucket: Private, chỉ Lambda access
- DynamoDB: VPC Endpoint (nếu cần)

---

## 📈 MONITORING VÀ LOGGING

### **CloudWatch Log Groups:**
```
/aws/lambda/bookstore-chatbot-connect        → 7 days
/aws/lambda/bookstore-chatbot-disconnect     → 7 days
/aws/lambda/bookstore-chatbot-send-message   → 14 days
/aws/lambda/bookstore-chatbot-upload-document → 7 days
```

### **Key Metrics to Monitor:**
- Lambda duration (p50, p99)
- Lambda errors / throttles
- API Gateway WebSocket connections count
- DynamoDB consumed capacity
- Bedrock API latency
- S3 upload success rate

### **Alarms:**
```yaml
- LambdaSendMessageErrors > 5 in 5 minutes
- LambdaDurationP99 > 25 seconds
- APIGatewayConnectionErrors > 10 in 5 minutes
- DynamoDBThrottling > 0
```

---

## 🚀 DEPLOYMENT WORKFLOW

### **Terraform Deployment:**
```bash
# 1. Deploy infrastructure
cd infrastructure/terraform/chatbot-only
terraform init
terraform plan
terraform apply

# 2. Install Lambda dependencies
cd ../../../chatbot/lambda
cd connect && npm install && cd ..
cd disconnect && npm install && cd ..
cd send-message && npm install && cd ..
cd upload-document && npm install && cd ..

# 3. Create Bedrock Knowledge Base (MANUAL - không thể dùng Terraform)
# - Go to AWS Console → Bedrock → Knowledge Bases
# - Create new KB
# - Select S3 bucket: bookstore-chatbot-kb-{account-id}
# - Choose embedding model: amazon.titan-embed-text-v1
# - Copy Knowledge Base ID

# 4. Update terraform.tfvars
echo 'knowledge_base_id = "KB1234567890"' >> terraform.tfvars
terraform apply

# 5. Test WebSocket
wscat -c "wss://xxx.execute-api.ap-southeast-1.amazonaws.com/prod?token=YOUR_JWT"
```

---

## 🎯 CÁCH HOẠT ĐỘNG RAG (Retrieval Augmented Generation)

### **RAG Pipeline:**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUESTION                             │
│          "Giới thiệu về sách Harry Potter?"                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  1. EMBEDDING CONVERSION                     │
│   Question → Vector (1536 dimensions)                        │
│   Model: amazon.titan-embed-text-v1                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 2. VECTOR SIMILARITY SEARCH                  │
│   Search in OpenSearch Serverless                            │
│   Similarity: Cosine                                         │
│   Top K: 5 results                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  3. RETRIEVE DOCUMENTS                       │
│   Doc 1: harry-potter-intro.pdf (score: 0.95)               │
│   Doc 2: hp-reviews.txt (score: 0.89)                        │
│   Doc 3: fantasy-books.md (score: 0.75)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   4. AUGMENT PROMPT                          │
│   Original prompt + Retrieved context                        │
│   "Dựa vào context: <doc1><doc2><doc3>"                     │
│   "Trả lời câu hỏi: ..."                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  5. GENERATE RESPONSE                        │
│   Model: Claude 3 Sonnet                                     │
│   Temperature: 0.7                                           │
│   Output: Grounded answer với citations                     │
└─────────────────────────────────────────────────────────────┘
```

### **Tại sao dùng RAG?**

✅ **Accuracy**: Trả lời dựa trên dữ liệu thật, không hallucination
✅ **Up-to-date**: Có thể update knowledge base bất cứ lúc nào
✅ **Citations**: Cung cấp nguồn tham khảo (trích dẫn)
✅ **Domain-specific**: Chuyên biệt cho bookstore data

---

## 📚 CÁC BƯỚC TIẾP THEO

### **Để test chatbot:**

1. ✅ Deploy infrastructure
2. ✅ Create Knowledge Base manually
3. ✅ Upload sample documents to S3
4. ✅ Update `knowledge_base_id` in terraform.tfvars
5. ✅ Re-deploy Lambda với new env var
6. 🔄 Test WebSocket connection
7. 🔄 Send test messages
8. 🔄 Verify RAG responses

### **Frontend Integration:**

```javascript
// src/contexts/ChatbotContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const ChatbotContext = createContext();

export const ChatbotProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const websocket = new WebSocket(
      `${process.env.REACT_APP_CHATBOT_WS_URL}?token=${token}`
    );
    
    websocket.onopen = () => {
      console.log('Chatbot connected');
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: data.data.message,
        citations: data.data.citations,
        timestamp: new Date()
      }]);
    };
    
    websocket.onclose = () => {
      setIsConnected(false);
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, []);
  
  const sendMessage = (message) => {
    if (!ws || !isConnected) return;
    
    setMessages(prev => [...prev, {
      type: 'user',
      text: message,
      timestamp: new Date()
    }]);
    
    ws.send(JSON.stringify({
      type: 'message',
      data: {
        message,
        useRAG: true,
        conversationId: `conv-${Date.now()}`
      }
    }));
  };
  
  return (
    <ChatbotContext.Provider value={{ messages, sendMessage, isConnected }}>
      {children}
    </ChatbotContext.Provider>
  );
};
```

---

## 🎓 KẾT LUẬN

Chatbot này sử dụng **kiến trúc serverless hiện đại** với:

✅ **WebSocket** cho real-time communication
✅ **Lambda** cho serverless compute
✅ **DynamoDB** cho session management
✅ **S3 + Bedrock Knowledge Base** cho RAG
✅ **Claude 3 Sonnet** cho AI generation
✅ **OpenSearch Serverless** cho vector search

**Ưu điểm:**
- ⚡ Scalable tự động
- 💰 Pay-per-use (chỉ trả tiền khi dùng)
- 🔒 Bảo mật cao với IAM roles
- 🧠 AI thông minh với RAG
- 📊 Monitoring đầy đủ với CloudWatch

**Hạn chế:**
- 💸 OpenSearch Serverless khá đắt (~$140/month minimum)
- 🕐 Lambda cold start (~1-2s)
- 📝 Knowledge Base phải tạo manual (không dùng Terraform được)

---

**Tài liệu tham khảo:**
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [API Gateway WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [Knowledge Base RAG](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)

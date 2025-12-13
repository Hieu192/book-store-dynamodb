#  HỆ THỐNG QUẢN LÝ SÁCH TRỰC TUYẾN

##  TỔNG QUAN

Ứng dụng web full-stack cho hệ thống quản lý và bán sách trực tuyến với kiến trúc production-ready trên AWS.

###  Kiến Trúc Production
- **Frontend**: React.js + Tailwind CSS → S3 + CloudFront (CDN global)
- **Backend**: Node.js + Express.js → ECS Fargate (Auto-scaling 1-4 tasks), Lambda (resize image)
- **WebSocket**: Real-time notifications → ALB (Sticky Sessions)
- **AI Chatbot**: AWS Bedrock (Claude 3) + Lambda + API Gateway WebSocket + Knowledge Base (RAG)
- **Database**: AWS DynamoDB (Single-Table Design, On-Demand)
- **Cache**: AWS ElastiCache Redis (Sessions, API cache)
- **Storage**: AWS S3 (Uploads, Static files, Vector data source)
- **Infrastructure**: Terraform (Infrastructure as Code)

![alt text](md/image.png)

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Backend Architecture (Clean Architecture)

![alt text](md/backend/image.png)

```
┌─────────────────────────────────────────┐
│         Controllers Layer               │
│  (HTTP Request/Response Handling)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Services Layer                  │
│  (Business Logic & Validation)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Repository Pattern                 │
│  (Database Abstraction Interface)       │
└──────────────┬──────────────────────────┘
               │
               ▼
        ┌─────────────┐
        │  DynamoDB   │ ◄──── Production Database
        │ Repository  │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  DynamoDB   │
        │   + GSI1    │
        │   + GSI2    │
        └─────────────┘
               │
        ┌──────▼──────┐
        │ CloudFront  │ ◄──── CDN for Images
        │     CDN     │
        └─────────────┘
```

### Infrastructure Routing Logic
- **Frontend (`/*`)**: CloudFront -> S3 Bucket (Static Files)
- **Backend (`/api/*`)**: CloudFront -> ALB -> ECS Fargate (API)
- **Lợi ích**: Chung domain (không CORS), bảo mật cao (Backend ẩn sau CDN).

---

## 📁 CẤU TRÚC THỨ MỤC

### Backend Structure
```
backend/
├── config/           # Cấu hình AWS, DynamoDB, JWT, environment
├── controllers/      # Xử lý HTTP requests
├── services/         # Business logic layer
├── repositories/     # Database abstraction
│   ├── interfaces/   # Repository interfaces
│   └── dynamodb/     # DynamoDB implementation (ACTIVE)
├── routes/           # API endpoints
├── middlewares/      # Authentication, error handling
├── utils/            # Helper functions (s3Upload, apiFeatures)
├── scripts/          # Utility scripts (create-table, seed-data)
└── tests/            # Test suites
    ├── unit/
    ├── integration/
    └── performance/
```

### Frontend Structure
```
frontend/
├── public/           # Static assets
└── src/
    ├── components/   # React components
    │   ├── layout/   # Layout components
    │   ├── product/  # Product components
    │   └── user/     # User components
    ├── pages/        # Page components
    ├── utils/        # Helper functions
    └── App.js        # Main app component
```

---

## 🔑 TÍNH NĂNG CHÍNH

### 1. Quản lý Sản phẩm (Products)
- ✅ CRUD operations cho sách
- ✅ Tìm kiếm tiếng Việt thông minh (có dấu & không dấu)
- ✅ Autocomplete với gợi ý sản phẩm
- ✅ Lọc theo giá, danh mục, đánh giá
- ✅ Sắp xếp theo giá (tăng/giảm dần)
- ✅ Phân trang
- ✅ Upload và quản lý hình ảnh (S3 + CloudFront)
- ✅ Quản lý tồn kho
- ✅ Đánh giá và review sản phẩm
- ✅ Hệ thống đề xuất sản phẩm
- ✅ Cache API

### 2. Quản lý Người dùng (Users)
- ✅ Đăng ký và đăng nhập
- ✅ Đăng nhập với Google OAuth 2.0
- ✅ JWT authentication
- ✅ Phân quyền (User/Admin)
- ✅ Quản lý profile
- ✅ Đổi mật khẩu
- ✅ Quên mật khẩu (email reset)

### 3. Quản lý Đơn hàng (Orders)
- ✅ Tạo đơn hàng
- ✅ Theo dõi trạng thái đơn hàng
- ✅ Lịch sử đơn hàng
- ✅ Quản lý thanh toán
- ✅ Cập nhật trạng thái giao hàng

### 4. Quản lý Danh mục (Categories)
- ✅ CRUD operations
- ✅ Phân loại sách theo thể loại
- ✅ Lọc sản phẩm theo danh mục

### 5. Giỏ hàng (Cart)
- ✅ Thêm/xóa sản phẩm
- ✅ Cập nhật số lượng
- ✅ Tính toán tổng tiền
- ✅ Áp dụng mã giảm giá
- ✅ Tự động xóa giỏ hàng sau khi đặt hàng thành công

### 6. Thông báo Real-time (WebSocket)
- ✅ Thông báo đơn hàng mới
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Thông báo giao hàng thành công
- ✅ Icon chuông với badge số lượng
- ✅ Dropdown hiển thị lịch sử thông báo

### 7. AI Chatbot (Powered by AWS Bedrock)
- ✅ **Tư vấn sản phẩm thông minh** (RAG - Retrieval Augmented Generation)
  - Tìm kiếm sách qua Knowledge Base (Vector Search)
  - Gợi ý sách dựa trên sở thích và ngữ cảnh hội thoại
  - Trả lời câu hỏi về thông tin sách (tác giả, giá, tình trạng kho)
  
- ✅ **Tra cứu đơn hàng** (Function Calling/Tool Use)
  - Xem lịch sử đơn hàng của người dùng
  - Kiểm tra trạng thái đơn hàng cụ thể
  - Tích hợp với Backend API (tái sử dụng `/api/v1/orders`)
  
- ✅ **Xác thực & Bảo mật**
  - JWT Authentication qua WebSocket
  - Phân quyền truy cập dữ liệu đơn hàng
  - Không lộ thông tin người dùng khác
  
- ✅ **Hội thoại đa lượt** (Conversation Memory)
  - Lưu lịch sử chat trong DynamoDB
  - AI nhớ ngữ cảnh cuộc trò chuyện
  - Trả lời tiếng Việt tự nhiên
  
- ✅ **Serverless Architecture**
  - API Gateway WebSocket
  - Lambda Functions (Connect, Disconnect, Send Message)
  - Amazon Bedrock (Model: Claude 3 / Nova Lite)
  - Knowledge Base (OpenSearch Serverless)
  
- ✅ **ETL Pipeline tự động**
  - DynamoDB Stream → Lambda ETL → S3 → Bedrock Sync
  - Tự động cập nhật kiến thức khi có sản phẩm mới

---

## 🚀 HIỆU SUẤT & TESTING

### Performance Benchmarks
```
Response Time Standards:
- Excellent: < 100ms
- Good: 100-300ms
- Fair: 300-500ms
- Poor: > 500ms
```

### Test Coverage
- **Total Tests**: 185 passing
- **Code Coverage**: 85.47%
- **Test Types**:
  - Unit Tests
  - Integration Tests
  - Performance Tests
  - Stress Tests

### Performance Testing Tools
```bash
npm run test:performance  # Chạy performance tests
npm run perf:report      # Tạo báo cáo chi tiết
npm run perf:stress      # Stress testing
npm run perf:baseline    # Tạo baseline
npm run perf:compare     # So sánh với baseline
```

---

## 💾 DATABASE DESIGN

### DynamoDB (Production)

**Single-Table Design với 2 GSIs:**

```
Table: BookStore
Primary Key: PK + SK
GSI1: GSI1PK + GSI1SK (Category, Email, User relationships)
GSI2: GSI2PK + GSI2SK (Status, Price, Stock filtering)
```

**Entity Types:**
- Products: `PK=PRODUCT#<id>`, `SK=METADATA`
- Reviews: `PK=PRODUCT#<id>`, `SK=REVIEW#<userId>`
- Users: `PK=USER#<id>`, `SK=METADATA`
- Orders: `PK=ORDER#<id>`, `SK=METADATA`
- Order Items: `PK=ORDER#<id>`, `SK=ITEM#<productId>`
- Categories: `PK=CATEGORY#<id>`, `SK=METADATA`

**Access Patterns được hỗ trợ (23 patterns):**
- Get product by ID (~10ms)
- List products by category (~50ms)
- Search products by keyword
- Filter by price range
- Get user orders (~30ms)
- Get order details
- List reviews by product
- ... và nhiều patterns khác

---

## 📊 API ENDPOINTS

### Products API
```
GET    /api/v1/products              # Lấy danh sách sản phẩm
GET    /api/v1/product/:id           # Lấy chi tiết sản phẩm
POST   /api/v1/admin/product/new     # Tạo sản phẩm mới (Admin)
PUT    /api/v1/admin/product/:id     # Cập nhật sản phẩm (Admin)
DELETE /api/v1/admin/product/:id     # Xóa sản phẩm (Admin)
PUT    /api/v1/review                # Thêm/Sửa review
```

### Users API
```
POST   /api/v1/register              # Đăng ký
POST   /api/v1/login                 # Đăng nhập
POST   /api/v1/loginWithGoogle       # Đăng nhập với Google OAuth
GET    /api/v1/me                    # Lấy profile
PUT    /api/v1/me/update             # Cập nhật profile
PUT    /api/v1/password/update       # Đổi mật khẩu
```

### Orders API
```
GET    /api/v1/orders/me             # Lấy danh sách đơn hàng của tôi
GET    /api/v1/order/:id             # Chi tiết đơn hàng
POST   /api/v1/order/new             # Tạo đơn hàng
PUT    /api/v1/admin/order/:id       # Cập nhật đơn hàng (Admin)
```

### Categories API
```
GET    /api/v1/categories            # Lấy danh sách danh mục
POST   /api/v1/admin/category/new    # Tạo danh mục (Admin)
DELETE /api/v1/admin/category/:id    # Xóa danh mục (Admin)
```

### Chatbot API (WebSocket)
```
WebSocket: wss://<api-gateway-endpoint>/prod

Message Types:
1. authenticate    # Xác thực người dùng với JWT token
   { "type": "authenticate", "token": "<jwt_token>" }

2. chat_message    # Gửi tin nhắn chat
   { "type": "chat_message", "message": "Tìm sách trinh thám", "conversationId": "<id>" }

3. ping            # Keep-alive connection
   { "type": "ping" }

Response Types:
- message_received  # Xác nhận đã nhận tin nhắn
- bot_response      # Phản hồi từ AI
- error            # Thông báo lỗi
```

---

## 📁 CẤU TRÚC CHI TIẾT

### Chatbot Structure
```
chatbot/
├── lambda/
│   ├── connect/              # WebSocket connection handler
│   ├── disconnect/           # WebSocket disconnect handler
│   ├── send-message/         # Main chat processing
│   └── shared/               # Shared code (Layer)
│       ├── auth.js           # JWT verification
│       ├── bedrock.js        # AI interaction & Function Calling
│       ├── dynamodb.js       # Database helpers
│       ├── utils.js          # Utility functions
│       ├── prompts/          # Modular system prompts
│       │   ├── persona.js
│       │   ├── productRecommendations.js
│       │   ├── orderManagement.js
│       │   └── securityRules.js
│       └── tools/            # Function Calling tool definitions
│           └── orderTools.js
└── scripts/                  # Knowledge Base management scripts
```


---

## 🛠️ SETUP & DEPLOYMENT

### Local Development
Để chạy dự án ở môi trường local:

```bash
# 1. Khởi chạy Infrastructure (DB + Redis)

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run dev

# 3. Frontend
cd frontend
npm install
npm start
```

### Environment Variables
```env
# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_TABLE_NAME=BookStore

# S3 & CloudFront
S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_DOMAIN=your-domain.cloudfront.net

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

# Chatbot (Lambda Environment)
KNOWLEDGE_BASE_ID=your-kb-id
BACKEND_API_URL=https://your-alb-dns/api/v1
TABLE_NAME=BookStore
APIGW_ENDPOINT=https://api-id.execute-api.region.amazonaws.com/prod

# Server
PORT=4000
NODE_ENV=production
```

### Production Deployment

Quy trình deploy được tự động hóa hoàn toàn bằng scripts:

#### Bước 1: Provisioning Infrastructure (Terraform)
Tạo toàn bộ hạ tầng AWS (VPC, ECS, RDS, S3, CloudFront...):
```bash
cd infrastructure/terraform
terraform init
terraform apply
```

#### Bước 2: Deploy Backend
Build Docker image, push lên ECR và update ECS Service:
```bash
./scripts/deploy-backend.sh
```

#### Bước 3: Deploy Frontend
Build React app, upload lên S3 và invalidate CloudFront cache:
```bash
./scripts/deploy-frontend.sh
```

#### Bước 4: Deploy Chatbot (Serverless)
Deploy Lambda functions và API Gateway WebSocket:
```bash
cd infrastructure/terraform/chatbot-only
terraform init
terraform apply

# Build và upload Lambda Layer
cd ../../../chatbot/lambda
./build-layer.ps1

# Deploy Lambda functions
cd ../../infrastructure/terraform/chatbot-only
terraform apply
```

#### Bước 5: Setup Knowledge Base
Upload dữ liệu sản phẩm và đồng bộ với Bedrock:
```bash
cd chatbot/scripts
node upload-documents.js
# Sau đó vào AWS Console → Bedrock → Knowledge Base → Sync
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# Backend CI/CD
- Trigger: Push to main branch
- Steps:
  1. Run tests (Jest)
  2. Build Docker image
  3. Push to Amazon ECR
  4. Update ECS Service
  5. Invalidate cache

# Frontend CI/CD  
- Trigger: Push to main branch (frontend changes)
- Steps:
  1. Build React app
  2. Upload to S3
  3. Invalidate CloudFront cache
```

---

## 📊 Monitoring & Logging

### CloudWatch Metrics
- ECS Task CPU/Memory utilization
- ALB Request count & latency
- DynamoDB Read/Write capacity
- Lambda invocation count & duration
- API Gateway WebSocket connections

### CloudWatch Logs
- Backend application logs: `/aws/ecs/backend-production`
- Lambda function logs: `/aws/lambda/chatbot-*`
- VPC Flow logs: `/aws/vpc/flowlogs`

---

## 🎯 Roadmap & Future Enhancements

### Chatbot Improvements
- [ ] Multi-modal search (Image recognition)
- [ ] Voice shopping (Text-to-Speech)
- [ ] Sentiment analysis & human handover
- [ ] Abandoned cart recovery
- [ ] Personalized recommendations based on purchase history
- [ ] Upsell & Cross-sell automation

### Backend Improvements
- [ ] GraphQL API
- [ ] Advanced analytics dashboard
- [ ] Recommendation engine (ML-based)
- [ ] Loyalty program

---

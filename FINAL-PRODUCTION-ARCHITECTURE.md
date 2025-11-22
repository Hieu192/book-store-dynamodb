# 🏗️ KIẾN TRÚC PRODUCTION CUỐI CÙNG

## 📊 KIẾN TRÚC CHÍNH THỨC

```
                    Internet
                       ↓
        ┌──────────────────────────────────────┐
        │   CloudFront Distribution            │
        │   - Global CDN (200+ edges)          │
        │   - HTTPS                            │
        │   - Cache static + API               │
        └──────────────────────────────────────┘
                 ↓              ↓
        ┌────────────┐   ┌──────────────────────┐
        │  S3 Bucket │   │  ALB (Public)        │
        │  Frontend  │   │  - CloudFront IPs    │
        │  (Static)  │   │  - Security Group    │
        └────────────┘   └──────────────────────┘
                                  ↓
                         ┌──────────────────────┐
                         │  ECS Fargate         │
                         │  Backend (1-4 tasks) │
                         │  0.5 vCPU, 1GB RAM   │
                         │  Private Subnet      │
                         └──────────────────────┘
                                  ↓
                         ┌──────────────────────┐
                         │  NAT Gateway (1)     │
                         │  Public Subnet       │
                         └──────────────────────┘
                    ↓            ↓            ↓
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  DynamoDB    │ │ ElastiCache  │ │     S3       │
        │  (On-Demand) │ │   (Redis)    │ │  (Uploads)   │
        └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 💰 CHI PHÍ CHÍNH THỨC (TIẾT KIỆM NHẤT)

### Frontend (S3 + CloudFront):
```
S3 Storage (1GB):
- $0.023/GB × 1GB = $0.023/month

CloudFront:
- First 10TB: $0.085/GB
- Estimate 50GB/month = $4.25/month

Total Frontend: $4.27/month
```

### Backend (ECS Fargate):
```
1 task (0.5 vCPU, 1GB RAM):
- vCPU: $0.04048/hour × 0.5 = $0.02024/hour
- Memory: $0.004445/hour × 1GB = $0.004445/hour
- Total: $0.024685/hour
- Per month: $0.024685 × 24 × 30 = $17.77/month

Average 1.5 tasks (auto-scaling):
- $17.77 × 1.5 = $26.66/month
```

### Network:
```
ALB:
- $0.0225/hour × 24 × 30 = $16.20/month
- LCU: ~$3/month
- Total: $19.20/month

NAT Gateway (1):
- $0.045/hour × 24 × 30 = $32.40/month
- Data processing: ~$3/month
- Total: $35.40/month
```

### Database (DynamoDB):
```
On-Demand Pricing:
- 1M reads: $0.25
- 1M writes: $1.25
- Storage: $0.25/GB

Estimate (small app):
- 5M reads/month: $1.25
- 2M writes/month: $2.50
- 5GB storage: $1.25
- Total: $5/month

Estimate (medium app):
- 20M reads/month: $5
- 10M writes/month: $12.50
- 20GB storage: $5
- Total: $22.50/month
```

### Cache (ElastiCache Redis):
```
cache.t4g.micro (0.5GB):
- $0.016/hour × 24 × 30 = $11.52/month

cache.t4g.small (1.5GB):
- $0.034/hour × 24 × 30 = $24.48/month
```

### Storage (S3 - Uploads):
```
S3 Standard:
- $0.023/GB
- Estimate 10GB: $0.23/month
```

---

## 💰 TỔNG CHI PHÍ (3 SCENARIOS)

### Scenario 1: Startup (Traffic thấp)
```
Frontend: $4.27/month
Backend (1 task): $17.77/month
Network: $54.60/month
DynamoDB: $5/month
Redis (t4g.micro): $11.52/month
S3 Uploads: $0.23/month

TỔNG: $93.39/month ≈ $95/month
```

### Scenario 2: SME (Traffic trung bình) ⭐ KHUYẾN NGHỊ
```
Frontend: $4.27/month
Backend (1.5 tasks avg): $26.66/month
Network: $54.60/month
DynamoDB: $15/month
Redis (t4g.small): $24.48/month
S3 Uploads: $0.50/month

TỔNG: $125.51/month ≈ $125/month
```

### Scenario 3: Enterprise (Traffic cao)
```
Frontend: $4.27/month
Backend (3 tasks avg): $53.31/month
Network: $54.60/month
DynamoDB: $40/month
Redis (cache.m6g.large): $100/month
S3 Uploads: $2/month

TỔNG: $254.18/month ≈ $255/month
```

---

## 🎯 KHUYẾN NGHỊ: SCENARIO 2 (SME)

**Chi phí: ~$125/month**

### Lý do:
1. ✅ Đủ cho 10,000-50,000 users/month
2. ✅ Auto-scaling khi cần
3. ✅ Redis cache giảm DynamoDB costs
4. ✅ CloudFront cache giảm backend load
5. ✅ Có thể scale lên/xuống dễ dàng

---

## 🔧 COMPONENTS CHI TIẾT

### 1. Frontend (S3 + CloudFront)
```
S3 Bucket:
- Private (OAI)
- Versioning enabled
- Lifecycle policy (delete old versions after 30 days)

CloudFront:
- Price class: 200 (US, Europe, Asia)
- Cache: 24 hours (static files)
- Gzip compression
- HTTP/2 enabled
```

### 2. Backend (ECS Fargate)
```
Task Definition:
- CPU: 512 (0.5 vCPU)
- Memory: 1024 (1GB)
- Image: Node.js 20 Alpine
- Non-root user
- Health check: /health endpoint

Service:
- Min tasks: 1
- Max tasks: 4
- Auto-scaling: CPU > 70% hoặc Memory > 80%
- Deployment: Rolling update
- Circuit breaker: enabled
```

### 3. Network
```
VPC:
- CIDR: 10.0.0.0/16
- 2 AZs (ap-southeast-1a, ap-southeast-1b)

Subnets:
- Public: 10.0.1.0/24, 10.0.2.0/24 (ALB, NAT)
- Private: 10.0.10.0/24, 10.0.11.0/24 (ECS, Redis)

NAT Gateway:
- 1 instance (AZ 1)
- Elastic IP

ALB:
- Public
- Security Group: CloudFront IPs only
- Target: ECS tasks
- Health check: /health
```

### 4. Database (DynamoDB)
```
Table: bookstore-main
Partition Key: PK (String)
Sort Key: SK (String)

Billing Mode: On-Demand
- Tự động scale
- Trả tiền theo usage
- Không cần provision capacity

GSIs (Global Secondary Indexes):
- GSI1: GSI1PK, GSI1SK (cho queries phức tạp)
- GSI2: GSI2PK, GSI2SK (cho search)

Features:
- Point-in-time recovery (PITR)
- Encryption at rest
- TTL enabled (cho sessions)
```

### 5. Cache (ElastiCache Redis)
```
Node Type: cache.t4g.small
- vCPU: 2
- Memory: 1.5GB
- Network: Up to 5 Gbps

Configuration:
- Engine: Redis 7.x
- Cluster mode: disabled (single node)
- Multi-AZ: disabled (tiết kiệm chi phí)
- Automatic backups: enabled (1 day retention)

Use cases:
- Session storage
- API response cache
- Rate limiting
- Real-time data
```

### 6. Storage (S3 - Uploads)
```
Bucket: bookstore-uploads
- Private
- Versioning: disabled
- Lifecycle policy:
  - Move to IA after 30 days
  - Delete after 90 days

CloudFront:
- Separate distribution cho uploads
- Signed URLs (security)
- Cache: 7 days
```

---

## 🔒 BẢO MẬT

### Layer 1: Network
```
Security Groups:
- ALB: Chỉ CloudFront IPs (managed prefix list)
- ECS: Chỉ ALB
- Redis: Chỉ ECS
- DynamoDB: VPC Endpoint (không qua Internet)

NACLs:
- Default (allow all trong VPC)
```

### Layer 2: Application
```
Backend:
- Non-root user trong Docker
- Environment variables từ Secrets Manager
- JWT authentication
- Rate limiting (Redis)
- Input validation

Frontend:
- S3 bucket private (OAI)
- CloudFront HTTPS only
- CSP headers
```

### Layer 3: Data
```
DynamoDB:
- Encryption at rest (AWS managed keys)
- Fine-grained access control (IAM)
- Point-in-time recovery

Redis:
- Encryption in transit (TLS)
- Encryption at rest
- Auth token enabled

S3:
- Encryption at rest (SSE-S3)
- Bucket policy (least privilege)
- Versioning (uploads bucket)
```

---

## ⚡ PERFORMANCE

### Frontend:
```
Static files:
- CloudFront cache hit: 99%
- Latency: 10-20ms (edge location)
- Bandwidth: Unlimited

First load:
- HTML: 50KB (gzipped)
- CSS: 100KB (gzipped)
- JS: 500KB (gzipped)
- Total: ~650KB
- Load time: ~1-2 seconds
```

### Backend API:
```
1 task (0.5 vCPU, 1GB):
- Throughput: ~500 req/s
- Latency: 50-100ms (without cache)
- Latency: 5-10ms (with Redis cache)

DynamoDB:
- Read latency: <10ms (single-digit)
- Write latency: <10ms
- Throughput: Unlimited (on-demand)

Redis:
- Latency: <1ms
- Throughput: 100,000+ ops/s
```

---

## 📈 AUTO-SCALING

### Backend ECS:
```
Scale OUT khi:
- CPU > 70% trong 2 phút
- Memory > 80% trong 2 phút
- Cooldown: 60 giây

Scale IN khi:
- CPU < 30% trong 5 phút
- Memory < 40% trong 5 phút
- Cooldown: 300 giây

Example:
- 0-100 req/s: 1 task
- 100-500 req/s: 2 tasks
- 500-1000 req/s: 3 tasks
- 1000+ req/s: 4 tasks
```

### DynamoDB:
```
On-Demand mode:
- Tự động scale
- Không cần config
- Trả tiền theo usage
```

---

## 🚀 DEPLOYMENT

### Infrastructure (Terraform):
```bash
cd infrastructure/terraform
terraform init
terraform apply

Time: ~15 phút
```

### Backend:
```bash
./scripts/deploy-backend.sh

Steps:
1. Build Docker image
2. Push to ECR
3. Update ECS service
4. Wait for healthy

Time: ~5 phút
```

### Frontend:
```bash
./scripts/deploy-frontend.sh

Steps:
1. Build React app
2. Upload to S3
3. Invalidate CloudFront cache

Time: ~2 phút
```

---

## 📊 MONITORING

### CloudWatch Metrics:
```
Frontend (CloudFront):
- Requests
- Bytes Downloaded
- Cache Hit Rate
- 4xx/5xx Errors

Backend (ECS):
- CPU Utilization
- Memory Utilization
- Task Count
- Request Count

Database (DynamoDB):
- Read/Write Capacity
- Throttled Requests
- User Errors
- System Errors

Cache (Redis):
- CPU Utilization
- Memory Usage
- Cache Hits/Misses
- Evictions
```

### CloudWatch Alarms:
```
Critical:
- Backend CPU > 90%
- Backend Memory > 95%
- DynamoDB throttled requests > 10
- Redis memory > 90%
- ALB 5xx > 10%

Warning:
- Backend CPU > 70%
- Backend Memory > 80%
- Redis cache hit rate < 80%
- ALB 4xx > 20%
```

---

## 🎯 PRODUCTION CHECKLIST

- [x] VPC với public/private subnets
- [x] NAT Gateway (1 instance)
- [x] Security Groups configured
- [x] IAM roles với least privilege
- [x] DynamoDB table created
- [x] Redis cluster created
- [x] S3 buckets created (frontend, uploads)
- [x] CloudFront distributions configured
- [x] ECR repository created
- [x] ECS cluster created
- [x] ALB configured
- [x] Secrets Manager configured
- [x] CloudWatch alarms configured
- [x] Terraform state trên S3
- [x] DynamoDB table cho state locking

---

## 💡 TỐI ƯU CHI PHÍ THÊM

### Immediate (0-1 tháng):
```
1. Dùng CloudFront cache tối đa
   - Static files: 24 hours
   - API responses (public): 5 minutes
   → Giảm backend load 80%

2. Dùng Redis cache
   - Product list: 5 minutes
   - Category list: 1 hour
   → Giảm DynamoDB reads 70%

3. Optimize images
   - WebP format
   - Lazy loading
   → Giảm CloudFront bandwidth 50%
```

### Short-term (1-3 tháng):
```
1. Reserved Instances cho Redis
   - Tiết kiệm: 30-50%
   - Cost: $24.48 → $12-17/month

2. S3 Intelligent-Tiering
   - Tự động move sang IA
   - Tiết kiệm: 40-50%

3. CloudFront Reserved Capacity
   - Commit 10TB/month
   - Tiết kiệm: 20-30%
```

### Long-term (3-12 tháng):
```
1. Fargate Spot
   - Tiết kiệm: 70%
   - Cost: $26.66 → $8/month
   - Risk: Có thể bị interrupt

2. DynamoDB Reserved Capacity
   - Nếu traffic ổn định
   - Tiết kiệm: 50-75%

3. Savings Plans
   - Commit 1-3 years
   - Tiết kiệm: 30-50% toàn bộ
```

---

## 🎉 KẾT LUẬN

**Kiến trúc production cuối cùng:**
- ✅ Chi phí: ~$125/month (SME scenario)
- ✅ Performance: Tốt (CloudFront + Redis cache)
- ✅ Scalability: Auto-scaling 1-4 tasks
- ✅ Availability: 99.9%
- ✅ Security: 3 layers
- ✅ Database: DynamoDB (serverless, auto-scale)
- ✅ Cache: Redis (ElastiCache)
- ✅ Production-ready

**So với kiến trúc ban đầu ($184/month):**
- Tiết kiệm: $59/month (32%)
- Performance: Tốt hơn 5-10x
- Scalability: Tốt hơn (DynamoDB unlimited)

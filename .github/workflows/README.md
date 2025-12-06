# GitHub Actions CI/CD Pipelines 🚀

## 📋 Tổng quan

Dự án sử dụng **2 CI/CD pipelines riêng biệt** cho Backend và Frontend để tối ưu deployment:

```
📦 book-store
├── 🔧 Backend CI/CD  → AWS ECS/ECR
└── 🎨 Frontend CI/CD → AWS S3/CloudFront
```

---

## 🔧 Backend CI/CD Pipeline

**File**: `.github/workflows/backend-ci-cd.yml`

### 🎯 Mục đích
Deploy **Node.js Backend API** lên **AWS ECS Fargate** với Docker container.

### 📝 5 Bước thực hiện:

| Bước | Tên | Công việc |
|------|-----|-----------|
| 1️⃣ | **Checkout Code** | Clone repository từ GitHub |
| 2️⃣ | **Test & QA** | Install deps → Run tests → Check coverage |
| 3️⃣ | **Build Docker** | Build Docker image với tag commit SHA |
| 4️⃣ | **Push to ECR** | Upload image lên Amazon Elastic Container Registry |
| 5️⃣ | **Deploy to ECS** | Update ECS task → Force new deployment |

### ⚙️ Trigger Conditions
- ✅ Push vào branch `main` hoặc `develop`
- ✅ Có thay đổi trong folder `backend/**`
- ✅ Pull Request vào branch `main`

### 🔐 Required Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCOUNT_ID
```

### 📦 Environment Variables
```yaml
AWS_REGION: ap-southeast-1
ECR_REPOSITORY: book-store-backend
ECS_SERVICE: book-store-service
ECS_CLUSTER: book-store-cluster
```

---

## 🎨 Frontend CI/CD Pipeline

**File**: `.github/workflows/frontend-ci-cd.yml`

### 🎯 Mục đích
Deploy **React Frontend** lên **AWS S3** và phân phối qua **CloudFront CDN**.

### 📝 5 Bước thực hiện:

| Bước | Tên | Công việc |
|------|-----|-----------|
| 1️⃣ | **Checkout Code** | Clone repository từ GitHub |
| 2️⃣ | **Test & QA** | Install deps → Run React tests |
| 3️⃣ | **Build Bundle** | Build production static files với `npm run build` |
| 4️⃣ | **Sync to S3** | Upload build folder lên S3 bucket |
| 5️⃣ | **Invalidate CDN** | Clear CloudFront cache để update nội dung |

### ⚙️ Trigger Conditions
- ✅ Push vào branch `main` hoặc `develop`
- ✅ Có thay đổi trong folder `frontend/**`
- ✅ Pull Request vào branch `main`

### 🔐 Required Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
REACT_APP_API_URL          # Backend API URL
```

### 📦 Environment Variables
```yaml
AWS_REGION: ap-southeast-1
S3_BUCKET: book-store-frontend           # ⚠️ CẦN CẬP NHẬT
CLOUDFRONT_DISTRIBUTION_ID: YOUR_ID      # ⚠️ CẦN CẬP NHẬT
```

---

## 🎯 Tại sao tách riêng?

### ✅ Lợi ích

| Lợi ích | Backend | Frontend |
|---------|---------|----------|
| **Deploy độc lập** | Sửa API không rebuild UI | Sửa UI không rebuild API |
| **Tốc độ** | Build Docker ~3-5 phút | Build React ~1-2 phút |
| **Frequency** | Deploy ít (khi có logic mới) | Deploy nhiều (UI changes) |
| **Rollback** | Rollback task definition | Rollback S3 version |
| **Testing** | Unit + Integration tests | React component tests |

### 📊 So sánh Workflow

```mermaid
graph TB
    subgraph "Backend Pipeline"
        B1[Code Change in backend/] --> B2[Run Tests]
        B2 --> B3[Build Docker]
        B3 --> B4[Push ECR]
        B4 --> B5[Deploy ECS]
    end
    
    subgraph "Frontend Pipeline"
        F1[Code Change in frontend/] --> F2[Run Tests]
        F2 --> F3[Build React]
        F3 --> F4[Sync S3]
        F4 --> F5[Invalidate CF]
    end
```

---

## 🚀 Setup Instructions

### Bước 1: Configure Terraform Outputs

Sau khi deploy infrastructure với Terraform, lấy các giá trị sau:

```bash
cd infrastructure/terraform

# Get S3 bucket name
terraform output s3_bucket_name

# Get CloudFront distribution ID
terraform output cloudfront_distribution_id

# Get ECR repository name
terraform output ecr_repository_name

# Get ECS cluster name
terraform output ecs_cluster_name

# Get ECS service name
terraform output ecs_service_name
```

### Bước 2: Update Environment Variables

#### Backend CI/CD
Mở `.github/workflows/backend-ci-cd.yml`:
```yaml
env:
  AWS_REGION: ap-southeast-1
  ECR_REPOSITORY: <TERRAFORM_OUTPUT>
  ECS_SERVICE: <TERRAFORM_OUTPUT>
  ECS_CLUSTER: <TERRAFORM_OUTPUT>
```

#### Frontend CI/CD
Mở `.github/workflows/frontend-ci-cd.yml`:
```yaml
env:
  AWS_REGION: ap-southeast-1
  S3_BUCKET: <TERRAFORM_OUTPUT>
  CLOUDFRONT_DISTRIBUTION_ID: <TERRAFORM_OUTPUT>
```

### Bước 3: Add GitHub Secrets

Vào **GitHub Repository → Settings → Secrets and variables → Actions**

Click **New repository secret** và thêm:

```
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_ACCOUNT_ID=123456789012
REACT_APP_API_URL=https://api.yourdomain.com
```

### Bước 4: Configure IAM Permissions

Tạo IAM User hoặc Role với policy sau:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRPermissions",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSPermissions",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3Permissions",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::book-store-frontend",
        "arn:aws:s3:::book-store-frontend/*"
      ]
    },
    {
      "Sid": "CloudFrontPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📊 Monitoring & Logs

### View Workflow Status
```
GitHub → Actions tab → Select workflow
```

### Check Deployment

#### Backend
```bash
# Check ECS service
aws ecs describe-services \
  --cluster book-store-cluster \
  --services book-store-service

# View logs
aws logs tail /ecs/book-store-backend --follow
```

#### Frontend
```bash
# Check S3 sync
aws s3 ls s3://book-store-frontend/ --recursive

# Check CloudFront invalidation
aws cloudfront list-invalidations \
  --distribution-id YOUR_DISTRIBUTION_ID
```

---

## 🐛 Troubleshooting

### Backend Issues

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| ECR push failed | Wrong credentials | Check AWS secrets |
| ECS deployment timeout | Service unhealthy | Check task logs |
| Docker build failed | Dependencies error | Test build locally |

### Frontend Issues

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| S3 sync failed | Bucket not exist | Verify bucket name |
| CloudFront timeout | Wrong distribution ID | Check ID in AWS console |
| Build failed | Missing env vars | Add REACT_APP_ secrets |

---

## 📈 Deployment Flow

### Scenario 1: Chỉ sửa Backend
```bash
# Sửa file trong backend/
git add backend/
git commit -m "fix(api): update user endpoint"
git push

# ✅ Chỉ backend-ci-cd.yml được trigger
# ❌ frontend-ci-cd.yml KHÔNG chạy
```

### Scenario 2: Chỉ sửa Frontend
```bash
# Sửa file trong frontend/
git add frontend/
git commit -m "feat(ui): add new dashboard"
git push

# ❌ backend-ci-cd.yml KHÔNG chạy
# ✅ Chỉ frontend-ci-cd.yml được trigger
```

### Scenario 3: Sửa cả hai
```bash
# Sửa cả backend/ và frontend/
git add .
git commit -m "feat: full stack feature"
git push

# ✅ Cả 2 pipelines chạy song song
```

---

## 🎓 Best Practices

✅ **Path Filtering** - Chỉ trigger khi có thay đổi liên quan  
✅ **Caching** - Sử dụng npm cache để tăng tốc  
✅ **Parallel Testing** - Run tests trước khi build  
✅ **Versioning** - Tag Docker images với commit SHA  
✅ **Zero Downtime** - ECS rolling update, S3 atomic sync  
✅ **Cache Control** - HTML no-cache, assets long-term cache  
✅ **Security** - Secrets management, IAM least privilege  

---

## 📚 Next Steps

1. ✅ Update environment variables
2. ✅ Add GitHub secrets
3. ✅ Test với pull request
4. ✅ Merge vào main để deploy
5. ✅ Monitor deployment status

---

**Created with ❤️ by Antigravity AI**

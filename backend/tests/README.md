# Backend Tests - Book Store Application

## 📋 Tổng Quan

Hệ thống test hoàn chỉnh cho backend web bán sách với **185 test cases** và **85.47% code coverage**.

## 📁 Cấu Trúc Tests

```
tests/
├── unit/                           # Unit Tests (99 tests)
│   ├── controllers/                # Controller tests (coming soon)
│   ├── models/                     # Model tests
│   │   ├── product.model.test.js  # Product model (29 tests)
│   │   └── user.model.test.js     # User model (14 tests)
│   ├── middlewares/                # Middleware tests
│   │   ├── auth.middleware.test.js # Auth middleware (11 tests)
│   │   └── errors.test.js         # Error middleware (9 tests)
│   └── utils/                      # Utility tests
│       ├── apiFeatures.test.js    # API features (13 tests)
│       ├── elasticlunr.test.js    # Search (10 tests)
│       ├── errorHandler.test.js   # Error handler (6 tests)
│       └── jwtToken.test.js       # JWT token (7 tests)
│
├── integration/                    # Integration Tests (86 tests)
│   ├── auth/                       # Authentication tests
│   │   └── auth.test.js           # Auth flow (20 tests)
│   ├── product/                    # Product tests
│   │   └── product.test.js        # Product CRUD (20 tests)
│   ├── order/                      # Order tests
│   │   └── order.test.js          # Order processing (16 tests)
│   ├── payment/                    # Payment tests
│   │   └── payment.test.js        # Payment integration (10 tests)
│   ├── category/                   # Category tests
│   │   └── category.test.js       # Category management (10 tests)
│   └── admin/                      # Admin tests
│       └── admin.test.js          # Admin operations (10 tests)
│
├── helpers/
│   └── testHelpers.js             # Shared test utilities
│
├── __mocks__/
│   ├── cloudinary.js              # Mock Cloudinary
│   └── sendEmail.js               # Mock email service
│
├── setup.js                       # Test environment setup
└── README.md                      # This file
```

## 🚀 Chạy Tests

### Tất Cả Tests
```bash
npm test
```

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Test Theo Module
```bash
# Unit tests cho models
npm test -- unit/models

# Unit tests cho utils
npm test -- unit/utils

# Integration tests cho auth
npm test -- integration/auth

# Integration tests cho product
npm test -- integration/product
```

### Watch Mode
```bash
npm run test:watch
```

## 📊 Test Results

```
✅ 185 tests passed (100% pass rate)
📈 85.47% code coverage
⏱️ ~15 seconds execution time
🎯 14 test suites
```

## ✅ Test Coverage

| Component | Coverage | Tests |
|-----------|----------|-------|
| **Controllers** | 86.64% | Integration tests |
| **Middlewares** | 100% | 20 tests |
| **Models** | 100% | 43 tests |
| **Utils** | 66.21% | 36 tests |
| **Overall** | **85.47%** | **185 tests** |

## 📝 Test Categories

### Unit Tests (99 tests)

#### Models (43 tests)
- ✅ Product model validation (29 tests)
  - Schema validation
  - Default values
  - Images array
  - Reviews array
  - Vietnamese book names
  - VND pricing
- ✅ User model validation (14 tests)
  - Schema validation
  - Password hashing
  - JWT token generation
  - Reset password token

#### Middlewares (20 tests)
- ✅ Auth middleware (11 tests)
  - Token authentication
  - Role authorization
  - Error handling
- ✅ Error middleware (9 tests)
  - Development/Production modes
  - Mongoose errors
  - JWT errors

#### Utils (36 tests)
- ✅ API Features (13 tests)
  - Search, filter, sort, pagination
- ✅ Elasticlunr search (10 tests)
  - Full-text search
  - Vietnamese support
- ✅ Error handler (6 tests)
- ✅ JWT token (7 tests)

### Integration Tests (86 tests)

#### Auth Module (20 tests)
- ✅ User registration
- ✅ Login/Logout
- ✅ Profile management
- ✅ Password reset
- ✅ Token validation

#### Product Module (20 tests)
- ✅ CRUD operations
- ✅ Search & filter
- ✅ Reviews
- ✅ Image upload
- ✅ Stock management

#### Order Module (16 tests)
- ✅ Create order
- ✅ Order status
- ✅ Order history
- ✅ Admin order management

#### Payment Module (10 tests)
- ✅ PayOS integration
- ✅ Payment processing
- ✅ Payment status

#### Category Module (10 tests)
- ✅ CRUD operations
- ✅ Category filtering

#### Admin Module (10 tests)
- ✅ User management
- ✅ Product management
- ✅ Order management

## 🛠️ Test Helpers

```javascript
const { 
  createTestUser, 
  createTestProduct, 
  createTestCategory,
  createTestOrder,
  cleanupDatabase 
} = require('./helpers/testHelpers');

// Create test user
const user = await createTestUser({
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
});

// Create test product (book)
const product = await createTestProduct(user._id, {
  name: 'Harry Potter',
  price: 299000,
  category: 'Fantasy'
});

// Cleanup
await cleanupDatabase();
```

## 🔧 Configuration

### Jest Config
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### Environment Variables
```env
TEST_DB_URI=mongodb://localhost:27017/shopit_test
JWT_SECRET=test_secret_key
JWT_EXPIRES_TIME=7d
COOKIE_EXPIRES_TIME=7
```

## 📝 Viết Tests Mới

### Unit Test
Đặt trong folder tương ứng với module:
- Models → `tests/unit/models/`
- Middlewares → `tests/unit/middlewares/`
- Utils → `tests/unit/utils/`
- Controllers → `tests/unit/controllers/`

```javascript
// tests/unit/models/category.model.test.js
describe('Category Model', () => {
  it('should validate category name', () => {
    // Test implementation
  });
});
```

### Integration Test
Đặt trong folder theo nghiệp vụ:
- Auth → `tests/integration/auth/`
- Product → `tests/integration/product/`
- Order → `tests/integration/order/`
- Payment → `tests/integration/payment/`
- Category → `tests/integration/category/`
- Admin → `tests/integration/admin/`

```javascript
// tests/integration/category/category.test.js
describe('Category API', () => {
  it('should create new category', async () => {
    // Test implementation
  });
});
```

## 🎨 Best Practices

1. **Tổ chức theo module** - Dễ tìm và maintain
2. **Test isolation** - Mỗi test độc lập
3. **Descriptive names** - Tên test rõ ràng
4. **Mock external services** - Không gọi API thật
5. **Clean test data** - Cleanup sau mỗi test
6. **Test edge cases** - Test cả trường hợp đặc biệt

## 🐛 Troubleshooting

### Database Connection
```bash
# Check MongoDB is running
mongod --dbpath /path/to/data
```

### Clear Cache
```bash
npm test -- --clearCache
```

### Specific Test
```bash
# Run specific file
npm test -- product.model.test.js

# Run specific folder
npm test -- unit/models
```

## 📞 Support

Nếu có vấn đề với tests:
1. Check MongoDB connection
2. Verify environment variables
3. Clear Jest cache
4. Check test file location

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: Development Team

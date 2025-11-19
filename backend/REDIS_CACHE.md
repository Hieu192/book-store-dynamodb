# Redis Caching Layer

## 📋 Tổng Quan

Redis được sử dụng làm caching layer để cải thiện performance của API. Cache được áp dụng cho các GET requests và tự động invalidate khi có thay đổi dữ liệu.

## 🚀 Cài Đặt

### 1. Cài đặt Redis

**Windows:**
```bash
# Download Redis for Windows
# https://github.com/microsoftarchive/redis/releases
# Hoặc sử dụng Docker
docker run -d -p 6379:6379 redis:alpine
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 2. Cấu hình

Thêm vào `config/config.env`:
```env
REDIS_URL=redis://localhost:6379
```

Hoặc sử dụng Redis Cloud:
```env
REDIS_URL=redis://username:password@host:port
```

### 3. Kiểm tra kết nối

```bash
redis-cli ping
# Response: PONG
```

## 💡 Cách Sử Dụng

### Cache Middleware

```javascript
const { cache, invalidateCache } = require('../middlewares/cache');

// Cache GET request trong 5 phút (300 giây)
router.get('/products', cache(300), getProducts);

// Cache trong 10 phút
router.get('/product/:id', cache(600), getSingleProduct);

// Invalidate cache sau khi update
router.put('/product/:id', 
  invalidateCache(['cache:*products*', 'cache:*product*']),
  updateProduct
);
```

### Cache Duration

- **Short-lived (60s)**: Dữ liệu thay đổi thường xuyên
- **Medium (300s = 5min)**: Dữ liệu thay đổi vừa phải (default)
- **Long-lived (3600s = 1h)**: Dữ liệu ít thay đổi

### Cache Invalidation

Cache tự động bị xóa khi:
- POST: Tạo mới dữ liệu
- PUT: Cập nhật dữ liệu
- DELETE: Xóa dữ liệu

## 📊 Cache Strategy

### Products API

| Endpoint | Cache Duration | Invalidate On |
|----------|----------------|---------------|
| GET /products | 5 minutes | POST, PUT, DELETE product |
| GET /product/:id | 5 minutes | PUT, DELETE product |
| GET /reviews | 5 minutes | POST, DELETE review |

### Cache Keys Pattern

```
cache:/api/v1/products
cache:/api/v1/products?page=1&keyword=book
cache:/api/v1/product/123
cache:/api/v1/reviews?id=123
```

## 🔧 API Endpoints

### Clear Cache (Admin)

```javascript
// Clear specific pattern
POST /api/v1/admin/cache/clear
{
  "pattern": "cache:*products*"
}

// Clear all cache
POST /api/v1/admin/cache/clear-all
```

## 📈 Performance Benefits

### Without Cache
```
GET /products: ~200ms
GET /product/:id: ~50ms
```

### With Cache (Hit)
```
GET /products: ~10ms (95% faster)
GET /product/:id: ~5ms (90% faster)
```

### Cache Hit Ratio

Mục tiêu: >80% cache hit ratio

```bash
# Monitor cache stats
redis-cli info stats
```

## 🎯 Best Practices

### 1. Cache GET Requests Only
```javascript
// ✅ Good
router.get('/products', cache(300), getProducts);

// ❌ Bad - Don't cache POST/PUT/DELETE
router.post('/products', cache(300), createProduct);
```

### 2. Appropriate Cache Duration
```javascript
// ✅ Good - Frequently changing data
router.get('/orders/me', cache(60), getMyOrders);

// ✅ Good - Rarely changing data
router.get('/categories', cache(3600), getCategories);

// ❌ Bad - Too long for dynamic data
router.get('/orders/me', cache(3600), getMyOrders);
```

### 3. Invalidate Related Caches
```javascript
// ✅ Good - Clear all related caches
router.put('/product/:id', 
  invalidateCache([
    'cache:*products*',  // List page
    'cache:*product*',   // Detail page
    'cache:*reviews*'    // Reviews
  ]),
  updateProduct
);
```

### 4. Handle Cache Failures Gracefully
```javascript
// Cache middleware automatically falls back to database
// if Redis is not available
```

## 🔍 Monitoring

### Redis CLI Commands

```bash
# Check connection
redis-cli ping

# View all keys
redis-cli keys "cache:*"

# Get cache value
redis-cli get "cache:/api/v1/products"

# Delete specific key
redis-cli del "cache:/api/v1/products"

# Clear all cache
redis-cli flushdb

# Monitor real-time commands
redis-cli monitor

# Get memory usage
redis-cli info memory
```

### Application Logs

```
✅ Cache HIT: cache:/api/v1/products
❌ Cache MISS: cache:/api/v1/product/123
✅ Cleared 5 cache entries matching: cache:*products*
```

## 🚨 Troubleshooting

### Redis Not Connected

**Symptom:**
```
⚠️  Redis skipped in test environment
⚠️  Starting server without Redis cache
```

**Solution:**
- Check if Redis is running: `redis-cli ping`
- Verify REDIS_URL in config.env
- Application will work without Redis (just slower)

### Cache Not Clearing

**Symptom:**
- Old data still showing after update

**Solution:**
```javascript
// Add more specific invalidation patterns
invalidateCache(['cache:*products*', 'cache:*product:123*'])
```

### Memory Issues

**Symptom:**
- Redis using too much memory

**Solution:**
```bash
# Set max memory in redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru

# Or via CLI
redis-cli config set maxmemory 256mb
redis-cli config set maxmemory-policy allkeys-lru
```

## 🧪 Testing

### Test Cache Behavior

```javascript
// First request - Cache MISS
const res1 = await request(app).get('/api/v1/products');
// Response time: ~200ms

// Second request - Cache HIT
const res2 = await request(app).get('/api/v1/products');
// Response time: ~10ms

// Update product - Cache invalidated
await request(app).put('/api/v1/admin/product/123');

// Third request - Cache MISS (cache was cleared)
const res3 = await request(app).get('/api/v1/products');
// Response time: ~200ms
```

### Disable Cache in Tests

```javascript
// In test setup
process.env.REDIS_URL = ''; // Disable Redis
```

## 📊 Cache Statistics

### Expected Metrics

- **Cache Hit Ratio**: 80-90%
- **Average Response Time (with cache)**: <20ms
- **Average Response Time (without cache)**: 100-300ms
- **Memory Usage**: <100MB for typical workload

### Monitor Performance

```javascript
// Add to your monitoring
const cacheHits = await redis.get('stats:cache:hits');
const cacheMisses = await redis.get('stats:cache:misses');
const hitRatio = cacheHits / (cacheHits + cacheMisses);
console.log(`Cache Hit Ratio: ${(hitRatio * 100).toFixed(2)}%`);
```

## 🔐 Security

### Redis Security Best Practices

1. **Use Password Authentication**
```bash
# In redis.conf
requirepass your_strong_password

# In config.env
REDIS_URL=redis://:your_strong_password@localhost:6379
```

2. **Bind to Localhost Only**
```bash
# In redis.conf
bind 127.0.0.1
```

3. **Disable Dangerous Commands**
```bash
# In redis.conf
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

## 🌐 Production Deployment

### Redis Cloud Options

1. **AWS ElastiCache**
   - Managed Redis service
   - Auto-failover
   - ~$15/month for small instance

2. **Redis Cloud**
   - Free tier: 30MB
   - Paid: Starting $5/month

3. **Heroku Redis**
   - Free tier: 25MB
   - Paid: Starting $15/month

### Environment Variables

```env
# Development
REDIS_URL=redis://localhost:6379

# Production (AWS ElastiCache)
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379

# Production (Redis Cloud)
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

## 📝 Summary

✅ **Implemented:**
- Redis connection with auto-reconnect
- Cache middleware for GET requests
- Automatic cache invalidation
- Graceful fallback if Redis unavailable
- Pattern-based cache clearing

✅ **Benefits:**
- 80-95% faster response times
- Reduced database load
- Better scalability
- Improved user experience

✅ **Optional:**
- Application works without Redis
- No breaking changes
- Easy to enable/disable

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Maintained By**: Development Team

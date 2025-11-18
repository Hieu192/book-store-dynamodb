const request = require('supertest');
const app = require('../../app');
const { createTestUser, createTestProduct, cleanupDatabase } = require('../helpers/testHelpers');

describe('API Performance Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await cleanupDatabase();
    testUser = await createTestUser({
      name: 'Performance Test User',
      email: 'perf@test.com',
      password: 'password123'
    });

    // Get auth token
    const res = await request(app)
      .post('/api/v1/login')
      .send({ email: 'perf@test.com', password: 'password123' });
    
    authToken = res.headers['set-cookie'];
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('Response Time Tests', () => {
    it('GET /api/v1/products should respond within 500ms', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/v1/products')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 GET /products - Response Time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(500);
    });

    it('GET /api/v1/product/:id should respond within 300ms', async () => {
      const product = await createTestProduct(testUser._id);
      const startTime = Date.now();
      
      const res = await request(app)
        .get(`/api/v1/product/${product._id}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 GET /product/:id - Response Time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(300);
    });

    it('POST /api/v1/login should respond within 1000ms', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .post('/api/v1/login')
        .send({ email: 'perf@test.com', password: 'password123' })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 POST /login - Response Time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(1000);
    });

    it('GET /api/v1/me should respond within 200ms', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/v1/me')
        .set('Cookie', authToken)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 GET /me - Response Time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Load Tests - Sequential Requests', () => {
    it('should handle 10 sequential product requests', async () => {
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await request(app).get('/api/v1/products').expect(200);
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`📊 10 Sequential Requests:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe('Load Tests - Concurrent Requests', () => {
    it('should handle 10 concurrent product requests', async () => {
      const startTime = Date.now();
      
      const promises = Array(10).fill(null).map(() => 
        request(app).get('/api/v1/products').expect(200)
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 10;
      
      console.log(`📊 10 Concurrent Requests:`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average per request: ${avgTime.toFixed(2)}ms`);
      
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Database Query Performance', () => {
    beforeAll(async () => {
      // Create 50 test products
      const promises = Array(50).fill(null).map((_, i) => 
        createTestProduct(testUser._id, {
          name: `Performance Test Product ${i}`,
          price: 100 + i
        })
      );
      await Promise.all(promises);
    });

    it('should fetch paginated products efficiently', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/v1/products?page=1&limit=20')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Paginated Query (50 products, limit 20):`);
      console.log(`   Response Time: ${responseTime}ms`);
      console.log(`   Products Returned: ${res.body.products.length}`);
      
      expect(responseTime).toBeLessThan(400);
      expect(res.body.products.length).toBeLessThanOrEqual(20);
    });

    it('should search products efficiently', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/v1/products?keyword=Performance')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Search Query (keyword: Performance):`);
      console.log(`   Response Time: ${responseTime}ms`);
      console.log(`   Results Found: ${res.body.products.length}`);
      
      expect(responseTime).toBeLessThan(500);
    });

    it('should filter products efficiently', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/v1/products?price[gte]=100&price[lte]=150')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Filter Query (price range):`);
      console.log(`   Response Time: ${responseTime}ms`);
      console.log(`   Results Found: ${res.body.products.length}`);
      
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/v1/products');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      console.log(`📊 Memory Usage (100 requests):`);
      console.log(`   Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Increase: ${memoryIncrease.toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});

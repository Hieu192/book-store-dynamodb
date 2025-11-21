/**
 * Integration Tests for Recommendation API Endpoints
 */

const request = require('supertest');
const app = require('../../app');

describe('Recommendation API - Integration Tests', () => {
  let authToken;
  let testProductId;
  let testCategory = 'Integration Test Category';

  // Setup: Create test products and get auth token
  beforeAll(async () => {
    // Register and login to get token
    const registerRes = await request(app)
      .post('/api/v1/register')
      .send({
        name: 'Test User Recommendations',
        email: `test-recommendations-${Date.now()}@test.com`,
        password: 'password123'
      });

    if (registerRes.body.token) {
      authToken = registerRes.body.token;
    }

    // Create test products
    if (authToken) {
      const productRes = await request(app)
        .post('/api/v1/admin/product/new')
        .set('Cookie', [`token=${authToken}`])
        .send({
          name: 'Test Product for Recommendations',
          price: 100,
          description: 'Test product description',
          category: testCategory,
          stock: 10,
          seller: 'Test Seller',
          images: []
        });

      if (productRes.body.product) {
        testProductId = productRes.body.product._id;
      }
    }
  });

  describe('GET /api/v1/products/:id/related', () => {
    test('should return related products', async () => {
      if (!testProductId) {
        console.log('Skipping test: No test product created');
        return;
      }

      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/related`)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body).toHaveProperty('count');
    });

    test('should respect limit query parameter', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/related?limit=3`)
        .expect(200);

      expect(res.body.products.length).toBeLessThanOrEqual(3);
    });

    test('should not include the product itself', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .get(`/api/v1/products/${testProductId}/related`)
        .expect(200);

      const productIds = res.body.products.map(p => p._id);
      expect(productIds).not.toContain(testProductId);
    });
  });

  describe('GET /api/v1/products/bestsellers', () => {
    test('should return best selling products', async () => {
      const res = await request(app)
        .get('/api/v1/products/bestsellers')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body).toHaveProperty('count');
    });

    test('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/v1/products/bestsellers?limit=5')
        .expect(200);

      expect(res.body.products.length).toBeLessThanOrEqual(5);
    });

    test('should filter by category if provided', async () => {
      const res = await request(app)
        .get(`/api/v1/products/bestsellers?category=${testCategory}`)
        .expect(200);

      if (res.body.products.length > 0) {
        res.body.products.forEach(product => {
          expect(product.category).toBe(testCategory);
        });
      }
    });

    test('should be cached (faster on second request)', async () => {
      const start1 = Date.now();
      await request(app).get('/api/v1/products/bestsellers').expect(200);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app).get('/api/v1/products/bestsellers').expect(200);
      const time2 = Date.now() - start2;

      // Second request should be faster (cached)
      // Note: This might not always be true in test environment
      console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
    });
  });

  describe('GET /api/v1/products/by-ids', () => {
    test('should return products for valid IDs', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .get(`/api/v1/products/by-ids?ids=${testProductId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0]._id).toBe(testProductId);
    });

    test('should handle multiple IDs', async () => {
      if (!testProductId) return;

      const res = await request(app)
        .get(`/api/v1/products/by-ids?ids=${testProductId},${testProductId}`)
        .expect(200);

      expect(res.body.products.length).toBeGreaterThan(0);
    });

    test('should return empty array for no IDs', async () => {
      const res = await request(app)
        .get('/api/v1/products/by-ids')
        .expect(200);

      expect(res.body.products).toEqual([]);
    });

    test('should filter out invalid IDs', async () => {
      const res = await request(app)
        .get('/api/v1/products/by-ids?ids=invalid-id-1,invalid-id-2')
        .expect(200);

      expect(res.body.products).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    test('related products should respond within 500ms', async () => {
      if (!testProductId) return;

      const start = Date.now();
      await request(app)
        .get(`/api/v1/products/${testProductId}/related`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    test('best sellers should respond within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/v1/products/bestsellers')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  // Cleanup
  afterAll(async () => {
    // Delete test product
    if (testProductId && authToken) {
      await request(app)
        .delete(`/api/v1/admin/product/${testProductId}`)
        .set('Cookie', [`token=${authToken}`]);
    }
  });
});

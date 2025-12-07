const request = require('supertest');
const app = require('../../../app');
const productService = require('../../../services/ProductService');
const {
  createTestUser,
  createAdminUser,
  createTestProduct,
  cleanupDatabase
} = require('../../helpers/testHelpers');

describe('Product Integration Tests', () => {

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('GET /api/v1/products', () => {
    it('should get all products', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestProduct(userId, { name: 'Product 1' });
      await createTestProduct(userId, { name: 'Product 2' });

      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter products by price range', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const timestamp = Date.now();

      // Cleanup any existing products for this user first
      const { cleanupTestProducts } = require('../../helpers/testHelpers');
      await cleanupTestProducts(userId);

      await createTestProduct(userId, { name: `Cheap Product ${timestamp}`, price: 50 });
      await createTestProduct(userId, { name: `Expensive Product ${timestamp}`, price: 500 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ 'price[gte]': 100, 'price[lte]': 600 })
        .expect(200);


      expect(response.body.success).toBe(true);
      expect(response.body.products).toBeDefined();
      expect(Array.isArray(response.body.products)).toBe(true);

      // The main business logic test: ALL returned products MUST be within price range
      // This is the core functionality we're testing
      response.body.products.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(100);
        expect(product.price).toBeLessThanOrEqual(600);
      });

      // Verify we have at least some products matching the filter
      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('should filter products by category', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestProduct(userId, { name: 'Laptop', category: 'Electronics' });
      await createTestProduct(userId, { name: 'Shirt', category: 'Clothing' });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ category: 'Electronics' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const electronics = response.body.products.filter(p => p.category === 'Electronics');
      expect(electronics.length).toBeGreaterThan(0);
    });

    it('should filter products by ratings', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestProduct(userId, { name: 'Good Product', ratings: 4.5 });
      await createTestProduct(userId, { name: 'Bad Product', ratings: 2.0 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ 'ratings[gte]': 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
      const goodProducts = response.body.products.filter(p => p.ratings >= 4);
      expect(goodProducts.length).toBeGreaterThan(0);
    });

    it('should search products by keyword', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestProduct(userId, { name: 'Apple iPhone' });
      await createTestProduct(userId, { name: 'Samsung Galaxy' });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ keyword: 'Apple' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('should paginate products', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      // Create 15 products
      for (let i = 1; i <= 15; i++) {
        await createTestProduct(userId, { name: `Product ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.resPerPage).toBe(10);
    });

    it('should sort products by price', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestProduct(userId, { name: 'Product A', price: 300 });
      await createTestProduct(userId, { name: 'Product B', price: 100 });
      await createTestProduct(userId, { name: 'Product C', price: 200 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ sortByPrice: 1 }) // Ascending
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.products.length >= 2) {
        expect(response.body.products[0].price).toBeLessThanOrEqual(response.body.products[1].price);
      }
    });
  });

  describe('GET /api/v1/product/:id', () => {
    it('should get single product by id', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId, { name: 'Test Product' });
      const productId = product.id || product._id;

      const response = await request(app)
        .get(`/api/v1/product/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toHaveProperty('name', 'Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/product/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Product not found');
    });

    it('should return error for invalid product id', async () => {
      const response = await request(app)
        .get('/api/v1/product/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/v1/admin/product/new', () => {
    it('should create new product as admin', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();

      const productData = {
        name: 'New Product',
        price: 199.99,
        description: 'New product description',
        category: 'Electronics',
        seller: 'Test Seller',
        stock: 20,
        images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']
      };

      const response = await request(app)
        .post('/api/v1/admin/product/new')
        .set('Cookie', [`token=${token}`])
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toHaveProperty('name', productData.name);
      expect(response.body.product).toHaveProperty('price', productData.price);

      // Verify via API
      const productId = response.body.product.id || response.body.product._id;
      const product = await productService.getProduct(productId);
      expect(product).toBeTruthy();
      expect(product.name).toBe(productData.name);
    });

    it('should not create product as regular user', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const productData = {
        name: 'New Product',
        price: 199.99,
        description: 'Description',
        category: 'Electronics',
        seller: 'Seller',
        stock: 20,
        images: ['data:image/png;base64,test']
      };

      const response = await request(app)
        .post('/api/v1/admin/product/new')
        .set('Cookie', [`token=${token}`])
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not allowed');
    });

    it('should not create product without authentication', async () => {
      const productData = {
        name: 'New Product',
        price: 199.99
      };

      const response = await request(app)
        .post('/api/v1/admin/product/new')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/product/:id', () => {
    it('should update product as admin', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;
      const product = await createTestProduct(adminId, { name: 'Old Name', price: 100 });
      const token = admin.getJwtToken();
      const productId = product.id || product._id;

      const updateData = {
        name: 'Updated Name',
        price: 150,
        description: 'Updated description',
        category: 'Electronics',
        seller: 'Updated Seller',
        stock: 30,
        images: ['data:image/png;base64,updated']
      };

      const response = await request(app)
        .put(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${token}`])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toHaveProperty('name', 'Updated Name');
      expect(response.body.product).toHaveProperty('price', 150);

      // Verify via API
      const updatedProduct = await productService.getProduct(productId);
      expect(updatedProduct.name).toBe('Updated Name');
    });

    it('should not update product as regular user', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;
      const user = await createTestUser();
      const product = await createTestProduct(adminId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      const response = await request(app)
        .put(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/product/:id', () => {
    it('should delete product as admin', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;
      const product = await createTestProduct(adminId);
      const token = admin.getJwtToken();
      const productId = product.id || product._id;

      const response = await request(app)
        .delete(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion - should throw error
      try {
        await productService.getProduct(productId);
        fail('Product should have been deleted');
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should not delete product as regular user', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;
      const user = await createTestUser();
      const product = await createTestProduct(adminId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      const response = await request(app)
        .delete(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/review', () => {
    it('should create product review', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      const reviewData = {
        rating: 5,
        comment: 'Great product!',
        productId: productId
      };

      const response = await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify via API
      const updatedProduct = await productService.getProduct(productId);
      expect(updatedProduct.reviews.length).toBeGreaterThan(0);
      expect(updatedProduct.numOfReviews).toBeGreaterThan(0);
    });

    it('should update existing review', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      // Create first review
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 3,
          comment: 'OK product',
          productId: productId
        });

      // Update review
      const response = await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Actually great!',
          productId: productId
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify only one review exists
      const updatedProduct = await productService.getProduct(productId);
      expect(updatedProduct.reviews).toHaveLength(1);
      expect(updatedProduct.reviews[0].comment).toBe('Actually great!');
      expect(updatedProduct.reviews[0].rating).toBe(5);
    });

    it('should not create review without authentication', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId);
      const productId = product.id || product._id;

      const response = await request(app)
        .put('/api/v1/review')
        .send({
          rating: 5,
          comment: 'Great!',
          productId: productId
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reviews', () => {
    it('should get product reviews', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      // Create review first using API
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Excellent!',
          productId: productId.toString()
        });

      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ id: productId.toString() })
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/reviews', () => {
    it('should delete product review', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId);
      const token = user.getJwtToken();
      const productId = product.id || product._id;

      // Create review first using API
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Great!',
          productId: productId.toString()
        });

      // Get the review ID
      const reviewsResponse = await request(app)
        .get('/api/v1/reviews')
        .query({ id: productId.toString() })
        .set('Cookie', [`token=${token}`]);

      const reviewId = reviewsResponse.body.reviews[0]._id || reviewsResponse.body.reviews[0].id;

      const response = await request(app)
        .delete('/api/v1/reviews')
        .query({ id: reviewId, productId: productId.toString() })
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const updatedProduct = await productService.getProduct(productId);
      expect(updatedProduct.reviews).toHaveLength(0);
    });
  });
});

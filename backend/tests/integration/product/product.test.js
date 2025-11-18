const request = require('supertest');
const app = require('../../../app');
const Product = require('../../../models/product');
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
      await createTestProduct(user._id, { name: 'Product 1' });
      await createTestProduct(user._id, { name: 'Product 2' });

      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(2);
      expect(response.body.productsCount).toBe(2);
    });

    it('should filter products by price range', async () => {
      const user = await createTestUser();
      await createTestProduct(user._id, { name: 'Cheap Product', price: 50 });
      await createTestProduct(user._id, { name: 'Expensive Product', price: 500 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ 'price[gte]': 100, 'price[lte]': 600 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('Expensive Product');
    });

    it('should filter products by category', async () => {
      const user = await createTestUser();
      await createTestProduct(user._id, { name: 'Laptop', category: 'Electronics' });
      await createTestProduct(user._id, { name: 'Shirt', category: 'Clothing' });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ category: 'Electronics' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].category).toBe('Electronics');
    });

    it('should filter products by ratings', async () => {
      const user = await createTestUser();
      await createTestProduct(user._id, { name: 'Good Product', ratings: 4.5 });
      await createTestProduct(user._id, { name: 'Bad Product', ratings: 2.0 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ 'ratings[gte]': 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].name).toBe('Good Product');
    });

    it('should search products by keyword', async () => {
      const user = await createTestUser();
      await createTestProduct(user._id, { name: 'Apple iPhone' });
      await createTestProduct(user._id, { name: 'Samsung Galaxy' });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ keyword: 'Apple' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('should paginate products', async () => {
      const user = await createTestUser();
      // Create 15 products
      for (let i = 1; i <= 15; i++) {
        await createTestProduct(user._id, { name: `Product ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/products')
        .query({ page: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(10); // Default per page
      expect(response.body.resPerPage).toBe(10);
    });

    it('should sort products by price', async () => {
      const user = await createTestUser();
      await createTestProduct(user._id, { name: 'Product A', price: 300 });
      await createTestProduct(user._id, { name: 'Product B', price: 100 });
      await createTestProduct(user._id, { name: 'Product C', price: 200 });

      const response = await request(app)
        .get('/api/v1/products')
        .query({ sortByPrice: 1 }) // Ascending
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products[0].price).toBeLessThanOrEqual(response.body.products[1].price);
    });
  });

  describe('GET /api/v1/product/:id', () => {
    it('should get single product by id', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id, { name: 'Test Product' });

      const response = await request(app)
        .get(`/api/v1/product/${product._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toHaveProperty('name', 'Test Product');
      expect(response.body.product).toHaveProperty('_id', product._id.toString());
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

      // Verify in database
      const product = await Product.findOne({ name: productData.name });
      expect(product).toBeTruthy();
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
      const product = await createTestProduct(admin._id, { name: 'Old Name', price: 100 });
      const token = admin.getJwtToken();

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
        .put(`/api/v1/admin/product/${product._id}`)
        .set('Cookie', [`token=${token}`])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toHaveProperty('name', 'Updated Name');
      expect(response.body.product).toHaveProperty('price', 150);

      // Verify in database
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.name).toBe('Updated Name');
    });

    it('should not update product as regular user', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const product = await createTestProduct(admin._id);
      const token = user.getJwtToken();

      const response = await request(app)
        .put(`/api/v1/admin/product/${product._id}`)
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/product/:id', () => {
    it('should delete product as admin', async () => {
      const admin = await createAdminUser();
      const product = await createTestProduct(admin._id);
      const token = admin.getJwtToken();

      const response = await request(app)
        .delete(`/api/v1/admin/product/${product._id}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct).toBeNull();
    });

    it('should not delete product as regular user', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const product = await createTestProduct(admin._id);
      const token = user.getJwtToken();

      const response = await request(app)
        .delete(`/api/v1/admin/product/${product._id}`)
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/review', () => {
    it('should create product review', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id);
      const token = user.getJwtToken();

      const reviewData = {
        rating: 5,
        comment: 'Great product!',
        productId: product._id
      };

      const response = await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify review in database
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.reviews).toHaveLength(1);
      expect(updatedProduct.reviews[0].comment).toBe('Great product!');
      expect(updatedProduct.numOfReviews).toBe(1);
    });

    it('should update existing review', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id);
      const token = user.getJwtToken();

      // Create first review
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 3,
          comment: 'OK product',
          productId: product._id
        });

      // Update review
      const response = await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Actually great!',
          productId: product._id
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify only one review exists
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.reviews).toHaveLength(1);
      expect(updatedProduct.reviews[0].comment).toBe('Actually great!');
      expect(updatedProduct.reviews[0].rating).toBe(5);
    });

    it('should not create review without authentication', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id);

      const response = await request(app)
        .put('/api/v1/review')
        .send({
          rating: 5,
          comment: 'Great!',
          productId: product._id
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reviews', () => {
    it('should get product reviews', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id);
      const token = user.getJwtToken();

      // Create review first using API
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Excellent!',
          productId: product._id.toString()
        });

      const response = await request(app)
        .get('/api/v1/reviews')
        .query({ id: product._id.toString() })
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(1);
      expect(response.body.reviews[0].comment).toBe('Excellent!');
    });
  });

  describe('DELETE /api/v1/reviews', () => {
    it('should delete product review', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id);
      const token = user.getJwtToken();

      // Create review first using API
      await request(app)
        .put('/api/v1/review')
        .set('Cookie', [`token=${token}`])
        .send({
          rating: 5,
          comment: 'Great!',
          productId: product._id.toString()
        });

      // Get the review ID
      const reviewsResponse = await request(app)
        .get('/api/v1/reviews')
        .query({ id: product._id.toString() })
        .set('Cookie', [`token=${token}`]);

      const reviewId = reviewsResponse.body.reviews[0]._id;

      const response = await request(app)
        .delete('/api/v1/reviews')
        .query({ id: reviewId, productId: product._id.toString() })
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.reviews).toHaveLength(0);
    });
  });
});

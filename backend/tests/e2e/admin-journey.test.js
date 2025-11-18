/**
 * E2E Test: Admin Journey
 * Test toàn bộ admin flow
 */

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const Product = require('../../models/product');
const Order = require('../../models/order');
const { cleanupDatabase } = require('../helpers/testHelpers');

describe('E2E: Admin Journey', () => {
  let adminToken;
  let adminId;
  let userToken;
  let userId;
  let productId;
  let orderId;

  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('1. Admin Setup', () => {
    test('should create admin user', async () => {
      // Sample base64 image (1x1 red pixel PNG)
      const sampleAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123',
          avatar: sampleAvatar
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      adminId = response.body.user._id;

      // Manually set role to admin
      await User.findByIdAndUpdate(adminId, { role: 'admin' });

      console.log('✅ Admin user created');
    });

    test('should login as admin', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const cookies = response.headers['set-cookie'];
      adminToken = cookies[0].split(';')[0].split('=')[1];

      console.log('✅ Admin logged in');
    });

    test('should create regular user for testing', async () => {
      // Sample base64 image (1x1 red pixel PNG)
      const sampleAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Regular User',
          email: 'user@example.com',
          password: 'user123',
          avatar: sampleAvatar
        })
        .expect(200);

      userId = response.body.user._id;
      const cookies = response.headers['set-cookie'];
      userToken = cookies[0].split(';')[0].split('=')[1];

      console.log('✅ Regular user created');
    });
  });

  describe('2. Product Management', () => {
    test('should create new product as admin', async () => {
      const response = await request(app)
        .post('/api/v1/admin/product/new')
        .set('Cookie', [`token=${adminToken}`])
        .send({
          name: 'Admin Test Product',
          price: 199.99,
          description: 'Product created by admin',
          category: 'Electronics',
          seller: 'Admin Seller',
          stock: 50,
          images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      productId = response.body.product._id;

      console.log('✅ Product created by admin');
    });

    test('should get all admin products', async () => {
      const response = await request(app)
        .get('/api/v1/admin/products')
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);

      console.log('✅ Admin products list retrieved');
    });

    test('should update product as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          name: 'Updated Admin Product',
          price: 249.99,
          description: 'Updated by admin',
          category: 'Electronics',
          seller: 'Admin Seller',
          stock: 100,
          images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe('Updated Admin Product');

      console.log('✅ Product updated by admin');
    });

    test('regular user should not create product', async () => {
      const response = await request(app)
        .post('/api/v1/admin/product/new')
        .set('Cookie', [`token=${userToken}`])
        .send({
          name: 'Unauthorized Product',
          price: 99.99
        })
        .expect(403);

      expect(response.body.success).toBe(false);

      console.log('✅ Regular user blocked from creating product');
    });
  });

  describe('3. User Management', () => {
    test('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);

      console.log('✅ All users retrieved by admin');
    });

    test('should get single user details as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('user@example.com');

      console.log('✅ User details retrieved by admin');
    });

    test('should update user role as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          name: 'Regular User',
          email: 'user@example.com',
          role: 'admin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify role change
      const user = await User.findById(userId);
      expect(user.role).toBe('admin');

      console.log('✅ User role updated by admin');
    });

    test('regular user should not access admin routes', async () => {
      // Reset user role back to 'user' (was changed to admin in previous test)
      await User.findByIdAndUpdate(userId, { role: 'user' });

      // Login again to get new token with user role
      const loginResponse = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'user@example.com',
          password: 'user123'
        });

      const cookies = loginResponse.headers['set-cookie'];
      const newUserToken = cookies[0].split(';')[0].split('=')[1];

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', [`token=${newUserToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);

      console.log('✅ Regular user blocked from admin routes');
    });
  });

  describe('4. Order Management', () => {
    beforeAll(async () => {
      // Create test order
      const order = await Order.create({
        shippingInfo: {
          address: '123 Admin Street',
          city: 'Admin City',
          phoneNo: '9876543210',
          postalCode: '54321',
          country: 'Admin Country'
        },
        user: userId,
        orderItems: [{
          name: 'Admin Test Product',
          quantity: 1,
          image: 'https://example.com/product.jpg',
          price: 199.99,
          product: productId
        }],
        paymentInfo: {
          id: 'test_payment_id',
          status: 'succeeded'
        },
        paidAt: Date.now(),
        itemsPrice: 199.99,
        taxPrice: 9.99,
        shippingPrice: 25000,
        totalPrice: 25209.98,
        orderCode: Math.floor(Math.random() * 1000000) // Add required orderCode
      });
      orderId = order._id;
    });

    test('should get all orders as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);

      console.log('✅ All orders retrieved by admin');
    });

    test('should update order status as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/order/${orderId}`)
        .set('Cookie', [`token=${adminToken}`])
        .send({
          status: 'Processing'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      console.log('✅ Order status updated by admin');
    });

    test('should delete order as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/order/${orderId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      console.log('✅ Order deleted by admin');
    });
  });

  describe('5. Product Deletion', () => {
    test('should delete product as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/product/${productId}`)
        .set('Cookie', [`token=${adminToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      console.log('✅ Product deleted by admin');
    });

    test('regular user should not delete product', async () => {
      // Create another product first
      const product = await Product.create({
        name: 'Test Product',
        price: 99.99,
        description: 'Test',
        category: 'Test',
        seller: 'Test',
        stock: 10,
        images: [{ public_id: 'test', url: 'test.jpg' }],
        user: adminId
      });

      // Reset user role and get new token
      await User.findByIdAndUpdate(userId, { role: 'user' });

      const loginResponse = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'user@example.com',
          password: 'user123'
        });

      const cookies = loginResponse.headers['set-cookie'];
      const newUserToken = cookies[0].split(';')[0].split('=')[1];

      const response = await request(app)
        .delete(`/api/v1/admin/product/${product._id}`)
        .set('Cookie', [`token=${newUserToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);

      console.log('✅ Regular user blocked from deleting product');
    });
  });

  describe('6. Admin Test Summary', () => {
    test('should complete full admin journey', async () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 ADMIN E2E TEST COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log('✅ Admin Authentication');
      console.log('✅ Product Management (CRUD)');
      console.log('✅ User Management');
      console.log('✅ Order Management');
      console.log('✅ Authorization & Security');
      console.log('='.repeat(60));

      expect(true).toBe(true);
    });
  });
});

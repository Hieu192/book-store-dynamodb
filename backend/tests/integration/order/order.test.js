const request = require('supertest');
const app = require('../../../app');
const Order = require('../../../models/order');
const Product = require('../../../models/product');
const {
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
  cleanupDatabase
} = require('../../helpers/testHelpers');

describe('Order Integration Tests', () => {
  
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/order/new', () => {
    it('should create new order', async () => {
      const user = await createTestUser();
      const product = await createTestProduct(user._id, { stock: 10 });
      const token = user.getJwtToken();

      const orderData = {
        orderCode: Date.now(),
        orderItems: [{
          name: product.name,
          quantity: 2,
          image: product.images[0].url,
          price: product.price,
          product: product._id
        }],
        shippingInfo: {
          address: '123 Test St',
          city: 'Test City',
          phoneNo: '1234567890',
          postalCode: '12345',
          country: 'Test Country'
        },
        itemsPrice: 199.98,
        taxPrice: 19.99,
        shippingPrice: 10.00,
        totalPrice: 229.97,
        paymentInfo: {
          id: 'test_payment_123',
          status: 'succeeded'
        }
      };

      const response = await request(app)
        .post('/api/v1/order/new')
        .set('Cookie', [`token=${token}`])
        .send(orderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order).toHaveProperty('orderCode', orderData.orderCode);
      expect(response.body.order.orderItems).toHaveLength(1);
      expect(response.body.order.totalPrice).toBe(orderData.totalPrice);

      // Verify in database
      const order = await Order.findOne({ orderCode: orderData.orderCode });
      expect(order).toBeTruthy();
      expect(order.user.toString()).toBe(user._id.toString());
    });

    it('should not create order without authentication', async () => {
      const orderData = {
        orderCode: Date.now(),
        orderItems: [],
        shippingInfo: {},
        itemsPrice: 100,
        taxPrice: 10,
        shippingPrice: 5,
        totalPrice: 115
      };

      const response = await request(app)
        .post('/api/v1/order/new')
        .send(orderData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should create order with multiple items', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct(user._id, { name: 'Product 1', price: 100 });
      const product2 = await createTestProduct(user._id, { name: 'Product 2', price: 200 });
      const token = user.getJwtToken();

      const orderData = {
        orderCode: Date.now(),
        orderItems: [
          {
            name: product1.name,
            quantity: 1,
            image: product1.images[0].url,
            price: product1.price,
            product: product1._id
          },
          {
            name: product2.name,
            quantity: 2,
            image: product2.images[0].url,
            price: product2.price,
            product: product2._id
          }
        ],
        shippingInfo: {
          address: '123 Test St',
          city: 'Test City',
          phoneNo: '1234567890',
          postalCode: '12345',
          country: 'Test Country'
        },
        itemsPrice: 500,
        taxPrice: 50,
        shippingPrice: 10,
        totalPrice: 560,
        paymentInfo: {
          id: 'test_payment',
          status: 'succeeded'
        }
      };

      const response = await request(app)
        .post('/api/v1/order/new')
        .set('Cookie', [`token=${token}`])
        .send(orderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.orderItems).toHaveLength(2);
    });
  });

  describe('GET /api/v1/order/:id', () => {
    it('should get single order by id', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id);
      const token = user.getJwtToken();

      const response = await request(app)
        .get(`/api/v1/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order).toHaveProperty('_id', order._id.toString());
      expect(response.body.order).toHaveProperty('orderCode', order.orderCode);
      expect(response.body.order.user).toHaveProperty('_id', user._id.toString());
    });

    it('should return 404 for non-existent order', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/order/${fakeId}`)
        .set('Cookie', [`token=${token}`])
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No Order found');
    });

    it('should not get order without authentication', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id);

      const response = await request(app)
        .get(`/api/v1/order/${order._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/orders/me', () => {
    it('should get logged in user orders', async () => {
      const user = await createTestUser();
      await createTestOrder(user._id, { orderCode: 1001 });
      await createTestOrder(user._id, { orderCode: 1002 });
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/orders/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orders).toHaveLength(2);
      expect(response.body.orders[0].user.toString()).toBe(user._id.toString());
    });

    it('should return empty array if user has no orders', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/orders/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orders).toHaveLength(0);
    });

    it('should not get orders without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/orders/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/orders', () => {
    it('should get all orders as admin', async () => {
      const admin = await createAdminUser();
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      await createTestOrder(user1._id, { totalPrice: 100 });
      await createTestOrder(user2._id, { totalPrice: 200 });
      
      const token = admin.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orders).toHaveLength(2);
      expect(response.body.totalAmount).toBe(300);
    });

    it('should not get all orders as regular user', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/order/:id', () => {
    it('should update order status as admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const product = await createTestProduct(user._id, { stock: 10 });
      
      const order = await createTestOrder(user._id, {
        orderStatus: 'Processing',
        orderItems: [{
          name: product.name,
          quantity: 2,
          image: product.images[0].url,
          price: product.price,
          product: product._id
        }]
      });
      
      const token = admin.getJwtToken();

      const response = await request(app)
        .put(`/api/v1/admin/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .send({ status: 'Delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify order status updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.orderStatus).toBe('Delivered');
      expect(updatedOrder.deliveredAt).toBeTruthy();

      // Verify stock updated
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(8); // 10 - 2
    });

    it('should not update already delivered order', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const order = await createTestOrder(user._id, { orderStatus: 'Delivered' });
      const token = admin.getJwtToken();

      const response = await request(app)
        .put(`/api/v1/admin/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .send({ status: 'Processing' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already delivered');
    });

    it('should not update order as regular user', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id);
      const token = user.getJwtToken();

      const response = await request(app)
        .put(`/api/v1/admin/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .send({ status: 'Delivered' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/order/:id', () => {
    it('should delete order as admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const order = await createTestOrder(user._id);
      const token = admin.getJwtToken();

      const response = await request(app)
        .delete(`/api/v1/admin/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deletedOrder = await Order.findById(order._id);
      expect(deletedOrder).toBeNull();
    });

    it('should not delete order as regular user', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id);
      const token = user.getJwtToken();

      const response = await request(app)
        .delete(`/api/v1/admin/order/${order._id}`)
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when deleting non-existent order', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/v1/admin/order/${fakeId}`)
        .set('Cookie', [`token=${token}`])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

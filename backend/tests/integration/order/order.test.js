const request = require('supertest');
const app = require('../../../app');
const orderService = require('../../../services/OrderService');
const productService = require('../../../services/ProductService');





const {
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder
} = require('../../helpers/testHelpers');



describe('Order Integration Tests', () => {
  jest.setTimeout(120000);

  describe('POST /api/v1/order/new', () => {
    it('should create new order', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const product = await createTestProduct(userId, { stock: 10 });
      const productId = product.id || product._id;
      const token = user.getJwtToken();

      const orderData = {
        orderCode: Date.now(),
        orderItems: [{
          name: product.name,
          quantity: 2,
          image: product.images[0].url,
          price: product.price,
          product: productId
        }],
        shippingInfo: {
          address: '123 Test St',
          city: 'Test City',
          phoneNo: '1234567890',
          postalCode: '12345',
          country: 'Test Country'
        },
        itemsPrice: product.price * 2,
        taxPrice: (product.price * 2) * 0.1,
        shippingPrice: 10.00,
        totalPrice: (product.price * 2) * 1.1 + 10,
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

      // Verify via OrderService
      const orderId = response.body.order.id || response.body.order._id;
      const order = await orderService.getOrder(orderId);
      expect(order).toBeTruthy();
      expect(order.orderCode).toBe(orderData.orderCode);
      expect(order.totalPrice).toBe(orderData.totalPrice);
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
      const userId = user.id || user._id;
      const product1 = await createTestProduct(userId, { name: `Product A ${Date.now()}`, price: 100 });
      const product2 = await createTestProduct(userId, { name: `Product B ${Date.now()}`, price: 200 });
      const token = user.getJwtToken();

      const orderData = {
        orderCode: Date.now(),
        orderItems: [
          {
            name: product1.name,
            quantity: 1,
            image: product1.images[0].url,
            price: product1.price,
            product: product1.id || product1._id
          },
          {
            name: product2.name,
            quantity: 2,
            image: product2.images[0].url,
            price: product2.price,
            product: product2.id || product2._id
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

      // Verify via OrderService
      const orderId = response.body.order.id || response.body.order._id;
      const order = await orderService.getOrder(orderId);
      expect(order.orderItems).toHaveLength(2);
    });
  });

  describe('GET /api/v1/order/:id', () => {
    it('should get single order by id', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const order = await createTestOrder(userId);
      const token = user.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .get(`/api/v1/order/${orderId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order).toHaveProperty('orderCode', order.orderCode);
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
      const userId = user.id || user._id;
      const order = await createTestOrder(userId);
      const orderId = order.id || order._id;

      const response = await request(app)
        .get(`/api/v1/order/${orderId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/orders/me', () => {
    it('should get logged in user orders', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      await createTestOrder(userId, { orderCode: Date.now() });
      await createTestOrder(userId, { orderCode: Date.now() + 1 });



      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/orders/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orders.length).toBeGreaterThanOrEqual(2);

      // Verify via OrderService
      const myOrders = await orderService.getMyOrders(userId);
      expect(myOrders.length).toBeGreaterThanOrEqual(2);
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
      const userId1 = user1.id || user1._id;
      const userId2 = user2.id || user2._id;

      await createTestOrder(userId1, { totalPrice: 100, orderCode: Date.now() });
      await createTestOrder(userId2, { totalPrice: 200, orderCode: Date.now() + 1 });



      const token = admin.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/orders')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      console.log('[Admin Orders Test] Response:', JSON.stringify(response.body, null, 2));

      expect(response.body.success).toBe(true);
      expect(response.body.orders.length).toBeGreaterThanOrEqual(2);

      // Verify via OrderService
      const allOrders = await orderService.getAllOrders();
      expect(allOrders.length).toBeGreaterThanOrEqual(2);
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
      const userId = user.id || user._id;
      const product = await createTestProduct(userId, { stock: 10 });
      const productId = product.id || product._id;

      const order = await createTestOrder(userId, {
        orderStatus: 'Processing',
        orderCode: Date.now(),
        orderItems: [{
          name: product.name,
          quantity: 2,
          image: product.images[0].url,
          price: product.price,
          product: productId
        }]
      });

      const token = admin.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .put(`/api/v1/admin/order/${orderId}`)
        .set('Cookie', [`token=${token}`])
        .send({ status: 'Delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify via OrderService
      const updatedOrder = await orderService.getOrder(orderId);
      expect(updatedOrder.orderStatus).toBe('Delivered');
      expect(updatedOrder.deliveredAt).toBeTruthy();

      // Verify stock updated via ProductService
      const updatedProduct = await productService.getProduct(productId);
      expect(updatedProduct.stock).toBe(8); // 10 - 2
    });

    it('should not update already delivered order', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const userId = user.id || user._id;
      const order = await createTestOrder(userId, {
        orderStatus: 'Delivered',
        orderCode: Date.now()
      });
      const token = admin.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .put(`/api/v1/admin/order/${orderId}`)
        .set('Cookie', [`token=${token}`])
        .send({ status: 'Processing' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already delivered');
    });

    it('should not update order as regular user', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const order = await createTestOrder(userId);
      const token = user.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .put(`/api/v1/admin/order/${orderId}`)
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
      const userId = user.id || user._id;
      const order = await createTestOrder(userId);
      const token = admin.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .delete(`/api/v1/admin/order/${orderId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion via OrderService
      const deletedOrder = await orderService.getOrder(orderId);
      expect(deletedOrder).toBeNull();
    });

    it('should not delete order as regular user', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const order = await createTestOrder(userId);
      const token = user.getJwtToken();
      const orderId = order.id || order._id;

      const response = await request(app)
        .delete(`/api/v1/admin/order/${orderId}`)
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

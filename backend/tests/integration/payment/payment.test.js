const request = require('supertest');
const app = require('../../../app');
const {
  createTestUser,
  createTestOrder
} = require('../../helpers/testHelpers');

// Mock PayOS
jest.mock('@payos/node', () => {
  return jest.fn().mockImplementation(() => ({
    createPaymentLink: jest.fn().mockResolvedValue({
      checkoutUrl: 'https://payos.vn/checkout/test-url-123'
    })
  }));
});

describe('Payment Integration Tests', () => {
  jest.setTimeout(60000);

  describe('POST /api/v1/create-payment-link', () => {
    it('should create payment link successfully', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;

      const order = await createTestOrder(userId, {
        orderCode: Date.now() + Math.floor(Math.random() * 10000),
        totalPrice: 1000
      });

      const paymentData = {
        orderCode: order.orderCode,
        totalPrice: order.totalPrice
      };

      const response = await request(app)
        .post('/api/v1/create-payment-link')
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.checkoutUrl).toBeTruthy();
      expect(response.body.checkoutUrl).toContain('payos.vn');
    });

    it('should create payment link with valid data', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;

      const order = await createTestOrder(userId, {
        orderCode: Date.now() + 50000 + Math.floor(Math.random() * 10000),
        totalPrice: 2000
      });

      const paymentData = {
        orderCode: order.orderCode,
        totalPrice: 2000
      };

      const response = await request(app)
        .post('/api/v1/create-payment-link')
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.checkoutUrl).toBeTruthy();
    });
  });

  describe('POST /api/v1/receive-hook', () => {
    it('should process successful payment webhook', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;

      // Unique orderCode with random component
      const uniqueOrderCode = Date.now() + Math.floor(Math.random() * 100000);
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

      // Wait for order to be saved (repository has retry logic)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const webhookData = {
        data: {
          orderCode: uniqueOrderCode,
          amount: 1000
        },
        success: true
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Wait for async update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify order marked as paid
      const orderService = require('../../../services/OrderService');
      const updatedOrder = await orderService.getOrderByOrderCode(uniqueOrderCode);
      expect(updatedOrder).toBeTruthy();
      expect(updatedOrder.paidAt).toBeTruthy();
    });

    it('should not process webhook with wrong amount', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;

      // Unique orderCode with large offset and random component
      const uniqueOrderCode = Date.now() + 1000000 + Math.floor(Math.random() * 100000);
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

      // Wait for order to be saved (repository has retry logic)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const webhookData = {
        data: {
          orderCode: uniqueOrderCode,
          amount: 500 // Wrong amount
        },
        success: true
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      // Controller still returns success even if amount is wrong (just doesn't update paidAt)
      expect(response.body.success).toBe(true);

      // Wait and verify order NOT marked as paid
      await new Promise(resolve => setTimeout(resolve, 1000));
      const orderService = require('../../../services/OrderService');
      const unpaidOrder = await orderService.getOrderByOrderCode(uniqueOrderCode);
      expect(unpaidOrder).toBeTruthy();
      expect(unpaidOrder.paidAt).toBeFalsy();
    });

    it('should not process webhook if payment failed', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;

      // Unique orderCode with large offset and random component
      const uniqueOrderCode = Date.now() + 2000000 + Math.floor(Math.random() * 100000);
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

      // Wait for order to be saved (repository has retry logic)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const webhookData = {
        data: {
          orderCode: uniqueOrderCode,
          amount: 1000
        },
        success: false // Payment failed
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      // Controller still returns success even if payment failed (just doesn't update paidAt)
      expect(response.body.success).toBe(true);

      // Wait and verify order NOT marked as paid
      await new Promise(resolve => setTimeout(resolve, 1000));
      const orderService = require('../../../services/OrderService');
      const unpaidOrder = await orderService.getOrderByOrderCode(uniqueOrderCode);
      expect(unpaidOrder).toBeTruthy();
      expect(unpaidOrder.paidAt).toBeFalsy();
    });

    it('should handle non-existent order', async () => {
      const webhookData = {
        data: {
          orderCode: 999999999 + Math.floor(Math.random() * 1000000),
          amount: 1000
        },
        success: true
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      // Should return empty object for non-existent order
      expect(response.body).toEqual({});
    });

    it('should handle missing webhook data', async () => {
      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

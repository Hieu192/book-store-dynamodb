const request = require('supertest');
const app = require('../../../app');
const Order = require('../../../models/order');
const {
  createTestUser,
  createTestOrder,
  cleanupDatabase
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
  
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/create-payment-link', () => {
    it('should create payment link successfully', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: Date.now(),
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

      // Verify order updated with checkout URL
      const updatedOrder = await Order.findOne({ orderCode: order.orderCode });
      expect(updatedOrder.checkoutUrl).toBeTruthy();
    });

    it('should create payment link with valid data', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: Date.now() + 1,
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

    it('should handle different order amounts', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: Date.now() + 2,
        totalPrice: 5000
      });

      const paymentData = {
        orderCode: order.orderCode,
        totalPrice: 5000
      };

      const response = await request(app)
        .post('/api/v1/create-payment-link')
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/receive-hook', () => {
    it('should process successful payment webhook', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: 123456,
        totalPrice: 1000
      });

      const webhookData = {
        data: {
          orderCode: 123456,
          amount: 1000
        },
        success: true
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify order marked as paid
      const updatedOrder = await Order.findOne({ orderCode: 123456 });
      expect(updatedOrder.paidAt).toBeTruthy();
    });

    it('should not update order if amount mismatch', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: 123457,
        totalPrice: 1000
      });

      const webhookData = {
        data: {
          orderCode: 123457,
          amount: 500 // Wrong amount
        },
        success: true
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify order NOT marked as paid
      const updatedOrder = await Order.findOne({ orderCode: 123457 });
      expect(updatedOrder.paidAt).toBeFalsy();
    });

    it('should not update order if payment not successful', async () => {
      const user = await createTestUser();
      const order = await createTestOrder(user._id, {
        orderCode: 123458,
        totalPrice: 1000
      });

      const webhookData = {
        data: {
          orderCode: 123458,
          amount: 1000
        },
        success: false // Payment failed
      };

      const response = await request(app)
        .post('/api/v1/receive-hook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify order NOT marked as paid
      const updatedOrder = await Order.findOne({ orderCode: 123458 });
      expect(updatedOrder.paidAt).toBeFalsy();
    });

    it('should handle non-existent order', async () => {
      const webhookData = {
        data: {
          orderCode: 999999,
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

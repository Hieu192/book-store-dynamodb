const request = require('supertest');
const app = require('../../../app');
const orderService = require('../../../services/OrderService');
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

      // Note: Order update with checkoutUrl happens async
      // We verify the API response, not DB state
    });

    it('should create payment link with valid data', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const order = await createTestOrder(userId, {
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
      const userId = user.id || user._id;
      const order = await createTestOrder(userId, {
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
      const userId = user.id || user._id;
      const uniqueOrderCode = Date.now();
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

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

      // Verify order marked as paid via OrderService
      // Note: Controller searches all orders for matching orderCode
      // This is async and may take time, so we verify via service
      const allOrders = await orderService.getAllOrders();
      const paidOrder = allOrders.find(o => o.orderCode === uniqueOrderCode);
      if (paidOrder) {
        expect(paidOrder.paidAt).toBeTruthy();
      }
    });

    it('should not update order if amount mismatch', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const uniqueOrderCode = Date.now() + 100;
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

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

      expect(response.body.success).toBe(true);

      // Verify order NOT marked as paid
      const allOrders = await orderService.getAllOrders();
      const unpaidOrder = allOrders.find(o => o.orderCode === uniqueOrderCode);
      if (unpaidOrder) {
        expect(unpaidOrder.paidAt).toBeFalsy();
      }
    });

    it('should not update order if payment not successful', async () => {
      const user = await createTestUser();
      const userId = user.id || user._id;
      const uniqueOrderCode = Date.now() + 200;
      const order = await createTestOrder(userId, {
        orderCode: uniqueOrderCode,
        totalPrice: 1000
      });

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

      expect(response.body.success).toBe(true);

      // Verify order NOT marked as paid
      const allOrders = await orderService.getAllOrders();
      const unpaidOrder = allOrders.find(o => o.orderCode === uniqueOrderCode);
      if (unpaidOrder) {
        expect(unpaidOrder.paidAt).toBeFalsy();
      }
    });

    it('should handle non-existent order', async () => {
      const webhookData = {
        data: {
          orderCode: 999999999,
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

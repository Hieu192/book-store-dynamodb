const request = require('supertest');
const app = require('../../../app');
const { createTestUser, createTestOrder } = require('../../helpers/testHelpers');
const orderService = require('../../../services/OrderService');

// Mock PayOS
jest.mock('@payos/node', () => {
    return jest.fn().mockImplementation(() => ({
        createPaymentLink: jest.fn().mockResolvedValue({
            checkoutUrl: 'https://payos.vn/checkout/test-url-123'
        })
    }));
});

describe('Payment Test With User/Order Creation', () => {
    jest.setTimeout(30000);

    let createdOrders = [];

    afterEach(async () => {
        for (const orderId of createdOrders) {
            try {
                await orderService.deleteOrder(orderId);
            } catch (err) {
                // Ignore
            }
        }
        createdOrders = [];
    });

    it('should create user and order', async () => {
        console.log('Creating test user...');
        const user = await createTestUser();
        console.log('Test user created:', user.id || user._id);

        const userId = user.id || user._id;

        console.log('Creating test order...');
        const order = await createTestOrder(userId, {
            orderCode: Date.now(),
            totalPrice: 1000
        });
        console.log('Test order created:', order.id || order._id);

        createdOrders.push(order.id || order._id);

        expect(order).toBeTruthy();
        expect(order.orderCode).toBeTruthy();
        expect(order.totalPrice).toBe(1000);
    }, 30000);
});

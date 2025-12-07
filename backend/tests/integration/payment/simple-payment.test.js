const request = require('supertest');
const app = require('../../../app');

// Mock PayOS
jest.mock('@payos/node', () => {
    return jest.fn().mockImplementation(() => ({
        createPaymentLink: jest.fn().mockResolvedValue({
            checkoutUrl: 'https://payos.vn/checkout/test-url-123'
        })
    }));
});

describe('Simple Payment Test', () => {
    jest.setTimeout(10000);

    it('should handle missing webhook data', async () => {
        const response = await request(app)
            .post('/api/v1/receive-hook')
            .send({})
            .expect(500);

        expect(response.body.success).toBe(false);
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
});

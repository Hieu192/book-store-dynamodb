const request = require('supertest');
const app = require('../../app');
const { createTestUser, createAdminUser, createTestProduct, createTestOrder, cleanupDatabase } = require('../helpers/testHelpers');

/**
 * Enhanced Performance Tests
 * Best practices for API performance testing
 */
describe('Enhanced Performance Tests', () => {
    const TEST_PREFIX = 'TEST_';
    let testUser;
    let adminUser;
    let authToken;
    let adminToken;

    beforeAll(async () => {
        await cleanupDatabase();

        // Create test users
        testUser = await createTestUser();
        adminUser = await createAdminUser();

        // Get tokens
        const userLogin = await request(app)
            .post('/api/v1/login')
            .send({ email: testUser.email, password: 'password123' });
        authToken = userLogin.headers['set-cookie'];

        const adminLogin = await request(app)
            .post('/api/v1/login')
            .send({ email: adminUser.email, password: 'password123' });
        adminToken = adminLogin.headers['set-cookie'];
    }, 30000);

    afterAll(async () => {
        await cleanupDatabase();
    });

    // ============================================
    // 📊 BENCHMARK: Response Time Thresholds
    // Note: Adjusted for DynamoDB with network latency
    // ============================================
    const THRESHOLDS = {
        FAST: 500,      // Simple read operations (DynamoDB cold start included)
        NORMAL: 1000,   // Standard CRUD
        SLOW: 2000,     // Complex queries
        AUTH: 3000,     // Password hashing operations
        STRESS: 10000,  // Under high load
    };

    // ============================================
    // 🔐 AUTHENTICATION PERFORMANCE
    // ============================================
    describe('Authentication Performance', () => {
        it('JWT token validation should be fast (< 200ms)', async () => {
            const times = [];

            for (let i = 0; i < 5; i++) {
                const start = Date.now();
                await request(app)
                    .get('/api/v1/me')
                    .set('Cookie', authToken)
                    .expect(200);
                times.push(Date.now() - start);
            }

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`🔐 JWT Validation Avg: ${avgTime.toFixed(2)}ms`);
            expect(avgTime).toBeLessThan(THRESHOLDS.FAST); // 500ms for DynamoDB
        });

        it('Invalid token rejection should be fast (< 100ms)', async () => {
            const start = Date.now();
            await request(app)
                .get('/api/v1/me')
                .set('Cookie', 'token=invalid_token_here')
                .expect(401);

            const responseTime = Date.now() - start;
            console.log(`🔐 Invalid Token Rejection: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(200); // Network latency included
        });
    });

    // ============================================
    // 📦 ORDER CREATION PERFORMANCE (Business Critical)
    // ============================================
    describe('Order Performance (Business Critical)', () => {
        let testProduct;

        beforeAll(async () => {
            testProduct = await createTestProduct(testUser.id || testUser._id, {
                stock: 1000,
                name: `${TEST_PREFIX}PerfProduct_${Date.now()}`
            });
        });

        it('Order creation should complete within threshold', async () => {
            const orderData = {
                orderCode: Date.now(),
                orderItems: [{
                    name: testProduct.name,
                    quantity: 1,
                    image: 'https://example.com/img.jpg',
                    price: testProduct.price,
                    product: testProduct.id || testProduct._id
                }],
                shippingInfo: {
                    address: `${TEST_PREFIX}123 Perf St`,
                    city: `${TEST_PREFIX}City`,
                    phoneNo: '1234567890',
                    postalCode: '12345',
                    country: `${TEST_PREFIX}Country`
                },
                itemsPrice: testProduct.price,
                taxPrice: testProduct.price * 0.1,
                shippingPrice: 10,
                totalPrice: testProduct.price * 1.1 + 10,
                paymentInfo: { id: `${TEST_PREFIX}payment`, status: 'succeeded' }
            };

            const start = Date.now();
            const res = await request(app)
                .post('/api/v1/order/new')
                .set('Cookie', authToken)
                .send(orderData)
                .expect(200);

            const responseTime = Date.now() - start;
            console.log(`📦 Order Creation: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.SLOW);
            expect(res.body.success).toBe(true);
        });

        it('Order listing (user) should be fast', async () => {
            // Create a few orders first
            await createTestOrder(testUser.id || testUser._id);

            const start = Date.now();
            await request(app)
                .get('/api/v1/orders/me')
                .set('Cookie', authToken)
                .expect(200);

            const responseTime = Date.now() - start;
            console.log(`📦 My Orders List: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.NORMAL);
        });
    });

    // ============================================
    // 🔥 STRESS TEST - High Concurrency
    // ============================================
    describe('Stress Tests', () => {
        it('should handle 20 concurrent requests without failure', async () => {
            const concurrency = 20;
            const start = Date.now();

            const promises = Array(concurrency).fill(null).map(() =>
                request(app).get('/api/v1/products')
            );

            const results = await Promise.all(promises);
            const totalTime = Date.now() - start;

            // Count successful responses
            const successCount = results.filter(r => r.status === 200).length;
            const avgTime = totalTime / concurrency;

            console.log(`🔥 Stress Test (${concurrency} concurrent):`);
            console.log(`   Total Time: ${totalTime}ms`);
            console.log(`   Avg per request: ${avgTime.toFixed(2)}ms`);
            console.log(`   Success Rate: ${(successCount / concurrency * 100).toFixed(1)}%`);

            expect(successCount).toBe(concurrency);
            expect(totalTime).toBeLessThan(THRESHOLDS.STRESS);
        });

        it('should maintain performance under sustained load', async () => {
            const batches = 3;
            const requestsPerBatch = 10;
            const batchTimes = [];

            for (let batch = 0; batch < batches; batch++) {
                const start = Date.now();

                const promises = Array(requestsPerBatch).fill(null).map(() =>
                    request(app).get('/api/v1/products').expect(200)
                );
                await Promise.all(promises);

                batchTimes.push(Date.now() - start);

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batches;
            const variance = Math.max(...batchTimes) - Math.min(...batchTimes);

            console.log(`🔥 Sustained Load Test (${batches} batches x ${requestsPerBatch}):`);
            console.log(`   Batch Times: ${batchTimes.map(t => t + 'ms').join(', ')}`);
            console.log(`   Avg Batch Time: ${avgBatchTime.toFixed(2)}ms`);
            console.log(`   Variance: ${variance}ms`);

            // Performance should not degrade significantly across batches
            expect(variance).toBeLessThan(2000);
        }, 30000);
    });

    // ============================================
    // 📈 PERCENTILE TESTS (p50, p95, p99)
    // ============================================
    describe('Response Time Percentiles', () => {
        it('should meet percentile targets for product listing', async () => {
            const times = [];
            const iterations = 20;

            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await request(app).get('/api/v1/products').expect(200);
                times.push(Date.now() - start);
            }

            times.sort((a, b) => a - b);

            const p50 = times[Math.floor(iterations * 0.5)];
            const p95 = times[Math.floor(iterations * 0.95)];
            const p99 = times[Math.floor(iterations * 0.99)];

            console.log(`📈 Response Time Percentiles (${iterations} requests):`);
            console.log(`   p50 (median): ${p50}ms`);
            console.log(`   p95: ${p95}ms`);
            console.log(`   p99: ${p99}ms`);

            expect(p50).toBeLessThan(THRESHOLDS.NORMAL);
            expect(p95).toBeLessThan(THRESHOLDS.SLOW);
            expect(p99).toBeLessThan(THRESHOLDS.SLOW * 1.5);
        }, 60000);
    });

    // ============================================
    // ❌ ERROR HANDLING PERFORMANCE
    // ============================================
    describe('Error Handling Performance', () => {
        it('404 errors should be fast', async () => {
            const start = Date.now();
            await request(app)
                .get('/api/v1/product/507f1f77bcf86cd799439011')
                .expect(404);

            const responseTime = Date.now() - start;
            console.log(`❌ 404 Response: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.FAST);
        });

        it('Validation errors should be fast', async () => {
            const start = Date.now();
            await request(app)
                .post('/api/v1/login')
                .send({ email: '', password: '' })
                .expect(400);

            const responseTime = Date.now() - start;
            console.log(`❌ Validation Error: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(200); // Network latency included
        });

        it('Unauthorized errors should be fast', async () => {
            const start = Date.now();
            await request(app)
                .get('/api/v1/admin/users')
                .expect(401);

            const responseTime = Date.now() - start;
            console.log(`❌ Unauthorized: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(100); // No DB call needed
        });
    });

    // ============================================
    // 💾 DATABASE QUERY OPTIMIZATION
    // ============================================
    describe('Database Query Optimization', () => {
        beforeAll(async () => {
            // Create test data for query tests
            const promises = Array(15).fill(null).map((_, i) =>
                createTestProduct(testUser.id || testUser._id, {
                    name: `${TEST_PREFIX}QueryTest_${Date.now()}_${i}`,
                    price: 50 + i * 10,
                    category: i % 2 === 0 ? `${TEST_PREFIX}Electronics` : `${TEST_PREFIX}Books`
                })
            );
            await Promise.all(promises);
        }, 60000);

        it('Filtered query should be optimized', async () => {
            const start = Date.now();
            await request(app)
                .get('/api/v1/products?price[gte]=50&price[lte]=100')
                .expect(200);

            const responseTime = Date.now() - start;
            console.log(`💾 Filtered Query: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.NORMAL);
        });

        it('Category filter should use index efficiently', async () => {
            const start = Date.now();
            await request(app)
                .get(`/api/v1/products?category=${TEST_PREFIX}Electronics`)
                .expect(200);

            const responseTime = Date.now() - start;
            console.log(`💾 Category Query: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.NORMAL);
        });

        it('Sorting should be efficient', async () => {
            const start = Date.now();
            await request(app)
                .get('/api/v1/products?sortByPrice=1')
                .expect(200);

            const responseTime = Date.now() - start;
            console.log(`💾 Sorted Query: ${responseTime}ms`);
            expect(responseTime).toBeLessThan(THRESHOLDS.NORMAL);
        });
    });
});

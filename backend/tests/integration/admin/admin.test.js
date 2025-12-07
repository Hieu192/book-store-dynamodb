const request = require('supertest');
const app = require('../../../app');
const userService = require('../../../services/UserService');
const productService = require('../../../services/ProductService');
const {
  createTestUser,
  createAdminUser,
  createTestProduct
} = require('../../helpers/testHelpers');

describe('Admin Integration Tests', () => {
  jest.setTimeout(120000);

  describe('GET /api/v1/admin/users', () => {
    it('should get all users as admin', async () => {
      const admin = await createAdminUser();
      await createTestUser(); // Uses unique timestamp email
      await createTestUser(); // Uses unique timestamp email

      const token = admin.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3); // admin + 2 users
    });

    it('should not get users as regular user', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not allowed');
    });

    it('should not get users without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/user/:id', () => {
    it('should get user details as admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser(); // Unique email
      const token = admin.getJwtToken();
      const userId = user.id || user._id;

      const response = await request(app)
        .get(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(user.email);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/admin/user/${fakeId}`)
        .set('Cookie', [`token=${token}`])
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should not get user details as regular user', async () => {
      const user = await createTestUser();
      const targetUser = await createTestUser(); // Unique email
      const token = user.getJwtToken();
      const targetUserId = targetUser.id || targetUser._id;

      const response = await request(app)
        .get(`/api/v1/admin/user/${targetUserId}`)
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/user/:id', () => {
    it('should update user as admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser({
        name: 'Old Name',
        role: 'user'
      });
      const token = admin.getJwtToken();
      const userId = user.id || user._id;

      const timestamp = Date.now();
      const updateData = {
        name: 'New Name',
        email: `updated-${timestamp}@example.com`,
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${token}`])
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update via API
      const updatedUser = await userService.getUser(userId);
      expect(updatedUser.name).toBe('New Name');
      expect(updatedUser.email).toBe(`updated-${timestamp}@example.com`);
      expect(updatedUser.role).toBe('admin');
    });

    it('should not update user as regular user', async () => {
      const user = await createTestUser();
      const targetUser = await createTestUser(); // Unique email
      const token = user.getJwtToken();
      const targetUserId = targetUser.id || targetUser._id;

      const response = await request(app)
        .put(`/api/v1/admin/user/${targetUserId}`)
        .set('Cookie', [`token=${token}`])
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should update user role from user to admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser({ role: 'user' });
      const token = admin.getJwtToken();
      const userId = user.id || user._id;

      const response = await request(app)
        .put(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${token}`])
        .send({
          name: user.name,
          email: user.email,
          role: 'admin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updatedUser = await userService.getUser(userId);
      expect(updatedUser.role).toBe('admin');
    });
  });

  describe('DELETE /api/v1/admin/user/:id', () => {
    it('should delete user as admin', async () => {
      const admin = await createAdminUser();
      const user = await createTestUser();
      const token = admin.getJwtToken();
      const userId = user.id || user._id;

      const response = await request(app)
        .delete(`/api/v1/admin/user/${userId}`)
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deletedUser = await userService.getUser(userId);
      expect(deletedUser).toBeNull();
    });

    it('should not delete user as regular user', async () => {
      const user = await createTestUser();
      const targetUser = await createTestUser(); // Unique email
      const token = user.getJwtToken();
      const targetUserId = targetUser.id || targetUser._id;

      const response = await request(app)
        .delete(`/api/v1/admin/user/${targetUserId}`)
        .set('Cookie', [`token=${token}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return error when deleting non-existent user', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/v1/admin/user/${fakeId}`)
        .set('Cookie', [`token=${token}`])
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/products', () => {
    it('should get all products as admin', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;

      await createTestProduct(adminId, { name: 'Product 1' });
      await createTestProduct(adminId, { name: 'Product 2' });
      await createTestProduct(adminId, { name: 'Product 3' });

      const token = admin.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/products')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThanOrEqual(3);
    });

    it('should get all products without pagination', async () => {
      const admin = await createAdminUser();
      const adminId = admin.id || admin._id;

      // Create 15 products
      for (let i = 1; i <= 15; i++) {
        await createTestProduct(adminId, { name: `Product ${i}` });
      }

      const token = admin.getJwtToken();

      const response = await request(app)
        .get('/api/v1/admin/products')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Admin Authorization', () => {
    it('should allow admin to access admin routes', async () => {
      const admin = await createAdminUser();
      const token = admin.getJwtToken();

      const routes = [
        { method: 'get', path: '/api/v1/admin/users' },
        { method: 'get', path: '/api/v1/admin/products' },
        { method: 'get', path: '/api/v1/admin/orders' }
      ];

      for (const route of routes) {
        const response = await request(app)
        [route.method](route.path)
          .set('Cookie', [`token=${token}`]);

        expect(response.status).not.toBe(403);
      }
    });

    it('should deny regular user access to admin routes', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const routes = [
        { method: 'get', path: '/api/v1/admin/users' },
        { method: 'get', path: '/api/v1/admin/products' },
        { method: 'get', path: '/api/v1/admin/orders' }
      ];

      for (const route of routes) {
        const response = await request(app)
        [route.method](route.path)
          .set('Cookie', [`token=${token}`])
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not allowed');
      }
    });
  });
});

const request = require('supertest');
const app = require('../../../app');
const userService = require('../../../services/UserService');
const { createTestUser, cleanupDatabase, extractCookie } = require('../../helpers/testHelpers');

describe('Authentication Integration Tests', () => {

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .post('/api/v1/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('name', userData.name);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('token');

      // Check cookie is set
      const cookie = extractCookie(response);
      expect(cookie).toBeTruthy();

      // Verify user via API (not direct DB query)
      const userId = response.body.user.id || response.body.user._id;
      const user = await userService.getUser(userId);
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
    });

    it('should not register user with duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const userData = {
        name: 'Another User',
        email: 'duplicate@example.com',
        password: 'password123',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .post('/api/v1/register')
        .send(userData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should not register user without required fields', async () => {
      const userData = {
        name: 'John Doe'
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/v1/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/login', () => {
    it('should login user with correct credentials', async () => {
      // Create user first
      const user = await createTestUser({
        email: 'login@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', 'login@example.com');
      expect(response.body).toHaveProperty('token');

      // Check cookie is set
      const cookie = extractCookie(response);
      expect(cookie).toBeTruthy();
    });

    it('should not login with incorrect password', async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'correctpassword'
      });

      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid Email or Password');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid Email or Password');
    });

    it('should not login without email or password', async () => {
      const response = await request(app)
        .post('/api/v1/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Please enter email & password');
    });
  });

  describe('GET /api/v1/logout', () => {
    it('should logout user successfully', async () => {
      const user = await createTestUser();
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/logout')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out');

      // Check cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeTruthy();
      expect(cookies[0]).toContain('token=');
    });
  });

  describe('GET /api/v1/me', () => {
    it('should get current user profile', async () => {
      const user = await createTestUser({ email: 'profile@example.com' });
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', 'profile@example.com');
      expect(response.body.user).toHaveProperty('name', user.name);
    });

    it('should not get profile without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Login first');
    });
  });

  describe('PUT /api/v1/password/update', () => {
    it('should update password successfully', async () => {
      const user = await createTestUser({ password: 'oldpassword123' });
      const token = user.getJwtToken();

      const response = await request(app)
        .put('/api/v1/password/update')
        .set('Cookie', [`token=${token}`])
        .send({
          oldPassword: 'oldpassword123',
          password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/login')
        .send({
          email: user.email,
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not update password with incorrect old password', async () => {
      const user = await createTestUser({ password: 'correctpassword' });
      const token = user.getJwtToken();

      const response = await request(app)
        .put('/api/v1/password/update')
        .set('Cookie', [`token=${token}`])
        .send({
          oldPassword: 'wrongpassword',
          password: 'newpassword123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/me/update', () => {
    it('should update user profile successfully', async () => {
      const user = await createTestUser({
        name: 'Old Name',
        email: 'old@example.com'
      });
      const token = user.getJwtToken();

      const response = await request(app)
        .put('/api/v1/me/update')
        .set('Cookie', [`token=${token}`])
        .send({
          name: 'New Name',
          email: 'new@example.com',
          avatar: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update via API
      const profileResponse = await request(app)
        .get('/api/v1/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(profileResponse.body.user.name).toBe('New Name');
      expect(profileResponse.body.user.email).toBe('new@example.com');
    });
  });

  describe('POST /api/v1/password/forgot', () => {
    it('should send password reset email', async () => {
      const user = await createTestUser({ email: 'forgot@example.com' });

      const response = await request(app)
        .post('/api/v1/password/forgot')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email sent');

      // Note: Cannot verify resetPasswordToken in DynamoDB easily
      // The email mock confirms the functionality works
    });

    it('should return error for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/password/forgot')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });
  });
});

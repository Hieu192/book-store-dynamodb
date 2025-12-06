const request = require('supertest');
const app = require('../../../app');
const userService = require('../../../services/UserService');
const { createTestUser, extractCookie } = require('../../helpers/testHelpers');

describe('Authentication Integration Tests', () => {

  describe('POST /api/v1/register', () => {
    it('should register a new user successfully', async () => {
      const uniqueEmail = `test_${Date.now()}@example.com`;
      const userData = {
        name: 'John Doe',
        email: uniqueEmail,
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

      // Verify user via service
      const userId = response.body.user.id || response.body.user._id;
      const user = await userService.getUser(userId);
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
    });

    it('should not register user with duplicate email', async () => {
      // Create unique email for this test
      const duplicateEmail = `duplicate_${Date.now()}@example.com`;

      // First registration
      await request(app)
        .post('/api/v1/register')
        .send({
          name: 'First User',
          email: duplicateEmail,
          password: 'password123'
        })
        .expect(200);

      // Second registration with same email - should fail
      const response = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Second User',
          email: duplicateEmail,
          password: 'password456'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
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
      // Register user first with unique email
      const uniqueEmail = `login_${Date.now()}@example.com`;
      await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Test User',
          email: uniqueEmail,
          password: 'password123'
        });

      // Login with created user
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: uniqueEmail,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', uniqueEmail);
      expect(response.body).toHaveProperty('token');

      // Check cookie is set
      const cookie = extractCookie(response);
      expect(cookie).toBeTruthy();
    });

    it('should not login with incorrect password', async () => {
      const uniqueEmail = `test_${Date.now()}@example.com`;

      // Register user
      await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Test User',
          email: uniqueEmail,
          password: 'correctpassword'
        });

      // Try login with wrong password
      const response = await request(app)
        .post('/api/v1/login')
        .send({
          email: uniqueEmail,
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
      const user = await createTestUser();
      const token = user.getJwtToken();

      const response = await request(app)
        .get('/api/v1/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('email', user.email);
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
      // Register user with known password
      const uniqueEmail = `pwtest_${Date.now()}@example.com`;
      const registerResponse = await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Password Test User',
          email: uniqueEmail,
          password: 'oldpassword123'
        });

      const token = registerResponse.body.token;

      // Update password
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
          email: uniqueEmail,
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Verify cannot login with old password
      const oldLoginResponse = await request(app)
        .post('/api/v1/login')
        .send({
          email: uniqueEmail,
          password: 'oldpassword123'
        })
        .expect(401);

      expect(oldLoginResponse.body.success).toBe(false);
    });

    it('should not update password with incorrect old password', async () => {
      const user = await createTestUser();
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
      const user = await createTestUser();
      const token = user.getJwtToken();
      const newName = `Updated Name ${Date.now()}`;
      const newEmail = `updated_${Date.now()}@example.com`;

      const response = await request(app)
        .put('/api/v1/me/update')
        .set('Cookie', [`token=${token}`])
        .send({
          name: newName,
          email: newEmail,
          avatar: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update via GET /api/v1/me
      const profileResponse = await request(app)
        .get('/api/v1/me')
        .set('Cookie', [`token=${token}`])
        .expect(200);

      expect(profileResponse.body.user.name).toBe(newName);
      expect(profileResponse.body.user.email).toBe(newEmail);
    });
  });

  describe('POST /api/v1/password/forgot', () => {
    it('should send password reset email', async () => {
      const uniqueEmail = `forgot_${Date.now()}@example.com`;

      // Register user first
      await request(app)
        .post('/api/v1/register')
        .send({
          name: 'Forgot Password User',
          email: uniqueEmail,
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/v1/password/forgot')
        .send({ email: uniqueEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email sent');
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

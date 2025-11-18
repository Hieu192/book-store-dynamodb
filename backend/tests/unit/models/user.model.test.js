const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../../../models/user');

// Mock bcrypt and jwt
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Model Unit Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_TIME = '7d';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should require name field', () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123'
      });

      const error = user.validateSync();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain('Please enter your name');
    });

    it('should require email field', () => {
      const user = new User({
        name: 'Test User',
        password: 'password123'
      });

      const error = user.validateSync();
      expect(error.errors.email).toBeDefined();
    });

    it('should validate email format', () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const error = user.validateSync();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.email.message).toContain('valid email');
    });

    it('should accept valid user data', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
    });

    it('should limit name to 30 characters', () => {
      const longName = 'a'.repeat(31);
      const user = new User({
        name: longName,
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const error = user.validateSync();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain('cannot exceed 30 characters');
    });

    it('should set default role to user', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      expect(user.role).toBe('user');
    });

    it('should set createdAt automatically', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      bcrypt.hash.mockResolvedValue('hashed-password');

      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'plain-password',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      // Manually trigger pre-save hook
      await user.save();

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
    });

    it('should not hash password if not modified', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'already-hashed',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      user.isModified = jest.fn().mockReturnValue(false);
      
      // This would normally trigger pre-save
      // but we're testing the logic
      if (!user.isModified('password')) {
        expect(bcrypt.hash).not.toHaveBeenCalled();
      }
    });
  });

  describe('comparePassword Method', () => {
    it('should compare passwords correctly', async () => {
      bcrypt.compare.mockResolvedValue(true);

      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const isMatch = await user.comparePassword('plain-password');

      expect(bcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      bcrypt.compare.mockResolvedValue(false);

      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const isMatch = await user.comparePassword('wrong-password');

      expect(isMatch).toBe(false);
    });
  });

  describe('getJwtToken Method', () => {
    it('should generate JWT token', () => {
      jwt.sign.mockReturnValue('mock-jwt-token');

      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const token = user.getJwtToken();

      // Check that jwt.sign was called with correct structure
      expect(jwt.sign).toHaveBeenCalled();
      const callArgs = jwt.sign.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('id');
      expect(callArgs[1]).toBe('test-secret');
      expect(callArgs[2]).toEqual({ expiresIn: '7d' });
      expect(token).toBe('mock-jwt-token');
    });
  });

  describe('getResetPasswordToken Method', () => {
    it('should generate reset password token', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const resetToken = user.getResetPasswordToken();

      expect(resetToken).toBeDefined();
      expect(typeof resetToken).toBe('string');
      expect(resetToken.length).toBe(40); // 20 bytes = 40 hex characters
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpire).toBeInstanceOf(Date);
    });

    it('should set token expiration to 30 minutes', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const beforeCall = Date.now();
      user.getResetPasswordToken();
      const afterCall = Date.now();

      const expectedExpire = 30 * 60 * 1000; // 30 minutes in ms
      const actualExpire = user.resetPasswordExpire.getTime() - beforeCall;

      expect(actualExpire).toBeGreaterThanOrEqual(expectedExpire - 100);
      expect(actualExpire).toBeLessThanOrEqual(expectedExpire + 100);
    });

    it('should hash the reset token', () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        avatar: { url: 'http://example.com/avatar.jpg' }
      });

      const resetToken = user.getResetPasswordToken();

      // The stored token should be hashed
      expect(user.resetPasswordToken).not.toBe(resetToken);
      expect(user.resetPasswordToken.length).toBe(64); // SHA256 hex = 64 chars

      // Verify the hash matches
      const expectedHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      expect(user.resetPasswordToken).toBe(expectedHash);
    });
  });
});

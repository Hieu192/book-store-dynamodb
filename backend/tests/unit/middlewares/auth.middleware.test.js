const jwt = require('jsonwebtoken');
const User = require('../../../models/user');
const { isAuthenticatedUser, authorizeRoles } = require('../../../middlewares/auth');
const ErrorHandler = require('../../../utils/errorHandler');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../models/user');

describe('Auth Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAuthenticatedUser', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };

      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ id: 'user123' });
      User.findById.mockResolvedValue(mockUser);

      await isAuthenticatedUser(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject request without token', async () => {
      req.cookies = {};

      await isAuthenticatedUser(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ErrorHandler);
      expect(error.message).toBe('Login first to access this resource.');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      req.cookies.token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await isAuthenticatedUser(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
    });

    it('should reject request with expired token', async () => {
      req.cookies.token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await isAuthenticatedUser(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.name).toBe('TokenExpiredError');
    });

    it('should handle user not found', async () => {
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ id: 'nonexistent' });
      User.findById.mockResolvedValue(null);

      await isAuthenticatedUser(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorizeRoles', () => {
    it('should allow access for authorized role', () => {
      req.user = { role: 'admin' };
      const middleware = authorizeRoles('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for unauthorized role', () => {
      req.user = { role: 'user' };
      const middleware = authorizeRoles('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ErrorHandler);
      expect(error.message).toContain('Role (user) is not allowed');
      expect(error.statusCode).toBe(403);
    });

    it('should allow single role', () => {
      req.user = { role: 'admin' };
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow multiple roles', () => {
      req.user = { role: 'moderator' };
      const middleware = authorizeRoles('admin', 'moderator', 'editor');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when role not in list', () => {
      req.user = { role: 'guest' };
      const middleware = authorizeRoles('admin', 'user');

      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ErrorHandler);
      expect(error.statusCode).toBe(403);
    });

    it('should handle case-sensitive roles', () => {
      req.user = { role: 'Admin' };
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ErrorHandler);
    });
  });
});

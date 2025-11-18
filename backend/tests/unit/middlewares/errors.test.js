const errorMiddleware = require('../../../middlewares/errors');
const ErrorHandler = require('../../../utils/errorHandler');

describe('Error Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Development/Test Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'TEST';
    });

    it('should return detailed error in development mode', () => {
      const error = new Error('Test error');
      error.statusCode = 400;
      error.stack = 'Error stack trace';

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: error,
        errMessage: 'Test error',
        message: 'Test error',
        stack: 'Error stack trace'
      });
    });

    it('should default to 500 status code', () => {
      const error = new Error('Test error');
      // No statusCode set

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'PRODUCTION';
    });

    it('should return clean error in production mode', () => {
      const error = new ErrorHandler('Production error', 400);

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Production error'
      });
    });

    it('should handle Mongoose CastError', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      error.path = '_id';
      error.value = 'invalid-id';

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found. Invalid: _id'
      });
    });

    it('should handle Mongoose ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        name: { message: 'Name is required' },
        email: { message: 'Email is required' }
      };

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name is required,Email is required'
      });
    });

    it('should handle Mongoose duplicate key error', () => {
      const error = new Error('Duplicate key error');
      error.code = 11000;
      error.keyValue = { email: 'test@example.com' };

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate email entered'
      });
    });

    it('should handle JWT invalid token error', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'JSON Web Token is invalid. Try Again!!!'
      });
    });

    it('should handle JWT expired token error', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'JSON Web Token is expired. Try Again!!!'
      });
    });

    it('should handle unknown errors with default message', () => {
      const error = new Error('Unknown error');
      error.statusCode = undefined;

      errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unknown error'
      });
    });
  });
});

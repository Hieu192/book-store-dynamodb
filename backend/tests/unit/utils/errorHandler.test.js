const ErrorHandler = require('../../../utils/errorHandler');

describe('ErrorHandler Unit Tests', () => {
  it('should create error with message and statusCode', () => {
    const message = 'Test error message';
    const statusCode = 404;
    
    const error = new ErrorHandler(message, statusCode);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
  });

  it('should create error with array message', () => {
    const messages = ['Error 1', 'Error 2', 'Error 3'];
    const statusCode = 400;
    
    const error = new ErrorHandler(messages, statusCode);
    
    expect(error.message).toBe('Error 1,Error 2,Error 3');
    expect(error.statusCode).toBe(statusCode);
  });

  it('should create error with default statusCode 500', () => {
    const message = 'Server error';
    
    const error = new ErrorHandler(message);
    
    expect(error.message).toBe(message);
    expect(error.statusCode).toBeUndefined(); // Constructor doesn't set default
  });

  it('should inherit from Error class', () => {
    const error = new ErrorHandler('Test', 500);
    
    expect(error instanceof Error).toBe(true);
    expect(error.name).toBe('Error');
    expect(error.stack).toBeDefined();
  });

  it('should handle empty message', () => {
    const error = new ErrorHandler('', 400);
    
    expect(error.message).toBe('');
    expect(error.statusCode).toBe(400);
  });

  it('should handle numeric statusCode', () => {
    const error = new ErrorHandler('Not found', 404);
    
    expect(typeof error.statusCode).toBe('number');
    expect(error.statusCode).toBe(404);
  });
});

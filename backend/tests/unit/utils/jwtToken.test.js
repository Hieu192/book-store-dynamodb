const sendToken = require('../../../utils/jwtToken');

describe('JWT Token Unit Tests', () => {
  let user, res;

  beforeEach(() => {
    // Mock user with getJwtToken method
    user = {
      _id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      getJwtToken: jest.fn().mockReturnValue('mock-jwt-token')
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Set environment variables
    process.env.COOKIE_EXPIRES_TIME = '7';
    process.env.NODE_ENV = 'PRODUCTION';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send token with user data', () => {
    const statusCode = 200;

    sendToken(user, statusCode, res);

    expect(user.getJwtToken).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      token: 'mock-jwt-token',
      user: user
    });
  });

  it('should set cookie with correct options', () => {
    sendToken(user, 200, res);

    const cookieCall = res.cookie.mock.calls[0];
    expect(cookieCall[0]).toBe('token');
    expect(cookieCall[1]).toBe('mock-jwt-token');
    
    const options = cookieCall[2];
    expect(options.expires).toBeInstanceOf(Date);
    expect(options.httpOnly).toBe(true);
  });

  it('should calculate cookie expiration correctly', () => {
    const beforeCall = new Date();
    sendToken(user, 200, res);
    const afterCall = new Date();

    const cookieOptions = res.cookie.mock.calls[0][2];
    const expiresDate = cookieOptions.expires;
    
    // Should expire in 7 days (from COOKIE_EXPIRES_TIME)
    const expectedMinExpires = new Date(beforeCall.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expectedMaxExpires = new Date(afterCall.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    expect(expiresDate.getTime()).toBeGreaterThanOrEqual(expectedMinExpires.getTime());
    expect(expiresDate.getTime()).toBeLessThanOrEqual(expectedMaxExpires.getTime());
  });

  it('should set secure flag in production', () => {
    process.env.NODE_ENV = 'PRODUCTION';
    
    sendToken(user, 200, res);

    const cookieOptions = res.cookie.mock.calls[0][2];
    expect(cookieOptions.secure).toBe(true);
  });

  it('should not set secure flag in development', () => {
    process.env.NODE_ENV = 'DEVELOPMENT';
    
    sendToken(user, 200, res);

    const cookieOptions = res.cookie.mock.calls[0][2];
    // In development, secure is set to false, not undefined
    expect(cookieOptions.secure).toBeFalsy();
  });

  it('should handle different status codes', () => {
    sendToken(user, 201, res);
    expect(res.status).toHaveBeenCalledWith(201);

    sendToken(user, 400, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should use default cookie expiration if not set', () => {
    delete process.env.COOKIE_EXPIRES_TIME;
    
    sendToken(user, 200, res);

    const cookieOptions = res.cookie.mock.calls[0][2];
    expect(cookieOptions.expires).toBeInstanceOf(Date);
  });
});

/**
 * Cache Middleware Unit Tests
 */

const { cache, clearCache, clearAllCache, invalidateCache } = require('../../../middlewares/cache');

// Mock Redis
jest.mock('../../../config/redis', () => ({
  getRedisClient: jest.fn(),
  isConnected: jest.fn()
}));

const { getRedisClient, isConnected } = require('../../../config/redis');

describe('Cache Middleware Unit Tests', () => {
  let req, res, next;
  let mockRedisClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    req = {
      method: 'GET',
      originalUrl: '/api/v1/products',
      url: '/api/v1/products'
    };

    // Mock response
    res = {
      statusCode: 200,
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Mock next
    next = jest.fn();

    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
      flushDb: jest.fn()
    };

    getRedisClient.mockReturnValue(mockRedisClient);
  });

  describe('cache() middleware', () => {
    it('should skip cache for non-GET requests', async () => {
      req.method = 'POST';
      isConnected.mockReturnValue(true);

      const middleware = cache(300);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should skip cache if Redis not connected', async () => {
      isConnected.mockReturnValue(false);

      const middleware = cache(300);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return cached data on cache hit', async () => {
      isConnected.mockReturnValue(true);
      const cachedData = { success: true, products: [] };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const middleware = cache(300);
      await middleware(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalledWith('cache:/api/v1/products');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should proceed to next on cache miss', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.get.mockResolvedValue(null);

      const middleware = cache(300);
      await middleware(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should cache response after successful request', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');

      const middleware = cache(300);
      await middleware(req, res, next);

      // Simulate response
      const responseData = { success: true, products: [] };
      res.json(responseData);

      // Wait for async cache set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'cache:/api/v1/products',
        300,
        JSON.stringify(responseData)
      );
    });

    it('should not cache failed responses', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.get.mockResolvedValue(null);
      res.statusCode = 500;

      const middleware = cache(300);
      await middleware(req, res, next);

      const responseData = { success: false, message: 'Error' };
      res.json(responseData);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const middleware = cache(300);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should clear cache by pattern', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.keys.mockResolvedValue(['cache:key1', 'cache:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      await clearCache('cache:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['cache:key1', 'cache:key2']);
    });

    it('should skip if Redis not connected', async () => {
      isConnected.mockReturnValue(false);

      await clearCache('cache:*');

      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });

    it('should handle no matching keys', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.keys.mockResolvedValue([]);

      await clearCache('cache:*');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('clearAllCache()', () => {
    it('should clear all cache', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.flushDb.mockResolvedValue('OK');

      await clearAllCache();

      expect(mockRedisClient.flushDb).toHaveBeenCalled();
    });

    it('should skip if Redis not connected', async () => {
      isConnected.mockReturnValue(false);

      await clearAllCache();

      expect(mockRedisClient.flushDb).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCache() middleware', () => {
    it('should clear cache after successful operation', async () => {
      isConnected.mockReturnValue(true);
      mockRedisClient.keys.mockResolvedValue(['cache:key1']);
      mockRedisClient.del.mockResolvedValue(1);

      const middleware = invalidateCache(['cache:*products*']);
      await middleware(req, res, next);

      // Simulate successful response
      res.statusCode = 200;
      const responseData = { success: true };
      await res.json(responseData);

      // Wait for async cache clear
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:*products*');
    });

    it('should not clear cache on failed operation', async () => {
      const middleware = invalidateCache(['cache:*products*']);
      await middleware(req, res, next);

      // Simulate failed response
      res.statusCode = 500;
      const responseData = { success: false };
      res.json(responseData);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });
});

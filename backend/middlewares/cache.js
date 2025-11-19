/**
 * Redis Cache Middleware
 * Caches API responses for improved performance
 */

const { getRedisClient, isConnected } = require('../config/redis');

/**
 * Cache middleware for GET requests
 * @param {number} duration - Cache duration in seconds (default: 300 = 5 minutes)
 */
const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if Redis is not connected
    if (!isConnected()) {
      return next();
    }

    try {
      const redisClient = getRedisClient();
      
      // Generate cache key from URL and query params
      const cacheKey = `cache:${req.originalUrl || req.url}`;

      // Try to get cached data
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          redisClient.setEx(cacheKey, duration, JSON.stringify(data))
            .catch(err => console.error('Redis cache set error:', err.message));
        }
        return originalJson(data);
      };

      next();

    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Redis key pattern (e.g., 'cache:*products*')
 */
const clearCache = async (pattern) => {
  if (!isConnected()) {
    return;
  }

  try {
    const redisClient = getRedisClient();
    const keys = await redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`✅ Cleared ${keys.length} cache entries matching: ${pattern}`);
    }
  } catch (error) {
    console.error('Clear cache error:', error.message);
  }
};

/**
 * Clear all cache
 */
const clearAllCache = async () => {
  if (!isConnected()) {
    return;
  }

  try {
    const redisClient = getRedisClient();
    await redisClient.flushDb();
    console.log('✅ All cache cleared');
  } catch (error) {
    console.error('Clear all cache error:', error.message);
  }
};

/**
 * Invalidate cache middleware
 * Clears cache after POST, PUT, DELETE operations
 */
const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to clear cache after successful operation
    res.json = async function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
        // Clear cache for specified patterns
        for (const pattern of patterns) {
          await clearCache(pattern);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cache,
  clearCache,
  clearAllCache,
  invalidateCache
};

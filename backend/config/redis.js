/**
 * Redis Configuration
 * Caching layer for improved performance
 */

const redis = require('redis');

let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client
 */
const connectRedis = async () => {
  try {
    // Skip Redis in test environment if not configured
    if (process.env.NODE_ENV === 'test' && !process.env.REDIS_URL) {
      console.log('⚠️  Redis skipped in test environment');
      return null;
    }

    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: Too many reconnection attempts');
            return new Error('Too many retries');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    };

    redisClient = redis.createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('🔄 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected successfully');
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      console.log('⚠️  Redis connection closed');
      isRedisConnected = false;
    });

    await redisClient.connect();
    return redisClient;

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️  Continuing without Redis cache');
    isRedisConnected = false;
    return null;
  }
};

/**
 * Get Redis client
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected
 */
const isConnected = () => {
  return isRedisConnected && redisClient && redisClient.isOpen;
};

/**
 * Disconnect Redis
 */
const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis disconnected');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isConnected,
  disconnectRedis
};

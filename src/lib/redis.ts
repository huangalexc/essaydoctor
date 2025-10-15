import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Create Redis client
export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Cache utilities
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL in seconds
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  },

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis delPattern error:', error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -1;
    }
  },
};

// Rate limiting utilities
export const rateLimit = {
  /**
   * Check and increment rate limit
   * @param key - Unique identifier (e.g., userId or IP)
   * @param limit - Maximum number of requests
   * @param window - Time window in seconds
   * @returns Object with allowed status and remaining count
   */
  async check(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const current = await redis.incr(key);

      if (current === 1) {
        // First request, set expiry
        await redis.expire(key, window);
      }

      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + ttl * 1000;
      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;

      return { allowed, remaining, resetAt };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: limit, resetAt: Date.now() + window * 1000 };
    }
  },

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  },
};

// Connect to Redis (call this during app initialization)
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Don't throw - allow app to run without Redis
  }
}

// Gracefully disconnect Redis
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('Redis disconnected');
  } catch (error) {
    console.error('Redis disconnect error:', error);
  }
}

export default redis;

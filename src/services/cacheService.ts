import { connectToRedis, isRedisConfigured } from '@/utils/redis';

export class CacheService {
  static async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<void> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache set');
      return;
    }

    try {
      const client = await connectToRedis();
      const serializedValue = JSON.stringify(value);

      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache get');
      return null;
    }

    try {
      const client = await connectToRedis();
      const value = await client.get(key);

      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async delete(key: string): Promise<void> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache delete');
      return;
    }

    try {
      const client = await connectToRedis();
      await client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!isRedisConfigured()) {
      return false;
    }

    try {
      const client = await connectToRedis();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  static async flush(): Promise<void> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache flush');
      return;
    }

    try {
      const client = await connectToRedis();
      await client.flushAll();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache pattern delete');
      return 0;
    }

    try {
      const client = await connectToRedis();
      let deletedCount = 0;
      let cursor = '0';

      do {
        // Use SCAN to find keys matching the pattern
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          // Delete all found keys in a single operation
          const deleted = await client.del(keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return 0;
    }
  }

  static async getKeysByPattern(pattern: string): Promise<string[]> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache pattern get');
      return [];
    }

    try {
      const client = await connectToRedis();
      const keys: string[] = [];
      let cursor = '0';

      do {
        // Use SCAN to find keys matching the pattern
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      console.error('Cache pattern get error:', error);
      return [];
    }
  }

  static async getAllCacheKeys(): Promise<{ [pattern: string]: string[] }> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping cache keys get');
      return {};
    }

    try {
      const patterns = [
        'cats:*',
        'notes:*',
        'user:*',
        'user_email:*',
        'user_username:*',
      ];

      const result: { [pattern: string]: string[] } = {};

      for (const pattern of patterns) {
        result[pattern] = await this.getKeysByPattern(pattern);
      }

      return result;
    } catch (error) {
      console.error('Cache keys get error:', error);
      return {};
    }
  }
}

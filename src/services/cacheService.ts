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
}

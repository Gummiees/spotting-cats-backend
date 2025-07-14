import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: RedisClientType;

export async function connectToRedis(): Promise<RedisClientType> {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });

  await redisClient.connect();
  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectToRedis first.');
  }
  return redisClient;
}

export function isRedisConfigured(): boolean {
  return !!redisUrl;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
  }
}

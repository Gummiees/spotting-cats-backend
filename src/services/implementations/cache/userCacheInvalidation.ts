import { connectToRedis, isRedisConfigured } from '@/utils/redis';
import { decryptEmail } from '@/utils/security';

export class UserCacheInvalidation {
  protected readonly USER_CACHE_PREFIX = 'user:';
  protected readonly USER_EMAIL_CACHE_PREFIX = 'user_email:';
  protected readonly USER_USERNAME_CACHE_PREFIX = 'user_username:';

  constructor(private getDbUserById: (userId: string) => Promise<any>) {}

  async invalidateUserCache(userId: string): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const redisClient = await connectToRedis();
      const userKey = `${this.USER_CACHE_PREFIX}${userId}`;

      // Delete user data cache
      await redisClient.del(userKey);

      // Get database user to find encrypted email and username for cache invalidation
      const dbUser = await this.getDbUserById(userId);
      if (dbUser && dbUser.email) {
        try {
          // Decrypt email to use as cache key
          const decryptedEmail = decryptEmail(dbUser.email);
          const normalizedEmail = decryptedEmail.toLowerCase().trim();
          const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${normalizedEmail}`;
          await redisClient.del(emailKey);
        } catch (decryptError) {
          console.error(
            'Error decrypting email for cache invalidation:',
            decryptError
          );
        }
      }
      if (dbUser && dbUser.username) {
        const normalizedUsername = dbUser.username.toLowerCase().trim();
        const usernameKey = `${this.USER_USERNAME_CACHE_PREFIX}${normalizedUsername}`;
        await redisClient.del(usernameKey);
      }
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  async invalidateAllUserCaches(): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const redisClient = await connectToRedis();

      // Get all keys matching the user cache patterns
      const userKeys = await redisClient.keys(`${this.USER_CACHE_PREFIX}*`);
      const emailKeys = await redisClient.keys(
        `${this.USER_EMAIL_CACHE_PREFIX}*`
      );
      const usernameKeys = await redisClient.keys(
        `${this.USER_USERNAME_CACHE_PREFIX}*`
      );

      // Delete all user-related cache entries
      if (userKeys.length > 0) {
        await redisClient.del(userKeys as any);
      }
      if (emailKeys.length > 0) {
        await redisClient.del(emailKeys as any);
      }
      if (usernameKeys.length > 0) {
        await redisClient.del(usernameKeys as any);
      }
    } catch (error) {
      console.error('Error invalidating all user caches:', error);
    }
  }

  async invalidateMultipleUserCaches(userIds: string[]): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      for (const userId of userIds) {
        await this.invalidateUserCache(userId);
      }
    } catch (error) {
      console.error('Error invalidating multiple user caches:', error);
    }
  }
}

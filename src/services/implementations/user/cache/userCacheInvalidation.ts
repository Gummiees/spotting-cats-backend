import { connectToRedis, isRedisConfigured } from '@/utils/redis';
import { decryptEmail } from '@/utils/security';
import { CacheService } from '@/services/cacheService';

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
      const userKey = `${this.USER_CACHE_PREFIX}${userId}`;

      // Delete user data cache
      await CacheService.delete(userKey);

      // Get database user to find encrypted email and username for cache invalidation
      const dbUser = await this.getDbUserById(userId);
      if (dbUser && dbUser.email) {
        try {
          // Decrypt email to use as cache key
          const decryptedEmail = decryptEmail(dbUser.email);
          const normalizedEmail = decryptedEmail.toLowerCase().trim();
          const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${normalizedEmail}`;
          await CacheService.delete(emailKey);
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
        await CacheService.delete(usernameKey);
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
      const patterns = [
        `${this.USER_CACHE_PREFIX}*`,
        `${this.USER_EMAIL_CACHE_PREFIX}*`,
        `${this.USER_USERNAME_CACHE_PREFIX}*`,
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deletedCount = await CacheService.deletePattern(pattern);
        totalDeleted += deletedCount;
      }

      if (totalDeleted > 0) {
        console.log(`Deleted ${totalDeleted} user cache keys`);
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

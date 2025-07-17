import { User } from '@/models/user';
import { connectToRedis, isRedisConfigured } from '@/utils/redis';

export class UserCacheCore {
  protected readonly CACHE_TTL = 3600; // 1 hour in seconds
  protected readonly USER_CACHE_PREFIX = 'user:';
  protected readonly USER_EMAIL_CACHE_PREFIX = 'user_email:';
  protected readonly USER_USERNAME_CACHE_PREFIX = 'user_username:';

  protected async cacheUserData(
    user: User,
    normalizedEmail?: string,
    normalizedUsername?: string
  ): Promise<void> {
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, skipping user cache');
      return;
    }

    try {
      const redisClient = await connectToRedis();
      const userKey = `${this.USER_CACHE_PREFIX}${user.id}`;

      // Cache user data
      await redisClient.setEx(userKey, this.CACHE_TTL, JSON.stringify(user));

      // Cache normalized email to user ID mapping if provided
      if (normalizedEmail) {
        const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${normalizedEmail}`;
        await redisClient.setEx(emailKey, this.CACHE_TTL, user.id!);
      }

      // Cache normalized username to user ID mapping if provided
      if (normalizedUsername) {
        const usernameKey = `${this.USER_USERNAME_CACHE_PREFIX}${normalizedUsername}`;
        await redisClient.setEx(usernameKey, this.CACHE_TTL, user.id!);
      }
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }

  protected async getUserFromCache(userId: string): Promise<User | null> {
    if (!isRedisConfigured()) {
      return null;
    }

    try {
      const redisClient = await connectToRedis();
      const userKey = `${this.USER_CACHE_PREFIX}${userId}`;
      const cachedData = await redisClient.get(userKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      return null;
    } catch (error) {
      console.error('Error getting user from cache:', error);
      return null;
    }
  }

  protected async getUserIdFromEmailCache(
    email: string
  ): Promise<string | null> {
    if (!isRedisConfigured()) {
      return null;
    }

    try {
      const redisClient = await connectToRedis();
      // Use normalized email as cache key instead of encrypted email
      const normalizedEmail = email.toLowerCase().trim();
      const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${normalizedEmail}`;
      return await redisClient.get(emailKey);
    } catch (error) {
      console.error('Error getting user ID from email cache:', error);
      return null;
    }
  }

  protected async getUserIdFromUsernameCache(
    username: string
  ): Promise<string | null> {
    if (!isRedisConfigured()) {
      return null;
    }

    try {
      const redisClient = await connectToRedis();
      // Use normalized username as cache key
      const normalizedUsername = username.toLowerCase().trim();
      const usernameKey = `${this.USER_USERNAME_CACHE_PREFIX}${normalizedUsername}`;
      return await redisClient.get(usernameKey);
    } catch (error) {
      console.error('Error getting user ID from username cache:', error);
      return null;
    }
  }

  protected async getAllUsersFromCache(): Promise<User[] | null> {
    if (!isRedisConfigured()) {
      return null;
    }

    try {
      const redisClient = await connectToRedis();
      const userKeys = await redisClient.keys(`${this.USER_CACHE_PREFIX}*`);

      if (userKeys.length === 0) {
        return null;
      }

      const users: User[] = [];
      for (const key of userKeys) {
        const userData = await redisClient.get(key);
        if (userData) {
          users.push(JSON.parse(userData));
        }
      }

      return users.length > 0 ? users : null;
    } catch (error) {
      console.error('Error getting all users from cache:', error);
      return null;
    }
  }

  protected async cacheAllUsers(users: User[]): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      for (const user of users) {
        await this.cacheUserData(user);
      }
    } catch (error) {
      console.error('Error caching all users:', error);
    }
  }
}

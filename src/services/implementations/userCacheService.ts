import { UserServiceInterface } from '@/services/interfaces/userServiceInterface';
import { User, UserSession } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';
import { getRedisClient } from '@/utils/redis';

export class UserCacheService implements UserServiceInterface {
  private userService: UserServiceInterface;
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly USER_EMAIL_CACHE_PREFIX = 'user_email:';

  constructor(userService: UserServiceInterface) {
    this.userService = userService;
  }

  // Authentication methods - delegate to database service
  async sendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.sendVerificationCode(email);
  }

  async verifyCodeAndAuthenticate(
    email: string,
    code: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    isNewUser?: boolean;
  }> {
    const result = await this.userService.verifyCodeAndAuthenticate(
      email,
      code
    );

    // Cache user data if authentication was successful
    if (result.success && result.user) {
      // Invalidate any existing cache for this user first (in case of reactivation)
      await this.invalidateUserCache(result.user.id!);
      await this.cacheUserData(result.user);
    }

    return result;
  }

  verifyToken(token: string): UserSession | null {
    return this.userService.verifyToken(token);
  }

  // User management methods - with caching
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Try to get from cache first
      const cachedUser = await this.getUserFromCache(userId);
      if (cachedUser) {
        return cachedUser;
      }

      // If not in cache, get from database
      const user = await this.userService.getUserById(userId);
      if (user) {
        await this.cacheUserData(user);
      }

      return user;
    } catch (error) {
      console.error('Error getting user by ID from cache:', error);
      // Fallback to database service
      return this.userService.getUserById(userId);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Try to get user ID from email cache first
      const userId = await this.getUserIdFromEmailCache(email);
      if (userId) {
        return await this.getUserById(userId);
      }

      // If not in cache, get from database
      const user = await this.userService.getUserByEmail(email);
      if (user) {
        await this.cacheUserData(user);
      }

      return user;
    } catch (error) {
      console.error('Error getting user by email from cache:', error);
      // Fallback to database service
      return this.userService.getUserByEmail(email);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      // For username lookups, we'll go directly to the database service
      // since usernames are not cached in the same way as emails
      return await this.userService.getUserByUsername(username);
    } catch (error) {
      console.error('Error getting user by username from cache:', error);
      // Fallback to database service
      return this.userService.getUserByUsername(username);
    }
  }

  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.updateUser(userId, updates);

    // Invalidate cache for this user after successful update
    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.deactivateUser(userId);

    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.reactivateUser(userId);

    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.deleteUser(userId);

    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async cleanupExpiredCodes(): Promise<void> {
    return this.userService.cleanupExpiredCodes();
  }

  async cleanupOldDeactivatedUsers(retentionDays: number): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    return this.userService.cleanupOldDeactivatedUsers(retentionDays);
  }

  async getDeactivatedUserStats(retentionDays: number): Promise<{
    totalDeactivated: number;
    oldDeactivated: number;
  }> {
    return this.userService.getDeactivatedUserStats(retentionDays);
  }

  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    const result = await this.userService.ensureAllUsersHaveAvatars();

    // If avatars were updated, invalidate all user caches
    if (result.success && result.updatedCount && result.updatedCount > 0) {
      await this.invalidateAllUserCaches();
    }

    return result;
  }

  async initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string }> {
    return this.userService.initiateEmailChange(userId, newEmail);
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.verifyEmailChange(userId, code);

    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  // Cache management methods
  private async cacheUserData(user: User): Promise<void> {
    try {
      const redisClient = getRedisClient();
      const userKey = `${this.USER_CACHE_PREFIX}${user.id}`;
      const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${user.email}`;

      // Cache user data
      await redisClient.setEx(userKey, this.CACHE_TTL, JSON.stringify(user));

      // Cache email to user ID mapping
      await redisClient.setEx(emailKey, this.CACHE_TTL, user.id!);
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }

  private async getUserFromCache(userId: string): Promise<User | null> {
    try {
      const redisClient = getRedisClient();
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

  private async getUserIdFromEmailCache(email: string): Promise<string | null> {
    try {
      const redisClient = getRedisClient();
      const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${email}`;
      return await redisClient.get(emailKey);
    } catch (error) {
      console.error('Error getting user ID from email cache:', error);
      return null;
    }
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    try {
      const redisClient = getRedisClient();
      // Get user data to find email for invalidation
      const user = await this.userService.getUserById(userId);
      if (user) {
        const userKey = `${this.USER_CACHE_PREFIX}${userId}`;
        const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${user.email}`;

        // Delete both user data and email mapping
        await redisClient.del(userKey);
        await redisClient.del(emailKey);
      }
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  private async invalidateAllUserCaches(): Promise<void> {
    try {
      const redisClient = getRedisClient();

      // Get all keys matching the user cache patterns
      const userKeys = await redisClient.keys(`${this.USER_CACHE_PREFIX}*`);
      const emailKeys = await redisClient.keys(
        `${this.USER_EMAIL_CACHE_PREFIX}*`
      );

      // Delete all user-related cache entries
      if (userKeys.length > 0) {
        await redisClient.del(userKeys as any);
      }
      if (emailKeys.length > 0) {
        await redisClient.del(emailKeys as any);
      }
    } catch (error) {
      console.error('Error invalidating all user caches:', error);
    }
  }
}

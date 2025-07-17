import { User, PublicUser, UserSession } from '@/models/user';
import { UserServiceInterface } from '../interfaces/userServiceInterface';
import { UserUpdateRequest } from '@/models/requests';
import { getRedisClient } from '@/utils/redis';
import { encryptEmail } from '@/utils/security';

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
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.userService.sendVerificationCode(email, clientIp);
  }

  async verifyCodeAndAuthenticate(
    email: string,
    code: string,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    isNewUser?: boolean;
  }> {
    const result = await this.userService.verifyCodeAndAuthenticate(
      email,
      code,
      clientIp
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

  async refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }> {
    return this.userService.refreshTokenIfNeeded(token);
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

  async getUserByIdWithResolvedUsernames(userId: string): Promise<User | null> {
    try {
      // For users with resolved usernames, we'll go directly to the database service
      // since the cache doesn't store the resolved usernames
      return await this.userService.getUserByIdWithResolvedUsernames(userId);
    } catch (error) {
      console.error(
        'Error getting user by ID with resolved usernames from cache:',
        error
      );
      // Fallback to database service
      return this.userService.getUserByIdWithResolvedUsernames(userId);
    }
  }

  async getUserByIdWithPrivileges(
    userId: string,
    includePrivilegedData: boolean
  ): Promise<User | null> {
    try {
      // For privileged data, we'll go directly to the database service
      // since the cache doesn't store privileged information like IP addresses
      return await this.userService.getUserByIdWithPrivileges(
        userId,
        includePrivilegedData
      );
    } catch (error) {
      console.error(
        'Error getting user by ID with privileges from cache:',
        error
      );
      // Fallback to database service
      return this.userService.getUserByIdWithPrivileges(
        userId,
        includePrivilegedData
      );
    }
  }

  async getUserByIdPublic(userId: string): Promise<PublicUser | null> {
    try {
      // For public user data, we'll go directly to the database service
      // since the cache doesn't store the public user format
      return await this.userService.getUserByIdPublic(userId);
    } catch (error) {
      console.error('Error getting public user by ID from cache:', error);
      // Fallback to database service
      return this.userService.getUserByIdPublic(userId);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Check cache first using encrypted email
      const cachedUserId = await this.getUserIdFromEmailCache(email);
      if (cachedUserId) {
        const cachedUser = await this.getUserFromCache(cachedUserId);
        if (cachedUser) {
          return cachedUser;
        }
      }

      // If not in cache, get from database service
      const user = await this.userService.getUserByEmail(email);
      if (user) {
        // Cache the user data with encrypted email
        const encryptedEmail = encryptEmail(email);
        await this.cacheUserData(user, encryptedEmail);
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

  async getUserByUsernameWithResolvedUsernames(
    username: string
  ): Promise<User | null> {
    try {
      // For username lookups with resolved usernames, we'll go directly to the database service
      // since usernames are not cached in the same way as emails
      return await this.userService.getUserByUsernameWithResolvedUsernames(
        username
      );
    } catch (error) {
      console.error(
        'Error getting user by username with resolved usernames from cache:',
        error
      );
      // Fallback to database service
      return this.userService.getUserByUsernameWithResolvedUsernames(username);
    }
  }

  async getUserByUsernameWithPrivileges(
    username: string,
    includePrivilegedData: boolean
  ): Promise<User | null> {
    try {
      // For privileged data, we'll go directly to the database service
      // since the cache doesn't store privileged information like IP addresses
      return await this.userService.getUserByUsernameWithPrivileges(
        username,
        includePrivilegedData
      );
    } catch (error) {
      console.error(
        'Error getting user by username with privileges from cache:',
        error
      );
      // Fallback to database service
      return this.userService.getUserByUsernameWithPrivileges(
        username,
        includePrivilegedData
      );
    }
  }

  async getUserByUsernamePublic(username: string): Promise<PublicUser | null> {
    try {
      // For public user data, we'll go directly to the database service
      // since the cache doesn't store the public user format
      return await this.userService.getUserByUsernamePublic(username);
    } catch (error) {
      console.error('Error getting public user by username from cache:', error);
      // Fallback to database service
      return this.userService.getUserByUsernamePublic(username);
    }
  }

  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string; token?: string }> {
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

  // Cache helper method to get raw database user with encrypted email
  async getDbUserById(userId: string): Promise<any> {
    return this.userService.getDbUserById(userId);
  }

  async initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.userService.initiateEmailChange(userId, newEmail);
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    const result = await this.userService.verifyEmailChange(userId, code);

    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    // For availability checks, we go directly to the database service
    // since these are real-time checks and don't benefit from caching
    return this.userService.checkUsernameAvailability(username, excludeUserId);
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    // For availability checks, we go directly to the database service
    // since these are real-time checks and don't benefit from caching
    return this.userService.checkEmailAvailability(email, excludeUserId);
  }

  async updateUserRole(
    userId: string,
    newRole: 'user' | 'moderator' | 'admin' | 'superadmin',
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    const result = await this.userService.updateUserRole(
      userId,
      newRole,
      updatedByUserId
    );

    // Invalidate cache for this user after successful role update
    if (result.success) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    try {
      // For getting all users, we'll go directly to the database service
      // since caching all users would be inefficient
      return await this.userService.getAllUsers();
    } catch (error) {
      console.error('Error getting all users from cache:', error);
      // Fallback to database service
      return this.userService.getAllUsers();
    }
  }

  async getAllUsersWithPrivileges(includePrivilegedData: boolean): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    try {
      // For privileged data, we'll go directly to the database service
      // since the cache doesn't store privileged information like IP addresses
      return await this.userService.getAllUsersWithPrivileges(
        includePrivilegedData
      );
    } catch (error) {
      console.error(
        'Error getting all users with privileges from cache:',
        error
      );
      // Fallback to database service
      return this.userService.getAllUsersWithPrivileges(includePrivilegedData);
    }
  }

  async getAllUsersPublic(): Promise<{
    success: boolean;
    users: PublicUser[];
    message: string;
  }> {
    try {
      // For public user data, we'll go directly to the database service
      // since the cache doesn't store the public user format
      return await this.userService.getAllUsersPublic();
    } catch (error) {
      console.error('Error getting all public users from cache:', error);
      // Fallback to database service
      return this.userService.getAllUsersPublic();
    }
  }

  // Cache management methods
  private async cacheUserData(
    user: User,
    encryptedEmail?: string
  ): Promise<void> {
    try {
      const redisClient = getRedisClient();
      const userKey = `${this.USER_CACHE_PREFIX}${user.id}`;

      // Cache user data
      await redisClient.setEx(userKey, this.CACHE_TTL, JSON.stringify(user));

      // Cache encrypted email to user ID mapping if provided
      if (encryptedEmail) {
        const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${encryptedEmail}`;
        await redisClient.setEx(emailKey, this.CACHE_TTL, user.id!);
      }
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
      const encryptedEmail = encryptEmail(email);
      const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${encryptedEmail}`;
      return await redisClient.get(emailKey);
    } catch (error) {
      console.error('Error getting user ID from email cache:', error);
      return null;
    }
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    try {
      const redisClient = getRedisClient();
      const userKey = `${this.USER_CACHE_PREFIX}${userId}`;

      // Delete user data cache
      await redisClient.del(userKey);

      // Get database user to find encrypted email for cache invalidation
      const dbUser = await this.userService.getDbUserById(userId);
      if (dbUser && dbUser.email) {
        // Delete email cache using the encrypted email
        const emailKey = `${this.USER_EMAIL_CACHE_PREFIX}${dbUser.email}`;
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

  // IP banning methods - delegate to database service
  async banUsersByIp(
    username: string,
    reason: string,
    bannedByUserId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      targetUser: User;
      affectedUsers: User[];
      bannedIps: string[];
      totalBanned: number;
    };
  }> {
    const result = await this.userService.banUsersByIp(
      username,
      reason,
      bannedByUserId
    );

    // Invalidate cache for all affected users
    if (result.success && result.data) {
      await this.invalidateUserCache(result.data.targetUser.id!);
      for (const user of result.data.affectedUsers) {
        await this.invalidateUserCache(user.id!);
      }
    }

    return result;
  }

  async unbanUsersByIp(
    username: string,
    unbannedByUserId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      targetUser: User;
      affectedUsers: User[];
      unbannedIps: string[];
      totalUnbanned: number;
    };
  }> {
    const result = await this.userService.unbanUsersByIp(
      username,
      unbannedByUserId
    );

    // Invalidate cache for all affected users
    if (result.success && result.data) {
      await this.invalidateUserCache(result.data.targetUser.id!);
      for (const user of result.data.affectedUsers) {
        await this.invalidateUserCache(user.id!);
      }
    }

    return result;
  }

  async checkIpBanned(ipAddress: string): Promise<{
    banned: boolean;
    reason?: string;
    bannedBy?: string;
    bannedAt?: Date;
  }> {
    return this.userService.checkIpBanned(ipAddress);
  }
}

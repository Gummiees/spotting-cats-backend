import { User, UserSession, BasicUser } from '@/models/user';
import { UserServiceInterface } from '../interfaces/userServiceInterface';
import { UserUpdateRequest } from '@/models/requests';
import { UserCacheQueries } from './cache/userCacheQueries';
import { UserCacheOperations } from './cache/userCacheOperations';
import { UserCacheDelegates } from './cache/userCacheDelegates';

export class UserCacheService implements UserServiceInterface {
  private queries: UserCacheQueries;
  private operations: UserCacheOperations;
  private delegates: UserCacheDelegates;

  constructor(userService: UserServiceInterface) {
    this.queries = new UserCacheQueries(userService);
    this.operations = new UserCacheOperations(userService);
    this.delegates = new UserCacheDelegates(userService);
  }

  // Authentication methods
  async sendVerificationCode(
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.delegates.sendVerificationCode(email, clientIp);
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
    // This method needs to be implemented in the delegates class
    // For now, we'll delegate to the userService directly
    const userService = (this.queries as any).userService;
    const result = await userService.verifyCodeAndAuthenticate(
      email,
      code,
      clientIp
    );

    // Cache user data if authentication was successful
    if (result.success && result.user) {
      // Invalidate any existing cache for this user first (in case of reactivation)
      await this.operations.updateUser(result.user.id!, {});
      await this.queries.getUserById(result.user.id!);
    }

    return result;
  }

  verifyToken(token: string): UserSession | null {
    return this.delegates.verifyToken(token);
  }

  async refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }> {
    return this.delegates.refreshTokenIfNeeded(token);
  }

  // User management methods
  async getUserById(userId: string): Promise<User | null> {
    return this.queries.getUserById(userId);
  }

  async getUserByIdWithResolvedUsernames(userId: string): Promise<User | null> {
    return this.queries.getUserByIdWithResolvedUsernames(userId);
  }

  async getBasicUserById(userId: string): Promise<BasicUser | null> {
    return this.queries.getBasicUserById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.queries.getUserByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.queries.getUserByUsername(username);
  }

  async getUserByUsernameWithResolvedUsernames(
    username: string
  ): Promise<User | null> {
    return this.queries.getUserByUsernameWithResolvedUsernames(username);
  }

  async getBasicUserByUsername(username: string): Promise<BasicUser | null> {
    return this.queries.getBasicUserByUsername(username);
  }

  async getUserByUsernameForAdmin(username: string): Promise<any> {
    return this.queries.getUserByUsernameForAdmin(username);
  }

  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.operations.updateUser(userId, updates);
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.operations.deactivateUser(userId);
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.operations.reactivateUser(userId);
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.operations.deleteUser(userId);
  }

  async cleanupExpiredCodes(): Promise<void> {
    return this.delegates.cleanupExpiredCodes();
  }

  async cleanupOldDeactivatedUsers(retentionDays: number): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    return this.delegates.cleanupOldDeactivatedUsers(retentionDays);
  }

  async getDeactivatedUserStats(retentionDays: number): Promise<{
    totalDeactivated: number;
    oldDeactivated: number;
  }> {
    return this.delegates.getDeactivatedUserStats(retentionDays);
  }

  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    return this.operations.ensureAllUsersHaveAvatars();
  }

  // Cache helper method to get raw database user with encrypted email
  async getDbUserById(userId: string): Promise<any> {
    return this.delegates.getDbUserById(userId);
  }

  async initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.delegates.initiateEmailChange(userId, newEmail);
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.operations.verifyEmailChange(userId, code);
  }

  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    return this.delegates.checkUsernameAvailability(username, excludeUserId);
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string; statusCode?: string }> {
    return this.delegates.checkEmailAvailability(email, excludeUserId);
  }

  async updateUserRole(
    userId: string,
    newRole: 'user' | 'moderator' | 'admin' | 'superadmin',
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.operations.updateUserRole(userId, newRole, updatedByUserId);
  }

  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    return this.queries.getAllUsers();
  }

  // IP banning methods
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
      iterations?: number;
    };
  }> {
    return this.operations.banUsersByIp(username, reason, bannedByUserId);
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
      iterations?: number;
    };
  }> {
    return this.operations.unbanUsersByIp(username, unbannedByUserId);
  }

  async checkIpBanned(ipAddress: string): Promise<{
    banned: boolean;
    reason?: string;
    bannedBy?: string;
    bannedAt?: Date;
  }> {
    return this.delegates.checkIpBanned(ipAddress);
  }
}

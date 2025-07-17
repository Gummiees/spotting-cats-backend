import { User, UserSession, BasicUser } from '@/models/user';
import { UserServiceInterface } from '@/services/interfaces/userServiceInterface';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { UserAuthService } from './userAuthService';
import { UserEmailService } from './userEmailService';
import { UserManagementService } from './userManagementService';
import { UserIpBanService } from './userIpBanService';
import { UserAdminService } from './userAdminService';

export class UserDatabaseService implements UserServiceInterface {
  private dbOps: UserDatabaseOperations;
  private utilityService: UserUtilityService;
  private authService: UserAuthService;
  private emailService: UserEmailService;
  private managementService: UserManagementService;
  private ipBanService: UserIpBanService;
  private adminService: UserAdminService;

  constructor() {
    this.dbOps = new UserDatabaseOperations();
    this.utilityService = new UserUtilityService();
    this.ipBanService = new UserIpBanService(this.dbOps, this.utilityService);
    this.authService = new UserAuthService(
      this.dbOps,
      this.utilityService,
      this.ipBanService
    );
    this.emailService = new UserEmailService(this.dbOps, this.utilityService);
    this.managementService = new UserManagementService(
      this.dbOps,
      this.utilityService
    );
    this.adminService = new UserAdminService();
  }

  // Authentication methods
  async sendVerificationCode(
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.authService.sendVerificationCode(email, clientIp);
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
    return this.authService.verifyCodeAndAuthenticate(email, code, clientIp);
  }

  public verifyToken(token: string): UserSession | null {
    return this.utilityService.verifyToken(token);
  }

  public async refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }> {
    return this.authService.refreshTokenIfNeeded(token);
  }

  // User retrieval methods
  async getUserById(userId: string): Promise<User | null> {
    return this.authService.getUserById(userId);
  }

  async getUserByIdWithResolvedUsernames(userId: string): Promise<User | null> {
    return this.managementService.getUserByIdWithResolvedUsernames(userId);
  }

  async getBasicUserById(userId: string): Promise<BasicUser | null> {
    try {
      const user = await this.dbOps.findUserById(userId);
      if (!user) return null;

      return this.utilityService.mapUserToBasicResponse(user);
    } catch (error) {
      console.error('Error getting basic user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.authService.getUserByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.dbOps.findUserByUsername(username);
      if (!user) return null;
      return this.utilityService.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async getUserByUsernameWithResolvedUsernames(
    username: string
  ): Promise<User | null> {
    return this.managementService.getUserByUsernameWithResolvedUsernames(
      username
    );
  }

  async getBasicUserByUsername(username: string): Promise<BasicUser | null> {
    try {
      const user = await this.dbOps.findUserByUsername(username);
      if (!user) return null;

      return this.utilityService.mapUserToBasicResponse(user);
    } catch (error) {
      console.error('Error getting basic user by username:', error);
      return null;
    }
  }

  async getUserByUsernameForAdmin(username: string): Promise<any> {
    return this.adminService.getUserByUsernameForAdmin(username);
  }

  // User management methods
  async updateUser(
    userId: string,
    updates: any
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.managementService.updateUser(userId, updates);
  }

  async updateUserRole(
    userId: string,
    newRole: 'user' | 'moderator' | 'admin' | 'superadmin',
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.managementService.updateUserRole(
      userId,
      newRole,
      updatedByUserId
    );
  }

  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    return this.managementService.getAllUsers();
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.managementService.deactivateUser(userId);
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.managementService.reactivateUser(userId);
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.managementService.deleteUser(userId);
  }

  // Email management methods
  async initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.emailService.initiateEmailChange(userId, newEmail);
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    return this.emailService.verifyEmailChange(userId, code);
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string; statusCode?: string }> {
    return this.emailService.checkEmailAvailability(email, excludeUserId);
  }

  // Username management methods
  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    return this.managementService.checkUsernameAvailability(
      username,
      excludeUserId
    );
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
    return this.ipBanService.banUsersByIp(username, reason, bannedByUserId);
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
    return this.ipBanService.unbanUsersByIp(username, unbannedByUserId);
  }

  async checkIpBanned(ipAddress: string): Promise<{
    banned: boolean;
    reason?: string;
    bannedBy?: string;
    bannedAt?: Date;
  }> {
    return this.ipBanService.checkIpBanned(ipAddress);
  }

  // Cleanup methods
  async cleanupExpiredCodes(): Promise<void> {
    await this.dbOps.cleanupExpiredCodes();
  }

  async cleanupOldDeactivatedUsers(retentionDays: number): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    return this.managementService.cleanupOldDeactivatedUsers(retentionDays);
  }

  async getDeactivatedUserStats(retentionDays: number): Promise<{
    totalDeactivated: number;
    oldDeactivated: number;
  }> {
    return this.managementService.getDeactivatedUserStats(retentionDays);
  }

  // Utility methods
  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    return this.managementService.ensureAllUsersHaveAvatars();
  }

  // Cache helper method to get raw database user with encrypted email
  async getDbUserById(userId: string): Promise<any> {
    return this.dbOps.findUserById(userId);
  }

  // Private helper methods
  private async resolveUserIdToUsername(
    userId: string
  ): Promise<string | null> {
    try {
      const user = await this.dbOps.findUserById(userId);
      return user?.username || null;
    } catch (error) {
      console.error('Error resolving user ID to username:', error);
      return null;
    }
  }
}

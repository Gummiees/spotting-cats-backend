import { UserSession } from '@/models/user';
import { UserServiceInterface } from '../../interfaces/userServiceInterface';

export class UserCacheDelegates {
  constructor(private userService: UserServiceInterface) {}

  // Authentication methods - delegate to database service
  async sendVerificationCode(
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    return this.userService.sendVerificationCode(email, clientIp);
  }

  verifyToken(token: string): UserSession | null {
    return this.userService.verifyToken(token);
  }

  async refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }> {
    return this.userService.refreshTokenIfNeeded(token);
  }

  // Utility methods - delegate to database service
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

  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    return this.userService.checkUsernameAvailability(username, excludeUserId);
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string; statusCode?: string }> {
    return this.userService.checkEmailAvailability(email, excludeUserId);
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

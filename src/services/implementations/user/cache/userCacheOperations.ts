import { User } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';
import { UserServiceInterface } from '../../../interfaces/userServiceInterface';
import { UserCacheInvalidation } from './userCacheInvalidation';

export class UserCacheOperations {
  private cacheInvalidation: UserCacheInvalidation;

  constructor(private userService: UserServiceInterface) {
    this.cacheInvalidation = new UserCacheInvalidation(
      this.userService.getDbUserById.bind(this.userService)
    );
  }

  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string; token?: string }> {
    const result = await this.userService.updateUser(userId, updates);

    // Invalidate cache for this user after successful update
    if (result.success) {
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.deactivateUser(userId);

    if (result.success) {
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.reactivateUser(userId);

    if (result.success) {
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.userService.deleteUser(userId);

    if (result.success) {
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    const result = await this.userService.verifyEmailChange(userId, code);

    if (result.success) {
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
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
      await this.cacheInvalidation.invalidateUserCache(userId);
    }

    return result;
  }

  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    const result = await this.userService.ensureAllUsersHaveAvatars();

    // If avatars were updated, invalidate all user caches
    if (result.success && result.updatedCount && result.updatedCount > 0) {
      await this.cacheInvalidation.invalidateAllUserCaches();
    }

    return result;
  }

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
    const result = await this.userService.banUsersByIp(
      username,
      reason,
      bannedByUserId
    );

    // Invalidate cache for all affected users
    if (result.success && result.data) {
      await this.cacheInvalidation.invalidateUserCache(
        result.data.targetUser.id!
      );
      const affectedUserIds = result.data.affectedUsers.map((user) => user.id!);
      await this.cacheInvalidation.invalidateMultipleUserCaches(
        affectedUserIds
      );
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
      iterations?: number;
    };
  }> {
    const result = await this.userService.unbanUsersByIp(
      username,
      unbannedByUserId
    );

    // Invalidate cache for all affected users
    if (result.success && result.data) {
      await this.cacheInvalidation.invalidateUserCache(
        result.data.targetUser.id!
      );
      const affectedUserIds = result.data.affectedUsers.map((user) => user.id!);
      await this.cacheInvalidation.invalidateMultipleUserCaches(
        affectedUserIds
      );
    }

    return result;
  }
}

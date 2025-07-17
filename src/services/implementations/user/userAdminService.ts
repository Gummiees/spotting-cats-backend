import { AdminUserResponse } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { NoteCacheService } from '../note/noteCacheService';

export class UserAdminService {
  private dbOps: UserDatabaseOperations;
  private noteService: NoteCacheService;

  constructor() {
    this.dbOps = new UserDatabaseOperations();
    this.noteService = new NoteCacheService();
  }

  async getUserByUsernameForAdmin(
    username: string
  ): Promise<AdminUserResponse | null> {
    try {
      const user = await this.dbOps.findUserByUsername(username);
      if (!user) return null;

      // Map user to admin response with all privileged data
      const adminUser = this.mapUserToAdminResponse(user);

      // Resolve bannedBy ID to username if it exists
      if (adminUser.bannedBy) {
        const bannedByUsername = await this.resolveUserIdToUsername(
          adminUser.bannedBy
        );
        if (bannedByUsername) {
          adminUser.bannedBy = bannedByUsername;
        }
      }

      // Resolve roleUpdatedBy ID to username if it exists
      if (adminUser.roleUpdatedBy) {
        const roleUpdatedByUsername = await this.resolveUserIdToUsername(
          adminUser.roleUpdatedBy
        );
        if (roleUpdatedByUsername) {
          adminUser.roleUpdatedBy = roleUpdatedByUsername;
        }
      }

      // Get notes written by this user (fromUserId)
      const notes = await this.noteService.getByFromUserIdWithUsernames(
        user._id.toString()
      );

      adminUser.notes = notes;

      return adminUser;
    } catch (error) {
      console.error('Error getting user by username for admin:', error);
      return null;
    }
  }

  private mapUserToAdminResponse(user: any): AdminUserResponse {
    return {
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role || 'user',
      isInactive: !user.isActive,
      isBanned: user.isBanned || false,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailUpdatedAt: user.emailUpdatedAt,
      usernameUpdatedAt: user.usernameUpdatedAt,
      avatarUpdatedAt: user.avatarUpdatedAt,
      banType: user.banType,
      banReason: user.banReason,
      bannedBy: user.bannedBy,
      bannedAt: user.bannedAt,
      roleUpdatedBy: user.roleUpdatedBy,
      roleUpdatedAt: user.roleUpdatedAt,
      deactivatedAt: user.deactivatedAt,
      notes: [], // Will be populated later
    };
  }

  private async resolveUserIdToUsername(
    userId: string
  ): Promise<string | null> {
    try {
      const user = await this.dbOps.findUserById(userId);
      return user ? user.username : null;
    } catch (error) {
      console.error('Error resolving user ID to username:', error);
      return null;
    }
  }
}

import { createHash } from 'crypto';
import { decryptEmail } from '@/utils/security';
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

      // Get notes created for this user (forUserId)
      const notes = await this.noteService.getByForUserIdWithUsernames(
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

  async populateEmailHashes(): Promise<{
    success: boolean;
    updatedCount: number;
    message: string;
  }> {
    try {
      const usersToUpdate = await this.dbOps.findAllUsersWithoutEmailHash();
      if (usersToUpdate.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          message: 'All users already have email hashes.',
        };
      }

      let updatedCount = 0;
      for (const user of usersToUpdate) {
        try {
          const decryptedEmail = decryptEmail(user.email);
          const normalizedEmail = decryptedEmail.toLowerCase().trim();
          const emailHash = createHash('sha256')
            .update(normalizedEmail)
            .digest('hex');

          await this.dbOps.updateUser(user._id.toString(), { emailHash });
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update user ${user._id}:`, error);
        }
      }

      return {
        success: true,
        updatedCount,
        message: `Successfully updated ${updatedCount} users with email hashes.`,
      };
    } catch (error) {
      console.error('Error populating email hashes:', error);
      return {
        success: false,
        updatedCount: 0,
        message: 'An error occurred while populating email hashes.',
      };
    }
  }
}

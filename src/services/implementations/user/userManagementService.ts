import { User, BasicUser } from '@/models/user';
import { emailService } from '@/services/emailService';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { encryptEmail, decryptEmail } from '@/utils/security';

export class UserManagementService {
  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService
  ) {}

  async updateUser(
    userId: string,
    updates: any
  ): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const updateData = this.utilityService.createUserUpdatePayload(updates);
      let shouldRegenerateToken = false;
      let updatedUser: User | null = null;

      if (this.utilityService.isValidUsername(updates.username)) {
        const username = updates.username;
        const usernameCheck = await this.handleUsernameUpdate(
          userId,
          username,
          true
        ); // Manual update
        if (!usernameCheck.success) {
          return { success: false, message: usernameCheck.message! };
        }

        updateData.username = username;
        updateData.usernameUpdatedAt = this.utilityService.createTimestamp(); // Always set for manual updates
        shouldRegenerateToken = true; // Username is in JWT token
      }

      if (this.utilityService.isValidEmailForUpdate(updates.email)) {
        const email = updates.email;
        const emailCheck = await this.handleEmailUpdate(userId, email);
        if (!emailCheck.success) {
          return { success: false, message: emailCheck.message! };
        }

        updateData.email = encryptEmail(
          this.utilityService.normalizeEmail(email)
        );
        updateData.emailUpdatedAt = this.utilityService.createTimestamp();
        shouldRegenerateToken = true; // Email is in JWT token
      }

      if (this.utilityService.isValidAvatarUrl(updates.avatarUrl)) {
        const avatarUrl = updates.avatarUrl;
        const avatarCheck = await this.handleAvatarUpdate(userId, avatarUrl);
        if (!avatarCheck.success) {
          return { success: false, message: avatarCheck.message! };
        }

        updateData.avatarUrl = avatarUrl;
        updateData.avatarUpdatedAt = this.utilityService.createTimestamp();
      }

      const result = await this.dbOps.updateUser(userId, updateData);

      if (result.matchedCount === 0) {
        return { success: false, message: 'User not found' };
      }

      // Clean up email change requests if user is being banned
      if (updates.isBanned === true) {
        await this.dbOps.cleanupEmailChangeRequest(userId);
      }

      // Generate new token if needed
      let newToken: string | undefined;
      if (shouldRegenerateToken) {
        updatedUser = await this.getUserById(userId);
        if (updatedUser) {
          // Get the database user object for token generation
          const dbUser = await this.dbOps.findUserById(userId);
          if (dbUser) {
            newToken = this.utilityService.generateTokenFromDbUser(dbUser);
          }
        }
      }

      return {
        success: true,
        message: 'User updated successfully',
        token: newToken,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async updateUserRole(
    userId: string,
    newRole: 'user' | 'moderator' | 'admin' | 'superadmin',
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Check if user is trying to update their own role
      if (userId === updatedByUserId) {
        return { success: false, message: 'Cannot update your own role' };
      }

      // Update user role
      const result = await this.dbOps.updateUser(userId, {
        role: newRole,
        roleUpdatedAt: this.utilityService.createTimestamp(),
        roleUpdatedBy: updatedByUserId,
        updatedAt: this.utilityService.createTimestamp(),
      });

      if (result.matchedCount === 0) {
        return { success: false, message: 'User not found' };
      }

      // Generate new token for the updated user
      const dbUser = await this.dbOps.findUserById(userId);
      if (!dbUser) {
        return { success: false, message: 'Failed to retrieve updated user' };
      }

      const newToken = this.utilityService.generateTokenFromDbUser(dbUser);

      return {
        success: true,
        message: `User role updated to ${newRole} successfully`,
        token: newToken,
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, message: 'Failed to update user role' };
    }
  }

  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    try {
      const users = await this.dbOps.findAllUsers();
      const mappedUsers = users.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        users: mappedUsers,
        message: `Retrieved ${mappedUsers.length} users`,
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      return {
        success: false,
        users: [],
        message: 'Failed to retrieve users',
      };
    }
  }

  async getAllBasicUsers(): Promise<{
    success: boolean;
    users: BasicUser[];
    message: string;
  }> {
    try {
      const users = await this.dbOps.findAllUsersWithPrivileges();

      // Map users to basic format
      const mappedUsers = users.map((user) => {
        return this.utilityService.mapUserToBasicResponse(user);
      });

      return {
        success: true,
        users: mappedUsers,
        message: `Retrieved ${mappedUsers.length} users`,
      };
    } catch (error) {
      console.error('Error getting all basic users:', error);
      return {
        success: false,
        users: [],
        message: 'Failed to retrieve users',
      };
    }
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const dbUser = await this.dbOps.findUserById(userId);
      if (!dbUser) {
        return { success: false, message: 'User not found' };
      }

      const result = await this.updateUser(userId, { isActive: false });

      if (result.success) {
        try {
          const decryptedEmail = decryptEmail(dbUser.email);
          await emailService.sendAccountDeactivationEmail(
            decryptedEmail,
            dbUser.username
          );
        } catch (emailError) {
          console.error('Failed to send deactivation email:', emailError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return { success: false, message: 'Failed to deactivate user' };
    }
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isActive: true });
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Orphan user data before deletion
      await this.orphanUserData(userId);

      // Clean up any pending email change requests
      await this.dbOps.cleanupEmailChangeRequest(userId);

      // Then hard delete the user
      const result = await this.dbOps.deleteUser(userId);

      if (result.deletedCount === 0) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: 'Failed to delete user' };
    }
  }

  async cleanupOldDeactivatedUsers(retentionDays: number): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      const cutoffDate = this.utilityService.getCutoffDate(retentionDays);
      const usersToDelete = await this.dbOps.findDeactivatedUsersBefore(
        cutoffDate
      );
      await this.orphanUserDataForUsers(usersToDelete);
      const deletedCount = await this.dbOps.deleteDeactivatedUsersBefore(
        cutoffDate
      );
      return {
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} deactivated users older than ${retentionDays} days`,
      };
    } catch (error) {
      console.error('Error cleaning up old deactivated users:', error);
      return {
        success: false,
        deletedCount: 0,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to cleanup old deactivated users',
      };
    }
  }

  async getDeactivatedUserStats(retentionDays: number): Promise<{
    totalDeactivated: number;
    oldDeactivated: number;
  }> {
    try {
      const totalDeactivated = await this.dbOps.countDeactivatedUsers();
      const cutoffDate = this.utilityService.getCutoffDate(retentionDays);
      const oldDeactivated = await this.dbOps.countOldDeactivatedUsers(
        cutoffDate
      );

      return {
        totalDeactivated,
        oldDeactivated,
      };
    } catch (error) {
      console.error('Error getting deactivated user stats:', error);
      return {
        totalDeactivated: 0,
        oldDeactivated: 0,
      };
    }
  }

  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }> {
    try {
      if (!this.utilityService.isValidUsername(username)) {
        return {
          available: false,
          message: 'Username is required and cannot be empty',
        };
      }

      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        return {
          available: false,
          message: 'Username must be at least 3 characters long',
        };
      }

      if (trimmedUsername.length > 20) {
        return {
          available: false,
          message: 'Username must be no more than 20 characters long',
        };
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return {
          available: false,
          message:
            'Username can only contain letters, numbers, underscores, and hyphens',
        };
      }

      const isAvailable = !(await this.dbOps.checkUsernameExists(
        trimmedUsername,
        excludeUserId
      ));

      return {
        available: isAvailable,
        message: isAvailable
          ? 'Username is available'
          : 'Username is already taken',
      };
    } catch (error) {
      console.error('Error checking username availability:', error);
      return {
        available: false,
        message: 'Error checking username availability',
      };
    }
  }

  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    try {
      // Find all users without avatars
      const usersWithoutAvatars = await this.dbOps.findUsersWithoutAvatars();

      if (usersWithoutAvatars.length === 0) {
        return {
          success: true,
          message: 'All users already have avatars',
          updatedCount: 0,
        };
      }

      let updatedCount = 0;
      for (const user of usersWithoutAvatars) {
        try {
          const avatarUrl = this.utilityService.generateAvatarForUsername(
            user.username
          );
          await this.dbOps.updateUser(user._id.toString(), {
            avatarUrl,
            avatarUpdatedAt: this.utilityService.createTimestamp(),
            updatedAt: this.utilityService.createTimestamp(),
          });
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update avatar for user ${user._id}:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully updated avatars for ${updatedCount} users`,
        updatedCount,
      };
    } catch (error) {
      console.error('Error ensuring all users have avatars:', error);
      return {
        success: false,
        message: 'Failed to update user avatars',
      };
    }
  }

  // Private methods
  private async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.dbOps.findUserById(userId);
      if (!user) return null;
      return this.utilityService.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  private async handleUsernameUpdate(
    userId: string,
    username: string,
    isManualUpdate: boolean = true
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Only check eligibility for manual updates, not for generated usernames
    if (isManualUpdate) {
      const eligibility =
        this.utilityService.checkUsernameUpdateEligibility(currentUser);
      if (!eligibility.eligible) {
        return {
          success: false,
          message: `Username can only be updated once every 30 days. You can update it again in ${eligibility.daysRemaining} days.`,
        };
      }
    }

    const isAvailable = !(await this.dbOps.checkUsernameExists(
      username,
      userId
    ));
    if (!isAvailable) {
      return { success: false, message: 'Username is already taken' };
    }

    return { success: true };
  }

  private async handleEmailUpdate(
    userId: string,
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const eligibility =
      this.utilityService.checkEmailUpdateEligibility(currentUser);
    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Email can only be updated once every 90 days. You can update it again in ${eligibility.daysRemaining} days.`,
      };
    }

    // Check if email is already in use by comparing decrypted emails
    const normalizedEmail = this.utilityService.normalizeEmail(email);
    const allUsers = await this.dbOps.findAllUsers();
    const emailExists = allUsers.some((user) => {
      if (user._id.toString() === userId) {
        return false; // Exclude current user
      }
      try {
        const decryptedUserEmail = decryptEmail(user.email);
        return decryptedUserEmail === normalizedEmail;
      } catch (decryptError) {
        console.error('Error decrypting user email:', decryptError);
        return false; // If we can't decrypt, assume it doesn't match
      }
    });

    if (emailExists) {
      return { success: false, message: 'Email is already in use' };
    }

    return { success: true };
  }

  private async handleAvatarUpdate(
    userId: string,
    _avatarUrl: string
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const eligibility =
      this.utilityService.checkAvatarUpdateEligibility(currentUser);
    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Avatar can only be updated once every 30 days. You can update it again in ${eligibility.daysRemaining} days.`,
      };
    }

    return { success: true };
  }

  private async orphanUserData(userId: string): Promise<void> {
    try {
      await this.dbOps.orphanUserCats(userId);
      await this.dbOps.handleUserNotes(userId);
    } catch (error) {
      console.error('Error orphaning user data:', error);
    }
  }

  private async orphanUserDataForUsers(users: any[]): Promise<void> {
    for (const user of users) {
      await this.orphanUserData(user._id.toString());
      // Clean up email change requests for users being deleted
      await this.dbOps.cleanupEmailChangeRequest(user._id.toString());
    }
  }
}

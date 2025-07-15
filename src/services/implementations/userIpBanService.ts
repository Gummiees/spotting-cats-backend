import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';

export class UserIpBanService {
  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService
  ) {}

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
    try {
      // Find the target user
      const targetUser = await this.dbOps.findUserByUsername(username.trim());

      if (!targetUser) {
        return {
          success: false,
          message: 'Target user not found',
        };
      }

      // Get all IP addresses from the target user
      const targetIps = targetUser.ipAddresses || [];
      if (targetIps.length === 0) {
        return {
          success: false,
          message: 'Target user has no IP addresses to ban',
        };
      }

      // Find all users who share any of these IP addresses
      const affectedUsers = await this.dbOps.findUsersByIpAddresses(targetIps);

      // Ban all affected users
      const bannedUserIds = affectedUsers.map((user) => user._id);
      const banUpdate = {
        isBanned: true,
        banReason: `IP ban: ${reason}`,
        bannedBy: bannedByUserId,
        bannedAt: this.utilityService.createTimestamp(),
        updatedAt: this.utilityService.createTimestamp(),
      };

      await this.dbOps.updateManyUsers(bannedUserIds, banUpdate);

      // Add IP addresses to banned_ips collection
      const bannedIpDocuments = targetIps.map((ip: string) => ({
        ipAddress: ip,
        reason: reason,
        bannedBy: bannedByUserId,
        bannedAt: this.utilityService.createTimestamp(),
        updatedAt: this.utilityService.createTimestamp(),
      }));

      await this.dbOps.insertBannedIps(bannedIpDocuments);

      // Map users to response format
      const mappedTargetUser =
        this.utilityService.mapUserToResponse(targetUser);
      const mappedAffectedUsers = affectedUsers.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully banned ${affectedUsers.length} users from ${targetIps.length} IP addresses`,
        data: {
          targetUser: mappedTargetUser,
          affectedUsers: mappedAffectedUsers,
          bannedIps: targetIps,
          totalBanned: affectedUsers.length,
        },
      };
    } catch (error) {
      console.error('Error banning users by IP:', error);
      return {
        success: false,
        message: 'Failed to ban users by IP',
      };
    }
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
    try {
      // Find the target user
      const targetUser = await this.dbOps.findUserByUsername(username.trim());

      if (!targetUser) {
        return {
          success: false,
          message: 'Target user not found',
        };
      }

      // Get all IP addresses from the target user
      const targetIps = targetUser.ipAddresses || [];
      if (targetIps.length === 0) {
        return {
          success: false,
          message: 'Target user has no IP addresses to unban',
        };
      }

      // Find all users who share any of these IP addresses and are banned due to IP ban
      const affectedUsers = await this.dbOps.findUsersByIpAddressesAndBanReason(
        targetIps
      );

      // Unban all affected users
      const unbannedUserIds = affectedUsers.map((user) => user._id);
      const unbanUpdate = {
        isBanned: false,
        banReason: null,
        bannedBy: null,
        bannedAt: null,
        updatedAt: this.utilityService.createTimestamp(),
      };

      await this.dbOps.updateManyUsers(unbannedUserIds, unbanUpdate);

      // Remove IP addresses from banned_ips collection
      await this.dbOps.deleteBannedIps(targetIps);

      // Map users to response format
      const mappedTargetUser =
        this.utilityService.mapUserToResponse(targetUser);
      const mappedAffectedUsers = affectedUsers.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully unbanned ${affectedUsers.length} users from ${targetIps.length} IP addresses`,
        data: {
          targetUser: mappedTargetUser,
          affectedUsers: mappedAffectedUsers,
          unbannedIps: targetIps,
          totalUnbanned: affectedUsers.length,
        },
      };
    } catch (error) {
      console.error('Error unbanning users by IP:', error);
      return {
        success: false,
        message: 'Failed to unban users by IP',
      };
    }
  }

  async checkIpBanned(ipAddress: string): Promise<{
    banned: boolean;
    reason?: string;
    bannedBy?: string;
    bannedAt?: Date;
  }> {
    try {
      const bannedIp = await this.dbOps.findBannedIp(ipAddress);

      if (!bannedIp) {
        return { banned: false };
      }

      // Resolve bannedBy ID to username
      let bannedByUsername = null;
      if (bannedIp.bannedBy) {
        const bannedByUser = await this.dbOps.findUserById(bannedIp.bannedBy);
        bannedByUsername = bannedByUser?.username || null;
      }

      return {
        banned: true,
        reason: bannedIp.reason,
        bannedBy: bannedByUsername || bannedIp.bannedBy,
        bannedAt: bannedIp.bannedAt,
      };
    } catch (error) {
      console.error('Error checking IP ban status:', error);
      return { banned: false };
    }
  }
}

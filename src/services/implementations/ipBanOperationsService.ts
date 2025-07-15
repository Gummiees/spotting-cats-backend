import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';

export class IpBanOperationsService {
  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService
  ) {}

  /**
   * Executes the IP ban operation for all affected users
   * @param allAffectedUsers - Users to be banned
   * @param targetIps - IP addresses to ban
   * @param reason - Reason for the ban
   * @param bannedByUserId - ID of the user performing the ban
   * @returns Operation result
   */
  async executeIpBan(
    allAffectedUsers: any[],
    targetIps: string[],
    reason: string,
    bannedByUserId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      affectedUsers: User[];
      bannedIps: string[];
      totalBanned: number;
    };
  }> {
    try {
      // Ban all affected users
      const bannedUserIds = allAffectedUsers.map((user) => user._id);
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
      const mappedAffectedUsers = allAffectedUsers.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully banned ${allAffectedUsers.length} users from ${targetIps.length} IP addresses`,
        data: {
          affectedUsers: mappedAffectedUsers,
          bannedIps: targetIps,
          totalBanned: allAffectedUsers.length,
        },
      };
    } catch (error) {
      console.error('Error executing IP ban:', error);
      return {
        success: false,
        message: 'Failed to execute IP ban',
      };
    }
  }

  /**
   * Executes the IP unban operation for all affected users
   * @param affectedUsers - Users to be unbanned
   * @param targetIps - IP addresses to unban
   * @returns Operation result
   */
  async executeIpUnban(
    affectedUsers: any[],
    targetIps: string[]
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      affectedUsers: User[];
      unbannedIps: string[];
      totalUnbanned: number;
    };
  }> {
    try {
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
      const mappedAffectedUsers = affectedUsers.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully unbanned ${affectedUsers.length} users from ${targetIps.length} IP addresses`,
        data: {
          affectedUsers: mappedAffectedUsers,
          unbannedIps: targetIps,
          totalUnbanned: affectedUsers.length,
        },
      };
    } catch (error) {
      console.error('Error executing IP unban:', error);
      return {
        success: false,
        message: 'Failed to execute IP unban',
      };
    }
  }
}

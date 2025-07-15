import { UserDatabaseOperations } from './userDatabaseOperations';

export class IpBanQueryService {
  constructor(private dbOps: UserDatabaseOperations) {}

  /**
   * Finds a target user by username
   * @param username - Username to search for
   * @returns The target user or null if not found
   */
  async findTargetUser(username: string): Promise<any | null> {
    return await this.dbOps.findUserByUsername(username.trim());
  }

  /**
   * Finds the banning user by ID
   * @param bannedByUserId - ID of the banning user
   * @returns The banning user or null if not found
   */
  async findBanningUser(bannedByUserId: string): Promise<any | null> {
    return await this.dbOps.findUserById(bannedByUserId);
  }

  /**
   * Finds all users who share the given IP addresses
   * @param targetIps - IP addresses to search for
   * @returns Array of users sharing the IP addresses
   */
  async findUsersByIpAddresses(targetIps: string[]): Promise<any[]> {
    return await this.dbOps.findUsersByIpAddresses(targetIps);
  }

  /**
   * Finds all users who share the given IP addresses and are banned due to IP ban
   * @param targetIps - IP addresses to search for
   * @returns Array of users sharing the IP addresses and banned by IP
   */
  async findUsersByIpAddressesAndBanReason(
    targetIps: string[]
  ): Promise<any[]> {
    return await this.dbOps.findUsersByIpAddressesAndBanReason(targetIps);
  }

  /**
   * Checks if an IP address is banned
   * @param ipAddress - IP address to check
   * @returns Ban status information
   */
  async checkIpBanStatus(ipAddress: string): Promise<{
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

  /**
   * Gets IP addresses from a target user
   * @param targetUser - The target user
   * @returns Array of IP addresses
   */
  getTargetUserIps(targetUser: any): string[] {
    return targetUser.ipAddresses || [];
  }
}

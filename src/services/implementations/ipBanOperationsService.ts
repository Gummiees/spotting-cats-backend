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
   * Executes a comprehensive IP ban operation that recursively finds and bans all connected users
   * @param initialUsers - Initial users to start the ban process from
   * @param initialIps - Initial IP addresses to start the ban process from
   * @param reason - Reason for the ban
   * @param bannedByUserId - ID of the user performing the ban
   * @param queryService - Query service for finding related users and IPs
   * @returns Operation result
   */
  async executeComprehensiveIpBan(
    initialUsers: any[],
    initialIps: string[],
    reason: string,
    bannedByUserId: string,
    queryService: any
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      affectedUsers: User[];
      bannedIps: string[];
      totalBanned: number;
      iterations: number;
    };
  }> {
    try {
      const allAffectedUsers = new Set<string>(); // Track user IDs
      const allBannedIps = new Set<string>(); // Track IP addresses
      const processedIps = new Set<string>(); // Track processed IPs to avoid infinite loops
      let iterations = 0;
      const maxIterations = 10; // Safety limit to prevent infinite loops

      // Start with initial IPs
      let currentIps = new Set(initialIps);
      let currentUsers = new Set(
        initialUsers.map((user) => user._id.toString())
      );

      while (currentIps.size > 0 && iterations < maxIterations) {
        iterations++;
        console.log(
          `IP ban iteration ${iterations}: processing ${currentIps.size} IPs`
        );

        // Find all users sharing these IPs
        const ipArray = Array.from(currentIps);
        const usersInThisIteration = await queryService.findUsersByIpAddresses(
          ipArray
        );

        if (usersInThisIteration.length === 0) {
          break; // No more users to ban
        }

        // Add users and IPs to our tracking sets
        usersInThisIteration.forEach((user: any) => {
          allAffectedUsers.add(user._id.toString());
          currentUsers.add(user._id.toString());
        });

        ipArray.forEach((ip: string) => {
          allBannedIps.add(ip);
          processedIps.add(ip);
        });

        // Find all IP addresses from these users for the next iteration
        const userIds = Array.from(currentUsers);
        const newIps = await queryService.findIpAddressesFromUsers(userIds);

        // Filter out IPs we've already processed
        currentIps = new Set(
          newIps.filter((ip: string) => !processedIps.has(ip))
        );
      }

      if (iterations >= maxIterations) {
        console.warn(
          'IP ban reached maximum iterations, stopping to prevent infinite loop'
        );
      }

      // Execute the actual ban operation
      const userIdsToBan = Array.from(allAffectedUsers);
      const ipsToBan = Array.from(allBannedIps);

      if (userIdsToBan.length === 0) {
        return {
          success: true,
          message: 'No users found to ban',
          data: {
            affectedUsers: [],
            bannedIps: [],
            totalBanned: 0,
            iterations,
          },
        };
      }

      // Get full user objects for the ban operation
      const usersToBan = await Promise.all(
        userIdsToBan.map((id) => this.dbOps.findUserById(id))
      );

      const banUpdate = {
        isBanned: true,
        banReason: `IP ban: ${reason}`,
        bannedBy: bannedByUserId,
        bannedAt: this.utilityService.createTimestamp(),
        updatedAt: this.utilityService.createTimestamp(),
      };

      await this.dbOps.updateManyUsers(userIdsToBan, banUpdate);

      // Add IP addresses to banned_ips collection
      const bannedIpDocuments = ipsToBan.map((ip: string) => ({
        ipAddress: ip,
        reason: reason,
        bannedBy: bannedByUserId,
        bannedAt: this.utilityService.createTimestamp(),
        updatedAt: this.utilityService.createTimestamp(),
      }));

      await this.dbOps.insertBannedIps(bannedIpDocuments);

      // Map users to response format
      const mappedAffectedUsers = usersToBan.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully banned ${userIdsToBan.length} users from ${ipsToBan.length} IP addresses in ${iterations} iterations`,
        data: {
          affectedUsers: mappedAffectedUsers,
          bannedIps: ipsToBan,
          totalBanned: userIdsToBan.length,
          iterations,
        },
      };
    } catch (error) {
      console.error('Error executing comprehensive IP ban:', error);
      return {
        success: false,
        message: 'Failed to execute comprehensive IP ban',
      };
    }
  }

  /**
   * Executes a comprehensive IP unban operation that recursively finds and unbans all connected users
   * @param initialUsers - Initial users to start the unban process from
   * @param initialIps - Initial IP addresses to start the unban process from
   * @param queryService - Query service for finding related users and IPs
   * @returns Operation result
   */
  async executeComprehensiveIpUnban(
    initialUsers: any[],
    initialIps: string[],
    queryService: any
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      affectedUsers: User[];
      unbannedIps: string[];
      totalUnbanned: number;
      iterations: number;
    };
  }> {
    try {
      const allAffectedUsers = new Set<string>(); // Track user IDs
      const allUnbannedIps = new Set<string>(); // Track IP addresses
      const processedIps = new Set<string>(); // Track processed IPs to avoid infinite loops
      let iterations = 0;
      const maxIterations = 10; // Safety limit to prevent infinite loops

      // Start with initial IPs
      let currentIps = new Set(initialIps);
      let currentUsers = new Set(
        initialUsers.map((user) => user._id.toString())
      );

      while (currentIps.size > 0 && iterations < maxIterations) {
        iterations++;
        console.log(
          `IP unban iteration ${iterations}: processing ${currentIps.size} IPs`
        );

        // Find all users sharing these IPs who are banned due to IP ban
        const ipArray = Array.from(currentIps);
        const usersInThisIteration =
          await queryService.findUsersByIpAddressesAndBanReason(ipArray);

        if (usersInThisIteration.length === 0) {
          break; // No more users to unban
        }

        // Add users and IPs to our tracking sets
        usersInThisIteration.forEach((user: any) => {
          allAffectedUsers.add(user._id.toString());
          currentUsers.add(user._id.toString());
        });

        ipArray.forEach((ip: string) => {
          allUnbannedIps.add(ip);
          processedIps.add(ip);
        });

        // Find all IP addresses from these users for the next iteration
        const userIds = Array.from(currentUsers);
        const newIps = await queryService.findIpAddressesFromUsers(userIds);

        // Filter out IPs we've already processed
        currentIps = new Set(
          newIps.filter((ip: string) => !processedIps.has(ip))
        );
      }

      if (iterations >= maxIterations) {
        console.warn(
          'IP unban reached maximum iterations, stopping to prevent infinite loop'
        );
      }

      // Execute the actual unban operation
      const userIdsToUnban = Array.from(allAffectedUsers);
      const ipsToUnban = Array.from(allUnbannedIps);

      if (userIdsToUnban.length === 0) {
        return {
          success: true,
          message: 'No users found to unban',
          data: {
            affectedUsers: [],
            unbannedIps: [],
            totalUnbanned: 0,
            iterations,
          },
        };
      }

      // Get full user objects for the unban operation
      const usersToUnban = await Promise.all(
        userIdsToUnban.map((id) => this.dbOps.findUserById(id))
      );

      const unbanUpdate = {
        isBanned: false,
        banReason: null,
        bannedBy: null,
        bannedAt: null,
        updatedAt: this.utilityService.createTimestamp(),
      };

      await this.dbOps.updateManyUsers(userIdsToUnban, unbanUpdate);
      await this.dbOps.deleteBannedIps(ipsToUnban);

      // Map users to response format
      const mappedAffectedUsers = usersToUnban.map((user) =>
        this.utilityService.mapUserToResponse(user)
      );

      return {
        success: true,
        message: `Successfully unbanned ${userIdsToUnban.length} users from ${ipsToUnban.length} IP addresses in ${iterations} iterations`,
        data: {
          affectedUsers: mappedAffectedUsers,
          unbannedIps: ipsToUnban,
          totalUnbanned: userIdsToUnban.length,
          iterations,
        },
      };
    } catch (error) {
      console.error('Error executing comprehensive IP unban:', error);
      return {
        success: false,
        message: 'Failed to execute comprehensive IP unban',
      };
    }
  }
}

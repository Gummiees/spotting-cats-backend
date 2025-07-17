import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { IpBanValidationService } from './ipBanValidationService';
import { IpBanOperationsService } from './ipBanOperationsService';
import { IpBanQueryService } from './ipBanQueryService';
import { hashIp } from '@/utils/security';

export class UserIpBanService {
  private validationService: IpBanValidationService;
  private operationsService: IpBanOperationsService;
  private queryService: IpBanQueryService;

  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService
  ) {
    this.validationService = new IpBanValidationService();
    this.operationsService = new IpBanOperationsService(dbOps, utilityService);
    this.queryService = new IpBanQueryService(dbOps);
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
      protectedUsers?: User[];
      bannedIps: string[];
      totalBanned: number;
      iterations?: number;
    };
  }> {
    try {
      // Find and validate target user
      const targetUser = await this.queryService.findTargetUser(username);
      const targetValidation =
        this.validationService.validateTargetUser(targetUser);
      if (!targetValidation.valid) {
        return {
          success: false,
          message: targetValidation.message!,
        };
      }

      // Find and validate banning user
      const banningUser = await this.queryService.findBanningUser(
        bannedByUserId
      );
      const banningValidation =
        this.validationService.validateBanningUser(banningUser);
      if (!banningValidation.valid) {
        return {
          success: false,
          message: banningValidation.message!,
        };
      }

      // Get IP addresses and find initial affected users (already hashed in DB)
      const targetIps = this.queryService.getTargetUserIps(targetUser);
      const initialAffectedUsers =
        await this.queryService.findUsersByIpAddresses(targetIps);

      // Validate role hierarchy for initial users
      const validation = await this.validationService.validateIpBanOperation(
        initialAffectedUsers,
        banningUser
      );
      if (!validation.canProceed) {
        return {
          success: false,
          message: validation.message!,
        };
      }

      // Execute the comprehensive ban operation
      const operationResult =
        await this.operationsService.executeComprehensiveIpBan(
          initialAffectedUsers,
          targetIps,
          reason,
          bannedByUserId,
          this.queryService
        );

      if (!operationResult.success) {
        return {
          success: false,
          message: operationResult.message,
        };
      }

      // Map target user to response format
      const mappedTargetUser =
        this.utilityService.mapUserToResponse(targetUser);

      return {
        success: true,
        message: operationResult.message,
        data: {
          targetUser: mappedTargetUser,
          affectedUsers: operationResult.data!.affectedUsers,
          protectedUsers: validation.blockingUsers?.map((user: any) =>
            this.utilityService.mapUserToResponse(user)
          ),
          bannedIps: operationResult.data!.bannedIps,
          totalBanned: operationResult.data!.totalBanned,
          iterations: operationResult.data!.iterations,
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
      iterations?: number;
    };
  }> {
    try {
      // Find and validate target user
      const targetUser = await this.queryService.findTargetUser(username);
      const targetValidation =
        this.validationService.validateTargetUser(targetUser);
      if (!targetValidation.valid) {
        return {
          success: false,
          message: targetValidation.message!,
        };
      }

      // Get IP addresses and find initial affected users (already hashed in DB)
      const targetIps = this.queryService.getTargetUserIps(targetUser);
      const initialAffectedUsers =
        await this.queryService.findUsersByIpAddressesAndBanReason(targetIps);

      // Execute the comprehensive unban operation
      const operationResult =
        await this.operationsService.executeComprehensiveIpUnban(
          initialAffectedUsers,
          targetIps,
          this.queryService
        );

      if (!operationResult.success) {
        return {
          success: false,
          message: operationResult.message,
        };
      }

      // Map target user to response format
      const mappedTargetUser =
        this.utilityService.mapUserToResponse(targetUser);

      return {
        success: true,
        message: operationResult.message,
        data: {
          targetUser: mappedTargetUser,
          affectedUsers: operationResult.data!.affectedUsers,
          unbannedIps: operationResult.data!.unbannedIps,
          totalUnbanned: operationResult.data!.totalUnbanned,
          iterations: operationResult.data!.iterations,
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
    // Hash the IP address before checking
    const hashedIp = hashIp(ipAddress);
    return await this.queryService.checkIpBanStatus(hashedIp);
  }
}

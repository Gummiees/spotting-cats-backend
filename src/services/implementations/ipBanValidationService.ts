import { User } from '@/models/user';

export class IpBanValidationService {
  /**
   * Validates if an IP ban operation can proceed based on role hierarchy
   * @param allAffectedUsers - All users that would be affected by the IP ban
   * @param banningUser - The user attempting to perform the ban
   * @returns Validation result with success status and any blocking users
   */
  async validateIpBanOperation(
    allAffectedUsers: any[],
    banningUser: any
  ): Promise<{
    canProceed: boolean;
    blockingUsers: any[];
    message?: string;
  }> {
    // TODO: Implement more complex role hierarchy system for IP banning
    // Current implementation: Block entire IP ban if any affected user has equal or higher role than banning user
    // Future enhancement: Allow configurable rules, partial IP bans, role-specific exceptions

    const { ROLE_HIERARCHY } = await import('@/models/user');
    const blockingUsers: any[] = [];

    for (const user of allAffectedUsers) {
      // Skip the banning user themselves
      if (user._id === banningUser._id) {
        continue;
      }

      if (
        ROLE_HIERARCHY[
          user.role as 'user' | 'moderator' | 'admin' | 'superadmin'
        ] >=
        ROLE_HIERARCHY[
          banningUser.role as 'user' | 'moderator' | 'admin' | 'superadmin'
        ]
      ) {
        blockingUsers.push(user);
      }
    }

    if (blockingUsers.length > 0) {
      const blockingUsernames = blockingUsers
        .map((user) => user.username)
        .join(', ');
      return {
        canProceed: false,
        blockingUsers,
        message: `IP ban blocked: Would affect users with equal or higher roles (${blockingUsernames}). Users with equal or higher roles than the banning user are protected from IP bans.`,
      };
    }

    return {
      canProceed: true,
      blockingUsers: [],
    };
  }

  /**
   * Validates that a target user exists and has IP addresses
   * @param targetUser - The target user to validate
   * @returns Validation result
   */
  validateTargetUser(targetUser: any): {
    valid: boolean;
    message?: string;
  } {
    if (!targetUser) {
      return {
        valid: false,
        message: 'Target user not found',
      };
    }

    const targetIps = targetUser.ipAddresses || [];
    if (targetIps.length === 0) {
      return {
        valid: false,
        message: 'Target user has no IP addresses to ban',
      };
    }

    return { valid: true };
  }

  /**
   * Validates that the banning user exists
   * @param banningUser - The banning user to validate
   * @returns Validation result
   */
  validateBanningUser(banningUser: any): {
    valid: boolean;
    message?: string;
  } {
    if (!banningUser) {
      return {
        valid: false,
        message: 'Banning user not found',
      };
    }

    return { valid: true };
  }
}

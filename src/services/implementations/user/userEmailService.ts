import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { encryptEmail, decryptEmail } from '@/utils/security';
import { emailService } from '@/services/emailService';

export class UserEmailService {
  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService
  ) {}

  async initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    try {
      if (!this.utilityService.isValidEmail(newEmail)) {
        return { success: false, message: 'Invalid email format' };
      }

      const dbUser = await this.dbOps.findUserById(userId);
      if (!dbUser) {
        return { success: false, message: 'User not found' };
      }

      // Check rate limiting for email change verification code requests
      const rateLimitCheck = await this.checkEmailChangeRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: `You can only request an email change verification code once every 10 minutes. Please try again in ${rateLimitCheck.minutesRemaining} minutes.`,
          errorCode: 'EMAIL_CHANGE_RATE_LIMITED',
        };
      }

      // Map to User object for eligibility check
      const currentUser = this.utilityService.mapUserToResponse(dbUser);
      const eligibility = await this.checkEmailUpdateEligibility(currentUser);
      if (!eligibility.eligible) {
        return {
          success: false,
          message: `Email can only be updated once every 90 days. You can update it again in ${eligibility.daysRemaining} days.`,
        };
      }

      // Check if new email is available
      const normalizedNewEmail = this.utilityService.normalizeEmail(newEmail);
      const availabilityCheck = await this.checkEmailAvailability(
        normalizedNewEmail,
        userId
      );
      if (!availabilityCheck.available) {
        return {
          success: false,
          message: availabilityCheck.message,
          errorCode: availabilityCheck.statusCode,
        };
      }

      const code = this.utilityService.generateVerificationCode();

      await this.dbOps.invalidatePreviousEmailChangeRequests(userId);
      await this.dbOps.insertEmailChangeRequest(
        this.utilityService.createEmailChangeRequest(
          userId,
          normalizedNewEmail, // Store unencrypted email in change request for verification
          code
        )
      );

      const emailSent = await emailService.sendEmailChangeVerificationCode(
        normalizedNewEmail,
        code
      );
      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email' };
      }

      return {
        success: true,
        message: 'Verification code sent to your new email address',
      };
    } catch (error) {
      console.error('Error initiating email change:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const codeValidation = await this.validateEmailChangeCode(userId, code);
      if (!codeValidation.valid) {
        return { success: false, message: codeValidation.message! };
      }

      const emailChangeRequest = await this.dbOps.findEmailChangeRequest(
        userId,
        code
      );
      if (!emailChangeRequest) {
        return { success: false, message: 'Email change request not found' };
      }

      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        return { success: false, message: 'User not found' };
      }

      const normalizedEmail = this.utilityService.normalizeEmail(
        emailChangeRequest.newEmail
      );
      const encryptedEmail = encryptEmail(normalizedEmail);
      const result = await this.dbOps.updateUser(userId, {
        email: encryptedEmail,
        emailUpdatedAt: this.utilityService.createTimestamp(),
        updatedAt: this.utilityService.createTimestamp(),
      });

      if (result.matchedCount === 0) {
        return { success: false, message: 'User not found' };
      }

      // Get updated user data for token generation
      const updatedUser = await this.getUserById(userId);
      if (!updatedUser) {
        return {
          success: false,
          message: 'Failed to retrieve updated user data',
        };
      }

      // Generate new token for the updated user
      const dbUser = await this.dbOps.findUserById(userId);
      if (!dbUser) {
        return { success: false, message: 'Failed to retrieve updated user' };
      }

      const newToken = this.utilityService.generateTokenFromDbUser(dbUser);

      await this.dbOps.cleanupEmailChangeRequest(userId);

      return {
        success: true,
        message: 'Email updated successfully',
        token: newToken,
      };
    } catch (error) {
      console.error('Error verifying email change:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string; statusCode?: string }> {
    try {
      if (!this.utilityService.isValidEmail(email)) {
        return {
          available: false,
          message: 'Invalid email format',
          statusCode: 'INVALID_EMAIL_FORMAT',
        };
      }

      const normalizedEmail = this.utilityService.normalizeEmail(email);

      // If excludeUserId is provided, first check if the email is the same as the current user's email
      if (excludeUserId) {
        const currentUser = await this.dbOps.findUserById(excludeUserId);
        if (currentUser) {
          try {
            const decryptedCurrentEmail = decryptEmail(currentUser.email);
            if (decryptedCurrentEmail === normalizedEmail) {
              return {
                available: false,
                message: 'Email is the same as your current email',
                statusCode: 'EMAIL_SAME_AS_CURRENT',
              };
            }
          } catch (decryptError) {
            console.error('Error decrypting current user email:', decryptError);
            // If we can't decrypt the current email, continue with the availability check
          }
        }
      }

      // Check if the email is already in use by other users (excluding current user)
      // We need to check all users and decrypt their emails to compare
      const allUsers = await this.dbOps.findAllUsers();
      const emailExists = allUsers.some((user) => {
        if (excludeUserId && user._id.toString() === excludeUserId) {
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

      const isAvailable = !emailExists;

      return {
        available: isAvailable,
        message: isAvailable ? 'Email is available' : 'Email is already in use',
        statusCode: isAvailable ? undefined : 'EMAIL_ALREADY_IN_USE',
      };
    } catch (error) {
      console.error('Error checking email availability:', error);
      return {
        available: false,
        message: 'Error checking email availability',
        statusCode: 'INTERNAL_ERROR',
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

  private async validateEmailChangeCode(
    userId: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const emailChangeRequest = await this.dbOps.findEmailChangeRequest(
      userId,
      code
    );

    if (!emailChangeRequest) {
      return {
        valid: false,
        message: 'Invalid or expired verification code',
      };
    }

    await this.dbOps.markEmailChangeRequestAsUsed(emailChangeRequest._id);
    return { valid: true };
  }

  private async checkEmailChangeRateLimit(
    userId: string
  ): Promise<{ allowed: boolean; minutesRemaining?: number }> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const recentRequest = await this.dbOps.findRecentEmailChangeRequest(
        userId,
        tenMinutesAgo
      );

      if (recentRequest) {
        // Calculate remaining time
        const timeElapsed = Date.now() - recentRequest.createdAt.getTime();
        const minutesRemaining = Math.ceil(
          (10 * 60 * 1000 - timeElapsed) / (60 * 1000)
        );
        return { allowed: false, minutesRemaining };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking email change rate limit:', error);
      // In case of error, allow the request to proceed
      return { allowed: true };
    }
  }

  private async checkEmailUpdateEligibility(
    user: User
  ): Promise<{ eligible: boolean; daysRemaining?: number }> {
    if (!user.emailUpdatedAt) {
      return { eligible: true };
    }

    const daysSinceUpdate = this.utilityService.calculateDaysSince(
      user.emailUpdatedAt
    );

    if (daysSinceUpdate >= 90) {
      return { eligible: true };
    }

    return {
      eligible: false,
      daysRemaining: 90 - daysSinceUpdate,
    };
  }
}

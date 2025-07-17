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

      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        return { success: false, message: 'User not found' };
      }

      // Compare encrypted emails instead of decrypting
      const normalizedNewEmail = this.utilityService.normalizeEmail(newEmail);
      const encryptedNewEmail = encryptEmail(normalizedNewEmail);
      if (currentUser.email === encryptedNewEmail) {
        return {
          success: false,
          message: 'New email must be different from current email',
          errorCode: 'EMAIL_SAME_AS_CURRENT',
        };
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

      const eligibility = await this.checkEmailUpdateEligibility(currentUser);
      if (!eligibility.eligible) {
        return {
          success: false,
          message: `Email can only be updated once every 90 days. You can update it again in ${eligibility.daysRemaining} days.`,
        };
      }

      // Check if new email is available by comparing encrypted emails
      const isAvailable = await this.checkEmailAvailability(
        encryptedNewEmail,
        userId
      );
      if (!isAvailable) {
        return { success: false, message: 'Email is already in use' };
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
      const result = await this.dbOps.updateUser(userId, {
        email: normalizedEmail,
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

      // Generate new JWT token with updated email
      const newToken = this.utilityService.generateTokenForUser(updatedUser);

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
  ): Promise<{ available: boolean; message: string }> {
    try {
      if (!this.utilityService.isValidEmail(email)) {
        return {
          available: false,
          message: 'Invalid email format',
        };
      }

      const normalizedEmail = this.utilityService.normalizeEmail(email);
      const isAvailable = !(await this.dbOps.checkEmailExists(
        normalizedEmail,
        excludeUserId
      ));

      return {
        available: isAvailable,
        message: isAvailable ? 'Email is available' : 'Email is already in use',
      };
    } catch (error) {
      console.error('Error checking email availability:', error);
      return {
        available: false,
        message: 'Error checking email availability',
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

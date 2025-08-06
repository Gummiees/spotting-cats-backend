import { createHash } from 'crypto';
import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { UserIpBanService } from '../ip-ban/userIpBanService';
import { decryptEmail } from '@/utils/security';
import { emailService } from '@/services/emailService';
import { EmailValidationService } from '@/services/emailValidationService';

export class UserAuthService {
  constructor(
    private dbOps: UserDatabaseOperations,
    private utilityService: UserUtilityService,
    private ipBanService: UserIpBanService
  ) {}

  async sendVerificationCode(
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    try {
      const emailValidation = EmailValidationService.validateEmail(email);
      if (!emailValidation.valid) {
        return {
          success: false,
          message: emailValidation.message,
          errorCode: emailValidation.errorCode,
        };
      }

      // Check if IP is banned
      if (clientIp) {
        const ipBanStatus = await this.ipBanService.checkIpBanned(clientIp);
        if (ipBanStatus.banned) {
          return {
            success: false,
            message: `This IP address has been banned: ${ipBanStatus.reason}`,
            errorCode: 'IP_BANNED',
          };
        }
      }

      const normalizedEmail = EmailValidationService.normalizeEmail(email);
      // We need to check all users and decrypt their emails to find a match
      const existingUser = await this.findUserByEmail(normalizedEmail);

      // Check if existing user is banned
      if (existingUser && existingUser.isBanned) {
        return {
          success: false,
          message:
            'This account has been banned and cannot receive verification codes',
          errorCode: 'ACCOUNT_BANNED',
        };
      }

      const code = this.utilityService.generateVerificationCode();

      await this.dbOps.invalidatePreviousCodes(normalizedEmail);
      const authCodeData = this.utilityService.createAuthCode(
        normalizedEmail,
        code
      );
      await this.dbOps.insertAuthCode(authCodeData);

      const emailSent = await emailService.sendVerificationCode(
        normalizedEmail,
        code
      );
      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email' };
      }

      return {
        success: true,
        message: existingUser
          ? 'Verification code sent to your email'
          : 'Verification code sent. Please check your email to create your account',
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async verifyCodeAndAuthenticate(
    email: string,
    code: string,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    isNewUser?: boolean;
  }> {
    console.log(
      `Verifying code for email: ${email}, code: ${code}, IP: ${clientIp}`
    );
    try {
      // Step 1: Validate the verification code
      const codeValidation = await this.validateVerificationCode(email, code);
      if (!codeValidation.valid) {
        console.log(`Code validation failed: ${codeValidation.message}`);
        return { success: false, message: codeValidation.message! };
      }
      console.log('Code validation successful.');

      // Step 2: Process user authentication
      const userResult = await this.processUserAuthentication(email, clientIp);
      if (!userResult.success) {
        console.log(`User authentication failed: ${userResult.message}`);
        return { success: false, message: userResult.message! };
      }
      console.log(
        `User authentication successful. New user: ${userResult.isNewUser}`
      );

      // Step 3: Map user to response format
      if (!userResult.user) {
        console.error('User object is undefined after authentication');
        return {
          success: false,
          message: 'Authentication failed - user not found',
        };
      }

      const mappedUser = this.utilityService.mapUserToResponse(userResult.user);

      // Step 4: Generate authentication token
      let token: string;
      try {
        token = this.utilityService.generateTokenFromDbUser(userResult.user);
      } catch (error) {
        console.error('Error generating token from user:', error);
        return { success: false, message: 'Authentication failed' };
      }
      console.log('Token generated successfully.');

      return {
        success: true,
        message: userResult.isNewUser
          ? 'Account created successfully'
          : 'Login successful',
        token,
        user: mappedUser,
        isNewUser: userResult.isNewUser,
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }> {
    try {
      const decoded = this.utilityService.verifyToken(token);
      if (!decoded) {
        return { shouldRefresh: false };
      }

      // Check if token expires within the next 24 hours (86400 seconds)
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      const REFRESH_THRESHOLD = this.utilityService.getRefreshThreshold();

      if (timeUntilExpiry <= REFRESH_THRESHOLD) {
        // Token is close to expiring, generate a new one
        const user = await this.dbOps.findUserById(decoded.userId);
        if (!user) {
          return { shouldRefresh: false };
        }

        // Generate new token
        let newToken: string;
        try {
          newToken = this.utilityService.generateTokenFromDbUser(user);
        } catch (error) {
          console.error('Error generating refresh token:', error);
          return { shouldRefresh: false };
        }
        return { shouldRefresh: true, newToken };
      }

      return { shouldRefresh: false };
    } catch (error) {
      console.error('Error checking token refresh:', error);
      return { shouldRefresh: false };
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.dbOps.findUserById(userId);
      if (!user) return null;
      return this.utilityService.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user || user.isBanned) return null;
      return this.utilityService.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.dbOps.findUserByUsername(username);
      if (!user) return null;
      return this.utilityService.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  private async findUserByEmail(email: string): Promise<any | null> {
    const normalizedEmail = EmailValidationService.normalizeEmail(email);
    const emailHash = createHash('sha256')
      .update(normalizedEmail)
      .digest('hex');
    const user = await this.dbOps.findUserByEmailHash(emailHash);

    if (user) {
      // Optional: Verify that the decrypted email matches, as a sanity check
      const decryptedEmail = decryptEmail(user.email);
      if (decryptedEmail !== normalizedEmail) {
        // This case should ideally never happen if hashes are managed correctly
        console.error(
          `Critical: Email hash mismatch for user ${user._id}. The user's email may have been tampered with.`
        );
        return null;
      }
    }

    return user;
  }

  // Private methods
  private async validateVerificationCode(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const normalizedEmail = EmailValidationService.normalizeEmail(email);
    const authCode = await this.dbOps.findValidAuthCode(normalizedEmail, code);
    if (!authCode) {
      return {
        valid: false,
        message: 'Invalid or expired verification code',
      };
    }

    await this.dbOps.markCodeAsUsed(authCode._id);
    return { valid: true };
  }

  private async processUserAuthentication(
    email: string,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    isNewUser?: boolean;
  }> {
    // Check if IP is banned before processing authentication
    if (clientIp) {
      const ipBanStatus = await this.ipBanService.checkIpBanned(clientIp);
      if (ipBanStatus.banned) {
        return {
          success: false,
          message: `This IP address has been banned: ${ipBanStatus.reason}`,
        };
      }
    }

    // We need to check all users and decrypt their emails to find a match
    const normalizedEmail = EmailValidationService.normalizeEmail(email);
    let user = await this.findUserByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const newUserResult = await this.handleNewUserCreation(email, clientIp);
      if (!newUserResult.success) {
        return { success: false, message: newUserResult.message };
      }
      user = newUserResult.user!;
      isNewUser = true;
    } else {
      // Handle existing user
      const existingUserResult = await this.handleExistingUser(user, clientIp);
      if (!existingUserResult.success) {
        return { success: false, message: existingUserResult.message };
      }
      user = existingUserResult.user!;
    }

    return { success: true, user, isNewUser };
  }

  private async handleNewUserCreation(
    email: string,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message?: string;
    user?: any;
  }> {
    try {
      const username = await this.utilityService.generateUniqueUsername(
        async (username: string) => {
          return await this.dbOps.checkUsernameExists(username);
        }
      );
      const userData = this.utilityService.createUserData(
        email,
        clientIp,
        username
      );
      const user = await this.dbOps.insertUser(userData);
      await emailService.sendWelcomeEmail(email);
      return { success: true, user };
    } catch (error) {
      console.error('Error creating new user:', error);
      return { success: false, message: 'Failed to create new user' };
    }
  }

  private async handleExistingUser(
    user: any,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message?: string;
    user?: any;
  }> {
    try {
      // Check if user is banned
      if (user.isBanned) {
        throw new Error(
          'This account has been banned and cannot be used for authentication'
        );
      }

      // Reactivate user if deactivated
      if (!user.isActive) {
        const reactivationResult = await this.reactivateUser(
          user._id.toString()
        );
        if (!reactivationResult.success) {
          return { success: false, message: 'Failed to reactivate account' };
        }
      }

      // Update existing user (last login, etc.)
      const updateData = this.utilityService.createUserUpdateData(clientIp);
      await this.dbOps.updateUserWithOperators(user._id, updateData);

      // Fetch the updated user
      const updatedUser = await this.dbOps.findUserById(user._id);
      if (!updatedUser) {
        return { success: false, message: 'Failed to retrieve updated user' };
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Error handling existing user:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Internal server error',
      };
    }
  }

  private async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const updateData = {
      isActive: true,
      deactivatedAt: null,
      updatedAt: this.utilityService.createTimestamp(),
    };

    const result = await this.dbOps.updateUser(userId, updateData);

    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found' };
    }

    return { success: true, message: 'User reactivated successfully' };
  }
}

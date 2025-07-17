import { User } from '@/models/user';
import { UserDatabaseOperations } from './userDatabaseOperations';
import { UserUtilityService } from './userUtilityService';
import { UserIpBanService } from './userIpBanService';
import { encryptEmail, decryptEmail } from '@/utils/security';
import { emailService } from '@/services/emailService';

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
      if (!this.utilityService.isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
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

      const normalizedEmail = this.utilityService.normalizeEmail(email);
      const encryptedEmail = encryptEmail(normalizedEmail);
      const existingUser = await this.dbOps.findUserByEmail(encryptedEmail);

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
      await this.dbOps.insertAuthCode(
        this.utilityService.createAuthCode(normalizedEmail, code)
      );

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
    try {
      // Step 1: Validate the verification code
      const codeValidation = await this.validateVerificationCode(email, code);
      if (!codeValidation.valid) {
        return { success: false, message: codeValidation.message! };
      }

      // Step 2: Process user authentication
      const userResult = await this.processUserAuthentication(email, clientIp);
      if (!userResult.success) {
        return { success: false, message: userResult.message! };
      }

      // Step 3: Map user to response format
      const mappedUser = this.utilityService.mapUserToResponse(
        userResult.user!
      );

      // Step 4: Generate authentication token
      const token = this.utilityService.generateTokenForUser(mappedUser);

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
        const user = await this.getUserById(decoded.userId);
        if (!user) {
          return { shouldRefresh: false };
        }

        const newToken = this.utilityService.generateTokenForUser(user);
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
      const normalizedEmail = this.utilityService.normalizeEmail(email);
      const encryptedEmail = encryptEmail(normalizedEmail);
      const user = await this.dbOps.findUserByEmail(encryptedEmail);
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

  // Private methods
  private async validateVerificationCode(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const authCode = await this.dbOps.findValidAuthCode(email, code);
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

    let user = await this.dbOps.findUserByEmail(email);
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
      const username = await this.utilityService.generateUniqueUsername();
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
      const updatedUser = await this.dbOps.updateUserWithOperators(
        user._id,
        updateData
      );
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

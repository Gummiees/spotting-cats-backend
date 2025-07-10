import { Collection, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import {
  uniqueUsernameGenerator,
  adjectives,
  nouns,
} from 'unique-username-generator';
import { connectToMongo } from '@/utils/mongo';
import { emailService } from '@/services/emailService';
import { UserServiceInterface } from '@/services/interfaces/userServiceInterface';
import { User, UserSession, applyUserBusinessLogic } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';
import { generateAvatarForUsername } from '@/utils/avatar';
import { config } from '@/config';

export class UserDatabaseService implements UserServiceInterface {
  private usersCollection: Collection<any>;
  private authCodesCollection: Collection<any>;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly CODE_EXPIRES_IN: number; // minutes

  constructor() {
    this.usersCollection = null as any;
    this.authCodesCollection = null as any;
    this.JWT_SECRET =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = '7d'; // 7 days
    this.CODE_EXPIRES_IN = 10; // 10 minutes
    this.initializeCollections();
  }

  async sendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      const existingUser = await this.findUserByEmail(email);
      const code = this.generateVerificationCode();

      await this.invalidatePreviousCodes(email);
      await this.saveAuthCode(email, code);

      const emailSent = await emailService.sendVerificationCode(email, code);
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
    code: string
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
      const userResult = await this.processUserAuthentication(email);
      if (!userResult.success) {
        return { success: false, message: userResult.message! };
      }

      // Step 3: Map user to response format
      const mappedUser = this.mapUserToResponse(userResult.user!);

      // Step 4: Generate authentication token
      const token = this.createToken(
        mappedUser.id!,
        mappedUser.email,
        mappedUser.username
      );

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

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.usersCollection.findOne({
        _id: this.createObjectId(userId),
        isDeleted: false,
      });

      if (!user) return null;
      return this.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user || user.isDeleted) return null;
      return this.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.usersCollection.findOne({
        username: username,
        isDeleted: false,
      });

      if (!user) return null;
      return this.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const updateData = this.createUserUpdatePayload(updates);

      if (this.isValidUsername(updates.username)) {
        const username = updates.username;
        const usernameCheck = await this.handleUsernameUpdate(
          userId,
          username,
          true
        ); // Manual update
        if (!usernameCheck.success) {
          return { success: false, message: usernameCheck.message! };
        }

        updateData.username = username;
        updateData.usernameUpdatedAt = this.createTimestamp(); // Always set for manual updates
      }

      if (this.isValidEmailForUpdate(updates.email)) {
        const email = updates.email;
        const emailCheck = await this.handleEmailUpdate(userId, email);
        if (!emailCheck.success) {
          return { success: false, message: emailCheck.message! };
        }

        updateData.email = this.normalizeEmail(email);
        updateData.emailUpdatedAt = this.createTimestamp();
      }

      if (this.isValidAvatarUrl(updates.avatarUrl)) {
        const avatarUrl = updates.avatarUrl;
        const avatarCheck = await this.handleAvatarUpdate(userId, avatarUrl);
        if (!avatarCheck.success) {
          return { success: false, message: avatarCheck.message! };
        }

        updateData.avatarUrl = avatarUrl;
        updateData.avatarUpdatedAt = this.createTimestamp();
      }

      // Apply business logic to ensure data consistency
      const finalUpdateData = applyUserBusinessLogic(updateData);

      const result = await this.usersCollection.updateOne(
        { _id: this.createObjectId(userId) },
        { $set: finalUpdateData }
      );

      if (result.matchedCount === 0) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isActive: false });
  }

  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isActive: true });
  }

  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isDeleted: true });
  }

  async cleanupExpiredCodes(): Promise<void> {
    try {
      await this.authCodesCollection.deleteMany({
        expiresAt: { $lt: this.createTimestamp() },
      });
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }

  async ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }> {
    try {
      // Find all users without avatars
      const usersWithoutAvatars = await this.usersCollection
        .find({
          $or: [
            { avatarUrl: { $exists: false } },
            { avatarUrl: null },
            { avatarUrl: '' },
          ],
          isDeleted: false,
        })
        .toArray();

      if (usersWithoutAvatars.length === 0) {
        return {
          success: true,
          message: 'All users already have avatars',
          updatedCount: 0,
        };
      }

      let updatedCount = 0;
      for (const user of usersWithoutAvatars) {
        try {
          const avatarUrl = generateAvatarForUsername(user.username);
          await this.usersCollection.updateOne(
            { _id: user._id },
            {
              $set: {
                avatarUrl,
                avatarUpdatedAt: this.createTimestamp(),
                updatedAt: this.createTimestamp(),
              },
            }
          );
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update avatar for user ${user._id}:`, error);
        }
      }

      return {
        success: true,
        message: `Successfully updated avatars for ${updatedCount} users`,
        updatedCount,
      };
    } catch (error) {
      console.error('Error ensuring all users have avatars:', error);
      return {
        success: false,
        message: 'Failed to update user avatars',
      };
    }
  }

  public verifyToken(token: string): UserSession | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as UserSession;
    } catch (error) {
      return null;
    }
  }

  private async findUserByEmail(email: string): Promise<any> {
    const normalizedEmail = this.normalizeEmail(email);
    return await this.usersCollection.findOne({
      email: normalizedEmail,
    });
  }

  private async findValidAuthCode(email: string, code: string): Promise<any> {
    const normalizedEmail = this.normalizeEmail(email);
    return await this.authCodesCollection.findOne({
      email: normalizedEmail,
      code,
      used: false,
      expiresAt: { $gt: this.createTimestamp() },
    });
  }

  private async createNewUser(email: string): Promise<any> {
    const newUser = await this.createUserData(email);
    const result = await this.usersCollection.insertOne(newUser);
    return { ...newUser, _id: result.insertedId };
  }

  private async updateExistingUser(userId: ObjectId): Promise<any> {
    const updateData = this.createUserUpdateData();

    await this.usersCollection.updateOne({ _id: userId }, { $set: updateData });

    const updatedUser = await this.usersCollection.findOne({ _id: userId });
    return {
      ...updatedUser,
      ...updateData,
    };
  }

  private async handleUsernameUpdate(
    userId: string,
    username: string,
    isManualUpdate: boolean = true
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Only check eligibility for manual updates, not for generated usernames
    if (isManualUpdate) {
      const eligibility = await this.checkUsernameUpdateEligibility(
        currentUser
      );
      if (!eligibility.eligible) {
        return {
          success: false,
          message: `Username can only be updated once every 30 days. You can update it again in ${eligibility.daysRemaining} days.`,
        };
      }
    }

    const isAvailable = await this.checkUsernameAvailability(username, userId);
    if (!isAvailable) {
      return { success: false, message: 'Username is already taken' };
    }

    return { success: true };
  }

  private async invalidatePreviousCodes(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    await this.authCodesCollection.updateMany(
      { email: normalizedEmail },
      { $set: { used: true } }
    );
  }

  private async saveAuthCode(email: string, code: string): Promise<void> {
    const expiresAt = this.calculateExpirationTime(this.CODE_EXPIRES_IN);
    const normalizedEmail = this.normalizeEmail(email);
    const timestamp = this.createTimestamp();

    const authCode = {
      email: normalizedEmail,
      code,
      expiresAt,
      used: false,
      createdAt: timestamp,
    };

    await this.authCodesCollection.insertOne(authCode);
  }

  private async markCodeAsUsed(authCodeId: ObjectId): Promise<void> {
    await this.authCodesCollection.updateOne(
      { _id: authCodeId },
      { $set: { used: true } }
    );
  }

  private async createUserData(email: string): Promise<any> {
    const timestamp = this.createTimestamp();
    const username = await this.generateUniqueUsername();
    const avatarUrl = generateAvatarForUsername(username);
    const normalizedEmail = this.normalizeEmail(email);

    // Check if email is in admin whitelist
    const isAdmin = config.admin.emailWhitelist.includes(normalizedEmail);

    const userData = {
      email: normalizedEmail,
      username,
      avatarUrl,
      isAdmin,
      isVerified: true,
      isActive: true,
      isDeleted: false,
      isBanned: false,
      lastLoginAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Apply business logic to ensure data consistency
    return applyUserBusinessLogic(userData);
  }

  private createUserUpdateData(): any {
    const updateData = {
      isVerified: true,
      lastLoginAt: this.createTimestamp(),
      updatedAt: this.createTimestamp(),
    };

    // Apply business logic to ensure data consistency
    return applyUserBusinessLogic(updateData);
  }

  private createUserUpdatePayload(updates: UserUpdateRequest): any {
    const updateData: any = { updatedAt: this.createTimestamp() };

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
      updateData.deactivatedAt = updates.isActive
        ? null
        : this.createTimestamp();
    }

    if (updates.isDeleted !== undefined) {
      updateData.isDeleted = updates.isDeleted;
      updateData.deletedAt = updates.isDeleted ? this.createTimestamp() : null;
    }

    if (updates.isBanned !== undefined) {
      updateData.isBanned = updates.isBanned;
      updateData.bannedAt = updates.isBanned ? this.createTimestamp() : null;

      // Handle ban reason
      if (updates.isBanned && updates.banReason) {
        updateData.banReason = updates.banReason;
      } else if (!updates.isBanned) {
        updateData.banReason = null; // Clear ban reason when unbanning
      }
    }

    // Handle standalone banReason updates (for cases where only banReason is being updated)
    if (updates.banReason !== undefined && updates.isBanned !== false) {
      updateData.banReason = updates.banReason;
    }

    // Apply business logic to ensure data consistency
    return applyUserBusinessLogic(updateData);
  }

  private async checkUsernameUpdateEligibility(
    user: User
  ): Promise<{ eligible: boolean; daysRemaining?: number }> {
    if (!user.usernameUpdatedAt) {
      return { eligible: true };
    }

    const daysSinceUpdate = this.calculateDaysSince(user.usernameUpdatedAt);

    if (daysSinceUpdate >= 30) {
      return { eligible: true };
    }

    return {
      eligible: false,
      daysRemaining: 30 - daysSinceUpdate,
    };
  }

  private async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const query = this.buildUsernameQuery(username, excludeUserId);
    const existingUser = await this.usersCollection.findOne(query);
    return !existingUser;
  }

  private async handleEmailUpdate(
    userId: string,
    email: string
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const eligibility = await this.checkEmailUpdateEligibility(currentUser);
    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Email can only be updated once every 90 days. You can update it again in ${eligibility.daysRemaining} days.`,
      };
    }

    const isAvailable = await this.checkEmailAvailability(email, userId);
    if (!isAvailable) {
      return { success: false, message: 'Email is already in use' };
    }

    return { success: true };
  }

  private async handleAvatarUpdate(
    userId: string,
    avatarUrl: string
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const eligibility = await this.checkAvatarUpdateEligibility(currentUser);
    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Avatar can only be updated once every 30 days. You can update it again in ${eligibility.daysRemaining} days.`,
      };
    }

    return { success: true };
  }

  private async checkEmailUpdateEligibility(
    user: User
  ): Promise<{ eligible: boolean; daysRemaining?: number }> {
    if (!user.emailUpdatedAt) {
      return { eligible: true };
    }

    const daysSinceUpdate = this.calculateDaysSince(user.emailUpdatedAt);

    if (daysSinceUpdate >= 90) {
      return { eligible: true };
    }

    return {
      eligible: false,
      daysRemaining: 90 - daysSinceUpdate,
    };
  }

  private async checkAvatarUpdateEligibility(
    user: User
  ): Promise<{ eligible: boolean; daysRemaining?: number }> {
    if (!user.avatarUpdatedAt) {
      return { eligible: true };
    }

    const daysSinceUpdate = this.calculateDaysSince(user.avatarUpdatedAt);

    if (daysSinceUpdate >= 30) {
      return { eligible: true };
    }

    return {
      eligible: false,
      daysRemaining: 30 - daysSinceUpdate,
    };
  }

  private async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const normalizedEmail = this.normalizeEmail(email);
    const query: any = {
      email: normalizedEmail,
      isDeleted: false,
    };

    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }

    const existingUser = await this.usersCollection.findOne(query);
    return !existingUser;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase();
  }

  private createTimestamp(): Date {
    return new Date();
  }

  private calculateExpirationTime(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private calculateDaysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private createObjectId(id: string): ObjectId {
    return new ObjectId(id);
  }

  private mapUserToResponse(user: any): User {
    return {
      id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      isBanned: user.isBanned || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deactivatedAt: user.deactivatedAt,
      deletedAt: user.deletedAt,
      bannedAt: user.bannedAt,
      username: user.username,
      usernameUpdatedAt: user.usernameUpdatedAt,
      emailUpdatedAt: user.emailUpdatedAt,
      avatarUrl: user.avatarUrl,
      avatarUpdatedAt: user.avatarUpdatedAt,
      isAdmin: user.isAdmin || false,
      banReason: user.banReason,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isValidUsername(username: string | undefined): username is string {
    return (
      username !== undefined && username !== null && username.trim() !== ''
    );
  }

  private isValidEmailForUpdate(email: string | undefined): email is string {
    return email !== undefined && email !== null && email.trim() !== '';
  }

  private isValidAvatarUrl(avatarUrl: string | undefined): avatarUrl is string {
    return (
      avatarUrl !== undefined && avatarUrl !== null && avatarUrl.trim() !== ''
    );
  }

  private createToken(userId: string, email: string, username: string): string {
    const payload = {
      userId,
      email,
      username,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as any);
  }

  private buildUsernameQuery(username: string, excludeUserId?: string): any {
    const query: any = {
      username,
      isDeleted: false,
    };

    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }

    return query;
  }

  /**
   * Validates the verification code for the given email
   */
  private async validateVerificationCode(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const authCode = await this.findValidAuthCode(email, code);
    if (!authCode) {
      return {
        valid: false,
        message: 'Invalid or expired verification code',
      };
    }

    await this.markCodeAsUsed(authCode._id);
    return { valid: true };
  }

  /**
   * Processes user authentication, handling new users, reactivation, and existing users
   */
  private async processUserAuthentication(email: string): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    isNewUser?: boolean;
  }> {
    let user = await this.findUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const newUserResult = await this.handleNewUserCreation(email);
      if (!newUserResult.success) {
        return { success: false, message: newUserResult.message };
      }
      user = newUserResult.user!;
      isNewUser = true;
    } else {
      // Handle existing user
      const existingUserResult = await this.handleExistingUser(user);
      if (!existingUserResult.success) {
        return { success: false, message: existingUserResult.message };
      }
      user = existingUserResult.user!;
    }

    return { success: true, user, isNewUser };
  }

  /**
   * Handles the creation of a new user
   */
  private async handleNewUserCreation(email: string): Promise<{
    success: boolean;
    message?: string;
    user?: any;
  }> {
    try {
      const user = await this.createNewUser(email);
      await emailService.sendWelcomeEmail(email);
      return { success: true, user };
    } catch (error) {
      console.error('Error creating new user:', error);
      return { success: false, message: 'Failed to create new user' };
    }
  }

  /**
   * Handles authentication for existing users, including reactivation logic
   */
  private async handleExistingUser(user: any): Promise<{
    success: boolean;
    message?: string;
    user?: any;
  }> {
    try {
      // Check if user is deleted
      if (user.isDeleted) {
        throw new Error(
          'Account has been permanently deleted and cannot be restored'
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
      const updatedUser = await this.updateExistingUser(user._id);
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

  /**
   * Generates a unique username using the unique-username-generator library
   */
  private async generateUniqueUsername(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const username = uniqueUsernameGenerator({
        dictionaries: [adjectives, nouns],
        separator: '',
        length: 12,
        style: 'lowerCase',
      });

      // Check if username is available
      const isAvailable = await this.checkUsernameAvailability(username);
      if (isAvailable) {
        return username;
      }

      attempts++;
    }

    // If we can't find a unique username after max attempts, add a random number
    const baseUsername = uniqueUsernameGenerator({
      dictionaries: [adjectives, nouns],
      separator: '',
      length: 8,
      style: 'lowerCase',
    });
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseUsername}${randomSuffix}`;
  }

  private async initializeCollections(): Promise<void> {
    try {
      const db = await connectToMongo();
      this.usersCollection = db.collection('users');
      this.authCodesCollection = db.collection('auth_codes');
    } catch (error) {
      console.error('Failed to initialize collections:', error);
    }
  }
}

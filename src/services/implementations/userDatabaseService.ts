import { Collection, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { connectToMongo } from '@/utils/mongo';
import { emailService } from '@/services/emailService';
import { UserServiceInterface } from '@/services/interfaces/userServiceInterface';
import { User, UserSession } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';

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
      const authCode = await this.findValidAuthCode(email, code);
      if (!authCode) {
        return {
          success: false,
          message: 'Invalid or expired verification code',
        };
      }

      await this.markCodeAsUsed(authCode._id);

      let user = await this.findUserByEmail(email);
      let isNewUser = false;

      if (!user) {
        user = await this.createNewUser(email);
        isNewUser = true;
        await emailService.sendWelcomeEmail(email);
      } else {
        if (!user.isActive) {
          return { success: false, message: 'Account is deactivated' };
        }
        user = await this.updateExistingUser(user._id);
      }

      const token = this.createToken(user._id.toString(), user.email);

      return {
        success: true,
        message: isNewUser
          ? 'Account created successfully'
          : 'Login successful',
        token,
        user: this.mapUserToResponse(user),
        isNewUser,
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
      if (!user) return null;
      return this.mapUserToResponse(user);
    } catch (error) {
      console.error('Error getting user by email:', error);
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
        const usernameCheck = await this.handleUsernameUpdate(userId, username);
        if (!usernameCheck.success) {
          return { success: false, message: usernameCheck.message! };
        }

        updateData.username = username;
        updateData.usernameUpdatedAt = this.createTimestamp();
      }

      const result = await this.usersCollection.updateOne(
        { _id: this.createObjectId(userId) },
        { $set: updateData }
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
      isDeleted: false,
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
    const newUser = this.createUserData(email);
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
    username: string
  ): Promise<{ success: boolean; message?: string }> {
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const eligibility = await this.checkUsernameUpdateEligibility(currentUser);
    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Username can only be updated once every 90 days. You can update it again in ${eligibility.daysRemaining} days.`,
      };
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

  private createUserData(email: string): any {
    const timestamp = this.createTimestamp();
    return {
      email: this.normalizeEmail(email),
      isVerified: true,
      isActive: true,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private createUserUpdateData(): any {
    return {
      isVerified: true,
      lastLoginAt: this.createTimestamp(),
      updatedAt: this.createTimestamp(),
    };
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

    return updateData;
  }

  private async checkUsernameUpdateEligibility(
    user: User
  ): Promise<{ eligible: boolean; daysRemaining?: number }> {
    if (!user.usernameUpdatedAt) {
      return { eligible: true };
    }

    const daysSinceUpdate = this.calculateDaysSince(user.usernameUpdatedAt);

    if (daysSinceUpdate >= 90) {
      return { eligible: true };
    }

    return {
      eligible: false,
      daysRemaining: 90 - daysSinceUpdate,
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
      _id: user._id.toString(),
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deactivatedAt: user.deactivatedAt,
      deletedAt: user.deletedAt,
      username: user.username,
      usernameUpdatedAt: user.usernameUpdatedAt,
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

  private createToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
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

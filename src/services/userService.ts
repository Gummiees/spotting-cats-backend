import { Collection, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { connectToMongo } from '@/utils/mongo';
import { emailService } from './emailService';
import { User, UserSession } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';

export class UserService {
  private usersCollection: Collection<any>;
  private authCodesCollection: Collection<any>;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly CODE_EXPIRES_IN: number; // minutes

  constructor() {
    // Initialize collections after MongoDB connection
    this.usersCollection = null as any;
    this.authCodesCollection = null as any;
    this.JWT_SECRET =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = '7d'; // 7 days
    this.CODE_EXPIRES_IN = 10; // 10 minutes
    this.initializeCollections();
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

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generate secure verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create JWT token
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

  // Verify JWT token
  public verifyToken(token: string): UserSession | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as UserSession;
    } catch (error) {
      return null;
    }
  }

  // Send verification code
  async sendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Check if user exists and is active
      const existingUser = await this.usersCollection.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      // Generate verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRES_IN * 60 * 1000);

      // Invalidate previous codes for this email
      await this.authCodesCollection.updateMany(
        { email: email.toLowerCase() },
        { $set: { used: true } }
      );

      // Save new verification code
      const authCode = {
        email: email.toLowerCase(),
        code,
        expiresAt,
        used: false,
        createdAt: new Date(),
      };

      await this.authCodesCollection.insertOne(authCode);

      // Send email
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

  // Verify code and create/login user
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
      // Find the verification code
      const authCode = await this.authCodesCollection.findOne({
        email: email.toLowerCase(),
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!authCode) {
        return {
          success: false,
          message: 'Invalid or expired verification code',
        };
      }

      // Mark code as used
      await this.authCodesCollection.updateOne(
        { _id: authCode._id },
        { $set: { used: true } }
      );

      // Find or create user
      let user = await this.usersCollection.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        const newUser = {
          email: email.toLowerCase(),
          isVerified: true,
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await this.usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
        isNewUser = true;

        // Send welcome email
        await emailService.sendWelcomeEmail(email);
      } else {
        // Update existing user
        if (!user.isActive) {
          return { success: false, message: 'Account is deactivated' };
        }

        await this.usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              isVerified: true,
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        user = {
          ...user,
          isVerified: true,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Generate JWT token
      const token = this.createToken(user._id.toString(), user.email);

      return {
        success: true,
        message: isNewUser
          ? 'Account created successfully'
          : 'Login successful',
        token,
        user: {
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
        },
        isNewUser,
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.usersCollection.findOne({
        _id: new ObjectId(userId),
        isDeleted: false,
      });

      if (!user) return null;

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
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.usersCollection.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (!user) return null;

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
      };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Update user
  async updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
        updateData.deactivatedAt = updates.isActive ? null : new Date();
      }

      if (updates.isDeleted !== undefined) {
        updateData.isDeleted = updates.isDeleted;
        updateData.deletedAt = updates.isDeleted ? new Date() : null;
      }

      if (updates.username !== undefined) {
        // Check if username update is allowed (90 days restriction)
        const currentUser = await this.getUserById(userId);
        if (!currentUser) {
          return { success: false, message: 'User not found' };
        }

        if (currentUser.usernameUpdatedAt) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - currentUser.usernameUpdatedAt.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysSinceUpdate < 90) {
            const daysRemaining = 90 - daysSinceUpdate;
            return {
              success: false,
              message: `Username can only be updated once every 90 days. You can update it again in ${daysRemaining} days.`,
            };
          }
        }

        // Check if username is already taken
        const existingUser = await this.usersCollection.findOne({
          username: updates.username,
          _id: { $ne: new ObjectId(userId) },
          isDeleted: false,
        });

        if (existingUser) {
          return { success: false, message: 'Username is already taken' };
        }

        updateData.username = updates.username;
        updateData.usernameUpdatedAt = new Date();
      }

      const result = await this.usersCollection.updateOne(
        { _id: new ObjectId(userId) },
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

  // Deactivate user
  async deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isActive: false });
  }

  // Reactivate user
  async reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isActive: true });
  }

  // Soft delete user
  async deleteUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { isDeleted: true });
  }

  // Clean up expired codes (should be called by a cron job)
  async cleanupExpiredCodes(): Promise<void> {
    try {
      await this.authCodesCollection.deleteMany({
        expiresAt: { $lt: new Date() },
      });
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
}

export const userService = new UserService();

import jwt from 'jsonwebtoken';
import {
  uniqueUsernameGenerator,
  adjectives,
  nouns,
} from 'unique-username-generator';
import {
  User,
  UserSession,
  applyUserBusinessLogic,
  PublicUser,
} from '@/models/user';
import { generateAvatarForUsername } from '@/utils/avatar';
import { config } from '@/config';

export class UserUtilityService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly CODE_EXPIRES_IN: number; // minutes

  constructor() {
    this.JWT_SECRET =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = '7d'; // 7 days
    this.CODE_EXPIRES_IN = 10; // 10 minutes
  }

  // Validation methods
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUsername(username: string | undefined): username is string {
    return (
      username !== undefined && username !== null && username.trim() !== ''
    );
  }

  isValidEmailForUpdate(email: string | undefined): email is string {
    return email !== undefined && email !== null && email.trim() !== '';
  }

  isValidAvatarUrl(avatarUrl: string | undefined): avatarUrl is string {
    return (
      avatarUrl !== undefined && avatarUrl !== null && avatarUrl.trim() !== ''
    );
  }

  // Generation methods
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateAvatarForUsername(username: string): string {
    return generateAvatarForUsername(username);
  }

  async generateUniqueUsername(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const username = uniqueUsernameGenerator({
        dictionaries: [adjectives, nouns],
        separator: '',
        length: 12,
        style: 'lowerCase',
      });

      // Note: This would need to be injected or passed as a dependency
      // For now, we'll assume it's available
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

  // Token methods
  generateTokenForUser(user: User): string {
    return this.createToken(user.id!, user.email, user.username, user.role);
  }

  createToken(
    userId: string,
    email: string,
    username: string,
    role: 'user' | 'moderator' | 'admin' | 'superadmin' = 'user'
  ): string {
    const payload = {
      userId,
      email,
      username,
      role,
      iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as any);
  }

  verifyToken(token: string): UserSession | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as UserSession;
    } catch (error) {
      return null;
    }
  }

  getRefreshThreshold(): number {
    // Allow override via environment variable for testing
    const envThreshold = process.env.TOKEN_REFRESH_THRESHOLD;
    if (envThreshold) {
      return parseInt(envThreshold, 10);
    }
    return 24 * 60 * 60; // 24 hours in seconds
  }

  // Mapping methods
  mapUserToResponse(user: any): User {
    return {
      id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
      isBanned: user.isBanned || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deactivatedAt: user.deactivatedAt,
      bannedAt: user.bannedAt,
      username: user.username,
      usernameUpdatedAt: user.usernameUpdatedAt,
      emailUpdatedAt: user.emailUpdatedAt,
      avatarUrl: user.avatarUrl,
      avatarUpdatedAt: user.avatarUpdatedAt,
      role: user.role || 'user',
      banReason: user.banReason,
      bannedBy: user.bannedBy,
      roleUpdatedAt: user.roleUpdatedAt,
      roleUpdatedBy: user.roleUpdatedBy,
    };
  }

  mapUserToPublicResponse(user: any): PublicUser {
    return {
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role || 'user',
      isActive: user.isActive,
      isBanned: user.isBanned || false,
      banReason: user.banReason,
      bannedBy: user.bannedBy,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailUpdatedAt: user.emailUpdatedAt,
      usernameUpdatedAt: user.usernameUpdatedAt,
      avatarUpdatedAt: user.avatarUpdatedAt,
      deactivatedAt: user.deactivatedAt,
      bannedAt: user.bannedAt,
      roleUpdatedAt: user.roleUpdatedAt,
      roleUpdatedBy: user.roleUpdatedBy,
    };
  }

  mapUserToResponseWithPrivileges(
    user: any,
    includePrivilegedData: boolean = false
  ): User {
    const mappedUser = this.mapUserToResponse(user);

    // Include IP addresses and last IP address only for privileged users
    if (includePrivilegedData) {
      if (user.ipAddresses) {
        mappedUser.ipAddresses = user.ipAddresses;
      }
      if (user.lastIpAddress) {
        mappedUser.lastIpAddress = user.lastIpAddress;
      }
    }

    return mappedUser;
  }

  // Data creation methods
  createUserData(email: string, clientIp?: string, username?: string): any {
    const timestamp = this.createTimestamp();
    const finalUsername = username || 'temp_username'; // Will be replaced by actual generation
    const avatarUrl = generateAvatarForUsername(finalUsername);
    const normalizedEmail = this.normalizeEmail(email);

    // Determine user role based on email whitelists
    let role: 'user' | 'moderator' | 'admin' | 'superadmin' = 'user';
    if (config.admin.superadminEmailWhitelist.includes(normalizedEmail)) {
      role = 'superadmin';
    } else if (config.admin.emailWhitelist.includes(normalizedEmail)) {
      role = 'admin';
    }

    // Initialize IP addresses array with current IP if provided
    const ipAddresses = clientIp ? [clientIp] : [];

    const userData = {
      email: normalizedEmail,
      username: finalUsername,
      avatarUrl,
      role,
      isVerified: true,
      isActive: true,
      isBanned: false,
      lastLoginAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      ipAddresses,
      lastIpAddress: clientIp || null,
    };

    // Apply business logic to ensure data consistency
    return applyUserBusinessLogic(userData);
  }

  createUserUpdateData(clientIp?: string): any {
    const updateData: any = {
      isVerified: true,
      lastLoginAt: this.createTimestamp(),
      updatedAt: this.createTimestamp(),
    };

    // Apply business logic to ensure data consistency for regular fields
    const processedData: any = applyUserBusinessLogic(updateData);

    // Add IP address to the array if provided and not already present
    if (clientIp) {
      // Use $addToSet to add IP address only if it's not already in the array
      processedData.$addToSet = { ipAddresses: clientIp };
      // Update the last IP address
      processedData.lastIpAddress = clientIp;
    }

    return processedData;
  }

  createUserUpdatePayload(updates: any): any {
    const updateData: any = { updatedAt: this.createTimestamp() };

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
      updateData.deactivatedAt = updates.isActive
        ? null
        : this.createTimestamp();
    }

    if (updates.isBanned !== undefined) {
      updateData.isBanned = updates.isBanned;
      updateData.bannedAt = updates.isBanned ? this.createTimestamp() : null;

      if (updates.isBanned) {
        if (updates.banReason) {
          updateData.banReason = updates.banReason;
        }
        if (updates.bannedBy) {
          updateData.bannedBy = updates.bannedBy;
        }
      } else {
        updateData.banReason = null;
        updateData.bannedBy = null;
      }
    }

    // Handle standalone banReason updates (for cases where only banReason is being updated)
    if (updates.banReason !== undefined && updates.isBanned !== false) {
      updateData.banReason = updates.banReason;
    }

    // Handle standalone bannedBy updates
    if (updates.bannedBy !== undefined) {
      updateData.bannedBy = updates.bannedBy;
    }

    // Apply business logic to ensure data consistency
    return applyUserBusinessLogic(updateData);
  }

  // Auth code creation methods
  createAuthCode(email: string, code: string): any {
    const expiresAt = this.calculateExpirationTime(this.CODE_EXPIRES_IN);
    const normalizedEmail = this.normalizeEmail(email);
    const timestamp = this.createTimestamp();

    return {
      email: normalizedEmail,
      code,
      expiresAt,
      used: false,
      createdAt: timestamp,
    };
  }

  createEmailChangeRequest(
    userId: string,
    newEmail: string,
    code: string
  ): any {
    const expiresAt = this.calculateExpirationTime(this.CODE_EXPIRES_IN);
    const timestamp = this.createTimestamp();

    return {
      userId,
      newEmail,
      code,
      expiresAt,
      used: false,
      createdAt: timestamp,
    };
  }

  // Utility methods
  normalizeEmail(email: string): string {
    return email.toLowerCase();
  }

  createTimestamp(): Date {
    return new Date();
  }

  calculateExpirationTime(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  calculateDaysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  getCutoffDate(retentionDays: number): Date {
    return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  }

  // Eligibility checks
  checkUsernameUpdateEligibility(user: User): {
    eligible: boolean;
    daysRemaining?: number;
  } {
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

  checkEmailUpdateEligibility(user: User): {
    eligible: boolean;
    daysRemaining?: number;
  } {
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

  checkAvatarUpdateEligibility(user: User): {
    eligible: boolean;
    daysRemaining?: number;
  } {
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
}

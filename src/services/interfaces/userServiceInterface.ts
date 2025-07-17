import { User, UserSession, UserRole, PublicUser } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';

export interface UserServiceInterface {
  // Authentication methods
  sendVerificationCode(
    email: string,
    clientIp?: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }>;
  verifyCodeAndAuthenticate(
    email: string,
    code: string,
    clientIp?: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    isNewUser?: boolean;
  }>;
  verifyToken(token: string): UserSession | null;
  refreshTokenIfNeeded(
    token: string
  ): Promise<{ shouldRefresh: boolean; newToken?: string }>;

  // Email change methods
  initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string; errorCode?: string }>;
  verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }>;

  // User management methods
  getUserById(userId: string): Promise<User | null>;
  getUserByIdWithResolvedUsernames(userId: string): Promise<User | null>;
  getUserByIdWithPrivileges(
    userId: string,
    includePrivilegedData: boolean
  ): Promise<User | null>;
  getUserByIdPublic(userId: string): Promise<PublicUser | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByUsernameWithResolvedUsernames(
    username: string
  ): Promise<User | null>;
  getUserByUsernameWithPrivileges(
    username: string,
    includePrivilegedData: boolean
  ): Promise<User | null>;
  getUserByUsernamePublic(username: string): Promise<PublicUser | null>;
  updateUser(
    userId: string,
    updates: UserUpdateRequest
  ): Promise<{ success: boolean; message: string; token?: string }>;
  deactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }>;
  reactivateUser(
    userId: string
  ): Promise<{ success: boolean; message: string }>;
  deleteUser(userId: string): Promise<{ success: boolean; message: string }>;

  // Role management methods
  updateUserRole(
    userId: string,
    newRole: UserRole,
    updatedByUserId: string
  ): Promise<{ success: boolean; message: string; token?: string }>;
  getAllUsers(): Promise<{ success: boolean; users: User[]; message: string }>;
  getAllUsersWithPrivileges(
    includePrivilegedData: boolean
  ): Promise<{ success: boolean; users: User[]; message: string }>;
  getAllUsersPublic(): Promise<{
    success: boolean;
    users: PublicUser[];
    message: string;
  }>;

  // Utility methods
  cleanupExpiredCodes(): Promise<void>;
  ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }>;

  // Validation methods
  checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }>;
  checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; message: string }>;

  // Cleanup methods for deactivated users
  cleanupOldDeactivatedUsers(retentionDays: number): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }>;
  getDeactivatedUserStats(retentionDays: number): Promise<{
    totalDeactivated: number;
    oldDeactivated: number;
  }>;

  // IP banning methods
  banUsersByIp(
    username: string,
    reason: string,
    bannedByUserId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      targetUser: User;
      affectedUsers: User[];
      protectedUsers?: User[]; // Users protected by role hierarchy
      bannedIps: string[];
      totalBanned: number;
    };
  }>;
  unbanUsersByIp(
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
    };
  }>;
  checkIpBanned(ipAddress: string): Promise<{
    banned: boolean;
    reason?: string;
    bannedBy?: string;
    bannedAt?: Date;
  }>;
}

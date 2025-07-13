import { User, UserSession } from '@/models/user';
import { UserUpdateRequest } from '@/models/requests';

export interface UserServiceInterface {
  // Authentication methods
  sendVerificationCode(
    email: string
  ): Promise<{ success: boolean; message: string }>;
  verifyCodeAndAuthenticate(
    email: string,
    code: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    isNewUser?: boolean;
  }>;
  verifyToken(token: string): UserSession | null;

  // Email change methods
  initiateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; message: string }>;
  verifyEmailChange(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; token?: string }>;

  // User management methods
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
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

  // Utility methods
  cleanupExpiredCodes(): Promise<void>;
  ensureAllUsersHaveAvatars(): Promise<{
    success: boolean;
    message: string;
    updatedCount?: number;
  }>;

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
}

import { Request } from 'express';
import { UserSession, UserRole } from './user';

export interface AuthRequest extends Request {
  user?: UserSession;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface CodeVerificationRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  code: string;
}

// General user update request (for admin use - should be used sparingly)
export interface UserUpdateRequest {
  email?: string;
  username?: string;
  avatarUrl?: string;
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedBy?: string;
  role?: UserRole;
}

// Specific endpoint request body interfaces
export interface UsernameUpdateRequest {
  username: string;
}

export interface EmailUpdateRequest {
  email: string;
}

export interface EmailChangeVerificationRequest {
  code: string;
}

export interface AvatarUpdateRequest {
  avatarUrl: string;
}

export interface BanUserRequest {
  username: string;
  reason: string;
}

export interface UpdateUserRoleRequest {
  username: string;
  role: UserRole;
}

export interface DeactivateUserRequest {}

export interface DeleteUserRequest {}

export interface BanIpRequest {
  username: string;
  reason: string;
}

export interface UnbanIpRequest {
  username: string;
}

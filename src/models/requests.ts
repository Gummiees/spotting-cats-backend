import { Request } from 'express';
import { UserSession } from './user';

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

export interface UserUpdateRequest {
  isActive?: boolean;
  isDeleted?: boolean;
  isBanned?: boolean;
  username?: string;
}

import { ObjectId } from 'mongodb';
import { NoteResponse } from './note';

export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

export type BanType = 'manual' | 'ip' | 'automatic';

export interface User {
  id?: string;
  username: string;
  avatarUrl: string;
  role: UserRole;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  banType?: BanType; // Type of ban: manual, ip, or automatic
  bannedBy?: string; // ID of the user who banned them (in database) or username (when returned to frontend)
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  emailUpdatedAt?: Date;
  usernameUpdatedAt?: Date;
  avatarUpdatedAt?: Date;
  deactivatedAt?: Date;
  bannedAt?: Date;
  roleUpdatedAt?: Date;
  roleUpdatedBy?: string; // ID of the user who updated the role (in database) or username (when returned to frontend)
  ipAddresses?: string[]; // Array of IP addresses used for authentication
}

export interface CreateUser {
  username: string;
  avatarUrl: string;
  role?: UserRole;
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string;
  banType?: BanType;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  emailUpdatedAt?: Date;
  usernameUpdatedAt?: Date;
  avatarUpdatedAt?: Date;
  deactivatedAt?: Date;
  bannedAt?: Date;
  roleUpdatedAt?: Date;
  roleUpdatedBy?: string;
  ipAddresses?: string[];
}

export interface UserWithObjectId extends Omit<User, 'id'> {
  _id: ObjectId;
}

export interface UserDocument extends Omit<User, 'id'> {
  _id: ObjectId;
  email: string;
  emailHash?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface BasicUser {
  username: string;
  avatarUrl: string;
  role: UserRole;
  isInactive: boolean;
  isBanned: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  emailUpdatedAt?: Date;
  usernameUpdatedAt?: Date;
  avatarUpdatedAt?: Date;
}

export interface AdminUserResponse extends BasicUser {
  banType?: BanType;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: Date;
  roleUpdatedBy?: string;
  roleUpdatedAt?: Date;
  deactivatedAt?: Date;
  notes: NoteResponse[];
}

export function applyUserBusinessLogic(user: Partial<User>): Partial<User> {
  const updatedUser = { ...user };

  if (updatedUser.isBanned) {
    updatedUser.isActive = false;
    updatedUser.role = 'user';
  }

  return updatedUser;
}

export function createUserWithDefaults(
  userData: Partial<CreateUser>
): CreateUser {
  const createdAt = userData.createdAt ?? new Date();
  return {
    ...userData,
    username: userData.username!,
    avatarUrl: userData.avatarUrl!,
    role: userData.role ?? 'user',
    isActive: userData.isActive ?? false,
    isBanned: userData.isBanned ?? false,
    createdAt,
    lastLoginAt: userData.lastLoginAt ?? createdAt,
  };
}

// Role hierarchy and permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
};

export function hasRolePermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageRole(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  // Superadmins can manage all roles except other superadmins
  if (managerRole === 'superadmin') {
    return targetRole !== 'superadmin';
  }

  // Admins can manage moderators and users
  if (managerRole === 'admin') {
    return targetRole === 'moderator' || targetRole === 'user';
  }

  // Moderators can only manage users
  if (managerRole === 'moderator') {
    return targetRole === 'user';
  }

  return false;
}

export function canBanUser(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  // Superadmins can ban everyone except other superadmins
  if (managerRole === 'superadmin') {
    return targetRole !== 'superadmin';
  }

  // Admins can ban moderators and users
  if (managerRole === 'admin') {
    return targetRole === 'moderator' || targetRole === 'user';
  }

  // Moderators can only ban users
  if (managerRole === 'moderator') {
    return targetRole === 'user';
  }

  return false;
}

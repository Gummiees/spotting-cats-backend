import { ObjectId } from 'mongodb';

export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

export interface User {
  id?: string;
  email: string;
  username: string;
  avatarUrl: string;
  role: UserRole;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
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
}

export interface CreateUser {
  email: string;
  username: string;
  avatarUrl: string;
  role?: UserRole;
  isActive?: boolean;
  isBanned?: boolean;
  banReason?: string;
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
}

export interface UserWithObjectId extends Omit<User, 'id'> {
  _id: ObjectId;
}

export interface UserDocument extends Omit<User, 'id'> {
  _id: ObjectId;
}

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface PublicUserByUsername {
  username: string;
  avatarUrl: string;
  role: UserRole;
  isInactive: boolean;
  isBanned: boolean;
  lastLoginAt: Date;
  createdAt: Date;
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
    email: userData.email!,
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

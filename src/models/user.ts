import { ObjectId } from 'mongodb';

export interface User {
  id?: string;
  email: string;
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  emailUpdatedAt?: Date;
  usernameUpdatedAt?: Date;
  avatarUpdatedAt?: Date;
  deactivatedAt?: Date;
  deletedAt?: Date;
  bannedAt?: Date;
}

export interface CreateUser {
  email: string;
  username: string;
  avatarUrl: string;
  isAdmin?: boolean;
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
  deletedAt?: Date;
  bannedAt?: Date;
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
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export interface PublicUserByUsername {
  username: string;
  avatarUrl: string;
  isAdmin: boolean;
  isInactive: boolean;
  isBanned: boolean;
  lastLoginAt: Date;
  createdAt: Date;
}

export function applyUserBusinessLogic(user: Partial<User>): Partial<User> {
  const updatedUser = { ...user };

  if (updatedUser.isBanned) {
    updatedUser.isActive = false;
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
    isAdmin: userData.isAdmin ?? false,
    isActive: userData.isActive ?? false,
    isBanned: userData.isBanned ?? false,
    createdAt,
    lastLoginAt: userData.lastLoginAt ?? createdAt,
  };
}

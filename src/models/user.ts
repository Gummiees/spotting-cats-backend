import { ObjectId } from 'mongodb';

// Core User Interface
export interface User {
  _id?: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isActive: boolean;
  isBanned: boolean;
  isDeleted: boolean;
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

// User creation interface with default values
export interface CreateUser {
  email: string;
  username?: string;
  avatarUrl?: string;
  isAdmin?: boolean; // defaults to false
  isActive?: boolean; // defaults to false
  isBanned?: boolean; // defaults to false
  isDeleted?: boolean; // defaults to false
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

// User with ObjectId for MongoDB operations
export interface UserWithObjectId extends Omit<User, '_id'> {
  _id: ObjectId;
}

// MongoDB Document Interfaces
export interface UserDocument extends Omit<User, '_id'> {
  _id: ObjectId;
}

// Request/Response Interfaces
export interface UserSession {
  userId: string;
  email: string;
  username?: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

// Helper function to apply business logic for user state
export function applyUserBusinessLogic(user: Partial<User>): Partial<User> {
  const updatedUser = { ...user };

  // Business logic: if user is banned or deleted, they should not be active
  if (updatedUser.isBanned || updatedUser.isDeleted) {
    updatedUser.isActive = false;
  }

  return updatedUser;
}

// Helper function to create a new user with default values
export function createUserWithDefaults(
  userData: Partial<CreateUser>
): CreateUser {
  return {
    ...userData,
    email: userData.email!,
    isAdmin: userData.isAdmin ?? false,
    isActive: userData.isActive ?? false,
    isBanned: userData.isBanned ?? false,
    isDeleted: userData.isDeleted ?? false,
    createdAt: userData.createdAt ?? new Date(),
  };
}

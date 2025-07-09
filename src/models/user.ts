import { ObjectId } from 'mongodb';

// Core User Interface
export interface User {
  _id?: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deactivatedAt?: Date;
  deletedAt?: Date;
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
  iat: number;
  exp: number;
}

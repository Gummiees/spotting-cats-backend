import { ObjectId } from 'mongodb';

export interface AuthCode {
  _id?: string;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface AuthCodeDocument extends Omit<AuthCode, '_id'> {
  _id: ObjectId;
}

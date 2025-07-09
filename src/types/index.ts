import { NextFunction, Request, Response } from 'express';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  details?: any;
}

// Controller types
export interface Controller {
  [key: string]: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>;
}

// Service types
export interface Service {
  [key: string]: (...args: any[]) => any | Promise<any>;
}

// Middleware types
export interface Middleware {
  (req: Request, res: Response, next: NextFunction): void | Promise<void>;
}

// Health check types
export interface HealthStatus {
  status: 'OK' | 'ERROR';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

// Hello World types
export interface HelloResponse {
  message: string;
  timestamp: string;
  status: 'success';
}

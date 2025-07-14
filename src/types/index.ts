import { NextFunction, Request, Response } from 'express';

// API Response types
export interface ApiResponse<T = Record<string, unknown>> {
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
  details?: Record<string, unknown>;
}

// Controller types
export interface Controller {
  [key: string]: (
    _req: Request,
    _res: Response,
    _next: NextFunction
  ) => void | Promise<void>;
}

// Service types
export interface Service {
  [key: string]: (..._args: unknown[]) => unknown | Promise<unknown>;
}

// Middleware types
export interface Middleware {
  (_req: Request, _res: Response, _next: NextFunction): void | Promise<void>;
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

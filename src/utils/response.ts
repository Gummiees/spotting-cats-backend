import { ApiResponse, ErrorResponse } from '@/types';
import { Response } from 'express';

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message = 'An error occurred',
    error = 'Internal Server Error',
    statusCode = 500
  ): void {
    const response: ErrorResponse = {
      success: false,
      error,
      message,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  static notFound(res: Response, message = 'Resource not found'): void {
    this.error(res, message, 'Not Found', 404);
  }

  static badRequest(
    res: Response,
    message = 'Bad request',
    details?: Record<string, unknown>
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: 'Bad Request',
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    };

    res.status(400).json(response);
  }

  static forbidden(res: Response, message = 'Forbidden'): void {
    this.error(res, message, 'Forbidden', 403);
  }
}

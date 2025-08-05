import { ApiResponse, ErrorResponse } from '@/types';
import { Response } from 'express';

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
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
    message: string = 'An error occurred',
    error: string = 'Internal Server Error',
    statusCode: number = 500
  ): void {
    const response: ErrorResponse = {
      success: false,
      error,
      message,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  static notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, message, 'Not Found', 404);
  }

  static badRequest(
    res: Response,
    message: string = 'Bad request',
    details?: any
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

  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, message, 'Forbidden', 403);
  }

  static accountBanned(
    res: Response,
    message: string = 'Account has been banned'
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: 'Account Banned',
      message,
      timestamp: new Date().toISOString(),
      details: {
        errorCode: 'ACCOUNT_BANNED',
        canRetry: false,
      },
    };

    res.status(403).json(response);
  }

  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests',
    errorCode?: string
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: 'Too Many Requests',
      message,
      timestamp: new Date().toISOString(),
      details: {
        errorCode: errorCode || 'RATE_LIMITED',
        canRetry: true,
      },
    };

    res.status(429).json(response);
  }

  static disposableEmail(
    res: Response,
    message: string = 'Disposable email addresses are not allowed'
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: 'Disposable Email Not Allowed',
      message,
      timestamp: new Date().toISOString(),
      details: {
        errorCode: 'DISPOSABLE_EMAIL',
        canRetry: false,
      },
    };

    res.status(400).json(response);
  }

  static nsfwContentDetected(
    res: Response,
    message: string = 'NSFW content detected',
    invalidImages: string[] = [],
    errors: string[] = []
  ): void {
    const response: ErrorResponse = {
      success: false,
      error: 'NSFW Content Detected',
      message,
      timestamp: new Date().toISOString(),
      details: {
        errorCode: 'NSFW_CONTENT_DETECTED',
        canRetry: false,
        invalidImages,
        errors,
      },
    };

    res.status(400).json(response);
  }
}

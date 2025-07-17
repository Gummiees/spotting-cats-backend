import { ResponseUtil } from '@/utils/response';
import { NextFunction, Request, Response } from 'express';
import { config } from '@/config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const isProduction = config.nodeEnv === 'production';

  // Log error details for security monitoring
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode,
    errorName: error.name,
    errorMessage: error.message,
    stack: isProduction ? undefined : error.stack,
  };

  console.error('Error occurred:', errorLog);

  // In production, don't expose internal error details
  const message =
    isProduction && statusCode === 500
      ? 'Internal Server Error'
      : error.message || 'Internal Server Error';

  // Don't log stack traces in production
  if (!isProduction && error.stack) {
    console.error(error.stack);
  }

  ResponseUtil.error(res, message, error.name || 'Error', statusCode);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log 404 attempts for security monitoring
  console.log(
    `404 - ${req.method} ${req.originalUrl} - IP: ${
      req.ip || req.connection.remoteAddress
    }`
  );
  ResponseUtil.notFound(res, `Cannot ${req.method} ${req.originalUrl}`);
};

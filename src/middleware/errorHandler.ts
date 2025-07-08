import { ResponseUtil } from '@/utils/response';
import { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`Error ${statusCode}: ${message}`);
  console.error(error.stack);

  ResponseUtil.error(res, message, error.name || 'Error', statusCode);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  ResponseUtil.notFound(res, `Cannot ${req.method} ${req.originalUrl}`);
};

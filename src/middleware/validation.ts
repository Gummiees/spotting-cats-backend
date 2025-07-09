import {
  body,
  check,
  validationResult,
  ValidationChain,
} from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '@/utils/response';

// Validation result handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return ResponseUtil.badRequest(res, 'Validation failed', errorMessages);
  }
  next();
};

// Sanitize and validate ObjectId
export const validateObjectId = (paramName: string): ValidationChain => {
  return check(paramName).isMongoId().withMessage('Invalid ID format');
};

// Cat validation schemas
export const createCatValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Name contains invalid characters'),
  body('age')
    .isInt({ min: 0, max: 30 })
    .withMessage('Age must be a number between 0 and 30')
    .toInt(),
  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Breed must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Breed contains invalid characters'),
  handleValidationErrors,
];

export const updateCatValidation = [
  validateObjectId('id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Name contains invalid characters'),
  body('age')
    .optional()
    .isInt({ min: 0, max: 30 })
    .withMessage('Age must be a number between 0 and 30')
    .toInt(),
  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Breed must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Breed contains invalid characters'),
  handleValidationErrors,
];

export const getCatByIdValidation = [
  validateObjectId('id'),
  handleValidationErrors,
];

export const deleteCatValidation = [
  validateObjectId('id'),
  handleValidationErrors,
];

// Generic sanitization for query parameters
export const sanitizeQueryParams = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).trim();
      }
    });
  }
  next();
};

// Generic sanitization for request body
export const sanitizeRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

import {
  body,
  check,
  query,
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

// Cat validation schemas for FormData
export const createCatValidation = [
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
  body('xCoordinate')
    .isFloat({ min: -180, max: 180 })
    .withMessage('xCoordinate must be a number between -180 and 180')
    .toFloat(),
  body('yCoordinate')
    .isFloat({ min: -90, max: 90 })
    .withMessage('yCoordinate must be a number between -90 and 90')
    .toFloat(),
  body('isDomestic')
    .optional()
    .isBoolean()
    .withMessage('isDomestic must be a boolean'),
  body('isMale').optional().isBoolean().withMessage('isMale must be a boolean'),
  body('isSterilized')
    .optional()
    .isBoolean()
    .withMessage('isSterilized must be a boolean'),
  body('isFriendly')
    .optional()
    .isBoolean()
    .withMessage('isFriendly must be a boolean'),
  body('protectorId')
    .optional()
    .isMongoId()
    .withMessage('protectorId must be a valid MongoDB ID'),
  body('colonyId')
    .optional()
    .isMongoId()
    .withMessage('colonyId must be a valid MongoDB ID'),
  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Breed must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Breed contains invalid characters'),
  body('extraInfo')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('extraInfo must be less than 1000 characters'),
  handleValidationErrors,
];

export const updateCatValidation = [
  validateObjectId('id'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ID'),
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
  body('xCoordinate')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('xCoordinate must be a number between -180 and 180')
    .toFloat(),
  body('yCoordinate')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('yCoordinate must be a number between -90 and 90')
    .toFloat(),
  body('isDomestic')
    .optional()
    .isBoolean()
    .withMessage('isDomestic must be a boolean'),
  body('isMale').optional().isBoolean().withMessage('isMale must be a boolean'),
  body('isSterilized')
    .optional()
    .isBoolean()
    .withMessage('isSterilized must be a boolean'),
  body('isFriendly')
    .optional()
    .isBoolean()
    .withMessage('isFriendly must be a boolean'),
  body('protectorId')
    .optional()
    .isMongoId()
    .withMessage('protectorId must be a valid MongoDB ID'),
  body('colonyId')
    .optional()
    .isMongoId()
    .withMessage('colonyId must be a valid MongoDB ID'),
  body('breed')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Breed must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Breed contains invalid characters'),

  body('extraInfo')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('extraInfo must be less than 1000 characters'),
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

// Query parameter validation for filtering
export const getCatsQueryValidation = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ID'),
  query('protectorId')
    .optional()
    .isMongoId()
    .withMessage('protectorId must be a valid MongoDB ID'),
  query('colonyId')
    .optional()
    .isMongoId()
    .withMessage('colonyId must be a valid MongoDB ID'),
  query('age')
    .optional()
    .isInt({ min: 0, max: 30 })
    .withMessage('Age must be a number between 0 and 30')
    .toInt(),
  query('isDomestic')
    .optional()
    .isBoolean()
    .withMessage('isDomestic must be a boolean')
    .toBoolean(),
  query('isMale')
    .optional()
    .isBoolean()
    .withMessage('isMale must be a boolean')
    .toBoolean(),
  query('isSterilized')
    .optional()
    .isBoolean()
    .withMessage('isSterilized must be a boolean')
    .toBoolean(),
  query('isFriendly')
    .optional()
    .isBoolean()
    .withMessage('isFriendly must be a boolean')
    .toBoolean(),
  query('isUserOwner')
    .optional()
    .isBoolean()
    .withMessage('isUserOwner must be a boolean')
    .toBoolean(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('orderBy')
    .optional()
    .isIn(['totalLikes', 'age', 'createdAt'])
    .withMessage('orderBy must be one of: totalLikes, age, createdAt'),
  query('orderDirection')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('orderDirection must be either ASC or DESC'),
  handleValidationErrors,
];

// Generic sanitization for query parameters
export const sanitizeQueryParams = (
  req: Request,
  _res: Response,
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
  _res: Response,
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

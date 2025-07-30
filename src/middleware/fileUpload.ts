import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '@/utils/response';
import crypto from 'crypto';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
});

// Middleware to handle file upload errors
export const handleFileUploadError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ResponseUtil.badRequest(res, 'File too large', [
        'File size exceeds 10MB limit',
      ]);
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return ResponseUtil.badRequest(res, 'Too many files', [
        'Maximum 10 files allowed',
      ]);
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return ResponseUtil.badRequest(res, 'Unexpected file field', [
        'Unexpected file field in request',
      ]);
    }
    return ResponseUtil.badRequest(res, 'File upload error', [error.message]);
  }

  if (error.message === 'Only image files are allowed') {
    return ResponseUtil.badRequest(res, 'Invalid file type', [
      'Only image files are allowed',
    ]);
  }

  next(error);
};

// Generate hash for an image buffer
const generateImageHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Middleware to remove duplicate images from FormData
export const removeDuplicateImages = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return next();
  }

  const files = req.files as Express.Multer.File[];
  const uniqueFiles: Express.Multer.File[] = [];
  const seenHashes = new Set<string>();
  const removedDuplicates: string[] = [];

  for (const file of files) {
    const hash = generateImageHash(file.buffer);

    if (seenHashes.has(hash)) {
      removedDuplicates.push(file.originalname);
      console.log(
        `Removed duplicate image: ${file.originalname} (hash: ${hash.substring(
          0,
          8
        )}...)`
      );
    } else {
      seenHashes.add(hash);
      uniqueFiles.push(file);
    }
  }

  if (removedDuplicates.length > 0) {
    console.log(
      `Removed ${
        removedDuplicates.length
      } duplicate image(s): ${removedDuplicates.join(', ')}`
    );
  }

  // Replace the files array with unique files
  req.files = uniqueFiles;
  next();
};

// Export configured multer instance
export const uploadImages = upload.array('images', 10);

// Helper function to extract image buffers from request
export const getImageBuffers = (req: Request): Buffer[] => {
  if (!req.files || !Array.isArray(req.files)) {
    return [];
  }

  return req.files.map((file: Express.Multer.File) => file.buffer);
};

// Helper function to get file information
export const getFileInfo = (
  req: Request
): Array<{
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}> => {
  if (!req.files || !Array.isArray(req.files)) {
    return [];
  }

  return req.files.map((file: Express.Multer.File) => ({
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  }));
};

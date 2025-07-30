import { Request, Response, NextFunction } from 'express';
import { nsfwService } from '@/services/nsfwService';
import { ResponseUtil } from '@/utils/response';
import { getImageBuffers } from './fileUpload';

export interface NSFWValidationRequest extends Request {
  body: {
    imageUrls?: string[];
    [key: string]: any;
  };
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

export const validateNSFWImages = async (
  req: NSFWValidationRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if NSFW model is ready
    const isModelReady = await nsfwService.isModelReady();
    if (!isModelReady) {
      console.warn('NSFW model not ready, skipping validation');
      return next();
    }

    // Get image buffers from uploaded files
    const imageBuffers = getImageBuffers(req);

    // Get image URLs from request body (for backward compatibility)
    const imageUrls = req.body.imageUrls;

    // If no images to validate, continue
    if (
      (!imageBuffers || imageBuffers.length === 0) &&
      (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0)
    ) {
      return next();
    }

    // Validate uploaded images (buffers)
    if (imageBuffers && imageBuffers.length > 0) {
      const bufferValidationResult = await nsfwService.validateImageBuffers(
        imageBuffers
      );

      if (!bufferValidationResult.isValid) {
        return ResponseUtil.nsfwContentDetected(
          res,
          'NSFW content detected in one or more uploaded images',
          bufferValidationResult.invalidImages,
          bufferValidationResult.errors
        );
      }
    }

    // Validate image URLs (for backward compatibility)
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      const urlValidationResult = await nsfwService.validateImages(imageUrls);

      if (!urlValidationResult.isValid) {
        return ResponseUtil.nsfwContentDetected(
          res,
          'NSFW content detected in one or more image URLs',
          urlValidationResult.invalidImages,
          urlValidationResult.errors
        );
      }
    }

    next();
  } catch (error) {
    console.error('Error in NSFW validation middleware:', error);
    // If there's an error with NSFW validation, we'll allow the request to proceed
    // but log the error for monitoring
    next();
  }
};

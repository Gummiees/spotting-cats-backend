import { Request, Response, NextFunction } from 'express';
import { nsfwService } from '@/services/nsfwService';
import { ResponseUtil } from '@/utils/response';

export interface NSFWValidationRequest extends Request {
  body: {
    imageUrls?: string[];
    [key: string]: any;
  };
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

    // Get image URLs from request body
    const imageUrls = req.body.imageUrls;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return next();
    }

    // Validate images
    const validationResult = await nsfwService.validateImages(imageUrls);

    if (!validationResult.isValid) {
      return ResponseUtil.badRequest(
        res,
        'NSFW content detected in one or more images',
        {
          invalidImages: validationResult.invalidImages,
          errors: validationResult.errors,
        }
      );
    }

    next();
  } catch (error) {
    console.error('Error in NSFW validation middleware:', error);
    // If there's an error with NSFW validation, we'll allow the request to proceed
    // but log the error for monitoring
    next();
  }
};

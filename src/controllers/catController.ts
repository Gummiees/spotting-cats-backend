import { Response, NextFunction } from 'express';
import { CatFilters } from '@/services/interfaces/catServiceInterface';
import { ResponseUtil } from '@/utils/response';
import { AuthRequest } from '@/models/requests';
import { AlgoliaService } from '@/services/algoliaService';
import { isProduction } from '@/constants/environment';
import { cloudinaryService } from '@/services/cloudinaryService';
import { getImageBuffers } from '@/middleware/fileUpload';
import { likeService } from '@/services/likeService';
import { catService } from '@/services/catService';

const algoliaService = new AlgoliaService();

export class CatController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Get image buffers from uploaded files
      const imageBuffers = getImageBuffers(req);

      // Upload images to Cloudinary if any
      let imageUrls: string[] = [];
      if (imageBuffers.length > 0) {
        if (!cloudinaryService.isReady()) {
          return ResponseUtil.badRequest(
            res,
            'Image upload service not available'
          );
        }

        try {
          const uploadPromises = imageBuffers.map((buffer) =>
            cloudinaryService.uploadImage(buffer, { folder: 'cats' })
          );

          const uploadResults = await Promise.all(uploadPromises);
          imageUrls = uploadResults.map((result) => result.secureUrl);
        } catch (uploadError) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          return ResponseUtil.badRequest(res, 'Failed to upload images');
        }
      }

      const catData = {
        ...req.body,
        userId: req.user!.userId,
        imageUrls: imageUrls,
      };

      const cat = await catService.create(catData);

      try {
        await algoliaService.indexCat(cat);
      } catch (algoliaError) {
        console.error('Failed to index cat to Algolia:', algoliaError);
      }

      ResponseUtil.success(res, cat, 'Cat created', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await CatController.getAllFromDatabase(req, res);
    } catch (err) {
      next(err);
    }
  }

  private static async getAllFromDatabase(req: AuthRequest, res: Response) {
    const filters = this.buildFilters(req);
    const cats = await catService.getAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      req.user?.userId
    );
    ResponseUtil.success(res, cats, 'Cats retrieved from database');
  }

  private static buildFilters(req: AuthRequest): CatFilters {
    const filters: CatFilters = {
      userId: req.query.userId as string,
      protectorId: req.query.protectorId as string,
      colonyId: req.query.colonyId as string,
      age: req.query.age ? parseInt(req.query.age as string) : undefined,
      isDomestic: req.query.isDomestic
        ? req.query.isDomestic === 'true'
        : undefined,
      isMale: req.query.isMale ? req.query.isMale === 'true' : undefined,
      isSterilized: req.query.isSterilized
        ? req.query.isSterilized === 'true'
        : undefined,
      isFriendly: req.query.isFriendly
        ? req.query.isFriendly === 'true'
        : undefined,
      isUserOwner: req.query.isUserOwner
        ? req.query.isUserOwner === 'true'
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
    };

    if (req.query.orderBy && req.query.orderDirection) {
      const orderBy = req.query.orderBy as string;
      const orderDirection = req.query.orderDirection as string;

      if (
        ['totalLikes', 'age', 'createdAt'].includes(orderBy) &&
        ['ASC', 'DESC'].includes(orderDirection.toUpperCase())
      ) {
        filters.orderBy = {
          field: orderBy as 'totalLikes' | 'age' | 'createdAt',
          direction: orderDirection.toUpperCase() as 'ASC' | 'DESC',
        };
      }
    }

    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );
  }

  static async getMyCats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cats = await catService.getByUserId(req.user!.userId);
      ResponseUtil.success(res, cats, 'Your cats retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cat = await catService.getById(req.params.id, req.user?.userId);
      if (!cat) return ResponseUtil.notFound(res, 'Cat not found');
      ResponseUtil.success(res, cat, 'Cat retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cat = await catService.getByIdForAuth(req.params.id);
      if (!cat) return ResponseUtil.notFound(res, 'Cat not found');

      if (cat.userId !== req.user!.userId) {
        return ResponseUtil.forbidden(res, 'You can only update your own cats');
      }

      // Get image buffers from uploaded files
      const imageBuffers = getImageBuffers(req);

      // Handle image updates
      let finalImageUrls: string[] = [];

      if (imageBuffers.length > 0) {
        // New images uploaded - upload to Cloudinary
        if (!cloudinaryService.isReady()) {
          return ResponseUtil.badRequest(
            res,
            'Image upload service not available'
          );
        }

        try {
          const uploadPromises = imageBuffers.map((buffer) =>
            cloudinaryService.uploadImage(buffer, { folder: 'cats' })
          );

          const uploadResults = await Promise.all(uploadPromises);
          const newImageUrls = uploadResults.map((result) => result.secureUrl);

          // Check if user wants to replace all images or add to existing ones
          const replaceAllImages = req.body.replaceImages === 'true';
          const keepImages = req.body.keepImages; // Array of image URLs to keep

          if (replaceAllImages) {
            // Replace all existing images with new ones
            finalImageUrls = newImageUrls;
          } else if (keepImages) {
            // Handle keepImages - could be array or string
            const keepImagesArray = Array.isArray(keepImages)
              ? keepImages
              : [keepImages];

            // Keep specific existing images + add new ones
            const imagesToKeep = cat.imageUrls.filter((url) =>
              keepImagesArray.includes(url)
            );
            finalImageUrls = [...imagesToKeep, ...newImageUrls];
          } else {
            // Add new images to existing ones (default behavior)
            finalImageUrls = [...cat.imageUrls, ...newImageUrls];
          }
        } catch (uploadError) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          return ResponseUtil.badRequest(res, 'Failed to upload images');
        }
      } else if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
        // User provided specific imageUrls (for backward compatibility or manual URL management)
        finalImageUrls = req.body.imageUrls;
      } else if (req.body.keepImages) {
        // User wants to keep only specific existing images (no new uploads)
        const keepImagesArray = Array.isArray(req.body.keepImages)
          ? req.body.keepImages
          : [req.body.keepImages];

        finalImageUrls = cat.imageUrls.filter((url) =>
          keepImagesArray.includes(url)
        );
      } else {
        // No new images provided - keep existing images
        finalImageUrls = cat.imageUrls;
      }

      const updateData = {
        ...req.body,
        imageUrls: finalImageUrls,
      };

      const updated = await catService.update(req.params.id, updateData);
      if (!updated) return ResponseUtil.notFound(res, 'Cat not found');

      try {
        const updatedCat = await catService.getById(req.params.id);
        if (updatedCat) {
          await algoliaService.updateCat(updatedCat);
        }
      } catch (algoliaError) {
        console.error('Failed to update cat in Algolia:', algoliaError);
      }

      ResponseUtil.success(res, null, 'Cat updated');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cat = await catService.getByIdForAuth(req.params.id);
      if (!cat) return ResponseUtil.notFound(res, 'Cat not found');

      if (cat.userId !== req.user!.userId) {
        return ResponseUtil.forbidden(res, 'You can only delete your own cats');
      }

      const deleted = await catService.delete(req.params.id);
      if (!deleted) return ResponseUtil.notFound(res, 'Cat not found');

      try {
        await algoliaService.deleteCat(req.params.id);
      } catch (algoliaError) {
        console.error('Failed to delete cat from Algolia:', algoliaError);
      }

      ResponseUtil.success(res, null, 'Cat deleted');
    } catch (err) {
      next(err);
    }
  }

  static async purge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (isProduction(process.env.NODE_ENV || '')) {
        return ResponseUtil.forbidden(
          res,
          'Purge operation is not allowed in production environment'
        );
      }

      const deletedCount = await catService.purge();
      ResponseUtil.success(
        res,
        { deletedCount },
        `Successfully purged ${deletedCount} cats from the database`
      );
    } catch (err) {
      next(err);
    }
  }

  static async toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { catId } = req.params;
      const userId = req.user!.userId;

      if (!catId) {
        return ResponseUtil.badRequest(res, 'Cat ID is required');
      }

      // Check if cat exists
      const cat = await catService.getById(catId, userId);
      if (!cat) {
        return ResponseUtil.notFound(res, 'Cat not found');
      }

      const result = await likeService.toggleLike(userId, catId);
      console.log(`=========== CatController - toggleLike result: ${result}`);

      ResponseUtil.success(
        res,
        result,
        `Cat ${result.liked ? 'liked' : 'unliked'} successfully`
      );
    } catch (err) {
      next(err);
    }
  }
}

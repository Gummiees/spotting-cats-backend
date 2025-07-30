import { Request, Response, NextFunction } from 'express';
import { CatService } from '@/services/catService';
import { CatFilters } from '@/services/interfaces/catServiceInterface';
import { ResponseUtil } from '@/utils/response';
import { AuthRequest } from '@/models/requests';
import { AlgoliaService } from '@/services/algoliaService';
import { isProduction } from '@/constants/environment';

const catService = new CatService();
const algoliaService = new AlgoliaService();

export class CatController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const catData = {
        ...req.body,
        userId: req.user!.userId,
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

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      await CatController.getAllFromDatabase(req, res);
    } catch (err) {
      next(err);
    }
  }

  private static async getAllFromDatabase(req: Request, res: Response) {
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

    // Handle ordering parameters
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

    const cleanFilters: CatFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    const cats = await catService.getAll(
      Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined
    );
    ResponseUtil.success(res, cats, 'Cats retrieved from database');
  }

  static async getMyCats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cats = await catService.getByUserId(req.user!.userId);
      ResponseUtil.success(res, cats, 'Your cats retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await catService.getById(req.params.id);
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

      const updated = await catService.update(req.params.id, req.body);
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
}

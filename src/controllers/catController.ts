import { Request, Response, NextFunction } from 'express';
import { CatService } from '@/services/catService';
import { CatFilters } from '@/services/interfaces/catServiceInterface';
import { ResponseUtil } from '@/utils/response';

const catService = new CatService();

export class CatController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await catService.create(req.body);
      ResponseUtil.success(res, cat, 'Cat created', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract and parse query parameters
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
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
      };

      // Remove undefined values to create a clean filter object
      const cleanFilters: CatFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const cats = await catService.getAll(
        Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined
      );
      ResponseUtil.success(res, cats, 'Cats retrieved');
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

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await catService.update(req.params.id, req.body);
      if (!updated) return ResponseUtil.notFound(res, 'Cat not found');
      ResponseUtil.success(res, null, 'Cat updated');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await catService.delete(req.params.id);
      if (!deleted) return ResponseUtil.notFound(res, 'Cat not found');
      ResponseUtil.success(res, null, 'Cat deleted');
    } catch (err) {
      next(err);
    }
  }
}

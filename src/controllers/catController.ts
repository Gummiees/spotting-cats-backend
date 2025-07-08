import { Request, Response, NextFunction } from 'express';
import { CatService } from '@/services/catService';
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
      const cats = await catService.getAll();
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

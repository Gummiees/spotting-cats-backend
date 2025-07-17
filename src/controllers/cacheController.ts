import { Request, Response, NextFunction } from 'express';
import { CacheService } from '@/services/cacheService';
import { ResponseUtil } from '@/utils/response';

export class CacheController {
  static async flushCache(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await CacheService.flush();
      ResponseUtil.success(res, null, 'Cache flushed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCacheInfo(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { key } = req.params;
      const exists = await CacheService.exists(key);
      const value = exists ? await CacheService.get(key) : null;

      ResponseUtil.success(
        res,
        {
          key,
          exists,
          value: exists ? value : null,
        },
        'Cache info retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  static async setCache(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { key } = req.params;
      const { value, ttl } = req.body;

      await CacheService.set(key, value, ttl);
      ResponseUtil.success(res, null, 'Cache set successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCache(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { key } = req.params;
      await CacheService.delete(key);
      ResponseUtil.success(res, null, 'Cache deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

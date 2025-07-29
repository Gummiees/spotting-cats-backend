import { Request, Response, NextFunction } from 'express';
import { AlgoliaService } from '@/services/algoliaService';
import { ResponseUtil } from '@/utils/response';
import { AuthRequest } from '@/models/requests';
import { isProduction } from '@/constants/environment';

const algoliaService = new AlgoliaService();

export class AlgoliaController {
  /**
   * Index all cats from database to Algolia
   */
  static async indexAllCats(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Check if we're in production environment
      if (isProduction(process.env.NODE_ENV || '')) {
        return ResponseUtil.forbidden(
          res,
          'Indexing operation is not allowed in production environment'
        );
      }

      const result = await algoliaService.indexAllCats();

      if (result.success) {
        ResponseUtil.success(
          res,
          { indexedCount: result.indexedCount },
          `Successfully indexed ${result.indexedCount} cats to Algolia`
        );
      } else {
        ResponseUtil.error(res, `Failed to index cats: ${result.error}`, '500');
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search cats using Algolia
   */
  static async searchCats(req: Request, res: Response, next: NextFunction) {
    try {
      const { q: query, filters } = req.query;

      if (!query || typeof query !== 'string') {
        return ResponseUtil.badRequest(res, 'Query parameter "q" is required');
      }

      const result = await algoliaService.searchCats(query, filters as string);

      ResponseUtil.success(
        res,
        {
          hits: result.hits,
          totalHits: result.nbHits,
          query: query,
          filters: filters,
        },
        `Found ${result.nbHits} cats matching "${query}"`
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clear Algolia index
   */
  static async clearIndex(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if we're in production environment
      if (isProduction(process.env.NODE_ENV || '')) {
        return ResponseUtil.forbidden(
          res,
          'Clear index operation is not allowed in production environment'
        );
      }

      const result = await algoliaService.clearIndex();

      if (result.success) {
        ResponseUtil.success(res, null, 'Successfully cleared Algolia index');
      } else {
        ResponseUtil.error(
          res,
          `Failed to clear index: ${result.error}`,
          '500'
        );
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Algolia index statistics
   */
  static async getIndexStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await algoliaService.getIndexStats();

      ResponseUtil.success(res, stats, 'Algolia index statistics retrieved');
    } catch (err) {
      next(err);
    }
  }
}

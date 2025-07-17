import { Request, Response, NextFunction } from 'express';
import { HealthService } from '@/services/healthService';
import { DatabaseService } from '@/services/databaseService';
import { ResponseUtil } from '@/utils/response';

export class HealthController {
  static async getHealth(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const healthStatus = HealthService.getHealthStatus();
      ResponseUtil.success(res, healthStatus, 'Health check successful');
    } catch (error) {
      next(error);
    }
  }

  static async getDetailedHealth(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const [dbHealth, externalHealth] = await Promise.all([
        HealthService.checkDatabase(),
        HealthService.checkExternalServices(),
      ]);

      const healthStatus = HealthService.getHealthStatus();
      const detailedStatus = {
        ...healthStatus,
        services: {
          database: dbHealth ? 'OK' : 'ERROR',
          external: externalHealth ? 'OK' : 'ERROR',
        },
      };

      ResponseUtil.success(
        res,
        detailedStatus,
        'Detailed health check successful'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getDatabaseStatus(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dbStatus = DatabaseService.getStatus();
      ResponseUtil.success(res, dbStatus, 'Database status retrieved');
    } catch (error) {
      next(error);
    }
  }
}

import { HealthService } from '@/services/healthService';
import { ResponseUtil } from '@/utils/response';
import { NextFunction, Request, Response } from 'express';

export class HealthController {
  static async getHealth(
    req: Request,
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
    req: Request,
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
}

import { GeocodingService } from '@/services/geocodingService';
import { ResponseUtil } from '@/utils/response';
import { NextFunction, Request, Response } from 'express';

export class GeocodingController {
  static async reverseGeocode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { lat, lon } = req.query;

      // Validate required parameters
      if (!lat || !lon) {
        return ResponseUtil.error(
          res,
          'Missing required parameters: lat and lon',
          'Bad Request',
          400
        );
      }

      // Validate parameter types
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return ResponseUtil.error(
          res,
          'Invalid latitude or longitude parameters',
          'Bad Request',
          400
        );
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90) {
        return ResponseUtil.error(
          res,
          'Latitude must be between -90 and 90',
          'Bad Request',
          400
        );
      }

      if (longitude < -180 || longitude > 180) {
        return ResponseUtil.error(
          res,
          'Longitude must be between -180 and 180',
          'Bad Request',
          400
        );
      }

      const address = await GeocodingService.reverseGeocode(
        latitude,
        longitude
      );

      ResponseUtil.success(
        res,
        { address },
        'Reverse geocoding completed successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

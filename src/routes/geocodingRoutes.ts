import { GeocodingController } from '@/controllers/geocodingController';
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /api/v1/geocoding/reverse:
 *   get:
 *     summary: Reverse geocoding - convert coordinates to address
 *     tags: [Geocoding]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate
 *         example: 40.7128
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate
 *         example: -74.0060
 *     responses:
 *       200:
 *         description: Reverse geocoding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       nullable: true
 *                       example: "New York, New York, United States"
 *                 message:
 *                   type: string
 *                   example: "Reverse geocoding completed successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Bad Request"
 *                 message:
 *                   type: string
 *                   example: "Missing required parameters: lat and lon"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 *                 message:
 *                   type: string
 *                   example: "Failed to perform reverse geocoding"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/reverse', GeocodingController.reverseGeocode);

export default router;

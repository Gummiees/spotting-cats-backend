import { config } from '@/config';
import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';
import healthRoutes from './healthRoutes';
import helloRoutes from './helloRoutes';
import catRoutes from './catRoutes';
import cacheRoutes from './cacheRoutes';
import { userRoutes } from './userRoutes';

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get welcome message for the API
 *     tags: [Hello]
 *     responses:
 *       200:
 *         description: Welcome message retrieved successfully
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
 *                     message:
 *                       type: string
 *                       example: "Welcome to the Backend Project API!"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Welcome message retrieved successfully"
 */
// Root route
router.get('/', HelloController.getWelcome);

// API routes
router.use(`${config.api.prefix}/health`, healthRoutes);
router.use(`${config.api.prefix}/hello`, helloRoutes);
router.use(`${config.api.prefix}/cats`, catRoutes);
router.use(`${config.api.prefix}/cache`, cacheRoutes);
router.use(`${config.api.prefix}/users`, userRoutes);

export default router;

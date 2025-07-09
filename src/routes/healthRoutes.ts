import { HealthController } from '@/controllers/healthController';
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Get basic health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
router.get('/', HealthController.getHealth);

/**
 * @swagger
 * /api/v1/health/detailed:
 *   get:
 *     summary: Get detailed health status with system information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['healthy', 'unhealthy']
 *                   example: 'healthy'
 *                 timestamp:
 *                   type: string
 *                   format: 'date-time'
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       example: 52428800
 *                     total:
 *                       type: number
 *                       example: 1073741824
 *                     percentage:
 *                       type: number
 *                       example: 4.88
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     load:
 *                       type: number
 *                       example: 0.5
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/detailed', HealthController.getDetailedHealth);

/**
 * @swagger
 * /api/v1/health/database:
 *   get:
 *     summary: Get database connection status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatabaseStatus'
 *       500:
 *         description: Database health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/database', HealthController.getDatabaseStatus);

export default router;

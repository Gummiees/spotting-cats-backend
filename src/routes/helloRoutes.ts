import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /api/v1/hello:
 *   get:
 *     summary: Get a simple hello message
 *     tags: [Hello]
 *     responses:
 *       200:
 *         description: Hello message retrieved successfully
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
 *                       example: "Hello, World!"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Hello message retrieved successfully"
 */
router.get('/', HelloController.getHello);

/**
 * @swagger
 * /api/v1/hello/welcome:
 *   get:
 *     summary: Get a welcome message
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
router.get('/welcome', HelloController.getWelcome);

export default router;

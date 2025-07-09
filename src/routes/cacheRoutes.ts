import { Router } from 'express';
import { CacheController } from '@/controllers/cacheController';

const router = Router();

/**
 * @swagger
 * /api/v1/cache/flush:
 *   post:
 *     summary: Flush all cache data
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache flushed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       500:
 *         description: Failed to flush cache
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/flush', CacheController.flushCache);

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   get:
 *     summary: Get cache information for a specific key
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key
 *         example: "user:123"
 *     responses:
 *       200:
 *         description: Cache information retrieved successfully
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
 *                     key:
 *                       type: string
 *                       example: "user:123"
 *                     exists:
 *                       type: boolean
 *                       example: true
 *                     ttl:
 *                       type: number
 *                       example: 3600
 *                     size:
 *                       type: number
 *                       example: 1024
 *                 message:
 *                   type: string
 *                   example: "Cache information retrieved"
 *       404:
 *         description: Cache key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:key', CacheController.getCacheInfo);

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   post:
 *     summary: Set cache data for a specific key
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key
 *         example: "user:123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: object
 *                 description: Data to cache
 *                 example: {"name": "John", "email": "john@example.com"}
 *               ttl:
 *                 type: number
 *                 description: Time to live in seconds (optional)
 *                 example: 3600
 *     responses:
 *       200:
 *         description: Cache set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid cache data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to set cache
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:key', CacheController.setCache);

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   delete:
 *     summary: Delete cache data for a specific key
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key
 *         example: "user:123"
 *     responses:
 *       200:
 *         description: Cache deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Cache key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to delete cache
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:key', CacheController.deleteCache);

export default router;

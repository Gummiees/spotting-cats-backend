import { Router } from 'express';
import { CatController } from '@/controllers/catController';
import {
  createCatValidation,
  updateCatValidation,
  getCatByIdValidation,
  deleteCatValidation,
  sanitizeQueryParams,
} from '@/middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/v1/cats:
 *   post:
 *     summary: Create a new cat
 *     tags: [Cats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - breed
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Fluffy"
 *               breed:
 *                 type: string
 *                 example: "Persian"
 *               age:
 *                 type: number
 *                 example: 3
 *               color:
 *                 type: string
 *                 example: "White"
 *               weight:
 *                 type: number
 *                 example: 4.5
 *               isVaccinated:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Cat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cat'
 *                 message:
 *                   type: string
 *                   example: "Cat created successfully"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createCatValidation, CatController.create);

/**
 * @swagger
 * /api/v1/cats:
 *   get:
 *     summary: Get all cats with optional filtering
 *     tags: [Cats]
 *     parameters:
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by breed
 *         example: "Persian"
 *       - in: query
 *         name: age
 *         schema:
 *           type: number
 *         description: Filter by age
 *         example: 3
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color
 *         example: "White"
 *       - in: query
 *         name: isVaccinated
 *         schema:
 *           type: boolean
 *         description: Filter by vaccination status
 *         example: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of cats to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of cats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cat'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                 message:
 *                   type: string
 *                   example: "Cats retrieved successfully"
 */
router.get('/', CatController.getAll);

/**
 * @swagger
 * /api/v1/cats/{id}:
 *   get:
 *     summary: Get a cat by ID
 *     tags: [Cats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cat ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Cat retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cat'
 *                 message:
 *                   type: string
 *                   example: "Cat retrieved successfully"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getCatByIdValidation, CatController.getById);

/**
 * @swagger
 * /api/v1/cats/{id}:
 *   put:
 *     summary: Update a cat by ID
 *     tags: [Cats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cat ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Fluffy"
 *               breed:
 *                 type: string
 *                 example: "Persian"
 *               age:
 *                 type: number
 *                 example: 3
 *               color:
 *                 type: string
 *                 example: "White"
 *               weight:
 *                 type: number
 *                 example: 4.5
 *               isVaccinated:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cat updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cat'
 *                 message:
 *                   type: string
 *                   example: "Cat updated successfully"
 *       400:
 *         description: Invalid input data or ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateCatValidation, CatController.update);

/**
 * @swagger
 * /api/v1/cats/{id}:
 *   delete:
 *     summary: Delete a cat by ID
 *     tags: [Cats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cat ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Cat deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Cat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteCatValidation, CatController.delete);

// Apply query sanitization to all routes
router.use(sanitizeQueryParams);

export default router;

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
 *               - userId
 *               - name
 *               - age
 *               - xCoordinate
 *               - yCoordinate
 *               - isDomestic
 *               - isMale
 *               - isSterilized
 *               - isFriendly
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user who owns the cat
 *                 example: "507f1f77bcf86cd799439011"
 *               protectorId:
 *                 type: string
 *                 description: ID of the protector (optional)
 *                 example: "507f1f77bcf86cd799439012"
 *               colonyId:
 *                 type: string
 *                 description: ID of the colony (optional)
 *                 example: "507f1f77bcf86cd799439013"
 *               name:
 *                 type: string
 *                 example: "Fluffy"
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 30
 *                 example: 3
 *               breed:
 *                 type: string
 *                 description: Cat breed (optional)
 *                 example: "Persian"
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs (optional)
 *                 example: ["https://example.com/cat1.jpg", "https://example.com/cat2.jpg"]
 *               xCoordinate:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude coordinate
 *                 example: -73.935242
 *               yCoordinate:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude coordinate
 *                 example: 40.730610
 *               extraInfo:
 *                 type: string
 *                 description: Additional information about the cat (optional)
 *                 example: "Very friendly cat, loves children"
 *               isDomestic:
 *                 type: boolean
 *                 description: Whether the cat is domestic or feral
 *                 example: true
 *               isMale:
 *                 type: boolean
 *                 description: Whether the cat is male
 *                 example: true
 *               isSterilized:
 *                 type: boolean
 *                 description: Whether the cat is sterilized
 *                 example: false
 *               isFriendly:
 *                 type: boolean
 *                 description: Whether the cat is friendly
 *                 example: true
 *               isUserOwner:
 *                 type: boolean
 *                 description: Whether the user is the owner (default: false)
 *                 example: false
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
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: protectorId
 *         schema:
 *           type: string
 *         description: Filter by protector ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: colonyId
 *         schema:
 *           type: string
 *         description: Filter by colony ID
 *         example: "507f1f77bcf86cd799439013"
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
 *         name: isDomestic
 *         schema:
 *           type: boolean
 *         description: Filter by domestic status
 *         example: true
 *       - in: query
 *         name: isMale
 *         schema:
 *           type: boolean
 *         description: Filter by gender
 *         example: true
 *       - in: query
 *         name: isSterilized
 *         schema:
 *           type: boolean
 *         description: Filter by sterilization status
 *         example: false
 *       - in: query
 *         name: isFriendly
 *         schema:
 *           type: boolean
 *         description: Filter by friendliness
 *         example: true
 *       - in: query
 *         name: isUserOwner
 *         schema:
 *           type: boolean
 *         description: Filter by user ownership
 *         example: false
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
 *               userId:
 *                 type: string
 *                 description: ID of the user who owns the cat
 *                 example: "507f1f77bcf86cd799439011"
 *               protectorId:
 *                 type: string
 *                 description: ID of the protector (optional)
 *                 example: "507f1f77bcf86cd799439012"
 *               colonyId:
 *                 type: string
 *                 description: ID of the colony (optional)
 *                 example: "507f1f77bcf86cd799439013"
 *               name:
 *                 type: string
 *                 example: "Fluffy"
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 30
 *                 example: 3
 *               breed:
 *                 type: string
 *                 description: Cat breed (optional)
 *                 example: "Persian"
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of image URLs (optional)
 *                 example: ["https://example.com/cat1.jpg", "https://example.com/cat2.jpg"]
 *               xCoordinate:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude coordinate
 *                 example: -73.935242
 *               yCoordinate:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude coordinate
 *                 example: 40.730610
 *               extraInfo:
 *                 type: string
 *                 description: Additional information about the cat (optional)
 *                 example: "Very friendly cat, loves children"
 *               isDomestic:
 *                 type: boolean
 *                 description: Whether the cat is domestic or feral
 *                 example: true
 *               isMale:
 *                 type: boolean
 *                 description: Whether the cat is male
 *                 example: true
 *               isSterilized:
 *                 type: boolean
 *                 description: Whether the cat is sterilized
 *                 example: false
 *               isFriendly:
 *                 type: boolean
 *                 description: Whether the cat is friendly
 *                 example: true
 *               isUserOwner:
 *                 type: boolean
 *                 description: Whether the user is the owner (optional)
 *                 example: false
 *               totalLikes:
 *                 type: number
 *                 description: Total number of likes (optional)
 *                 example: 0
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

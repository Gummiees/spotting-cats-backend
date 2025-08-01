import { Router } from 'express';
import { CatController } from '@/controllers/catController';
import { authMiddleware, requireAdmin } from '@/middleware/auth';
import {
  createCatValidation,
  updateCatValidation,
  getCatByIdValidation,
  deleteCatValidation,
  getCatsQueryValidation,
  sanitizeQueryParams,
  validateCatHasImages,
} from '@/middleware/validation';
import { validateNSFWImages } from '@/middleware/nsfwValidation';
import {
  uploadImages,
  handleFileUploadError,
  removeDuplicateImages,
} from '@/middleware/fileUpload';

const router = Router();

/**
 * @swagger
 * /api/v1/cats:
 *   get:
 *     summary: Get all cats with optional filtering (public endpoint)
 *     tags: [Cats]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (internal use only)
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
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [totalLikes, age, createdAt]
 *         description: Field to order by. If not specified, defaults to ordering by createdAt in descending order (newest first)
 *         example: "totalLikes"
 *       - in: query
 *         name: orderDirection
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Order direction (ASC for ascending, DESC for descending)
 *         example: "DESC"
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
router.get('/', getCatsQueryValidation, CatController.getAll);

/**
 * @swagger
 * /api/v1/cats/my:
 *   get:
 *     summary: Get all cats owned by the authenticated user
 *     tags: [Cats]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's cats retrieved successfully
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
 *                 message:
 *                   type: string
 *                   example: "Your cats retrieved successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/my', authMiddleware, CatController.getMyCats);

/**
 * @swagger
 * /api/v1/cats:
 *   post:
 *     summary: Create a new cat
 *     tags: [Cats]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - xCoordinate
 *               - yCoordinate
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files (optional, max 10 files, 10MB each)
 *                 example: ["image1.jpg", "image2.jpg"]
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
 *                 description: Cat name (optional)
 *                 example: "Fluffy"
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 30
 *                 description: Cat age in years (optional)
 *                 example: 3
 *               breed:
 *                 type: string
 *                 description: Cat breed (optional)
 *                 example: "Persian"
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
 *                 description: Whether the cat is domestic or feral (optional)
 *                 example: true
 *               isMale:
 *                 type: boolean
 *                 description: Whether the cat is male (optional)
 *                 example: true
 *               isSterilized:
 *                 type: boolean
 *                 description: Whether the cat is sterilized (optional)
 *                 example: false
 *               isFriendly:
 *                 type: boolean
 *                 description: Whether the cat is friendly (optional)
 *                 example: true
 *               # Note: isUserOwner, createdAt, updatedAt, confirmedOwnerAt, and totalLikes are ignored and set by the backend
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authMiddleware,
  uploadImages,
  handleFileUploadError,
  removeDuplicateImages,
  validateCatHasImages,
  createCatValidation,
  validateNSFWImages,
  CatController.create
);

/**
 * @swagger
 * /api/v1/cats/admin/purge:
 *   delete:
 *     summary: Purge all cats from the database (Admin only, non-production only)
 *     tags: [Cats]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All cats purged successfully
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
 *                     deletedCount:
 *                       type: number
 *                       description: Number of cats deleted
 *                       example: 150
 *                 message:
 *                   type: string
 *                   example: "Successfully purged 150 cats from the database"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required or production environment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/admin/purge',
  authMiddleware,
  requireAdmin,
  CatController.purge
);

/**
 * @swagger
 * /api/v1/cats/{id}:
 *   get:
 *     summary: Get a cat by ID (public endpoint)
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
 *     security:
 *       - cookieAuth: []
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files (optional, max 10 files, 10MB each)
 *                 example: ["image1.jpg", "image2.jpg"]
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
 *               # Note: isUserOwner, createdAt, updatedAt, confirmedOwnerAt, and totalLikes are ignored and set by the backend

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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - You can only update your own cats
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
router.put(
  '/:id',
  authMiddleware,
  uploadImages,
  handleFileUploadError,
  removeDuplicateImages,
  validateCatHasImages,
  updateCatValidation,
  validateNSFWImages,
  CatController.update
);

/**
 * @swagger
 * /api/v1/cats/{id}:
 *   delete:
 *     summary: Delete a cat by ID
 *     tags: [Cats]
 *     security:
 *       - cookieAuth: []
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - You can only delete your own cats
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
router.delete(
  '/:id',
  authMiddleware,
  deleteCatValidation,
  CatController.delete
);

/**
 * @swagger
 * /api/v1/cats/{catId}/like:
 *   post:
 *     summary: Toggle like status for a cat
 *     tags: [Cats]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: catId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cat ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Like status toggled successfully
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
 *                     liked:
 *                       type: boolean
 *                       description: Whether the cat is now liked by the user
 *                       example: true
 *                     totalLikes:
 *                       type: number
 *                       description: Updated total likes count for the cat
 *                       example: 42
 *                 message:
 *                   type: string
 *                   example: "Cat liked successfully"
 *       400:
 *         description: Invalid cat ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
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
router.post('/:catId/like', authMiddleware, CatController.toggleLike);

// Apply query sanitization to all routes
router.use(sanitizeQueryParams);

export default router;

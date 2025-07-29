import { Router } from 'express';
import { UserController } from '@/controllers/userController';
import {
  authRateLimit,
  cleanupRateLimit,
  whitelistRoleUpdateRateLimit,
  verificationCodeRateLimit,
} from '@/middleware/security';
import {
  authMiddleware,
  requireAdmin,
  validateRoleManagement,
  validateBanPermission,
  checkProfileAccess,
  requireElevatedPermissions,
} from '@/middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/v1/users/send-code:
 *   post:
 *     summary: Send verification code to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid email format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account banned - Cannot send verification codes to banned accounts
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
 *                   example: "Account Banned"
 *                 message:
 *                   type: string
 *                   example: "This account has been banned and cannot receive verification codes"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 details:
 *                   type: object
 *                   properties:
 *                     errorCode:
 *                       type: string
 *                       example: "ACCOUNT_BANNED"
 *                     canRetry:
 *                       type: boolean
 *                       example: false
 *       429:
 *         description: Too many requests - You can only request a verification code once every 60 seconds per email address
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
 *                   example: "Too Many Requests"
 *                 message:
 *                   type: string
 *                   example: "Please wait 60 seconds before requesting another verification code."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 details:
 *                   type: object
 *                   properties:
 *                     errorCode:
 *                       type: string
 *                       example: "VERIFICATION_CODE_RATE_LIMITED"
 *                     canRetry:
 *                       type: boolean
 *                       example: true
 */
router.post(
  '/send-code',
  verificationCodeRateLimit,
  UserController.sendVerificationCode
);

/**
 * @swagger
 * /api/v1/users/verify-code:
 *   post:
 *     summary: Verify code and authenticate user
 *     description: Verify email code and authenticate user. New users will have a unique username auto-generated for them.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User authenticated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/BasicUser'
 *                     isNewUser:
 *                       type: boolean
 *                       example: false
 *                 message:
 *                   type: string
 *                   example: "Authentication successful"
 *       400:
 *         description: Invalid code or email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/verify-code',
  authRateLimit,
  UserController.verifyCodeAndAuthenticate
);

/**
 * @swagger
 * /api/v1/users/logout:
 *   post:
 *     summary: Logout user and clear authentication cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/logout', UserController.logout);

/**
 * @swagger
 * /api/v1/users/refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     description: Check if the current token needs refreshing and generate a new one if it expires within 24 hours. This endpoint is useful for clients that want to proactively refresh tokens.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refresh completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *         headers:
 *           Set-Cookie:
 *             description: Updated authentication cookie (only if token was refreshed)
 *             schema:
 *               type: string
 *               example: "auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict"
 *       400:
 *         description: No authentication token found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh-token', authMiddleware, UserController.refreshToken);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/BasicUser'
 *                 message:
 *                   type: string
 *                   example: "User profile retrieved successfully"
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authMiddleware, UserController.getCurrentUser);

/**
 * @swagger
 * /api/v1/users/check-username:
 *   get:
 *     summary: Check if username is available
 *     description: Check if a username is available for registration or update. Optionally exclude a specific user ID when checking availability for updates.
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username to check
 *         example: "johndoe"
 *       - in: query
 *         name: excludeUserId
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID to exclude from the check (useful when updating own username)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Username availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsernameAvailabilityResponse'
 *       400:
 *         description: Username parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/check-username', UserController.checkUsernameAvailability);

/**
 * @swagger
 * /api/v1/users/check-email:
 *   get:
 *     summary: Check if email is available
 *     description: Check if an email is available for registration or update. Optionally exclude a specific user ID when checking availability for updates.
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The email to check
 *         example: "user@example.com"
 *       - in: query
 *         name: excludeUserId
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID to exclude from the check (useful when updating own email)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Email availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailAvailabilityResponse'
 *       400:
 *         description: Email parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/check-email', UserController.checkEmailAvailability);

/**
 * @swagger
 * /api/v1/users/admin/:username:
 *   get:
 *     summary: Get user by username for admin view
 *     description: Get detailed user information including notes written by the user. This endpoint requires admin privileges and returns sensitive information like email and IP addresses.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user to retrieve
 *     responses:
 *       200:
 *         description: Admin user data retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/AdminUserResponse'
 *                 message:
 *                   type: string
 *                   example: "Admin user data retrieved successfully"
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin privileges required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/admin/:username',
  authMiddleware,
  requireElevatedPermissions,
  UserController.getUserByUsernameAdmin
);

/**
 * @swagger
 * /api/v1/users/{username}:
 *   get:
 *     summary: Get user by username (public access)
 *     description: Retrieve basic user information by username. Returns essential user data including ban status for security purposes.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username to retrieve
 *         example: "johndoe"
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *                           example: "john_doe"
 *                         avatarUrl:
 *                           type: string
 *                           example: "https://api.dicebear.com/7.x/avataaars/svg?seed=john_doe"
 *                         role:
 *                           type: string
 *                           enum: [user, moderator, admin, superadmin]
 *                           example: "user"
 *                         isInactive:
 *                           type: boolean
 *                           example: false
 *                         isBanned:
 *                           type: boolean
 *                           example: false
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                         emailUpdatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                         usernameUpdatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                         avatarUpdatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-01-01T00:00:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "User retrieved successfully"
 *       400:
 *         description: Username is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found (or access denied for security reasons)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:username', checkProfileAccess, UserController.getUserByUsername);

/**
 * @swagger
 * /api/v1/users/username:
 *   put:
 *     summary: Update user's username
 *     description: Update user's username. Can only be changed once every 30 days. New users get auto-generated usernames that don't count towards this limit. The authentication cookie will be updated with a new token containing the updated username.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "newusername"
 *                 description: New username (must be unique)
 *     responses:
 *       200:
 *         description: Username updated successfully. Authentication cookie updated with new token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Updated authentication cookie with new token
 *             schema:
 *               type: string
 *               example: "auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict"
 *       400:
 *         description: Invalid username, username already taken, or too soon to update (30-day limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/username', authMiddleware, UserController.updateUsername);

/**
 * @swagger
 * /api/v1/users/email:
 *   put:
 *     summary: Initiate email address change
 *     description: Request to change user's email address. A verification code will be sent to the new email address to confirm the change. Users can only request a verification code once every 10 minutes.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newemail@example.com"
 *                 description: New email address to change to
 *     responses:
 *       200:
 *         description: Verification code sent to new email address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid email, email already in use, same as current email, or too soon to update (90-day limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - Email change verification code can only be requested once every 10 minutes
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
 *                   example: "Too Many Requests"
 *                 message:
 *                   type: string
 *                   example: "You can only request an email change verification code once every 10 minutes. Please try again in 8 minutes."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 details:
 *                   type: object
 *                   properties:
 *                     errorCode:
 *                       type: string
 *                       example: "EMAIL_CHANGE_RATE_LIMITED"
 *                     canRetry:
 *                       type: boolean
 *                       example: true
 */
router.put('/email', authMiddleware, UserController.updateEmail);

/**
 * @swagger
 * /api/v1/users/email/verify:
 *   post:
 *     summary: Verify email change with verification code
 *     description: Complete the email change process by providing the verification code sent to the new email address. The user's session will be maintained with an updated authentication token.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: Verification code sent to the new email address
 *     responses:
 *       200:
 *         description: Email changed successfully. Authentication cookie updated with new token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Updated authentication cookie with new token
 *             schema:
 *               type: string
 *               example: "auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict"
 *       400:
 *         description: Invalid verification code or too soon to update (90-day limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/email/verify', authMiddleware, UserController.verifyEmailChange);

/**
 * @swagger
 * /api/v1/users/avatar:
 *   put:
 *     summary: Update user's avatar
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - avatarUrl
 *             properties:
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/avatar.jpg"
 *                 description: HTTPS URL pointing to the user's avatar image
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid avatar URL format, unsupported image type, or too soon to update (30-day limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/avatar', authMiddleware, UserController.updateAvatar);

/**
 * @swagger
 * /api/v1/users/deactivate:
 *   post:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Failed to deactivate account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/deactivate', authMiddleware, UserController.deactivateAccount);

/**
 * @swagger
 * /api/v1/users/delete:
 *   delete:
 *     summary: Delete user account permanently
 *     description: Permanently delete the current user's account. This action cannot be undone.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Failed to delete account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/delete', authMiddleware, UserController.deleteAccount);

/**
 * @swagger
 * /api/v1/users/ban:
 *   post:
 *     summary: Ban a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - reason
 *             properties:
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *                 description: Username of the user to ban
 *               reason:
 *                 type: string
 *                 example: "Violation of community guidelines"
 *                 description: Reason for banning the user
 *     responses:
 *       200:
 *         description: User banned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request, missing username/ban reason, user not found, or cannot ban own account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/ban',
  authMiddleware,
  validateBanPermission,
  UserController.banUser
);

/**
 * @swagger
 * /api/v1/users/unban:
 *   post:
 *     summary: Unban a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *                 description: Username of the user to unban
 *     responses:
 *       200:
 *         description: User unbanned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request, missing username, or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/unban',
  authMiddleware,
  validateBanPermission,
  UserController.unbanUser
);

/**
 * @swagger
 * /api/v1/users/ban-ip:
 *   post:
 *     summary: Comprehensively ban all users connected by IP addresses (Admin/Superadmin only)
 *     description: |
 *       Recursively ban all users connected by IP addresses, with role hierarchy protection:
 *       1. Starts with the target user's IP addresses
 *       2. Bans all users sharing those IPs (respecting role hierarchy)
 *       3. Finds all IP addresses from those newly banned users
 *       4. Repeats the process recursively until no more connected users are found
 *       5. Includes safety limits to prevent infinite loops (max 10 iterations)
 *
 *       Role hierarchy protection:
 *       - **Superadmins** can ban users, moderators, and admins (but not other superadmins)
 *       - **Admins** can ban users and moderators (but not admins or superadmins)
 *       - **Moderators** can only ban users (but not moderators, admins, or superadmins)
 *       - If any user with an equal or higher role shares the same IP, the entire operation is blocked
 *
 *       This ensures that when you ban by IP, you ban the entire connected network
 *       of users, not just those sharing the initial IPs.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - reason
 *             properties:
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *                 description: Username of the user whose IP addresses will be banned
 *               reason:
 *                 type: string
 *                 example: "IP ban: Multiple violations from this IP range"
 *                 description: Reason for banning the IP addresses
 *     responses:
 *       200:
 *         description: Comprehensive IP ban successful (some users may be protected by role hierarchy)
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
 *                     targetUser:
 *                       $ref: '#/components/schemas/BasicUser'
 *                     affectedUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BasicUser'
 *                       description: All users that were banned in the comprehensive operation
 *                     protectedUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BasicUser'
 *                       description: Users protected by role hierarchy (if any)
 *                     bannedIps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: All IP addresses that were banned
 *                     totalBanned:
 *                       type: number
 *                       description: Total number of users banned
 *                     iterations:
 *                       type: number
 *                       description: Number of recursive iterations performed
 *                 message:
 *                   type: string
 *                   example: "Successfully banned 5 users from 3 IP addresses in 2 iterations"
 *       400:
 *         description: |
 *           Invalid request:
 *           - Missing username/ban reason
 *           - User not found
 *           - No IP addresses to ban
 *           - No users can be banned due to role hierarchy restrictions
 *           - IP ban blocked due to users with equal or higher roles sharing the same IP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin/Superadmin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/ban-ip',
  authMiddleware,
  requireElevatedPermissions,
  UserController.banUsersByIp
);

/**
 * @swagger
 * /api/v1/users/unban-ip:
 *   post:
 *     summary: Comprehensively unban all users connected by IP addresses (Admin/Superadmin only)
 *     description: |
 *       Recursively unban all users connected by IP addresses. This operation:
 *       1. Starts with the target user's IP addresses
 *       2. Unbans all users sharing those IPs who were banned due to IP ban
 *       3. Finds all IP addresses from those newly unbanned users
 *       4. Repeats the process recursively until no more connected users are found
 *       5. Includes safety limits to prevent infinite loops (max 10 iterations)
 *
 *       This ensures that when you unban by IP, you unban the entire connected network
 *       of users who were banned together, not just those sharing the initial IPs.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *                 description: Username of the user whose IP addresses will be unbanned
 *     responses:
 *       200:
 *         description: Comprehensive IP unban successful
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
 *                     targetUser:
 *                       $ref: '#/components/schemas/BasicUser'
 *                     affectedUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BasicUser'
 *                       description: All users that were unbanned in the comprehensive operation
 *                     unbannedIps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: All IP addresses that were unbanned
 *                     totalUnbanned:
 *                       type: number
 *                       description: Total number of users unbanned
 *                     iterations:
 *                       type: number
 *                       description: Number of recursive iterations performed
 *                 message:
 *                   type: string
 *                   example: "Successfully unbanned 5 users from 3 IP addresses in 2 iterations"
 *       400:
 *         description: Invalid request, missing username, user not found, or no IP addresses to unban
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin/Superadmin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/unban-ip',
  authMiddleware,
  requireElevatedPermissions,
  UserController.unbanUsersByIp
);

/**
 * @swagger
 * /api/v1/users/role:
 *   put:
 *     summary: Update user role (Admin/Superadmin only)
 *     description: |
 *       Update a user's role with enhanced validation:
 *       - **Superadmins** can promote users to moderator, admin, or superadmin roles
 *       - **Admins** can promote users to moderator role only
 *       - **Moderators** cannot promote users to any role
 *       - Cannot update your own role
 *       - Cannot promote users who are already at or above the target role
 *       - Automatically invalidates and recreates tokens for the updated user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *                 description: Username of the user to update
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin, superadmin]
 *                 example: "moderator"
 *                 description: New role to assign to the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: |
 *           Invalid request:
 *           - Missing username or role
 *           - User not found
 *           - Cannot update your own role
 *           - User is already at or above the target role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Insufficient permissions to assign this role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Target user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/role',
  authMiddleware,
  validateRoleManagement,
  UserController.updateUserRole
);

/**
 * @swagger
 * /api/v1/users/role/whitelist:
 *   post:
 *     summary: Update user roles based on admin/superadmin whitelists (Open endpoint)
 *     description: Automatically promotes users whose emails are in the admin/superadmin whitelists and demotes superadmins who are no longer in the superadmin whitelist. Only processes whitelisted emails and existing superadmins for efficiency. Rate limited to 1 request per 15 minutes.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: User roles updated successfully based on whitelists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhitelistRoleUpdateResponse'
 *       429:
 *         description: Rate limit exceeded - too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/role/whitelist',
  whitelistRoleUpdateRateLimit,
  UserController.updateUserRoleByWhitelist
);

/**
 * @swagger
 * /api/v1/users/admin/ensure-avatars:
 *   post:
 *     summary: Ensure all users have avatars (Admin only)
 *     description: Generate random avatars for any users that don't have them using DiceBear API
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Avatar migration completed successfully
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
 *                     updatedCount:
 *                       type: number
 *                       example: 5
 *                       description: Number of users that were updated with new avatars
 *                 message:
 *                   type: string
 *                   example: "Successfully updated avatars for 5 users"
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Migration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/admin/ensure-avatars',
  authMiddleware,
  requireAdmin,
  UserController.ensureAllUsersHaveAvatars
);

/**
 * @swagger
 * /api/v1/users/admin/cleanup:
 *   post:
 *     summary: Manually trigger cleanup of old deactivated users (Admin Only)
 *     description: Manually trigger the cleanup process to delete deactivated users older than specified days. Rate limited to 3 requests per hour.
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to retain deactivated users (default 30)
 *         example: 30
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
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
 *                       type: integer
 *                       description: Number of users deleted
 *                       example: 5
 *                     retentionDays:
 *                       type: integer
 *                       description: Retention period used
 *                       example: 30
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 5 deactivated users older than 30 days"
 *       400:
 *         description: Invalid retention days parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - No valid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Cleanup process failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/admin/cleanup',
  cleanupRateLimit,
  authMiddleware,
  requireAdmin,
  UserController.triggerCleanup
);

export { router as userRoutes };

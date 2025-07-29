import { Request, Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { AuthRequest } from '@/models/requests';
import { ResponseUtil } from '@/utils/response';
import {
  EmailVerificationRequest,
  CodeVerificationRequest,
  UsernameUpdateRequest,
  EmailUpdateRequest,
  EmailChangeVerificationRequest,
  AvatarUpdateRequest,
  BanUserRequest,
  UpdateUserRoleRequest,
  BanIpRequest,
  UnbanIpRequest,
} from '@/models/requests';
import { isValidDiceBearUrl } from '@/utils/avatar';
import { config } from '@/config';
import { getClientIp, decryptEmail } from '@/utils/security';
import { isProduction } from '@/constants/environment';

export class UserController {
  static async sendVerificationCode(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email }: EmailVerificationRequest = req.body;
      const clientIp = getClientIp(req);

      const emailValidation = UserController.validateEmail(email);
      if (!emailValidation.valid) {
        ResponseUtil.badRequest(res, emailValidation.message!);
        return;
      }

      const result = await userService.sendVerificationCode(email, clientIp);

      // Handle banned user case specifically
      if (!result.success && result.errorCode === 'ACCOUNT_BANNED') {
        ResponseUtil.accountBanned(res, result.message);
        return;
      }

      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyCodeAndAuthenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, code }: CodeVerificationRequest = req.body;
      const clientIp = getClientIp(req);

      const validation = UserController.validateEmailAndCode(email, code);
      if (!validation.valid) {
        ResponseUtil.badRequest(res, validation.message!);
        return;
      }

      const result = await userService.verifyCodeAndAuthenticate(
        email,
        code,
        clientIp
      );

      if (result.success && result.token) {
        UserController.setAuthCookie(res, result.token);

        // Get basic user data instead of full user data
        const basicUser = result.user
          ? await userService.getBasicUserById(result.user.id!)
          : null;

        ResponseUtil.success(
          res,
          {
            user: basicUser,
            isNewUser: result.isNewUser,
          },
          result.message
        );
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const user = await userService.getBasicUserById(req.user!.userId);

      if (!user) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      ResponseUtil.success(
        res,
        { user },
        'User profile retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async logout(
    _req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      UserController.clearAuthCookie(res);
      ResponseUtil.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const token = req.cookies?.auth_token;
      if (!token) {
        ResponseUtil.badRequest(res, 'No authentication token found');
        return;
      }

      const refreshResult = await userService.refreshTokenIfNeeded(token);

      if (refreshResult.shouldRefresh && refreshResult.newToken) {
        UserController.setAuthCookie(res, refreshResult.newToken);
        ResponseUtil.success(res, null, 'Token refreshed successfully');
      } else {
        ResponseUtil.success(
          res,
          null,
          'Token is still valid, no refresh needed'
        );
      }
    } catch (error) {
      next(error);
    }
  }

  static async deactivateAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const result = await userService.deactivateUser(req.user!.userId);

      if (result.success) {
        UserController.clearAuthCookie(res);
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const result = await userService.deleteUser(req.user!.userId);

      if (result.success) {
        UserController.clearAuthCookie(res);
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  static async updateUsername(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const { username }: UsernameUpdateRequest = req.body;
      const usernameValidation = UserController.validateUsername(username);

      if (!usernameValidation.valid) {
        ResponseUtil.badRequest(res, usernameValidation.message!);
        return;
      }

      const result = await userService.updateUser(req.user!.userId, {
        username: usernameValidation.trimmedUsername!,
      });

      if (result.success && result.token) {
        UserController.setAuthCookie(res, result.token);
        ResponseUtil.success(res, null, result.message);
      } else {
        UserController.handleServiceResponse(res, result);
      }
    } catch (error) {
      next(error);
    }
  }

  static async updateEmail(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const { email }: EmailUpdateRequest = req.body;
      const emailValidation = UserController.validateEmailFormat(email);

      if (!emailValidation.valid) {
        ResponseUtil.badRequest(res, emailValidation.message!);
        return;
      }

      const result = await userService.initiateEmailChange(
        req.user!.userId,
        emailValidation.normalizedEmail!
      );

      // Handle rate limiting case specifically
      if (!result.success && result.errorCode === 'EMAIL_CHANGE_RATE_LIMITED') {
        ResponseUtil.tooManyRequests(res, result.message);
        return;
      }

      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmailChange(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const { code }: EmailChangeVerificationRequest = req.body;

      if (!code) {
        ResponseUtil.badRequest(res, 'Verification code is required');
        return;
      }

      const result = await userService.verifyEmailChange(
        req.user!.userId,
        code
      );

      if (result.success && result.token) {
        UserController.setAuthCookie(res, result.token);
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  static async updateAvatar(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = UserController.validateUserAuth(req);
      if (!authValidation.valid) {
        UserController.handleAuthError(res, authValidation.message);
        return;
      }

      const { avatarUrl }: AvatarUpdateRequest = req.body;
      const avatarValidation = UserController.validateAvatarUrl(avatarUrl);

      if (!avatarValidation.valid) {
        ResponseUtil.badRequest(res, avatarValidation.message!);
        return;
      }

      const result = await userService.updateUser(req.user!.userId, {
        avatarUrl: avatarValidation.normalizedUrl!,
      });

      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  private static validateEmail(email: any): {
    valid: boolean;
    message?: string;
  } {
    if (!email || typeof email !== 'string') {
      return { valid: false, message: 'Email is required' };
    }
    return { valid: true };
  }

  private static validateEmailAndCode(
    email: any,
    code: any
  ): { valid: boolean; message?: string } {
    if (!email || !code) {
      return { valid: false, message: 'Email and code are required' };
    }
    return { valid: true };
  }

  private static validateEmailFormat(email: any): {
    valid: boolean;
    message?: string;
    normalizedEmail?: string;
  } {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return {
        valid: false,
        message: 'Email is required and cannot be empty',
      };
    }

    const trimmedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return {
        valid: false,
        message: 'Please provide a valid email address',
      };
    }

    if (trimmedEmail.length > 320) {
      return {
        valid: false,
        message: 'Email address is too long',
      };
    }

    const reservedPatterns = [
      /^admin@/,
      /^administrator@/,
      /^root@/,
      /^system@/,
      /^noreply@/,
      /^no-reply@/,
    ];

    for (const pattern of reservedPatterns) {
      if (pattern.test(trimmedEmail)) {
        return {
          valid: false,
          message: 'This email address cannot be used',
        };
      }
    }

    return { valid: true, normalizedEmail: trimmedEmail };
  }

  private static validateUserAuth(req: AuthRequest): {
    valid: boolean;
    message?: string;
  } {
    if (!req.user) {
      return { valid: false, message: 'Unauthorized' };
    }
    return { valid: true };
  }

  private static validateUsername(username: any): {
    valid: boolean;
    message?: string;
    trimmedUsername?: string;
  } {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return {
        valid: false,
        message: 'Username is required and cannot be empty',
      };
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return {
        valid: false,
        message: 'Username must be between 3 and 20 characters long',
      };
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return {
        valid: false,
        message: 'Username can only contain letters, numbers, and underscores',
      };
    }

    const reservedUsernames = [
      'admin',
      'administrator',
      'root',
      'system',
      'support',
      'help',
      'info',
    ];
    if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
      return {
        valid: false,
        message: 'This username is reserved and cannot be used',
      };
    }

    return { valid: true, trimmedUsername };
  }

  private static validateAvatarUrl(avatarUrl: any): {
    valid: boolean;
    message?: string;
    normalizedUrl?: string;
  } {
    if (
      !avatarUrl ||
      typeof avatarUrl !== 'string' ||
      avatarUrl.trim() === ''
    ) {
      return {
        valid: false,
        message: 'Avatar URL is required and cannot be empty',
      };
    }

    const trimmedUrl = avatarUrl.trim();

    const urlRegex = /^https:\/\/.+/;
    if (!urlRegex.test(trimmedUrl)) {
      return {
        valid: false,
        message: 'Avatar URL must be a valid HTTPS URL',
      };
    }

    if (trimmedUrl.length > 512) {
      return {
        valid: false,
        message: 'Avatar URL is too long (max 512 characters)',
      };
    }

    if (isValidDiceBearUrl(trimmedUrl)) {
      return { valid: true, normalizedUrl: trimmedUrl };
    }

    const imageHosts = ['dicebear.com'];

    const hasImageHost = imageHosts.some((host) =>
      trimmedUrl.toLowerCase().includes(host)
    );

    if (!hasImageHost) {
      return {
        valid: false,
        message: 'Avatar URL should be a valid DiceBear avatar URL',
      };
    }

    return { valid: true, normalizedUrl: trimmedUrl };
  }

  private static setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProduction(process.env.NODE_ENV || '') ? 'strict' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private static clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: isProduction(process.env.NODE_ENV || '') ? 'strict' : 'none',
      path: '/',
    });
  }

  private static handleServiceResponse(
    res: Response,
    result: { success: boolean; message: string },
    successData?: any
  ): void {
    if (result.success) {
      ResponseUtil.success(res, successData, result.message);
    } else {
      ResponseUtil.badRequest(res, result.message);
    }
  }

  private static handleAuthError(
    res: Response,
    message: string = 'Unauthorized'
  ): void {
    ResponseUtil.error(res, message, message, 401);
  }

  private static validateNotSelfBan(
    currentUserUsername: string,
    targetUserUsername: string
  ): {
    valid: boolean;
    message?: string;
  } {
    if (targetUserUsername === currentUserUsername) {
      return { valid: false, message: 'Cannot ban your own account' };
    }
    return { valid: true };
  }

  private static handleValidationError(res: Response, message: string): void {
    ResponseUtil.badRequest(res, message);
  }

  static async banUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reason }: BanUserRequest = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        UserController.handleValidationError(res, 'Ban reason is required');
        return;
      }

      const targetUser = (req as any).targetUser;
      const currentUser = await userService.getUserById(req.user!.userId);

      if (!currentUser) {
        UserController.handleAuthError(res, 'Current user not found');
        return;
      }

      const selfBanValidation = UserController.validateNotSelfBan(
        currentUser.username,
        targetUser.username
      );
      if (!selfBanValidation.valid) {
        UserController.handleValidationError(res, selfBanValidation.message!);
        return;
      }

      const result = await userService.updateUser(targetUser.id!, {
        isBanned: true,
        banReason: reason.trim(),
        bannedBy: currentUser.id!,
      });
      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async unbanUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const targetUser = (req as any).targetUser;

      const result = await userService.updateUser(targetUser.id!, {
        isBanned: false,
        banReason: undefined,
        bannedBy: undefined,
        isActive: true,
      });
      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validationResult = UserController.validateUpdateRoleRequest(req);
      if (!validationResult.valid) {
        UserController.handleValidationError(res, validationResult.message!);
        return;
      }

      const { role }: UpdateUserRoleRequest = req.body;
      const targetUser = (req as any).targetUser;

      const currentUser = await userService.getUserById(req.user!.userId);
      if (!currentUser) {
        UserController.handleAuthError(res, 'Current user not found');
        return;
      }

      const result = await userService.updateUserRole(
        targetUser.id!,
        role,
        currentUser.id!
      );
      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async ensureAllUsersHaveAvatars(
    _req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await userService.ensureAllUsersHaveAvatars();

      if (result.success) {
        ResponseUtil.success(
          res,
          { updatedCount: result.updatedCount },
          result.message
        );
      } else {
        ResponseUtil.error(res, 'Migration Failed', result.message, 500);
      }
    } catch (error) {
      next(error);
    }
  }

  static async getUserByUsername(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username } = req.params;

      const user = await userService.getBasicUserByUsername(username.trim());

      if (!user) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      ResponseUtil.success(res, { user }, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserByUsernameAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username } = req.params;

      const user = await userService.getUserByUsernameForAdmin(username.trim());

      if (!user) {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      ResponseUtil.success(
        res,
        { user },
        'Admin user data retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async checkUsernameAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username } = req.query;
      const excludeUserId = req.query.excludeUserId as string;

      if (!username || typeof username !== 'string') {
        ResponseUtil.badRequest(res, 'Username parameter is required');
        return;
      }

      const result = await userService.checkUsernameAvailability(
        username,
        excludeUserId
      );

      ResponseUtil.success(
        res,
        {
          available: result.available,
          message: result.message,
        },
        result.message
      );
    } catch (error) {
      next(error);
    }
  }

  static async checkEmailAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.query;
      const excludeUserId = req.query.excludeUserId as string;

      if (!email || typeof email !== 'string') {
        ResponseUtil.badRequest(res, 'Email parameter is required');
        return;
      }

      const result = await userService.checkEmailAvailability(
        email,
        excludeUserId
      );

      ResponseUtil.success(
        res,
        {
          available: result.available,
          message: result.message,
          statusCode: result.statusCode,
        },
        result.message
      );
    } catch (error) {
      next(error);
    }
  }

  static async triggerCleanup(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const retentionDays = parseInt(req.query.days as string) || 30;

      if (retentionDays < 1 || retentionDays > 365) {
        ResponseUtil.badRequest(
          res,
          'Retention days must be between 1 and 365'
        );
        return;
      }

      const { cleanupService } = await import('@/services/cleanupService');

      const result = await cleanupService.manualCleanup(retentionDays);

      if (result.success) {
        ResponseUtil.success(
          res,
          {
            deletedCount: result.deletedCount,
            retentionDays: retentionDays,
          },
          result.message
        );
      } else {
        ResponseUtil.error(res, 'Cleanup Failed', result.message, 500);
      }
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRoleByWhitelist(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updates: Array<{
        email: string;
        previousRole: string;
        newRole: string;
        updated: boolean;
        userFound: boolean;
        action: 'promoted' | 'demoted' | 'no_change' | 'not_found';
      }> = [];

      const allUsersResult = await userService.getAllUsers();
      if (!allUsersResult.success) {
        ResponseUtil.error(
          res,
          'Failed to retrieve users',
          allUsersResult.message,
          500
        );
        return;
      }

      const superadminUsers = allUsersResult.users.filter(
        (user) => user.role === 'superadmin'
      );

      for (const email of config.admin.superadminEmailWhitelist) {
        const user = await userService.getUserByEmail(email);

        if (user) {
          if (user.role !== 'superadmin') {
            const result = await userService.updateUserRole(
              user.id!,
              'superadmin',
              'system-whitelist-update'
            );

            updates.push({
              email: email,
              previousRole: user.role,
              newRole: 'superadmin',
              updated: result.success,
              userFound: true,
              action: 'promoted',
            });
          } else {
            updates.push({
              email: email,
              previousRole: user.role,
              newRole: 'superadmin',
              updated: false,
              userFound: true,
              action: 'no_change',
            });
          }
        } else {
          updates.push({
            email: email,
            previousRole: 'N/A',
            newRole: 'superadmin',
            updated: false,
            userFound: false,
            action: 'not_found',
          });
        }
      }

      for (const email of config.admin.emailWhitelist) {
        if (config.admin.superadminEmailWhitelist.includes(email)) {
          continue;
        }

        const user = await userService.getUserByEmail(email);

        if (user) {
          if (user.role !== 'admin') {
            const result = await userService.updateUserRole(
              user.id!,
              'admin',
              'system-whitelist-update'
            );

            updates.push({
              email: email,
              previousRole: user.role,
              newRole: 'admin',
              updated: result.success,
              userFound: true,
              action: 'promoted',
            });
          } else {
            updates.push({
              email: email,
              previousRole: user.role,
              newRole: 'admin',
              updated: false,
              userFound: true,
              action: 'no_change',
            });
          }
        } else {
          updates.push({
            email: email,
            previousRole: 'N/A',
            newRole: 'admin',
            updated: false,
            userFound: false,
            action: 'not_found',
          });
        }
      }

      // Check superadmin users against whitelist
      for (const user of superadminUsers) {
        // Get database user to access encrypted email
        const dbUser = await userService.getDbUserById(user.id!);
        if (dbUser && dbUser.email) {
          // Decrypt email for whitelist comparison
          const decryptedEmail = decryptEmail(dbUser.email);
          const userEmail = decryptedEmail.toLowerCase();
          const isInSuperadminWhitelist =
            config.admin.superadminEmailWhitelist.includes(userEmail);

          if (!isInSuperadminWhitelist) {
            const result = await userService.updateUserRole(
              user.id!,
              'user',
              'system-whitelist-update'
            );

            updates.push({
              email: userEmail,
              previousRole: user.role,
              newRole: 'user',
              updated: result.success,
              userFound: true,
              action: 'demoted',
            });
          }
        }
      }

      const totalWhitelistedEmails =
        config.admin.superadminEmailWhitelist.length +
        config.admin.emailWhitelist.filter(
          (email) => !config.admin.superadminEmailWhitelist.includes(email)
        ).length;
      const promotedCount = updates.filter(
        (u) => u.action === 'promoted' && u.updated
      ).length;
      const demotedCount = updates.filter(
        (u) => u.action === 'demoted' && u.updated
      ).length;
      const noChangeCount = updates.filter(
        (u) => u.action === 'no_change'
      ).length;
      const notFoundCount = updates.filter(
        (u) => u.action === 'not_found'
      ).length;
      const totalUpdated = promotedCount + demotedCount;

      ResponseUtil.success(
        res,
        {
          totalWhitelistedEmails,
          promotedCount,
          demotedCount,
          noChangeCount,
          notFoundCount,
          totalUpdated,
          updates,
        },
        `Processed ${totalWhitelistedEmails} whitelisted emails and ${superadminUsers.length} superadmin users. Promoted ${promotedCount}, demoted ${demotedCount}, ${noChangeCount} no changes, ${notFoundCount} not found.`
      );
    } catch (error) {
      next(error);
    }
  }

  private static validateUpdateRoleRequest(req: AuthRequest): {
    valid: boolean;
    message?: string;
  } {
    const { username, role } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
      return { valid: false, message: 'Username is required' };
    }

    if (!role || !['user', 'moderator', 'admin', 'superadmin'].includes(role)) {
      return {
        valid: false,
        message: 'Valid role is required (user, moderator, admin, superadmin)',
      };
    }

    return { valid: true };
  }

  static async banUsersByIp(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username, reason }: BanIpRequest = req.body;

      if (!username || typeof username !== 'string' || username.trim() === '') {
        UserController.handleValidationError(res, 'Username is required');
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        UserController.handleValidationError(res, 'Ban reason is required');
        return;
      }

      const result = await userService.banUsersByIp(
        username.trim(),
        reason.trim(),
        req.user!.userId
      );

      if (result.success) {
        ResponseUtil.success(res, result.data, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  static async unbanUsersByIp(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { username }: UnbanIpRequest = req.body;

      if (!username || typeof username !== 'string' || username.trim() === '') {
        UserController.handleValidationError(res, 'Username is required');
        return;
      }

      const result = await userService.unbanUsersByIp(
        username.trim(),
        req.user!.userId
      );

      if (result.success) {
        ResponseUtil.success(res, result.data, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { ResponseUtil } from '@/utils/response';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    iat: number;
    exp: number;
  };
}

export class UserController {
  static async sendVerificationCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      const emailValidation = UserController.validateEmail(email);
      if (!emailValidation.valid) {
        ResponseUtil.badRequest(res, emailValidation.message!);
        return;
      }

      const result = await userService.sendVerificationCode(email);
      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyCodeAndAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, code } = req.body;

      const validation = UserController.validateEmailAndCode(email, code);
      if (!validation.valid) {
        ResponseUtil.badRequest(res, validation.message!);
        return;
      }

      const result = await userService.verifyCodeAndAuthenticate(email, code);

      if (result.success && result.token) {
        UserController.setAuthCookie(res, result.token);
        ResponseUtil.success(
          res,
          {
            user: result.user,
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

      const user = await userService.getUserById(req.user!.userId);

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
    req: Request,
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

      const { username } = req.body;
      const usernameValidation = UserController.validateUsername(username);

      if (!usernameValidation.valid) {
        ResponseUtil.badRequest(res, usernameValidation.message!);
        return;
      }

      const result = await userService.updateUser(req.user!.userId, {
        username: usernameValidation.trimmedUsername!,
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

  private static setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private static clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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

  // Admin validation methods
  private static validateBanUserRequest(req: AuthRequest): {
    valid: boolean;
    message?: string;
  } {
    const authValidation = UserController.validateUserAuth(req);
    if (!authValidation.valid) {
      return authValidation;
    }

    const { userId } = req.params;
    if (!userId) {
      return { valid: false, message: 'User ID is required' };
    }

    return { valid: true };
  }

  private static async validateAdminAccess(userId: string): Promise<{
    valid: boolean;
    message?: string;
  }> {
    const currentUser = await userService.getUserById(userId);
    if (!currentUser?.isAdmin) {
      return { valid: false, message: 'Admin access required' };
    }
    return { valid: true };
  }

  private static validateNotSelfBan(
    currentUserId: string,
    targetUserId: string
  ): {
    valid: boolean;
    message?: string;
  } {
    if (targetUserId === currentUserId) {
      return { valid: false, message: 'Cannot ban your own account' };
    }
    return { valid: true };
  }

  private static handleValidationError(res: Response, message: string): void {
    ResponseUtil.badRequest(res, message);
  }

  private static handleAdminError(res: Response, message: string): void {
    ResponseUtil.error(res, 'Forbidden', message, 403);
  }

  // Admin methods for user management
  static async banUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validationResult = UserController.validateBanUserRequest(req);
      if (!validationResult.valid) {
        UserController.handleValidationError(res, validationResult.message!);
        return;
      }

      const adminValidation = await UserController.validateAdminAccess(
        req.user!.userId
      );
      if (!adminValidation.valid) {
        UserController.handleAdminError(res, adminValidation.message!);
        return;
      }

      const targetUserId = req.params.userId;
      const selfBanValidation = UserController.validateNotSelfBan(
        req.user!.userId,
        targetUserId
      );
      if (!selfBanValidation.valid) {
        UserController.handleValidationError(res, selfBanValidation.message!);
        return;
      }

      const result = await userService.updateUser(targetUserId, {
        isBanned: true,
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
      const validationResult = UserController.validateBanUserRequest(req);
      if (!validationResult.valid) {
        UserController.handleValidationError(res, validationResult.message!);
        return;
      }

      const adminValidation = await UserController.validateAdminAccess(
        req.user!.userId
      );
      if (!adminValidation.valid) {
        UserController.handleAdminError(res, adminValidation.message!);
        return;
      }

      const targetUserId = req.params.userId;
      const result = await userService.updateUser(targetUserId, {
        isBanned: false,
      });
      UserController.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(
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

      const adminValidation = await UserController.validateAdminAccess(
        req.user!.userId
      );
      if (!adminValidation.valid) {
        UserController.handleAdminError(res, adminValidation.message!);
        return;
      }

      // This would need to be implemented in the user service
      // For now, we'll return an error indicating it's not implemented
      ResponseUtil.error(
        res,
        'Not Implemented',
        'getAllUsers method not implemented yet',
        501
      );
    } catch (error) {
      next(error);
    }
  }
}

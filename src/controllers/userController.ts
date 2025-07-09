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
  async sendVerificationCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      const emailValidation = this.validateEmail(email);
      if (!emailValidation.valid) {
        ResponseUtil.badRequest(res, emailValidation.message!);
        return;
      }

      const result = await userService.sendVerificationCode(email);
      this.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async verifyCodeAndAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, code } = req.body;

      const validation = this.validateEmailAndCode(email, code);
      if (!validation.valid) {
        ResponseUtil.badRequest(res, validation.message!);
        return;
      }

      const result = await userService.verifyCodeAndAuthenticate(email, code);

      if (result.success && result.token) {
        this.setAuthCookie(res, result.token);
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

  async getCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = this.validateUserAuth(req);
      if (!authValidation.valid) {
        this.handleAuthError(res, authValidation.message);
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

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.clearAuthCookie(res);
      ResponseUtil.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async deactivateAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = this.validateUserAuth(req);
      if (!authValidation.valid) {
        this.handleAuthError(res, authValidation.message);
        return;
      }

      const result = await userService.deactivateUser(req.user!.userId);

      if (result.success) {
        this.clearAuthCookie(res);
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  }

  async updateUsername(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authValidation = this.validateUserAuth(req);
      if (!authValidation.valid) {
        this.handleAuthError(res, authValidation.message);
        return;
      }

      const { username } = req.body;
      const usernameValidation = this.validateUsername(username);

      if (!usernameValidation.valid) {
        ResponseUtil.badRequest(res, usernameValidation.message!);
        return;
      }

      const result = await userService.updateUser(req.user!.userId, {
        username: usernameValidation.trimmedUsername!,
      });

      this.handleServiceResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  private validateEmail(email: any): { valid: boolean; message?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, message: 'Email is required' };
    }
    return { valid: true };
  }

  private validateEmailAndCode(
    email: any,
    code: any
  ): { valid: boolean; message?: string } {
    if (!email || !code) {
      return { valid: false, message: 'Email and code are required' };
    }
    return { valid: true };
  }

  private validateUserAuth(req: AuthRequest): {
    valid: boolean;
    message?: string;
  } {
    if (!req.user) {
      return { valid: false, message: 'Unauthorized' };
    }
    return { valid: true };
  }

  private validateUsername(username: any): {
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

  private setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  private handleServiceResponse(
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

  private handleAuthError(
    res: Response,
    message: string = 'Unauthorized'
  ): void {
    ResponseUtil.error(res, message, message, 401);
  }
}

export const userController = new UserController();

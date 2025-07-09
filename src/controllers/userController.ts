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

export const userController = {
  // Send verification code
  async sendVerificationCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        ResponseUtil.badRequest(res, 'Email is required');
        return;
      }

      const result = await userService.sendVerificationCode(email);

      if (result.success) {
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  },

  // Verify code and authenticate
  async verifyCodeAndAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        ResponseUtil.badRequest(res, 'Email and code are required');
        return;
      }

      const result = await userService.verifyCodeAndAuthenticate(email, code);

      if (result.success && result.token) {
        // Set secure HTTP-only cookie
        res.cookie('auth_token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

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
  },

  // Get current user profile
  async getCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 'Unauthorized', 'Unauthorized', 401);
        return;
      }

      const user = await userService.getUserById(req.user.userId);

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
  },

  // Logout user
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear the auth cookie
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      ResponseUtil.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  },

  // Deactivate user account
  async deactivateAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 'Unauthorized', 'Unauthorized', 401);
        return;
      }

      const result = await userService.deactivateUser(req.user.userId);

      if (result.success) {
        // Clear the auth cookie
        res.clearCookie('auth_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });

        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  },

  // Update username
  async updateUsername(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 'Unauthorized', 'Unauthorized', 401);
        return;
      }

      const { username } = req.body;

      if (!username) {
        ResponseUtil.badRequest(res, 'Username is required');
        return;
      }

      // Validate username format (alphanumeric, 3-20 characters)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        ResponseUtil.badRequest(
          res,
          'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
        );
        return;
      }

      const result = await userService.updateUser(req.user.userId, {
        username,
      });

      if (result.success) {
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  },

  // Delete user account
  async deleteAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 'Unauthorized', 'Unauthorized', 401);
        return;
      }

      const result = await userService.deleteUser(req.user.userId);

      if (result.success) {
        // Clear the auth cookie
        res.clearCookie('auth_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });

        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      next(error);
    }
  },
};

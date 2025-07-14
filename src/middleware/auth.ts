import { Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { AuthRequest } from '@/models/requests';
import {
  UserRole,
  hasRolePermission,
  canManageRole,
  canBanUser,
} from '@/models/user';
import { logger } from '@/utils/logger';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie
    const token = req.cookies?.auth_token;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify token
    const decoded = userService.verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if user still exists and is active
    const user = await userService.getUserById(decoded.userId);
    if (!user || user.isBanned) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: user?.isBanned
          ? 'User account has been banned'
          : 'User account not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Proactively refresh token if it's close to expiring
    const refreshResult = await userService.refreshTokenIfNeeded(token);
    if (refreshResult.shouldRefresh && refreshResult.newToken) {
      // Set the new token as a secure cookie
      res.cookie('auth_token', refreshResult.newToken, {
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }
};

// Role-based middleware functions
export const requireRole = (requiredRole: UserRole) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = await userService.getUserById(req.user.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!hasRolePermission(user.role, requiredRole)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `${requiredRole} access required`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Role validation failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
};

// Convenience middleware for common roles
export const requireModerator = requireRole('moderator');
export const requireAdmin = requireRole('admin');
export const requireSuperadmin = requireRole('superadmin');

// Middleware to validate role management permissions
export const validateRoleManagement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { username, targetRole } = req.body;
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!targetRole) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Target role is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const currentUser = await userService.getUserById(req.user.userId);
    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if user is trying to modify themselves
    if (currentUser.username === username) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot update your own role',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if current user can manage the target role
    if (!canManageRole(currentUser.role, targetRole)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `You cannot manage users with role: ${targetRole}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get target user to check their current role
    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Target user not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if target user is already at or above the target role
    if (hasRolePermission(targetUser.role, targetRole)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `User is already ${targetUser.role} or higher`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Add target user to request for use in controller
    req.targetUser = targetUser;
    next();
  } catch (error) {
    logger.error('Role management validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Role management validation failed',
      timestamp: new Date().toISOString(),
    });
  }
};

// Middleware to validate ban permissions
export const validateBanPermission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { username } = req.body;
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const currentUser = await userService.getUserById(req.user.userId);
    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Target user not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!canBanUser(currentUser.role, targetUser.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `You cannot ban users with role: ${targetUser.role}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Add target user to request for use in controller
    req.targetUser = targetUser;
    next();
  } catch (error) {
    logger.error('Ban permission validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ban permission validation failed',
      timestamp: new Date().toISOString(),
    });
  }
};

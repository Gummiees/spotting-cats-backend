import { Request, Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { AuthRequest } from '@/models/requests';
import {
  UserRole,
  hasRolePermission,
  canManageRole,
  canBanUser,
  ROLE_HIERARCHY,
} from '@/models/user';

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
    console.error('Auth middleware error:', error);
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
      console.error('Role middleware error:', error);
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

    const { username, role } = req.body;
    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!role) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Role is required',
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

    // Check if current user can manage the target user's current role
    if (!canManageRole(currentUser.role, targetUser.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `You cannot manage users with role: ${targetUser.role}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if this is a promotion or demotion
    const isPromotion =
      ROLE_HIERARCHY[role as UserRole] > ROLE_HIERARCHY[targetUser.role];
    const isDemotion =
      ROLE_HIERARCHY[role as UserRole] < ROLE_HIERARCHY[targetUser.role];

    // For promotions: prevent promoting users who are already at or above the target role
    if (isPromotion && hasRolePermission(targetUser.role, role)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `User is already ${targetUser.role} or higher`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // For demotions: prevent demoting users who are already at or below the target role
    if (isDemotion && hasRolePermission(role, targetUser.role)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `User is already ${targetUser.role} or lower`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Add target user to request for use in controller
    (req as any).targetUser = targetUser;
    next();
  } catch (error) {
    console.error('Role management validation error:', error);
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
    (req as any).targetUser = targetUser;
    next();
  } catch (error) {
    console.error('Ban permission validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Ban permission validation failed',
      timestamp: new Date().toISOString(),
    });
  }
};

// Middleware to check profile access permissions
export const checkProfileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get the target user
    const targetUser = await userService.getUserByUsername(username.trim());

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if the target user is banned or inactive
    const isTargetInactive = !targetUser.isActive || targetUser.isBanned;

    if (!isTargetInactive) {
      // If target user is active and not banned, allow access to everyone
      next();
      return;
    }

    // For banned/inactive users, check the requesting user's permissions
    const token = req.cookies?.auth_token;

    if (!token) {
      // Anonymous user trying to access banned/inactive profile - return 404 for security
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify token
    const decoded = userService.verifyToken(token);
    if (!decoded) {
      // Invalid token - treat as anonymous user
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get the requesting user
    const requestingUser = await userService.getUserById(decoded.userId);
    if (!requestingUser || requestingUser.isBanned) {
      // Requesting user doesn't exist or is banned - return 404 for security
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if requesting user has elevated permissions (moderator, admin, superadmin)
    if (requestingUser.role === 'user') {
      // User with "user" role trying to access banned/inactive profile - return 404 for security
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Moderator, admin, or superadmin can access banned/inactive profiles
    next();
  } catch (error) {
    console.error('Profile access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Profile access check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

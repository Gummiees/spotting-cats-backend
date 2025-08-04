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
import { isProduction } from '@/constants/environment';

// Private helper functions
const getAuthToken = (req: AuthRequest): string | undefined => {
  return req.cookies?.auth_token;
};

const verifyAndDecodeToken = (token: string) => {
  return userService.verifyToken(token);
};

const validateUserExists = async (userId: string) => {
  const user = await userService.getUserById(userId);
  return user && !user.isBanned ? user : null;
};

const refreshTokenIfNeeded = async (token: string, res: Response) => {
  const refreshResult = await userService.refreshTokenIfNeeded(token);
  if (refreshResult.shouldRefresh && refreshResult.newToken) {
    res.cookie('auth_token', refreshResult.newToken, {
      httpOnly: true,
      secure: true,
      sameSite: isProduction(process.env.NODE_ENV || '') ? 'strict' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
  return refreshResult;
};

const setUserOnRequest = (req: AuthRequest, decoded: any) => {
  req.user = decoded;
};

const sendUnauthorizedResponse = (res: Response, message: string) => {
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message,
    timestamp: new Date().toISOString(),
  });
};

const sendForbiddenResponse = (res: Response, message: string) => {
  res.status(403).json({
    success: false,
    error: 'Forbidden',
    message,
    timestamp: new Date().toISOString(),
  });
};

const sendBadRequestResponse = (res: Response, message: string) => {
  res.status(400).json({
    success: false,
    error: 'Bad Request',
    message,
    timestamp: new Date().toISOString(),
  });
};

const sendNotFoundResponse = (res: Response, message: string) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message,
    timestamp: new Date().toISOString(),
  });
};

const sendInternalServerError = (
  res: Response,
  message: string,
  error?: any
) => {
  if (error) {
    console.error(`${message}:`, error);
  }
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message,
    timestamp: new Date().toISOString(),
  });
};

// Core authentication logic
const authenticateUser = async (
  req: AuthRequest,
  res: Response
): Promise<boolean> => {
  const token = getAuthToken(req);

  if (!token) {
    return false;
  }

  const decoded = verifyAndDecodeToken(token);
  if (!decoded) {
    return false;
  }

  const user = await validateUserExists(decoded.userId);
  if (!user) {
    return false;
  }

  await refreshTokenIfNeeded(token, res);
  setUserOnRequest(req, decoded);

  return true;
};

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAuthenticated = await authenticateUser(req, res);

    if (!isAuthenticated) {
      sendUnauthorizedResponse(res, 'Authentication required');
      return;
    }

    next();
  } catch (error) {
    sendInternalServerError(res, 'Authentication failed', error);
  }
};

// Optional authentication middleware for public endpoints
export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authenticateUser(req, res);
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
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
        sendUnauthorizedResponse(res, 'Authentication required');
        return;
      }

      const user = await userService.getUserById(req.user.userId);
      if (!user) {
        sendUnauthorizedResponse(res, 'User not found');
        return;
      }

      if (!hasRolePermission(user.role, requiredRole)) {
        sendForbiddenResponse(res, `${requiredRole} access required`);
        return;
      }

      next();
    } catch (error) {
      sendInternalServerError(res, 'Role validation failed', error);
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
      sendUnauthorizedResponse(res, 'Authentication required');
      return;
    }

    const { username, role } = req.body;
    if (!username) {
      sendBadRequestResponse(res, 'Username is required');
      return;
    }

    if (!role) {
      sendBadRequestResponse(res, 'Role is required');
      return;
    }

    const currentUser = await userService.getUserById(req.user.userId);
    if (!currentUser) {
      sendUnauthorizedResponse(res, 'User not found');
      return;
    }

    // Check if user is trying to modify themselves
    if (currentUser.username === username) {
      sendBadRequestResponse(res, 'Cannot update your own role');
      return;
    }

    // Get target user to check their current role
    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      sendNotFoundResponse(res, 'Target user not found');
      return;
    }

    // Check if current user can manage the target user's current role
    if (!canManageRole(currentUser.role, targetUser.role)) {
      sendForbiddenResponse(
        res,
        `You cannot manage users with role: ${targetUser.role}`
      );
      return;
    }

    // Check if this is a promotion or demotion
    const isPromotion =
      ROLE_HIERARCHY[role as UserRole] > ROLE_HIERARCHY[targetUser.role];
    const isDemotion =
      ROLE_HIERARCHY[role as UserRole] < ROLE_HIERARCHY[targetUser.role];

    // For promotions: prevent promoting users who are already at or above the target role
    if (isPromotion && hasRolePermission(targetUser.role, role)) {
      sendBadRequestResponse(
        res,
        `User is already ${targetUser.role} or higher`
      );
      return;
    }

    // For demotions: prevent demoting users who are already at or below the target role
    if (isDemotion && hasRolePermission(role, targetUser.role)) {
      sendBadRequestResponse(
        res,
        `User is already ${targetUser.role} or lower`
      );
      return;
    }

    // Add target user to request for use in controller
    (req as any).targetUser = targetUser;
    next();
  } catch (error) {
    sendInternalServerError(res, 'Role management validation failed', error);
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
      sendUnauthorizedResponse(res, 'Authentication required');
      return;
    }

    const { username } = req.body;
    if (!username) {
      sendBadRequestResponse(res, 'Username is required');
      return;
    }

    const currentUser = await userService.getUserById(req.user.userId);
    if (!currentUser) {
      sendUnauthorizedResponse(res, 'User not found');
      return;
    }

    const targetUser = await userService.getUserByUsername(username);
    if (!targetUser) {
      sendNotFoundResponse(res, 'Target user not found');
      return;
    }

    if (!canBanUser(currentUser.role, targetUser.role)) {
      sendForbiddenResponse(
        res,
        `You cannot ban users with role: ${targetUser.role}`
      );
      return;
    }

    // Add target user to request for use in controller
    (req as any).targetUser = targetUser;
    next();
  } catch (error) {
    sendInternalServerError(res, 'Ban permission validation failed', error);
  }
};

// Middleware to require elevated permissions (moderator, admin, superadmin)
export const requireElevatedPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorizedResponse(res, 'Authentication required');
      return;
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user || user.isBanned) {
      sendUnauthorizedResponse(
        res,
        user?.isBanned
          ? 'User account has been banned'
          : 'User account not found'
      );
      return;
    }

    // Check if user has elevated permissions (moderator, admin, superadmin)
    if (user.role === 'user') {
      sendForbiddenResponse(
        res,
        'Elevated permissions required (moderator, admin, or superadmin)'
      );
      return;
    }

    next();
  } catch (error) {
    sendInternalServerError(res, 'Elevated permissions check failed', error);
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
      sendBadRequestResponse(res, 'Username is required');
      return;
    }

    // Get the target user
    const targetUser = await userService.getUserByUsername(username.trim());

    if (!targetUser) {
      sendNotFoundResponse(res, 'User not found');
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
    const token = getAuthToken(req as AuthRequest);

    if (!token) {
      // Anonymous user trying to access banned/inactive profile - return 404 for security
      sendNotFoundResponse(res, 'User not found');
      return;
    }

    // Verify token
    const decoded = verifyAndDecodeToken(token);
    if (!decoded) {
      // Invalid token - treat as anonymous user
      sendNotFoundResponse(res, 'User not found');
      return;
    }

    // Get the requesting user
    const requestingUser = await userService.getUserById(decoded.userId);
    if (!requestingUser || requestingUser.isBanned) {
      // Requesting user doesn't exist or is banned - return 404 for security
      sendNotFoundResponse(res, 'User not found');
      return;
    }

    // Check if requesting user has elevated permissions (moderator, admin, superadmin)
    if (requestingUser.role === 'user') {
      // User with "user" role trying to access banned/inactive profile - return 404 for security
      sendNotFoundResponse(res, 'User not found');
      return;
    }

    // Moderator, admin, or superadmin can access banned/inactive profiles
    next();
  } catch (error) {
    sendInternalServerError(res, 'Profile access check failed', error);
  }
};

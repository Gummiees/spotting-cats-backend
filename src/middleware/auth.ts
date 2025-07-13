import { Request, Response, NextFunction } from 'express';
import { userService } from '@/services/userService';
import { AuthRequest } from '@/models/requests';

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

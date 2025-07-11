import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import hpp from 'hpp';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '@/config';

export const configureSecurityMiddleware = (app: Express): void => {
  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    })
  );

  // Prevent HTTP Parameter Pollution
  app.use(hpp());

  // Rate limiting - only in production
  if (config.nodeEnv === 'production') {
    app.use(rateLimit(config.security.rateLimit));

    // Slow down requests after rate limit - only in production
    app.use(slowDown(config.security.slowDown));
  }

  // Trust proxy in production (if behind reverse proxy)
  if (config.security.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Request size limits
  app.use((req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Payload too large',
        message: 'Request body exceeds maximum allowed size',
      });
      return;
    }
    next();
  });

  // Remove sensitive headers
  app.use((req: Request, res: Response, next: NextFunction): void => {
    res.removeHeader('X-Powered-By');
    next();
  });
};

// Additional security middleware for specific routes
export const strictRateLimit =
  config.nodeEnv === 'production'
    ? rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req: Request, res: Response, next: NextFunction) => next(); // No-op in non-production

export const authRateLimit =
  config.nodeEnv === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req: Request, res: Response, next: NextFunction) => next(); // No-op in non-production

export const cleanupRateLimit =
  config.nodeEnv === 'production'
    ? rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 requests per hour
        message: 'Too many cleanup operations, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req: Request, res: Response, next: NextFunction) => next(); // No-op in non-production

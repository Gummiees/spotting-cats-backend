import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import hpp from 'hpp';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export interface SecurityEvent {
  timestamp: string;
  type:
    | 'suspicious_request'
    | 'rate_limit_exceeded'
    | 'validation_failed'
    | 'authentication_failed';
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  details: Record<string, unknown>;
}

export class SecurityMonitor {
  private static suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS attempts
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)\b)/gi, // SQL/NoSQL injection attempts
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, // SQL keywords
    /(\$\{.*\})/g, // Template injection
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, // Command injection
  ];

  static isSuspiciousRequest(req: Request): boolean {
    const url = req.originalUrl.toLowerCase();
    const userAgent = (req.get('User-Agent') || '').toLowerCase();
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();

    // Check for suspicious patterns
    const allContent = `${url} ${userAgent} ${body} ${query}`;

    return this.suspiciousPatterns.some((pattern) => pattern.test(allContent));
  }

  static logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      severity: this.getSeverityLevel(event.type),
    };

    logger.warn('SECURITY EVENT:', JSON.stringify(logEntry, null, 2));

    // In a real application, you might want to:
    // - Send to a security monitoring service
    // - Store in a security log database
    // - Trigger alerts for high-severity events
  }

  private static getSeverityLevel(
    eventType: SecurityEvent['type']
  ): 'low' | 'medium' | 'high' {
    switch (eventType) {
      case 'suspicious_request':
        return 'high';
      case 'rate_limit_exceeded':
        return 'medium';
      case 'validation_failed':
        return 'low';
      case 'authentication_failed':
        return 'medium';
      default:
        return 'low';
    }
  }

  static sanitizeForLogging(data: unknown): unknown {
    if (typeof data === 'string') {
      // Remove potentially sensitive information
      return data
        .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, 'password: [REDACTED]')
        .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, 'token: [REDACTED]')
        .replace(/key["\s]*[:=]["\s]*[^"\s,}]+/gi, 'key: [REDACTED]')
        .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, 'secret: [REDACTED]');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (
          ['password', 'token', 'key', 'secret'].includes(key.toLowerCase())
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }

    return data;
  }
}

// Middleware to check for suspicious requests
export const securityCheck = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (SecurityMonitor.isSuspiciousRequest(req)) {
    SecurityMonitor.logSecurityEvent({
      timestamp: new Date().toISOString(),
      type: 'suspicious_request',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      url: req.originalUrl,
      details: {
        body: SecurityMonitor.sanitizeForLogging(req.body),
        query: SecurityMonitor.sanitizeForLogging(req.query),
      },
    });
  }
  next();
};

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

export const whitelistRoleUpdateRateLimit =
  config.nodeEnv === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1, // limit each IP to 1 request per 15 minutes
        message: 'Too many role update requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req: Request, res: Response, next: NextFunction) => next(); // No-op in non-production

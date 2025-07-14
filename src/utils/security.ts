import { Request } from 'express';

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
  details: any;
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

    console.warn('SECURITY EVENT:', JSON.stringify(logEntry, null, 2));

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

  static sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      // Remove potentially sensitive information
      return data
        .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, 'password: [REDACTED]')
        .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, 'token: [REDACTED]')
        .replace(/key["\s]*[:=]["\s]*[^"\s,}]+/gi, 'key: [REDACTED]')
        .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, 'secret: [REDACTED]');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
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
export const securityCheck = (req: Request, res: any, next: any): void => {
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

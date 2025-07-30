import { Request } from 'express';
import crypto from 'crypto';

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

/**
 * Extracts the client IP address from an Express request
 * Handles various proxy scenarios and headers
 */
export function getClientIp(req: Request): string {
  // Check for forwarded headers (when behind a proxy)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check for other common proxy headers
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // Fallback to connection remote address
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // Last resort fallback
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // If all else fails, return a placeholder
  return 'unknown';
}

// Middleware to check for suspicious requests
export const securityCheck = (req: Request, _res: any, next: any): void => {
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

// --- EMAIL ENCRYPTION (AES-256-GCM) ---
const EMAIL_ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  ? Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex')
  : undefined; // Must be 32 bytes (64 hex chars)

export function encryptEmail(email: string): string {
  if (!EMAIL_ENCRYPTION_KEY) {
    console.error('EMAIL_ENCRYPTION_KEY is not set or invalid');
    throw new Error('EMAIL_ENCRYPTION_KEY not set');
  }
  console.log('Encrypting email with key length:', EMAIL_ENCRYPTION_KEY.length);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', EMAIL_ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(email, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  const result = `${iv.toString('base64')}:${tag.toString(
    'base64'
  )}:${encrypted}`;
  console.log('Encrypted email format:', result.substring(0, 50) + '...');
  return result;
}

export function decryptEmail(encrypted: string): string {
  if (!EMAIL_ENCRYPTION_KEY) {
    console.error('EMAIL_ENCRYPTION_KEY is not set or invalid');
    throw new Error('EMAIL_ENCRYPTION_KEY not set');
  }
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Invalid encrypted email: must be a non-empty string');
  }
  console.log(
    'Attempting to decrypt email with format:',
    encrypted.substring(0, 50) + '...'
  );

  // Handle plain text emails (for users created before encryption was implemented)
  if (
    encrypted.includes('@') &&
    encrypted.includes('.') &&
    !encrypted.includes(':')
  ) {
    console.log('Email appears to be plain text, returning as-is:', encrypted);
    return encrypted;
  }

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    console.error(
      'Invalid encrypted email format: expected 3 parts, got',
      parts.length
    );
    throw new Error('Invalid encrypted email format: expected iv:tag:data');
  }
  const [iv, tag, data] = parts.map((x) => Buffer.from(x, 'base64'));
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    EMAIL_ENCRYPTION_KEY,
    iv
  );
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data).toString('utf8');
  decrypted += decipher.final('utf8');
  console.log('Successfully decrypted email:', decrypted);
  return decrypted;
}

// --- IP HASHING (HMAC-SHA256) ---
const IP_HASH_KEY = process.env.IP_HASH_KEY
  ? Buffer.from(process.env.IP_HASH_KEY, 'hex')
  : undefined; // Must be 32 bytes (64 hex chars)

export function hashIp(ip: string): string {
  if (!IP_HASH_KEY) throw new Error('IP_HASH_KEY not set');
  return crypto.createHmac('sha256', IP_HASH_KEY).update(ip).digest('hex');
}

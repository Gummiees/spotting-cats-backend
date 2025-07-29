import dotenv from 'dotenv';
import {
  NODE_ENV,
  isProduction,
  isDevelopment,
  isStaging,
} from '@/constants/environment';

dotenv.config();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [];

// Parse admin email whitelist from environment variable
const adminEmailWhitelist = process.env.ADMIN_EMAIL_WHITELIST
  ? process.env.ADMIN_EMAIL_WHITELIST.split(',').map((email) =>
      email.trim().toLowerCase()
    )
  : [];

// Parse superadmin email whitelist from environment variable
const superadminEmailWhitelist = process.env.SUPERADMIN_EMAIL_WHITELIST
  ? process.env.SUPERADMIN_EMAIL_WHITELIST.split(',').map((email) =>
      email.trim().toLowerCase()
    )
  : [];

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  admin: {
    emailWhitelist: adminEmailWhitelist,
    superadminEmailWhitelist: superadminEmailWhitelist,
  },
  cors: {
    origin: function (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      // In production, be more restrictive
      if (isProduction(process.env.NODE_ENV || '')) {
        if (!origin) {
          return callback(new Error('Origin not allowed in production'));
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'));
        }
      }

      // Allow all origins for development/staging environment
      if (
        isStaging(process.env.NODE_ENV || '') ||
        isDevelopment(process.env.NODE_ENV || '')
      ) {
        return callback(null, true);
      }

      // Default: be restrictive
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as string[],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ] as string[],
    maxAge: 86400, // 24 hours
  },
  api: {
    prefix: '/api',
    version: 'v1',
  },
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs (only used in production)
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    slowDown: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes, then...
      delayMs: () => 500, // begin adding 500ms of delay per request above 50 (only used in production)
    },
    requestSizeLimit: '10mb',
    trustProxy:
      isProduction(process.env.NODE_ENV || '') ||
      process.env.TRUST_PROXY === 'true',
  },
} as const;

export type Config = typeof config;

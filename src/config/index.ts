import dotenv from 'dotenv';

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
  catApi: {
    apiKey: process.env.CAT_API_KEY || '',
    enabled: process.env.USE_CAT_API === 'true',
  },
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
      if (process.env.NODE_ENV === 'production') {
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
        process.env.NODE_ENV === 'staging' ||
        process.env.NODE_ENV === 'development'
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
      process.env.NODE_ENV === 'production' ||
      process.env.TRUST_PROXY === 'true',
  },
} as const;

export type Config = typeof config;

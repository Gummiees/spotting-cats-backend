import 'module-alias/register';
import { config } from '@/config';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { configureSecurityMiddleware } from '@/middleware/security';
import { securityCheck } from '@/utils/security';
import routes from '@/routes';
import swaggerMiddleware from '@/middleware/swagger';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import { cleanupService } from '@/services/cleanupService';
import { connectToRedis, isRedisConfigured } from '@/utils/redis';
import { connectToMongo, isMongoConfigured } from '@/utils/mongo';
import { nsfwService } from '@/services/nsfwService';
import { cloudinaryService } from '@/services/cloudinaryService';

const app = express();

// Initialize Redis connection early
async function initializeServices() {
  try {
    // Initialize cleanup service (cron jobs)
    cleanupService.initialize();

    // Initialize MongoDB if configured
    if (isMongoConfigured()) {
      await connectToMongo();
      console.log('✅ MongoDB initialized successfully');
    } else {
      console.log('⚠️  MongoDB not configured');
    }

    // Initialize Redis if configured
    if (isRedisConfigured()) {
      await connectToRedis();
      console.log('✅ Redis initialized successfully');
    } else {
      console.log('⚠️  Redis not configured, running without cache');
    }

    // Initialize NSFW model
    await nsfwService.loadModel();

    // Initialize Cloudinary service
    if (cloudinaryService.isReady()) {
      console.log('✅ Cloudinary service initialized successfully');
    } else {
      console.log('⚠️ Cloudinary service not configured');
    }
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    // Don't throw here - allow the app to start even if services fail
  }
}

// Initialize services
initializeServices();

// Security middleware (must be first)
configureSecurityMiddleware(app);

// CORS configuration
app.use(cors(config.cors));

// Body parsing middleware - only for non-multipart requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'];

  console.log('🔍 Body parsing middleware - Content-Type:', contentType);

  // Skip body parsing for multipart requests
  if (contentType && contentType.includes('multipart/form-data')) {
    console.log('✅ Skipping body parsing for multipart request');
    return next();
  }

  console.log('📝 Applying JSON parsing for non-multipart request');
  // Apply JSON parsing for non-multipart requests
  express.json({ limit: config.security.requestSizeLimit })(req, res, next);
});

// URL-encoded parsing - only for non-multipart requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'];

  // Skip body parsing for multipart requests
  if (contentType && contentType.includes('multipart/form-data')) {
    return next();
  }

  // Apply URL-encoded parsing for non-multipart requests
  express.urlencoded({
    extended: true,
    limit: config.security.requestSizeLimit,
  })(req, res, next);
});

// Cookie parser middleware
app.use(cookieParser());

// Swagger documentation
app.use('/api-docs', swaggerMiddleware);

// Security monitoring middleware
app.use(securityCheck);

// Request logging middleware (for security monitoring)
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  console.log(
    `${timestamp} - ${req.method} ${req.originalUrl} - IP: ${ip} - UA: ${userAgent}`
  );
  next();
});

// Routes
app.use('/', routes);

// 404 handler
app.use('/*splat', notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;

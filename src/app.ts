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

// Body parsing middleware with limits
app.use(express.json({ limit: config.security.requestSizeLimit }));
app.use(
  express.urlencoded({
    extended: true,
    limit: config.security.requestSizeLimit,
  })
);

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
app.use('*', notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;

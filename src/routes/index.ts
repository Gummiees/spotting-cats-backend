import { config } from '@/config';
import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';
import healthRoutes from './healthRoutes';
import helloRoutes from './helloRoutes';
import catRoutes from './catRoutes';
import cacheRoutes from './cacheRoutes';

const router = Router();

// Root route
router.get('/', HelloController.getWelcome);

// API routes
router.use(`${config.api.prefix}/health`, healthRoutes);
router.use(`${config.api.prefix}/hello`, helloRoutes);
router.use(`${config.api.prefix}/cats`, catRoutes);
router.use(`${config.api.prefix}/cache`, cacheRoutes);

export default router;

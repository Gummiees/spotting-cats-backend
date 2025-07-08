import { config } from '@/config';
import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';
import catRoutes from './catRoutes';
import healthRoutes from './healthRoutes';
import helloRoutes from './helloRoutes';

const router = Router();

// Root route
router.get('/', HelloController.getWelcome);

// API routes
router.use(`${config.api.prefix}/health`, healthRoutes);
router.use(`${config.api.prefix}/hello`, helloRoutes);
router.use(`${config.api.prefix}/cats`, catRoutes);

export default router;

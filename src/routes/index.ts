import { config } from '@/config';
import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';
import healthRoutes from './healthRoutes';
import helloRoutes from './helloRoutes';

const router = Router();

// Root route
router.get('/', HelloController.getWelcome);

// API routes
router.use(`${config.api.prefix}/health`, healthRoutes);
router.use(`${config.api.prefix}/hello`, helloRoutes);

export default router;

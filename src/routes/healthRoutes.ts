import { HealthController } from '@/controllers/healthController';
import { Router } from 'express';

const router = Router();

router.get('/', HealthController.getHealth);
router.get('/detailed', HealthController.getDetailedHealth);
router.get('/database', HealthController.getDatabaseStatus);

export default router;

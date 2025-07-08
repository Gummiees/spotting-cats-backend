import { HelloController } from '@/controllers/helloController';
import { Router } from 'express';

const router = Router();

router.get('/', HelloController.getHello);
router.get('/welcome', HelloController.getWelcome);

export default router;

import { Router } from 'express';
import { userController } from '@/controllers/userController';
import { authRateLimit } from '@/middleware/security';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.post('/send-code', authRateLimit, userController.sendVerificationCode);
router.post(
  '/verify-code',
  authRateLimit,
  userController.verifyCodeAndAuthenticate
);
router.post('/logout', userController.logout);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, userController.getCurrentUser);
router.post('/deactivate', authMiddleware, userController.deactivateAccount);
router.delete('/account', authMiddleware, userController.deleteAccount);

export { router as userRoutes };

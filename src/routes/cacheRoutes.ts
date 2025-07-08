import { Router } from 'express';
import { CacheController } from '@/controllers/cacheController';

const router = Router();

router.post('/flush', CacheController.flushCache);
router.get('/:key', CacheController.getCacheInfo);
router.post('/:key', CacheController.setCache);
router.delete('/:key', CacheController.deleteCache);

export default router;

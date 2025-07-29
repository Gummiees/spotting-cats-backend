import { Router } from 'express';
import { AlgoliaController } from '@/controllers/algoliaController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

// Index all cats from database to Algolia (requires authentication, only in non-production)
router.post('/index', authMiddleware, AlgoliaController.indexAllCats);

// Search cats using Algolia (public endpoint)
router.get('/search', AlgoliaController.searchCats);

// Clear Algolia index (requires authentication, only in non-production)
router.delete('/clear', authMiddleware, AlgoliaController.clearIndex);

// Get Algolia index statistics (public endpoint)
router.get('/stats', AlgoliaController.getIndexStats);

export default router;

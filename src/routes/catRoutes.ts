import { Router } from 'express';
import { CatController } from '@/controllers/catController';
import {
  createCatValidation,
  updateCatValidation,
  getCatByIdValidation,
  deleteCatValidation,
  sanitizeQueryParams,
} from '@/middleware/validation';

const router = Router();

// Apply query sanitization to all routes
router.use(sanitizeQueryParams);

router.post('/', createCatValidation, CatController.create);
router.get('/', CatController.getAll);
router.get('/:id', getCatByIdValidation, CatController.getById);
router.put('/:id', updateCatValidation, CatController.update);
router.delete('/:id', deleteCatValidation, CatController.delete);

export default router;

import { Router } from 'express';
import { CatController } from '@/controllers/catController';

const router = Router();

router.post('/', CatController.create);
router.get('/', CatController.getAll);
router.get('/:id', CatController.getById);
router.put('/:id', CatController.update);
router.delete('/:id', CatController.delete);

export default router;

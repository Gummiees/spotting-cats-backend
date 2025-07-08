import { CatController } from '@/controllers/catController';
import { Router } from 'express';

const router = Router();

router.post('/', CatController.create);
router.get('/', CatController.getAll);
router.get('/:id', CatController.getById);
router.put('/:id', CatController.update);
router.delete('/:id', CatController.delete);

export default router;

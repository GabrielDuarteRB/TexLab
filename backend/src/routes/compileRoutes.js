import { Router } from 'express';
import * as compileController from '../controllers/compileController.js';

const router = Router();

router.post('/:id/compile', compileController.compile);
router.get('/:id/pdf', compileController.getPdf);
router.get('/:id/log', compileController.getLog);

export default router;

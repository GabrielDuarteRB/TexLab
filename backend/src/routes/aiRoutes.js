import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

const router = Router();

router.post('/suggest', aiController.suggest);
router.post('/review', aiController.review);
router.post('/ltex-check', aiController.ltexCheck);
router.post('/explain-latex-error', aiController.explainError);
router.get('/status', aiController.aiStatus);
router.get('/academic-status', aiController.academicStatus);
router.get('/ltex-status', aiController.ltexStatus);

export default router;

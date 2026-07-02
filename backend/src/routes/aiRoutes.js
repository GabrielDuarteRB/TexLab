import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

const router = Router();

router.post('/suggest', aiController.suggest);
router.post('/review', aiController.review);
router.get('/status', aiController.aiStatus);
router.get('/academic-status', aiController.academicStatus);

export default router;

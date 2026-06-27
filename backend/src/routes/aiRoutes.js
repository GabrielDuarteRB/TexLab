import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

const router = Router();

router.post('/suggest', aiController.suggest);
router.get('/status', aiController.aiStatus);

export default router;

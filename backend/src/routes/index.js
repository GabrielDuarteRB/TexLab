import { Router } from 'express';
import projectRoutes from './projectRoutes.js';
import compileRoutes from './compileRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/projects', compileRoutes);
router.use('/ai', aiRoutes);

export default router;

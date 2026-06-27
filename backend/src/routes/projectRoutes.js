import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/files/:filename', projectController.readFile);
router.put('/:id/files/:filename', projectController.writeFile);
router.post('/:id/files', upload.single('file'), projectController.uploadFile);

export default router;

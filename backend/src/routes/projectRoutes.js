import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const router = Router();

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.post('/import', uploadImport.any(), projectController.importProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/files/*', projectController.readFile);
router.put('/:id/files/*', projectController.writeFile);
router.delete('/:id/files/*', projectController.deleteFile);
router.patch('/:id/rename', projectController.renameFile);
router.post('/:id/folders', projectController.createFolder);
router.post('/:id/files', upload.single('file'), projectController.uploadFile);

export default router;

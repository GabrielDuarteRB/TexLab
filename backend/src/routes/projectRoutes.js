import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const router = Router();

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.post('/import', uploadImport.any(), projectController.importProject);
router.post('/clone', projectController.cloneProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/files/*', projectController.readFile);
router.put('/:id/files/*', projectController.writeFile);
router.delete('/:id/files/*', projectController.deleteFile);
router.patch('/:id/rename', projectController.renameFile);
router.post('/:id/folders', projectController.createFolder);
router.post('/:id/files', upload.single('file'), projectController.uploadFile);
router.get('/:id/image-folders', projectController.getImageFolders);
router.post('/:id/image-folders/default', projectController.createDefaultImageFolder);
router.post('/:id/image-folders/resolve', projectController.resolveImagePath);

export default router;

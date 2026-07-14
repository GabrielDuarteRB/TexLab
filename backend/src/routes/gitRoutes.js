import { Router } from 'express';
import * as ctrl from '../controllers/gitController.js';

const router = Router({ mergeParams: true });

router.post('/init', ctrl.init);
router.get('/status', ctrl.status);
router.get('/config', ctrl.config);
router.get('/branches', ctrl.listBranches);
router.post('/branches', ctrl.createBranch);
router.post('/fetch', ctrl.fetch);
router.post('/checkout', ctrl.checkout);
router.post('/commit', ctrl.commit);
router.post('/push', ctrl.push);
router.post('/pull', ctrl.pull);
router.post('/merge', ctrl.merge);
router.get('/log', ctrl.log);
router.get('/diff/files', ctrl.diffFiles);
router.get('/diff/file', ctrl.diffFile);
router.get('/diff/commit', ctrl.diffCommit);
router.post('/discard', ctrl.discard);

export default router;

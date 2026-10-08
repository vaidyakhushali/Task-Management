import { Router } from 'express';
import {
  createProject,
  deleteProject,
  listDeletedProjects,
  listProjects,
  restoreProject,
} from '../controllers/projects.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyAccessToken);
router.get('/', listProjects);
router.get('/deleted', listDeletedProjects);
router.post('/', createProject);
router.delete('/:projectId', deleteProject);
router.patch('/:projectId/restore', restoreProject);

export default router;
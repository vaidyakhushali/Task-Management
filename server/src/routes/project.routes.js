import { Router } from 'express';
import { createProject, listProjects } from '../controllers/projects.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyAccessToken);
router.get('/', listProjects);
router.post('/', createProject);

export default router;
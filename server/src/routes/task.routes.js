import { Router } from 'express';
import {
  createTask,
  deleteTask,
  listAllTasksForAdmin,
  listDeletedTasks,
  listTasks,
  restoreTask,
  updateTask,
} from '../controllers/tasks.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyAccessToken);
router.get('/', listTasks);
router.get('/admin-overview', listAllTasksForAdmin);
router.get('/deleted', listDeletedTasks);
router.patch('/:taskId/restore', restoreTask);
router.post('/', createTask);
router.patch('/:taskId', updateTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

export default router;

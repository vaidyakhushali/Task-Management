import { Router } from 'express';
import { addTaskComment, createTask, deleteTask, getAdminMetrics, listAllTasksForAdmin, listTaskComments, listTasks, updateTask } from '../controllers/tasks.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyAccessToken);
router.get('/', listTasks);
router.get('/admin-overview', listAllTasksForAdmin);
router.get('/admin-metrics', getAdminMetrics);
router.get('/:taskId/comments', listTaskComments);
router.post('/:taskId/comments', addTaskComment);
router.post('/', createTask);
router.patch('/:taskId', updateTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

export default router;

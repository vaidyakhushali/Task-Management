import { Router } from 'express';
import { changePassword, getWorkspaceSettings, listAdminChat, listAdminUsers, listAssignableUsers, listChat, loginUser, logoutUser, registerUser, sendAdminChat, sendChat, updateProfile, updateWorkspaceSettings } from '../controllers/users.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/assignable', verifyAccessToken, listAssignableUsers);
router.get('/admin-overview', verifyAccessToken, listAdminUsers);
router.get('/admin-overview/:userId/chat', verifyAccessToken, listAdminChat);
router.post('/admin-overview/:userId/chat', verifyAccessToken, sendAdminChat);
router.get('/:userId/chat', verifyAccessToken, listChat);
router.post('/:userId/chat', verifyAccessToken, sendChat);
router.get('/workspace', verifyAccessToken, getWorkspaceSettings);
router.patch('/profile', verifyAccessToken, updateProfile);
router.patch('/workspace', verifyAccessToken, updateWorkspaceSettings);
router.patch('/password', verifyAccessToken, changePassword);

export default router;

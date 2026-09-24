import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { ChatMessage } from '../models/chat.model.js';
import { Notification } from '../models/notification.model.js';

function sendError(res, status, message) {
    return res
    .status(status)
    .json(
        { 
            success: false, 
            message 
        });
}

function publicUser(user) {
    return {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
    };
}

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    };
}

async function createTokens(user) {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
}

export async function registerUser(req, res) {
    const { fullname, email, username, password } = req.body;
    if (!fullname || !email || !username || !password) return sendError(res, 400, 'All fields are required');
    if (password.length < 6) return sendError(res, 400, 'Password must be at least 6 characters');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return sendError(res, 400, 'Password must contain at least one letter and one number');
    }

    // New accounts via public registration always default to User role
    const role = 'User';

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existingUser) 
        return sendError(res, 409, 'Email or username already exists');

    const user = await User.create({ fullname, email, username, password, role });
    const { accessToken, refreshToken } = await createTokens(user);
    return res
    .status(201)
    .cookie('accessToken', accessToken, cookieOptions())
    .cookie('refreshToken', refreshToken, cookieOptions())
    .json(
        { 
            success: true, 
            message: 'User registered successfully', 
            data: { 
                user: publicUser(user), accessToken
            } 
        });
}

export async function loginUser(req, res) {
    const { email, username, password, role } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();
    if (!identifier || !password) 
        return sendError(res, 400, 'Email and password are required');

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return sendError(res, 401, 'Invalid email or password');
    if (role && user.role !== role) 
        return sendError(res, 403, `This account is not a ${role} account`);

    user.lastLoginAt = new Date();
    const { accessToken, refreshToken } = await createTokens(user);
    return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions())
        .cookie('refreshToken', refreshToken, cookieOptions())
        .json(
            { 
                success: true, 
                message: 'Login successful', 
                data: { 
                    user: publicUser(user), accessToken 
                } 
            });
}

export async function listAssignableUsers(req, res) {
    const users = await User.find({}, 'fullname username email role').sort({ fullname: 1 });
    return res.status(200).json({ success: true, data: users });
}

export async function listAdminUsers(req, res) {
    if (req.user.role !== 'Admin') return sendError(res, 403, 'Only admins can view all users');
    const users = await User.find({}, 'fullname username email role lastLoginAt createdAt').sort({ fullname: 1 });
    return res.status(200).json({ success: true, data: users });
}

export async function listAdminChat(req, res) {
    if (req.user.role !== 'Admin' || !mongoose.isValidObjectId(req.params.userId)) return sendError(res, 403, 'Only admins can open user chats');
    const user = await User.findById(req.params.userId, '_id');
    if (!user) return sendError(res, 404, 'User not found');
    const messages = await ChatMessage.find({
        $or: [
            { sender: req.user._id, recipient: user._id },
            { sender: user._id, recipient: req.user._id },
        ],
    }).populate('sender', 'fullname role').sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: messages });
}

export async function sendAdminChat(req, res) {
    if (req.user.role !== 'Admin' || !mongoose.isValidObjectId(req.params.userId)) return sendError(res, 403, 'Only admins can send user chats');
    const message = String(req.body.message || '').trim();
    if (!message) return sendError(res, 400, 'Message is required');
    const user = await User.findById(req.params.userId, '_id');
    if (!user) return sendError(res, 404, 'User not found');
    const chatMessage = await ChatMessage.create({ sender: req.user._id, recipient: user._id, message });
    await chatMessage.populate('sender', 'fullname role');
    return res.status(201).json({ success: true, data: chatMessage });
}

export async function listChat(req, res) {
    if (!mongoose.isValidObjectId(req.params.userId)) return sendError(res, 400, 'Invalid user id');
    const user = await User.findById(req.params.userId, '_id');
    if (!user) return sendError(res, 404, 'User not found');
    const messages = await ChatMessage.find({
        $or: [
            { sender: req.user._id, recipient: user._id },
            { sender: user._id, recipient: req.user._id },
        ],
    }).populate('sender', 'fullname role').sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: messages });
}

export async function sendChat(req, res) {
    if (!mongoose.isValidObjectId(req.params.userId)) return sendError(res, 400, 'Invalid user id');
    const message = String(req.body.message || '').trim();
    if (!message) return sendError(res, 400, 'Message is required');
    const user = await User.findById(req.params.userId, '_id');
    if (!user) return sendError(res, 404, 'User not found');
    const chatMessage = await ChatMessage.create({ sender: req.user._id, recipient: user._id, message });
    await chatMessage.populate('sender', 'fullname role');

    // Send Notification to recipient
    try {
        await Notification.create({
            recipient: user._id,
            actor: req.user._id,
            title: `New Message from ${req.user.fullname || req.user.username || 'User'}`,
            message: `${req.user.fullname || req.user.username || 'User'} sent a message: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`,
            type: 'chat',
        });
    } catch (notifErr) {
        console.error('Error creating chat notification:', notifErr.message);
    }

    return res.status(201).json({ success: true, data: chatMessage });
}

export async function getWorkspaceSettings(req, res) {
    const admin = await User.findOne({ role: 'Admin' }, 'workspaceName');
    return res.status(200).json({ success: true, data: { workspaceName: admin?.workspaceName || 'Task Manager' } });
}

export async function updateProfile(req, res) {
    const fullname = String(req.body.fullname || '').trim();
    if (!fullname) return sendError(res, 400, 'Full name is required');
    if (fullname.length > 80) return sendError(res, 400, 'Full name must be 80 characters or fewer');

    req.user.fullname = fullname;
    await req.user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, data: { fullname } });
}

export async function updateWorkspaceSettings(req, res) {
    const workspaceName = String(req.body.workspaceName || '').trim();
    if (!workspaceName) return sendError(res, 400, 'Workspace name is required');
    if (workspaceName.length > 60) return sendError(res, 400, 'Workspace name must be 60 characters or fewer');

    const workspaceOwner = await User.findOneAndUpdate(
        { role: 'Admin' },
        { workspaceName },
        { new: true, runValidators: true },
    );
    if (!workspaceOwner) return sendError(res, 404, 'Workspace owner not found');
    return res.status(200).json({ success: true, data: { workspaceName } });
}

export async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return sendError(res, 400, 'Current and new passwords are required');
    if (newPassword.length < 6) return sendError(res, 400, 'New password must be at least 6 characters');
    const account = await User.findById(req.user._id);
    if (!account || !(await bcrypt.compare(currentPassword, account.password))) return sendError(res, 401, 'Current password is incorrect');

    account.password = newPassword;
    account.refreshToken = null;
    await account.save();
    return res.status(200).json({ success: true, message: 'Password changed successfully' });
}

export async function logoutUser(req, res) {
    const token = req.cookies?.refreshToken;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
            await User.findByIdAndUpdate(decoded._id, { $unset: { refreshToken: 1 } });
        } catch (error) {
            // Cookies are cleared even when the stored refresh token has expired.
        }
    }

    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions())
        .clearCookie('refreshToken', cookieOptions())
        .json({ success: true, message: 'Logged out successfully' });
}

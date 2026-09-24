import mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

export async function listNotifications(req, res) {
    let notifications = await Notification.find({ recipient: req.user._id })
        .populate('actor', 'fullname role')
        .populate('task', 'title description status priority dueDate')
        .sort({ createdAt: -1 })
        .limit(50);

    if (notifications.length === 0) {
        try {
            const welcomeNotice = await Notification.create({
                recipient: req.user._id,
                actor: req.user._id,
                title: 'Welcome to Task Manager',
                message: `Welcome ${req.user.fullname || req.user.username || 'Team Member'}! Your workspace notifications, task assignments, and comment alerts will appear here.`,
                type: 'workspace',
                read: false,
            });
            notifications = [welcomeNotice];
        } catch (e) {
            // Fall back to empty array if seed fails
        }
    }

    return res.status(200).json({ success: true, data: notifications });
}
export async function markNotificationRead(req, res) {
    if (!mongoose.isValidObjectId(req.params.notificationId)) return sendError(res, 400, 'Invalid notification id');
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.notificationId, recipient: req.user._id },
        { read: true },
        { new: true },
    );
    if (!notification) return sendError(res, 404, 'Notification not found');
    return res
    .status(200)
    .json(
        { 
            success: true, 
            data: notification 
        }
    );
}

export async function markAllNotificationsRead(req, res) {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    return res
    .status(200)
    .json(
        {
             success: true, 
             message: 'Notifications marked as read' 
        }
    );
}
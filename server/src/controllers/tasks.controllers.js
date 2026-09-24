import mongoose from 'mongoose';
import { Task } from '../models/task.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';
import { Comment } from '../models/comment.model.js';
import { Project } from '../models/project.model.js';

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

function taskResponse(task) {
    return task.toObject ? task.toObject() : task;
}

export async function listTasks(req, res) {
    let query = {};
    if (req.user.role !== 'Admin') {
        query = { $or: [{ owner: req.user._id }, { assignedUser: req.user._id }, { creator: req.user._id }] };
    }

    const tasks = await Task
        .find(query)
        .populate('creator', 'fullname username email role')
        .populate('assignedUser', 'fullname username email role')
        .populate('project', 'name')
        .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: tasks });
}

export async function listAllTasksForAdmin(req, res) {
    if (req.user.role !== 'Admin') return sendError(res, 403, 'Only admins can view all tasks');
    const tasks = await Task
        .find({})
        .populate('creator', 'fullname username email role')
        .populate('assignedUser', 'fullname username email role')
        .populate('project', 'name')
        .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: tasks });
}

export async function getAdminMetrics(req, res) {
    if (req.user.role !== 'Admin') return sendError(res, 403, 'Only admins can view admin metrics');

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    const completedTasks = await Task.countDocuments({ status: 'completed' });

    // Team workload per user
    const users = await User.find({ role: 'User' }, 'fullname username email role');
    const tasks = await Task.find({}).populate('assignedUser', 'fullname username');

    const workloadMap = new Map();
    users.forEach((u) => {
        workloadMap.set(String(u._id), {
            id: u._id,
            name: u.fullname || u.username,
            email: u.email,
            assignedCount: 0,
            pendingCount: 0,
            inProgressCount: 0,
            completedCount: 0,
        });
    });

    tasks.forEach((t) => {
        if (t.assignedUser && workloadMap.has(String(t.assignedUser._id))) {
            const userStats = workloadMap.get(String(t.assignedUser._id));
            userStats.assignedCount += 1;
            if (t.status === 'completed') userStats.completedCount += 1;
            else if (t.status === 'in-progress') userStats.inProgressCount += 1;
            else userStats.pendingCount += 1;
        }
    });

    const teamWorkload = Array.from(workloadMap.values());

    return res.status(200).json({
        success: true,
        data: {
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            teamWorkload,
        }
    });
}

export async function createTask(req, res) {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
        return sendError(res, 403, 'Only admins can create and assign tasks');
    }

    const title = req.body.title?.trim();
    if (!title) return sendError(res, 400, 'Task title is required');

    const requestedAssignee = req.body.assignedUser || req.body.assignedTo;
    if (!requestedAssignee) return sendError(res, 400, 'Please select a user to assign the task to');
    if (!mongoose.isValidObjectId(requestedAssignee)) {
        return sendError(res, 400, 'Invalid assignee user ID');
    }

    const assignee = await User.findById(requestedAssignee, 'fullname username email role');
    if (!assignee) return sendError(res, 404, 'Assigned user not found');

    let dueDate = null;
    if (req.body.dueDate) {
        dueDate = new Date(req.body.dueDate);
    }

    let projectId = null;
    if (req.body.project) {
        if (!mongoose.isValidObjectId(req.body.project)) {
            return sendError(res, 400, 'Invalid project ID');
        }

        const project = await Project.findById(req.body.project);
        if (!project) return sendError(res, 404, 'Project not found');

        projectId = project._id;
    }

    const task = await Task.create({
        title,
        description: req.body.description || '',
        taskType: String(req.body.taskType || 'Standard').trim(),
        budget: Number(req.body.budget || 0),
        cost: Number(req.body.cost || 0),
        priority: req.body.priority ? String(req.body.priority).toLowerCase() : 'medium',
        status: req.body.status ? String(req.body.status).toLowerCase().replace(' ', '-') : 'pending',
        completed: req.body.status === 'completed' || req.body.status === 'Completed',
        dueDate,
        creator: req.user._id,
        owner: req.user._id,
        assignedUser: assignee._id,
        project: projectId,
    });

    if (projectId) {
        await Project.findByIdAndUpdate(projectId, {
            $addToSet: { members: { $each: [req.user._id, assignee._id] } },
        });
    }

    // Create notification pop-up trigger for assigned user
    await Notification.create({
        recipient: assignee._id,
        actor: req.user._id,
        task: task._id,
        title: 'New Task Assigned',
        message: `${req.user.fullname || 'Admin'} assigned you "${task.title}".`,
        type: 'task',
    });

    const populatedTask = await Task.findById(task._id)
        .populate('creator', 'fullname username email role')
        .populate('assignedUser', 'fullname username email role')
        .populate('project', 'name');

    return res.status(201).json({
        success: true,
        message: 'Task created and assigned successfully',
        data: taskResponse(populatedTask),
    });
}

export async function listTaskComments(req, res) {
    if (!mongoose.isValidObjectId(req.params.taskId)) return sendError(res, 400, 'Invalid task id');

    const task = await Task.findById(req.params.taskId);
    if (!task) return sendError(res, 404, 'Task not found');

    const isAssignee = String(task.assignedUser) === String(req.user._id);
    const isCreator = String(task.creator) === String(req.user._id) || String(task.owner) === String(req.user._id);
    const isAdmin = ['Admin', 'Manager'].includes(req.user.role);

    if (!isAdmin && !isAssignee && !isCreator) {
        return sendError(res, 403, 'Access denied: Task comments are private between assigned user and admin');
    }

    const comments = await Comment.find({ task: req.params.taskId })
        .populate('user', 'fullname username role email')
        .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: comments });
}

export async function addTaskComment(req, res) {
    if (!mongoose.isValidObjectId(req.params.taskId)) return sendError(res, 400, 'Invalid task id');

    const message = String(req.body.message || '').trim();
    if (!message) return sendError(res, 400, 'Comment text is required');

    const task = await Task.findById(req.params.taskId);
    if (!task) return sendError(res, 404, 'Task not found');

    const isAssignee = String(task.assignedUser) === String(req.user._id);
    const isCreator = String(task.creator) === String(req.user._id) || String(task.owner) === String(req.user._id);
    const isAdmin = ['Admin', 'Manager'].includes(req.user.role);

    if (!isAdmin && !isAssignee && !isCreator) {
        return sendError(res, 403, 'Access denied: Task comments are private between assigned user and admin');
    }

    const comment = await Comment.create({
        task: req.params.taskId,
        user: req.user._id,
        message,
    });

    await comment.populate('user', 'fullname username role email');

    // Notify task assignee, creator, owner, and all Admin users when someone comments
    const recipientIds = new Set();
    if (task.assignedUser) recipientIds.add(String(task.assignedUser));
    if (task.creator) recipientIds.add(String(task.creator));
    if (task.owner) recipientIds.add(String(task.owner));

    // If sender is not Admin, or to ensure Admin always gets notified of user messages:
    const admins = await User.find({ role: 'Admin' }, '_id');
    admins.forEach((adm) => recipientIds.add(String(adm._id)));

    // Remove sender from recipients list
    recipientIds.delete(String(req.user._id));

    for (const recipientId of recipientIds) {
        try {
            await Notification.create({
                recipient: recipientId,
                actor: req.user._id,
                task: task._id,
                title: 'New Comment on Task',
                message: `${req.user.fullname || req.user.username || 'User'} messaged on "${task.title}": "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`,
                type: 'comment',
            });
        } catch (notifErr) {
            console.error('Error creating task comment notification:', notifErr.message);
        }
    }

    return res.status(201).json({ success: true, data: comment });
}

export async function updateTask(req, res) {
    if (!mongoose.isValidObjectId(req.params.taskId)) return sendError(res, 400, 'Invalid task id');

    let taskQuery = { _id: req.params.taskId };
    if (req.user.role !== 'Admin') {
        taskQuery.$or = [{ owner: req.user._id }, { assignedUser: req.user._id }, { creator: req.user._id }];
    }

    const task = await Task.findOne(taskQuery);
    if (!task) return sendError(res, 404, 'Task not found or permission denied');

    const updates = {};
    if (typeof req.body.title === 'string' && req.body.title.trim()) updates.title = req.body.title.trim();
    if (typeof req.body.description === 'string') updates.description = req.body.description;

    if (req.body.status) {
        const statusMap = {
            'pending': 'pending',
            'Pending': 'pending',
            'in-progress': 'in-progress',
            'In Progress': 'in-progress',
            'completed': 'completed',
            'Completed': 'completed',
        };
        const s = statusMap[req.body.status] || req.body.status.toLowerCase();
        if (['pending', 'in-progress', 'completed'].includes(s)) {
            updates.status = s;
            updates.completed = s === 'completed';
        }
    }

    if (typeof req.body.completed === 'boolean') {
        updates.completed = req.body.completed;
        updates.status = req.body.completed ? 'completed' : 'pending';
    }

    if (['low', 'medium', 'high', 'Low', 'Medium', 'High'].includes(req.body.priority)) {
        updates.priority = req.body.priority.toLowerCase();
    }

    if (req.user.role === 'Admin' && req.body.assignedUser && mongoose.isValidObjectId(req.body.assignedUser)) {
        updates.assignedUser = req.body.assignedUser;
    }

    const updatedTask = await Task.findByIdAndUpdate(
        task._id,
        updates,
        { new: true, runValidators: true }
    )
    .populate('creator', 'fullname username email role')
    .populate('assignedUser', 'fullname username email role');

    return res.status(200).json({ success: true, data: taskResponse(updatedTask) });
}

export async function deleteTask(req, res) {
    if (!mongoose.isValidObjectId(req.params.taskId)) return sendError(res, 400, 'Invalid task id');
    if (req.user.role !== 'Admin') return sendError(res, 403, 'Only admins can delete tasks');

    const task = await Task.findByIdAndDelete(req.params.taskId);
    if (!task) return sendError(res, 404, 'Task not found');

    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
}

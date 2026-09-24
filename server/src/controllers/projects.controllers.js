import { Project } from '../models/project.model.js';
import { Task } from '../models/task.model.js';

function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

export async function listProjects(req, res) {
    let projectFilter = {};

    if (req.user.role !== 'Admin') {
        const assignedProjectIds = await Task.distinct('project', {
            $or: [{ owner: req.user._id }, { assignedUser: req.user._id }, { creator: req.user._id }],
            project: { $ne: null },
        });

        projectFilter = {
            $or: [
                { owner: req.user._id },
                { members: req.user._id },
                { _id: { $in: assignedProjectIds } },
            ],
        };
    }

    const projects = await Project.find(projectFilter)
        .populate('owner', 'fullname username')
        .populate('members', 'fullname username role')
        .sort({ updatedAt: -1 });
    return res
    .status(200)
    .json(
        {
             success: true, 
             data: projects 
            }
        );
}

export async function createProject(req, res) {
    if (!['Manager', 'Admin'].includes(req.user.role)) return sendError(res, 403, 'Only managers and admins can create projects');
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    if (!name) return sendError(res, 400, 'Project name is required');
    if (name.length > 80) return sendError(res, 400, 'Project name must be 80 characters or fewer');

    const project = await Project.create({ name, description, owner: req.user._id, members: [req.user._id] });
    await project.populate('owner', 'fullname username');
    return res
    .status(201)
    .json(
        {
             success: true, 
             data: project 
        }
    );
}

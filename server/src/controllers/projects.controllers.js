import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Notification } from "../models/notification.model.js";

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

export async function listProjects(req, res) {
  const projects = await Project.find({ deletedAt: null })
    .populate("owner", "fullname username")
    .populate("members", "fullname username role")
    .sort({ updatedAt: -1 })
    .lean();
  const projectTasks = projects.length
    ? await Task.find({
        project: { $in: projects.map((project) => project._id) },
        deletedAt: null,
      })
        .select("project assignedUser")
        .populate("assignedUser", "fullname username")
        .lean()
    : [];
  const assigneesByProject = new Map();

  projectTasks.forEach((task) => {
    const assignee = task.assignedUser;
    if (!assignee) return;

    const projectId = String(task.project);
    const assignees = assigneesByProject.get(projectId) || new Map();
    assignees.set(String(assignee._id), assignee);
    assigneesByProject.set(projectId, assignees);
  });

  return res.status(200).json({
    success: true,
    data: projects.map((project) => ({
      ...project,
      assignees: Array.from(
        assigneesByProject.get(String(project._id))?.values() || [],
      ),
    })),
  });
}

export async function listDeletedProjects(req, res) {
  if (req.user.role !== "Admin")
    return sendError(res, 403, "Only admins can view deleted projects");
  const projects = await Project.find({ deletedAt: { $ne: null } })
    .populate("owner", "fullname username")
    .populate("members", "fullname username role")
    .sort({ deletedAt: -1 });
  return res.status(200).json({ success: true, data: projects });
}

export async function deleteProject(req, res) {
  if (req.user.role !== "Admin")
    return sendError(res, 403, "Only admins can delete projects");
  if (!mongoose.isValidObjectId(req.params.projectId))
    return sendError(res, 400, "Invalid project id");
  const project = await Project.findOneAndUpdate(
    { _id: req.params.projectId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
  );
  if (!project) return sendError(res, 404, "Project not found");

  const recipientIds = new Set();
  recipientIds.add(String(req.user._id));
  if (project.owner) recipientIds.add(String(project.owner));
  if (Array.isArray(project.members)) {
    project.members.forEach((m) => {
      if (m) recipientIds.add(String(m._id || m));
    });
  }

  try {
    const projectTasks = await Task.find({ project: project._id, deletedAt: null }).select("assignedUser creator");
    projectTasks.forEach((t) => {
      if (t.assignedUser) recipientIds.add(String(t.assignedUser));
      if (t.creator) recipientIds.add(String(t.creator));
    });
  } catch (err) {
    console.error("Error finding project tasks for deletion notification:", err.message);
  }

  const actorName = req.user.fullname || req.user.username || "Admin";
  for (const recipientId of recipientIds) {
    try {
      await Notification.create({
        recipient: recipientId,
        actor: req.user._id,
        title: "Project Deleted",
        message:
          String(recipientId) === String(req.user._id)
            ? `You moved project "${project.name}" to trash.`
            : `Project "${project.name}" was deleted by ${actorName}.`,
        type: "workspace",
      });
    } catch (notifErr) {
      console.error("Error creating project deletion notification:", notifErr.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: "Project moved to trash successfully",
  });
}

export async function restoreProject(req, res) {
  if (req.user.role !== "Admin")
    return sendError(res, 403, "Only admins can restore projects");
  if (!mongoose.isValidObjectId(req.params.projectId))
    return sendError(res, 400, "Invalid project id");
  const project = await Project.findOneAndUpdate(
    { _id: req.params.projectId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { new: true },
  );
  if (!project) return sendError(res, 404, "Deleted project not found");
  return res.status(200).json({
    success: true,
    message: "Project restored successfully",
    data: project,
  });
}

export async function createProject(req, res) {
  if (!["Admin"].includes(req.user.role))
    return sendError(res, 403, "Only admins can create projects");
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  if (!name) return sendError(res, 400, "Project name is required");
  if (name.length > 80)
    return sendError(res, 400, "Project name must be 80 characters or fewer");

  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    members: [req.user._id],
  });
  await project.populate("owner", "fullname username");
  return res.status(201).json({
    success: true,
    data: project,
  });
}

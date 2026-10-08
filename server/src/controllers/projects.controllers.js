import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";

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

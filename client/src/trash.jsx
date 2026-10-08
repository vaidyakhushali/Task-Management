import { useCallback, useEffect, useState } from "react";
import {
  getDeletedProjects,
  getDeletedTasks,
  restoreProject,
  restoreTask,
} from "./api";
import "./trash.css";

function Trash() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState("");

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskResponse, projectResponse] = await Promise.all([
        getDeletedTasks(),
        getDeletedProjects(),
      ]);
      setTasks(Array.isArray(taskResponse.data) ? taskResponse.data : []);
      setProjects(
        Array.isArray(projectResponse.data) ? projectResponse.data : [],
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load deleted items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  async function handleRestore(type, item) {
    setRestoringId(item._id);
    setError("");
    try {
      if (type === "task") {
        await restoreTask(item._id);
        setTasks((current) => current.filter((task) => task._id !== item._id));
      } else {
        await restoreProject(item._id);
        setProjects((current) =>
          current.filter((project) => project._id !== item._id),
        );
      }
    } catch (restoreError) {
      setError(restoreError.message || "Unable to restore this item.");
    } finally {
      setRestoringId("");
    }
  }

  return (
    <section className="trash-page" aria-labelledby="trash-title">
      <header className="trash-heading">
        <div>
          <p className="dashboard-label">Admin workspace</p>
          <h2 id="trash-title">Trash</h2>
          <p>Review deleted work and restore anything you still need.</p>
        </div>
        <span className="trash-count">
          {tasks.length + projects.length} deleted items
        </span>
      </header>

      {error && (
        <p className="trash-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="trash-empty">Loading deleted items...</p>
      ) : (
        <div className="trash-sections">
          <section className="trash-section" aria-labelledby="deleted-tasks">
            <div className="trash-section-heading">
              <h3 id="deleted-tasks">Deleted tasks</h3>
              <span>{tasks.length}</span>
            </div>
            {tasks.length ? (
              <div className="trash-list">
                {tasks.map((task) => (
                  <article className="trash-item" key={task._id}>
                    <div className="trash-item-copy">
                      <strong>{task.title}</strong>
                      <span>
                        {task.project?.name || "No project"} ·{" "}
                        {task.assignedUser?.fullname ||
                          task.assignedUser?.username ||
                          "Unassigned"}
                      </span>
                      <small>
                        Deleted{" "}
                        {task.deletedAt
                          ? new Date(task.deletedAt).toLocaleDateString()
                          : ""}
                      </small>
                    </div>
                    <button
                      className="trash-restore"
                      type="button"
                      onClick={() => handleRestore("task", task)}
                      disabled={restoringId === task._id}
                    >
                      {restoringId === task._id ? "Restoring..." : "Restore"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="trash-empty">No deleted tasks.</p>
            )}
          </section>

          <section className="trash-section" aria-labelledby="deleted-projects">
            <div className="trash-section-heading">
              <h3 id="deleted-projects">Deleted projects</h3>
              <span>{projects.length}</span>
            </div>
            {projects.length ? (
              <div className="trash-list">
                {projects.map((project) => (
                  <article className="trash-item" key={project._id}>
                    <div className="trash-item-copy">
                      <strong>{project.name}</strong>
                      <span>{project.description || "No description"}</span>
                      <small>
                        Deleted{" "}
                        {project.deletedAt
                          ? new Date(project.deletedAt).toLocaleDateString()
                          : ""}
                      </small>
                    </div>
                    <button
                      className="trash-restore"
                      type="button"
                      onClick={() => handleRestore("project", project)}
                      disabled={restoringId === project._id}
                    >
                      {restoringId === project._id ? "Restoring..." : "Restore"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="trash-empty">No deleted projects.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default Trash;

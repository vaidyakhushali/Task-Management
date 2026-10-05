import { useEffect, useMemo, useState } from "react";
import { getAdminTasks, getAdminUsers } from "./api";
import "./admin-overview.css";

function AdminOverview({ search = "" }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAdminUsers(), getAdminTasks()])
      .then(([userResponse, taskResponse]) => {
        setUsers(userResponse.data);
        setTasks(taskResponse.data);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const visibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = search.toLowerCase();
        return (
          !query ||
          `${user.fullname} ${user.username} ${user.email}`
            .toLowerCase()
            .includes(query)
        );
      }),
    [search, users],
  );

  function tasksForUser(userId) {
    return tasks.filter((task) => task.assignedUser?._id === userId);
  }

  return (
    <section className="admin-overview" aria-labelledby="manage-users-title">
      <div className="admin-overview-heading">
        <div>
          <p className="dashboard-label">Admin workspace</p>
          <h2 id="manage-users-title">Users and their tasks</h2>
          <p>See who is working on what across the workspace.</p>
        </div>
        <div className="admin-counts">
          <span>
            <strong>{users.length}</strong> users
          </span>
          <span>
            <strong>{tasks.length}</strong> tasks
          </span>
        </div>
      </div>
      {error && (
        <p className="settings-message error-message" role="alert">
          {error}
        </p>
      )}
      {users.length === 0 && !error ? (
        <p className="admin-empty">Loading users...</p>
      ) : (
        <div className="admin-user-list">
          {visibleUsers.map((user) => {
            const userTasks = tasksForUser(user._id);
            return (
              <article className="admin-user-card" key={user._id}>
                <div className="admin-user-heading">
                  <span className="admin-avatar">
                    {user.fullname.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3>{user.fullname}</h3>
                    <p>
                      {user.email} · {user.role}
                    </p>
                  </div>
                  <span className="user-task-count">
                    {userTasks.length} task{userTasks.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="admin-task-list">
                  {userTasks.length === 0 ? (
                    <p className="admin-empty">No assigned tasks</p>
                  ) : (
                    userTasks.map((task) => (
                      <div className="admin-task-row" key={task._id}>
                        <span>
                          <strong>{task.title}</strong>
                          <small>
                            {task.priority} priority
                            {task.dueDate
                              ? ` · due ${new Date(task.dueDate).toLocaleDateString()}`
                              : ""}
                          </small>
                        </span>
                        <span className={`admin-task-status ${task.status}`}>
                          {task.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminOverview;

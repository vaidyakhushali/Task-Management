import React, { useState, useEffect } from "react";

import {
  getTasks,
  getAssignableUsers,
  createTask,
  updateTask,
  deleteTask,
} from "./api";

import "./task.css";

function Tasks({
  user,
  onTaskAssigned,
  initialStatusFilter = "all",
}) {

  const isAdmin =
    user?.role === "Admin";

   // TASK STATES
  
  const [tasks, setTasks] = useState([]);

  const [assignableUsers, setAssignableUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [successMsg, setSuccessMsg] =
    useState("");

  // CREATE TASK FORM
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedUser: "",
    priority: "medium",
    status: "pending",
    startDate: "",
    dueDate: "",
  });

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // FILTERS
  
  const [statusFilter, setStatusFilter] =
    useState(initialStatusFilter);

  const [searchQuery, setSearchQuery] =
    useState("");

    // VIEW MODE

  const [viewMode, setViewMode] =
    useState("list");
 
  // UPDATE FILTER WHEN PROP CHANGES

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // FETCH TASKS

  useEffect(() => {
    fetchTasks();

    if (isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  // GET TASKS

  async function fetchTasks() {
    setLoading(true);
    setError("");

    try {
      const res = await getTasks();

      setTasks(
        Array.isArray(res?.data)
          ? res.data
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to fetch tasks."
      );
    } finally {
      setLoading(false);
    }
  }

  // GET ASSIGNABLE USERS

  async function fetchUsers() {
    try {
      const res = await getAssignableUsers();

      const usersList =  Array.isArray(res?.data)  ? res.data : [];

      const filteredUsers =  usersList.filter(
          (u) =>
            (u._id || u.id) !==
              (user?._id ||
                user?.id) &&
            u.email !== user?.email
        );

      setAssignableUsers(
        filteredUsers
      );

      if (
        filteredUsers.length > 0 &&
        !formData.assignedUser
      ) {
        setFormData((prev) => ({
          ...prev,

          assignedUser:
            filteredUsers[0]._id ||
            filteredUsers[0].id,
        }));
      }
    } catch (err) {
      console.error(
        "Failed to load assignable users:",
        err
      );
    }
  }

  // CREATE TASK

  async function handleCreateTask(e) {
    e.preventDefault();

    setError("");
    setSuccessMsg("");

    // Title validation
    if (!formData.title.trim()) {
      setError(
        "Task title is required."
      );
      return;
    }

    // User validation
    if (!formData.assignedUser) {
      setError(
        "Please select a registered team member."
      );
      return;
    }

    // Start date validation
    if (!formData.startDate) {
      setError(
        "Start Date is required."
      );
      return;
    }

    // Due date validation
    if (!formData.dueDate) {
      setError(
        "Due Date is required."
      );
      return;
    }

    // Date comparison
    if (
      new Date(formData.dueDate) <
      new Date(formData.startDate)
    ) {
      setError(
        "Due Date cannot be before Start Date."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res =
        await createTask({
          title:
            formData.title.trim(),

          description:
            formData.description.trim(),

          assignedUser:
            formData.assignedUser,

          priority:
            formData.priority,

          status:
            formData.status,

          startDate:
            formData.startDate,

          dueDate:
            formData.dueDate,
        });

      if (res?.success) {
        setSuccessMsg(
          `Task "${formData.title}" assigned successfully!`
        );

        setFormData({
          title: "",
          description: "",

          assignedUser:
            assignableUsers[0]?._id ||
            assignableUsers[0]?.id ||
            "",

          priority: "medium",
          status: "pending",
          startDate: "",
          dueDate: "",
        });

        await fetchTasks();

        if (onTaskAssigned) {
          onTaskAssigned(res.data);
        }
      } else {
        setError(
          res?.message ||
            "Failed to create task."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to create task."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // UPDATE TASK STATUS

  async function handleStatusChange(
    taskId,
    newStatus
  ) {
    try {
      await updateTask(taskId, {
        status: newStatus,
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === taskId
            ? {
                ...task,

                status:
                  newStatus,

                completed:
                  newStatus ===
                  "completed",
              }
            : task
        )
      );
    } catch (err) {
      alert(
        err.message ||
          "Failed to update task status."
      );
    }
  }

  // DELETE TASK - ADMIN ONLY
  
  async function handleDeleteTask(
    taskId
  ) {
    if (!isAdmin) {
      setError(
        "Only admins can delete tasks."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Move this task to the admin trash? You can restore it later."
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const res =
        await deleteTask(taskId);

      if (res?.success) {
        // Remove task immediately from UI
        setTasks((prevTasks) =>
          prevTasks.filter(
            (task) =>
              task._id !== taskId
          )
        );

        setSuccessMsg(
          "Task moved to admin trash."
        );
      } else {
        setError(
          res?.message ||
            "Failed to delete task."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete task."
      );
    }
  }

  // FILTER TASKS

  const filteredTasks =
    tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "all" ||
        task.status ===
          statusFilter;

      const query =
        searchQuery
          .toLowerCase()
          .trim();

      const matchesQuery =
        !query ||
        task.title
          ?.toLowerCase()
          .includes(query) ||
        task.description
          ?.toLowerCase()
          .includes(query) ||
        task.assignedUser?.fullname
          ?.toLowerCase()
          .includes(query) ||
        task.assignedUser?.username
          ?.toLowerCase()
          .includes(query) ||
        task.assignedUser?.email
          ?.toLowerCase()
          .includes(query);

      return (
        matchesStatus &&
        matchesQuery
      );
    });

  // FORMAT DATE

  function formatDate(date) {
    if (!date) {
      return "Not set";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Not set";
    }

    return parsedDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  // TASK TYPE

  function getTaskType(task) {
    return (
      task.taskType ||
      (task.priority === "high"
        ? "Internal"
        : task.priority === "low"
        ? "Payment"
        : "Standard")
    );
  }

  // TASK TYPE CLASS

  function getTaskTypeClass(
    taskType
  ) {
    const type =
      taskType.toLowerCase();

    if (type === "internal") {
      return "pill-type-internal";
    }

    if (type === "payment") {
      return "pill-type-payment";
    }

    return "pill-type-standard";
  }

  // STATUS LABEL

  function getStatusLabel(status) {
    if (
      status ===
      "in-progress"
    ) {
      return "In Progress";
    }

    if (!status) {
      return "Pending";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  // RENDER

  return (
    <div className="tasks-container">
      <div className="tasks-page-header">

        <div>

          <h1>
            Task Management
          </h1>

          <p className="role-indicator">
            Role:{" "}
            <strong>
              {user?.role ||
                "User"}
            </strong>{" "}
            | Logged in as:{" "}
            <strong>
              {user?.email ||
                user?.fullname}
            </strong>
          </p>
        </div>
      </div>

      {isAdmin && (
        <section className="task-create-card">

          <div className="card-header">

            <h2>
              ➕ Assign New Task to Team Member
            </h2>

            <p>
              Select a registered user and assign a task with start and due dates.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {successMsg && (
            <div className="alert alert-success">
              {successMsg}
            </div>
          )}

          <form
            onSubmit={
              handleCreateTask
            }
            className="task-form-grid"
          >

            {/* TITLE */}

            <div className="form-field full-width">

              <label htmlFor="task-title">
                Task Title *
              </label>

              <input
                id="task-title"
                type="text"
                placeholder="e.g. Design homepage layout"
                value={
                  formData.title
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title:
                      e.target.value,
                  })
                }
                required
              />

            </div>

            {/* DESCRIPTION */}

            <div className="form-field full-width">

              <label htmlFor="task-desc">
                Description
              </label>

              <textarea
                id="task-desc"
                rows="2"
                placeholder="Task details and expectations..."
                value={
                  formData.description
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description:
                      e.target.value,
                  })
                }
              />

            </div>

            {/* ASSIGN USER */}

            <div className="form-field">

              <label htmlFor="assign-user">
                Assign To User *
              </label>

              <select
                id="assign-user"
                value={
                  formData.assignedUser
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignedUser:
                      e.target.value,
                  })
                }
                required
              >

                {assignableUsers.length ===
                  0 && (
                  <option value="">
                    No other team
                    members found
                  </option>
                )}

                {assignableUsers.map(
                  (u) => (
                    <option
                      key={
                        u._id ||
                        u.id
                      }
                      value={
                        u._id ||
                        u.id
                      }
                    >
                      {u.fullname ||
                        u.username}{" "}
                      (
                      {u.email ||
                        u.role}
                      )
                    </option>
                  )
                )}

              </select>

            </div>

            {/* PRIORITY */}

            <div className="form-field">

              <label htmlFor="task-priority">
                Priority
              </label>

              <select
                id="task-priority"
                value={
                  formData.priority
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority:
                      e.target.value,
                  })
                }
              >

                <option value="low">
                  Low Priority
                </option>

                <option value="medium">
                  Medium Priority
                </option>

                <option value="high">
                  High Priority
                </option>

              </select>

            </div>

            {/* STATUS */}

            <div className="form-field">

              <label htmlFor="task-status">
                Initial Status
              </label>

              <select
                id="task-status"
                value={
                  formData.status
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status:
                      e.target.value,
                  })
                }
              >

                <option value="pending">
                  Pending
                </option>

                <option value="in-progress">
                  In Progress
                </option>

                <option value="completed">
                  Completed
                </option>

              </select>

            </div>

            {/* START DATE */}

            <div className="form-field">

              <label htmlFor="start-date">
                Start Date *
              </label>

              <input
                id="start-date"
                type="date"
                value={
                  formData.startDate
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    startDate:
                      e.target.value,
                  })
                }
                required
              />

            </div>

            {/* DUE DATE */}

            <div className="form-field">

              <label htmlFor="due-date">
                Due Date *
              </label>

              <input
                id="due-date"
                type="date"
                min={
                  formData.startDate ||
                  undefined
                }
                value={
                  formData.dueDate
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate:
                      e.target.value,
                  })
                }
                required
              />

            </div>

            {/* SUBMIT */}

            <div className="form-field full-width form-actions">

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting ? "Assigning Task..." : "Assign Task"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* =====================================================
          TASK LIST
      ====================================================== */}
      <section className="tasks-list-card">
        {/* TOOLBAR */}
        <div
          className="tasks-toolbar"
          style={{
            display: "flex",
            justifyContent:"space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >

          {/* SEARCH + FILTER */}

          <div className="search-filter-box">

            <input type="text" placeholder="Search tasks or assignees..."
              value={ searchQuery
              }
              onChange={
                (e) => setSearchQuery( e.target.value)
              }
              className="search-input"
            />
            <div className="status-tabs">
              <button
                type="button"
                className={`tab-btn ${
                  statusFilter ===
                  "all"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    "all"
                  )
                }
              >
                All (
                {tasks.length}
                )
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  statusFilter ===
                  "pending"
                    ? "active"
                    : ""
                }`}
                onClick={() =>  setStatusFilter(
                    "pending"
                  )
                }
              >
                Pending
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  statusFilter ===
                  "in-progress"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    "in-progress"
                  )
                }
              >
                In Progress
              </button>

              <button
                type="button"
                className={`tab-btn ${
                  statusFilter ===
                  "completed"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    "completed"
                  )
                }
              >
                Completed
              </button>

            </div>

          </div>

          {/* VIEW TOGGLE */}

          <div className="view-mode-toggle">

            <button
              type="button"
              className={`view-mode-btn ${
                viewMode ===
                "list"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setViewMode(
                  "list"
                )
              }
            >
              📋 List View
            </button>

            <button
              type="button"
              className={`view-mode-btn ${
                viewMode ===
                "kanban"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setViewMode(
                  "kanban"
                )
              }
            >
              📊 Kanban View
            </button>

            <button
              type="button"
              className={`view-mode-btn ${
                viewMode ===
                "grid"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setViewMode(
                  "grid"
                )
              }
            >
              ▦ Grid View
            </button>

          </div>

        </div>

        {/* GLOBAL MESSAGE */}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            {successMsg}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="tasks-loading">
            Loading tasks list...
          </div>

        ) : filteredTasks.length ===
          0 ? (

          <div className="empty-tasks-state">
            <p>
              No tasks found matching your criteria.
            </p>
          </div>

        ) : viewMode ===
          "list" ? (

          // =================================================
          // LIST VIEW
          // =================================================

          <div
            className="table-wrapper"
            style={{
              marginTop:
                "14px",
            }}
          >

            <table className="image3-task-table">
              <thead>
                <tr>

                  <th>
                    Task Title
                  </th>

                  <th>
                    Assignee
                  </th>

                  <th>
                    Task Type
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Start Date
                  </th>

                  <th>
                    Due Date
                  </th>

                  <th>
                    Update Status
                  </th>

                  {/* ADMIN ONLY */}

                  {isAdmin && (
                    <th>
                      Action
                    </th>
                  )}

                </tr>

              </thead>

              <tbody>

                {filteredTasks.map(
                  (t) => {

                    const assigneeName =
                      t.assignedUser
                        ?.fullname ||
                      t.assignedUser
                        ?.username ||
                      "Unassigned";

                    const taskType =
                      getTaskType(
                        t
                      );

                    const taskTypeClass =
                      getTaskTypeClass(
                        taskType
                      );

                    const priorityClass =
                      `pill-priority-${
                        t.priority ||
                        "medium"
                      }`;

                    const statusClass =
                      `pill-status-${
                        t.status ===
                        "in-progress"
                          ? "in-progress"
                          : t.status ||
                            "pending"
                      }`;

                    return (

                      <tr
                        key={
                          t._id ||
                          t.id
                        }
                      >

                        {/* TITLE */}

                        <td className="title-cell">

                          <strong>
                            {t.title}
                          </strong>

                          {t.description && (
                            <small
                              style={{
                                display:
                                  "block",
                                color:
                                  "var(--text-muted)",
                                marginTop:
                                  "4px",
                              }}
                            >
                              {
                                t.description
                              }
                            </small>
                          )}

                        </td>

                        {/* ASSIGNEE */}

                        <td>

                          <span className="user-badge">
                            {
                              assigneeName
                            }
                          </span>

                        </td>

                        {/* TYPE */}

                        <td>

                          <span
                            className={`pill-badge ${taskTypeClass}`}
                          >
                            {
                              taskType
                            }
                          </span>

                        </td>

                        {/* PRIORITY */}

                        <td>

                          <span
                            className={`pill-badge ${priorityClass}`}
                          >
                            ●{" "}
                            {(
                              t.priority ||
                              "medium"
                            ).toUpperCase()}
                          </span>

                        </td>

                        {/* STATUS */}

                        <td>

                          <span
                            className={`pill-badge ${statusClass}`}
                          >
                            {getStatusLabel(
                              t.status
                            )}
                          </span>

                        </td>

                        {/* START DATE */}

                        <td>

                          <span className="pill-badge pill-timeline">
                            📅{" "}
                            {formatDate(
                              t.startDate
                            )}
                          </span>

                        </td>

                        {/* DUE DATE */}

                        <td>

                          <span className="pill-badge pill-timeline">
                            📅{" "}
                            {formatDate(
                              t.dueDate
                            )}
                          </span>

                        </td>

                        {/* UPDATE STATUS */}

                        <td>

                          <select
                            className="status-select"
                            value={
                              t.status ||
                              "pending"
                            }
                            onChange={(
                              e
                            ) =>
                              handleStatusChange(
                                t._id,
                                e
                                  .target
                                  .value
                              )
                            }
                          >

                            <option value="pending">
                              Pending
                            </option>

                            <option value="in-progress">
                              In Progress
                            </option>

                            <option value="completed">
                              Completed
                            </option>

                          </select>

                        </td>

                        {/* DELETE - ADMIN ONLY */}

                        {isAdmin && (
                          <td>

                            <button
                              type="button"
                              className="btn-delete-task"
                              onClick={() =>
                                handleDeleteTask(
                                  t._id
                                )
                              }
                            >
                              Move to trash
                            </button>

                          </td>
                        )}

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        ) : viewMode ===
          "kanban" ? (

          // =================================================
          // KANBAN VIEW
          // =================================================

          <div className="kanban-board-wrapper">

            {[
              "pending",
              "in-progress",
              "completed",
            ].map(
              (colStatus) => {

                const colTasks =
                  filteredTasks.filter(
                    (t) =>
                      (t.status ||
                        "pending") ===
                      colStatus
                  );

                return (

                  <div
                    className="kanban-column"
                    key={
                      colStatus
                    }
                    onDragOver={(e) => {
                      e.preventDefault();

                      e.dataTransfer.dropEffect =
                        "move";
                    }}
                    onDrop={(e) => {

                      e.preventDefault();

                      const taskId =
                        e.dataTransfer.getData(
                          "taskId"
                        );

                      if (
                        taskId
                      ) {
                        handleStatusChange(
                          taskId,
                          colStatus
                        );
                      }

                    }}
                  >

                    <div
                      className={`kanban-column-header ${colStatus}`}
                    >

                      <h3>
                        {getStatusLabel(
                          colStatus
                        )}
                      </h3>

                      <span className="kanban-count-badge">
                        {
                          colTasks.length
                        }
                      </span>

                    </div>

                    <div className="kanban-cards-list">

                      {colTasks.length ===
                      0 ? (

                        <div
                          className="empty-tasks-state"
                          style={{
                            padding:
                              "20px 10px",
                            fontSize:
                              "0.8rem",
                          }}
                        >
                          Drag & drop
                          tasks here
                        </div>

                      ) : (

                        colTasks.map(
                          (t) => {

                            const assigneeName =
                              t.assignedUser
                                ?.fullname ||
                              t.assignedUser
                                ?.username ||
                              "Unassigned";

                            const taskType =
                              getTaskType(
                                t
                              );

                            const taskTypeClass =
                              getTaskTypeClass(
                                taskType
                              );

                            const priorityClass =
                              `pill-priority-${
                                t.priority ||
                                "medium"
                              }`;

                            return (

                              <article
                                className="kanban-card"
                                key={
                                  t._id ||
                                  t.id
                                }
                                draggable
                                onDragStart={(
                                  e
                                ) => {

                                  e.dataTransfer.setData(
                                    "taskId",
                                    t._id ||
                                      t.id
                                  );

                                  e.dataTransfer.effectAllowed =
                                    "move";

                                }}
                              >

                                <div className="kanban-card-title">
                                  {
                                    t.title
                                  }
                                </div>

                                {t.description && (
                                  <p className="task-grid-desc">
                                    {
                                      t.description
                                    }
                                  </p>
                                )}

                                <div className="kanban-card-pills">

                                  <span
                                    className={`pill-badge ${taskTypeClass}`}
                                  >
                                    {
                                      taskType
                                    }
                                  </span>

                                  <span
                                    className={`pill-badge ${priorityClass}`}
                                  >
                                    ●{" "}
                                    {(
                                      t.priority ||
                                      "medium"
                                    ).toUpperCase()}
                                  </span>

                                </div>

                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap:
                                      "5px",
                                    marginTop:
                                      "8px",
                                  }}
                                >

                                  <span className="pill-badge pill-timeline">
                                    📅 Start:{" "}
                                    {formatDate(
                                      t.startDate
                                    )}
                                  </span>

                                  <span className="pill-badge pill-timeline">
                                    📅 Due:{" "}
                                    {formatDate(
                                      t.dueDate
                                    )}
                                  </span>

                                </div>

                                <div className="kanban-card-footer">

                                  <span
                                    className="user-badge"
                                    style={{
                                      fontSize:
                                        "0.76rem",
                                    }}
                                  >
                                    👤{" "}
                                    {
                                      assigneeName
                                    }
                                  </span>

                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      gap:
                                        "6px",
                                      alignItems:
                                        "center",
                                    }}
                                  >

                                    <select
                                      className="status-select"
                                      value={
                                        t.status ||
                                        "pending"
                                      }
                                      onChange={(
                                        e
                                      ) =>
                                        handleStatusChange(
                                          t._id,
                                          e
                                            .target
                                            .value
                                        )
                                      }
                                    >

                                      <option value="pending">
                                        Pending
                                      </option>

                                      <option value="in-progress">
                                        In Progress
                                      </option>

                                      <option value="completed">
                                        Completed
                                      </option>

                                    </select>

                                    {/* ADMIN DELETE */}

                                    {isAdmin && (
                                      <button
                                        type="button"
                                        className="btn-delete-task"
                                        onClick={() =>
                                          handleDeleteTask(
                                            t._id
                                          )
                                        }
                                        title="Move task to trash"
                                      >
                                        🗑️
                                      </button>
                                    )}

                                  </div>

                                </div>

                              </article>

                            );
                          }
                        )

                      )}

                    </div>

                  </div>

                );
              }
            )}

          </div>

        ) : (

          // =================================================
          // GRID VIEW
          // =================================================

          <div className="tasks-grid-wrapper">

            {filteredTasks.map(
              (t) => {

                const assigneeName =
                  t.assignedUser
                    ?.fullname ||
                  t.assignedUser
                    ?.username ||
                  "Unassigned";

                const taskType =
                  getTaskType(
                    t
                  );

                const taskTypeClass =
                  getTaskTypeClass(
                    taskType
                  );

                const priorityClass =
                  `pill-priority-${
                    t.priority ||
                    "medium"
                  }`;

                const statusClass =
                  `pill-status-${
                    t.status ===
                    "in-progress"
                      ? "in-progress"
                      : t.status ||
                        "pending"
                  }`;

                return (

                  <article
                    className="task-grid-card"
                    key={
                      t._id ||
                      t.id
                    }
                  >

                    <div className="task-grid-header">

                      <h3>
                        {t.title}
                      </h3>

                      <span
                        className={`pill-badge ${statusClass}`}
                      >
                        {getStatusLabel(
                          t.status
                        )}
                      </span>

                    </div>

                    {t.description && (
                      <p className="task-grid-desc">
                        {
                          t.description
                        }
                      </p>
                    )}

                    <div className="task-grid-pills">

                      <span
                        className={`pill-badge ${taskTypeClass}`}
                      >
                        {
                          taskType
                        }
                      </span>

                      <span
                        className={`pill-badge ${priorityClass}`}
                      >
                        ●{" "}
                        {(
                          t.priority ||
                          "medium"
                        ).toUpperCase()}
                      </span>

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap: "6px",
                        marginTop:
                          "10px",
                      }}
                    >

                      <span className="pill-badge pill-timeline">
                        📅 Start:{" "}
                        {formatDate(
                          t.startDate
                        )}
                      </span>

                      <span className="pill-badge pill-timeline">
                        📅 Due:{" "}
                        {formatDate(
                          t.dueDate
                        )}
                      </span>

                    </div>

                    <div className="task-grid-meta">

                      <span className="user-badge">
                        👤{" "}
                        {
                          assigneeName
                        }
                      </span>

                      <div className="task-grid-actions">

                        <select
                          className="status-select"
                          value={
                            t.status ||
                            "pending"
                          }
                          onChange={(
                            e
                          ) =>
                            handleStatusChange(
                              t._id,
                              e
                                .target
                                .value
                            )
                          }
                        >

                          <option value="pending">
                            Pending
                          </option>

                          <option value="in-progress">
                            In Progress
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                        </select>

                        {/* ADMIN DELETE */}

                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-delete-task"
                            onClick={() =>
                              handleDeleteTask(
                                t._id
                              )
                            }
                            title="Move task to trash"
                          >
                            🗑️
                          </button>
                        )}

                      </div>

                    </div>

                  </article>

                );
              }
            )}

          </div>

        )}

      </section>

    </div>
  );
}

export default Tasks;
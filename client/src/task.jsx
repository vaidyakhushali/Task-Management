import React, { useState, useEffect } from 'react';
import { getTasks, getAssignableUsers, createTask, updateTask, deleteTask, getTaskComments, addTaskComment } from './api';
import './task.css';

function Tasks({ user, onTaskAssigned, initialStatusFilter = 'all' }) {
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State for Admin Create Task (Added startDate)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedUser: '',
    priority: 'medium',
    status: 'pending',
    startDate: '',
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & View Mode State
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Comment Modal State
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function fetchTasks() {
    setLoading(true);
    setError('');
    try {
      const res = await getTasks();
      setTasks(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await getAssignableUsers();
      const usersList = Array.isArray(res?.data) ? res.data : [];
      
      // Filter out the logged-in admin/user so they cannot assign tasks to themselves
      const filteredUsers = usersList.filter(
        (u) =>
          (u._id || u.id) !== (user?._id || user?.id) &&
          u.email !== user?.email
      );

      setAssignableUsers(filteredUsers);

      // Auto-select the first eligible team member if available
      if (filteredUsers.length > 0 && !formData.assignedUser) {
        setFormData((prev) => ({ ...prev, assignedUser: filteredUsers[0]._id || filteredUsers[0].id }));
      }
    } catch (err) {
      console.error('Failed to load assignable users:', err);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!formData.assignedUser) {
      setError('Please select a registered team member to assign the task');
      return;
    }
    if(!formData.startDate){
      setError('Start Date is required');
    }
    
    if(!formData.dueDate){
      setError('Due Date is required');
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await createTask({
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedUser: formData.assignedUser,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
      });

      if (res.success) {
        setSuccessMsg(`Task "${formData.title}" assigned successfully!`);
        setFormData({
          title: '',
          description: '',
          assignedUser: assignableUsers[0]?._id || assignableUsers[0]?.id || '',
          priority: 'medium',
          status: 'pending',
          startDate: '',
          dueDate: '',
        });
        fetchTasks();
        if (onTaskAssigned) onTaskAssigned(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(taskId, newStatus) {
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t._id === taskId ? { ...t, status: newStatus, completed: newStatus === 'completed' } : t))
      );
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  }

  // Comments System
  async function openComments(task) {
    setActiveCommentTask(task);
    setComments([]);
    setCommentError('');
    setLoadingComments(true);

    try {
      const res = await getTaskComments(task._id);
      setComments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setCommentError(err.message || 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentTask) return;

    try {
      const res = await addTaskComment(activeCommentTask._id, commentText.trim());
      if (res.success && res.data) {
        setComments((prev) => [...prev, res.data]);
        setCommentText('');
      }
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment');
    }
  }

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.assignedUser?.fullname?.toLowerCase().includes(query) ||
      t.assignedUser?.email?.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
  });

  return (
    <div className="tasks-container">
      {/* Header Banner */}
      <div className="tasks-page-header">
        <div>
          <h1>Task Management</h1>
          <p className="role-indicator">
            Role: <strong>{user?.role || 'User'}</strong> | Logged in as: <strong>{user?.email || user?.fullname}</strong>
          </p>
        </div>
      </div>

      {/* ADMIN-ONLY TASK CREATION CARD */}
      {isAdmin ? (
        <section className="task-create-card">
          <div className="card-header">
            <h2>➕ Assign New Task to Team Member</h2>
            <p>Select a registered user from the dropdown list to assign work</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleCreateTask} className="task-form-grid">
            <div className="form-field full-width">
              <label htmlFor="task-title">Task Title *</label>
              <input
                id="task-title"
                type="text"
                placeholder="e.g. Design homepage layout or Implement JWT Auth"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                rows="2"
                placeholder="Task details and expectations..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="assign-user">Assign To User *</label>
              <select
                id="assign-user"
                value={formData.assignedUser}
                onChange={(e) => setFormData({ ...formData, assignedUser: e.target.value })}
                required
              >
                {assignableUsers.length === 0 && <option value="">No other team members found</option>}
                {assignableUsers.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.fullname || u.username} ({u.email || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-status">Initial Status</label>
              <select
                id="task-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="start-date">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-field">            
              <label htmlFor="due-date">Due Date</label>
              <input
                id="due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="form-field full-width form-actions">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Assigning Task...' : 'Assign Task'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* TASK LIST CONTROLS & TABLE */}
      <section className="tasks-list-card">
        <div className="tasks-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-filter-box">
            <input
              type="text"
              placeholder="Search tasks or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="status-tabs">
              <button
                className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({tasks.length})
              </button>
              <button
                className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`tab-btn ${statusFilter === 'in-progress' ? 'active' : ''}`}
                onClick={() => setStatusFilter('in-progress')}
              >
                In Progress
              </button>
              <button
                className={`tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List View
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              📊 Kanban View
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ▦ Grid View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="tasks-loading">Loading tasks list...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-tasks-state">
            <p>No tasks found matching your criteria.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
          <div className="table-wrapper" style={{ marginTop: '14px' }}>
            <table className="image3-task-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Assignee</th>
                  <th>Task Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th>Update Status</th>
                  <th>Private Chat</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const assigneeName = t.assignedUser?.fullname || t.assignedUser?.username || 'Unassigned';
                  const taskType = t.taskType || (t.priority === 'high' ? 'Internal' : t.priority === 'low' ? 'Payment' : 'Standard');
                  const taskTypeClass = taskType.toLowerCase() === 'internal' ? 'pill-type-internal' : taskType.toLowerCase() === 'payment' ? 'pill-type-payment' : 'pill-type-standard';
                  const priorityClass = `pill-priority-${t.priority || 'medium'}`;
                  const statusClass = `pill-status-${t.status === 'in-progress' ? 'in-progress' : (t.status || 'pending')}`;
                  
                  // Format Start -> Due timeline display
                  const startText = t.startDate ? new Date(t.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
                  const dueText = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
                  const timelineText = startText && dueText ? `${startText} - ${dueText}` : dueText || startText || 'No timeline';

                  return (
                    <tr key={t._id || t.id}>
                      <td className="title-cell">
                        <strong>{t.title}</strong>
                        {t.description && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{t.description}</small>}
                      </td>
                      <td>
                        <span className="user-badge">{assigneeName}</span>
                      </td>
                      <td>
                        <span className={`pill-badge ${taskTypeClass}`}>{taskType}</span>
                      </td>
                      <td>
                        <span className={`pill-badge ${priorityClass}`}>
                          ● {(t.priority || 'medium').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`pill-badge ${statusClass}`}>
                          {t.status === 'in-progress' ? 'In Progress' : (t.status || 'pending').charAt(0).toUpperCase() + (t.status || 'pending').slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className="pill-badge pill-timeline">🗓️ {timelineText}</span>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={t.status || 'pending'}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn-comments" onClick={() => openComments(t)}>
                          💬 Chat ({t.commentsCount || 0})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'kanban' ? (
          /* KANBAN BOARD VIEW WITH DRAG & DROP */
          <div className="kanban-board-wrapper">
            {['pending', 'in-progress', 'completed'].map((colStatus) => {
              const colTasks = filteredTasks.filter((t) => (t.status || 'pending') === colStatus);
              const colTitle = colStatus === 'in-progress' ? 'In Progress' : colStatus.charAt(0).toUpperCase() + colStatus.slice(1);

              return (
                <div
                  className="kanban-column"
                  key={colStatus}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('taskId');
                    if (taskId) {
                      handleStatusChange(taskId, colStatus);
                    }
                  }}
                >
                  <div className={`kanban-column-header ${colStatus}`}>
                    <h3>{colTitle}</h3>
                    <span className="kanban-count-badge">{colTasks.length}</span>
                  </div>

                  <div className="kanban-cards-list">
                    {colTasks.length === 0 ? (
                      <div className="empty-tasks-state" style={{ padding: '20px 10px', fontSize: '0.8rem' }}>Drag & drop tasks here</div>
                    ) : colTasks.map((t) => {
                      const assigneeName = t.assignedUser?.fullname || t.assignedUser?.username || 'Unassigned';
                      const taskType = t.taskType || (t.priority === 'high' ? 'Internal' : t.priority === 'low' ? 'Payment' : 'Standard');
                      const taskTypeClass = taskType.toLowerCase() === 'internal' ? 'pill-type-internal' : taskType.toLowerCase() === 'payment' ? 'pill-type-payment' : 'pill-type-standard';
                      const priorityClass = `pill-priority-${t.priority || 'medium'}`;

                      return (
                        <article
                          className="kanban-card"
                          key={t._id || t.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', t._id || t.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          style={{ cursor: 'grab' }}
                        >
                          <div className="kanban-card-title">{t.title}</div>
                          {t.description && <p className="task-grid-desc">{t.description}</p>}
                          <div className="kanban-card-pills">
                            <span className={`pill-badge ${taskTypeClass}`}>{taskType}</span>
                            <span className={`pill-badge ${priorityClass}`}>● {(t.priority || 'medium').toUpperCase()}</span>
                          </div>
                          <div className="kanban-card-footer">
                            <span className="user-badge" style={{ fontSize: '0.76rem' }}>👤 {assigneeName}</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <select
                                className="status-select"
                                value={t.status || 'pending'}
                                onChange={(e) => handleStatusChange(t._id, e.target.value)}
                                style={{ fontSize: '0.76rem', padding: '3px 6px' }}
                              >
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <button className="btn-comments" onClick={() => openComments(t)} title="Private Chat">💬</button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GRID VIEW CARDS */
          <div className="tasks-grid-wrapper">
            {filteredTasks.map((t) => {
              const assigneeName = t.assignedUser?.fullname || t.assignedUser?.username || 'Unassigned';
              const taskType = t.taskType || (t.priority === 'high' ? 'Internal' : t.priority === 'low' ? 'Payment' : 'Standard');
              const taskTypeClass = taskType.toLowerCase() === 'internal' ? 'pill-type-internal' : taskType.toLowerCase() === 'payment' ? 'pill-type-payment' : 'pill-type-standard';
              const priorityClass = `pill-priority-${t.priority || 'medium'}`;
              const statusClass = `pill-status-${t.status === 'in-progress' ? 'in-progress' : (t.status || 'pending')}`;
              
              const startText = t.startDate ? new Date(t.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
              const dueText = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
              const timelineText = startText && dueText ? `${startText} - ${dueText}` : dueText || startText || 'No due date';

              return (
                <article className="task-grid-card" key={t._id || t.id}>
                  <div className="task-grid-header">
                    <h3>{t.title}</h3>
                    <span className={`pill-badge ${statusClass}`}>
                      {t.status === 'in-progress' ? 'In Progress' : (t.status || 'pending').charAt(0).toUpperCase() + (t.status || 'pending').slice(1)}
                    </span>
                  </div>

                  {t.description && <p className="task-grid-desc">{t.description}</p>}

                  <div className="task-grid-pills">
                    <span className={`pill-badge ${taskTypeClass}`}>{taskType}</span>
                    <span className={`pill-badge ${priorityClass}`}>● {(t.priority || 'medium').toUpperCase()}</span>
                    <span className="pill-badge pill-timeline">🗓️ {timelineText}</span>
                  </div>

                  <div className="task-grid-meta">
                    <span className="user-badge">👤 {assigneeName}</span>
                    <div className="task-grid-actions">
                      <select
                        className="status-select"
                        value={t.status || 'pending'}
                        onChange={(e) => handleStatusChange(t._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button className="btn-comments" onClick={() => openComments(t)}>💬</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* COMMENTS MODAL / DRAWER */}
      {activeCommentTask && (
        <div className="modal-backdrop" onClick={() => setActiveCommentTask(null)}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🔒 Private Task Chat</h3>
                <p>Task: <strong>{activeCommentTask.title}</strong> · Private conversation between Admin & Assignee</p>
              </div>
              <button className="close-btn" onClick={() => setActiveCommentTask(null)}>✕</button>
            </div>

            <div className="comments-body">
              {loadingComments ? (
                <div className="comments-loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="no-comments">No comments yet. Start the conversation!</div>
              ) : (
                <div className="comments-list">
                  {comments.map((c) => (
                    <div className="comment-bubble" key={c._id || c.createdAt}>
                      <div className="comment-meta">
                        <strong>{c.user?.fullname || c.user?.username || 'User'}</strong>
                        <span className="comment-role">({c.user?.role || 'User'})</span>
                        <small>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                      <p className="comment-text">{c.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {commentError && <div className="alert alert-error">{commentError}</div>}
            </div>

            <form onSubmit={handleAddComment} className="comments-footer">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary">Post Comment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
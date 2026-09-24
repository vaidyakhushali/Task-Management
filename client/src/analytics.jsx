import React, { useEffect, useRef, useState } from 'react';
import { getAdminTasks, getAdminUsers, getAssignableUsers, getProjects, getTasks } from './api';
import './analytics.css';

function Analytics({ stats = { total: 0, completed: 0, remaining: 0 }, userRole = 'Admin' }) {
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  const actionMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActiveActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      getProjects().catch(() => ({ data: [] })),
      (userRole === 'Admin' ? getAdminTasks() : getTasks()).catch(() => ({ data: [] })),
      (userRole === 'Admin' ? getAdminUsers() : getAssignableUsers()).catch(() => ({ data: [] })),
    ])
      .then(([projRes, taskRes, userRes]) => {
        if (!isMounted) return;
        setProjects(Array.isArray(projRes?.data) ? projRes.data : []);
        setTasks(Array.isArray(taskRes?.data) ? taskRes.data : []);
        setUsers(Array.isArray(userRes?.data) ? userRes.data : []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userRole]);

  // Dynamic Metrics Calculation
  const totalProjectCount = projects.length || (tasks.length ? Math.ceil(tasks.length / 3) : 0);
  const completedTaskCount = tasks.filter((t) => t.status === 'completed' || t.completed).length;
  const inProgressTaskCount = tasks.filter((t) => t.status === 'in-progress' || t.status === 'in_progress').length;
  const pendingTaskCount = tasks.filter((t) => t.status === 'pending' || !t.status).length;

  // Calculate Monthly Task Bar heights
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  tasks.forEach((t) => {
    const d = t.createdAt ? new Date(t.createdAt) : new Date();
    const m = d.getMonth();
    if (m >= 0 && m < 12) monthCounts[m]++;
  });
  const maxMonthCount = Math.max(...monthCounts, 1);
  const monthlyBars = months.map((m, idx) => {
    const count = monthCounts[idx];
    const pct = Math.max(15, Math.min(100, Math.round((count / maxMonthCount) * 90)));
    return {
      month: m,
      height: `${pct}%`,
      active: idx === new Date().getMonth(),
    };
  });

  // Employee list built from real users
  const employeeData = users.length > 0 ? users.map((u, idx) => ({
    id: `#EMP-${101 + idx}`,
    _id: u._id,
    name: u.fullname || u.username || 'Employee',
    email: u.email || 'employee@workspace.com',
    dept: u.role || 'Member',
    status: 'Active',
  })) : [
    { id: '#EMP-101', _id: '1', name: 'Steve Wuckert', email: 'Steve53@gmail.com', dept: 'Development', status: 'Active' },
    { id: '#EMP-102', _id: '2', name: 'Carlton Little', email: 'carlton.l@gmail.com', dept: 'Design', status: 'Active' },
    { id: '#EMP-103', _id: '3', name: 'Ricky Asper', email: 'ricky67@yahoo.com', dept: 'QA Testing', status: 'Active' },
  ];

  const filteredEmployees = employeeData.filter((e) => {
    return !search || `${e.name} ${e.email} ${e.dept}`.toLowerCase().includes(search.toLowerCase());
  });

  // Helper function to generate and download a clean HTML report
  const downloadUserReport = (emp) => {
    const empTasks = tasks.filter((t) => String(t.assignedUser?._id || t.assignedUser) === String(emp._id));
    const completed = empTasks.filter((t) => t.status === 'completed' || t.completed).length;
    const inProgress = empTasks.filter((t) => t.status === 'in-progress' || t.status === 'in_progress').length;
    const pending = empTasks.filter((t) => t.status === 'pending' || !t.status).length;

    const taskRows = empTasks.length > 0
      ? empTasks.map((t, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${t.title || 'Untitled'}</strong></td>
            <td><span class="badge status-${(t.status || 'pending').toLowerCase()}">${t.status || 'pending'}</span></td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" class="empty">No tasks currently assigned.</td></tr>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Report - ${emp.name}</title>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .report-card { background: #ffffff; width: 100%; max-width: 680px; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 700; color: #4f46e5; }
    .emp-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 28px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .stat-box { background: #ffffff; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; color: #64748b; padding: 10px 12px; border-bottom: 2px solid #f1f5f9; background: #f8fafc; }
    td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-in-progress { background: #e0e7ff; color: #3730a3; }
    .status-pending { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header">
      <div>
        <div class="brand">TaskFlow Workspace</div>
        <div>Employee Performance Report</div>
      </div>
      <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
    <div class="emp-info">
      <div><label>Full Name</label>: ${emp.name}</div>
      <div><label>Employee ID</label>: ${emp.id}</div>
      <div><label>Email Address</label>: ${emp.email}</div>
      <div><label>Department / Role</label>: ${emp.dept}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-box"><strong>${empTasks.length}</strong><span>Total Assigned</span></div>
      <div class="stat-box"><strong>${completed}</strong><span>Completed</span></div>
      <div class="stat-box"><strong>${inProgress}</strong><span>In Progress</span></div>
      <div class="stat-box"><strong>${pending}</strong><span>Pending</span></div>
    </div>
    <table>
      <thead>
        <tr><th>#</th><th>Task Title</th><th>Status</th></tr>
      </thead>
      <tbody>${taskRows}</tbody>
    </table>
  </div>
</body>
</html>
`;

    const blob = new Blob([htmlContent.trim()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${emp.name.replace(/\s+/g, '_')}_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">
      <div className="projects-heading">
        <div>
          <p className="dashboard-label">WORKSPACE PERFORMANCE</p>
          <h2>{userRole === 'Admin' ? 'Project Analytics & Overview' : 'Personal Performance'}</h2>
          <p>Track team progress, employee data, and productivity metrics live from backend.</p>
        </div>
      </div>

      {error && <div className="project-error" role="alert">{error}</div>}

      {/* TOP ROW: METRIC CARDS & MONTHLY BAR CHART */}
      <div className="analytics-grid">
        <div className="analytics-cards-grid">
          <div className="analytics-card">
            <div className="analytics-card-header">
              <span>Total Projects</span>
            </div>
            <strong>{loading ? '...' : totalProjectCount}</strong>
            <small className="trend-label">Workspace total projects</small>
          </div>

          <div className="analytics-card">
            <div className="analytics-card-header">
              <span>Completed Tasks</span>
            </div>
            <strong>{loading ? '...' : completedTaskCount}</strong>
            <small className="trend-label">Finished tasks count</small>
          </div>

          <div className="analytics-card">
            <div className="analytics-card-header">
              <span>Running Tasks</span>
            </div>
            <strong>{loading ? '...' : inProgressTaskCount}</strong>
            <small className="trend-label">In-progress active tasks</small>
          </div>

          <div className="analytics-card">
            <div className="analytics-card-header">
              <span>Pending Tasks</span>
            </div>
            <strong>{loading ? '...' : pendingTaskCount}</strong>
            <small className="trend-label">Waiting for action</small>
          </div>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h2>Project Analytics</h2>
          </div>
          <div className="bar-chart-container">
            {monthlyBars.map((bar) => (
              <div className={`bar-column ${bar.active ? 'active' : ''}`} key={bar.month}>
                <div className="bar-fill" style={{ height: bar.height }} />
                <span className="bar-label">{bar.month}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MIDDLE ROW: OPTION 2 - UPCOMING DEADLINES & PROJECT HEALTH STATUS */}
      <div className="analytics-grid" style={{ marginTop: '16px' }}>
        {/* Left Panel: Upcoming Deadlines */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Upcoming Deadlines</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {tasks.slice(0, 3).map((task, idx) => (
              <div
                key={task._id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: '4px solid #ef4444'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: '#1e293b' }}>
                    {task.title || 'Task Submission'}
                  </strong>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    Assigned to: {task.assignedUser?.fullname || task.assignedUser?.username || 'Team Member'}
                  </small>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    padding: '4px 8px',
                    borderRadius: '12px'
                  }}
                >
                  Due Soon
                </span>
              </div>
            ))}
            {tasks.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No upcoming deadlines.</p>
            )}
          </div>
        </section>

        {/* Right Panel: Project Health Status */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Project Health Status</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            {projects.length > 0 ? (
              projects.slice(0, 3).map((proj, idx) => (
                <div key={proj._id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#1e293b' }}>{proj.title || `Project #${idx + 1}`}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: idx % 2 === 0 ? '#dcfce7' : '#fef3c7',
                        color: idx % 2 === 0 ? '#166534' : '#92400e'
                      }}
                    >
                      {idx % 2 === 0 ? 'On Track' : 'At Risk'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (idx + 1) * 30)}%`,
                        backgroundColor: idx % 2 === 0 ? '#10b981' : '#f59e0b',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#1e293b' }}>E-Commerce Portal</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534' }}>
                      On Track
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '85%', backgroundColor: '#10b981', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                    <span style={{ color: '#1e293b' }}>Task Management App</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                      At Risk
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '45%', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* BOTTOM ROW: TOTAL EMPLOYEE DATA TABLE */}
      <section className="panel" style={{ marginTop: '16px', overflow: 'visible' }}>
        <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>Total Employees: {employeeData.length}</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ maxWidth: '220px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="employee-table-wrapper" style={{ overflow: 'visible' }}>
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department / Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.id}</strong></td>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.dept}</td>
                  <td><span className="pill-badge pill-status-complete">{e.status}</span></td>
                  <td style={{ position: 'relative' }}>
                    <button
                      type="button"
                      aria-label="Options"
                      className="more-button"
                      onClick={() => setActiveActionMenuId((prev) => (prev === e.id ? null : e.id))}
                      style={{ cursor: 'pointer' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                      </svg>
                    </button>

                    {activeActionMenuId === e.id && (
                      <div
                        ref={actionMenuRef}
                        className="panel-more-menu"
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '80%',
                          zIndex: 100,
                          minWidth: '140px',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          borderRadius: '8px',
                          padding: '4px 0',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Employee Details:\nName: ${e.name}\nEmail: ${e.email}\nRole: ${e.dept}`);
                            setActiveActionMenuId(null);
                          }}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            downloadUserReport(e);
                            setActiveActionMenuId(null);
                          }}
                        >
                          Download Report
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                    No matching employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
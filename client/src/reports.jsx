import React, { useState, useEffect } from 'react';
import { getTasks, getAssignableUsers, getProjects } from './api';
import './reports.css';

function Reports({ userRole = 'User' }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTasks(), getProjects(), getAssignableUsers()])
      .then(([tRes, pRes, uRes]) => {
        setTasks(Array.isArray(tRes?.data) ? tRes.data : []);
        setProjects(Array.isArray(pRes?.data) ? pRes.data : []);
        setUsers(Array.isArray(uRes?.data) ? uRes.data : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.completed).length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || (!t.status && !t.completed)).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  function handlePrintReport() {
    window.print();
  }

  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-heading flex-between">
        <div>
          <h2 style={{display:"flex", alignItems:"center", gap:"8px"}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Workspace Reports</h2>
          <p>Generate and export workspace productivity & summary reports</p>
        </div>
        <button onClick={handlePrintReport} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Export / Print Report
        </button>
      </div>
      

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report...</div>
      ) : (
        <>
          <div className="metric-grid">
            <article className="metric-card sand">
              <span>Overall Completion Rate</span>
              <strong>{completionRate}%</strong>
              <p>{completedTasks} of {totalTasks} tasks completed</p>
            </article>
            <article className="metric-card peach">
              <span>Pending Tasks</span>
              <strong>{pendingTasks}</strong>
              <p>Tasks waiting to start</p>
            </article>
            <article className="metric-card blush">
              <span>In Progress Tasks</span>
              <strong>{inProgressTasks}</strong>
              <p>Active work in motion</p>
            </article>
            <article className="metric-card mint">
              <span>Active Projects</span>
              <strong>{projects.length}</strong>
              <p>Total workstreams</p>
            </article>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="panel" style={{ background: 'var(--bg-cream)' }}>
              <h3>Task Status Summary</h3>
              <ul style={{ listStyle: 'none', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>Completed Tasks</span>
                  <strong style={{ color: 'var(--status-completed-color)' }}>{completedTasks} ({percentOf(completedTasks, totalTasks)}%)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>In Progress Tasks</span>
                  <strong style={{ color: 'var(--status-progress-color)' }}>{inProgressTasks} ({percentOf(inProgressTasks, totalTasks)}%)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>Pending Tasks</span>
                  <strong style={{ color: 'var(--status-pending-color)' }}>{pendingTasks} ({percentOf(pendingTasks, totalTasks)}%)</strong>
                </li>
              </ul>
            </div>

            <div className="panel" style={{ background: 'var(--bg-cream)' }}>
              <h3>Team Member Summary</h3>
              <ul style={{ listStyle: 'none', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>Registered Team Members</span>
                  <strong>{users.length} members</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>Total Assigned Tasks</span>
                  <strong>{totalTasks} tasks</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '6px' }}>
                  <span>Active Workspace Projects</span>
                  <strong>{projects.length} projects</strong>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function percentOf(val, total) {
  return total ? Math.round((val / total) * 100) : 0;
}

export default Reports;

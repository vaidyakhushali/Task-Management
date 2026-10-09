import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./dashboard.css";
import {
  getNotifications,
  getProjects,
  getTasks,
  markNotificationRead,
  getMyAttendance,
  getTeamAttendance,
  checkIn,
  checkOut,
} from "./api";

import Tasks from "./task";
import Projects from "./projects";
import Analytics from "./analytics";
import CalendarView from "./calendar";
import TeamMembers from "./team-members";
import Reports from "./reports";
import Settings from "./settings";
import Notification from "./notification";
import Trash from "./trash";
import Chat from "./chat";

const menuItems = [
  "Dashboard",
  "Tasks",
  "Projects",
  "Chat",
  "Analytics",
  "Calendar",
  "Team Members",
  "Reports",
  "Trash",
];
const adminOnlyTabs = ["Analytics", "Reports", "Trash"];
const generalItems = ["Settings"];

function getToastCategory(notification) {
  if (!notification) return "workspace";
  const title = (notification.title || "").toLowerCase();
  const msg = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  if (
    title.includes("password") ||
    msg.includes("password") ||
    title.includes("security")
  ) {
    return "security";
  }
  if (type === "chat" || title.includes("message") || title.includes("chat")) {
    return "chat";
  }
  if (title.includes("project") || msg.includes("project")) {
    return "project";
  }
  if (
    type === "task" ||
    title.includes("task") ||
    msg.includes("task") ||
    notification.task
  ) {
    return "task";
  }
  return "workspace";
}

function getToastBadge(category) {
  switch (category) {
    case "task":
      return "Task Update";
    case "project":
      return "Project Update";
    case "security":
      return "Security Notice";
    case "chat":
      return "New Message";
    default:
      return "Workspace Alert";
  }
}

function Dashboard({ user, userName = "Admin", userRole = "User", onLogout }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toastAlert, setToastAlert] = useState(null);
  const [notificationToOpen, setNotificationToOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  function openStatusTab(statusKey) {
    setTaskStatusFilter(statusKey);
    setActiveTab("Tasks");
  }

  function handleStartChat(chatUser) {
    setSelectedChatUser(chatUser);
    setActiveTab("Chat");
  }

  const [theme, setTheme] = useState(
    () => localStorage.getItem("taskmanagement_theme") || "light",
  );
  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem("taskmanagement_fontSize") || "medium",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("taskmanagement_theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("taskmanagement_fontSize", fontSize);
  }, [fontSize]);

  const isAdmin = userRole === "Admin";
  const visibleMenuItems = useMemo(
    () =>
      isAdmin
        ? menuItems
        : menuItems.filter((item) => !adminOnlyTabs.includes(item)),
    [isAdmin],
  );

  useEffect(() => {
    if (!isAdmin && adminOnlyTabs.includes(activeTab)) {
      setActiveTab("Dashboard");
    }
  }, [activeTab, isAdmin]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [taskResponse, projectResponse, notificationResponse] =
        await Promise.all([getTasks(), getProjects(), getNotifications()]);

      const fetchedTasks = Array.isArray(taskResponse?.data)
        ? taskResponse.data
        : [];
      const fetchedProjects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];
      const fetchedNotifications = Array.isArray(notificationResponse?.data)
        ? notificationResponse.data
        : [];

      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setNotifications(fetchedNotifications);

      const unreadNotification = fetchedNotifications.find((item) => !item.read);
      setToastAlert(unreadNotification || null);
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadAttendance = useCallback(async () => {
    setAttendanceError("");
    try {
      const [myResponse, teamResponse] = await Promise.all([
        getMyAttendance(),
        isAdmin ? getTeamAttendance() : Promise.resolve(null),
      ]);
      setAttendanceToday(myResponse.data?.today || null);
      setAttendanceHistory(
        Array.isArray(myResponse.data?.history) ? myResponse.data.history : [],
      );
      setTeamAttendance(teamResponse?.data || null);
    } catch (attendanceLoadError) {
      setAttendanceError(
        attendanceLoadError.message || "Unable to load attendance.",
      );
    } finally {
      setAttendanceLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, [loadAttendance, user?._id]);

  async function handleAttendanceAction() {
    setAttendanceBusy(true);
    setAttendanceError("");
    try {
      if (attendanceToday && !attendanceToday.checkOutAt) {
        await checkOut();
      } else if (!attendanceToday) {
        await checkIn();
      }
      await loadAttendance();
    } catch (attendanceActionError) {
      setAttendanceError(
        attendanceActionError.message || "Unable to update attendance.",
      );
    } finally {
      setAttendanceBusy(false);
    }
  }

  async function closeToast() {
    if (toastAlert?._id) {
      try {
        await markNotificationRead(toastAlert._id);
      } catch (err) {
        console.error(err);
      }
    }
    setToastAlert(null);
  }

  function openToastNotification() {
    if (!toastAlert) return;
    setNotificationToOpen(toastAlert);
    setToastAlert(null);
    setActiveTab("Notifications");
  }

  const dashboard = useMemo(() => {
    const totalTasks = tasks.length;
    const completed = tasks.filter(isCompleted).length;
    const inProgress = tasks.filter(
      (task) => task.status === "in-progress",
    ).length;
    const pending = Math.max(totalTasks - completed - inProgress, 0);
    const completionRate = percentOf(completed, totalTasks);
    const averageDays = getAverageDaysToDue(tasks);

    const priority = {
      high: tasks.filter((task) => task.priority === "high").length,
      medium: tasks.filter((task) => task.priority === "medium").length,
      low: tasks.filter((task) => task.priority === "low").length,
    };

    return {
      totalTasks,
      activeProjects: projects.length,
      completed,
      inProgress,
      pending,
      completionRate,
      averageDays,
      priority,
    };
  }, [projects, tasks]);

  const statusCards = [
    {
      label: "Pending",
      value: dashboard.pending,
      color: "blue",
      percent: percentOf(dashboard.pending, dashboard.totalTasks),
      statusKey: "pending",
    },
    {
      label: "In Progress",
      value: dashboard.inProgress,
      color: "orange",
      percent: percentOf(dashboard.inProgress, dashboard.totalTasks),
      statusKey: "in-progress",
    },
    {
      label: "Completed",
      value: dashboard.completed,
      color: "green",
      percent: percentOf(dashboard.completed, dashboard.totalTasks),
      statusKey: "completed",
    },
  ];

  const query = searchQuery.trim().toLowerCase();
  const visibleTasks = useMemo(() => {
    if (!query) return tasks;
    return tasks.filter((task) => {
      const haystack = [
        task.title,
        task.description,
        task.priority,
        task.status,
        task.assignedUser?.fullname,
        task.assignedUser?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [query, tasks]);

  const workloadRows = buildWorkloadRows(tasks, displayName);
  const unreadNotificationsCount = notifications.filter(
    (item) => !item.read,
  ).length;
  const firstName = String(displayName || "Admin").split(" ")[0];
  const attendanceRate = isAdmin
    ? teamAttendance?.attendanceRate || 0
    : attendanceToday
      ? 100
      : 0;

  return (
    <div className="dashboard-page">
      {toastAlert && (
        <aside className="toast-container" aria-live="polite" aria-label="Notification alert">
          {(() => {
            const category = getToastCategory(toastAlert);
            return (
              <div className={`toast-card toast-${category}`}>
                <button
                  className="toast-open-button"
                  type="button"
                  onClick={openToastNotification}
                  aria-label={`Open notification: ${toastAlert.title || toastAlert.message || "Workspace update"}`}
                >
                  <div className={`toast-icon-wrap toast-icon-${category}`} aria-hidden="true">
                    {category === "task" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    )}
                    {category === "project" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                    {category === "security" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {category === "chat" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                    {category === "workspace" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    )}
                  </div>
                  <div className="toast-content">
                    <div className="toast-header-row">
                      <span className={`toast-badge toast-badge-${category}`}>
                        {getToastBadge(category)}
                      </span>
                      <span className="toast-time">Just now</span>
                    </div>
                    <strong className="toast-title">{toastAlert.title || "Workspace Update"}</strong>
                    <span className="toast-message">{toastAlert.message}</span>
                  </div>
                </button>
                <button
                  className="toast-close"
                  type="button"
                  onClick={closeToast}
                  aria-label="Dismiss notification"
                  title="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            );
          })()}
        </aside>
      )}

      <div className="dashboard-shell">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="brand-card">
            <div className="brand-mark">T</div>
            <strong>TaskFlow</strong>
            <button
              className="sidebar-close-btn"
              type="button"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="side-nav" aria-label="Main navigation">
            <p>Menu</p>
            {visibleMenuItems.map((item) => (
              <button
                className={`nav-item ${activeTab === item ? "active" : ""}`}
                type="button"
                key={item}
                onClick={() => {
                  setActiveTab(item);
                  setSidebarOpen(false);
                }}
              >
                <span>{getMenuIcon(item)}</span>
                {item}
              </button>
            ))}
          </nav>

          <nav className="side-nav general-nav" aria-label="General navigation">
            <p>General</p>
            {generalItems.map((item) => (
              <button
                className={`nav-item ${activeTab === item ? "active" : ""}`}
                type="button"
                key={item}
                onClick={() => {
                  setActiveTab(item);
                  setSidebarOpen(false);
                }}
              >
                <span>{getMenuIcon(item)}</span>
                {item}
              </button>
            ))}
            <button
              className="nav-item logout-nav-item"
              type="button"
              onClick={onLogout}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="mobile-hamburger-btn"
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label="Toggle Navigation Menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <h1>Welcome back, {firstName}</h1>
                <p>Here is what is happening with your team today</p>
              </div>
            </div>
            <div className="topbar-appearance-controls">
              <input
                type="text"
                className="dashboard-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, people, projects"
                aria-label="Search dashboard data"
                style={{
                  minWidth: "180px",
                  maxWidth: "260px",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  background: "rgba(15, 23, 42, 0.02)",
                  color: "inherit",
                }}
              />
              <button
                className="topbar-theme-btn"
                type="button"
                onClick={() =>
                  setTheme((prev) => (prev === "light" ? "dark" : "light"))
                }
                title={
                  theme === "light"
                    ? "Switch to Dark Mode"
                    : "Switch to Light Mode"
                }
                aria-label="Toggle Dark/Light Mode"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {theme === "light" ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#6366f1"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    Night
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#facc15"
                      stroke="#eab308"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                    Day
                  </>
                )}
              </button>

              <select
                className="topbar-fontsize-select"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                title="Adjust Text Size"
                aria-label="Adjust Text Size"
              >
                <option value="small">A- Small</option>
                <option value="medium">A Normal</option>
                <option value="large">A+ Large</option>
                <option value="xlarge">A++ Extra</option>
              </select>
            </div>

            <div className="topbar-user-actions">
              {/* NOTIFICATION BELL SVG */}
              <button
                className="notification-button"
                type="button"
                onClick={() => setActiveTab("Notifications")}
                aria-label="Notifications"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotificationsCount > 0 && (
                  <b>
                    {unreadNotificationsCount > 9
                      ? "9+"
                      : unreadNotificationsCount}
                  </b>
                )}
              </button>

              <div
                className="account-box"
                onClick={() => setActiveTab("Settings")}
                role="button"
                tabIndex="0"
                title="Click to open Settings"
              >
                <div className="user-avatar">{getInitials(displayName)}</div>
                <div>
                  <strong>{displayName}</strong>
                  <small>{user?.email || userRole}</small>
                </div>
              </div>
            </div>
          </header>

          {error && <div className="dashboard-alert">{error}</div>}

          <div className="dashboard-view" key={activeTab}>
            {activeTab === "Dashboard" && (
              <>
                <section className="metric-grid">
                  <MetricCard
                    title="Active Projects"
                    value={dashboard.activeProjects}
                    helper="Projects in workspace"
                    tone="sand"
                    loading={loading}
                  />
                  <MetricCard
                    title="Task Completion Rate"
                    value={`${dashboard.completionRate}%`}
                    helper={`${dashboard.completed} of ${dashboard.totalTasks} tasks completed`}
                    tone="peach"
                    loading={loading}
                  />
                  <MetricCard
                    title="Average Time"
                    value={`${dashboard.averageDays}`}
                    suffix=" Days"
                    helper="Average days until due"
                    tone="mint"
                    loading={loading}
                  />
                  <MetricCard
                    title="At Risk Projects"
                    value={dashboard.overdue}
                    helper="Tasks currently overdue"
                    tone="blush"
                    loading={loading}
                  />
                </section>

                <div className="dashboard-grid">
                  <section className="panel status-panel">
                    <PanelHeader
                      title="Task Status Distribution"
                      helper="Click any card to filter tasks"
                      hideMenu={true}
                    />
                    <div className="status-bars">
                      {statusCards.map((item) => (
                        <div
                          className={`status-card ${item.color}`}
                          key={item.label}
                          onClick={() => openStatusTab(item.statusKey)}
                          title={`Click to view all ${item.label} tasks`}
                          role="button"
                          tabIndex="0"
                        >
                          <span>{item.label}</span>
                          <strong>{item.percent}%</strong>
                          <div>
                            <i style={{ width: `${item.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel priority-panel">
                    <PanelHeader
                      title="Task Priority"
                      helper="Distribution by priority level"
                      hideMenu={true}
                    />
                    <PriorityDonut
                      priority={dashboard.priority}
                      total={dashboard.totalTasks}
                    />
                  </section>
                </div>

                {/* WORK PROGRESS & WORKING STATUS ROW */}
                <div className="dashboard-grid" style={{ marginTop: "16px" }}>
                  <section className="panel work-progress-panel">
                    <PanelHeader
                      title="Work Progress"
                      action="See All"
                      onActionClick={() => setActiveTab("Projects")}
                    />
                    <div className="work-progress-cards">
                      {projects.length > 0 ? (
                        projects.slice(0, 2).map((proj) => {
                          const projTasks = tasks.filter(
                            (t) =>
                              String(t.project?._id || t.project) ===
                              String(proj._id),
                          );
                          const done = projTasks.filter(
                            (t) => t.status === "completed",
                          ).length;
                          const pct =
                            projTasks.length > 0
                              ? Math.round((done / projTasks.length) * 100)
                              : 50;

                          return (
                            <div
                              className="work-progress-card"
                              key={proj._id || proj.name}
                            >
                              <span className="work-progress-type">
                                Ongoing Project
                              </span>
                              <strong>{proj.name}</strong>
                              <div className="progress-bar-wrap">
                                <div
                                  className="progress-bar-fill"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <small>{pct}% Complete</small>
                              <div className="work-progress-dates">
                                <span>Start Date: 10 Jan</span>
                                <span>End Date: 29 Jan</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="empty-state">No ongoing projects.</div>
                      )}
                    </div>
                  </section>

                  <section className="panel attendance-panel">
                    <PanelHeader
                      title="Today's Attendance"
                      helper="Record your daily check-in and check-out"
                      hideMenu={true}
                    />
                    <div className="attendance-summary">
                      <div className="working-status-ring-container">
                        <div
                          className="working-status-ring"
                          style={{
                            background: `conic-gradient(#6366f1 0% ${attendanceRate}%, var(--soft-border) ${attendanceRate}% 100%)`,
                          }}
                        >
                          <div className="working-status-center">
                            <strong>
                              {attendanceLoading
                                ? "..."
                                : `${attendanceRate}%`}
                            </strong>
                            <span>{isAdmin ? "Team present" : "Checked in"}</span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && teamAttendance && (
                        <p className="attendance-team-count">
                          {teamAttendance.checkedIn} of{" "}
                          {teamAttendance.totalMembers} team members checked in
                          today
                        </p>
                      )}
                    </div>
                    {attendanceError && (
                      <p className="attendance-error" role="alert">
                        {attendanceError}
                      </p>
                    )}
                    <p className="attendance-current-status">
                      {attendanceLoading
                        ? "Loading your attendance..."
                        : !attendanceToday
                          ? "You haven't checked in today."
                          : attendanceToday.checkOutAt
                            ? `Checked out at ${formatAttendanceTime(attendanceToday.checkOutAt)}`
                            : `Checked in at ${formatAttendanceTime(attendanceToday.checkInAt)}`}
                    </p>
                    <button
                      className="attendance-action-button"
                      type="button"
                      onClick={handleAttendanceAction}
                      disabled={
                        attendanceLoading ||
                        attendanceBusy ||
                        Boolean(attendanceToday?.checkOutAt)
                      }
                    >
                      {attendanceBusy
                        ? "Saving..."
                        : attendanceToday?.checkOutAt
                          ? "Attendance complete"
                          : attendanceToday
                            ? "Check Out"
                            : "Check In"}
                    </button>
                    {isAdmin && teamAttendance?.members?.length > 0 && (
                      <div className="attendance-team-list">
                        <h3>Team status</h3>
                        {teamAttendance.members.slice(0, 5).map((member) => (
                          <div
                            className="attendance-history-row"
                            key={member.id}
                          >
                            <span>{member.fullname}</span>
                            <strong
                              className={
                                member.attendance
                                  ? member.attendance.checkOutAt
                                    ? "checked-out"
                                    : "checked-in"
                                  : "not-checked-in"
                              }
                            >
                              {!member.attendance
                                ? "Not checked in"
                                : member.attendance.checkOutAt
                                  ? "Checked out"
                                  : "Working"}
                            </strong>
                          </div>
                        ))}
                        {teamAttendance.members.length > 5 && (
                          <small className="attendance-history-note">
                            And {teamAttendance.members.length - 5} more team
                            members
                          </small>
                        )}
                      </div>
                    )}
                    <div className="attendance-history">
                      <h3>Recent attendance</h3>
                      {attendanceHistory.length ? (
                        attendanceHistory.slice(0, 5).map((record) => (
                          <div
                            className="attendance-history-row"
                            key={record._id}
                          >
                            <span>{formatAttendanceDate(record.dateKey)}</span>
                            <span>
                              In {formatAttendanceTime(record.checkInAt)}
                              {record.checkOutAt
                                ? ` · Out ${formatAttendanceTime(record.checkOutAt)}`
                                : " · Still checked in"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="attendance-history-note">
                          No attendance history yet.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                {/* THIRD ROW: TEAM WORKLOAD */}
                <div className="dashboard-grid bottom-grid">
                  <section className="panel workload-panel full-width-panel">
                    <PanelHeader
                      title="Team Workload"
                      action="See All"
                      onActionClick={() => setActiveTab("Team Members")}
                    />
                    <div className="workload-table">
                      <div className="workload-head">
                        <span>Name</span>
                        <span>Active work</span>
                        <span>Overdue</span>
                        <span>Status</span>
                      </div>

                      {loading ? (
                        <LoadingRows />
                      ) : workloadRows.length ? (
                        workloadRows.map((row) => (
                          <div className="workload-row" key={row.name}>
                            <div className="person-cell">
                              <div className="person-avatar">
                                {getInitials(row.name)}
                              </div>
                              <div>
                                <strong>{row.name}</strong>
                                <small>{row.role}</small>
                              </div>
                            </div>
                            <span data-label="Active work">{row.active}</span>
                            <span data-label="Overdue">{row.overdue}</span>
                            <span
                              className={`workload-status ${row.tone}`}
                              data-label="Status"
                            >
                              {row.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">No workload data yet.</div>
                      )}
                    </div>
                  </section>
                </div>

                {/* FOURTH ROW: RECENT TASKS PANEL */}
                <section className="panel task-panel">
                  <PanelHeader
                    title="Recent Tasks"
                    action="See All"
                    onActionClick={() => setActiveTab("Tasks")}
                    helper="Live from your backend task list"
                  />
                  <div className="task-list">
                    {loading ? (
                      <LoadingRows />
                    ) : visibleTasks.length ? (
                      visibleTasks
                        .slice(0, 6)
                        .map((task) => (
                          <TaskRow
                            task={task}
                            key={task._id || task.id || task.title}
                            onStatusClick={(st) => openStatusTab(st || "all")}
                          />
                        ))
                    ) : (
                      <div className="empty-state">
                        {searchQuery
                          ? "No tasks match your search."
                          : "No tasks found yet."}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeTab === "Tasks" && (
              <Tasks
                user={user}
                onTaskAssigned={loadDashboard}
                initialStatusFilter={taskStatusFilter}
              />
            )}

            {activeTab === "Projects" && (
              <Projects
                search={searchQuery}
                userRole={userRole}
                onProjectsChanged={loadDashboard}
              />
            )}

            {activeTab === "Analytics" && isAdmin && (
              <Analytics
                stats={{
                  total: dashboard.totalTasks,
                  completed: dashboard.completed,
                  remaining: dashboard.inProgress + dashboard.pending,
                }}
                userRole={userRole}
              />
            )}
            {activeTab === "Chat" && (
              <Chat
                user={user}
                initialChatUser={selectedChatUser}
                onChatUserSelected={setSelectedChatUser}
              />
            )}

            {activeTab === "Calendar" && (
              <CalendarView
                user={user}
                userName={displayName}
                userRole={userRole}
              />
            )}

            {activeTab === "Team Members" && (
              <TeamMembers
                search={searchQuery || ""}
                user={user}
                userRole={userRole}
                onStartChat={handleStartChat}
              />
            )}

            {activeTab === "Reports" && isAdmin && (
              <Reports userRole={userRole} />
            )}
            {activeTab === "Trash" && isAdmin && <Trash />}
            {activeTab === "Settings" && (
              <Settings
                user={user}
                userName={displayName}
                userRole={userRole}
                theme={theme}
                onThemeChange={setTheme}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                onWorkspaceNameChange={() => { }}
                onProfileNameChange={(newName) => setDisplayName(newName)}
                onPasswordChanged={loadDashboard}
              />
            )}
            {activeTab === "Notifications" && (
              <Notification
                onUnreadChange={() => { }}
                notificationToOpen={notificationToOpen}
                onNotificationOpened={() => setNotificationToOpen(null)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, helper, suffix = "", tone, loading }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{title}</span>
      <strong>
        {loading ? "--" : value}
        <small>{loading ? "" : suffix}</small>
      </strong>
      <p>{helper}</p>
    </article>
  );
}

function PanelHeader({
  title,
  helper,
  action,
  onActionClick,
  hideMenu = false,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleButtonClick(e) {
    if (onActionClick && action) {
      onActionClick(e);
    } else {
      setShowMenu((prev) => !prev);
    }
  }

  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {helper && <p>{helper}</p>}
      </div>

      {!hideMenu && (
        <div
          className="panel-more-container"
          ref={menuRef}
          style={{ position: "relative" }}
        >
          <button
            className="more-button"
            type="button"
            onClick={handleButtonClick}
          >
            {action || "..."}
          </button>

          {showMenu && (
            <div className="panel-more-menu">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (onActionClick) onActionClick();
                }}
              >
                View Details
              </button>
              <button type="button" onClick={() => setShowMenu(false)}>
                Refresh Section
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityDonut({ priority, total }) {
  const high = percentOf(priority.high, total);
  const medium = percentOf(priority.medium, total);

  return (
    <div className="priority-donut-container">
      <div
        className="priority-donut"
        style={{
          "--high": `${high}%`,
          "--medium": `${high + medium}%`,
        }}
      >
        <span />
      </div>
      <div className="priority-legend">
        <span>
          <i className="high" />
          High Priority: {priority.high}
        </span>
        <span>
          <i className="medium" />
          Medium Priority: {priority.medium}
        </span>
        <span>
          <i className="low" />
          Low Priority: {priority.low}
        </span>
      </div>
    </div>
  );
}

function TaskRow({ task, onStatusClick }) {
  return (
    <div className="task-row">
      <span className={`task-dot ${task.priority || "medium"}`} />
      <div className="task-info">
        <strong>{task.title || "Untitled task"}</strong>
        <small>{task.project?.name || task.taskType || "General task"}</small>
      </div>
      <span>{formatDate(task.dueDate)}</span>
      <span
        className={`task-badge ${task.status || "pending"}`}
        onClick={() => onStatusClick?.(task.status)}
        style={{ cursor: "pointer" }}
        title="Click to filter by this status"
      >
        {formatStatus(task.status)}
      </span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-rows-wrapper">
      <div className="loading-row" />
      <div className="loading-row" />
      <div className="loading-row" />
    </div>
  );
}

function buildWorkloadRows(tasks, fallbackName) {
  const grouped = new Map();

  tasks.forEach((task) => {
    const person = task.assignedUser || task.creator || {};
    const name =
      person.fullname || person.username || fallbackName || "Team Member";
    const current = grouped.get(name) || {
      name,
      role: person.role || "Team Member",
      active: 0,
      overdue: 0,
    };

    if (!isCompleted(task)) current.active += 1;
    if (isOverdue(task)) current.overdue += 1;
    grouped.set(name, current);
  });

  return Array.from(grouped.values()).map((row) => {
    if (row.overdue >= 3)
      return { ...row, status: "Overloaded", tone: "danger" };
    if (row.overdue > 0) return { ...row, status: "On Track", tone: "warning" };
    if (row.active >= 6)
      return { ...row, status: "Under Pressure", tone: "busy" };
    return { ...row, status: "Balanced", tone: "good" };
  });
}

function isCompleted(task) {
  return Boolean(task.completed || task.status === "completed");
}

function isOverdue(task) {
  if (!task.dueDate || isCompleted(task)) return false;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function getAverageDaysToDue(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayCounts = tasks
    .filter((task) => task.dueDate && !isCompleted(task))
    .map((task) =>
      Math.max(0, Math.ceil((new Date(task.dueDate) - today) / 86400000)),
    )
    .filter((value) => Number.isFinite(value));

  if (!dayCounts.length) return 0;
  return (
    dayCounts.reduce((sum, value) => sum + value, 0) / dayCounts.length
  ).toFixed(1);
}

function percentOf(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatDate(date) {
  if (!date) return "No due date";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "No due date";
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatAttendanceTime(date) {
  if (!date) return "--";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "--";
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatAttendanceDate(dateKey) {
  if (!dateKey) return "Unknown date";
  const value = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(value.getTime())) return "Unknown date";
  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status = "pending") {
  if (status === "in-progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getMenuIcon(item) {
  const icons = {
    Dashboard: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" fill="#e0e7ff" />
        <rect x="14" y="3" width="7" height="5" rx="1" fill="#e0e7ff" />
        <rect x="14" y="12" width="7" height="9" rx="1" fill="#e0e7ff" />
        <rect x="3" y="16" width="7" height="5" rx="1" fill="#e0e7ff" />
      </svg>
    ),
    Trash: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    ),
    Tasks: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" fill="#dbeafe" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
    Projects: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          fill="#fef3c7"
        />
      </svg>
    ),
    Chat: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#e0f2fe" />
      </svg>
    ),
    Analytics: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    Calendar: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ec4899"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#fce7f3" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    "Team Members": (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" fill="#ede9fe" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    Reports: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          fill="#cffaffe"
        />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    Settings: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#64748b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" fill="#cbd5e1" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };

  return (
    icons[item] || (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="8" />
      </svg>
    )
  );
}
export default Dashboard;

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import "./notification.css";

function getNotificationCategory(notification) {
  if (!notification) return "workspace";
  const title = (notification.title || "").toLowerCase();
  const msg = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  if (
    title.includes("password") ||
    msg.includes("password") ||
    title.includes("security") ||
    title.includes("auth")
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

function CategoryIcon({ category }) {
  if (category === "task") {
    return (
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
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }
  if (category === "project") {
    return (
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
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (category === "security") {
    return (
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
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (category === "chat") {
    return (
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function getCategoryLabel(category) {
  switch (category) {
    case "task":
      return "Task Event";
    case "project":
      return "Project Event";
    case "security":
      return "Security Notice";
    case "chat":
      return "Team Message";
    default:
      return "Workspace Alert";
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Notification({
  onUnreadChange,
  notificationToOpen,
  onNotificationOpened,
}) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNotification, setActiveNotification] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await getNotifications();
        const list = Array.isArray(response?.data) ? response.data : [];
        setNotifications(list);
        if (typeof onUnreadChange === "function") {
          onUnreadChange(
            list.filter((notification) => !notification.read).length,
          );
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
    const notificationRefresh = setInterval(loadNotifications, 10000);
    return () => clearInterval(notificationRefresh);
  }, [onUnreadChange]);

  useEffect(() => {
    if (!notificationToOpen || isLoading) return;

    setActiveNotification(notificationToOpen);
    onNotificationOpened?.();

    if (!notificationToOpen.read && notificationToOpen._id) {
      markNotificationRead(notificationToOpen._id)
        .then(() => {
          setNotifications((currentNotifications) =>
            currentNotifications.map((notification) =>
              notification._id === notificationToOpen._id
                ? { ...notification, read: true }
                : notification,
            ),
          );
        })
        .catch((readError) => setError(readError.message));
    }
  }, [notificationToOpen, isLoading, onNotificationOpened]);

  useEffect(() => {
    if (activeNotification) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setActiveNotification(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeNotification]);

  function updateNotifications(nextNotifications) {
    setNotifications(nextNotifications);
    if (typeof onUnreadChange === "function") {
      onUnreadChange(
        nextNotifications.filter((notification) => !notification.read).length,
      );
    }
  }

  async function markAsRead(notificationId) {
    try {
      await markNotificationRead(notificationId);
      updateNotifications(
        notifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (readError) {
      setError(readError.message);
    }
  }

  async function markAllAsRead() {
    try {
      await markAllNotificationsRead();
      updateNotifications(
        notifications.map((notification) => ({ ...notification, read: true })),
      );
    } catch (readError) {
      setError(readError.message);
    }
  }

  async function openNotification(notification) {
    if (!notification.read) await markAsRead(notification._id);
    setActiveNotification(notification);
  }

  // Counts for Stats & Filter Tabs
  const counts = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const task = notifications.filter(
      (n) => getNotificationCategory(n) === "task",
    ).length;
    const project = notifications.filter(
      (n) => getNotificationCategory(n) === "project",
    ).length;
    const security = notifications.filter(
      (n) => getNotificationCategory(n) === "security",
    ).length;

    return { total, unread, task, project, security };
  }, [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const category = getNotificationCategory(item);

      if (activeFilter === "unread" && item.read) return false;
      if (activeFilter === "task" && category !== "task") return false;
      if (activeFilter === "project" && category !== "project") return false;
      if (activeFilter === "security" && category !== "security") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const messageMatch = item.message?.toLowerCase().includes(query);
        const actorMatch = item.actor?.fullname?.toLowerCase().includes(query);
        return titleMatch || messageMatch || actorMatch;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  return (
    <section className="notification-page" aria-labelledby="notification-title">
      {/* HEADER */}
      <div className="notification-heading">
        <div>
          <span className="dashboard-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Workspace Activity
          </span>
          <h2 id="notification-title">Notifications & Activity Feed</h2>
          <p>Real-time alerts for project milestones, task updates, team chats, and security.</p>
        </div>
        <div className="notification-header-actions">
          <button
            className="notification-clear-button"
            type="button"
            onClick={markAllAsRead}
            disabled={counts.unread === 0}
            title="Mark all notifications as read"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark all as read
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="notification-stats-grid">
        <div
          className={`notif-stat-card ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
          role="button"
          tabIndex="0"
        >
          <div className="notif-stat-icon all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-label">All Alerts</span>
            <strong className="notif-stat-value">{counts.total}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeFilter === "unread" ? "active" : ""}`}
          onClick={() => setActiveFilter("unread")}
          role="button"
          tabIndex="0"
        >
          <div className="notif-stat-icon unread">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-label">Unread</span>
            <strong className="notif-stat-value">{counts.unread}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeFilter === "task" ? "active" : ""}`}
          onClick={() => setActiveFilter("task")}
          role="button"
          tabIndex="0"
        >
          <div className="notif-stat-icon task">
            <CategoryIcon category="task" />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-label">Tasks</span>
            <strong className="notif-stat-value">{counts.task}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeFilter === "project" ? "active" : ""}`}
          onClick={() => setActiveFilter("project")}
          role="button"
          tabIndex="0"
        >
          <div className="notif-stat-icon project">
            <CategoryIcon category="project" />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-label">Projects</span>
            <strong className="notif-stat-value">{counts.project}</strong>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeFilter === "security" ? "active" : ""}`}
          onClick={() => setActiveFilter("security")}
          role="button"
          tabIndex="0"
        >
          <div className="notif-stat-icon security">
            <CategoryIcon category="security" />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-label">Security & Settings</span>
            <strong className="notif-stat-value">{counts.security}</strong>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER CHIPS */}
      <div className="notification-toolbar">
        <div className="notif-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="notif-search-input"
            placeholder="Search by title, project, task or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notif-filter-chips">
          <button
            type="button"
            className={`notif-chip-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All <span className="notif-chip-badge">{counts.total}</span>
          </button>
          <button
            type="button"
            className={`notif-chip-btn ${activeFilter === "unread" ? "active" : ""}`}
            onClick={() => setActiveFilter("unread")}
          >
            Unread <span className="notif-chip-badge">{counts.unread}</span>
          </button>
          <button
            type="button"
            className={`notif-chip-btn ${activeFilter === "task" ? "active" : ""}`}
            onClick={() => setActiveFilter("task")}
          >
            Tasks <span className="notif-chip-badge">{counts.task}</span>
          </button>
          <button
            type="button"
            className={`notif-chip-btn ${activeFilter === "project" ? "active" : ""}`}
            onClick={() => setActiveFilter("project")}
          >
            Projects <span className="notif-chip-badge">{counts.project}</span>
          </button>
          <button
            type="button"
            className={`notif-chip-btn ${activeFilter === "security" ? "active" : ""}`}
            onClick={() => setActiveFilter("security")}
          >
            Security <span className="notif-chip-badge">{counts.security}</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION CARDS LIST */}
      <div className="notification-list">
        {error && (
          <p className="settings-message error-message" role="alert">
            {error}
          </p>
        )}

        {isLoading && (
          <div className="notification-empty-state">
            <p>Loading your workspace notifications...</p>
          </div>
        )}

        {!isLoading && !error && filteredNotifications.length === 0 && (
          <div className="notification-empty-state">
            <div className="notif-empty-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h3>All caught up!</h3>
            <p>
              {searchQuery
                ? "No notifications match your search query."
                : activeFilter !== "all"
                  ? `No ${activeFilter} notifications found.`
                  : "You're all set! Future task assignments, project updates, and security alerts will appear here."}
            </p>
          </div>
        )}

        {!isLoading &&
          filteredNotifications.map((notification) => {
            const category = getNotificationCategory(notification);
            const actorName = notification.actor?.fullname || "Team Member";
            const actorInitial = actorName.charAt(0).toUpperCase();

            return (
              <article
                className={`notification-item cat-${category} ${notification.read ? "read" : "unread"}`}
                key={notification._id}
                onClick={() => openNotification(notification)}
                tabIndex="0"
                role="button"
              >
                {/* Left Category Icon */}
                <div className={`notification-type-badge cat-${category}`} aria-hidden="true">
                  <CategoryIcon category={category} />
                </div>

                {/* Content */}
                <div className="notification-copy">
                  <div className="notif-card-header">
                    <span className={`notif-category-pill cat-${category}`}>
                      {getCategoryLabel(category)}
                    </span>
                    <span className="notif-timestamp-tag">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>

                  <div className="notif-card-footer">
                    <div className="notif-actor-chip">
                      <span className="notif-actor-avatar">{actorInitial}</span>
                      <span>{actorName}</span>
                      {notification.actor?.role && (
                        <span className="notif-role-badge">{notification.actor.role}</span>
                      )}
                    </div>

                    <div className="notif-card-actions">
                      {!notification.read && (
                        <span className="notification-unread-dot" title="Unread notification" />
                      )}
                      {!notification.read && (
                        <button
                          className="notification-read-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          title="Mark as read"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {/* DETAIL MODAL (Rendered via Portal directly into document.body to ensure true full-viewport centering on mobile & desktop) */}
      {activeNotification &&
        ReactDOM.createPortal(
          <div
            className="notification-modal-backdrop"
            role="presentation"
            onClick={() => setActiveNotification(null)}
          >
            <section
              className="notification-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-detail-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="notification-close-button"
                type="button"
                onClick={() => setActiveNotification(null)}
                aria-label="Close notification details"
              >
                ✕
              </button>

              <div className="notification-modal-heading">
                <span className={`notif-category-pill cat-${getNotificationCategory(activeNotification)}`}>
                  {getCategoryLabel(getNotificationCategory(activeNotification))}
                </span>
                <h2 id="notification-detail-title">
                  {activeNotification.title || "Notification Details"}
                </h2>
              </div>

              <div className="notif-modal-message-box">
                {activeNotification.message}
              </div>

              <dl className="notification-detail-list">
                <div>
                  <dt>Initiated By</dt>
                  <dd>
                    {activeNotification.actor?.fullname || "Workspace member"}{" "}
                    ({activeNotification.actor?.role || "User"})
                  </dd>
                </div>

                <div>
                  <dt>Date & Time</dt>
                  <dd>{new Date(activeNotification.createdAt).toLocaleString()}</dd>
                </div>

                {activeNotification.task?.status && (
                  <div>
                    <dt>Task Status</dt>
                    <dd style={{ textTransform: "capitalize" }}>{activeNotification.task.status}</dd>
                  </div>
                )}

                {activeNotification.task?.priority && (
                  <div>
                    <dt>Task Priority</dt>
                    <dd style={{ textTransform: "capitalize" }}>{activeNotification.task.priority}</dd>
                  </div>
                )}

                {activeNotification.task?.description && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <dt>Task Description</dt>
                    <dd>{activeNotification.task.description}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}

export default Notification;

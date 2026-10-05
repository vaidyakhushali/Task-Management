import { useEffect, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import "./notification.css";

function Notification({
  onUnreadChange,
  notificationToOpen,
  onNotificationOpened,
}) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNotification, setActiveNotification] = useState(null);

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

  return (
    <section className="notification-page" aria-labelledby="notification-title">
      <div className="notification-heading">
        <div>
          <p className="dashboard-label">Workspace updates</p>
          <h2 id="notification-title">Notifications</h2>
          <p>Stay up to date with your tasks and workspace.</p>
        </div>
        <button
          className="notification-clear-button"
          type="button"
          onClick={markAllAsRead}
        >
          Mark all as read
        </button>
      </div>
      <div className="notification-list">
        {error && (
          <p className="settings-message error-message" role="alert">
            {error}
          </p>
        )}
        {isLoading && (
          <p className="notification-empty">Loading notifications...</p>
        )}
        {!isLoading && !error && notifications.length === 0 && (
          <p className="notification-empty">You have no notifications.</p>
        )}
        {!isLoading &&
          notifications.map((notification) => (
            <article
              className={`notification-item ${notification.read ? "" : "unread"}`}
              key={notification._id}
              onClick={() => openNotification(notification)}
              tabIndex="0"
              role="button"
            >
              <span
                className={`notification-type ${notification.type}`}
                aria-hidden="true"
              >
                {notification.type === "task"
                  ? "!"
                  : notification.type === "workspace"
                    ? "W"
                    : "i"}
              </span>
              <div className="notification-copy">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <small>
                  {new Date(notification.createdAt).toLocaleString()} · Click to
                  view details
                </small>
              </div>
              {!notification.read && (
                <button
                  className="notification-read-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    markAsRead(notification._id);
                  }}
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
      </div>
      {activeNotification && (
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
              X
            </button>
            <div className="notification-modal-heading">
              <p className="dashboard-label">Task assignment</p>
              <h2 id="notification-detail-title">
                {activeNotification.task?.title || activeNotification.title}
              </h2>
            </div>
            <dl className="notification-detail-list">
              <div>
                <dt>Assigned by</dt>
                <dd>
                  {activeNotification.actor?.fullname || "Workspace member"} (
                  {activeNotification.actor?.role || "User"})
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{activeNotification.task?.status || "Assigned"}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>
                  {activeNotification.task?.description ||
                    "No description was added."}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}

export default Notification;

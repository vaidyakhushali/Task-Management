import { useEffect, useState } from 'react';
import { getChat, getNotifications, markAllNotificationsRead, markNotificationRead, sendChat } from './api';
import './notification.css';

function Notification({ onUnreadChange }) {
	const [notifications, setNotifications] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [activeNotification, setActiveNotification] = useState(null);
	const [chatMessages, setChatMessages] = useState([]);
	const [chatInput, setChatInput] = useState('');
	const [chatError, setChatError] = useState('');

	useEffect(() => {
		async function loadNotifications() {
			try {
				const response = await getNotifications();
				const list = Array.isArray(response?.data) ? response.data : [];
				setNotifications(list);
				if (typeof onUnreadChange === 'function') {
					onUnreadChange(list.filter((notification) => !notification.read).length);
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
		if (!activeNotification?.actor?._id) return;
		setChatError('');
		getChat(activeNotification.actor._id)
			.then((response) => setChatMessages(Array.isArray(response?.data) ? response.data : []))
			.catch((loadError) => setChatError(loadError.message));
	}, [activeNotification]);

	function updateNotifications(nextNotifications) {
		setNotifications(nextNotifications);
		if (typeof onUnreadChange === 'function') {
			onUnreadChange(nextNotifications.filter((notification) => !notification.read).length);
		}
	}

	async function markAsRead(notificationId) {
		try {
			await markNotificationRead(notificationId);
			updateNotifications(notifications.map((notification) => notification._id === notificationId ? { ...notification, read: true } : notification));
		} catch (readError) {
			setError(readError.message);
		}
	}

	async function markAllAsRead() {
		try {
			await markAllNotificationsRead();
			updateNotifications(notifications.map((notification) => ({ ...notification, read: true })));
		} catch (readError) {
			setError(readError.message);
		}
	}

	async function openNotification(notification) {
		if (!notification.read) await markAsRead(notification._id);
		setActiveNotification(notification);
	}

	async function sendMessage(event) {
		event.preventDefault();
		if (!chatInput.trim() || !activeNotification?.actor?._id) return;
		try {
			const response = await sendChat(activeNotification.actor._id, chatInput);
			setChatMessages((currentMessages) => [...currentMessages, response.data]);
			setChatInput('');
		} catch (sendError) {
			setChatError(sendError.message);
		}
	}

	return (
		<section className="notification-page" aria-labelledby="notification-title">
			<div className="notification-heading">
				<div><p className="dashboard-label">Workspace updates</p><h2 id="notification-title">Notifications</h2><p>Stay up to date with your tasks and workspace.</p></div>
				<button className="notification-clear-button" type="button" onClick={markAllAsRead}>Mark all as read</button>
			</div>
			<div className="notification-list">
				{error && <p className="settings-message error-message" role="alert">{error}</p>}
				{isLoading && <p className="notification-empty">Loading notifications...</p>}
				{!isLoading && !error && notifications.length === 0 && <p className="notification-empty">You have no notifications.</p>}
				{!isLoading && notifications.map((notification) => <article className={`notification-item ${notification.read ? '' : 'unread'}`} key={notification._id} onClick={() => openNotification(notification)} tabIndex="0" role="button"><span className={`notification-type ${notification.type}`} aria-hidden="true">{notification.type === 'task' ? '!' : notification.type === 'workspace' ? 'W' : 'i'}</span><div className="notification-copy"><h3>{notification.title}</h3><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()} · Click to view details</small></div>{!notification.read && <button className="notification-read-button" type="button" onClick={(event) => { event.stopPropagation(); markAsRead(notification._id); }}>Mark read</button>}</article>)}
			</div>
			{activeNotification && <div className="notification-modal-backdrop" role="presentation" onClick={() => setActiveNotification(null)}><section className="notification-modal" role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onClick={(event) => event.stopPropagation()}><button className="notification-close-button" type="button" onClick={() => setActiveNotification(null)} aria-label="Close notification details">X</button><div className="notification-modal-heading"><p className="dashboard-label">Task assignment</p><h2 id="notification-detail-title">{activeNotification.task?.title || activeNotification.title}</h2></div><dl className="notification-detail-list"><div><dt>Assigned by</dt><dd>{activeNotification.actor?.fullname || 'Workspace member'} ({activeNotification.actor?.role || 'User'})</dd></div><div><dt>Status</dt><dd>{activeNotification.task?.status || 'Assigned'}</dd></div><div><dt>Description</dt><dd>{activeNotification.task?.description || 'No description was added.'}</dd></div></dl><div className="notification-chat"><h3>Chat with {activeNotification.actor?.fullname || 'the assigner'}</h3><div className="notification-chat-messages">{chatMessages.length === 0 && !chatError && <p className="notification-empty">No messages yet.</p>}{chatMessages.map((chatMessage) => <p className="notification-chat-message" key={chatMessage._id}><strong>{chatMessage.sender?.fullname || 'User'}</strong><span>{chatMessage.message}</span></p>)}</div>{chatError && <p className="chat-error" role="alert">{chatError}</p>}<form className="notification-chat-form" onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Write a message..." aria-label="Write a message" maxLength="1000" /><button type="submit">Send</button></form></div></section></div>}
		</section>
	);
}

export default Notification;

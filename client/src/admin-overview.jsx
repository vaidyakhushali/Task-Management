import { useEffect, useMemo, useState } from 'react';
import { getAdminChat, getAdminTasks, getAdminUsers, sendAdminChat } from './api';
import './admin-overview.css';

function AdminOverview({ search = '' }) {
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatError, setChatError] = useState('');

    useEffect(() => {
        Promise.all([getAdminUsers(), getAdminTasks()])
            .then(([userResponse, taskResponse]) => {
                setUsers(userResponse.data);
                setTasks(taskResponse.data);
            })
            .catch((loadError) => setError(loadError.message));
    }, []);

    useEffect(() => {
        if (!activeChat) return;
        setChatError('');
        getAdminChat(activeChat._id)
            .then((response) => setChatMessages(response.data))
            .catch((loadError) => setChatError(loadError.message));
    }, [activeChat]);

    async function sendMessage(event) {
        event.preventDefault();
        if (!chatInput.trim() || !activeChat) return;
        try {
            const response = await sendAdminChat(activeChat._id, chatInput);
            setChatMessages((currentMessages) => [...currentMessages, response.data]);
            setChatInput('');
        } catch (sendError) {
            setChatError(sendError.message);
        }
    }

    const visibleUsers = useMemo(() => users.filter((user) => {
        const query = search.toLowerCase();
        return !query || `${user.fullname} ${user.username} ${user.email}`.toLowerCase().includes(query);
    }), [search, users]);

    function tasksForUser(userId) {
        return tasks.filter((task) => task.assignedUser?._id === userId);
    }

    return (
        <section className="admin-overview" aria-labelledby="manage-users-title">
            <div className="admin-overview-heading">
                <div><p className="dashboard-label">Admin workspace</p><h2 id="manage-users-title">Users and their tasks</h2><p>See who is working on what across the workspace.</p></div>
                <div className="admin-counts"><span><strong>{users.length}</strong> users</span><span><strong>{tasks.length}</strong> tasks</span></div>
            </div>
            {error && <p className="settings-message error-message" role="alert">{error}</p>}
            {users.length === 0 && !error ? <p className="admin-empty">Loading users...</p> : (
                <div className="admin-user-list">
                    {visibleUsers.map((user) => {
                        const userTasks = tasksForUser(user._id);
                        return <article className="admin-user-card" key={user._id}>
                            <div className="admin-user-heading"><span className="admin-avatar">{user.fullname.charAt(0).toUpperCase()}</span><div><h3>{user.fullname}</h3><p>{user.email} · {user.role}</p></div><span className="user-task-count">{userTasks.length} task{userTasks.length === 1 ? '' : 's'}</span><button className="chat-button" type="button" onClick={() => setActiveChat(user)}>{activeChat?._id === user._id ? 'Close chat' : 'Chat'}</button></div>
                            <div className="admin-task-list">
                                {userTasks.length === 0 ? <p className="admin-empty">No assigned tasks</p> : userTasks.map((task) => <div className="admin-task-row" key={task._id}><span><strong>{task.title}</strong><small>{task.priority} priority{task.dueDate ? ` · due ${new Date(task.dueDate).toLocaleDateString()}` : ''}</small></span><span className={`admin-task-status ${task.status}`}>{task.status}</span></div>)}
                            </div>
                            {activeChat?._id === user._id && <div className="admin-chat-panel"><div className="admin-chat-messages">{chatMessages.length === 0 && !chatError && <p className="admin-empty">Start a conversation with {user.fullname}.</p>}{chatMessages.map((chatMessage) => <p className={`admin-chat-message ${chatMessage.sender?._id === user._id ? 'received' : 'sent'}`} key={chatMessage._id}><span>{chatMessage.message}</span><small>{chatMessage.sender?._id === user._id ? user.fullname : 'You'}</small></p>)}</div>{chatError && <p className="chat-error" role="alert">{chatError}</p>}<form className="admin-chat-form" onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={`Message ${user.fullname}...`} aria-label={`Message ${user.fullname}`} maxLength="1000" /><button type="submit">Send</button></form></div>}
                        </article>;
                    })}
                </div>
            )}
        </section>
    );
}

export default AdminOverview;
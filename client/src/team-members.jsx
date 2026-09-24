  import { useEffect, useMemo, useState } from 'react';
import { getAssignableUsers } from './api';
import './admin-overview.css';

function TeamMembers({ search = '' }) {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        getAssignableUsers()
            .then((response) => setUsers(response.data || []))
            .catch((loadError) => setError(loadError.message));
    }, []);

    const visibleUsers = useMemo(() => {
        const query = search.toLowerCase();
        return users.filter((user) => {
            if (!query) return true;
            const text = `${user.fullname || ''} ${user.username || ''} ${user.role || ''}`.toLowerCase();
            return text.includes(query);
        });
    }, [search, users]);

    return (
        <section className="admin-overview" aria-labelledby="team-members-title">
            <div className="admin-overview-heading">
                <div>
                    <p className="dashboard-label">Team workspace</p>
                    <h2 id="team-members-title">Team members</h2>
                    <p>See everyone in your workspace and their roles.</p>
                </div>
                <div className="admin-counts">
                    <span><strong>{users.length}</strong> members</span>
                </div>
            </div>

            {error && <p className="settings-message error-message" role="alert">{error}</p>}

            {users.length === 0 && !error ? (
                <p className="admin-empty">Loading team members...</p>
            ) : (
                <div className="admin-user-list">
                    {visibleUsers.map((user) => (
                        <article className="admin-user-card" key={user._id || user.id || user.email || user.username}>
                            <div className="admin-user-heading">
                                <span className="admin-avatar">{(user.fullname || user.username || 'U').charAt(0).toUpperCase()}</span>
                                <div>
                                    <h3>{user.fullname || user.username || 'Unnamed user'}</h3>
                                    <p>{user.email || user.username || 'No email'} · {user.role || 'User'}</p>
                                </div>
                                <span className="user-task-count">{user.role || 'User'}</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default TeamMembers;

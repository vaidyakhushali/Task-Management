import { useEffect, useMemo, useState } from "react";
import {
  getAdminChat,
  getAssignableUsers,
  getChat,
  sendAdminChat,
  sendChat,
} from "./api";
import "./admin-overview.css";

function TeamMembers({ search = "", user: currentUser, userRole }) {
  const currentUserId = currentUser?._id || currentUser?.id;
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    getAssignableUsers()
      .then((response) => setUsers(response.data || []))
      .catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!activeChatUser) {
      setMessages([]);
      return undefined;
    }

    let isActive = true;
    setChatLoading(true);
    setMessages([]);
    setChatError("");
    (currentUser?.role === "Admin"
      ? getAdminChat(activeChatUser._id)
      : getChat(activeChatUser._id))
      .then((response) => {
        if (isActive) setMessages(response.data || []);
      })
      .catch((loadError) => {
        if (isActive) setChatError(loadError.message);
      })
      .finally(() => {
        if (isActive) setChatLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeChatUser, currentUser?.role]);

  const visibleUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((user) => {
      if (!query) return true;
      const text =
        `${user.fullname || ""} ${user.username || ""} ${user.role || ""}`.toLowerCase();
      return text.includes(query);
    });
  }, [search, users]);

  async function handleChatSubmit(event) {
    event.preventDefault();
    const message = messageInput.trim();
    if (!message || !activeChatUser || chatSending) return;

    setChatSending(true);
    setChatError("");
    try {
      const response =
        currentUser?.role === "Admin"
          ? await sendAdminChat(activeChatUser._id, message)
          : await sendChat(activeChatUser._id, message);
      setMessages((current) => [...current, response.data]);
      setMessageInput("");
    } catch (sendError) {
      setChatError(sendError.message);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <section className="admin-overview" aria-labelledby="team-members-title">
      <div className="admin-overview-heading">
        <div>
          <p className="dashboard-label">Team workspace</p>
          <h2 id="team-members-title">Team members</h2>
          <p>See everyone in your workspace and their roles.</p>
        </div>
        <div className="admin-counts">
          <span>
            <strong>{users.length}</strong> members
          </span>
        </div>
      </div>

      {error && (
        <p className="settings-message error-message" role="alert">
          {error}
        </p>
      )}

      {users.length === 0 && !error ? (
        <p className="admin-empty">Loading team members...</p>
      ) : (
        <div className="admin-user-list">
          {visibleUsers.map((user) => (
            <article
              className="admin-user-card"
              key={user._id || user.id || user.email || user.username}
            >
              <div className="admin-user-heading">
                <span className="admin-avatar">
                  {(user.fullname || user.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <div>
                  <h3>{user.fullname || user.username || "Unnamed user"}</h3>
                  <p>
                    {user.email || user.username || "No email"} ·{" "}
                    {user.role || "User"}
                  </p>
                </div>
                <span className="user-task-count">{user.role || "User"}</span>
                {String(user._id) !== String(currentUserId) && (
                  <button
                    type="button"
                    className="chat-button"
                    onClick={() =>
                      setActiveChatUser((current) =>
                        current?._id === user._id ? null : user,
                      )
                    }
                    aria-expanded={activeChatUser?._id === user._id}
                  >
                    {activeChatUser?._id === user._id ? "Close chat" : "Chat"}
                  </button>
                )}
              </div>
              {activeChatUser?._id === user._id && (
                <div className="admin-chat-panel">
                  <div className="admin-chat-messages" aria-live="polite">
                    {chatLoading && <p className="admin-empty">Loading chat...</p>}
                    {!chatLoading && messages.length === 0 && (
                      <p className="admin-empty">No messages yet. Say hello.</p>
                    )}
                    {messages.map((message) => {
                      const isSent =
                        String(message.sender?._id) === String(currentUserId);
                      return (
                        <p
                          className={`admin-chat-message ${isSent ? "sent" : "received"}`}
                          key={message._id}
                        >
                          <span>{message.message}</span>
                          <small>
                            {message.sender?.fullname || message.sender?.role}
                          </small>
                        </p>
                      );
                    })}
                  </div>
                  {chatError && (
                    <p className="chat-error" role="alert">
                      {chatError}
                    </p>
                  )}
                  <form className="admin-chat-form" onSubmit={handleChatSubmit}>
                    <input
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      placeholder="Write a message..."
                      aria-label={`Message ${user.fullname || user.username}`}
                      maxLength="1000"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || chatSending}
                    >
                      {chatSending ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default TeamMembers;

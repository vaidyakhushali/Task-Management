import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getAdminChat,
  getAssignableUsers,
  getChat,
  sendAdminChat,
  sendChat,
} from "./api";
import "./chat.css";

function Chat({ user: currentUser, initialChatUser, onChatUserSelected }) {
  const currentUserId = currentUser?._id || currentUser?.id;
  const isAdmin = currentUser?.role === "Admin";

  const [users, setUsers] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(initialChatUser || null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch team members list
  useEffect(() => {
    setLoadingUsers(true);
    getAssignableUsers()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setUsers(list);
        // If no active chat user selected and we have members, default or wait
        if (initialChatUser) {
          const found = list.find((u) => String(u._id) === String(initialChatUser._id || initialChatUser.id));
          if (found) setActiveChatUser(found);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingUsers(false));
  }, [initialChatUser]);

  // Sync initialChatUser prop if it changes externally
  useEffect(() => {
    if (initialChatUser) {
      setActiveChatUser(initialChatUser);
    }
  }, [initialChatUser]);

  // Fetch messages for active user
  const fetchMessages = () => {
    if (!activeChatUser) return;
    const userId = activeChatUser._id || activeChatUser.id;
    (isAdmin ? getAdminChat(userId) : getChat(userId))
      .then((res) => {
        setMessages(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (!activeChatUser) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const userId = activeChatUser._id || activeChatUser.id;
    (isAdmin ? getAdminChat(userId) : getChat(userId))
      .then((res) => {
        setMessages(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMessages(false));

    // Poll every 3.5 seconds for fresh messages
    const pollInterval = setInterval(fetchMessages, 3500);
    return () => clearInterval(pollInterval);
  }, [activeChatUser, isAdmin]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectUser = (u) => {
    setActiveChatUser(u);
    onChatUserSelected?.(u);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text || !activeChatUser || sending) return;

    setSending(true);
    const userId = activeChatUser._id || activeChatUser.id;

    try {
      const res = isAdmin
        ? await sendAdminChat(userId, text)
        : await sendChat(userId, text);

      if (res?.data) {
        setMessages((prev) => [...prev, res.data]);
      }
      setMessageInput("");
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Don't show current user in chat list
      if (String(u._id || u.id) === String(currentUserId)) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const nameMatch = u.fullname?.toLowerCase().includes(query);
      const usernameMatch = u.username?.toLowerCase().includes(query);
      const roleMatch = u.role?.toLowerCase().includes(query);
      return nameMatch || usernameMatch || roleMatch;
    });
  }, [users, currentUserId, searchQuery]);

  return (
    <section className="chat-page" aria-label="Team Chat">
      <div className="chat-container">
        {/* LEFT SIDEBAR: CONTACT LIST */}
        <aside className={`chat-sidebar ${activeChatUser ? "mobile-hide" : ""}`}>
          <div className="chat-sidebar-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Direct Messages
            </h2>
            <div className="chat-search-input-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="chat-search-input"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-contacts-list">
            {loadingUsers && (
              <p className="admin-empty" style={{ padding: "1.5rem", textAlign: "center" }}>
                Loading team members...
              </p>
            )}

            {!loadingUsers && filteredUsers.length === 0 && (
              <p className="admin-empty" style={{ padding: "1.5rem", textAlign: "center" }}>
                {searchQuery ? "No members found." : "No team members available."}
              </p>
            )}

            {!loadingUsers &&
              filteredUsers.map((u) => {
                const isSelected = activeChatUser && String(activeChatUser._id || activeChatUser.id) === String(u._id || u.id);
                const name = u.fullname || u.username || "Team Member";
                const initial = name.charAt(0).toUpperCase();

                return (
                  <button
                    key={u._id || u.id}
                    type="button"
                    className={`chat-contact-item ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="chat-contact-avatar">{initial}</div>
                    <div className="chat-contact-info">
                      <div className="chat-contact-top">
                        <span className="chat-contact-name">{name}</span>
                        <span className="chat-contact-role">{u.role || "User"}</span>
                      </div>
                      <div className="chat-contact-sub">{u.email || `@${u.username}`}</div>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* RIGHT MAIN: ACTIVE CONVERSATION */}
        <main className={`chat-main ${!activeChatUser ? "mobile-hide" : ""}`}>
          {activeChatUser ? (
            <>
              {/* CHAT HEADER */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <button
                    type="button"
                    className="chat-back-btn"
                    onClick={() => setActiveChatUser(null)}
                    title="Back to conversation list"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>

                  <div className="chat-contact-avatar" style={{ width: "2.3rem", height: "2.3rem", fontSize: "0.85rem" }}>
                    {(activeChatUser.fullname || activeChatUser.username || "U").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="chat-header-name">
                      {activeChatUser.fullname || activeChatUser.username || "Team Member"}
                    </h3>
                    <div className="chat-header-status">
                      <span>{activeChatUser.role || "User"}</span>
                      <span>·</span>
                      <span>{activeChatUser.email || `@${activeChatUser.username}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MESSAGES STREAM */}
              <div className="chat-messages-container">
                {loadingMessages && (
                  <p className="admin-empty" style={{ margin: "auto" }}>
                    Loading messages...
                  </p>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="chat-empty-state">
                    <div className="chat-empty-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h4>No messages yet</h4>
                    <p>Send a direct message to start collaborating.</p>
                  </div>
                )}

                {!loadingMessages &&
                  messages.map((msg) => {
                    const isSent = String(msg.sender?._id || msg.sender) === String(currentUserId);
                    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

                    return (
                      <div
                        key={msg._id || Math.random()}
                        className={`chat-bubble-row ${isSent ? "sent" : "received"}`}
                      >
                        <div className="chat-bubble">{msg.message}</div>
                        {timeStr && <span className="chat-bubble-time">{timeStr}</span>}
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BAR */}
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input-field"
                  placeholder={`Message ${activeChatUser.fullname || activeChatUser.username || "member"}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!messageInput.trim() || sending}
                >
                  <span>{sending ? "..." : "Send"}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Direct Team Chat</h3>
              <p>Select a team member from the list to start a conversation.</p>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

export default Chat;


import './App.css';
import { useState } from 'react';
import { logoutUser } from './api';
import Dashboard from './dashboard';
import Login from './login';
import Logout from './logout';
import Register from './register';

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = localStorage.getItem('taskManagerSession');
    if (!savedSession) return null;
    const session = JSON.parse(savedSession);
    return {
      id: session.userId,
      fullname: session.userName,
      username: session.userName,
      email: session.userEmail,
      role: session.userRole,
    };
  });

  function handleLogin(user, rememberMe = false) {
    const name = user.fullname || user.username || 'there';
    const safeUser = {
      ...user,
      id: user.id || user._id || null,
      fullname: name,
      username: user.username || user.fullname || 'user',
      email: user.email || '',
      role: user.role || 'User',
    };
    setCurrentUser(safeUser);

    if (rememberMe) {
      localStorage.setItem('taskManagerSession', JSON.stringify({
        userId: safeUser.id || safeUser._id || safeUser.email || safeUser.username || 'guest',
        userName: name,
        userEmail: safeUser.email || '',
        userRole: safeUser.role || 'User',
      }));
    } else {
      localStorage.removeItem('taskManagerSession');
    }

    const calendarKey = `taskmanager_calendar_${encodeURIComponent(String(safeUser.id || safeUser._id || safeUser.email || safeUser.username || 'guest'))}`;
    localStorage.setItem('taskManagerCalendarKey', calendarKey);
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      // Clear the local session even if the server is unavailable.
    }
    localStorage.removeItem('taskManagerSession');
    localStorage.removeItem('taskManagerCalendarKey');
    setCurrentUser(null);
    setShowLogout(true);
  }

  if (showLogout) {
    return <Logout onLogin={() => setShowLogout(false)} />;
  }

  if (currentUser) {
    return <Dashboard user={currentUser} userName={currentUser.fullname || currentUser.username || 'there'} userRole={currentUser.role || 'User'} onLogout={handleLogout} />;
  }

  return (
    showRegister
      ? <Register onLogin={() => setShowRegister(false)} onSuccess={handleLogin} />
      : <Login onRegister={() => setShowRegister(true)} onSuccess={handleLogin} />
  );
}

export default App;

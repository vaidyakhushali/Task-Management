import { useEffect, useState } from 'react';
import { changeAdminPassword, getWorkspaceSettings, updateProfile, updateWorkspaceSettings } from './api';
import './settings.css';

function Settings({ user, userName, userRole, theme, onThemeChange, fontSize, onFontSizeChange, onWorkspaceNameChange, onProfileNameChange }) {
  const email = user?.email || 'Not available';
  const username = user?.username || 'Not available';
  const [workspaceName, setWorkspaceName] = useState('Task Manager');
  const [profileName, setProfileName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getWorkspaceSettings()
      .then((response) => setWorkspaceName(response.data.workspaceName))
      .catch(() => setError('Unable to load workspace settings'));
  }, []);

  async function saveWorkspace(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await updateWorkspaceSettings(workspaceName);
      setWorkspaceName(response.data.workspaceName);
      onWorkspaceNameChange(response.data.workspaceName);
      setMessage('Workspace name saved');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await updateProfile(profileName);
      setProfileName(response.data.fullname);
      onProfileNameChange(response.data.fullname);
      setMessage('Profile name saved');
    } catch (profileError) {
      setError(profileError.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one letter and one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password changed successfully');
    } catch (passwordError) {
      setError(passwordError.message);
    }
  }

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="settings-heading">
        <div>
          <p className="dashboard-label">Workspace controls</p>
          <h2 id="settings-title">Settings</h2>
          <p>Manage your account and workspace preferences.</p>
        </div>
        <span className="settings-status">{userRole} access</span>
      </div>

      {message && <p className="settings-message success-message" role="status">{message}</p>}
      {error && <p className="settings-message error-message" role="alert">{error}</p>}

      <div className="settings-grid">
        <article className="settings-card profile-card">
          <div className="settings-card-heading">
            <div><span className="settings-icon profile-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span><div><h3>Profile</h3><p>Your account information</p></div></div>
            <span className="verified-badge">Active</span>
          </div>
          <div className="profile-summary"><span className="large-avatar">{profileName.charAt(0).toUpperCase()}</span><div><strong>{profileName}</strong><span>{userRole} account</span></div></div>
          <form className="profile-form" onSubmit={saveProfile}>
            <label className="profile-name-label" htmlFor="profile-name">Display name</label>
            <div className="profile-name-controls"><input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength="80" required /><button className="settings-save-button" type="submit">Save name</button></div>
          </form>
          <dl className="details-list">
            <div><dt>Email address</dt><dd>{email}</dd></div>
            <div><dt>Username</dt><dd>{username}</dd></div>
            <div><dt>Account type</dt><dd>{userRole}</dd></div>
          </dl>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading"><div><span className="settings-icon workspace-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></span><div><h3>Workspace</h3><p>Control your team space</p></div></div></div>
          <form onSubmit={saveWorkspace}>
            <label className="settings-option"><span><strong>Workspace name</strong><small>Shown across your task manager</small></span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} aria-label="Workspace name" maxLength="60" required /></label>
            <button className="settings-save-button" type="submit">Save workspace name</button>
          </form>
          <label className="settings-option toggle-option"><span><strong>Admin notifications</strong><small>Receive important workspace updates</small></span><input type="checkbox" defaultChecked aria-label="Admin notifications" /></label>
          <label className="settings-option toggle-option"><span><strong>Require task assignment</strong><small>Every task must have an owner</small></span><input type="checkbox" aria-label="Require task assignment" /></label>
        </article>

        <article className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span className="settings-icon workspace-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.46 2 12 2z"/></svg></span>
              <div>
                <h3>Appearance & Theme</h3>
                <p>Customize your viewing theme and font size</p>
              </div>
            </div>
          </div>

          <div className="settings-option">
            <span>
              <strong>Night / Dark Mode</strong>
              <small>Switch between light and dark themes</small>
            </span>
            <button
              className="settings-save-button"
              type="button"
              onClick={() => onThemeChange?.(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? (<span style={{display:'flex', alignItems:'center', gap:'8px', justifyContent: 'center'}}><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'></path></svg> Enable Dark Mode</span>) : (<span style={{display:'flex', alignItems:'center', gap:'8px', justifyContent: 'center'}}><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='5'></circle><line x1='12' y1='1' x2='12' y2='3'></line><line x1='12' y1='21' x2='12' y2='23'></line><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'></line><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'></line><line x1='1' y1='12' x2='3' y2='12'></line><line x1='21' y1='12' x2='23' y2='12'></line><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'></line><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'></line></svg> Enable Light Mode</span>)}
            </button>
          </div>

          <div className="settings-option">
            <span>
              <strong>Adjust Text Size</strong>
              <small>Scale typography size across the app</small>
            </span>
            <select
              value={fontSize || 'medium'}
              onChange={(e) => onFontSizeChange?.(e.target.value)}
              className="topbar-fontsize-select"
            >
              <option value="small">Small (Compact)</option>
              <option value="medium">Medium (Default)</option>
              <option value="large">Large (Comfortable)</option>
              <option value="xlarge">Extra Large (High Visibility)</option>
            </select>
          </div>
        </article>

        <article className="settings-card security-card">
          <div className="settings-card-heading"><div><span className="settings-icon security-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span><div><h3>Security</h3><p>Keep your workspace protected</p></div></div></div>
          <div className="security-row"><span><strong>Password</strong><small>Last updated by administrator</small></span><span className="security-pill">Protected</span></div>
          <div className="security-row"><span><strong>Admin-only registration</strong><small>Admin accounts cannot be created publicly</small></span><span className="security-pill">Enabled</span></div>
          <form className="password-form" onSubmit={savePassword}>
            <h4>Change password</h4>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" autoComplete="current-password" required />
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoComplete="new-password" minLength="6" required />
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" minLength="6" required />
            <button className="settings-save-button" type="submit">Change password</button>
          </form>
        </article>
      </div>
    </section>
  );
}

export default Settings;
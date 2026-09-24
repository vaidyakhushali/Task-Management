import { useState } from 'react';
import { loginUser } from './api';
import './login.css';

function Login({ onRegister, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
        role,
      });

      if (response.success && response.data?.user) {
        onSuccess(response.data.user, rememberMe);
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in. Please ensure server is running.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="brand-logo">TM</div>
          <h1 id="login-title">Task Management</h1>
        </div>
        <p className="subtitle">Welcome back! Sign in to access your dashboard</p>


        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@taskmanagement.com or user@gmail.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-box">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="User">User (Assigned Member)</option>
              <option value="Admin">Admin (Workspace Manager)</option>
            </select>
          </div>

          <div className="form-options">
            <label className="remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me
            </label>
          </div>

          {error && <p className="message error-message" role="alert">{error}</p>}

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : `Login as ${role}`}
          </button>
        </form>

        <p className="register-text">
          Don&apos;t have an account?{' '}
          <button className="link-button" type="button" onClick={onRegister}>
            Register here
          </button>
        </p>
      </section>
    </main>
  );
}

export default Login;
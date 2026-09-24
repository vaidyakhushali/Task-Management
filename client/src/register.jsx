import { useState } from 'react';
import { registerUser } from './api';
import './register.css';

function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

function Register({ onLogin, onSuccess }) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time password validation indicator
  const pwdValidationError = password ? validatePassword(password) : null;
  const pwdMatchError = confirmPassword && password !== confirmPassword ? 'Passwords do not match' : null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const form = event.currentTarget;
    const pwd = form.password.value;
    const confirmPwd = form.confirmPassword.value;

    const valErr = validatePassword(pwd);
    if (valErr) {
      setError(valErr);
      return;
    }

    if (pwd !== confirmPwd) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await registerUser({
        fullname: form.name.value.trim(),
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        password: pwd,
      });

      if (response.success && response.data?.user) {
        onSuccess(response.data.user);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (submitError) {
      setError(submitError.message || 'Error creating account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <section className="register-card" aria-labelledby="register-title">
        <div className="register-brand">
          <div className="brand-logo">TM</div>
          <h1 id="register-title">Create Account</h1>
        </div>
        <p className="subtitle">Register to get started with Task Management</p>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Jane Doe"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="e.g. janedoe"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="e.g. jane@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <div className="password-box">
              <input
                id="register-password"
                name="password"
                type={showPasswords ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars (letter & number)"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>
            {pwdValidationError && (
              <span className="password-hint warning">{pwdValidationError}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
            />
            {pwdMatchError && (
              <span className="password-hint warning">{pwdMatchError}</span>
            )}
          </div>


          {error && <p className="message error-message" role="alert">{error}</p>}

          <button
            className="register-button"
            type="submit"
            disabled={isSubmitting || Boolean(pwdValidationError || pwdMatchError)}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="login-text">
          Already have an account?{' '}
          <button className="link-button" type="button" onClick={onLogin}>
            Login here
          </button>
        </p>
      </section>
    </main>
  );
}

export default Register;

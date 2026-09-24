const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('taskManagerAuthToken', token);
  } else {
    localStorage.removeItem('taskManagerAuthToken');
  }
}

export function getAuthToken() {
  return localStorage.getItem('taskManagerAuthToken') || '';
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong');
  return body;
}

export async function registerUser(data) {
  const response = await request('/users/register', { method: 'POST', body: JSON.stringify(data) });
  if (response.data?.accessToken) {
    setAuthToken(response.data.accessToken);
  }
  return response;
}

export async function loginUser(data) {
  const response = await request('/users/login', { method: 'POST', body: JSON.stringify(data) });
  if (response.data?.accessToken) {
    setAuthToken(response.data.accessToken);
  }
  return response;
}

export async function logoutUser() {
  try {
    await request('/users/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}

export function getAssignableUsers() {
  return request('/users/assignable');
}

export function getAdminUsers() {
  return request('/users/admin-overview');
}

export function getAdminMetrics() {
  return request('/tasks/admin-metrics');
}

export function getAdminChat(userId) {
  return request(`/users/admin-overview/${userId}/chat`);
}

export function sendAdminChat(userId, message) {
  return request(`/users/admin-overview/${userId}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
}

export function getChat(userId) {
  return request(`/users/${userId}/chat`);
}

export function sendChat(userId, message) {
  return request(`/users/${userId}/chat`, { method: 'POST', body: JSON.stringify({ message }) });
}

export function getWorkspaceSettings() {
  return request('/users/workspace');
}

export function updateProfile(fullname) {
  return request('/users/profile', { method: 'PATCH', body: JSON.stringify({ fullname }) });
}

export function updateWorkspaceSettings(workspaceName) {
  return request('/users/workspace', { method: 'PATCH', body: JSON.stringify({ workspaceName }) });
}

export function changeAdminPassword(currentPassword, newPassword) {
  return request('/users/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
}

export function getTasks() {
  return request('/tasks');
}

export function getAdminTasks() {
  return request('/tasks/admin-overview');
}

export function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export function updateTask(taskId, updates) {
  return request(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, { method: 'DELETE' });
}

export function getTaskComments(taskId) {
  return request(`/tasks/${taskId}/comments`);
}

export function addTaskComment(taskId, message) {
  return request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ message }) });
}

export function getProjects() {
  return request('/projects');
}

export function createProject(project) {
  return request('/projects', { method: 'POST', body: JSON.stringify(project) });
}

export function getNotifications() {
  return request('/notifications');
}

export function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}

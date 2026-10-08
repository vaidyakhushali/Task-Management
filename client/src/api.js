const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000/api"
    : "https://task-management-1-hihk.onrender.com/api")
).replace(/\/+$/, "");
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("taskManagerAuthToken", token);
  } else {
    localStorage.removeItem("taskManagerAuthToken");
  }
}

export function getAuthToken() {
  return localStorage.getItem("taskManagerAuthToken") || "";
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Something went wrong");
  return body;
}

export async function registerUser(data) {
  const response = await request("/users/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (response.data?.accessToken) {
    setAuthToken(response.data.accessToken);
  }
  return response;
}

export async function loginUser(data) {
  const response = await request("/users/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (response.data?.accessToken) {
    setAuthToken(response.data.accessToken);
  }
  return response;
}

export async function logoutUser() {
  try {
    await request("/users/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

export function getAssignableUsers() {
  return request("/users/assignable");
}

export function getAdminUsers() {
  return request("/users/admin-overview");
}

export function getAdminChat(userId) {
  return request(`/users/admin-overview/${userId}/chat`);
}

export function sendAdminChat(userId, message) {
  return request(`/users/admin-overview/${userId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getChat(userId) {
  return request(`/users/${userId}/chat`);
}

export function sendChat(userId, message) {
  return request(`/users/${userId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getWorkspaceSettings() {
  return request("/users/workspace");
}

export function updateProfile(fullname) {
  return request("/users/profile", {
    method: "PATCH",
    body: JSON.stringify({ fullname }),
  });
}

export function updateWorkspaceSettings(workspaceName) {
  return request("/users/workspace", {
    method: "PATCH",
    body: JSON.stringify({ workspaceName }),
  });
}

export function changeAdminPassword(currentPassword, newPassword) {
  return request("/users/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getTasks() {
  return request("/tasks");
}

export function getAdminTasks() {
  return request("/tasks/admin-overview");
}

export function createTask(task) {
  return request("/tasks", { method: "POST", body: JSON.stringify(task) });
}

export function updateTask(taskId, updates) {
  return request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, { method: "DELETE" });
}

export function getDeletedTasks() {
  return request("/tasks/deleted");
}

export function restoreTask(taskId) {
  return request(`/tasks/${taskId}/restore`, { method: "PATCH" });
}

export function getProjects() {
  return request("/projects");
}

export function createProject(project) {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export function deleteProject(projectId) {
  return request(`/projects/${projectId}`, { method: "DELETE" });
}

export function getDeletedProjects() {
  return request("/projects/deleted");
}

export function restoreProject(projectId) {
  return request(`/projects/${projectId}/restore`, { method: "PATCH" });
}

export function getNotifications() {
  return request("/notifications");
}

export function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "PATCH" });
}

export function getMyAttendance() {
  return request("/attendance");
}

export function getTeamAttendance() {
  return request("/attendance/team");
}

export function checkIn() {
  return request("/attendance/check-in", { method: "POST" });
}

export function checkOut() {
  return request("/attendance/check-out", { method: "POST" });
}

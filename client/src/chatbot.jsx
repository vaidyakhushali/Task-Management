import React, { useEffect, useRef, useState } from "react";
import "./chatbot.css";

const welcomeMessage =
  "Hi! Ask me about projects, task assignments, progress, or upcoming deadlines.";

function taskProjectId(task) {
  return String(task.project?._id || task.project || "");
}

function taskProjectName(task, projects) {
  const projectId = taskProjectId(task);
  const project = projects.find((item) => String(item._id) === projectId);
  return task.project?.name || project?.name || "No project";
}

function taskAssignee(task) {
  return (
    task.assignedUser?.fullname ||
    task.assignedUser?.username ||
    "Unassigned"
  );
}

function isTaskComplete(task) {
  return Boolean(task.completed || ["complete", "completed"].includes(task.status));
}

function isTaskOverdue(task) {
  if (!task.dueDate || isTaskComplete(task)) return false;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid due date"
    : date.toLocaleDateString();
}

function formatTaskList(tasks, projects) {
  if (!tasks.length) return "There are no matching tasks in the data I can see.";
  const lines = tasks.slice(0, 6).map((task) => {
    const status = task.status || (isTaskComplete(task) ? "completed" : "pending");
    return `${task.title || "Untitled task"} | ${status} | ${taskProjectName(task, projects)} | ${taskAssignee(task)} | Due ${formatDueDate(task.dueDate)}`;
  });
  if (tasks.length > lines.length) {
    lines.push(`...and ${tasks.length - lines.length} more.`);
  }
  return lines.join("\n");
}

function buildProjectSummary(project, tasks) {
  const projectTasks = tasks.filter(
    (task) => taskProjectId(task) === String(project._id),
  );
  const names = new Set();
  [...(project.members || []), ...(project.assignees || [])].forEach((person) => {
    const name = person.fullname || person.username;
    if (name) names.add(name);
  });
  projectTasks.forEach((task) => {
    const name = taskAssignee(task);
    if (name !== "Unassigned") names.add(name);
  });
  const completedCount = projectTasks.filter(isTaskComplete).length;
  const team = names.size ? Array.from(names).join(", ") : "No users assigned";
  const progress = projectTasks.length
    ? `${completedCount}/${projectTasks.length} tasks completed`
    : "No visible task details";
  return `${project.name}: ${team} (${progress})`;
}

function buildAssistantReply(question, tasks, projects, loading) {
  if (loading) return "I'm still loading your workspace data. Try again in a moment.";

  const query = question.trim().toLowerCase();
  if (/^(hi|hello|hey)\b/.test(query)) {
    return "Hi! I can list projects and assignees, summarize tasks, or find overdue and upcoming work.";
  }
  if (/\b(help|what can you do)\b/.test(query)) {
    return "Try asking: Which projects are active? Who is assigned to each project? What tasks are overdue? How many tasks are complete?";
  }

  const namedProject = projects.find((project) =>
    query.includes(String(project.name || "").toLowerCase()),
  );
  if (/\b(project|projects|workstream|assigned to each)\b/.test(query)) {
    const matchingProjects = namedProject ? [namedProject] : projects;
    if (!matchingProjects.length) return "There are no projects in this workspace yet.";
    return matchingProjects
      .map((project) => buildProjectSummary(project, tasks))
      .join("\n");
  }

  if (/\b(overdue|late)\b/.test(query)) {
    return `Overdue tasks: ${formatTaskList(tasks.filter(isTaskOverdue), projects)}`;
  }
  if (/\b(upcoming|due soon|deadline|deadlines)\b/.test(query)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingTasks = tasks
      .filter((task) => {
        if (!task.dueDate || isTaskComplete(task) || isTaskOverdue(task)) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate.getTime() <= today.getTime() + 7 * 86400000;
      })
      .sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate));
    return `Due in the next 7 days: ${formatTaskList(upcomingTasks, projects)}`;
  }

  if (/\b(pending|not started)\b/.test(query)) {
    return `Pending tasks: ${formatTaskList(
      tasks.filter((task) => !isTaskComplete(task) && (!task.status || task.status === "pending")),
      projects,
    )}`;
  }
  if (/\b(completed|complete|finished)\b/.test(query)) {
    return `Completed tasks: ${formatTaskList(tasks.filter(isTaskComplete), projects)}`;
  }
  if (/\b(assigned|assignee|who is doing|who's doing|team)\b/.test(query)) {
    return `Task assignments:\n${formatTaskList(tasks, projects)}`;
  }
  if (/\b(how many|count|summary|status|progress|tasks?)\b/.test(query)) {
    const completedCount = tasks.filter(isTaskComplete).length;
    const overdueCount = tasks.filter(isTaskOverdue).length;
    const pendingCount = tasks.filter(
      (task) => !isTaskComplete(task) && (!task.status || task.status === "pending"),
    ).length;
    const inProgressCount = tasks.filter((task) => task.status === "in-progress").length;
    return `Workspace overview: ${projects.length} projects and ${tasks.length} visible tasks. ${completedCount} completed, ${inProgressCount} in progress, ${pendingCount} pending, ${overdueCount} overdue.`;
  }

  return "I can answer questions about projects, assignees, task status, and deadlines using the workspace data. Try asking for project assignments or overdue tasks.";
}

function Chatbot({ tasks = [], projects = [], loading = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: welcomeMessage, isBot: true },
  ]);
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  function handleSend(event) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;

    const answer = buildAssistantReply(question, tasks, projects, loading);
    setMessages((currentMessages) => [
      ...currentMessages,
      { text: question, isBot: false },
      { text: answer, isBot: true },
    ]);
    setInput("");
  }

  return (
    <div className="chatbot-container">
      {isOpen && (
        <section className="chatbot-window" aria-label="Workspace assistant">
          <div className="chatbot-header">
            <strong>Workspace Assistant</strong>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="chatbot-messages" ref={messagesRef} aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.isBot ? "assistant" : "user"}`}
                className={`chatbot-message ${message.isBot ? "bot" : "user"}`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask about projects or tasks..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Message the workspace assistant"
            />
            <button type="submit" aria-label="Send message" disabled={!input.trim()}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </section>
      )}

      {!isOpen && (
        <button
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open workspace assistant"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Chatbot;
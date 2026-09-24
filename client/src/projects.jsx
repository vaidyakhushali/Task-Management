import { useEffect, useMemo, useState } from 'react';
import { createProject, createTask, getAdminTasks, getAssignableUsers, getProjects, getTasks } from './api';
import './projects.css';

function Projects({ search = '', userRole }) {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [taskDrafts, setTaskDrafts] = useState({});
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            getProjects(),
            userRole === 'Admin' ? getAdminTasks() : getTasks(),
            userRole === 'User' ? Promise.resolve({ data: [] }) : getAssignableUsers(),
        ])
            .then(([projectResponse, taskResponse, userResponse]) => {
                setProjects(Array.isArray(projectResponse?.data) ? projectResponse.data : []);
                setTasks(Array.isArray(taskResponse?.data) ? taskResponse.data : []);
                setAssignableUsers(Array.isArray(userResponse?.data) ? userResponse.data : []);
            })
            .catch((loadError) => setError(loadError.message))
            .finally(() => setIsLoading(false));
    }, [userRole]);

    const visibleProjects = useMemo(() => {
        const query = search.toLowerCase();
        return projects.filter((project) => !query || `${project.name} ${project.description}`.toLowerCase().includes(query));
    }, [projects, search]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        try {
            const response = await createProject({ name: projectName, description });
            setProjects((currentProjects) => [response.data, ...currentProjects]);
            setProjectName('');
            setDescription('');
        } catch (submitError) {
            setError(submitError.message);
        }
    }

    function updateTaskDraft(projectId, field, value) {
        setTaskDrafts((current) => ({
            ...current,
            [projectId]: { ...(current[projectId] || {}), [field]: value },
        }));
    }

    async function handleTaskSubmit(event, project) {
        event.preventDefault();
        const draft = taskDrafts[project._id] || {};
        if (!draft.title?.trim() || !draft.assignedUser) return;
        setError('');
        try {
            const response = await createTask({
                ...draft,
                title: draft.title.trim(),
                project: project._id,
                budget: draft.budget || 0,
                cost: draft.cost || 0,
                startDate: draft.startDate || null,
                dueDate: draft.dueDate || null,
            });
            setTasks((current) => [response.data, ...current]);
            setTaskDrafts((current) => ({ ...current, [project._id]: {} }));
        } catch (submitError) {
            setError(submitError.message);
        }
    }

    return (
        <section className="projects-page" aria-labelledby="projects-title">
            <div className="projects-heading">
                <div><p className="dashboard-label">Workspace planning</p><h2 id="projects-title">Projects</h2><p>Organize related tasks into focused workstreams.</p></div>
                <span className="project-count"><strong>{projects.length}</strong> projects</span>
            </div>

            {
                userRole !== 'User' &&
                <form className="project-create-form" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="project-name">Project name</label>
                        <input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)}
                            placeholder="e.g. Website launch" maxLength="80" required />
                    </div>
                    <div>
                        <label htmlFor="project-description">Description</label>
                        <input id="project-description" value={description} onChange={(event) => setDescription(event.target.value)}
                            placeholder="What is this project about?" />
                    </div>
                    <button type="submit">Create project</button>
                </form>
            }
            {error && <p className="project-error" role="alert">{error}</p>}
            {isLoading && <p className="project-empty">Loading projects...</p>}
            {!isLoading && !error && visibleProjects.length === 0 && <p className="project-empty">No projects found.</p>}
            {!isLoading && <div className="project-board-shell">
                {visibleProjects.map((project, projectIndex) => {
                    const memberCount = project.members?.length || 0;
                    const boardTasks = tasks.filter((task) => String(task.project?._id || task.project) === String(project._id));
                    const draft = taskDrafts[project._id] || {};

                    return (
                        <section className="project-board" key={project._id || projectIndex}>
                            <div className="project-board-header">
                                <div className="project-board-title-wrap">
                                    <span className="project-board-bullet" aria-hidden="true" />
                                    <h3>{project.name}</h3>
                                </div>
                                <span className="project-board-count">{memberCount}</span>
                            </div>

                            <div className="project-board-grid project-board-grid-head">
                                <span>Task</span>
                                <span>Assignee</span>
                                <span>Task Type</span>
                                <span>Priority</span>
                                <span>Status</span>
                                <span>Timeline</span>
                            </div>

                            {boardTasks.map((task, idx) => {
                                const startText = task.startDate ? new Date(task.startDate).toLocaleDateString() : null;
                                const dueText = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
                                const timelineText = startText && dueText ? `${startText} - ${dueText}` : dueText || startText || 'No dates';

                                return (
                                    <div className="project-board-grid project-board-row" key={`${project._id || projectIndex}-${idx}`}>
                                        <div className="project-task-name"><span>{task.title}</span></div>
                                        <div className="project-cell project-assignee">{task.assignedUser?.fullname || 'Unassigned'}</div>
                                        <div className="project-cell project-type">{task.taskType || 'Standard'}</div>
                                        <div className="project-cell project-priority"><span className={`project-pill project-pill-${task.priority}`}>{task.priority}</span></div>
                                        <div className="project-cell project-status"><span className={`project-pill project-pill-${task.status}`}>{task.status}</span></div>
                                        <div className="project-cell project-date">{timelineText}</div>
                                    </div>
                                );
                            })}
                            {boardTasks.length === 0 && <p className="project-board-empty">No tasks are assigned to this project yet.</p>}
                            {userRole !== 'User' && <form className="project-task-form" onSubmit={(event) => handleTaskSubmit(event, project)}>
                                <input value={draft.title || ''}
                                    onChange={(event) => updateTaskDraft(project._id, 'title', event.target.value)}
                                    placeholder="Task name" aria-label={`Task name for ${project.name}`} required />
                                <select value={draft.assignedUser || ''}
                                    onChange={(event) => updateTaskDraft(project._id, 'assignedUser', event.target.value)}
                                    aria-label={`Assignee for ${project.name}`} required>
                                    <option value="">Assignee</option>
                                    {assignableUsers.map((assignableUser) => <option value={assignableUser._id} key={assignableUser._id}>
                                        {assignableUser.fullname}</option>)}
                                </select>
                                <input value={draft.taskType || ''} onChange={(event) => updateTaskDraft(project._id, 'taskType', event.target.value)} placeholder="Task type" aria-label={`Task type for ${project.name}`} />
                                <select value={draft.priority || 'medium'} onChange={(event) => updateTaskDraft(project._id, 'priority', event.target.value)} aria-label={`Priority for ${project.name}`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                                <input type="date" value={draft.startDate || ''} onChange={(event) => updateTaskDraft(project._id, 'startDate', event.target.value)} aria-label={`Start date for ${project.name}`} title="Start date" />
                                <input type="date" value={draft.dueDate || ''} onChange={(event) => updateTaskDraft(project._id, 'dueDate', event.target.value)} aria-label={`Due date for ${project.name}`} title="Due date" />
                                <button type="submit" className="project-add-task">Add Task</button>
                            </form>}
                        </section>
                    );
                })}
            </div>}
        </section>
    );
}

export default Projects;
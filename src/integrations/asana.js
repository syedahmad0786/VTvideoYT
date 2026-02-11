// ─── Asana Integration ──────────────────────────────────────
// Task/project management on approved boards only.

import { logger } from '../utils/logger.js';

const BASE_URL = 'https://app.asana.com/api/1.0';

function getHeaders() {
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) return null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

async function asanaRequest(endpoint, method = 'GET', body = null) {
  const headers = getHeaders();
  if (!headers) return { error: 'Asana not configured — set ASANA_ACCESS_TOKEN' };

  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify({ data: body });

    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();

    if (data.errors) {
      logger.error('ASANA', 'API error', { errors: data.errors });
      return { error: data.errors[0]?.message || 'Asana API error' };
    }

    return data.data;
  } catch (error) {
    logger.error('ASANA', 'Request failed', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List projects in workspace
 */
export async function listProjects() {
  const workspaceId = process.env.ASANA_WORKSPACE_ID;
  if (!workspaceId) return { error: 'ASANA_WORKSPACE_ID not set' };

  const projects = await asanaRequest(`/workspaces/${workspaceId}/projects?opt_fields=name,notes,color,archived`);
  if (projects.error) return projects;

  return {
    projects: projects
      .filter(p => !p.archived)
      .map(p => ({
        id: p.gid,
        name: p.name,
        notes: p.notes,
      })),
  };
}

/**
 * List tasks in a project
 */
export async function listProjectTasks(projectId) {
  const tasks = await asanaRequest(
    `/projects/${projectId}/tasks?opt_fields=name,notes,completed,due_on,assignee.name,tags.name`
  );
  if (tasks.error) return tasks;

  return {
    tasks: tasks.map(t => ({
      id: t.gid,
      name: t.name,
      notes: t.notes,
      completed: t.completed,
      dueOn: t.due_on,
      assignee: t.assignee?.name,
      tags: t.tags?.map(tag => tag.name) || [],
    })),
  };
}

/**
 * Create a task in a project
 */
export async function createTask({ name, notes, projectId, dueOn, assignee, tags }) {
  const workspaceId = process.env.ASANA_WORKSPACE_ID;
  if (!workspaceId) return { error: 'ASANA_WORKSPACE_ID not set' };

  const taskData = {
    name,
    notes: notes || '',
    workspace: workspaceId,
    projects: projectId ? [projectId] : [],
  };

  if (dueOn) taskData.due_on = dueOn;
  if (assignee) taskData.assignee = assignee;

  const task = await asanaRequest('/tasks', 'POST', taskData);
  if (task.error) return task;

  logger.info('ASANA', `Task created: ${name}`);
  return {
    id: task.gid,
    name: task.name,
    link: `https://app.asana.com/0/${projectId}/${task.gid}`,
  };
}

/**
 * Update a task
 */
export async function updateTask(taskId, updates) {
  const task = await asanaRequest(`/tasks/${taskId}`, 'PUT', updates);
  if (task.error) return task;

  logger.info('ASANA', `Task updated: ${task.name}`);
  return { id: task.gid, name: task.name };
}

/**
 * Complete a task
 */
export async function completeTask(taskId) {
  return updateTask(taskId, { completed: true });
}

/**
 * Add a comment to a task
 */
export async function addComment(taskId, text) {
  const result = await asanaRequest(`/tasks/${taskId}/stories`, 'POST', { text });
  if (result.error) return result;

  logger.info('ASANA', `Comment added to task ${taskId}`);
  return { success: true };
}

/**
 * Create a project
 */
export async function createProject({ name, notes, color = 'light-green' }) {
  const workspaceId = process.env.ASANA_WORKSPACE_ID;
  if (!workspaceId) return { error: 'ASANA_WORKSPACE_ID not set' };

  const project = await asanaRequest('/projects', 'POST', {
    name,
    notes: notes || '',
    workspace: workspaceId,
    color,
  });

  if (project.error) return project;

  logger.info('ASANA', `Project created: ${name}`);
  return {
    id: project.gid,
    name: project.name,
    link: `https://app.asana.com/0/${project.gid}`,
  };
}

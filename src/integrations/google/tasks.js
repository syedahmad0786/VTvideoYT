// ─── Google Tasks Integration ──────────────────────────────────

import { tasks as tasksApi } from '@googleapis/tasks';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getTasks() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return tasksApi({ version: 'v1', auth });
}

/**
 * List task lists
 */
export async function listTaskLists() {
  const tasks = getTasks();
  if (!tasks) return { error: 'Tasks not authenticated' };

  try {
    const res = await tasks.tasklists.list();
    return {
      taskLists: res.data.items?.map(tl => ({
        id: tl.id,
        title: tl.title,
      })) || [],
    };
  } catch (error) {
    logger.error('TASKS', 'Failed to list task lists', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List tasks in a task list
 */
export async function listTasks(taskListId = '@default') {
  const tasks = getTasks();
  if (!tasks) return { error: 'Tasks not authenticated' };

  try {
    const res = await tasks.tasks.list({ tasklist: taskListId });
    return {
      tasks: res.data.items?.map(t => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        due: t.due,
        status: t.status,
        completed: t.completed,
      })) || [],
    };
  } catch (error) {
    logger.error('TASKS', 'Failed to list tasks', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Create a task
 */
export async function createTask(title, notes = '', due = null, taskListId = '@default') {
  const tasks = getTasks();
  if (!tasks) return { error: 'Tasks not authenticated' };

  try {
    const task = { title };
    if (notes) task.notes = notes;
    if (due) task.due = new Date(due).toISOString();

    const res = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: task,
    });

    logger.info('TASKS', `Task created: ${title}`);
    return {
      id: res.data.id,
      title: res.data.title,
      status: res.data.status,
    };
  } catch (error) {
    logger.error('TASKS', 'Failed to create task', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Complete a task
 */
export async function completeTask(taskId, taskListId = '@default') {
  const tasks = getTasks();
  if (!tasks) return { error: 'Tasks not authenticated' };

  try {
    const res = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: { status: 'completed' },
    });

    logger.info('TASKS', `Task completed: ${taskId}`);
    return { id: res.data.id, status: res.data.status };
  } catch (error) {
    logger.error('TASKS', 'Failed to complete task', { error: error.message });
    return { error: error.message };
  }
}

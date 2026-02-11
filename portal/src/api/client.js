const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Health & Status
  health: () => request('/health'),
  status: () => request('/status'),

  // Chat
  chat: (message) => request('/chat', { method: 'POST', body: { message } }),

  // Approvals
  getApprovals: (status = 'pending') => request(`/approvals?status=${status}`),
  resolveApproval: (id, decision, note = '') =>
    request(`/approvals/${id}/resolve`, { method: 'POST', body: { decision, note } }),

  // Work Log
  getWorkLog: (limit = 50) => request(`/worklog?limit=${limit}`),
  getWorkLogByDate: (date) => request(`/worklog?date=${date}`),

  // Deliverables
  getDeliverables: (limit = 50) => request(`/deliverables?limit=${limit}`),
  updateDeliverableStatus: (id, status) =>
    request(`/deliverables/${id}/status`, { method: 'PATCH', body: { status } }),

  // Decisions
  getDecisions: (limit = 50) => request(`/decisions?limit=${limit}`),
  resolveDecision: (id, status) =>
    request(`/decisions/${id}/resolve`, { method: 'PATCH', body: { status } }),

  // Tasks
  getTasks: (active = true) => request(`/tasks?active=${active}`),
  createTask: (task) => request('/tasks', { method: 'POST', body: task }),
  updateTask: (id, updates) => request(`/tasks/${id}`, { method: 'PATCH', body: updates }),
  updateTaskStatus: (id, status) =>
    request(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),

  // Risk Flags
  getRisks: (status = 'open') => request(`/risks?status=${status}`),
  updateRiskStatus: (id, status) =>
    request(`/risks/${id}/status`, { method: 'PATCH', body: { status } }),

  // Memory
  getMemory: () => request('/memory'),
  setMemory: (key, value, category) =>
    request('/memory', { method: 'POST', body: { key, value, category } }),

  // Workflows
  runInboxTriage: (maxEmails = 10) =>
    request('/workflows/inbox-triage', { method: 'POST', body: { maxEmails } }),
  runCalendarOptimize: () =>
    request('/workflows/calendar-optimize', { method: 'POST' }),
  runMeetingPrep: (hoursAhead = 24) =>
    request('/workflows/meeting-prep', { method: 'POST', body: { hoursAhead } }),
  runResearch: (params) =>
    request('/workflows/research', { method: 'POST', body: params }),
  runQuickResearch: (question) =>
    request('/workflows/quick-research', { method: 'POST', body: { question } }),
  generateProposal: (params) =>
    request('/workflows/proposal', { method: 'POST', body: params }),
  scoutTalent: (params) =>
    request('/workflows/talent-scout', { method: 'POST', body: params }),
  buildSystem: (params) =>
    request('/workflows/build-system', { method: 'POST', body: params }),
  proposeSystems: () =>
    request('/workflows/propose-systems', { method: 'POST' }),
  buildAutomationSpec: (params) =>
    request('/workflows/automation-spec', { method: 'POST', body: params }),

  // Auth
  getAuthUrl: () => request('/auth/google'),
  getAuthStatus: () => request('/auth/status'),

  // Integrations
  getIntegrations: () => request('/integrations'),
  getAuthUrlFor: (platform) => request(`/auth/${platform}`),
  disconnectPlatform: (platform) => request(`/auth/${platform}`, { method: 'DELETE' }),
  connectTelegram: (botToken) => request('/auth/telegram', { method: 'POST', body: { botToken } }),
  connectCanva: (apiKey) => request('/auth/canva', { method: 'POST', body: { apiKey } }),

  // Integration Data
  getSlackChannels: () => request('/integrations/slack/channels'),
  getSlackMessages: (channel, limit = 20) => request(`/integrations/slack/messages/${channel}?limit=${limit}`),
  getNotionPages: () => request('/integrations/notion/pages'),
  getNotionDatabases: () => request('/integrations/notion/databases'),
  getAsanaWorkspaces: () => request('/integrations/asana/workspaces'),
  getAsanaTasks: (workspace) => request(`/integrations/asana/tasks?workspace=${workspace}`),
  getTelegramUpdates: (limit = 20) => request(`/integrations/telegram/updates?limit=${limit}`),
  getDiscordGuilds: () => request('/integrations/discord/guilds'),
  getMetaPages: () => request('/integrations/meta/pages'),
  getMetaInstagram: () => request('/integrations/meta/instagram'),

  // Setup
  setupDrive: () => request('/setup/drive', { method: 'POST' }),
};

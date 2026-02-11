// ─── Memory Strategy: Controlled Memory ──────────────────────
import { Memory, ConversationHistory } from '../db/models.js';
import { logger } from '../utils/logger.js';

export async function initializeMemory() {
  const defaults = {
    'owner.name': { value: process.env.OWNER_NAME || 'Ayham', category: 'profile' },
    'owner.alias': { value: process.env.OWNER_ALIAS || "A'Y", category: 'profile' },
    'owner.role': { value: process.env.OWNER_ROLE || 'Managing Partner, Co-Founder', category: 'profile' },
    'owner.org': { value: process.env.OWNER_ORG || 'HRMNY', category: 'profile' },
    'owner.location': { value: 'Dubai, UTC+4', category: 'profile' },
    'agent.name': { value: 'Malik Zaid', category: 'profile' },
    'agent.role': { value: 'Executive A-Player Agent', category: 'profile' },
    'agent.phase': { value: 'Phase 1 \u2014 No external comms', category: 'rule' },
    'rule.external_comms': { value: "BLOCKED \u2014 requires A'Y approval for any external message", category: 'rule' },
    'rule.financial': { value: "BLOCKED \u2014 requires A'Y approval for any spend commitment", category: 'rule' },
    'rule.process_change': { value: "BLOCKED \u2014 requires A'Y approval for any governance/process change", category: 'rule' },
    'rule.sensitive_storage': { value: 'OFF \u2014 no passwords, IDs, personal docs, contract contents stored', category: 'rule' },
  };

  for (const [key, { value, category }] of Object.entries(defaults)) {
    const existing = await Memory.get(key);
    if (!existing) await Memory.set(key, value, category, false);
  }
  logger.info('MEMORY', 'Core memory initialized');
}

export async function getContextForPrompt() {
  const [profile, rules, projects, priorities, preferences] = await Promise.all([
    Memory.getByCategory('profile'), Memory.getByCategory('rule'),
    Memory.getByCategory('project'), Memory.getByCategory('priority'),
    Memory.getByCategory('preference'),
  ]);
  const sections = [];
  if (profile.length) sections.push('## Profile\n' + profile.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  if (rules.length) sections.push('## Rules\n' + rules.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  if (projects.length) sections.push('## Active Projects\n' + projects.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  if (priorities.length) sections.push('## Current Priorities\n' + priorities.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  if (preferences.length) sections.push('## Preferences\n' + preferences.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  return sections.join('\n\n');
}

export async function updateMemory(key, value, category) {
  if (category === 'sensitive') {
    logger.warn('MEMORY', `Attempted to store sensitive data for key: ${key} \u2014 BLOCKED`);
    return null;
  }
  await Memory.set(key, value, category, false);
  logger.info('MEMORY', `Updated: ${key} (${category})`);
  return Memory.get(key);
}

export async function getConversationContext(limit = 10) {
  return ConversationHistory.getRecent(limit);
}

export async function addToHistory(role, content, metadata = null) {
  await ConversationHistory.add(role, content, metadata);
}

export async function getMemorySummary() {
  const all = await Memory.getAll();
  const grouped = {};
  for (const item of all) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ key: item.key, value: item.value });
  }
  return grouped;
}

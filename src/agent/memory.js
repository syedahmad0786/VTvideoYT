// ─── Memory Strategy: Controlled Memory ──────────────────────
// Persistent Profile + Operational Memory + Sensitive OFF by default

import { Memory, ConversationHistory } from '../db/models.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize Malik's core memory with default profile
 */
export function initializeMemory() {
  const defaults = {
    // Profile context
    'owner.name': { value: process.env.OWNER_NAME || 'Ayham', category: 'profile' },
    'owner.alias': { value: process.env.OWNER_ALIAS || "A'Y", category: 'profile' },
    'owner.role': { value: process.env.OWNER_ROLE || 'Managing Partner, Co-Founder', category: 'profile' },
    'owner.org': { value: process.env.OWNER_ORG || 'HRMNY', category: 'profile' },
    'owner.location': { value: 'Dubai, UTC+4', category: 'profile' },

    // Agent identity
    'agent.name': { value: 'Malik Zaid', category: 'profile' },
    'agent.role': { value: 'Executive A-Player Agent', category: 'profile' },
    'agent.phase': { value: 'Phase 1 — No external comms', category: 'rule' },

    // Decision rules
    'rule.external_comms': { value: 'BLOCKED — requires A\'Y approval for any external message', category: 'rule' },
    'rule.financial': { value: 'BLOCKED — requires A\'Y approval for any spend commitment', category: 'rule' },
    'rule.process_change': { value: 'BLOCKED — requires A\'Y approval for any governance/process change', category: 'rule' },
    'rule.sensitive_storage': { value: 'OFF — no passwords, IDs, personal docs, contract contents stored', category: 'rule' },
  };

  for (const [key, { value, category }] of Object.entries(defaults)) {
    const existing = Memory.get(key);
    if (!existing) {
      Memory.set(key, value, category, false);
      logger.debug('MEMORY', `Initialized: ${key}`);
    }
  }

  logger.info('MEMORY', 'Core memory initialized');
}

/**
 * Get Malik's full context for AI prompting
 */
export function getContextForPrompt() {
  const profile = Memory.getByCategory('profile');
  const rules = Memory.getByCategory('rule');
  const projects = Memory.getByCategory('project');
  const priorities = Memory.getByCategory('priority');
  const preferences = Memory.getByCategory('preference');

  const sections = [];

  if (profile.length > 0) {
    sections.push('## Profile\n' + profile.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  }
  if (rules.length > 0) {
    sections.push('## Rules\n' + rules.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  }
  if (projects.length > 0) {
    sections.push('## Active Projects\n' + projects.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  }
  if (priorities.length > 0) {
    sections.push('## Current Priorities\n' + priorities.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  }
  if (preferences.length > 0) {
    sections.push('## Preferences\n' + preferences.map(m => `- ${m.key}: ${m.value}`).join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Update operational memory (projects, priorities)
 */
export function updateMemory(key, value, category) {
  if (category === 'sensitive') {
    logger.warn('MEMORY', `Attempted to store sensitive data for key: ${key} — BLOCKED`);
    return null;
  }
  Memory.set(key, value, category, false);
  logger.info('MEMORY', `Updated: ${key} (${category})`);
  return Memory.get(key);
}

/**
 * Get recent conversation context
 */
export function getConversationContext(limit = 10) {
  return ConversationHistory.getRecent(limit);
}

/**
 * Add to conversation history
 */
export function addToHistory(role, content, metadata = null) {
  ConversationHistory.add(role, content, metadata);
}

/**
 * Get all non-sensitive memory as a summary
 */
export function getMemorySummary() {
  const all = Memory.getAll();
  const grouped = {};
  for (const item of all) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ key: item.key, value: item.value });
  }
  return grouped;
}

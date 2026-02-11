// ─── Authority Model + Approval Gates ──────────────────────────
// Determines what Malik can do autonomously vs. what requires approval.

import { ApprovalQueue, RiskFlags, WorkLog } from '../db/models.js';
import { logger } from '../utils/logger.js';

// Actions that ALWAYS require A'Y approval
const APPROVAL_REQUIRED_TYPES = [
  'external_email',      // Any email to clients, vendors, partners
  'financial_commit',    // Any spending decision
  'process_change',      // Changes to how people work
  'hr_legal',            // HR, legal, or sensitive matters
  'external_file_share', // Sharing files outside private group
  'reputational',        // Anything affecting reputation
];

// Actions allowed without approval (internal only)
const AUTONOMOUS_ACTIONS = [
  'create_draft',        // Drafts of any kind
  'build_system',        // Internal systems, templates, trackers
  'propose_calendar',    // Calendar block proposals
  'create_asana_task',   // Tasks on approved boards only
  'conduct_research',    // Research with sourced findings
  'log_work',            // Work logging
  'log_decision',        // Decision logging
  'flag_risk',           // Risk flagging (this actually auto-escalates)
];

// Escalation keywords that trigger immediate stop
const ESCALATION_KEYWORDS = [
  'legal', 'lawsuit', 'lawyer', 'attorney', 'contract dispute', 'litigation',
  'compliance', 'regulatory', 'GDPR', 'data breach',
  'financial', 'budget overrun', 'payment', 'invoice dispute', 'refund',
  'debt', 'loan', 'investment commit',
  'HR', 'termination', 'firing', 'harassment', 'complaint', 'disciplinary',
  'salary', 'compensation dispute',
  'reputation', 'PR crisis', 'public statement', 'media', 'social media crisis',
  'defamation', 'controversy',
];

/**
 * Check if an action requires approval
 * @param {string} actionType - The type of action
 * @returns {{ requiresApproval: boolean, reason: string | null }}
 */
export function checkAuthority(actionType) {
  if (APPROVAL_REQUIRED_TYPES.includes(actionType)) {
    return {
      requiresApproval: true,
      reason: `Action type "${actionType}" requires A'Y approval before execution.`,
    };
  }

  if (AUTONOMOUS_ACTIONS.includes(actionType)) {
    return {
      requiresApproval: false,
      reason: null,
    };
  }

  // Unknown action type — default to requiring approval (safe fallback)
  return {
    requiresApproval: true,
    reason: `Unknown action type "${actionType}" — defaulting to approval required.`,
  };
}

/**
 * Queue an action for approval
 */
export function queueForApproval({ type, title, description, payload, priority = 'normal' }) {
  logger.info('AUTHORITY', `Queuing for approval: ${title}`, { type, priority });

  const item = ApprovalQueue.create({
    type,
    title,
    description,
    payload,
    priority,
  });

  WorkLog.create({
    action: `Queued for approval: ${title}`,
    category: 'system',
    details: `Type: ${type}, Priority: ${priority}. Awaiting A'Y sign-off.`,
    links: [],
  });

  return item;
}

/**
 * Scan text content for escalation triggers
 * @param {string} content - Text to scan
 * @returns {{ shouldEscalate: boolean, triggers: string[], severity: string }}
 */
export function scanForEscalation(content) {
  const lowerContent = content.toLowerCase();
  const triggers = [];

  for (const keyword of ESCALATION_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      triggers.push(keyword);
    }
  }

  if (triggers.length === 0) {
    return { shouldEscalate: false, triggers: [], severity: 'none' };
  }

  // Determine severity based on trigger types
  const hasLegal = triggers.some(t =>
    ['legal', 'lawsuit', 'lawyer', 'attorney', 'litigation', 'compliance', 'regulatory', 'GDPR', 'data breach'].includes(t.toLowerCase())
  );
  const hasFinancial = triggers.some(t =>
    ['financial', 'budget overrun', 'payment', 'invoice dispute', 'debt', 'loan', 'investment commit'].includes(t.toLowerCase())
  );
  const hasHR = triggers.some(t =>
    ['HR', 'termination', 'firing', 'harassment', 'complaint', 'disciplinary'].includes(t.toLowerCase())
  );
  const hasReputation = triggers.some(t =>
    ['reputation', 'PR crisis', 'public statement', 'media', 'social media crisis', 'defamation', 'controversy'].includes(t.toLowerCase())
  );

  let severity = 'medium';
  if (hasLegal || hasReputation) severity = 'critical';
  else if (hasFinancial || hasHR) severity = 'high';

  return { shouldEscalate: true, triggers, severity };
}

/**
 * Raise a risk flag and auto-escalate
 */
export function raiseRiskFlag({ type, title, description, severity = 'medium', source }) {
  logger.warn('AUTHORITY', `RISK FLAG raised: ${title}`, { type, severity });

  const flag = RiskFlags.create({ type, title, description, severity, source });

  // Also queue as approval item if high/critical
  if (severity === 'high' || severity === 'critical') {
    queueForApproval({
      type: 'hr_legal',
      title: `⚠ RISK: ${title}`,
      description: `Auto-escalated risk flag (${severity}): ${description}`,
      payload: { riskFlagId: flag.id, type, severity },
      priority: 'urgent',
    });
  }

  return flag;
}

/**
 * Process an approval decision from A'Y
 */
export function processApproval(approvalId, decision, note = '') {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be "approved" or "rejected"');
  }

  const item = ApprovalQueue.resolve(approvalId, decision, "A'Y", note);

  WorkLog.create({
    action: `Approval ${decision}: ${item.title}`,
    category: 'system',
    details: note || `A'Y ${decision} the request.`,
    links: [],
  });

  logger.info('AUTHORITY', `Approval ${decision}: ${item.title}`);
  return item;
}

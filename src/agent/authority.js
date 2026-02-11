// ─── Authority Model + Approval Gates ──────────────────────────
// Determines what Malik can do autonomously vs. what requires approval.

import { ApprovalQueue, RiskFlags, WorkLog } from '../db/models.js';
import { logger } from '../utils/logger.js';

const APPROVAL_REQUIRED_TYPES = [
  'external_email', 'financial_commit', 'process_change',
  'hr_legal', 'external_file_share', 'reputational',
];

const AUTONOMOUS_ACTIONS = [
  'create_draft', 'build_system', 'propose_calendar', 'create_asana_task',
  'conduct_research', 'log_work', 'log_decision', 'flag_risk',
];

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

export function checkAuthority(actionType) {
  if (APPROVAL_REQUIRED_TYPES.includes(actionType)) {
    return { requiresApproval: true, reason: `Action type "${actionType}" requires A'Y approval before execution.` };
  }
  if (AUTONOMOUS_ACTIONS.includes(actionType)) {
    return { requiresApproval: false, reason: null };
  }
  return { requiresApproval: true, reason: `Unknown action type "${actionType}" — defaulting to approval required.` };
}

export async function queueForApproval({ type, title, description, payload, priority = 'normal' }) {
  logger.info('AUTHORITY', `Queuing for approval: ${title}`, { type, priority });
  const item = await ApprovalQueue.create({ type, title, description, payload, priority });
  await WorkLog.create({
    action: `Queued for approval: ${title}`,
    category: 'system',
    details: `Type: ${type}, Priority: ${priority}. Awaiting A'Y sign-off.`,
    links: [],
  });
  return item;
}

export function scanForEscalation(content) {
  const lowerContent = content.toLowerCase();
  const triggers = [];
  for (const keyword of ESCALATION_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) triggers.push(keyword);
  }
  if (triggers.length === 0) return { shouldEscalate: false, triggers: [], severity: 'none' };

  const hasLegal = triggers.some(t => ['legal','lawsuit','lawyer','attorney','litigation','compliance','regulatory','gdpr','data breach'].includes(t.toLowerCase()));
  const hasReputation = triggers.some(t => ['reputation','pr crisis','public statement','media','social media crisis','defamation','controversy'].includes(t.toLowerCase()));
  const hasFinancial = triggers.some(t => ['financial','budget overrun','payment','invoice dispute','debt','loan','investment commit'].includes(t.toLowerCase()));
  const hasHR = triggers.some(t => ['hr','termination','firing','harassment','complaint','disciplinary'].includes(t.toLowerCase()));

  let severity = 'medium';
  if (hasLegal || hasReputation) severity = 'critical';
  else if (hasFinancial || hasHR) severity = 'high';

  return { shouldEscalate: true, triggers, severity };
}

export async function raiseRiskFlag({ type, title, description, severity = 'medium', source }) {
  logger.warn('AUTHORITY', `RISK FLAG raised: ${title}`, { type, severity });
  const flag = await RiskFlags.create({ type, title, description, severity, source });
  if (severity === 'high' || severity === 'critical') {
    await queueForApproval({
      type: 'hr_legal',
      title: `\u26A0 RISK: ${title}`,
      description: `Auto-escalated risk flag (${severity}): ${description}`,
      payload: { riskFlagId: flag.id, type, severity },
      priority: 'urgent',
    });
  }
  return flag;
}

export async function processApproval(approvalId, decision, note = '') {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Decision must be "approved" or "rejected"');
  const item = await ApprovalQueue.resolve(approvalId, decision, "A'Y", note);
  await WorkLog.create({
    action: `Approval ${decision}: ${item.title}`,
    category: 'system',
    details: note || `A'Y ${decision} the request.`,
    links: [],
  });
  logger.info('AUTHORITY', `Approval ${decision}: ${item.title}`);
  return item;
}

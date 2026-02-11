// ─── Escalation + Risk Detection System ──────────────────────
// Monitors all agent activity for escalation triggers.

import { scanForEscalation, raiseRiskFlag } from './authority.js';
import { logger } from '../utils/logger.js';

/**
 * Scan incoming content (emails, messages, documents) for risk triggers
 * and auto-escalate as needed.
 */
export function processContentForRisks(content, source = 'unknown') {
  const { shouldEscalate, triggers, severity } = scanForEscalation(content);

  if (!shouldEscalate) {
    return { escalated: false };
  }

  logger.warn('ESCALATION', `Risk detected from ${source}`, { triggers, severity });

  const riskTypeMap = {
    legal: 'legal',
    lawsuit: 'legal',
    lawyer: 'legal',
    attorney: 'legal',
    litigation: 'legal',
    compliance: 'legal',
    regulatory: 'legal',
    GDPR: 'legal',
    'data breach': 'security',
    financial: 'financial',
    'budget overrun': 'financial',
    payment: 'financial',
    'invoice dispute': 'financial',
    debt: 'financial',
    loan: 'financial',
    'investment commit': 'financial',
    HR: 'hr',
    termination: 'hr',
    firing: 'hr',
    harassment: 'hr',
    complaint: 'hr',
    disciplinary: 'hr',
    salary: 'hr',
    'compensation dispute': 'hr',
    reputation: 'reputational',
    'PR crisis': 'reputational',
    'public statement': 'reputational',
    media: 'reputational',
    'social media crisis': 'reputational',
    defamation: 'reputational',
    controversy: 'reputational',
  };

  // Determine primary risk type
  const primaryTrigger = triggers[0];
  const riskType = riskTypeMap[primaryTrigger] || 'legal';

  const flag = raiseRiskFlag({
    type: riskType,
    title: `Auto-detected risk: ${triggers.slice(0, 3).join(', ')}`,
    description: `Escalation triggers found in content from "${source}": ${triggers.join(', ')}. Content preview: "${content.substring(0, 200)}..."`,
    severity,
    source,
  });

  return {
    escalated: true,
    flag,
    triggers,
    severity,
    message: `⚠ STOPPED — Risk detected (${severity}). Triggers: ${triggers.join(', ')}. This requires A'Y's attention before proceeding.`,
  };
}

/**
 * Pre-action check: run before any agent action to verify no escalation needed
 */
export function preActionCheck(actionDescription) {
  return processContentForRisks(actionDescription, 'pre-action-check');
}

/**
 * Email content scanner
 */
export function scanEmail(subject, body, from) {
  const combined = `${subject} ${body} ${from}`;
  return processContentForRisks(combined, `email from ${from}`);
}

/**
 * Document content scanner
 */
export function scanDocument(title, content) {
  return processContentForRisks(content, `document: ${title}`);
}

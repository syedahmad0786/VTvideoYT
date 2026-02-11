// ─── Escalation + Risk Detection System ──────────────────────
import { scanForEscalation, raiseRiskFlag } from './authority.js';
import { logger } from '../utils/logger.js';

const riskTypeMap = {
  legal:'legal', lawsuit:'legal', lawyer:'legal', attorney:'legal', litigation:'legal',
  compliance:'legal', regulatory:'legal', GDPR:'legal', 'data breach':'security',
  financial:'financial', 'budget overrun':'financial', payment:'financial',
  'invoice dispute':'financial', debt:'financial', loan:'financial', 'investment commit':'financial',
  HR:'hr', termination:'hr', firing:'hr', harassment:'hr', complaint:'hr', disciplinary:'hr',
  salary:'hr', 'compensation dispute':'hr',
  reputation:'reputational', 'PR crisis':'reputational', 'public statement':'reputational',
  media:'reputational', 'social media crisis':'reputational', defamation:'reputational', controversy:'reputational',
};

export async function processContentForRisks(content, source = 'unknown') {
  const { shouldEscalate, triggers, severity } = scanForEscalation(content);
  if (!shouldEscalate) return { escalated: false };

  logger.warn('ESCALATION', `Risk detected from ${source}`, { triggers, severity });
  const riskType = riskTypeMap[triggers[0]] || 'legal';

  const flag = await raiseRiskFlag({
    type: riskType,
    title: `Auto-detected risk: ${triggers.slice(0, 3).join(', ')}`,
    description: `Escalation triggers found in content from "${source}": ${triggers.join(', ')}. Content preview: "${content.substring(0, 200)}..."`,
    severity, source,
  });

  return {
    escalated: true, flag, triggers, severity,
    message: `\u26A0 STOPPED \u2014 Risk detected (${severity}). Triggers: ${triggers.join(', ')}. This requires A'Y's attention before proceeding.`,
  };
}

export async function preActionCheck(actionDescription) {
  return processContentForRisks(actionDescription, 'pre-action-check');
}

export async function scanEmail(subject, body, from) {
  return processContentForRisks(`${subject} ${body} ${from}`, `email from ${from}`);
}

export async function scanDocument(title, content) {
  return processContentForRisks(content, `document: ${title}`);
}

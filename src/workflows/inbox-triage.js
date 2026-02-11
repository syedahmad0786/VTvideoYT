// ─── Inbox Triage Workflow ──────────────────────────────────
// Label, summarize, propose responses, queue approvals.

import Anthropic from '@anthropic-ai/sdk';
import { listInboxMessages, getEmailContent, createDraft } from '../integrations/google/gmail.js';
import { queueForApproval } from '../agent/authority.js';
import { processContentForRisks } from '../agent/escalation.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Run inbox triage — scans unread emails, categorizes, drafts responses
 */
export async function runInboxTriage(maxEmails = 10) {
  logger.info('WORKFLOW', 'Starting inbox triage');

  const { messages, error } = await listInboxMessages(maxEmails, 'is:unread');
  if (error) {
    logger.error('WORKFLOW', 'Failed to fetch inbox', { error });
    return { error };
  }

  if (messages.length === 0) {
    logger.info('WORKFLOW', 'No unread emails to triage');
    return { processed: 0, drafts: 0, escalations: 0 };
  }

  const results = {
    processed: 0,
    drafts: 0,
    escalations: 0,
    items: [],
  };

  for (const msg of messages) {
    try {
      // Get full email content
      const email = await getEmailContent(msg.id);
      if (email.error) continue;

      // Scan for risks
      const riskCheck = processContentForRisks(
        `${email.subject} ${email.body}`,
        `email from ${email.from}`
      );

      if (riskCheck.escalated) {
        results.escalations++;
        results.items.push({
          type: 'escalation',
          from: email.from,
          subject: email.subject,
          risk: riskCheck.flag,
        });
        continue;
      }

      // Use AI to categorize and draft response
      const analysis = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: `${MALIK_SYSTEM_PROMPT}

You are triaging emails for A'Y. For each email, provide:
1. Category (client, vendor, partner, internal, personal, spam/marketing, urgent)
2. Priority (low, normal, high, urgent)
3. Summary (1-2 sentences)
4. Suggested action (respond, forward, archive, flag, schedule)
5. Draft response (if action is "respond") — write as A'Y would, professional but not stiff

Format as JSON:
{
  "category": "",
  "priority": "",
  "summary": "",
  "suggestedAction": "",
  "draftResponse": ""
}`,
        messages: [{
          role: 'user',
          content: `Triage this email:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.body?.substring(0, 3000)}`,
        }],
      });

      let parsed;
      try {
        const text = analysis.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (parsed) {
        // Create draft if response suggested
        if (parsed.suggestedAction === 'respond' && parsed.draftResponse) {
          const draft = await createDraft(
            email.from,
            `Re: ${email.subject}`,
            parsed.draftResponse
          );

          if (!draft.error) {
            results.drafts++;

            // Queue for approval (external email)
            queueForApproval({
              type: 'external_email',
              title: `Reply to: ${email.from} — ${email.subject}`,
              description: `Draft response created. Category: ${parsed.category}, Priority: ${parsed.priority}`,
              payload: {
                to: email.from,
                subject: `Re: ${email.subject}`,
                draftId: draft.draftId,
                summary: parsed.summary,
              },
              priority: parsed.priority,
            });
          }
        }

        results.items.push({
          type: 'triaged',
          from: email.from,
          subject: email.subject,
          ...parsed,
        });
      }

      results.processed++;
    } catch (err) {
      logger.error('WORKFLOW', `Failed to triage email ${msg.id}`, { error: err.message });
    }
  }

  // Log work
  WorkLog.create({
    action: `Inbox triage: ${results.processed} emails processed, ${results.drafts} drafts created, ${results.escalations} escalations`,
    category: 'inbox',
    details: JSON.stringify(results.items.map(i => `${i.from}: ${i.subject} (${i.type})`)),
    links: [],
  });

  logger.info('WORKFLOW', `Inbox triage complete: ${results.processed} processed, ${results.drafts} drafts`);
  return results;
}

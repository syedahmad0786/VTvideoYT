// ─── Commercial Proposals Workflow ──────────────────────────────
// Scope + costing drafts + proposal structure + deck ready.

import Anthropic from '@anthropic-ai/sdk';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { queueForApproval } from '../agent/authority.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Generate a commercial proposal draft
 */
export async function generateProposal({
  clientName,
  projectBrief,
  services,
  budget,
  timeline,
  folderId,
}) {
  logger.info('WORKFLOW', `Generating proposal for: ${clientName}`);

  // Use AI to create comprehensive proposal
  const proposalContent = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `${MALIK_SYSTEM_PROMPT}

You are creating a commercial proposal for HRMNY (a creative agency in Dubai). The proposal must be:
- Professional and sharp
- Clearly scoped with deliverables
- Include realistic costing logic
- Have a structured narrative flow
- Protect A'Y's reputation — nothing sloppy

Create the full proposal document with these sections:
1. Executive Summary
2. Understanding of the Brief
3. Proposed Approach
4. Scope of Work (detailed deliverables)
5. Timeline & Milestones
6. Team & Resources
7. Investment (costing breakdown)
8. Terms & Conditions
9. Why HRMNY (differentiators)
10. Next Steps`,
    messages: [{
      role: 'user',
      content: `Create a proposal for:
Client: ${clientName}
Brief: ${projectBrief}
Services Requested: ${services?.join(', ') || 'To be scoped'}
Budget Indication: ${budget || 'Not specified'}
Timeline: ${timeline || 'To be discussed'}`,
    }],
  });

  const content = proposalContent.content[0].text;

  // Create Google Doc
  const doc = await createDocument(`Proposal — ${clientName} — HRMNY`, folderId);

  if (doc.documentId) {
    await writeToDocument(doc.documentId, content);
  }

  // Register deliverable
  const deliverable = Deliverables.create({
    title: `Commercial Proposal: ${clientName}`,
    type: 'proposal',
    link: doc.link || null,
    description: `Proposal for ${clientName}. Services: ${services?.join(', ') || 'TBD'}`,
  });

  // Queue for approval (it's client-facing)
  queueForApproval({
    type: 'external_file_share',
    title: `Review Proposal: ${clientName}`,
    description: `Commercial proposal ready for review before sharing with client.`,
    payload: {
      deliverableId: deliverable.id,
      clientName,
      documentLink: doc.link,
    },
    priority: 'high',
  });

  WorkLog.create({
    action: `Created commercial proposal: ${clientName}`,
    category: 'proposal',
    details: `Full proposal drafted with scope, costing, and timeline. Queued for A'Y review.`,
    links: doc.link ? [doc.link] : [],
  });

  logger.info('WORKFLOW', `Proposal generated for ${clientName}`);
  return {
    deliverable,
    documentLink: doc.link,
    content,
  };
}

/**
 * Generate a costing breakdown
 */
export async function generateCosting({ services, complexity = 'medium', market = 'Dubai' }) {
  const costingAnalysis = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${MALIK_SYSTEM_PROMPT}

You are creating a costing breakdown for HRMNY services. Be realistic about Dubai market rates for a creative agency. Structure as a table with:
- Service/Deliverable
- Estimated Hours
- Rate (per hour or per deliverable)
- Subtotal
- Notes/Assumptions

Include a total and any caveats. Format as a structured document.`,
    messages: [{
      role: 'user',
      content: `Create costing for these services:
Services: ${services.join(', ')}
Complexity: ${complexity}
Market: ${market}`,
    }],
  });

  return costingAnalysis.content[0].text;
}

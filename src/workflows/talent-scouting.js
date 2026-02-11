// ─── Talent Scouting Workflow ──────────────────────────────────
// Shortlists with rationale, links, outreach drafts (not sent).

import Anthropic from '@anthropic-ai/sdk';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { createSpreadsheet, writeToSheet } from '../integrations/google/sheets.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { queueForApproval } from '../agent/authority.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Create a talent shortlist for a role
 */
export async function scoutTalent({
  role,
  type, // 'creative' or 'operations'
  requirements,
  location = 'Dubai / Remote',
  budget,
  folderId = null,
}) {
  logger.info('WORKFLOW', `Starting talent scouting: ${role}`);

  // Generate scouting brief and criteria
  const analysis = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `${MALIK_SYSTEM_PROMPT}

You are scouting talent for HRMNY. Create a comprehensive scouting brief:

1. **Role Profile** — What this role needs to do at HRMNY
2. **Must-Have Criteria** — Non-negotiable skills/experience
3. **Nice-to-Have Criteria** — Differentiators
4. **Red Flags** — What to avoid
5. **Search Strategy** — Where to find these candidates (platforms, communities, agencies)
6. **Shortlist Template** — Columns for tracking candidates
7. **Outreach Template** — Draft message for reaching out (NOT to be sent without approval)
8. **Interview Questions** — 5 key questions for screening
9. **Compensation Benchmark** — Market rate estimate for ${location}

Be specific to the creative agency world. Think about what makes someone actually good at this role, not just what their CV says.`,
    messages: [{
      role: 'user',
      content: `Scout talent for:
Role: ${role}
Type: ${type}
Requirements: ${requirements || 'See role description'}
Location: ${location}
Budget: ${budget || 'Market rate'}`,
    }],
  });

  const briefContent = analysis.content[0].text;

  // Create scouting doc
  const doc = await createDocument(`Talent Scout — ${role}`, folderId);
  if (doc.documentId) {
    await writeToDocument(doc.documentId, briefContent);
  }

  // Create tracking spreadsheet
  const sheet = await createSpreadsheet(
    `Talent Tracker — ${role}`,
    ['Shortlist', 'Screening Notes', 'Outreach Log'],
    folderId
  );

  if (sheet.spreadsheetId) {
    // Set up headers
    await writeToSheet(sheet.spreadsheetId, 'Shortlist!A1:H1', [[
      'Name', 'Current Role', 'Location', 'Portfolio/LinkedIn',
      'Fit Score (1-10)', 'Notes', 'Status', 'Date Added'
    ]]);

    await writeToSheet(sheet.spreadsheetId, 'Outreach Log!A1:E1', [[
      'Candidate', 'Channel', 'Message Sent', 'Response', 'Date'
    ]]);
  }

  const deliverable = Deliverables.create({
    title: `Talent Scout: ${role}`,
    type: 'other',
    link: doc.link || null,
    description: `Scouting brief, tracker, and outreach templates for ${role}`,
  });

  // Queue outreach for approval
  queueForApproval({
    type: 'external_email',
    title: `Approve outreach templates: ${role} scouting`,
    description: `Outreach message templates ready for review before any candidate contact.`,
    payload: {
      role,
      deliverableId: deliverable.id,
      docLink: doc.link,
      sheetLink: sheet.link,
    },
    priority: 'normal',
  });

  WorkLog.create({
    action: `Talent scouting setup: ${role}`,
    category: 'talent',
    details: `Brief created, tracker set up, outreach templates drafted. All outreach queued for approval.`,
    links: [doc.link, sheet.link].filter(Boolean),
  });

  logger.info('WORKFLOW', `Talent scouting complete: ${role}`);
  return {
    deliverable,
    briefLink: doc.link,
    trackerLink: sheet.link,
    content: briefContent,
  };
}

// ─── Systems Building Workflow ──────────────────────────────────
// Templates, SOP drafts, trackers, automation maps.

import Anthropic from '@anthropic-ai/sdk';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { createSpreadsheet, writeToSheet } from '../integrations/google/sheets.js';
import { WorkLog, Deliverables, DecisionsLog } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Build an internal system (template, SOP, tracker, etc.)
 */
export async function buildSystem({
  name,
  type, // 'template', 'sop', 'tracker', 'automation_map', 'process'
  description,
  requirements = [],
  folderId = null,
}) {
  logger.info('WORKFLOW', `Building system: ${name} (${type})`);

  const systemPromptAddition = {
    template: 'Create a reusable template. It should be clean, professional, and easy to fill in. Include placeholder text and formatting guidance.',
    sop: 'Create a Standard Operating Procedure. Include: purpose, scope, step-by-step instructions, roles, exceptions, and review schedule.',
    tracker: 'Create a tracker/dashboard design. Include: what to track, columns/fields needed, update frequency, and who updates it.',
    automation_map: 'Create an automation map. Include: current manual process, proposed automated flow, tools needed, triggers, conditions, and expected outcomes.',
    process: 'Create a process document. Include: overview, workflow steps, decision points, roles, tools, metrics, and improvement triggers.',
  };

  const content = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `${MALIK_SYSTEM_PROMPT}

You are building internal systems for HRMNY. ${systemPromptAddition[type] || ''}

This should be practical, not theoretical. Build something that can be used immediately.
Requirements to incorporate: ${requirements.join(', ') || 'None specified'}`,
    messages: [{
      role: 'user',
      content: `Build: ${name}
Type: ${type}
Description: ${description}`,
    }],
  });

  const systemContent = content.content[0].text;

  // Create appropriate Google resource
  let docLink = null;
  let sheetLink = null;

  if (type === 'tracker') {
    // Create as spreadsheet
    const sheet = await createSpreadsheet(name, ['Tracker', 'Dashboard', 'Config'], folderId);
    sheetLink = sheet.link;
  }

  // Always create a doc for the system definition
  const doc = await createDocument(`System — ${name}`, folderId);
  if (doc.documentId) {
    await writeToDocument(doc.documentId, systemContent);
    docLink = doc.link;
  }

  const deliverable = Deliverables.create({
    title: `System: ${name}`,
    type: 'other',
    link: docLink || sheetLink,
    description: `${type}: ${description}`,
  });

  DecisionsLog.create({
    decision: `Built system: ${name}`,
    rationale: `${type} created to ${description}`,
    optionsConsidered: [],
    category: 'systems',
  });

  WorkLog.create({
    action: `System built: ${name} (${type})`,
    category: 'system',
    details: description,
    links: [docLink, sheetLink].filter(Boolean),
  });

  logger.info('WORKFLOW', `System built: ${name}`);
  return {
    deliverable,
    docLink,
    sheetLink,
    content: systemContent,
  };
}

/**
 * Propose systems A'Y is missing (proactive value)
 */
export async function proposeNewSystems() {
  logger.info('WORKFLOW', 'Analyzing for missing systems');

  const analysis = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${MALIK_SYSTEM_PROMPT}

You are analyzing what systems HRMNY (a creative agency in Dubai) likely needs but probably doesn't have. Think about:
- Client management workflow
- Project delivery pipeline
- Financial tracking and invoicing
- Knowledge management
- Team resource allocation
- Content/asset management
- Quality assurance
- Client onboarding
- Vendor management

Propose 3 specific systems with:
1. System name
2. What problem it solves
3. How to build it (tools, structure)
4. Expected impact
5. Priority (build order)

Be practical. These need to work for a small-to-medium creative agency.`,
    messages: [{
      role: 'user',
      content: 'What 3 systems is HRMNY most likely missing? Propose them with full specs.',
    }],
  });

  const proposals = analysis.content[0].text;

  WorkLog.create({
    action: 'Proactive: Proposed 3 missing systems for HRMNY',
    category: 'system',
    details: proposals.substring(0, 500),
    links: [],
  });

  return proposals;
}

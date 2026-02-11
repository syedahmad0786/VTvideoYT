// ─── GPT/Automation Builds Workflow ──────────────────────────────
// Specs + prompts + tests + handoff notes.

import Anthropic from '@anthropic-ai/sdk';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Build a GPT/AI automation specification
 */
export async function buildAutomationSpec({
  name,
  purpose,
  inputs,
  outputs,
  constraints = [],
  folderId = null,
}) {
  logger.info('WORKFLOW', `Building automation spec: ${name}`);

  const spec = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `${MALIK_SYSTEM_PROMPT}

You are building an AI automation specification. Create a complete, handoff-ready document:

1. **Purpose** — What this automation does and why
2. **System Prompt** — The full system prompt for the GPT/AI
3. **Input Specification** — What data it receives, formats, validation
4. **Output Specification** — What it produces, formats, quality criteria
5. **Workflow Steps** — Step-by-step execution flow
6. **Edge Cases** — What happens when things go wrong
7. **Test Cases** — At least 5 test scenarios with expected outputs
8. **Constraints & Rules** — What the automation must NEVER do
9. **Integration Points** — How it connects to other systems
10. **Handoff Notes** — What someone else needs to know to maintain this

Be specific enough that someone could implement this without asking questions.`,
    messages: [{
      role: 'user',
      content: `Build automation spec:
Name: ${name}
Purpose: ${purpose}
Inputs: ${inputs || 'To be defined'}
Expected Outputs: ${outputs || 'To be defined'}
Constraints: ${constraints.join(', ') || 'Standard safety constraints'}`,
    }],
  });

  const content = spec.content[0].text;

  // Create doc
  const doc = await createDocument(`Automation Spec — ${name}`, folderId);
  if (doc.documentId) {
    await writeToDocument(doc.documentId, content);
  }

  const deliverable = Deliverables.create({
    title: `Automation: ${name}`,
    type: 'other',
    link: doc.link || null,
    description: `Full spec with prompts, tests, and handoff notes for "${name}"`,
  });

  WorkLog.create({
    action: `Automation spec built: ${name}`,
    category: 'automation',
    details: `Complete spec with system prompt, test cases, and handoff notes.`,
    links: doc.link ? [doc.link] : [],
  });

  logger.info('WORKFLOW', `Automation spec complete: ${name}`);
  return {
    deliverable,
    docLink: doc.link,
    content,
  };
}

/**
 * Build a custom prompt for a specific use case
 */
export async function buildPrompt({ useCase, context, examples = [] }) {
  const prompt = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${MALIK_SYSTEM_PROMPT}

You are a prompt engineer building a production-quality prompt. Include:
1. System prompt (full, ready to paste)
2. Key design decisions and why
3. Example interactions (at least 3)
4. Known limitations
5. Iteration notes (what to tweak if output isn't right)`,
    messages: [{
      role: 'user',
      content: `Build a prompt for:
Use case: ${useCase}
Context: ${context || 'HRMNY internal use'}
${examples.length > 0 ? `Examples of desired output:\n${examples.join('\n')}` : ''}`,
    }],
  });

  WorkLog.create({
    action: `Prompt built: ${useCase}`,
    category: 'automation',
    details: `Custom prompt engineered for "${useCase}"`,
    links: [],
  });

  return prompt.content[0].text;
}

// ─── Deep Research Workflow ──────────────────────────────────
// Compile findings with sources, contradictions, and recommendation.

import Anthropic from '@anthropic-ai/sdk';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Conduct deep research on a topic
 */
export async function conductResearch({
  topic,
  context,
  depth = 'comprehensive',
  focusAreas = [],
  folderId = null,
}) {
  logger.info('WORKFLOW', `Starting deep research: ${topic}`);

  const focusString = focusAreas.length > 0
    ? `Focus areas: ${focusAreas.join(', ')}`
    : 'Cover all relevant angles';

  const research = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `${MALIK_SYSTEM_PROMPT}

You are conducting deep research for A'Y. This must be thorough, honest, and useful.

Rules:
- NEVER fabricate sources or data
- Flag uncertainty explicitly
- Include contradictory findings if they exist
- Note where information gaps exist
- Be specific, not generic
- Include actionable recommendations

Structure the research as:

# Research Report: [Topic]

## Executive Summary
(3–5 bullet points with the key takeaways)

## Context
(Why this matters to HRMNY / A'Y)

## Key Findings
(Organized by sub-topic with detail)

## Data & Evidence
(Any relevant numbers, benchmarks, comparisons)

## Contradictions & Uncertainties
(Where sources disagree or where data is unclear)

## Competitive / Market Landscape
(If applicable — who's doing what)

## Risks & Considerations
(What could go wrong, what to watch)

## Recommendation
(1 clear recommendation with reasoning)

## Sources & References
(List all sources — be honest about what's AI-generated knowledge vs. verified)

## Next Steps
(What A'Y should do with this research)`,
    messages: [{
      role: 'user',
      content: `Research topic: ${topic}
Context: ${context || 'General research for HRMNY decision-making'}
Depth: ${depth}
${focusString}`,
    }],
  });

  const content = research.content[0].text;

  // Create Google Doc
  const doc = await createDocument(`Research — ${topic}`, folderId);
  if (doc.documentId) {
    await writeToDocument(doc.documentId, content);
  }

  const deliverable = Deliverables.create({
    title: `Research: ${topic}`,
    type: 'research',
    link: doc.link || null,
    description: `${depth} research on "${topic}"`,
  });

  WorkLog.create({
    action: `Deep research completed: ${topic}`,
    category: 'research',
    details: `${depth} research with findings, sources, contradictions, and recommendation.`,
    links: doc.link ? [doc.link] : [],
  });

  logger.info('WORKFLOW', `Research complete: ${topic}`);
  return {
    deliverable,
    documentLink: doc.link,
    content,
  };
}

/**
 * Quick research scan (lighter weight)
 */
export async function quickResearch(question) {
  const research = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: `${MALIK_SYSTEM_PROMPT}

Quick research response. Be concise but thorough:
1. Direct answer
2. Key supporting points (with sources where possible)
3. Caveats or uncertainties
4. One clear recommendation

Flag if this needs deeper research.`,
    messages: [{ role: 'user', content: question }],
  });

  WorkLog.create({
    action: `Quick research: ${question.substring(0, 80)}`,
    category: 'research',
    details: research.content[0].text.substring(0, 300),
    links: [],
  });

  return research.content[0].text;
}

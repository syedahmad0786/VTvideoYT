// ─── Calendar Optimizer Workflow ──────────────────────────────
// Propose weekly time-blocking, schedule as Malik, invite A'Y.

import Anthropic from '@anthropic-ai/sdk';
import { listEvents, getFreeBusy, createEvent } from '../integrations/google/calendar.js';
import { WorkLog, DecisionsLog } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Analyze the upcoming week and propose optimized time blocks
 */
export async function optimizeWeek() {
  logger.info('WORKFLOW', 'Starting calendar optimization');

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Get current events
  const { events, error } = await listEvents('primary', 50, weekStart.toISOString());
  if (error) {
    logger.error('WORKFLOW', 'Failed to fetch calendar', { error });
    return { error };
  }

  // Get free/busy data
  const freeBusy = await getFreeBusy(
    weekStart.toISOString(),
    weekEnd.toISOString()
  );

  // Use AI to analyze and propose optimization
  const analysis = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${MALIK_SYSTEM_PROMPT}

You are optimizing A'Y's weekly calendar. You should:
1. Identify gaps and opportunities for focused work blocks
2. Suggest time blocks for: deep work, admin, meetings, personal
3. Recommend meeting consolidation if meetings are scattered
4. Propose buffer time between meetings (15 min)
5. Protect morning hours (9-11 AM Dubai time) for deep work

Format response as JSON:
{
  "analysis": "Brief analysis of current week",
  "issues": ["list of scheduling issues found"],
  "proposedBlocks": [
    {
      "title": "Deep Work Block",
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "11:00",
      "rationale": "Why this block"
    }
  ],
  "recommendations": ["list of optimization recommendations"]
}`,
    messages: [{
      role: 'user',
      content: `Here are the events for the week of ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}:

${events.map(e => `- ${e.summary} | ${e.start} → ${e.end}`).join('\n') || 'No events scheduled'}

Free/busy data:
${JSON.stringify(freeBusy, null, 2)}

Please analyze and propose an optimized schedule.`,
    }],
  });

  let optimization;
  try {
    const text = analysis.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    optimization = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    optimization = null;
  }

  if (optimization) {
    // Log the optimization proposal
    DecisionsLog.create({
      decision: `Calendar optimization for week of ${format(weekStart, 'MMM dd')}`,
      rationale: optimization.analysis,
      optionsConsidered: optimization.recommendations,
      category: 'calendar',
    });

    WorkLog.create({
      action: `Calendar optimization proposed: ${optimization.proposedBlocks?.length || 0} time blocks suggested`,
      category: 'calendar',
      details: optimization.analysis,
      links: [],
    });
  }

  logger.info('WORKFLOW', 'Calendar optimization complete');
  return {
    currentEvents: events.length,
    optimization,
  };
}

/**
 * Create proposed time blocks (after A'Y approves)
 */
export async function applyTimeBlocks(blocks, ayEmail) {
  const results = [];

  for (const block of blocks) {
    const event = await createEvent({
      summary: `[Malik] ${block.title}`,
      description: `Proposed by Malik Zaid — ${block.rationale}`,
      startTime: block.startTime,
      endTime: block.endTime,
      attendees: ayEmail ? [ayEmail] : [],
    });

    results.push(event);
  }

  WorkLog.create({
    action: `Applied ${results.length} calendar time blocks`,
    category: 'calendar',
    details: blocks.map(b => b.title).join(', '),
    links: [],
  });

  return results;
}

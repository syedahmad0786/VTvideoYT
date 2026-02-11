// ─── Meeting Prep Workflow ──────────────────────────────────
// Agenda draft + pre-reads checklist + decision prompts.

import Anthropic from '@anthropic-ai/sdk';
import { listEvents } from '../integrations/google/calendar.js';
import { createDocument, writeToDocument } from '../integrations/google/docs.js';
import { WorkLog, Deliverables } from '../db/models.js';
import { MALIK_SYSTEM_PROMPT } from '../agent/persona.js';
import { logger } from '../utils/logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Prepare for upcoming meetings
 */
export async function prepareForMeetings(hoursAhead = 24) {
  logger.info('WORKFLOW', 'Starting meeting prep');

  const now = new Date();
  const { events, error } = await listEvents('primary', 10, now.toISOString());
  if (error) return { error };

  // Filter to meetings within the time window
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const upcomingMeetings = events.filter(e => {
    const start = new Date(e.start);
    return start <= cutoff && e.attendees && e.attendees.length > 0;
  });

  if (upcomingMeetings.length === 0) {
    logger.info('WORKFLOW', 'No upcoming meetings requiring prep');
    return { meetings: 0, preps: [] };
  }

  const preps = [];

  for (const meeting of upcomingMeetings) {
    const prep = await generateMeetingPrep(meeting);
    preps.push(prep);
  }

  WorkLog.create({
    action: `Meeting prep: ${preps.length} meetings prepared`,
    category: 'meeting_prep',
    details: preps.map(p => p.title).join(', '),
    links: preps.filter(p => p.docLink).map(p => p.docLink),
  });

  logger.info('WORKFLOW', `Meeting prep complete: ${preps.length} meetings`);
  return { meetings: preps.length, preps };
}

/**
 * Generate prep for a single meeting
 */
async function generateMeetingPrep(meeting) {
  const analysis = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `${MALIK_SYSTEM_PROMPT}

You are preparing A'Y for an upcoming meeting. Create a focused prep brief:

1. **Meeting Context** — What this is about, who's attending, what they likely want
2. **Agenda** — Proposed talking points (numbered)
3. **Pre-Read Checklist** — What A'Y should review before the meeting
4. **Key Decisions Needed** — What needs to be decided in this meeting
5. **Potential Risks/Landmines** — Things to watch out for
6. **Recommended Outcomes** — What A'Y should aim to walk away with

Be direct. No fluff. Think about what makes A'Y look prepared and sharp.`,
    messages: [{
      role: 'user',
      content: `Prepare for this meeting:
Title: ${meeting.summary}
Time: ${meeting.start}
Attendees: ${meeting.attendees?.join(', ') || 'Unknown'}
Description: ${meeting.description || 'None provided'}
Location: ${meeting.location || 'Not specified'}`,
    }],
  });

  const content = analysis.content[0].text;

  // Create prep doc
  const doc = await createDocument(`Meeting Prep — ${meeting.summary}`);
  if (doc.documentId) {
    await writeToDocument(doc.documentId, content);
  }

  const deliverable = Deliverables.create({
    title: `Meeting Prep: ${meeting.summary}`,
    type: 'doc',
    link: doc.link || null,
    description: `Prep brief for meeting at ${meeting.start}`,
  });

  return {
    title: meeting.summary,
    time: meeting.start,
    docLink: doc.link,
    deliverable,
    content,
  };
}

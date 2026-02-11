// ─── Malik Zaid — Core Agent Engine ──────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { MALIK_PERSONA, MALIK_SYSTEM_PROMPT } from './persona.js';
import { checkAuthority, queueForApproval } from './authority.js';
import { preActionCheck } from './escalation.js';
import { initializeMemory, getContextForPrompt, addToHistory, getConversationContext } from './memory.js';
import { WorkLog, TaskRegister, DecisionsLog, Deliverables, ApprovalQueue, RiskFlags } from '../db/models.js';
import { initDb } from '../db/database.js';
import { logger } from '../utils/logger.js';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

export class MalikAgent {
  constructor() {
    this.name = MALIK_PERSONA.name;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await initDb();
    await initializeMemory();
    this.initialized = true;
    logger.info('MALIK', 'Agent initialized and ready');
  }

  async processMessage(userMessage) {
    await this.initialize();
    await addToHistory('user', userMessage);

    const escalation = await preActionCheck(userMessage);
    if (escalation.escalated) {
      await addToHistory('assistant', escalation.message, { escalated: true });
      return { response: escalation.message, escalated: true, flag: escalation.flag };
    }

    const [memoryContext, conversationHistory] = await Promise.all([
      getContextForPrompt(), getConversationContext(15),
    ]);

    const messages = [];
    for (const msg of conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    const fullSystemPrompt = `${MALIK_SYSTEM_PROMPT}

## CURRENT CONTEXT (from memory)
${memoryContext}

## TOOLS AVAILABLE
- create_draft: Create any draft (email, doc, deck, proposal)
- conduct_research: Research a topic with sourced findings
- build_system: Create internal templates, trackers, SOPs
- manage_calendar: Propose calendar blocks, schedule meetings
- manage_tasks: Create/update tasks on approved boards
- triage_inbox: Read, categorize, and draft responses to emails
- log_decision: Record a decision with rationale
- flag_risk: Flag something as a risk requiring escalation

## CONNECTED PLATFORMS (read-only)
Gmail, Google Calendar, Google Drive, Slack, Asana, Notion, Meta, Telegram, Discord, Canva

## RESPONSE FORMAT
If proposing work: 1. What you'll do 2. Why 3. What you need from A'Y
If delivering work: 1. The deliverable 2. Key decisions 3. What needs approval

## REMINDERS
- Dubai, UTC+4. Never fabricate. Challenge when needed. Log everything.`;

    try {
      const completion = await anthropic.messages.create({
        model: MODEL, max_tokens: 4096, system: fullSystemPrompt, messages,
      });
      const response = completion.content[0].text;
      await addToHistory('assistant', response);
      await WorkLog.create({
        action: 'Processed message and responded', category: 'system',
        details: `User: "${userMessage.substring(0, 100)}..." \u2192 Response generated`, links: [],
      });
      return { response, escalated: false };
    } catch (error) {
      logger.error('MALIK', 'Failed to process message', { error: error.message });
      throw error;
    }
  }

  async executeTask(taskType, params) {
    await this.initialize();
    const auth = checkAuthority(taskType);
    if (auth.requiresApproval) {
      const approval = await queueForApproval({
        type: taskType, title: params.title || `${taskType} action`,
        description: params.description || '', payload: params, priority: params.priority || 'normal',
      });
      return { executed: false, queued: true, approvalId: approval.id, message: `Requires A'Y approval. Queued as: ${approval.title}` };
    }
    switch (taskType) {
      case 'create_draft': return this._createDraft(params);
      case 'conduct_research': return this._conductResearch(params);
      case 'build_system': return this._buildSystem(params);
      case 'log_decision': return this._logDecision(params);
      case 'flag_risk': return this._flagRisk(params);
      default: return { executed: false, message: `Unknown task type: ${taskType}` };
    }
  }

  async _createDraft(p) {
    const d = await Deliverables.create({ title: p.title, type: p.type || 'doc', link: null, description: p.description || p.content?.substring(0, 200) });
    await WorkLog.create({ action: `Created draft: ${p.title}`, category: 'draft', details: p.description, links: [] });
    return { executed: true, deliverable: d };
  }

  async _conductResearch(p) {
    const c = await anthropic.messages.create({
      model: MODEL, max_tokens: 4096, system: MALIK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Research: ${p.topic}\nDepth: ${p.depth || 'standard'}\n\nFormat: ## Summary\n## Key Findings\n## Sources\n## Uncertainties\n## Recommendation` }],
    });
    const findings = c.content[0].text;
    const d = await Deliverables.create({ title: `Research: ${p.topic}`, type: 'research', link: null, description: findings.substring(0, 500) });
    await WorkLog.create({ action: `Completed research: ${p.topic}`, category: 'research', details: findings.substring(0, 300), links: [] });
    return { executed: true, deliverable: d, findings };
  }

  async _buildSystem(p) {
    const d = await Deliverables.create({ title: p.title, type: 'other', link: null, description: p.description });
    await WorkLog.create({ action: `Built system: ${p.title}`, category: 'system', details: p.description, links: [] });
    return { executed: true, deliverable: d };
  }

  async _logDecision(p) {
    const log = await DecisionsLog.create({ decision: p.decision, rationale: p.rationale, optionsConsidered: p.options || [], category: p.category });
    await WorkLog.create({ action: `Decision logged: ${p.decision}`, category: 'system', details: p.rationale, links: [] });
    return { executed: true, decision: log };
  }

  async _flagRisk(p) {
    const flag = await RiskFlags.create({ type: p.type, title: p.title, description: p.description, severity: p.severity || 'medium', source: 'manual' });
    await WorkLog.create({ action: `Risk flagged: ${p.title}`, category: 'system', details: `${p.type} risk: ${p.description}`, links: [] });
    return { executed: true, flag };
  }

  async getStatus() {
    const [pa, at, or, rw] = await Promise.all([
      ApprovalQueue.getPending(), TaskRegister.getActive(), RiskFlags.getOpen(), WorkLog.getRecent(5),
    ]);
    return {
      agent: this.name, initialized: this.initialized,
      pendingApprovals: pa.length, activeTasks: at.length,
      openRisks: or.length, recentActions: rw.map(w => w.action),
    };
  }
}

export const malik = new MalikAgent();

// ─── Malik Zaid — Core Agent Engine ──────────────────────────
// The brain. Handles reasoning, task execution, and coordination.

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { MALIK_PERSONA, MALIK_SYSTEM_PROMPT } from './persona.js';
import { checkAuthority, queueForApproval, scanForEscalation } from './authority.js';
import { preActionCheck } from './escalation.js';
import { initializeMemory, getContextForPrompt, addToHistory, getConversationContext } from './memory.js';
import { WorkLog, TaskRegister, DecisionsLog, Deliverables } from '../db/models.js';
import { logger } from '../utils/logger.js';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Malik Agent — main class
 */
export class MalikAgent {
  constructor() {
    this.name = MALIK_PERSONA.name;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    initializeMemory();
    this.initialized = true;
    logger.info('MALIK', 'Agent initialized and ready');
  }

  /**
   * Process a message from A'Y and generate a response
   */
  async processMessage(userMessage) {
    await this.initialize();

    // Log incoming message
    addToHistory('user', userMessage);

    // Scan for escalation triggers
    const escalation = preActionCheck(userMessage);
    if (escalation.escalated) {
      const response = escalation.message;
      addToHistory('assistant', response, { escalated: true });
      return { response, escalated: true, flag: escalation.flag };
    }

    // Build context
    const memoryContext = getContextForPrompt();
    const conversationHistory = getConversationContext(15);

    // Build messages for Claude
    const messages = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Ensure the last message is the current user message
    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // Build system prompt with live context
    const fullSystemPrompt = `${MALIK_SYSTEM_PROMPT}

## CURRENT CONTEXT (from memory)
${memoryContext}

## TOOLS AVAILABLE
You have access to these capabilities through function calls:
- create_draft: Create any draft (email, doc, deck, proposal)
- conduct_research: Research a topic with sourced findings
- build_system: Create internal templates, trackers, SOPs
- manage_calendar: Propose calendar blocks, schedule meetings
- manage_tasks: Create/update Asana tasks on approved boards
- triage_inbox: Read, categorize, and draft responses to emails
- log_decision: Record a decision with rationale
- flag_risk: Flag something as a risk requiring escalation
- request_approval: Queue something for A'Y's approval

## RESPONSE FORMAT
Always structure your responses clearly. If you're proposing work:
1. What you'll do
2. Why this approach
3. What you need from A'Y (if anything)

If you're delivering work:
1. The deliverable
2. Key decisions made and why
3. What needs approval before going live

## IMPORTANT REMINDERS
- Current date/time context: Dubai, UTC+4
- Never fabricate sources or data
- Challenge directions you disagree with — provide reasoning + options + recommendation
- Log everything you do`;

    try {
      const completion = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: fullSystemPrompt,
        messages,
      });

      const response = completion.content[0].text;

      // Log the response
      addToHistory('assistant', response);

      // Log work
      WorkLog.create({
        action: `Processed message and responded`,
        category: 'system',
        details: `User: "${userMessage.substring(0, 100)}..." → Response generated`,
        links: [],
      });

      return { response, escalated: false };
    } catch (error) {
      logger.error('MALIK', 'Failed to process message', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a specific task type
   */
  async executeTask(taskType, params) {
    await this.initialize();

    // Check authority
    const auth = checkAuthority(taskType);
    if (auth.requiresApproval) {
      const approval = queueForApproval({
        type: taskType,
        title: params.title || `${taskType} action`,
        description: params.description || '',
        payload: params,
        priority: params.priority || 'normal',
      });
      return {
        executed: false,
        queued: true,
        approvalId: approval.id,
        message: `This action requires A'Y approval. Queued as: ${approval.title}`,
      };
    }

    // Execute autonomous actions
    switch (taskType) {
      case 'create_draft':
        return this._createDraft(params);
      case 'conduct_research':
        return this._conductResearch(params);
      case 'build_system':
        return this._buildSystem(params);
      case 'log_decision':
        return this._logDecision(params);
      case 'flag_risk':
        return this._flagRisk(params);
      default:
        return { executed: false, message: `Unknown task type: ${taskType}` };
    }
  }

  async _createDraft(params) {
    const { title, type, content, description } = params;

    const deliverable = Deliverables.create({
      title,
      type: type || 'doc',
      link: null,
      description: description || content?.substring(0, 200),
    });

    WorkLog.create({
      action: `Created draft: ${title}`,
      category: 'draft',
      details: description || `Draft of type "${type}" created`,
      links: [],
    });

    logger.info('MALIK', `Draft created: ${title}`);
    return { executed: true, deliverable };
  }

  async _conductResearch(params) {
    const { topic, depth = 'standard' } = params;

    // Use Claude to conduct research
    const researchPrompt = `Research the following topic thoroughly. Include real sources where possible. Flag when you're uncertain. Be comprehensive but structured.

Topic: ${topic}
Depth: ${depth}

Format your response as:
## Summary
## Key Findings
## Sources & References
## Contradictions or Uncertainties
## Recommendation`;

    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: MALIK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: researchPrompt }],
    });

    const findings = completion.content[0].text;

    const deliverable = Deliverables.create({
      title: `Research: ${topic}`,
      type: 'research',
      link: null,
      description: findings.substring(0, 500),
    });

    WorkLog.create({
      action: `Completed research: ${topic}`,
      category: 'research',
      details: findings.substring(0, 300),
      links: [],
    });

    const task = TaskRegister.create({
      title: `Review research: ${topic}`,
      description: 'Research complete, ready for review',
      category: 'research',
      priority: params.priority || 'normal',
    });
    TaskRegister.updateStatus(task.id, 'done');

    logger.info('MALIK', `Research completed: ${topic}`);
    return { executed: true, deliverable, findings };
  }

  async _buildSystem(params) {
    const { title, description, type } = params;

    const deliverable = Deliverables.create({
      title,
      type: 'other',
      link: null,
      description,
    });

    WorkLog.create({
      action: `Built system: ${title}`,
      category: 'system',
      details: description,
      links: [],
    });

    logger.info('MALIK', `System built: ${title}`);
    return { executed: true, deliverable };
  }

  async _logDecision(params) {
    const { decision, rationale, options, category } = params;

    const log = DecisionsLog.create({
      decision,
      rationale,
      optionsConsidered: options || [],
      category,
    });

    WorkLog.create({
      action: `Decision logged: ${decision}`,
      category: 'system',
      details: rationale,
      links: [],
    });

    logger.info('MALIK', `Decision logged: ${decision}`);
    return { executed: true, decision: log };
  }

  async _flagRisk(params) {
    const { type, title, description, severity } = params;

    const flag = RiskFlags.create({
      type,
      title,
      description,
      severity: severity || 'medium',
      source: 'manual',
    });

    WorkLog.create({
      action: `Risk flagged: ${title}`,
      category: 'system',
      details: `${type} risk (${severity}): ${description}`,
      links: [],
    });

    logger.warn('MALIK', `Risk flagged: ${title}`);
    return { executed: true, flag };
  }

  /**
   * Get agent status summary
   */
  getStatus() {
    const pendingApprovals = ApprovalQueue.getPending();
    const activeTasks = TaskRegister.getActive();
    const openRisks = RiskFlags.getOpen();
    const recentWork = WorkLog.getRecent(5);

    return {
      agent: this.name,
      initialized: this.initialized,
      pendingApprovals: pendingApprovals.length,
      activeTasks: activeTasks.length,
      openRisks: openRisks.length,
      recentActions: recentWork.map(w => w.action),
    };
  }
}

// Import ApprovalQueue and RiskFlags for getStatus
import { ApprovalQueue, RiskFlags } from '../db/models.js';

// Export singleton
export const malik = new MalikAgent();

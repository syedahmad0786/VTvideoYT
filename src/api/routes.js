// ─── API Routes ──────────────────────────────────────────
// Express routes for the Malik Portal and agent interaction.

import { Router } from 'express';
import { malik } from '../agent/malik.js';
import { processApproval } from '../agent/authority.js';
import { updateMemory, getMemorySummary } from '../agent/memory.js';
import {
  ApprovalQueue, WorkLog, Deliverables,
  DecisionsLog, TaskRegister, RiskFlags
} from '../db/models.js';

// Workflow imports
import { runInboxTriage } from '../workflows/inbox-triage.js';
import { optimizeWeek } from '../workflows/calendar-optimizer.js';
import { generateProposal } from '../workflows/commercial-proposals.js';
import { prepareForMeetings } from '../workflows/meeting-prep.js';
import { conductResearch, quickResearch } from '../workflows/deep-research.js';
import { scoutTalent } from '../workflows/talent-scouting.js';
import { buildSystem, proposeNewSystems } from '../workflows/systems-building.js';
import { buildAutomationSpec, buildPrompt } from '../workflows/gpt-automation.js';

// Google integrations
import { getAuthUrl, handleCallback, isAuthenticated } from '../integrations/google/auth.js';
import { initializeFolderStructure } from '../integrations/google/drive.js';

const router = Router();

// ─── Health ──────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    agent: 'Malik Zaid',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Agent Chat ──────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const result = await malik.processMessage(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    await malik.initialize();
    const status = malik.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Approval Queue ──────────────────────────────────────────

router.get('/approvals', (req, res) => {
  const pending = req.query.status === 'all'
    ? ApprovalQueue.getAll(parseInt(req.query.limit) || 50)
    : ApprovalQueue.getPending();
  res.json({ approvals: pending });
});

router.post('/approvals/:id/resolve', (req, res) => {
  try {
    const { decision, note } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "rejected"' });
    }
    const result = processApproval(req.params.id, decision, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Work Log ──────────────────────────────────────────────

router.get('/worklog', (req, res) => {
  const { date, limit } = req.query;
  const logs = date
    ? WorkLog.getByDate(date)
    : WorkLog.getRecent(parseInt(limit) || 50);
  res.json({ logs });
});

// ─── Deliverables ──────────────────────────────────────────

router.get('/deliverables', (req, res) => {
  const deliverables = Deliverables.getAll(parseInt(req.query.limit) || 50);
  res.json({ deliverables });
});

router.patch('/deliverables/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const result = Deliverables.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Decisions Log ──────────────────────────────────────────

router.get('/decisions', (req, res) => {
  const decisions = DecisionsLog.getAll(parseInt(req.query.limit) || 50);
  res.json({ decisions });
});

router.patch('/decisions/:id/resolve', (req, res) => {
  try {
    const { status } = req.body;
    const result = DecisionsLog.resolve(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Task Register ──────────────────────────────────────────

router.get('/tasks', (req, res) => {
  const tasks = req.query.active === 'true'
    ? TaskRegister.getActive()
    : TaskRegister.getAll(parseInt(req.query.limit) || 100);
  res.json({ tasks });
});

router.post('/tasks', (req, res) => {
  try {
    const task = TaskRegister.create(req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id', (req, res) => {
  try {
    const result = TaskRegister.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const result = TaskRegister.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Risk Flags ──────────────────────────────────────────────

router.get('/risks', (req, res) => {
  const risks = req.query.status === 'all'
    ? RiskFlags.getAll(parseInt(req.query.limit) || 50)
    : RiskFlags.getOpen();
  res.json({ risks });
});

router.patch('/risks/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const result = RiskFlags.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Memory ──────────────────────────────────────────────────

router.get('/memory', (req, res) => {
  const summary = getMemorySummary();
  res.json({ memory: summary });
});

router.post('/memory', (req, res) => {
  try {
    const { key, value, category } = req.body;
    const result = updateMemory(key, value, category);
    res.json(result || { error: 'Cannot store sensitive data' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Workflows ──────────────────────────────────────────────

router.post('/workflows/inbox-triage', async (req, res) => {
  try {
    const result = await runInboxTriage(parseInt(req.body.maxEmails) || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/calendar-optimize', async (req, res) => {
  try {
    const result = await optimizeWeek();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/proposal', async (req, res) => {
  try {
    const result = await generateProposal(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/meeting-prep', async (req, res) => {
  try {
    const result = await prepareForMeetings(parseInt(req.body.hoursAhead) || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/research', async (req, res) => {
  try {
    const result = await conductResearch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/quick-research', async (req, res) => {
  try {
    const { question } = req.body;
    const result = await quickResearch(question);
    res.json({ answer: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/talent-scout', async (req, res) => {
  try {
    const result = await scoutTalent(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/build-system', async (req, res) => {
  try {
    const result = await buildSystem(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/propose-systems', async (req, res) => {
  try {
    const result = await proposeNewSystems();
    res.json({ proposals: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/automation-spec', async (req, res) => {
  try {
    const result = await buildAutomationSpec(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/build-prompt', async (req, res) => {
  try {
    const result = await buildPrompt(req.body);
    res.json({ prompt: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Google Auth ──────────────────────────────────────────────

router.get('/auth/google', (req, res) => {
  const url = getAuthUrl();
  if (!url) return res.status(500).json({ error: 'Google OAuth not configured' });
  res.json({ authUrl: url });
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await handleCallback(code);
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

// ─── Drive Setup ──────────────────────────────────────────────

router.post('/setup/drive', async (req, res) => {
  try {
    const result = await initializeFolderStructure();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

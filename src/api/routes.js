// ─── API Routes ──────────────────────────────────────────
// Express routes — all async for Turso/libSQL.
// Includes OAuth flows for Google, Slack, Notion, Asana, Meta, Discord, Telegram, Canva.

import { Router } from 'express';
import { malik } from '../agent/malik.js';
import { processApproval } from '../agent/authority.js';
import { updateMemory, getMemorySummary } from '../agent/memory.js';
import {
  ApprovalQueue, WorkLog, Deliverables,
  DecisionsLog, TaskRegister, RiskFlags, IntegrationTokens
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
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Diagnostics ──────────────────────────────────────────────

router.get('/diag', async (req, res) => {
  const diag = {
    env: {
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      apiKeyLen: (process.env.ANTHROPIC_API_KEY || '').trim().length,
      model: (process.env.AI_MODEL || 'default').trim(),
      nodeEnv: process.env.NODE_ENV,
      hasTurso: !!process.env.TURSO_DATABASE_URL,
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      region: process.env.VERCEL_REGION || 'unknown',
    },
    connectivity: {},
  };

  // Test Anthropic API connectivity
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': (process.env.ANTHROPIC_API_KEY || '').trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: diag.env.model, max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await resp.text();
    diag.connectivity.anthropic = { status: resp.status, ok: resp.ok, body: body.substring(0, 200) };
  } catch (e) {
    diag.connectivity.anthropic = { error: e.message, type: e.constructor?.name };
  }

  res.json(diag);
});

// ─── Agent Chat ──────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const result = await malik.processMessage(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      type: error.constructor?.name,
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      model: process.env.AI_MODEL || 'default',
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    await malik.initialize();
    const status = await malik.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Approval Queue ──────────────────────────────────────────

router.get('/approvals', async (req, res) => {
  try {
    const pending = req.query.status === 'all'
      ? await ApprovalQueue.getAll(parseInt(req.query.limit) || 50)
      : await ApprovalQueue.getPending();
    res.json({ approvals: pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/approvals/:id/resolve', async (req, res) => {
  try {
    const { decision, note } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "rejected"' });
    }
    const result = await processApproval(req.params.id, decision, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Work Log ──────────────────────────────────────────────

router.get('/worklog', async (req, res) => {
  try {
    const { date, limit } = req.query;
    const logs = date
      ? await WorkLog.getByDate(date)
      : await WorkLog.getRecent(parseInt(limit) || 50);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Deliverables ──────────────────────────────────────────

router.get('/deliverables', async (req, res) => {
  try {
    const deliverables = await Deliverables.getAll(parseInt(req.query.limit) || 50);
    res.json({ deliverables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/deliverables/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await Deliverables.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Decisions Log ──────────────────────────────────────────

router.get('/decisions', async (req, res) => {
  try {
    const decisions = await DecisionsLog.getAll(parseInt(req.query.limit) || 50);
    res.json({ decisions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/decisions/:id/resolve', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await DecisionsLog.resolve(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Task Register ──────────────────────────────────────────

router.get('/tasks', async (req, res) => {
  try {
    const tasks = req.query.active === 'true'
      ? await TaskRegister.getActive()
      : await TaskRegister.getAll(parseInt(req.query.limit) || 100);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const task = await TaskRegister.create(req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const result = await TaskRegister.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await TaskRegister.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Risk Flags ──────────────────────────────────────────────

router.get('/risks', async (req, res) => {
  try {
    const risks = req.query.status === 'all'
      ? await RiskFlags.getAll(parseInt(req.query.limit) || 50)
      : await RiskFlags.getOpen();
    res.json({ risks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/risks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await RiskFlags.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Memory ──────────────────────────────────────────────────

router.get('/memory', async (req, res) => {
  try {
    const summary = await getMemorySummary();
    res.json({ memory: summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/memory', async (req, res) => {
  try {
    const { key, value, category } = req.body;
    const result = await updateMemory(key, value, category);
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

router.get('/auth/status', async (req, res) => {
  try {
    const google = isAuthenticated();
    const integrations = await IntegrationTokens.getAll();
    const platforms = {};
    for (const integ of integrations) {
      platforms[integ.platform] = { connected: true, connectedAt: integ.updated_at };
    }
    if (google) platforms.google = { connected: true };
    res.json({ authenticated: google, platforms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// ═══════════════════════════════════════════════════════════════
// ─── Platform OAuth Flows ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

// ─── Integrations List ────────────────────────────────────────

router.get('/integrations', async (req, res) => {
  try {
    const integrations = await IntegrationTokens.getAll();
    const platforms = {};
    for (const integ of integrations) {
      platforms[integ.platform] = {
        connected: true,
        connectedAt: integ.updated_at,
        scopes: integ.scopes || '',
      };
    }
    if (isAuthenticated()) {
      platforms.google = { connected: true, scopes: 'gmail,calendar,drive,docs,sheets,tasks,chat' };
    }
    res.json({ integrations: platforms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Disconnect Integration ───────────────────────────────────

router.delete('/auth/:platform', async (req, res) => {
  try {
    await IntegrationTokens.delete(req.params.platform);
    res.json({ disconnected: true, platform: req.params.platform });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Slack OAuth ──────────────────────────────────────────────

router.get('/auth/slack', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Slack OAuth not configured' });
  const scopes = 'channels:read,channels:history,users:read,team:read,chat:write';
  const redirectUri = `${BASE_URL}/api/auth/slack/callback`;
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ authUrl: url });
});

router.get('/auth/slack/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const resp = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${BASE_URL}/api/auth/slack/callback`,
      }),
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Slack OAuth failed');
    await IntegrationTokens.set('slack', {
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
      scopes: data.scope,
    });
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Notion OAuth ─────────────────────────────────────────────

router.get('/auth/notion', (req, res) => {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Notion OAuth not configured' });
  const redirectUri = `${BASE_URL}/api/auth/notion/callback`;
  const url = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ authUrl: url });
});

router.get('/auth/notion/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const encoded = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
    const resp = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${encoded}` },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${BASE_URL}/api/auth/notion/callback`,
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    await IntegrationTokens.set('notion', {
      access_token: data.access_token,
      workspace_id: data.workspace_id,
      workspace_name: data.workspace_name,
      scopes: 'read',
    });
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Asana OAuth ──────────────────────────────────────────────

router.get('/auth/asana', (req, res) => {
  const clientId = process.env.ASANA_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Asana OAuth not configured' });
  const redirectUri = `${BASE_URL}/api/auth/asana/callback`;
  const url = `https://app.asana.com/-/oauth_authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  res.json({ authUrl: url });
});

router.get('/auth/asana/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const resp = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/auth/asana/callback`,
        code,
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    await IntegrationTokens.set('asana', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scopes: 'default',
    });
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Meta (Facebook/Instagram) OAuth ──────────────────────────

router.get('/auth/meta', (req, res) => {
  const appId = process.env.META_APP_ID;
  if (!appId) return res.status(500).json({ error: 'Meta OAuth not configured' });
  const redirectUri = `${BASE_URL}/api/auth/meta/callback`;
  const scopes = 'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights';
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
  res.json({ authUrl: url });
});

router.get('/auth/meta/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const redirectUri = `${BASE_URL}/api/auth/meta/callback`;
    const resp = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    // Exchange for long-lived token
    const llResp = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${data.access_token}`);
    const llData = await llResp.json();
    await IntegrationTokens.set('meta', {
      access_token: llData.access_token || data.access_token,
      token_type: llData.token_type,
      expires_in: llData.expires_in,
      scopes: 'pages_read,instagram_basic,insights',
    });
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Discord OAuth ────────────────────────────────────────────

router.get('/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Discord OAuth not configured' });
  const redirectUri = `${BASE_URL}/api/auth/discord/callback`;
  const scopes = 'identify guilds guilds.members.read';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  res.json({ authUrl: url });
});

router.get('/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const resp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${BASE_URL}/api/auth/discord/callback`,
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    await IntegrationTokens.set('discord', {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scopes: data.scope,
    });
    res.redirect(process.env.PORTAL_URL || 'http://localhost:5173');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Telegram Bot Token ───────────────────────────────────────

router.post('/auth/telegram', async (req, res) => {
  try {
    const { botToken } = req.body;
    if (!botToken) return res.status(400).json({ error: 'Bot token is required' });
    // Verify token works
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await resp.json();
    if (!data.ok) throw new Error('Invalid bot token');
    await IntegrationTokens.set('telegram', {
      access_token: botToken,
      bot_username: data.result.username,
      bot_name: data.result.first_name,
      scopes: 'bot',
    });
    res.json({ connected: true, bot: data.result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Canva API Key ────────────────────────────────────────────

router.post('/auth/canva', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key is required' });
    await IntegrationTokens.set('canva', {
      access_token: apiKey,
      scopes: 'design:read',
    });
    res.json({ connected: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── Integration Data Endpoints (Read-Only) ───────────────────
// ═══════════════════════════════════════════════════════════════

// ─── Slack Data ───────────────────────────────────────────────

router.get('/integrations/slack/channels', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('slack');
    if (!tokens) return res.status(401).json({ error: 'Slack not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const data = await resp.json();
    res.json({ channels: data.channels || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/integrations/slack/messages/:channel', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('slack');
    if (!tokens) return res.status(401).json({ error: 'Slack not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch(`https://slack.com/api/conversations.history?channel=${req.params.channel}&limit=${req.query.limit || 20}`, {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const data = await resp.json();
    res.json({ messages: data.messages || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Notion Data ──────────────────────────────────────────────

router.get('/integrations/notion/pages', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('notion');
    if (!tokens) return res.status(401).json({ error: 'Notion not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter: { property: 'object', value: 'page' }, page_size: 50 }),
    });
    const data = await resp.json();
    res.json({ pages: data.results || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/integrations/notion/databases', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('notion');
    if (!tokens) return res.status(401).json({ error: 'Notion not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter: { property: 'object', value: 'database' }, page_size: 50 }),
    });
    const data = await resp.json();
    res.json({ databases: data.results || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Asana Data ───────────────────────────────────────────────

router.get('/integrations/asana/workspaces', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('asana');
    if (!tokens) return res.status(401).json({ error: 'Asana not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const data = await resp.json();
    res.json({ workspaces: data.data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/integrations/asana/tasks', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('asana');
    if (!tokens) return res.status(401).json({ error: 'Asana not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://app.asana.com/api/1.0/tasks?opt_fields=name,completed,due_on,assignee.name&assignee=me&workspace=' + (req.query.workspace || ''), {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const data = await resp.json();
    res.json({ tasks: data.data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Telegram Data ────────────────────────────────────────────

router.get('/integrations/telegram/updates', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('telegram');
    if (!tokens) return res.status(401).json({ error: 'Telegram not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch(`https://api.telegram.org/bot${t.access_token}/getUpdates?limit=${req.query.limit || 20}`);
    const data = await resp.json();
    res.json({ updates: data.result || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Discord Data ─────────────────────────────────────────────

router.get('/integrations/discord/guilds', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('discord');
    if (!tokens) return res.status(401).json({ error: 'Discord not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${t.access_token}` },
    });
    const data = await resp.json();
    res.json({ guilds: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Meta Data ────────────────────────────────────────────────

router.get('/integrations/meta/pages', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('meta');
    if (!tokens) return res.status(401).json({ error: 'Meta not connected' });
    const t = JSON.parse(tokens.token_data);
    const resp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${t.access_token}`);
    const data = await resp.json();
    res.json({ pages: data.data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/integrations/meta/instagram', async (req, res) => {
  try {
    const tokens = await IntegrationTokens.get('meta');
    if (!tokens) return res.status(401).json({ error: 'Meta not connected' });
    const t = JSON.parse(tokens.token_data);
    // Get pages first, then IG accounts linked to them
    const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${t.access_token}`);
    const pagesData = await pagesResp.json();
    const igAccounts = [];
    for (const page of (pagesData.data || [])) {
      const igResp = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
      const igData = await igResp.json();
      if (igData.instagram_business_account) {
        igAccounts.push({ pageId: page.id, pageName: page.name, igId: igData.instagram_business_account.id });
      }
    }
    res.json({ instagram_accounts: igAccounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

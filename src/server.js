// ─── Malik Zaid — Server Entry Point ──────────────────────────
// Express server + scheduled workflows.

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './api/routes.js';
import { malik } from './agent/malik.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100;

const app = express();

// ─── Middleware ──────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.PORTAL_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── API Routes ──────────────────────────────────────────────

app.use('/api', routes);

// ─── Serve Portal (production) ──────────────────────────────

const portalDist = path.join(__dirname, '..', 'portal', 'dist');
app.use(express.static(portalDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(portalDist, 'index.html'));
  }
});

// ─── Scheduled Workflows (always-on) ────────────────────────

// Inbox triage — every 30 minutes during business hours (Dubai)
cron.schedule('*/30 8-18 * * 0-4', async () => {
  // Sunday-Thursday (Dubai work week)
  logger.info('CRON', 'Running scheduled inbox triage');
  try {
    const { runInboxTriage } = await import('./workflows/inbox-triage.js');
    await runInboxTriage(10);
  } catch (err) {
    logger.error('CRON', 'Inbox triage failed', { error: err.message });
  }
}, { timezone: 'Asia/Dubai' });

// Meeting prep — daily at 7:30 AM Dubai time
cron.schedule('30 7 * * 0-4', async () => {
  logger.info('CRON', 'Running scheduled meeting prep');
  try {
    const { prepareForMeetings } = await import('./workflows/meeting-prep.js');
    await prepareForMeetings(12);
  } catch (err) {
    logger.error('CRON', 'Meeting prep failed', { error: err.message });
  }
}, { timezone: 'Asia/Dubai' });

// Calendar optimization — every Sunday at 8 PM Dubai time (prep for the week)
cron.schedule('0 20 * * 6', async () => {
  logger.info('CRON', 'Running scheduled calendar optimization');
  try {
    const { optimizeWeek } = await import('./workflows/calendar-optimizer.js');
    await optimizeWeek();
  } catch (err) {
    logger.error('CRON', 'Calendar optimization failed', { error: err.message });
  }
}, { timezone: 'Asia/Dubai' });

// ─── Startup ──────────────────────────────────────────────────

async function start() {
  try {
    await malik.initialize();
    logger.info('SERVER', 'Malik Zaid agent initialized');

    app.listen(PORT, () => {
      logger.info('SERVER', `Malik Zaid is online at http://localhost:${PORT}`);
      logger.info('SERVER', `Portal: ${process.env.PORTAL_URL || 'http://localhost:5173'}`);
      logger.info('SERVER', `API: http://localhost:${PORT}/api`);
      console.log(`
  ╔══════════════════════════════════════════╗
  ║         MALIK ZAID — Online              ║
  ║    Executive A-Player Agent for A'Y      ║
  ║                                          ║
  ║  API:    http://localhost:${PORT}/api      ║
  ║  Portal: ${(process.env.PORTAL_URL || 'http://localhost:5173').padEnd(30)}║
  ║                                          ║
  ║  Status: Ready                           ║
  ╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('SERVER', 'Failed to start', { error: error.message });
    process.exit(1);
  }
}

start();

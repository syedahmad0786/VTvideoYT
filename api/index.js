// ─── Vercel Serverless Entry Point ──────────────────────────
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';
import { malik } from '../src/agent/malik.js';

let initialized = false;
let initError = null;

export default async function handler(req, res) {
  // Fast-path health check (no init needed)
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({
      status: initialized ? 'online' : 'initializing',
      agent: 'Malik Zaid',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      db: process.env.TURSO_DATABASE_URL ? 'turso' : 'local',
      initError: initError?.message || null,
    });
  }

  if (!initialized) {
    try {
      await malik.initialize();
      initialized = true;
      initError = null;
    } catch (err) {
      initError = err;
      console.error('Malik initialization failed:', err);
      return res.status(503).json({
        error: 'Agent initialization failed',
        message: err.message,
        hint: 'Check environment variables (ANTHROPIC_API_KEY, TURSO_DATABASE_URL)',
      });
    }
  }

  return app(req, res);
}

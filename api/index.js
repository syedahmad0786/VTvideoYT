// ─── Vercel Serverless Entry Point ──────────────────────────
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';
import { malik } from '../src/agent/malik.js';

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    await malik.initialize();
    initialized = true;
  }
  return app(req, res);
}

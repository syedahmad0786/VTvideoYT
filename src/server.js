// ─── Malik Zaid — Server Entry Point ──────────────────────────
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { malik } from './agent/malik.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3100;

async function start() {
  try {
    await malik.initialize();
    logger.info('SERVER', 'Malik Zaid agent initialized');

    app.listen(PORT, () => {
      logger.info('SERVER', `Malik Zaid is online at http://localhost:${PORT}`);
      logger.info('SERVER', `API: http://localhost:${PORT}/api`);
      console.log(`
  ╔══════════════════════════════════════════╗
  ║         MALIK ZAID — Online              ║
  ║    Executive A-Player Agent for A'Y      ║
  ║                                          ║
  ║  API:    http://localhost:${PORT}/api      ║
  ║  Portal: http://localhost:${PORT}          ║
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

// ─── Malik Zaid — Setup & Onboarding Script ──────────────────
// Run: npm run setup
// Guides through first-time configuration and Day 1-2 onboarding.

import dotenv from 'dotenv';
dotenv.config();

import { initDb } from './db/database.js';
import { initializeMemory, updateMemory } from './agent/memory.js';
import { WorkLog, TaskRegister, DecisionsLog } from './db/models.js';
import { getAuthUrl, isAuthenticated } from './integrations/google/auth.js';
import { logger } from './utils/logger.js';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function setup() {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║      MALIK ZAID — First-Time Setup               ║
  ║      Executive A-Player Agent for A'Y             ║
  ╚══════════════════════════════════════════════════╝
  `);

  // Step 1: Initialize database
  console.log('\n[1/6] Initializing database...');
  await initDb();
  console.log('  Database initialized (Turso/libSQL)');

  // Step 2: Initialize memory
  console.log('\n[2/6] Initializing core memory...');
  await initializeMemory();
  console.log('  Memory initialized with profile, rules, and constraints');

  // Step 3: Check environment
  console.log('\n[3/6] Checking environment configuration...');
  const checks = {
    'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
    'GOOGLE_CLIENT_ID': !!process.env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': !!process.env.GOOGLE_CLIENT_SECRET,
    'TURSO_DATABASE_URL': !!process.env.TURSO_DATABASE_URL,
    'SLACK_CLIENT_ID': !!process.env.SLACK_CLIENT_ID,
    'NOTION_CLIENT_ID': !!process.env.NOTION_CLIENT_ID,
    'ASANA_CLIENT_ID': !!process.env.ASANA_CLIENT_ID,
    'META_APP_ID': !!process.env.META_APP_ID,
    'DISCORD_CLIENT_ID': !!process.env.DISCORD_CLIENT_ID,
  };

  for (const [key, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? '[OK]' : '[MISSING]'} ${key}`);
  }

  if (!checks['ANTHROPIC_API_KEY']) {
    console.log('\n  WARNING: ANTHROPIC_API_KEY is required for Malik to function.');
    console.log('  Add it to your .env file and re-run setup.');
  }

  // Step 4: Google Auth
  console.log('\n[4/6] Google Authentication...');
  if (isAuthenticated()) {
    console.log('  Already authenticated with Google');
  } else if (checks['GOOGLE_CLIENT_ID']) {
    const authUrl = getAuthUrl();
    console.log('  Visit this URL to authenticate:');
    console.log(`  ${authUrl}`);
    console.log('\n  After authorizing, start the server (npm start) and the callback will complete.');
  } else {
    console.log('  Skipped — Google credentials not configured');
  }

  // Step 5: Create onboarding tasks
  console.log('\n[5/6] Creating onboarding task register...');

  const onboardingTasks = [
    { title: 'Connect Google Suite', description: 'Authenticate Gmail, Calendar, Drive, Docs, Sheets, Tasks via OAuth', category: 'onboarding', priority: 'high' },
    { title: 'Connect Slack workspace', description: 'OAuth flow for Slack channels and messages read access', category: 'onboarding', priority: 'high' },
    { title: 'Connect Notion workspace', description: 'OAuth flow for Notion pages and databases read access', category: 'onboarding', priority: 'high' },
    { title: 'Connect Asana workspace', description: 'OAuth flow for Asana tasks and projects read access', category: 'onboarding', priority: 'high' },
    { title: 'Connect Meta (Facebook/Instagram)', description: 'OAuth flow for Meta pages and Instagram insights', category: 'onboarding', priority: 'normal' },
    { title: 'Connect Discord', description: 'OAuth flow for Discord guilds read access', category: 'onboarding', priority: 'normal' },
    { title: 'Connect Telegram bot', description: 'Add Telegram bot token for message updates', category: 'onboarding', priority: 'normal' },
    { title: 'Configure Canva API', description: 'Add Canva API key for design read access', category: 'onboarding', priority: 'normal' },
    { title: 'Set up approval queue workflow', description: 'Verify the approval queue is functioning and A\'Y can approve/reject', category: 'onboarding', priority: 'high' },
    { title: 'Shadow inbox — produce draft replies only', description: 'Triage emails, create draft responses, queue all for approval', category: 'onboarding', priority: 'normal' },
  ];

  for (const task of onboardingTasks) {
    await TaskRegister.create(task);
  }
  console.log(`  Created ${onboardingTasks.length} onboarding tasks`);

  // Step 6: Log onboarding decision
  console.log('\n[6/6] Logging initial decisions...');

  await DecisionsLog.create({
    decision: 'Use "Controlled Memory" strategy',
    rationale: 'Persistent profile in DB, operational memory limited to active projects, sensitive memory OFF by default.',
    optionsConsidered: [
      'Full persistent memory (risky)',
      'Controlled memory with categories (CHOSEN)',
      'No memory / stateless (too limiting)',
    ],
    category: 'architecture',
  });

  await DecisionsLog.create({
    decision: 'Phase 1: Read-only integrations with all platforms',
    rationale: 'All platform integrations use read-only scopes. External actions require A\'Y approval.',
    optionsConsidered: [
      'Full read-write access (too risky for Phase 1)',
      'Read-only scopes for all platforms (CHOSEN)',
      'No integrations (too limiting)',
    ],
    category: 'communication',
  });

  await WorkLog.create({
    action: 'Onboarding setup completed',
    category: 'system',
    details: `Database initialized, memory configured, ${onboardingTasks.length} onboarding tasks created.`,
    links: [],
  });

  console.log('  Initial decisions logged');

  console.log(`
  ═══════════════════════════════════════════════════
    Setup complete. Malik Zaid is ready.

    Next steps:
    1. Copy .env.example to .env and fill in API keys
    2. Run: npm start (starts the API server)
    3. Visit the deployed URL or http://localhost:3100
    4. Go to Integrations page to connect platforms
    5. Click "Chat" to start talking to Malik
  ═══════════════════════════════════════════════════
  `);

  rl.close();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

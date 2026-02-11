// ─── Malik Zaid — Setup & Onboarding Script ──────────────────
// Run: npm run setup
// Guides through first-time configuration and Day 1-2 onboarding.

import dotenv from 'dotenv';
dotenv.config();

import { getDb, closeDb } from './db/database.js';
import { initializeMemory, updateMemory } from './agent/memory.js';
import { WorkLog, TaskRegister, DecisionsLog } from './db/models.js';
import { getAuthUrl, isAuthenticated } from './integrations/google/auth.js';
import { initializeFolderStructure } from './integrations/google/drive.js';
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
  getDb();
  console.log('  Database created: malik.db');

  // Step 2: Initialize memory
  console.log('\n[2/6] Initializing core memory...');
  initializeMemory();
  console.log('  Memory initialized with profile, rules, and constraints');

  // Step 3: Check environment
  console.log('\n[3/6] Checking environment configuration...');
  const checks = {
    'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
    'GOOGLE_CLIENT_ID': !!process.env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': !!process.env.GOOGLE_CLIENT_SECRET,
    'ASANA_ACCESS_TOKEN': !!process.env.ASANA_ACCESS_TOKEN,
    'ENCRYPTION_KEY': !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 64,
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
    // Day 1-2
    { title: 'Build Drive folder structure', description: 'Create the full Malik workspace folder tree in Google Drive', category: 'onboarding', priority: 'high' },
    { title: 'Set up approval queue workflow', description: 'Verify the approval queue is functioning and A\'Y can approve/reject', category: 'onboarding', priority: 'high' },
    { title: 'Connect and verify all tool integrations', description: 'Gmail, Calendar, Drive, Docs, Sheets, Chat, Tasks, Asana', category: 'onboarding', priority: 'high' },
    { title: 'Confirm read/write boundaries', description: 'Verify Malik can only access approved Asana boards and Drive folders', category: 'onboarding', priority: 'high' },
    // Day 3-5
    { title: 'Shadow inbox — produce draft replies only', description: 'Triage emails, create draft responses, queue all for approval', category: 'onboarding', priority: 'normal' },
    { title: 'Shadow calendar — propose blocks only', description: 'Analyze A\'Y calendar and propose time-block optimizations', category: 'onboarding', priority: 'normal' },
    { title: 'Build Commercial Proposal Pack template', description: 'Create reusable proposal template for HRMNY client work', category: 'onboarding', priority: 'normal' },
    { title: 'Build Research Pack format', description: 'Create standardized research report template with all sections', category: 'onboarding', priority: 'normal' },
    // Day 6-7
    { title: 'Propose 3 systems HRMNY is missing', description: 'Proactive value: identify and spec 3 operational gaps', category: 'onboarding', priority: 'normal' },
    { title: 'Refine tone and challenge behavior', description: 'Calibrate based on A\'Y feedback from Days 1-5', category: 'onboarding', priority: 'normal' },
  ];

  for (const task of onboardingTasks) {
    TaskRegister.create(task);
  }
  console.log(`  Created ${onboardingTasks.length} onboarding tasks`);

  // Step 6: Log onboarding decision
  console.log('\n[6/6] Logging initial decisions...');

  DecisionsLog.create({
    decision: 'Use "Controlled Memory" strategy',
    rationale: 'Persistent profile in DB, operational memory limited to active projects, sensitive memory OFF by default. Safest approach for handling A\'Y context.',
    optionsConsidered: [
      'Full persistent memory (risky — could leak sensitive data)',
      'Controlled memory with categories (CHOSEN)',
      'No memory / stateless (too limiting for executive agent)',
    ],
    category: 'architecture',
  });

  DecisionsLog.create({
    decision: 'Phase 1: No external communications',
    rationale: 'Malik operates in receive + draft mode only. All outbound messages require A\'Y approval. This protects reputation and builds trust before expanding permissions.',
    optionsConsidered: [
      'Allow controlled external comms from day 1 (too risky)',
      'No external comms at all (CHOSEN for Phase 1)',
      'External comms only to pre-approved contacts (for Phase 2)',
    ],
    category: 'communication',
  });

  WorkLog.create({
    action: 'Onboarding setup completed',
    category: 'system',
    details: `Database initialized, memory configured, ${onboardingTasks.length} onboarding tasks created, decisions logged.`,
    links: [],
  });

  console.log('  Initial decisions logged');

  // Done
  console.log(`
  ═══════════════════════════════════════════════════
    Setup complete. Malik Zaid is ready.

    Next steps:
    1. Copy .env.example to .env and fill in API keys
    2. Run: npm start (starts the API server)
    3. Run: cd portal && npm install && npm run dev (starts the portal)
    4. Visit http://localhost:5173 to see the Malik Portal
    5. Click "Talk to Malik" to start interacting

    Onboarding (Day 1-2):
    - Authenticate Google (visit /api/auth/google)
    - Run: POST /api/setup/drive to create folder structure
    - Check the Task Register for onboarding checklist
  ═══════════════════════════════════════════════════
  `);

  closeDb();
  rl.close();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

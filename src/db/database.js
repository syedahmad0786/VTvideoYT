import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'malik.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

function runMigrations(db) {
  db.exec(`
    -- Approval Queue: items waiting for A'Y sign-off
    CREATE TABLE IF NOT EXISTS approval_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,           -- 'email_send', 'file_share', 'financial', 'process_change', 'hr_legal', 'other'
      title TEXT NOT NULL,
      description TEXT,
      payload TEXT,                 -- JSON blob with action details
      status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
      priority TEXT DEFAULT 'normal',          -- 'low', 'normal', 'high', 'urgent'
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolved_by TEXT,
      resolution_note TEXT
    );

    -- Work Log: timeline of everything Malik did
    CREATE TABLE IF NOT EXISTS work_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,         -- what was done
      category TEXT NOT NULL,       -- 'draft', 'research', 'system', 'calendar', 'inbox', 'proposal', 'meeting_prep', 'talent', 'automation'
      details TEXT,                 -- longer description
      links TEXT,                   -- JSON array of related links
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Deliverables: drafts ready for review
    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,           -- 'doc', 'slide', 'sheet', 'canva', 'email_draft', 'proposal', 'research', 'other'
      status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'in_review', 'approved', 'published'
      link TEXT,                    -- Google Drive / Canva link
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Decisions Log: decisions, rationale, status
    CREATE TABLE IF NOT EXISTS decisions_log (
      id TEXT PRIMARY KEY,
      decision TEXT NOT NULL,
      rationale TEXT NOT NULL,
      options_considered TEXT,      -- JSON array
      status TEXT NOT NULL DEFAULT 'proposed',  -- 'proposed', 'accepted', 'rejected', 'deferred'
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    -- Task Register: what Malik has in flight
    CREATE TABLE IF NOT EXISTS task_register (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',  -- 'backlog', 'in_progress', 'blocked', 'done'
      priority TEXT DEFAULT 'normal',
      next_milestone TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- Risk Flags: auto-escalation items
    CREATE TABLE IF NOT EXISTS risk_flags (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,           -- 'legal', 'financial', 'hr', 'reputational', 'security'
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
      status TEXT NOT NULL DEFAULT 'open',      -- 'open', 'acknowledged', 'mitigated', 'closed'
      source TEXT,                  -- where this was detected
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    -- Memory: controlled persistent context
    CREATE TABLE IF NOT EXISTS memory (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT NOT NULL,       -- 'profile', 'preference', 'project', 'priority', 'rule'
      sensitive INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Conversation History: for agent context continuity
    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,           -- 'user', 'assistant', 'system'
      content TEXT NOT NULL,
      metadata TEXT,                -- JSON for extra context
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

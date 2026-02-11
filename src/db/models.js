import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';

// ─── Approval Queue ──────────────────────────────────────────

export const ApprovalQueue = {
  create({ type, title, description, payload, priority = 'normal' }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO approval_queue (id, type, title, description, payload, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, title, description, JSON.stringify(payload), priority);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id);
    if (row && row.payload) row.payload = JSON.parse(row.payload);
    return row;
  },

  getPending() {
    const db = getDb();
    const rows = db.prepare(
      "SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at DESC"
    ).all();
    return rows.map(r => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },

  getAll(limit = 50) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM approval_queue ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    return rows.map(r => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },

  resolve(id, status, resolvedBy = "A'Y", note = '') {
    const db = getDb();
    db.prepare(`
      UPDATE approval_queue
      SET status = ?, resolved_at = datetime('now'), resolved_by = ?, resolution_note = ?
      WHERE id = ?
    `).run(status, resolvedBy, note, id);
    return this.getById(id);
  }
};

// ─── Work Log ──────────────────────────────────────────────

export const WorkLog = {
  create({ action, category, details, links }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO work_log (id, action, category, details, links)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, action, category, details, links ? JSON.stringify(links) : null);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM work_log WHERE id = ?').get(id);
    if (row && row.links) row.links = JSON.parse(row.links);
    return row;
  },

  getRecent(limit = 50) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM work_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    return rows.map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
  },

  getByDate(date) {
    const db = getDb();
    const rows = db.prepare(
      "SELECT * FROM work_log WHERE date(created_at) = date(?) ORDER BY created_at DESC"
    ).all(date);
    return rows.map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
  }
};

// ─── Deliverables ──────────────────────────────────────────

export const Deliverables = {
  create({ title, type, link, description }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO deliverables (id, title, type, link, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, type, link, description);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM deliverables WHERE id = ?').get(id);
  },

  getAll(limit = 50) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM deliverables ORDER BY updated_at DESC LIMIT ?'
    ).all(limit);
  },

  updateStatus(id, status) {
    const db = getDb();
    db.prepare(`
      UPDATE deliverables SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);
    return this.getById(id);
  }
};

// ─── Decisions Log ──────────────────────────────────────────

export const DecisionsLog = {
  create({ decision, rationale, optionsConsidered, category }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO decisions_log (id, decision, rationale, options_considered, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, decision, rationale, optionsConsidered ? JSON.stringify(optionsConsidered) : null, category);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM decisions_log WHERE id = ?').get(id);
    if (row && row.options_considered) row.options_considered = JSON.parse(row.options_considered);
    return row;
  },

  getAll(limit = 50) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM decisions_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    return rows.map(r => ({
      ...r,
      options_considered: r.options_considered ? JSON.parse(r.options_considered) : []
    }));
  },

  resolve(id, status) {
    const db = getDb();
    db.prepare(`
      UPDATE decisions_log SET status = ?, resolved_at = datetime('now') WHERE id = ?
    `).run(status, id);
    return this.getById(id);
  }
};

// ─── Task Register ──────────────────────────────────────────

export const TaskRegister = {
  create({ title, description, category, priority = 'normal', nextMilestone, dueDate }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO task_register (id, title, description, category, priority, next_milestone, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category, priority, nextMilestone, dueDate);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM task_register WHERE id = ?').get(id);
  },

  getActive() {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM task_register WHERE status != 'done' ORDER BY priority DESC, created_at ASC"
    ).all();
  },

  getAll(limit = 100) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM task_register ORDER BY updated_at DESC LIMIT ?'
    ).all(limit);
  },

  updateStatus(id, status) {
    const db = getDb();
    const completedAt = status === 'done' ? "datetime('now')" : null;
    db.prepare(`
      UPDATE task_register
      SET status = ?, updated_at = datetime('now'), completed_at = ${status === 'done' ? "datetime('now')" : 'NULL'}
      WHERE id = ?
    `).run(status, id);
    return this.getById(id);
  },

  update(id, fields) {
    const db = getDb();
    const allowed = ['title', 'description', 'category', 'priority', 'next_milestone', 'due_date', 'status'];
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (updates.length === 0) return this.getById(id);
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE task_register SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }
};

// ─── Risk Flags ──────────────────────────────────────────

export const RiskFlags = {
  create({ type, title, description, severity = 'medium', source }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO risk_flags (id, type, title, description, severity, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, title, description, severity, source);
    return this.getById(id);
  },

  getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM risk_flags WHERE id = ?').get(id);
  },

  getOpen() {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM risk_flags WHERE status IN ('open', 'acknowledged') ORDER BY severity DESC, created_at DESC"
    ).all();
  },

  getAll(limit = 50) {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM risk_flags ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
  },

  updateStatus(id, status) {
    const db = getDb();
    db.prepare(`
      UPDATE risk_flags SET status = ?, resolved_at = ${status === 'closed' || status === 'mitigated' ? "datetime('now')" : 'NULL'} WHERE id = ?
    `).run(status, id);
    return this.getById(id);
  }
};

// ─── Memory ──────────────────────────────────────────

export const Memory = {
  set(key, value, category, sensitive = false) {
    const db = getDb();
    db.prepare(`
      INSERT INTO memory (key, value, category, sensitive, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, sensitive = ?, updated_at = datetime('now')
    `).run(key, value, category, sensitive ? 1 : 0, value, category, sensitive ? 1 : 0);
  },

  get(key) {
    const db = getDb();
    return db.prepare('SELECT * FROM memory WHERE key = ?').get(key);
  },

  getByCategory(category) {
    const db = getDb();
    return db.prepare('SELECT * FROM memory WHERE category = ? AND sensitive = 0').all(category);
  },

  getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM memory WHERE sensitive = 0').all();
  },

  delete(key) {
    const db = getDb();
    db.prepare('DELETE FROM memory WHERE key = ?').run(key);
  }
};

// ─── Conversation History ──────────────────────────────────

export const ConversationHistory = {
  add(role, content, metadata = null) {
    const db = getDb();
    db.prepare(`
      INSERT INTO conversation_history (role, content, metadata)
      VALUES (?, ?, ?)
    `).run(role, content, metadata ? JSON.stringify(metadata) : null);
  },

  getRecent(limit = 20) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM conversation_history ORDER BY id DESC LIMIT ?'
    ).all(limit);
    return rows.reverse().map(r => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    }));
  },

  clear() {
    const db = getDb();
    db.prepare('DELETE FROM conversation_history').run();
  }
};

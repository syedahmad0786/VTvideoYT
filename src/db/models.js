import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';

function row(r) { return r ? { ...r } : null; }
function rows(rs) { return rs.map(r => ({ ...r })); }

// ─── Approval Queue ──────────────────────────────────────────

export const ApprovalQueue = {
  async create({ type, title, description, payload, priority = 'normal' }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO approval_queue (id, type, title, description, payload, priority) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, type, title, description, JSON.stringify(payload), priority],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM approval_queue WHERE id = ?', args: [id] });
    const r = row(result.rows[0]);
    if (r && r.payload) r.payload = JSON.parse(r.payload);
    return r;
  },

  async getPending() {
    const db = getDb();
    const result = await db.execute("SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at DESC");
    return rows(result.rows).map(r => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },

  async getAll(limit = 50) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM approval_queue ORDER BY created_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows).map(r => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : null }));
  },

  async resolve(id, status, resolvedBy = "A'Y", note = '') {
    const db = getDb();
    await db.execute({
      sql: "UPDATE approval_queue SET status = ?, resolved_at = datetime('now'), resolved_by = ?, resolution_note = ? WHERE id = ?",
      args: [status, resolvedBy, note, id],
    });
    return this.getById(id);
  },
};

// ─── Work Log ──────────────────────────────────────────────

export const WorkLog = {
  async create({ action, category, details, links }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO work_log (id, action, category, details, links) VALUES (?, ?, ?, ?, ?)',
      args: [id, action, category, details, links ? JSON.stringify(links) : null],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM work_log WHERE id = ?', args: [id] });
    const r = row(result.rows[0]);
    if (r && r.links) r.links = JSON.parse(r.links);
    return r;
  },

  async getRecent(limit = 50) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM work_log ORDER BY created_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows).map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
  },

  async getByDate(date) {
    const db = getDb();
    const result = await db.execute({ sql: "SELECT * FROM work_log WHERE date(created_at) = date(?) ORDER BY created_at DESC", args: [date] });
    return rows(result.rows).map(r => ({ ...r, links: r.links ? JSON.parse(r.links) : [] }));
  },
};

// ─── Deliverables ──────────────────────────────────────────

export const Deliverables = {
  async create({ title, type, link, description }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO deliverables (id, title, type, link, description) VALUES (?, ?, ?, ?, ?)',
      args: [id, title, type, link, description],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM deliverables WHERE id = ?', args: [id] });
    return row(result.rows[0]);
  },

  async getAll(limit = 50) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM deliverables ORDER BY updated_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows);
  },

  async updateStatus(id, status) {
    const db = getDb();
    await db.execute({
      sql: "UPDATE deliverables SET status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, id],
    });
    return this.getById(id);
  },
};

// ─── Decisions Log ──────────────────────────────────────────

export const DecisionsLog = {
  async create({ decision, rationale, optionsConsidered, category }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO decisions_log (id, decision, rationale, options_considered, category) VALUES (?, ?, ?, ?, ?)',
      args: [id, decision, rationale, optionsConsidered ? JSON.stringify(optionsConsidered) : null, category],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM decisions_log WHERE id = ?', args: [id] });
    const r = row(result.rows[0]);
    if (r && r.options_considered) r.options_considered = JSON.parse(r.options_considered);
    return r;
  },

  async getAll(limit = 50) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM decisions_log ORDER BY created_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows).map(r => ({ ...r, options_considered: r.options_considered ? JSON.parse(r.options_considered) : [] }));
  },

  async resolve(id, status) {
    const db = getDb();
    await db.execute({
      sql: "UPDATE decisions_log SET status = ?, resolved_at = datetime('now') WHERE id = ?",
      args: [status, id],
    });
    return this.getById(id);
  },
};

// ─── Task Register ──────────────────────────────────────────

export const TaskRegister = {
  async create({ title, description, category, priority = 'normal', nextMilestone, dueDate }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO task_register (id, title, description, category, priority, next_milestone, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, title, description, category, priority, nextMilestone || null, dueDate || null],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM task_register WHERE id = ?', args: [id] });
    return row(result.rows[0]);
  },

  async getActive() {
    const db = getDb();
    const result = await db.execute("SELECT * FROM task_register WHERE status != 'done' ORDER BY priority DESC, created_at ASC");
    return rows(result.rows);
  },

  async getAll(limit = 100) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM task_register ORDER BY updated_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows);
  },

  async updateStatus(id, status) {
    const db = getDb();
    const sql = status === 'done'
      ? "UPDATE task_register SET status = ?, updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?"
      : "UPDATE task_register SET status = ?, updated_at = datetime('now'), completed_at = NULL WHERE id = ?";
    await db.execute({ sql, args: [status, id] });
    return this.getById(id);
  },

  async update(id, fields) {
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
    await db.execute({ sql: `UPDATE task_register SET ${updates.join(', ')} WHERE id = ?`, args: values });
    return this.getById(id);
  },
};

// ─── Risk Flags ──────────────────────────────────────────

export const RiskFlags = {
  async create({ type, title, description, severity = 'medium', source }) {
    const db = getDb();
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO risk_flags (id, type, title, description, severity, source) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, type, title, description, severity, source],
    });
    return this.getById(id);
  },

  async getById(id) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM risk_flags WHERE id = ?', args: [id] });
    return row(result.rows[0]);
  },

  async getOpen() {
    const db = getDb();
    const result = await db.execute("SELECT * FROM risk_flags WHERE status IN ('open', 'acknowledged') ORDER BY severity DESC, created_at DESC");
    return rows(result.rows);
  },

  async getAll(limit = 50) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM risk_flags ORDER BY created_at DESC LIMIT ?', args: [limit] });
    return rows(result.rows);
  },

  async updateStatus(id, status) {
    const db = getDb();
    const sql = (status === 'closed' || status === 'mitigated')
      ? "UPDATE risk_flags SET status = ?, resolved_at = datetime('now') WHERE id = ?"
      : "UPDATE risk_flags SET status = ?, resolved_at = NULL WHERE id = ?";
    await db.execute({ sql, args: [status, id] });
    return this.getById(id);
  },
};

// ─── Memory ──────────────────────────────────────────

export const Memory = {
  async set(key, value, category, sensitive = false) {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO memory (key, value, category, sensitive, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, sensitive = ?, updated_at = datetime('now')`,
      args: [key, value, category, sensitive ? 1 : 0, value, category, sensitive ? 1 : 0],
    });
  },

  async get(key) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM memory WHERE key = ?', args: [key] });
    return row(result.rows[0]);
  },

  async getByCategory(category) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM memory WHERE category = ? AND sensitive = 0', args: [category] });
    return rows(result.rows);
  },

  async getAll() {
    const db = getDb();
    const result = await db.execute('SELECT * FROM memory WHERE sensitive = 0');
    return rows(result.rows);
  },

  async delete(key) {
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM memory WHERE key = ?', args: [key] });
  },
};

// ─── Conversation History ──────────────────────────────────

export const ConversationHistory = {
  async add(role, content, metadata = null) {
    const db = getDb();
    await db.execute({
      sql: 'INSERT INTO conversation_history (role, content, metadata) VALUES (?, ?, ?)',
      args: [role, content, metadata ? JSON.stringify(metadata) : null],
    });
  },

  async getRecent(limit = 20) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM conversation_history ORDER BY id DESC LIMIT ?', args: [limit] });
    return rows(result.rows).reverse().map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
  },

  async clear() {
    const db = getDb();
    await db.execute('DELETE FROM conversation_history');
  },
};

// ─── Integration Tokens ──────────────────────────────────

export const IntegrationTokens = {
  async set(platform, tokenData) {
    const db = getDb();
    const scopes = tokenData.scopes || null;
    const json = JSON.stringify(tokenData);
    await db.execute({
      sql: `INSERT INTO integration_tokens (platform, token_data, scopes, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(platform) DO UPDATE SET token_data = ?, scopes = ?, updated_at = datetime('now')`,
      args: [platform, json, scopes, json, scopes],
    });
  },

  async get(platform) {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM integration_tokens WHERE platform = ?', args: [platform] });
    return row(result.rows[0]);
  },

  async getAll() {
    const db = getDb();
    const result = await db.execute('SELECT platform, scopes, updated_at FROM integration_tokens');
    return rows(result.rows);
  },

  async delete(platform) {
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM integration_tokens WHERE platform = ?', args: [platform] });
  },
};

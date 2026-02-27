import { getSupabase, isConfigured } from './_lib/supabase.mjs';
import { verifyAuth, unauthorized } from './_lib/auth.mjs';

const DEMO = {
  companies: { demo: true, rows: [], message: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel settings.' },
  outreach: { demo: true, rows: [], message: 'Supabase not configured.' },
  summary: { demo: true, total_pipeline: 0, active_pipeline: 0, booked_ytd: 0, target_h1: 5000000, win_rate: 0, target_win_rate: 40, companies_researched: 0, companies_approved: 0, contacts_found: 0, outreach_sent: 0, replies: 0, connected: 0, meetings_this_week: 0, target_meetings_week: 3 },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const auth = await verifyAuth(req);
    if (!auth.valid) return unauthorized(res);
  }

  if (!isConfigured()) {
    if (req.method === 'GET') {
      const tab = req.query.tab || 'summary';
      return res.status(200).json(DEMO[tab] || DEMO.summary);
    }
    return res.status(200).json({ demo: true, success: false, message: 'Supabase not configured.' });
  }

  const db = getSupabase();

  try {
    if (req.method === 'GET') return await handleGet(req, res, db);
    if (req.method === 'POST') return await handlePost(req, res, db);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── GET ────────────────────────────────────────────────────

async function handleGet(req, res, db) {
  const tab = req.query.tab || 'summary';

  if (tab === 'companies') {
    const { data, error } = await db.from('companies')
      .select('name, sector, icp_fit, stage, services_match, est_value, lead_source, created_at, feedback')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      rows: (data || []).map(r => ({
        company: r.name, sector: r.sector || '', icp_fit: r.icp_fit || 'Warm',
        stage: r.stage || 'Researched', services: r.services_match || '',
        est_value: r.est_value || 0, lead_source: r.lead_source || 'Cold Outbound',
        date_added: r.created_at ? r.created_at.split('T')[0] : '', feedback: r.feedback || '',
      }))
    });
  }

  if (tab === 'outreach') {
    const { data, error } = await db.from('contacts')
      .select('company_name, name, title, email, email_status, contact_stage, feedback, email_subject, email_body, email_stage, li_connection_message, li_connection_stage, li_follow_up_message, li_follow_up_stage, linkedin_url, seniority')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      rows: (data || []).map(r => ({
        company: r.company_name, contact_name: r.name, title: r.title || '',
        email: r.email || '', email_status: r.email_status || 'Unavailable',
        contact_stage: r.contact_stage || 'Contact Found', feedback: r.feedback || '',
        email_subject: r.email_subject || '', email_body: r.email_body || '',
        email_stage: r.email_stage || '', li_connection_message: r.li_connection_message || '',
        li_connection_stage: r.li_connection_stage || '', li_follow_up_message: r.li_follow_up_message || '',
        li_follow_up_stage: r.li_follow_up_stage || '', linkedin_url: r.linkedin_url || '', seniority: r.seniority || '',
      }))
    });
  }

  if (tab === 'summary') {
    const [cr, ct, pl] = await Promise.all([
      db.from('companies').select('stage, est_value'),
      db.from('contacts').select('contact_stage, email_stage, li_connection_stage, li_follow_up_stage'),
      db.from('pipeline').select('stage, est_value'),
    ]);
    const companies = cr.data || [], contacts = ct.data || [], pipeline = pl.data || [];
    const totalPipeline = pipeline.reduce((s, d) => s + (d.est_value || 0), 0);
    const active = pipeline.filter(d => d.stage === 'Connected' || d.stage === 'Qualified');
    const activePipeline = active.reduce((s, d) => s + (d.est_value || 0), 0);
    const won = pipeline.filter(d => d.stage === 'Won');
    const bookedYtd = won.reduce((s, d) => s + (d.est_value || 0), 0);
    const sent = contacts.filter(c => ['Sent', 'Replied', 'No Response'].includes(c.email_stage)).length;
    const replied = contacts.filter(c => c.email_stage === 'Replied').length;

    return res.status(200).json({
      total_pipeline: totalPipeline, active_pipeline: activePipeline, booked_ytd: bookedYtd,
      target_h1: 5000000, win_rate: pipeline.length > 0 ? Math.round((won.length / pipeline.length) * 1000) / 10 : 0,
      target_win_rate: 40, companies_researched: companies.length,
      companies_approved: companies.filter(c => c.stage !== 'Researched' && c.stage !== 'Rejected').length,
      contacts_found: contacts.length, outreach_sent: sent, replies: replied,
      connected: pipeline.filter(d => d.stage === 'Connected').length,
      meetings_this_week: 0, target_meetings_week: 3,
    });
  }

  return res.status(400).json({ error: 'Unknown tab: ' + tab });
}

// ─── POST ───────────────────────────────────────────────────

async function handlePost(req, res, db) {
  const { action, data } = req.body || {};
  if (!action || !data) return res.status(400).json({ error: 'Missing action or data' });

  const handlers = { add_company: addCompany, update_company: updateCompany, add_contact: addContact, update_contact: updateContact, update_outreach: updateOutreach, update_stage: updateStage };
  const fn = handlers[action];
  if (!fn) return res.status(400).json({ error: 'Unknown action: ' + action });
  return fn(res, db, data);
}

async function addCompany(res, db, data) {
  const row = {
    name: data.company, sector: data.sector || null, icp_fit: data.icp_fit || null,
    why_this_company: data.why_this_company || null, services_match: data.services_match || data.services || null,
    est_value: parseInt(data.est_value || '0', 10), outreach_angle: data.outreach_angle || null,
    evidence: data.evidence || null, lead_source: data.lead_source || 'Cold Outbound',
    stage: data.stage || 'Researched', feedback: data.feedback || null,
  };
  const { data: result, error } = await db.from('companies').upsert(row, { onConflict: 'name' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await log(db, 'company', result.id, 'add_company', { name: row.name });
  return res.status(200).json({ success: true, company: result.name });
}

async function updateCompany(res, db, data) {
  if (!data.company) return res.status(400).json({ error: 'Missing company name' });
  const updates = {};
  for (const f of ['sector', 'icp_fit', 'why_this_company', 'services_match', 'est_value', 'outreach_angle', 'evidence', 'lead_source', 'stage', 'feedback', 'asana_task_id']) {
    if (data[f] !== undefined) updates[f] = data[f];
  }
  if (data.services !== undefined) updates.services_match = data.services;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const { data: result, error } = await db.from('companies').update(updates).eq('name', data.company).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await log(db, 'company', result?.id, 'update_company', { name: data.company, ...updates });
  return res.status(200).json({ success: true, updated: true, company: data.company });
}

async function addContact(res, db, data) {
  const { data: company } = await db.from('companies').select('id').eq('name', data.company).single();
  const row = {
    company_id: company?.id || null, company_name: data.company,
    name: data.name || data.contact_name, title: data.title || null,
    email: data.email || null, email_status: data.email_status || (data.email ? 'Unverified' : 'Unavailable'),
    linkedin_url: data.linkedin_url || null, seniority: data.seniority || null,
    why_this_contact: data.why_this_contact || null, contact_stage: data.contact_stage || 'Contact Found',
  };
  const { data: result, error } = await db.from('contacts').upsert(row, { onConflict: 'company_name,name' }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (company?.id) {
    await db.from('companies').update({ stage: 'Contacts Found' }).eq('id', company.id).in('stage', ['Approved', 'Reworked']);
  }
  await log(db, 'contact', result.id, 'add_contact', { name: row.name, company: row.company_name });
  return res.status(200).json({ success: true, contact: result.name });
}

async function updateContact(res, db, data) {
  const name = data.name || data.contact_name;
  if (!data.company || !name) return res.status(400).json({ error: 'Missing company or contact name' });
  const updates = {};
  for (const f of ['title', 'email', 'email_status', 'linkedin_url', 'seniority', 'why_this_contact', 'contact_stage', 'feedback']) {
    if (data[f] !== undefined) updates[f] = data[f];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const { data: result, error } = await db.from('contacts').update(updates).eq('company_name', data.company).eq('name', name).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await log(db, 'contact', result?.id, 'update_contact', { name, company: data.company, ...updates });
  return res.status(200).json({ success: true, updated: true });
}

async function updateOutreach(res, db, data) {
  const name = data.name || data.contact_name;
  if (!data.company || !name) return res.status(400).json({ error: 'Missing company or contact name' });
  const updates = {};
  for (const f of ['email_subject', 'email_body', 'email_stage', 'li_connection_message', 'li_connection_stage', 'li_follow_up_message', 'li_follow_up_stage', 'follow_up_due', 'contact_stage']) {
    if (data[f] !== undefined) updates[f] = data[f];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No outreach fields' });

  const { data: result, error } = await db.from('contacts').update(updates).eq('company_name', data.company).eq('name', name).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Auto-send email when approved
  if (updates.email_stage === 'Approved' && result.email) {
    try {
      const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      fetch(`${base}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.HRMNY_API_KEY || '' },
        body: JSON.stringify({ contact_id: result.id }),
      }).catch(() => {});
    } catch (_) {}
  }

  await log(db, 'contact', result?.id, 'update_outreach', { name, company: data.company, ...updates });
  return res.status(200).json({ success: true, updated: true });
}

async function updateStage(res, db, data) {
  if (!data.company) return res.status(400).json({ error: 'Missing company' });
  const tab = data.tab || 'companies';

  if (tab === 'companies') {
    const { error } = await db.from('companies').update({ stage: data.stage }).eq('name', data.company);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const updates = {};
    for (const f of ['email_stage', 'li_connection_stage', 'li_follow_up_stage', 'contact_stage']) {
      if (data[f]) updates[f] = data[f];
    }
    let q = db.from('contacts').update(updates).eq('company_name', data.company);
    if (data.contact_name || data.name) q = q.eq('name', data.contact_name || data.name);
    const { error } = await q;
    if (error) return res.status(500).json({ error: error.message });
  }

  await log(db, tab, null, 'update_stage', data);
  return res.status(200).json({ success: true, updated: true });
}

async function log(db, type, id, action, details) {
  try { await db.from('activity_log').insert({ entity_type: type, entity_id: id, action, details }); } catch (_) {}
}

import { getSupabase, isConfigured } from './_lib/supabase.mjs';
import { verifyAuth, unauthorized } from './_lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const auth = await verifyAuth(req);
    if (!auth.valid) return unauthorized(res);
  }

  if (!isConfigured()) {
    return res.status(200).json({ demo: true, deals: [], message: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel settings.' });
  }

  const db = getSupabase();

  try {
    if (req.method === 'GET') {
      const { data, error } = await db.from('pipeline')
        .select('id, company_name, contact_name, stage, est_value, next_step, notes, created_at, updated_at')
        .in('stage', ['Connected', 'Qualified', 'Proposal', 'Negotiation'])
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });

      const now = Date.now();
      const deals = (data || []).map(d => ({
        name: d.company_name,
        stage: d.stage,
        value: d.est_value || 0,
        contact: d.contact_name || '',
        days_in_stage: Math.floor((now - new Date(d.updated_at || d.created_at).getTime()) / 86400000),
        next_step: d.next_step || '',
      }));
      return res.status(200).json({ deals });
    }

    if (req.method === 'POST') {
      const { action, data } = req.body || {};

      if (action === 'promote') {
        const { data: company } = await db.from('companies').select('id, est_value').eq('name', data.company).single();
        const contactQuery = data.contact_name
          ? await db.from('contacts').select('id').eq('company_name', data.company).eq('name', data.contact_name).single()
          : { data: null };

        const row = {
          company_id: company?.id || null, company_name: data.company,
          contact_id: contactQuery?.data?.id || null, contact_name: data.contact_name || '',
          stage: 'Connected', est_value: data.est_value || company?.est_value || 0,
          next_step: data.next_step || 'Schedule discovery call', notes: data.notes || '',
        };

        const { data: result, error } = await db.from('pipeline').insert(row).select().single();
        if (error) return res.status(500).json({ error: error.message });

        if (company?.id) {
          await db.from('companies').update({ stage: 'Connected' }).eq('id', company.id);
        }
        return res.status(200).json({ success: true, deal: result });
      }

      if (action === 'update') {
        const updates = {};
        for (const f of ['stage', 'est_value', 'next_step', 'notes', 'contact_name']) {
          if (data[f] !== undefined) updates[f] = data[f];
        }
        const { error } = await db.from('pipeline').update(updates).eq('company_name', data.company);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, updated: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

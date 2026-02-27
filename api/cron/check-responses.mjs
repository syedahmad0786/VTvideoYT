import { getSupabase, isConfigured } from '../_lib/supabase.mjs';

// Vercel Cron: runs daily at 8am UTC
// Set in vercel.json: { "path": "/api/cron/check-responses", "schedule": "0 8 * * *" }

export default async function handler(req, res) {
  if (!isConfigured()) return res.status(200).json({ ok: true, message: 'Not configured' });

  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getSupabase();

  try {
    // Mark emails as "No Response" after 7 days with no reply
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: stale, error } = await db.from('contacts')
      .update({ email_stage: 'No Response' })
      .eq('email_stage', 'Sent')
      .lt('email_date_sent', sevenDaysAgo)
      .select('id, name, company_name');

    if (error) return res.status(500).json({ error: error.message });

    // Log
    for (const c of (stale || [])) {
      await db.from('activity_log').insert({
        entity_type: 'email', entity_id: c.id,
        action: 'auto_no_response',
        details: { name: c.name, company: c.company_name },
      });
    }

    return res.status(200).json({ ok: true, marked: (stale || []).length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import { getSupabase, isConfigured } from '../_lib/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isConfigured()) return res.status(200).json({ ok: true });

  const db = getSupabase();

  try {
    const event = req.body;
    const type = event.type;
    const emailId = event.data?.email_id;

    if (!emailId) return res.status(200).json({ ok: true });

    // Log the event
    const { data: contact } = await db.from('contacts')
      .select('id')
      .eq('resend_email_id', emailId)
      .single();

    if (contact) {
      await db.from('email_events').insert({
        contact_id: contact.id,
        resend_email_id: emailId,
        event_type: type,
        payload: event,
      });

      // Update email stage based on event type
      const stageMap = {
        'email.delivered': null,       // Keep as Sent
        'email.bounced': 'Bounced',
        'email.complained': 'Bounced',
      };

      const newStage = stageMap[type];
      if (newStage) {
        await db.from('contacts').update({ email_stage: newStage }).eq('id', contact.id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

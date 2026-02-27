import { getSupabase, isConfigured } from '../_lib/supabase.mjs';
import { getResend, isResendConfigured, getFromEmail, getFromName } from '../_lib/resend.mjs';
import { verifyAuth, unauthorized } from '../_lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAuth(req);
  if (!auth.valid) return unauthorized(res);

  if (!isConfigured()) return res.status(200).json({ demo: true, message: 'Supabase not configured' });
  if (!isResendConfigured()) return res.status(200).json({ demo: true, message: 'RESEND_API_KEY not configured' });

  const db = getSupabase();
  const resend = getResend();
  const { contact_id } = req.body || {};

  try {
    // Get contact with email data
    const { data: contact, error } = await db.from('contacts')
      .select('id, name, email, email_subject, email_body, email_stage, company_name')
      .eq('id', contact_id)
      .single();

    if (error || !contact) return res.status(404).json({ error: 'Contact not found' });
    if (!contact.email) return res.status(400).json({ error: 'No email address' });
    if (!contact.email_subject || !contact.email_body) return res.status(400).json({ error: 'No email draft' });

    // Send via Resend
    const { data: sent, error: sendError } = await resend.emails.send({
      from: `${getFromName()} <${getFromEmail()}>`,
      to: [contact.email],
      subject: contact.email_subject,
      html: contact.email_body.replace(/\n/g, '<br>'),
    });

    if (sendError) return res.status(500).json({ error: sendError.message });

    // Update contact
    await db.from('contacts').update({
      email_stage: 'Sent',
      email_date_sent: new Date().toISOString(),
      resend_email_id: sent.id,
    }).eq('id', contact_id);

    // Log
    await db.from('activity_log').insert({
      entity_type: 'email', entity_id: contact_id,
      action: 'email_sent',
      details: { to: contact.email, subject: contact.email_subject, resend_id: sent.id },
    });

    return res.status(200).json({ success: true, email_id: sent.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

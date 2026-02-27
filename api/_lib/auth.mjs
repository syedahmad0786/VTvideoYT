import { createClient } from '@supabase/supabase-js';

export async function verifyAuth(req) {
  // CLI auth: API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.HRMNY_API_KEY) {
    return { source: 'api_key', valid: true };
  }

  // Portal auth: Supabase JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return { source: 'supabase', valid: true, user: data.user };
      }
    }
  }

  // No auth configured = allow all (dev mode)
  if (!process.env.HRMNY_API_KEY && !process.env.SUPABASE_URL) {
    return { source: 'none', valid: true };
  }

  return { source: 'none', valid: false };
}

export function unauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized. Provide x-api-key header or Supabase JWT.' });
}

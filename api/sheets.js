export default async function handler(req, res) {
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(200).json({
      demo: true,
      rows: [],
      message: 'SHEETS_WEBHOOK_URL not configured. Set it in Vercel project settings.',
    });
  }

  try {
    if (req.method === 'GET') {
      const tab = req.query.tab || 'summary';
      const response = await fetch(webhookUrl + '?tab=' + encodeURIComponent(tab));
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Proxy to Asana for pipeline data
export default async function handler(req, res) {
  const asanaToken = process.env.ASANA_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID || '1209527783498498';

  if (!asanaToken) {
    return res.status(200).json({
      error: 'ASANA_TOKEN not configured',
      hint: 'Set the environment variable in Vercel project settings',
      demo: true,
      deals: [],
    });
  }

  try {
    const response = await fetch(
      `https://app.asana.com/api/1.0/projects/${projectGid}/tasks?opt_fields=name,memberships.section.name,custom_fields.name,custom_fields.display_value,completed,created_at`,
      {
        headers: { Authorization: `Bearer ${asanaToken}` },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Asana API error' });
    }

    const { data } = await response.json();

    const deals = (data || [])
      .filter((t) => !t.completed)
      .map((task) => {
        const section = task.memberships?.[0]?.section?.name || 'Unknown';
        const fields = {};
        (task.custom_fields || []).forEach((f) => {
          fields[f.name] = f.display_value;
        });

        return {
          name: task.name,
          stage: section,
          value: parseInt(fields['Est. Value (AED)'] || '0', 10),
          contact: fields['Primary Contact'] || '',
          next_step: fields['Next Steps (Sales)'] || '',
          created_at: task.created_at,
        };
      });

    return res.status(200).json({ deals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

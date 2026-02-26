export default async function handler(req, res) {
  const asanaToken = process.env.ASANA_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID || '1209527783498498';

  if (!asanaToken) {
    return res.status(200).json({
      demo: true,
      deals: [],
      message: 'ASANA_TOKEN not configured. Set it in Vercel project settings.',
    });
  }

  try {
    const url = 'https://app.asana.com/api/1.0/projects/' + projectGid +
      '/tasks?opt_fields=name,memberships.section.name,custom_fields.name,custom_fields.display_value,completed,created_at';

    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + asanaToken },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Asana API error' });
    }

    const json = await response.json();
    const tasks = json.data || [];

    const deals = tasks
      .filter(function (t) { return !t.completed; })
      .map(function (task) {
        var section = (task.memberships && task.memberships[0] && task.memberships[0].section)
          ? task.memberships[0].section.name
          : 'Unknown';
        var fields = {};
        (task.custom_fields || []).forEach(function (f) {
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

    return res.status(200).json({ deals: deals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import React from 'react';

const STAGES = [
  { key: 'researched', label: 'Researched', color: 'bg-amber-100 text-amber-800' },
  { key: 'approved', label: 'Approved', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'contacts_found', label: 'Contacts Found', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'outreach_ready', label: 'Outreach Ready', color: 'bg-violet-100 text-violet-800' },
  { key: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  { key: 'replied', label: 'Replied', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'connected', label: 'Connected', color: 'bg-green-100 text-green-800' },
];

export default function FunnelChart({ data }) {
  const max = Math.max(...Object.values(data), 1);

  return (
    <div className="space-y-3">
      {STAGES.map((stage) => {
        const count = data[stage.key] || 0;
        const pct = Math.round((count / max) * 100);
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div className="w-28 text-right">
              <span className={`badge ${stage.color}`}>{stage.label}</span>
            </div>
            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-slate-700 rounded-full flex items-center justify-end pr-2 text-xs text-white font-medium transition-all duration-500"
                style={{ width: `${Math.max(pct, count > 0 ? 12 : 0)}%` }}
              >
                {count > 0 && count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

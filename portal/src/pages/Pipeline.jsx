import React from 'react';
import { DEMO_PIPELINE } from '../lib/demo-data';

const STAGE_COLORS = {
  'Connected': 'border-l-blue-500 bg-blue-50/50',
  'Qualified': 'border-l-emerald-500 bg-emerald-50/50',
};

export default function Pipeline() {
  const deals = DEMO_PIPELINE;
  const connected = deals.filter((d) => d.stage === 'Connected');
  const qualified = deals.filter((d) => d.stage === 'Qualified');

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const connectedValue = connected.reduce((s, d) => s + d.value, 0);
  const qualifiedValue = qualified.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">Active deals in Asana (Connected + Qualified)</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total Pipeline</p>
          <p className="text-2xl font-bold mt-1">AED {(totalValue / 1e6).toFixed(2)}M</p>
          <p className="text-xs text-slate-400 mt-1">{deals.length} deals</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Connected</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">AED {(connectedValue / 1000).toFixed(0)}K</p>
          <p className="text-xs text-slate-400 mt-1">{connected.length} deals</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Qualified</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">AED {(qualifiedValue / 1000).toFixed(0)}K</p>
          <p className="text-xs text-slate-400 mt-1">{qualified.length} deals</p>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageColumn title="Connected" count={connected.length} deals={connected} color="blue" />
        <StageColumn title="Qualified" count={qualified.length} deals={qualified} color="emerald" />
      </div>
    </div>
  );
}

function StageColumn({ title, count, deals, color }) {
  return (
    <div className="card">
      <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full bg-${color}-500`} />
          <h2 className="font-semibold text-slate-900">{title}</h2>
        </div>
        <span className="text-sm text-slate-400">{count}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {deals.map((deal) => (
          <div key={deal.name} className={`px-6 py-4 border-l-4 ${STAGE_COLORS[deal.stage] || ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{deal.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{deal.contact}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">AED {(deal.value / 1000).toFixed(0)}K</span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className={`${deal.days_in_stage > 10 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                {deal.days_in_stage}d in stage
              </span>
              <span className="text-slate-400">Next: {deal.next_step}</span>
            </div>
          </div>
        ))}
        {deals.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-slate-400">No deals in this stage</div>
        )}
      </div>
    </div>
  );
}

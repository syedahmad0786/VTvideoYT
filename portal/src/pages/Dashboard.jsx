import React from 'react';
import StatCard from '../components/StatCard';
import FunnelChart from '../components/FunnelChart';
import { ICPTag, StageTag } from '../components/StageTag';
import { DEMO_COMPANIES, DEMO_OUTREACH, DEMO_METRICS, getStageCounts, getICPCounts, getSectorCounts } from '../lib/demo-data';

export default function Dashboard() {
  const companies = DEMO_COMPANIES;
  const outreach = DEMO_OUTREACH;
  const m = DEMO_METRICS;

  const stageCounts = getStageCounts(companies);
  const icpCounts = getICPCounts(companies);
  const sectorCounts = getSectorCounts(companies);

  const funnelData = {
    researched: stageCounts['Researched'] || 0,
    approved: stageCounts['Approved'] || 0,
    contacts_found: stageCounts['Contacts Found'] || 0,
    outreach_ready: stageCounts['Outreach Ready'] || 0,
    sent: stageCounts['Sent'] || 0,
    replied: stageCounts['Replied'] || 0,
    connected: stageCounts['Connected'] || 0,
  };

  const needsAction = companies.filter((c) => c.stage === 'Researched' || c.stage === 'Rework');
  const recentReplies = outreach.filter((o) => o.email_stage === 'Replied' || o.li_follow_up_stage === 'Replied');

  const progressPct = Math.round((m.booked_ytd / m.target_h1) * 100);
  const pipelineCoverage = m.active_pipeline / (m.target_h1 / 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Sales & Growth overview for hrmny</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Pipeline" value={`AED ${(m.active_pipeline / 1e6).toFixed(1)}M`} subtext={`${pipelineCoverage.toFixed(1)}x monthly target`} />
        <StatCard label="Booked YTD" value={`AED ${(m.booked_ytd / 1e6).toFixed(1)}M`} subtext={`${progressPct}% of H1 target`} />
        <StatCard label="Win Rate" value={`${m.win_rate}%`} subtext={`Target: ${m.target_win_rate}%`} />
        <StatCard label="Meetings / Week" value={m.meetings_this_week} subtext={`Target: ${m.target_meetings_week}/week`} />
      </div>

      {/* Progress Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">H1 2026 Revenue Target</span>
          <span className="text-sm text-slate-500">AED {(m.booked_ytd / 1e6).toFixed(2)}M / {(m.target_h1 / 1e6).toFixed(1)}M</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-rose-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(progressPct, 100)}%` }} />
        </div>
      </div>

      {/* Funnel + ICP + Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Conversion Funnel</h2>
          </div>
          <div className="px-6 py-4">
            <FunnelChart data={funnelData} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-medium text-slate-900 text-sm">ICP Breakdown</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {Object.entries(icpCounts).map(([fit, count]) => (
                <div key={fit} className="flex items-center justify-between">
                  <ICPTag fit={fit} />
                  <span className="text-sm font-medium text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-medium text-slate-900 text-sm">By Sector</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              {Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).map(([sector, count]) => (
                <div key={sector} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{sector}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Items + Recent Replies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Needs Your Action</h2>
            <span className="badge bg-amber-100 text-amber-700">{needsAction.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {needsAction.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">All caught up</div>
            ) : (
              needsAction.map((c) => (
                <div key={c.company} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.company}</p>
                    <p className="text-xs text-slate-500">{c.sector}</p>
                  </div>
                  <StageTag stage={c.stage} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Replies</h2>
            <span className="badge bg-emerald-100 text-emerald-700">{recentReplies.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentReplies.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No replies yet</div>
            ) : (
              recentReplies.map((o, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{o.contact_name}</p>
                    <p className="text-xs text-slate-500">{o.company} &middot; {o.title}</p>
                  </div>
                  <span className="badge bg-emerald-100 text-emerald-700">Replied</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

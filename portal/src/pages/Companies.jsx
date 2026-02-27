import React, { useState } from 'react';
import { ICPTag, StageTag } from '../components/StageTag';
import LoadingState, { DemoBanner } from '../components/LoadingState';
import { useSheets } from '../hooks/useSheets';
import { DEMO_COMPANIES } from '../lib/demo-data';

const STAGE_ORDER = ['Researched', 'Rework', 'Reworked', 'Approved', 'Contacts Found', 'Outreach Ready', 'Sent', 'Replied', 'Connected', 'Rejected'];

export default function Companies() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { companies: apiCompanies, loading, isDemo, updateStage } = useSheets();

  const companies = apiCompanies.length > 0 ? apiCompanies : DEMO_COMPANIES;
  const showDemo = isDemo || apiCompanies.length === 0;

  const filtered = companies
    .filter((c) => filter === 'all' || c.stage === filter)
    .filter((c) => !search || c.company.toLowerCase().includes(search.toLowerCase()) || c.sector.toLowerCase().includes(search.toLowerCase()));

  const stages = [...new Set(companies.map((c) => c.stage))];
  const totalValue = filtered.reduce((s, c) => s + (c.est_value || 0), 0);

  if (loading && apiCompanies.length === 0) return <LoadingState message="Loading companies..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} companies &middot; AED {(totalValue / 1000).toFixed(0)}K est. value</p>
        </div>
      </div>

      {showDemo && <DemoBanner />}

      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter('all')} className={`btn text-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</button>
          {STAGE_ORDER.filter((s) => stages.includes(s)).map((stage) => (
            <button key={stage} onClick={() => setFilter(stage)} className={`btn text-xs ${filter === stage ? 'btn-primary' : 'btn-ghost'}`}>
              {stage} ({companies.filter((c) => c.stage === stage).length})
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Company</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Sector</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">ICP</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Services</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Est. Value</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Source</th>
                {!showDemo && <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.company} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3"><span className="text-sm font-medium text-slate-900">{c.company}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.sector}</td>
                  <td className="px-4 py-3"><ICPTag fit={c.icp_fit} /></td>
                  <td className="px-4 py-3"><StageTag stage={c.stage} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.services}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-slate-700">{c.est_value ? `AED ${(c.est_value / 1000).toFixed(0)}K` : '-'}</td>
                  <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600">{c.lead_source}</span></td>
                  {!showDemo && (
                    <td className="px-4 py-3 text-center">
                      {c.stage === 'Researched' && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => updateStage('companies', c.company, 'stage', 'Approved')} className="btn text-xs btn-primary">Approve</button>
                          <button onClick={() => updateStage('companies', c.company, 'stage', 'Rejected')} className="btn text-xs btn-ghost text-red-600">Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-400">No companies match your filters</div>}
      </div>
    </div>
  );
}

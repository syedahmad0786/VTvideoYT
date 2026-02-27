import React from 'react';

const STAGE_COLORS = {
  'Researched': 'bg-amber-100 text-amber-700',
  'Reworked': 'bg-sky-100 text-sky-700',
  'Approved': 'bg-yellow-100 text-yellow-700',
  'Contacts Found': 'bg-cyan-100 text-cyan-700',
  'Outreach Ready': 'bg-violet-100 text-violet-700',
  'Sent': 'bg-blue-100 text-blue-700',
  'Replied': 'bg-emerald-100 text-emerald-700',
  'Connected': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-600',
  'Rework': 'bg-rose-100 text-rose-700',
  'Contact Found': 'bg-cyan-100 text-cyan-700',
  'Contact Approved': 'bg-yellow-100 text-yellow-700',
  'Drafted': 'bg-amber-100 text-amber-700',
  'Accepted': 'bg-emerald-100 text-emerald-700',
  'No Response': 'bg-slate-100 text-slate-500',
  'Bounced': 'bg-red-100 text-red-700',
  'Verified': 'bg-emerald-100 text-emerald-700',
  'Unverified': 'bg-amber-100 text-amber-700',
  'Unavailable': 'bg-red-100 text-red-600',
};

const ICP_COLORS = {
  'Hot': 'bg-red-100 text-red-700',
  'Warm': 'bg-amber-100 text-amber-700',
  'Cool': 'bg-blue-100 text-blue-700',
};

export function StageTag({ stage }) {
  if (!stage) return null;
  const color = STAGE_COLORS[stage] || 'bg-slate-100 text-slate-600';
  return <span className={`badge ${color}`}>{stage}</span>;
}

export function ICPTag({ fit }) {
  if (!fit) return null;
  const color = ICP_COLORS[fit] || 'bg-slate-100 text-slate-600';
  return <span className={`badge ${color}`}>{fit}</span>;
}

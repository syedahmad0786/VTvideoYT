import React, { useState } from 'react';
import { StageTag } from '../components/StageTag';
import { DEMO_OUTREACH } from '../lib/demo-data';

export default function Outreach() {
  const [filter, setFilter] = useState('all');
  const outreach = DEMO_OUTREACH;

  const filtered = outreach.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'needs_approval') return o.contact_stage === 'Contact Found';
    if (filter === 'drafted') return o.email_stage === 'Drafted' || o.li_connection_stage === 'Drafted';
    if (filter === 'sent') return o.email_stage === 'Sent' || o.li_connection_stage === 'Sent';
    if (filter === 'replied') return o.email_stage === 'Replied' || o.li_follow_up_stage === 'Replied';
    return true;
  });

  const emailsSent = outreach.filter((o) => o.email_stage === 'Sent' || o.email_stage === 'Replied').length;
  const emailReplied = outreach.filter((o) => o.email_stage === 'Replied').length;
  const liSent = outreach.filter((o) => o.li_connection_stage === 'Sent' || o.li_connection_stage === 'Accepted').length;
  const liAccepted = outreach.filter((o) => o.li_connection_stage === 'Accepted').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Outreach</h1>
        <p className="text-sm text-slate-500 mt-1">{outreach.length} contacts across all channels</p>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Emails Sent</p>
          <p className="text-2xl font-bold mt-1">{emailsSent}</p>
          <p className="text-xs text-slate-400 mt-1">{emailReplied} replied ({emailsSent > 0 ? Math.round((emailReplied / emailsSent) * 100) : 0}%)</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">LI Connections</p>
          <p className="text-2xl font-bold mt-1">{liSent}</p>
          <p className="text-xs text-slate-400 mt-1">{liAccepted} accepted ({liSent > 0 ? Math.round((liAccepted / liSent) * 100) : 0}%)</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total Contacts</p>
          <p className="text-2xl font-bold mt-1">{outreach.length}</p>
          <p className="text-xs text-slate-400 mt-1">across {new Set(outreach.map((o) => o.company)).size} companies</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Reply Rate</p>
          <p className="text-2xl font-bold mt-1">
            {emailsSent + liSent > 0 ? Math.round(((emailReplied + liAccepted) / (emailsSent + liSent)) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-400 mt-1">combined channels</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'needs_approval', label: 'Needs Approval' },
          { key: 'drafted', label: 'Drafted' },
          { key: 'sent', label: 'Sent' },
          { key: 'replied', label: 'Replied' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`btn text-xs ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Contact Cards */}
      <div className="space-y-3">
        {filtered.map((o, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-slate-900">{o.contact_name}</h3>
                <p className="text-sm text-slate-500">{o.title} &middot; {o.company}</p>
              </div>
              <StageTag stage={o.contact_stage} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Email */}
              <ChannelCard
                channel="Email"
                status={o.email_stage}
                detail={o.email ? `${o.email} (${o.email_status})` : 'No email'}
                disabled={!o.email}
              />
              {/* LI Connection */}
              <ChannelCard
                channel="LI Connection"
                status={o.li_connection_stage}
                detail={o.li_connection_stage ? 'Connection request' : 'Not drafted'}
              />
              {/* LI Follow-up */}
              <ChannelCard
                channel="LI Follow-up"
                status={o.li_follow_up_stage}
                detail={o.li_follow_up_stage ? 'Follow-up message' : 'Not drafted'}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card p-12 text-center text-sm text-slate-400">No contacts match this filter</div>
        )}
      </div>
    </div>
  );
}

function ChannelCard({ channel, status, detail, disabled }) {
  return (
    <div className={`rounded-lg border p-3 ${disabled ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500">{channel}</span>
        {status && <StageTag stage={status} />}
      </div>
      <p className="text-xs text-slate-400 truncate">{detail}</p>
    </div>
  );
}

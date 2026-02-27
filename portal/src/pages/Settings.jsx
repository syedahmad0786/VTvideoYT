import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Settings() {
  const { user, signOut, configured: authConfigured } = useAuth();
  const [checking, setChecking] = useState(true);
  const [apiStatus, setApiStatus] = useState(null);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const [apiRes, sheetsRes, pipelineRes] = await Promise.all([
          fetch('/api').then(r => r.json()).catch(() => null),
          fetch('/api/sheets?tab=summary').then(r => r.json()).catch(() => null),
          fetch('/api/pipeline').then(r => r.json()).catch(() => null),
        ]);
        setApiStatus(apiRes);
        setSheetsStatus(sheetsRes);
        setPipelineStatus(pipelineRes);
      } catch (_) {}
      setChecking(false);
    }
    checkStatus();
  }, []);

  const supabaseOk = sheetsStatus && !sheetsStatus.demo;
  const resendConfigured = apiStatus?.integrations?.resend || false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Platform configuration and integration status</p>
      </div>

      {/* User Session */}
      {user && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Account</h2>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{user.email}</p>
              <p className="text-xs text-slate-500">Logged in via Supabase Auth</p>
            </div>
            <button onClick={signOut} className="btn btn-ghost text-red-600 text-sm">Sign Out</button>
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Integration Status</h2>
          <p className="text-xs text-slate-500 mt-1">Configure in Vercel Project Settings &rarr; Environment Variables</p>
        </div>
        <div className="divide-y divide-slate-100">
          <IntegrationRow name="Supabase Database" status={checking ? 'checking' : supabaseOk ? 'connected' : 'not_configured'}
            detail={supabaseOk ? 'Companies, Contacts, Pipeline tables' : 'Set SUPABASE_URL + SUPABASE_SERVICE_KEY'}
          />
          <IntegrationRow name="Supabase Auth" status={authConfigured ? 'connected' : 'not_configured'}
            detail={authConfigured ? 'Email/password login enabled' : 'Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY'}
          />
          <IntegrationRow name="Resend Email" status={checking ? 'checking' : resendConfigured ? 'connected' : 'not_configured'}
            detail={resendConfigured ? 'Email sending + tracking' : 'Set RESEND_API_KEY + RESEND_FROM_EMAIL'}
          />
          <IntegrationRow name="Apollo.io" status="connected" detail="Contact enrichment via Claude connector" />
          <IntegrationRow name="LinkedIn MCP" status="connected" detail="Connection requests + messaging via CLI" />
        </div>
      </div>

      {/* Environment Variables Guide */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Required Environment Variables</h2>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm font-mono">
          <EnvVar name="SUPABASE_URL" desc="Supabase project URL" required />
          <EnvVar name="SUPABASE_SERVICE_KEY" desc="Supabase service role key (API functions)" required />
          <EnvVar name="SUPABASE_ANON_KEY" desc="Supabase anon key (auth middleware)" />
          <EnvVar name="VITE_SUPABASE_URL" desc="Same as SUPABASE_URL (for portal build)" required />
          <EnvVar name="VITE_SUPABASE_ANON_KEY" desc="Same as SUPABASE_ANON_KEY (for portal build)" required />
          <EnvVar name="HRMNY_API_KEY" desc="API key for CLI access (any strong random string)" />
          <EnvVar name="RESEND_API_KEY" desc="Resend API key for email sending" />
          <EnvVar name="RESEND_FROM_EMAIL" desc="Sender email (e.g. sales@hrmny.co)" />
          <EnvVar name="CRON_SECRET" desc="Secret for Vercel cron jobs" />
        </div>
      </div>

      {/* Workspace Info */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Workspace Info</h2>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-900 font-medium">3.0.0</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Backend</span><span className="text-slate-900">Supabase (Postgres) + Vercel Serverless</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-900">Resend</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Operator</span><span className="text-slate-900">Ayham Homsi, Managing Partner</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Agency</span><span className="text-slate-900">hrmny</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Region</span><span className="text-slate-900">Dubai + Riyadh</span></div>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ name, status, detail }) {
  const statusColors = {
    connected: 'bg-emerald-100 text-emerald-700',
    not_configured: 'bg-amber-100 text-amber-700',
    checking: 'bg-slate-100 text-slate-500',
  };
  const statusLabels = { connected: 'Connected', not_configured: 'Setup needed', checking: 'Checking...' };

  return (
    <div className="px-6 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`badge ${statusColors[status] || statusColors.not_configured}`}>{statusLabels[status] || status}</span>
    </div>
  );
}

function EnvVar({ name, desc, required }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <code className="text-rose-600">{name}</code>
        {required && <span className="text-red-500 ml-1">*</span>}
        <p className="text-xs text-slate-400 font-sans mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

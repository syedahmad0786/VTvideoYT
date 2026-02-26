import React, { useState } from 'react';

export default function Settings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your Sales & Growth workspace</p>
      </div>

      {/* Google Sheets Connection */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Google Sheets Connection</h2>
          <p className="text-sm text-slate-500 mt-1">Connect your outreach tracker Google Sheet</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="input"
            />
            <p className="text-xs text-slate-400 mt-1">Deploy the Apps Script webhook and paste the URL here</p>
          </div>
          <button onClick={handleSave} className="btn btn-primary">
            {saved ? 'Saved' : 'Save Connection'}
          </button>
        </div>
      </div>

      {/* Integration Status */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Integration Status</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <IntegrationRow name="Google Sheets" status="connected" detail="Outreach tracker + Companies" />
          <IntegrationRow name="Asana" status="connected" detail="Lead Pipeline 2026" />
          <IntegrationRow name="Apollo" status="connected" detail="Contact enrichment + email verification" />
          <IntegrationRow name="LinkedIn MCP" status="connected" detail="Connection requests + messaging" />
          <IntegrationRow name="Gmail" status="connected" detail="Auto-send emails + reply tracking" />
        </div>
      </div>

      {/* Workspace Info */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Workspace Info</h2>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="text-slate-900 font-medium">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Operator</span>
            <span className="text-slate-900">Ayham Homsi, Managing Partner</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Agency</span>
            <span className="text-slate-900">hrmny</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Region</span>
            <span className="text-slate-900">Dubai + Riyadh</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ name, status, detail }) {
  return (
    <div className="px-6 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`badge ${status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {status === 'connected' ? 'Connected' : 'Not connected'}
      </span>
    </div>
  );
}

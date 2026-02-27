import React from 'react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-rose-500 rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
      <p className="text-sm text-amber-700">
        <span className="font-medium">Demo Mode</span> — Showing sample data. Connect Supabase in Settings to see live data.
      </p>
    </div>
  );
}

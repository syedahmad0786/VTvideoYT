import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

const SEVERITY_COLORS = {
  low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const TYPE_ICONS = {
  legal: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  financial: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  hr: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  reputational: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  security: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
};

export default function RiskFlags() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: () => api.getRisks('all'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateRiskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const risks = data?.risks || [];
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'acknowledged');
  const closedRisks = risks.filter(r => r.status === 'mitigated' || r.status === 'closed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Flags</h1>
        <p className="text-sm text-gray-500 mt-1">Legal, financial, HR, and reputational risk tracking</p>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      {/* Open Risks */}
      {openRisks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3">
            Active Risks ({openRisks.length})
          </h3>
          <div className="space-y-4">
            {openRisks.map((risk) => (
              <div key={risk.id} className={`bg-white rounded-xl border-2 p-6 ${
                SEVERITY_COLORS[risk.severity]
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[risk.type] || TYPE_ICONS.security} />
                    </svg>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-bold uppercase">{risk.severity}</span>
                        <span className="text-xs opacity-75">{risk.type}</span>
                      </div>
                      <h3 className="font-semibold">{risk.title}</h3>
                      <p className="text-sm mt-1 opacity-90">{risk.description}</p>
                      {risk.source && (
                        <p className="text-xs mt-2 opacity-70">Source: {risk.source}</p>
                      )}
                      <p className="text-xs mt-1 opacity-60">
                        Flagged: {format(new Date(risk.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-current/10">
                  <button
                    onClick={() => updateMutation.mutate({ id: risk.id, status: 'acknowledged' })}
                    className="text-xs px-3 py-1.5 bg-white/50 rounded-lg hover:bg-white/80 font-medium"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: risk.id, status: 'mitigated' })}
                    className="text-xs px-3 py-1.5 bg-white/50 rounded-lg hover:bg-white/80 font-medium"
                  >
                    Mark Mitigated
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: risk.id, status: 'closed' })}
                    className="text-xs px-3 py-1.5 bg-white/50 rounded-lg hover:bg-white/80 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed Risks */}
      {closedRisks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Resolved ({closedRisks.length})
          </h3>
          <div className="space-y-2">
            {closedRisks.map((risk) => (
              <div key={risk.id} className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500">{risk.type}</span>
                  <span className="text-xs text-green-600 font-medium">{risk.status}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{risk.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {risks.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No risk flags. Malik is monitoring for legal, financial, HR, and reputational risks.</p>
        </div>
      )}
    </div>
  );
}

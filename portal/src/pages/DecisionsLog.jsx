import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

const STATUS_COLORS = {
  proposed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  deferred: 'bg-gray-100 text-gray-600',
};

export default function DecisionsLog() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: () => api.getDecisions(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }) => api.resolveDecision(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  });

  const decisions = data?.decisions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Decisions Log</h1>
        <p className="text-sm text-gray-500 mt-1">Decisions, rationale, and status tracking</p>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-4">
        {decisions.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'
                }`}>
                  {item.status}
                </span>
                {item.category && (
                  <span className="text-xs text-gray-400">{item.category}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {format(new Date(item.created_at), 'MMM d, yyyy')}
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">{item.decision}</h3>
            <p className="text-sm text-gray-600 mb-3">{item.rationale}</p>

            {item.options_considered?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Options Considered:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                  {item.options_considered.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </div>
            )}

            {item.status === 'proposed' && (
              <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => resolveMutation.mutate({ id: item.id, status: 'accepted' })}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ id: item.id, status: 'rejected' })}
                  className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={() => resolveMutation.mutate({ id: item.id, status: 'deferred' })}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Defer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {decisions.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No decisions logged yet.</p>
        </div>
      )}
    </div>
  );
}

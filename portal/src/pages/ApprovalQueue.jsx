import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

export default function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', showAll ? 'all' : 'pending'],
    queryFn: () => api.getApprovals(showAll ? 'all' : 'pending'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, decision, note }) => api.resolveApproval(id, decision, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
      setNoteFor(null);
      setNote('');
    },
  });

  const approvals = data?.approvals || [];

  const handleResolve = (id, decision) => {
    resolveMutation.mutate({ id, decision, note: noteFor === id ? note : '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Items waiting for your sign-off</p>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-malik-600 hover:text-malik-700 font-medium"
        >
          {showAll ? 'Show pending only' : 'Show all'}
        </button>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="space-y-4">
        {approvals.map((item) => (
          <div key={item.id} className={`bg-white rounded-xl border p-6 ${
            item.status === 'pending'
              ? 'border-malik-200 shadow-sm'
              : item.status === 'approved'
              ? 'border-green-200 opacity-75'
              : 'border-red-200 opacity-75'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    item.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    item.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Queued: {format(new Date(item.created_at), 'MMM d, HH:mm')}
                  {item.resolved_at && ` — Resolved: ${format(new Date(item.resolved_at), 'MMM d, HH:mm')}`}
                </p>
                {item.resolution_note && (
                  <p className="text-xs text-gray-500 mt-1 italic">Note: {item.resolution_note}</p>
                )}
              </div>
            </div>

            {item.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {noteFor === item.id && (
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note (optional)..."
                    className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-malik-500"
                  />
                )}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleResolve(item.id, 'approved')}
                    disabled={resolveMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleResolve(item.id, 'rejected')}
                    disabled={resolveMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setNoteFor(noteFor === item.id ? null : item.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    {noteFor === item.id ? 'Hide note' : 'Add note'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {approvals.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No pending approvals. Malik has nothing waiting for your sign-off.</p>
        </div>
      )}
    </div>
  );
}

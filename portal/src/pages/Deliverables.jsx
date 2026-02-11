import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

const TYPE_LABELS = {
  doc: 'Document',
  slide: 'Slides',
  sheet: 'Spreadsheet',
  canva: 'Canva Design',
  email_draft: 'Email Draft',
  proposal: 'Proposal',
  research: 'Research',
  other: 'Other',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
};

export default function DeliverablesList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['deliverables'],
    queryFn: () => api.getDeliverables(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateDeliverableStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliverables'] }),
  });

  const deliverables = data?.deliverables || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deliverables</h1>
        <p className="text-sm text-gray-500 mt-1">Drafts and documents ready for review</p>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliverables.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                {TYPE_LABELS[item.type] || item.type}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'
              }`}>
                {item.status}
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {format(new Date(item.updated_at), 'MMM d, HH:mm')}
              </p>
              <div className="flex items-center space-x-2">
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-malik-600 hover:text-malik-700 font-medium"
                  >
                    Open
                  </a>
                )}
                {item.status === 'draft' && (
                  <button
                    onClick={() => updateMutation.mutate({ id: item.id, status: 'in_review' })}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Mark for Review
                  </button>
                )}
                {item.status === 'in_review' && (
                  <button
                    onClick={() => updateMutation.mutate({ id: item.id, status: 'approved' })}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {deliverables.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No deliverables yet. Malik will create them as he works.</p>
        </div>
      )}
    </div>
  );
}

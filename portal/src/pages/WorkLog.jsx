import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  system: 'bg-gray-100 text-gray-700',
  inbox: 'bg-blue-100 text-blue-700',
  research: 'bg-purple-100 text-purple-700',
  proposal: 'bg-green-100 text-green-700',
  calendar: 'bg-cyan-100 text-cyan-700',
  meeting_prep: 'bg-indigo-100 text-indigo-700',
  talent: 'bg-pink-100 text-pink-700',
  draft: 'bg-amber-100 text-amber-700',
  automation: 'bg-teal-100 text-teal-700',
};

export default function WorkLog() {
  const { data, isLoading } = useQuery({
    queryKey: ['worklog'],
    queryFn: () => api.getWorkLog(100),
  });

  const logs = data?.logs || [];

  // Group by date
  const grouped = {};
  for (const log of logs) {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(log);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Work Log</h1>
        <p className="text-sm text-gray-500 mt-1">Timeline of everything Malik has done</p>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-gray-50 py-2">
            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {items.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        CATEGORY_COLORS[log.category] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {log.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(log.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{log.details}</p>
                    )}
                    {log.links?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {log.links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-malik-600 hover:text-malik-700 underline"
                          >
                            Link {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {logs.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No work logged yet. Malik will start logging as he works.</p>
        </div>
      )}
    </div>
  );
}

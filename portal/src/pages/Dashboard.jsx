import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.status });
  const { data: approvals } = useQuery({ queryKey: ['approvals'], queryFn: () => api.getApprovals() });
  const { data: worklog } = useQuery({ queryKey: ['worklog-recent'], queryFn: () => api.getWorkLog(5) });
  const { data: risks } = useQuery({ queryKey: ['risks'], queryFn: () => api.getRisks() });
  const { data: tasks } = useQuery({ queryKey: ['tasks-active'], queryFn: () => api.getTasks(true) });

  const stats = [
    { label: 'Pending Approvals', value: approvals?.approvals?.length || 0, color: 'blue', link: '/approvals' },
    { label: 'Active Tasks', value: tasks?.tasks?.length || 0, color: 'green', link: '/tasks' },
    { label: 'Open Risks', value: risks?.risks?.length || 0, color: 'red', link: '/risks' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — Dubai, UTC+4
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${
              stat.color === 'red' && stat.value > 0
                ? 'text-red-600'
                : stat.color === 'blue' && stat.value > 0
                ? 'text-malik-600'
                : 'text-gray-900'
            }`}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/worklog" className="text-sm text-malik-600 hover:text-malik-700">View all</Link>
          </div>
          <div className="space-y-3">
            {worklog?.logs?.length > 0 ? worklog.logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  log.category === 'system' ? 'bg-gray-400' :
                  log.category === 'inbox' ? 'bg-blue-400' :
                  log.category === 'research' ? 'bg-purple-400' :
                  log.category === 'proposal' ? 'bg-green-400' :
                  'bg-malik-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(log.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
            <Link to="/approvals" className="text-sm text-malik-600 hover:text-malik-700">View all</Link>
          </div>
          <div className="space-y-3">
            {approvals?.approvals?.length > 0 ? approvals.approvals.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start space-x-3 py-2 border-b border-gray-50 last:border-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded mt-0.5 ${
                  item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  item.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.type}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">No pending approvals</p>
            )}
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {risks?.risks?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="font-semibold text-red-800 mb-3">Active Risk Flags</h2>
          <div className="space-y-2">
            {risks.risks.map((risk) => (
              <div key={risk.id} className="flex items-center space-x-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  risk.severity === 'critical' ? 'bg-red-200 text-red-800' :
                  risk.severity === 'high' ? 'bg-amber-200 text-amber-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {risk.severity.toUpperCase()}
                </span>
                <p className="text-sm text-red-800">{risk.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

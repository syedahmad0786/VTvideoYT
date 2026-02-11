import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/worklog', label: 'Work Log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/approvals', label: 'Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'approvals' },
  { path: '/deliverables', label: 'Deliverables', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/decisions', label: 'Decisions', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { path: '/tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { path: '/risks', label: 'Risk Flags', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', badge: 'risks' },
];

export default function Sidebar({ open }) {
  const { data: statusData } = useQuery({
    queryKey: ['status'],
    queryFn: api.status,
    refetchInterval: 15000,
  });

  const badges = {
    approvals: statusData?.pendingApprovals || 0,
    risks: statusData?.openRisks || 0,
  };

  if (!open) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Malik Zaid</h1>
        <p className="text-xs text-gray-500 mt-1">Executive Agent for A'Y</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-malik-50 text-malik-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="flex-1">{item.label}</span>
            {item.badge && badges[item.badge] > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                item.badge === 'risks' ? 'bg-red-100 text-red-700' : 'bg-malik-100 text-malik-700'
              }`}>
                {badges[item.badge]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-500">Online</span>
        </div>
      </div>
    </aside>
  );
}

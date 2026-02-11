import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const PLATFORMS = [
  { id: 'google', name: 'Google Suite', desc: 'Gmail, Calendar, Drive, Docs, Sheets, Tasks', icon: 'G', color: 'bg-red-500', type: 'oauth' },
  { id: 'slack', name: 'Slack', desc: 'Channels, messages, team info', icon: 'S', color: 'bg-purple-600', type: 'oauth' },
  { id: 'notion', name: 'Notion', desc: 'Pages, databases, workspaces', icon: 'N', color: 'bg-gray-900', type: 'oauth' },
  { id: 'asana', name: 'Asana', desc: 'Tasks, projects, workspaces', icon: 'A', color: 'bg-orange-500', type: 'oauth' },
  { id: 'meta', name: 'Meta', desc: 'Facebook pages, Instagram insights', icon: 'M', color: 'bg-blue-600', type: 'oauth' },
  { id: 'discord', name: 'Discord', desc: 'Guilds, channels, members', icon: 'D', color: 'bg-indigo-500', type: 'oauth' },
  { id: 'telegram', name: 'Telegram', desc: 'Bot messages and updates', icon: 'T', color: 'bg-sky-500', type: 'token', label: 'Bot Token' },
  { id: 'canva', name: 'Canva', desc: 'Design assets (read-only)', icon: 'C', color: 'bg-teal-500', type: 'apikey', label: 'API Key' },
];

export default function Integrations() {
  const queryClient = useQueryClient();
  const [tokenInputs, setTokenInputs] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: api.getIntegrations,
    refetchInterval: 10000,
  });

  const connectMutation = useMutation({
    mutationFn: async (platform) => {
      const p = PLATFORMS.find(p => p.id === platform);
      if (p.type === 'oauth') {
        const result = await api.getAuthUrlFor(platform);
        window.location.href = result.authUrl;
      } else if (p.type === 'token') {
        await api.connectTelegram(tokenInputs[platform]);
        queryClient.invalidateQueries(['integrations']);
      } else if (p.type === 'apikey') {
        await api.connectCanva(tokenInputs[platform]);
        queryClient.invalidateQueries(['integrations']);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (platform) => api.disconnectPlatform(platform),
    onSuccess: () => queryClient.invalidateQueries(['integrations']),
  });

  const integrations = data?.integrations || {};

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Connect your platforms so Malik can access them with read-only permissions</p>
      </div>

      <div className="grid gap-4">
        {PLATFORMS.map((platform) => {
          const connected = integrations[platform.id]?.connected;

          return (
            <div key={platform.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                  {platform.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                  <p className="text-sm text-gray-500">{platform.desc}</p>
                  {connected && (
                    <span className="inline-flex items-center mt-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {!connected && (platform.type === 'token' || platform.type === 'apikey') && (
                  <input
                    type="password"
                    placeholder={platform.label}
                    value={tokenInputs[platform.id] || ''}
                    onChange={e => setTokenInputs(prev => ({ ...prev, [platform.id]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-malik-500"
                  />
                )}

                {connected ? (
                  <button
                    onClick={() => disconnectMutation.mutate(platform.id)}
                    disabled={disconnectMutation.isLoading}
                    className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connectMutation.mutate(platform.id)}
                    disabled={connectMutation.isLoading || ((platform.type === 'token' || platform.type === 'apikey') && !tokenInputs[platform.id])}
                    className="bg-malik-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-malik-700 disabled:opacity-50 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-medium text-amber-800">Read-Only Access</h3>
        <p className="text-sm text-amber-700 mt-1">
          All integrations use read-only scopes. Malik cannot send emails, post messages, or modify
          any data on your platforms. Any actions requiring external communication will be queued
          for your approval first.
        </p>
      </div>
    </div>
  );
}

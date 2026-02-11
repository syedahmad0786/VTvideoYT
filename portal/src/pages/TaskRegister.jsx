import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { format } from 'date-fns';

const STATUS_COLORS = {
  backlog: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
};

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  normal: 'text-gray-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

export default function TaskRegister() {
  const queryClient = useQueryClient();
  const [showDone, setShowDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', showDone ? 'all' : 'active'],
    queryFn: () => api.getTasks(!showDone),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateTaskStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tasks = data?.tasks || [];

  const grouped = {
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    backlog: tasks.filter(t => t.status === 'backlog'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Register</h1>
          <p className="text-sm text-gray-500 mt-1">What Malik has in flight + next milestones</p>
        </div>
        <button
          onClick={() => setShowDone(!showDone)}
          className="text-sm text-malik-600 hover:text-malik-700 font-medium"
        >
          {showDone ? 'Hide completed' : 'Show completed'}
        </button>
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      {['in_progress', 'blocked', 'backlog', 'done'].map((status) => {
        const items = grouped[status] || [];
        if (items.length === 0) return null;
        if (status === 'done' && !showDone) return null;

        return (
          <div key={status}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {status.replace('_', ' ')} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((task) => (
                <div key={task.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${
                  task.status === 'done' ? 'opacity-60' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          STATUS_COLORS[task.status]
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-400">{task.category}</span>
                      </div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                      {task.next_milestone && (
                        <p className="text-xs text-malik-600 mt-1">Next: {task.next_milestone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {format(new Date(task.created_at), 'MMM d')}
                        {task.due_date && ` — Due: ${format(new Date(task.due_date), 'MMM d')}`}
                      </p>
                    </div>

                    {task.status !== 'done' && (
                      <div className="flex items-center space-x-1 ml-4">
                        {task.status === 'backlog' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Start
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: task.id, status: 'done' })}
                            className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            Done
                          </button>
                        )}
                        {task.status === 'blocked' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Unblock
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p>No tasks in the register yet.</p>
        </div>
      )}
    </div>
  );
}

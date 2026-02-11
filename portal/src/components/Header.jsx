import React, { useState } from 'react';
import { api } from '../api/client';

export default function Header({ onMenuToggle }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMsg = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const result = await api.chat(userMsg);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        escalated: result.escalated,
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'error',
        content: `Error: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center px-4 py-2 bg-malik-600 text-white rounded-lg hover:bg-malik-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Talk to Malik
          </button>
        </div>
      </header>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed right-0 top-0 w-[420px] h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Malik Zaid</h2>
            <button onClick={() => setChatOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <p className="text-sm">Ask Malik anything or give him a task.</p>
                <p className="text-xs mt-2">He'll challenge you if he disagrees.</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-malik-600 text-white'
                    : msg.role === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : msg.escalated
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                  Malik is thinking...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Malik..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-malik-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-4 py-2 bg-malik-600 text-white rounded-lg hover:bg-malik-700 disabled:opacity-50 text-sm font-medium"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

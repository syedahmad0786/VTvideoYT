import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Companies from './pages/Companies';
import Outreach from './pages/Outreach';
import Settings from './pages/Settings';
import LoadingState from './components/LoadingState';

function ProtectedRoutes() {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Checking authentication..." />
      </div>
    );
  }

  // If Supabase auth is configured and user not logged in, show login
  if (configured && !user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/outreach" element={<Outreach />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoutes />
    </AuthProvider>
  );
}

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorkLog from './pages/WorkLog';
import ApprovalQueue from './pages/ApprovalQueue';
import DeliverablesList from './pages/Deliverables';
import DecisionsLog from './pages/DecisionsLog';
import TaskRegister from './pages/TaskRegister';
import RiskFlags from './pages/RiskFlags';
import Chat from './pages/Chat';
import Integrations from './pages/Integrations';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/worklog" element={<WorkLog />} />
        <Route path="/approvals" element={<ApprovalQueue />} />
        <Route path="/deliverables" element={<DeliverablesList />} />
        <Route path="/decisions" element={<DecisionsLog />} />
        <Route path="/tasks" element={<TaskRegister />} />
        <Route path="/risks" element={<RiskFlags />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

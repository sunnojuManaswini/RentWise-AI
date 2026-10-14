import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import WhatsAppModal from './components/whatsapp/WhatsAppModal';
import AiChatModal from './components/ai/AiChatModal';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PropertiesPage from './pages/PropertiesPage';
import UnitsPage from './pages/UnitsPage';
import TenantsPage from './pages/TenantsPage';
import LedgerPage from './pages/LedgerPage';
import AgreementsPage from './pages/AgreementsPage';
import DepositPage from './pages/DepositPage';
import MaintenancePage from './pages/MaintenancePage';
import EvidenceLockerPage from './pages/EvidenceLockerPage';
import DocumentsPage from './pages/DocumentsPage';
import AiAssistantPage from './pages/AiAssistantPage';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isWaOpen, setIsWaOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400 font-semibold">
        Initializing RentWise Security Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar onOpenAi={() => setIsAiOpen(true)} onOpenWhatsApp={() => setIsWaOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/dashboard" element={<Dashboard onOpenAi={() => setIsAiOpen(true)} onOpenWhatsApp={() => setIsWaOpen(true)} />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/agreements" element={<AgreementsPage />} />
            <Route path="/deposit" element={<DepositPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/evidence" element={<EvidenceLockerPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/ai-assistant" element={<AiAssistantPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <AiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      <WhatsAppModal isOpen={isWaOpen} onClose={() => setIsWaOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </LanguageProvider>
    </AuthProvider>
  );
}

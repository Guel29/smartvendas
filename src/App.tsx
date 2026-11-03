/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSalesData } from './hooks/useSalesData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { PDVList } from './components/PDVList';
import { TEFReconciliationView } from './components/TEFReconciliationView';
import { ReportsView } from './components/ReportsView';
import { AgentStatusView } from './components/AgentStatusView';
import { UserManagementView } from './components/UserManagementView';
import { DownloadsView } from './components/DownloadsView';
import { SecretAdminModal } from './components/SecretAdminModal';
import { LoginView } from './components/LoginView';
import { ActiveTab } from './types';
import { WifiOff, Shield, Sliders, Flame } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

function SmartVendasMain() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showSecretAdmin, setShowSecretAdmin] = useState<boolean>(false);
  const {
    summary,
    pdvs,
    hourly,
    loading,
    isRefreshing,
    countdown,
    isPaused,
    isOnline,
    refreshNow,
    togglePause,
  } = useSalesData();

  // ATALHO OCULTO TECLA [F8] PARA ABRIR O PAINEL ADMINISTRATIVO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setShowSecretAdmin((prev) => !prev);
      }
      if (e.key === 'Escape' && showSecretAdmin) {
        setShowSecretAdmin(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSecretAdmin]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* 1. Alerta de Conexão Offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50">
          <WifiOff className="w-4 h-4" />
          <span>Você está no modo offline. Exibindo os últimos dados recebidos do agente.</span>
        </div>
      )}

      {/* 2. Top Header com Controles em Tempo Real e Botão F8 */}
      <Header
        lastSyncAt={summary?.last_sync_at || null}
        syncStatus={summary?.sync_status || 'online'}
        countdown={countdown}
        isRefreshing={isRefreshing}
        onRefreshNow={refreshNow}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onOpenSecretAdmin={() => setShowSecretAdmin(true)}
      />

      {/* 3. Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 pb-24 md:pb-10">
        
        {/* Navegação por Abas */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Telas Principais */}
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={summary}
            hourly={hourly}
            pdvs={pdvs}
            loading={loading}
            onNavigateToPdvs={() => setActiveTab('pdvs')}
            onNavigateToTef={() => setActiveTab('tef')}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'pdvs' && (
          <PDVList pdvs={pdvs} loading={loading} />
        )}

        {activeTab === 'tef' && (
          <TEFReconciliationView />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}

        {activeTab === 'agents' && (
          <AgentStatusView />
        )}

        {activeTab === 'downloads' && (
          <DownloadsView />
        )}

        {activeTab === 'users' && (
          <UserManagementView />
        )}

      </main>

      {/* 4. Rodapé */}
      <footer className="py-4 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Vendas · Sistema de Acompanhamento em Tempo Real</span>
          
          <div className="flex items-center gap-3">
            <span>Compatível com VR Software & VR Master</span>
          </div>
        </div>
      </footer>

      {/* 5. MODAL DE CONFIGURAÇÃO OCULTA [F8] */}
      <SecretAdminModal
        isOpen={showSecretAdmin}
        onClose={() => setShowSecretAdmin(false)}
      />

    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/20 animate-pulse">
          <Flame className="w-7 h-7 text-emerald-100" />
        </div>
        <p className="text-base font-extrabold text-white tracking-tight">Smart Vendas</p>
        <p className="text-xs text-slate-400 mt-1">Validando credenciais e iniciando painel...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <SmartVendasMain />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

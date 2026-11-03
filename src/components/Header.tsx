import React, { useState } from 'react';
import {
  Store as StoreIcon,
  Calendar,
  Clock,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronDown,
  Check,
  Flame,
  Sliders,
  LogOut,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { UserRole } from '../types';
import { formatTimeOnly, formatDateBr } from '../utils/formatters';

interface HeaderProps {
  lastSyncAt: string | null;
  syncStatus: 'online' | 'delayed' | 'offline';
  countdown: number;
  isRefreshing: boolean;
  onRefreshNow: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenSecretAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastSyncAt,
  syncStatus,
  countdown,
  isRefreshing,
  onRefreshNow,
  isPaused,
  onTogglePause,
  onOpenSecretAdmin,
}) => {
  const {
    user,
    availableStores,
    activeStoreId,
    setActiveStoreId,
    activeDate,
    setActiveDate,
    dateShortcut,
    setDateShortcut,
    theme,
    toggleTheme,
    switchUserRole,
    canViewAllStores,
    isSimulating,
    setIsSimulating,
    logout,
    isMasterAdmin,
  } = useAuth();

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Manipular atalhos de data
  const handleDateShortcut = (shortcut: string) => {
    setDateShortcut(shortcut);
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (shortcut === 'hoje') {
      setActiveDate(formatter.format(now));
    } else if (shortcut === 'ontem') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      setActiveDate(formatter.format(yesterday));
    } else if (shortcut === '7dias') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setActiveDate(formatter.format(d));
    } else if (shortcut === 'mes_atual') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setActiveDate(formatter.format(firstDay));
    } else if (shortcut === 'mes_anterior') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setActiveDate(formatter.format(prevMonth));
    }
    setShowDateModal(false);
  };

  const getStatusBadge = () => {
    if (syncStatus === 'online') {
      return (
        <span
          title="Conexão com agente da loja ativa e respondendo em tempo real"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online (10s)</span>
        </span>
      );
    }
    if (syncStatus === 'delayed') {
      return (
        <span
          title="Última sincronização atrasada (> 30s)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Sinc. Atrasada</span>
        </span>
      );
    }
    return (
      <span
        title="Agente local não está respondendo. Verifique internet da loja."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
      >
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>Offline</span>
      </span>
    );
  };

  const roleNames: Record<UserRole, string> = {
    admin: 'Administrador Geral',
    owner: 'Proprietário (Rede)',
    manager: 'Gerente (Loja Centro)',
    viewer: 'Operador de Consulta',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Flame className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white truncate">
                  Smart Vendas
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  VR 10s
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                Supermercados em Tempo Real
              </p>
            </div>
          </div>

          {/* Seletor de Loja */}
          <div className="flex items-center gap-2 max-w-xs sm:max-w-sm">
            <div className="relative flex items-center">
              <StoreIcon className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={activeStoreId}
                onChange={(e) => setActiveStoreId(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer appearance-none truncate max-w-[150px] sm:max-w-[210px]"
              >
                {canViewAllStores && (
                  <option value="all">Todas as Lojas ({availableStores.length})</option>
                )}
                {availableStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Seletor de Data */}
            <div className="relative">
              <button
                onClick={() => setShowDateModal(!showDateModal)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline font-normal text-slate-500 dark:text-slate-400">Data:</span>
                <span className="font-semibold">{formatDateBr(activeDate)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {showDateModal && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 text-xs">
                  <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Período Rápido
                  </div>
                  <button
                    onClick={() => handleDateShortcut('hoje')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      dateShortcut === 'hoje'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Hoje (Tempo Real)
                  </button>
                  <button
                    onClick={() => handleDateShortcut('ontem')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      dateShortcut === 'ontem'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Ontem
                  </button>
                  <button
                    onClick={() => handleDateShortcut('7dias')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      dateShortcut === '7dias'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => handleDateShortcut('mes_atual')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      dateShortcut === 'mes_atual'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Mês Atual
                  </button>
                  <button
                    onClick={() => handleDateShortcut('mes_anterior')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                      dateShortcut === 'mes_anterior'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Mês Anterior
                  </button>
                  
                  <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800">
                    <label className="block px-2 text-[10px] text-slate-400 font-medium mb-1">
                      Data Específica:
                    </label>
                    <input
                      type="date"
                      value={activeDate}
                      onChange={(e) => {
                        setActiveDate(e.target.value);
                        setDateShortcut('custom');
                        setShowDateModal(false);
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status, Atualização e Controles */}
          <div className="flex items-center gap-2">
            
            {/* Status da Sincronização */}
            <div className="hidden lg:flex items-center gap-2">
              {getStatusBadge()}

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Último sync:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatTimeOnly(lastSyncAt)}
                </span>
              </div>
            </div>

            {/* Contador de 10s e Botão Atualizar */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={onRefreshNow}
                disabled={isRefreshing}
                title="Atualizar agora imediatamente"
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`}
                />
                <span className="hidden sm:inline">
                  {isPaused ? 'Pausado' : `${countdown}s`}
                </span>
              </button>

              <button
                onClick={onTogglePause}
                title={isPaused ? 'Retomar atualização a cada 10s' : 'Pausar contagem de 10s'}
                className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {isPaused ? '▶' : '⏸'}
              </button>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* Alternar Tema Claro / Escuro */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Perfil & RBAC Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleModal(!showRoleModal)}
                title={isMasterAdmin ? 'Admin Master - Perfil Total Liberado' : 'Perfil de Acesso (RBAC)'}
                className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  isMasterAdmin
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {isMasterAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="hidden xl:inline max-w-[130px] truncate">
                  {user ? user.name.split(' ')[0] : 'Usuário'}
                </span>
                <span
                  className={`text-[10px] uppercase font-black px-1 py-0.2 rounded ${
                    isMasterAdmin
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                      : 'text-slate-400 font-semibold'
                  }`}
                >
                  {isMasterAdmin ? 'MASTER' : user?.role}
                </span>
              </button>

              {showRoleModal && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {user?.name || 'Administrador'}
                      </p>
                      {isMasterAdmin && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Crown className="w-3 h-3" />
                          <span>Admin Master</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {user?.email}
                    </p>
                    <p className="mt-1.5 inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      {isMasterAdmin ? 'Perfil Total Liberado (Ilimitado)' : `Perfil Atual: ${user ? (roleNames[user.role] || user.role || 'Usuário') : ''}`}
                    </p>
                  </div>

                  {isMasterAdmin && (
                    <div className="my-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                      <strong>Acesso Total Concedido:</strong> Este usuário tem privilégios irrestritos sobre todas as lojas, caixas, TEF, relatórios, cadastros e configurações do sistema.
                    </div>
                  )}

                  <div className="mt-2 space-y-1">
                    <p className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Alternar Visualização de Perfil
                    </p>
                    {(['admin', 'owner', 'manager', 'viewer'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          switchUserRole(r);
                          setShowRoleModal(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition font-medium ${
                          user?.role === r
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{roleNames[r]}</div>
                          <div className={`text-[10px] ${user?.role === r ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {r === 'admin' && 'Acesso total a todas as lojas e agentes'}
                            {r === 'owner' && 'Visualiza todas as lojas da rede'}
                            {r === 'manager' && 'Apenas Loja Centro autorizada'}
                            {r === 'viewer' && 'Apenas leitura de relatórios'}
                          </div>
                        </div>
                        {user?.role === r && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>

                  {/* Acesso Direto à Configuração Oculta F8 */}
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setShowRoleModal(false);
                        onOpenSecretAdmin();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Abrir Configuração Oculta [F8]</span>
                    </button>
                  </div>

                  {/* Botão Sair do Sistema */}
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setShowRoleModal(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs transition"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sair do Sistema (Fazer Logout)</span>
                    </button>
                  </div>

                  {/* Toggle de Simulação ao Vivo */}
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Simular vendas a cada 10s:
                      </span>
                      <input
                        type="checkbox"
                        checked={isSimulating}
                        onChange={(e) => setIsSimulating(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Logout Direto no Topo */}
            <button
              onClick={logout}
              title="Sair do Sistema (Fazer Logout)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Sair</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};

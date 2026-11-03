import React from 'react';
import {
  LayoutDashboard,
  Layers,
  QrCode,
  FileSpreadsheet,
  Download,
  Store,
  Users,
  Search,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdvs' as ActiveTab, label: 'PDVs / Caixas', icon: Layers },
    { id: 'tef' as ActiveTab, label: 'TEF & Pix', icon: QrCode },
    { id: 'reports' as ActiveTab, label: 'Consulta Vendas', icon: Search },
    { id: 'agents' as ActiveTab, label: 'Lojas & Agentes', icon: Store },
    { id: 'downloads' as ActiveTab, label: 'Downloads', icon: Download },
    ...(isAdminOrOwner ? [{ id: 'users' as ActiveTab, label: 'Usuários', icon: Users }] : []),
  ];

  return (
    <>
      {/* 1. NAVEGAÇÃO DESKTOP / TABLET (TABS NO TOPO) */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold my-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. BARRA DE NAVEGAÇÃO INFERIOR NO CELULAR (MOBILE BOTTOM BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition min-w-[56px] ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

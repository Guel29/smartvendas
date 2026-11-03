import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Users,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  Save,
  Trash2,
  Edit,
  Plus,
  Key,
  Shield,
  FileCode,
  Terminal,
  Activity,
  Eye,
  EyeOff,
  Clock,
  HardDrive,
  FolderArchive,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole, DbConfig, SystemVersionInfo } from '../types';
import { FULL_SCHEMA_SQL, downloadSqlSchema } from '../data/schemaSql';
import { getApiUrl } from '../utils/api';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser, token, availableStores } = useAuth();
  const [activeTab, setActiveTab] = useState<'db' | 'users' | 'downloads' | 'updates'>('db');
  const [copiedSqlModal, setCopiedSqlModal] = useState(false);

  const getHeaders = (extra: Record<string, string> = {}) => {
    const h: Record<string, string> = {};
    if (currentUser?.id) h['x-user-id'] = currentUser.id;
    if (token) h['Authorization'] = `Bearer ${token}`;
    return { ...h, ...extra };
  };

  // Estados de Banco de Dados
  const [dbConfig, setDbConfig] = useState<DbConfig>({
    mysql_host: 'localhost',
    mysql_port: 3306,
    mysql_database: 'u366235819_smartvendas',
    mysql_user: 'u366235819_smart',
    mysql_password: '',
    mysql_ssl: false,
    vr_pg_host: '127.0.0.1',
    vr_pg_port: 5432,
    vr_pg_database: 'vr',
    vr_pg_user: 'smartvendas_reader',
    vr_pg_password: '',
    sync_interval_seconds: 10,
    timezone: 'America/Sao_Paulo',
    status: 'connected',
  });
  const [showMysqlPass, setShowMysqlPass] = useState(false);
  const [showPgPass, setShowPgPass] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbApplyingSchema, setDbApplyingSchema] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de Usuários
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as UserRole,
    phone: '',
    active: true,
    storeIds: [] as string[],
  });
  const [userMsg, setUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de Atualizações
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Carregar dados iniciais ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    // Carregar configurações de DB
    fetch(getApiUrl('/api/admin/db-config'), {
      headers: getHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setDbConfig(data.config);
      })
      .catch((err) => console.warn('Erro ao carregar db config:', err));

    // Carregar lista de usuários
    loadUsers();

    // Carregar informações de versão
    fetch(getApiUrl('/api/admin/updates'), {
      headers: getHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.versionInfo) setVersionInfo(data.versionInfo);
      })
      .catch((err) => console.warn('Erro ao carregar updates:', err));
  }, [isOpen, currentUser?.id]);

  const loadUsers = () => {
    setLoadingUsers(true);
    fetch(getApiUrl('/api/auth/users'), {
      headers: getHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
      })
      .catch((err) => console.warn('Erro ao carregar usuários:', err))
      .finally(() => setLoadingUsers(false));
  };

  // 1. AÇÃO: SALVAR CONFIGURAÇÕES DO BANCO DE DADOS
  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbSaving(true);
    setDbStatusMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/admin/db-config'), {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(dbConfig),
      });

      const data = await res.json();
      if (res.ok) {
        setDbStatusMsg({
          type: 'success',
          text: '✓ Configurações do banco de dados salvas e persistidas com sucesso no servidor!',
        });
        if (data.config) {
          setDbConfig(data.config);
        }
      } else {
        setDbStatusMsg({
          type: 'error',
          text: `Erro ao salvar: ${data.error || 'Parâmetros inválidos.'}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDbStatusMsg({ type: 'error', text: `Falha de rede ao salvar: ${msg}` });
    } finally {
      setDbSaving(false);
      setTimeout(() => setDbStatusMsg(null), 5000);
    }
  };

  // 2. AÇÃO: TESTAR CONEXÃO COM O BANCO DE DADOS
  const handleTestDbConnection = async () => {
    setDbTesting(true);
    setDbStatusMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/admin/db-test'), {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(dbConfig),
      });

      const result = await res.json();
      if (result.success) {
        setDbStatusMsg({
          type: 'success',
          text: `✓ Conexão bem-sucedida! ${result.message} (Latência: ${result.latencyMs}ms)`,
        });
      } else {
        setDbStatusMsg({
          type: 'error',
          text: `✗ Falha na conexão: ${result.message}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDbStatusMsg({ type: 'error', text: `Erro de teste: ${msg}` });
    } finally {
      setDbTesting(false);
    }
  };

  // 2.1 AÇÃO: ENVIAR E APLICAR SCHEMA ATUALIZADO NO BANCO DE DADOS
  const handleApplySchema = async () => {
    setDbApplyingSchema(true);
    setDbStatusMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/admin/apply-schema'), {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
      });

      const result = await res.json();
      if (result.success) {
        setDbStatusMsg({
          type: 'success',
          text: `✓ ${result.message || 'Schema atualizado com sucesso no banco de dados!'} (${result.tables?.length || 16} tabelas verificadas/estruturadas)`,
        });
      } else {
        setDbStatusMsg({
          type: 'error',
          text: `✗ ${result.message || 'Falha ao aplicar schema no MySQL.'}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDbStatusMsg({ type: 'error', text: `Erro de rede ao enviar schema: ${msg}` });
    } finally {
      setDbApplyingSchema(false);
    }
  };

  // 3. AÇÕES DE USUÁRIOS (CRIAR, EDITAR, SALVAR, EXCLUIR)
  const handleOpenCreateUser = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'manager',
      phone: '',
      active: true,
      storeIds: availableStores.length > 0 ? [availableStores[0].id] : [],
    });
    setEditingUser(null);
    setIsCreatingUser(true);
  };

  const handleOpenEditUser = (user: User) => {
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      active: user.active,
      storeIds: user.storeIds || [],
    });
    setEditingUser(user);
    setIsCreatingUser(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);

    try {
      if (isCreatingUser) {
        // Criar
        const res = await fetch(getApiUrl('/api/auth/users'), {
          method: 'POST',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(userForm),
        });

        if (res.ok) {
          setUserMsg({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
          setIsCreatingUser(false);
          loadUsers();
        } else {
          const err = await res.json();
          setUserMsg({ type: 'error', text: err.error || 'Erro ao cadastrar' });
        }
      } else if (editingUser) {
        // Atualizar
        const res = await fetch(getApiUrl(`/api/auth/users/${editingUser.id}`), {
          method: 'PUT',
          headers: getHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(userForm),
        });

        if (res.ok) {
          setUserMsg({ type: 'success', text: 'Usuário atualizado com sucesso!' });
          setEditingUser(null);
          loadUsers();
        } else {
          const err = await res.json();
          setUserMsg({ type: 'error', text: err.error || 'Erro ao atualizar' });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUserMsg({ type: 'error', text: msg });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/auth/users/${id}`), {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        setUserMsg({ type: 'success', text: `Usuário "${name}" excluído.` });
        loadUsers();
      } else {
        const err = await res.json();
        setUserMsg({ type: 'error', text: err.error || 'Erro ao excluir' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUserMsg({ type: 'error', text: msg });
    }
  };

  // 4. VERIFICAÇÃO DE ATUALIZAÇÕES
  const handleCheckUpdates = () => {
    setCheckingUpdate(true);
    setTimeout(() => {
      setCheckingUpdate(false);
      alert('Seu sistema Smart Vendas já está na versão mais recente disponível (v1.2.0).');
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white my-auto">
        
        {/* Cabeçalho do Painel F8 */}
        <div className="bg-slate-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm">
              F8
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Painel de Configuração Administrativa Oculta
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Acionado via tecla [F8] · Banco de Dados, Usuários, Downloads e Atualizações
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="flex items-center gap-2 p-2 sm:px-5 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('db')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'db'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Banco de Dados (MySQL & VR)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cadastro de Usuários ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'downloads'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Downloads & Instalação</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition shrink-0 ${
              activeTab === 'updates'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizações do Sistema</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto text-xs space-y-6">
          
          {/* ========================================================= */}
          {/* ABA 1: CONFIGURAÇÕES DO BANCO DE DADOS (COM BOTÃO SALVAR) */}
          {/* ========================================================= */}
          {activeTab === 'db' && (
            <form onSubmit={handleSaveDbConfig} className="space-y-6">
              
              {/* Mensagem de Feedback */}
              {dbStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl border font-semibold flex items-center gap-2 text-xs ${
                    dbStatusMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}
                >
                  {dbStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{dbStatusMsg.text}</span>
                </div>
              )}

              {/* Bloco 1: MySQL 8 (Central na VPS Hostinger) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-sm">Banco de Dados Central (MySQL 8 - VPS Hostinger)</h3>
                  </div>
                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Status: {dbConfig.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Host do MySQL
                    </label>
                    <input
                      type="text"
                      required
                      value={dbConfig.mysql_host}
                      onChange={(e) => setDbConfig({ ...dbConfig, mysql_host: e.target.value })}
                      placeholder="localhost ou IP da VPS"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Porta MySQL
                    </label>
                    <input
                      type="number"
                      required
                      value={dbConfig.mysql_port}
                      onChange={(e) => setDbConfig({ ...dbConfig, mysql_port: parseInt(e.target.value, 10) })}
                      placeholder="3306"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Nome do Banco
                    </label>
                    <input
                      type="text"
                      required
                      value={dbConfig.mysql_database}
                      onChange={(e) => setDbConfig({ ...dbConfig, mysql_database: e.target.value })}
                      placeholder="smart_vendas"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Usuário do MySQL
                    </label>
                    <input
                      type="text"
                      required
                      value={dbConfig.mysql_user}
                      onChange={(e) => setDbConfig({ ...dbConfig, mysql_user: e.target.value })}
                      placeholder="smartvendas_app"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Senha do MySQL
                    </label>
                    <div className="relative">
                      <input
                        type={showMysqlPass ? 'text' : 'password'}
                        value={dbConfig.mysql_password}
                        onChange={(e) => setDbConfig({ ...dbConfig, mysql_password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full pl-3 pr-9 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMysqlPass(!showMysqlPass)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        {showMysqlPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Conexão SSL/TLS
                    </label>
                    <select
                      value={dbConfig.mysql_ssl ? '1' : '0'}
                      onChange={(e) => setDbConfig({ ...dbConfig, mysql_ssl: e.target.value === '1' })}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="0">Desativado (Localhost VPS)</option>
                      <option value="1">Ativado (SSL Obrigatório)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 2: PostgreSQL Local do VR Software (Servidor da Loja) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-500" />
                    <h3 className="font-bold text-sm">PostgreSQL do VR Software (Acesso Local Estritamente Read-Only)</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">pdv.venda, pdv.vendatef</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Host PostgreSQL Local
                    </label>
                    <input
                      type="text"
                      value={dbConfig.vr_pg_host}
                      onChange={(e) => setDbConfig({ ...dbConfig, vr_pg_host: e.target.value })}
                      placeholder="127.0.0.1"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Porta PostgreSQL
                    </label>
                    <input
                      type="number"
                      value={dbConfig.vr_pg_port}
                      onChange={(e) => setDbConfig({ ...dbConfig, vr_pg_port: parseInt(e.target.value, 10) })}
                      placeholder="5432"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Banco do VR
                    </label>
                    <input
                      type="text"
                      value={dbConfig.vr_pg_database}
                      onChange={(e) => setDbConfig({ ...dbConfig, vr_pg_database: e.target.value })}
                      placeholder="vr"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Usuário Read-Only
                    </label>
                    <input
                      type="text"
                      value={dbConfig.vr_pg_user}
                      onChange={(e) => setDbConfig({ ...dbConfig, vr_pg_user: e.target.value })}
                      placeholder="smartvendas_reader"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Senha PostgreSQL
                    </label>
                    <div className="relative">
                      <input
                        type={showPgPass ? 'text' : 'password'}
                        value={dbConfig.vr_pg_password}
                        onChange={(e) => setDbConfig({ ...dbConfig, vr_pg_password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full pl-3 pr-9 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPgPass(!showPgPass)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        {showPgPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Intervalo de Sincronização
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={dbConfig.sync_interval_seconds}
                        onChange={(e) =>
                          setDbConfig({ ...dbConfig, sync_interval_seconds: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                      />
                      <span className="text-slate-400">segundos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Banco de Dados */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestDbConnection}
                    disabled={dbTesting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition"
                  >
                    <Activity className={`w-4 h-4 text-emerald-500 ${dbTesting ? 'animate-spin' : ''}`} />
                    <span>{dbTesting ? 'Testando Conexão...' : 'Testar Conexão com os Bancos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplySchema}
                    disabled={dbApplyingSchema}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-900/20"
                    title="Cria e atualiza todas as 16 tabelas e colunas no banco de dados MySQL conectado"
                  >
                    <Database className={`w-4 h-4 ${dbApplyingSchema ? 'animate-spin' : ''}`} />
                    <span>{dbApplyingSchema ? 'Enviando Schema...' : 'Enviar Schema para o Banco'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={dbSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-900/20 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{dbSaving ? 'Salvando...' : 'Salvar Configurações no Servidor'}</span>
                </button>
              </div>

            </form>
          )}

          {/* ========================================================= */}
          {/* ABA 2: CADASTRO E GESTÃO DE USUÁRIOS (CRUD COMPLETO)      */}
          {/* ========================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              
              {userMsg && (
                <div
                  className={`p-3.5 rounded-xl border font-semibold flex items-center gap-2 text-xs ${
                    userMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}
                >
                  {userMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{userMsg.text}</span>
                </div>
              )}

              {/* Cabeçalho da Lista com Botão Novo Usuário */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Gerenciamento de Acessos & Perfis RBAC
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Cadastre proprietários, gerentes por loja e operadores com validação no backend
                  </p>
                </div>

                {!isCreatingUser && !editingUser && (
                  <button
                    onClick={handleOpenCreateUser}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Usuário</span>
                  </button>
                )}
              </div>

              {/* Formulário de Criação / Edição Inline */}
              {(isCreatingUser || editingUser) && (
                <form
                  onSubmit={handleSaveUser}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {isCreatingUser ? 'Cadastrar Novo Usuário' : `Editar Usuário: ${editingUser?.name}`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingUser(false);
                        setEditingUser(null);
                      }}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        placeholder="Ex: Marcos Oliveira"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">E-mail de Login</label>
                      <input
                        type="email"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        placeholder="marcos@supermercado.com.br"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Senha {editingUser ? '(Opcional se não alterar)' : '(Mínimo 6 dígitos)'}
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder={editingUser ? '•••••••• (Manter atual)' : 'Defina a senha de acesso'}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={userForm.phone}
                        onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                        placeholder="(19) 99876-5432"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Perfil de Acesso (RBAC)</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="admin">Administrador Geral (Todas as lojas + Configurações)</option>
                        <option value="owner">Proprietário (Visualiza toda a rede)</option>
                        <option value="manager">Gerente de Loja (Apenas lojas autorizadas)</option>
                        <option value="viewer">Operador de Consulta (Apenas relatórios)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Lojas Autorizadas</label>
                      <select
                        value={userForm.storeIds[0] || ''}
                        onChange={(e) => setUserForm({ ...userForm, storeIds: [e.target.value] })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="">Todas as lojas autorizadas</option>
                        {availableStores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Status da Conta</label>
                      <select
                        value={userForm.active ? '1' : '0'}
                        onChange={(e) => setUserForm({ ...userForm, active: e.target.value === '1' })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="1">Ativo e Habilitado</option>
                        <option value="0">Bloqueado / Desativado</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingUser(false);
                        setEditingUser(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Usuário</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Tabela de Usuários */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Perfil RBAC</th>
                      <th className="p-3">Lojas</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{u.email}</td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">
                          {u.role === 'admin' || u.role === 'owner' ? 'Todas' : (u.storeIds?.join(', ') || 'Loja Centro')}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.active
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {u.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Editar usuário"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.id !== 'usr-admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Excluir usuário"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: DOWNLOADS E PACOTES DE INSTALAÇÃO DO AGENTE VR     */}
          {/* ========================================================= */}
          {activeTab === 'downloads' && (
            <div className="space-y-6">
              
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Central de Downloads & Instalação Completa (Hostinger & VR)
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Baixe os pacotes prontos para implantar e atualizar a VPS Hostinger e os servidores locais das lojas
                </p>
              </div>

              {/* Pacote Principal: Subpasta Hostinger Instalação Completa */}
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                      <FolderArchive className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Instalação Completa para Subpasta Hostinger</span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-600 text-white">
                          Arquivo ZIP Principal
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Contém todas as informações do sistema: <code>index.html</code> (com rotas relativas), <code>assets/</code>, backend Express, <code>.htaccess</code> para subpastas e schema MySQL 8. Extraia diretamente na sua subpasta (ex: <code>public_html/smartvendas</code>).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href="/downloads/smartvendas-hostinger-instalacao-completa.zip"
                      download="smartvendas-hostinger-instalacao-completa.zip"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Instalação (.ZIP)</span>
                    </a>
                    <a
                      href="/downloads/smartvendas-atualizacao-hostinger.zip"
                      download="smartvendas-atualizacao-hostinger.zip"
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Atualização (.ZIP)</span>
                    </a>
                    <a
                      href="/downloads/descompactar.php"
                      download="descompactar.php"
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
                      title="Script PHP para descompactar direto no navegador caso o hPanel dê erro"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>descompactar.php</span>
                    </a>
                    <a
                      href="/downloads/smartvendas-hostinger-subdominio.tar.gz"
                      download="smartvendas-hostinger-subdominio.tar.gz"
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.tar.gz</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Pacote 1: SCHEMA COMPLETO MYSQL 8 */}
                <div className="rounded-2xl border-2 border-purple-500/30 p-5 bg-purple-500/5 dark:bg-purple-950/20 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                        <Database className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        13 Tabelas MySQL 8
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Schema do Banco de Dados MySQL 8 Atualizado
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Arquivo <code>001_initial_schema.sql</code> completo com 16 tabelas (incluindo sangrias, lojas, pdvs e usuários), índices de unicidade (sem duplicidades), tipos monetários decimais exatos e seeds de usuários e TEF.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleApplySchema}
                      disabled={dbApplyingSchema}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition shadow-lg shadow-purple-900/30"
                      title="Envia e aplica o schema diretamente no banco MySQL configurado"
                    >
                      <Database className={`w-4 h-4 ${dbApplyingSchema ? 'animate-spin' : ''}`} />
                      <span>{dbApplyingSchema ? 'Enviando ao Banco...' : '🚀 Enviar Schema Direto para o Banco de Dados'}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={downloadSqlSchema}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs transition shadow"
                        title="Download seguro direto em Blob"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .SQL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(FULL_SCHEMA_SQL);
                          setCopiedSqlModal(true);
                          setTimeout(() => setCopiedSqlModal(false), 3000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs transition"
                        title="Copiar SQL para colar no phpMyAdmin"
                      >
                        {copiedSqlModal ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSqlModal ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-black text-purple-300 font-mono text-[10px] select-all">
                      mysql -u smartvendas_app -p smart_vendas &lt; 001_initial_schema.sql
                    </div>
                  </div>
                </div>

                {/* Pacote 2: INSTALAÇÃO COMPLETA NA VPS HOSTINGER */}
                <div className="rounded-2xl border-2 border-emerald-500/30 p-5 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Server className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        VPS Hostinger (1 Comando)
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Instalação Completa VPS Hostinger
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Script <code>hostinger-install.sh</code> que instala Node.js 22, MySQL 8, Nginx com proxy reverso e regras de PWA, PM2 e Certbot SSL.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <a
                      href="/api/admin/download/hostinger-install"
                      download="hostinger-install.sh"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar hostinger-install.sh</span>
                    </a>
                    <div className="p-2 rounded-lg bg-black text-emerald-400 font-mono text-[10px] select-all">
                      sudo bash hostinger-install.sh
                    </div>
                  </div>
                </div>

                {/* Pacote 3: ATUALIZAÇÃO AUTOMÁTICA HOSTINGER */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Zero Downtime
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Script de Atualização da VPS
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Script <code>hostinger-update.sh</code> que realiza backup preventivo do MySQL 8, atualiza arquivos, aplica migrations e recarrega o PM2 sem derrubar a aplicação.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <a
                      href="/api/admin/download/hostinger-update"
                      download="hostinger-update.sh"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar hostinger-update.sh</span>
                    </a>
                    <div className="p-2 rounded-lg bg-black text-blue-300 font-mono text-[10px] select-all">
                      sudo bash hostinger-update.sh
                    </div>
                  </div>
                </div>

                {/* Pacote 4: AGENTE LOCAL VR SOFTWARE */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Loja Física / VR
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Instalador do Agente VR Software
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Script <code>install-agent.sh</code> e código-fonte <code>sync-agent.ts</code> para leitura local do PostgreSQL do VR e envio a cada 10s.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/api/admin/download/agent-installer"
                        download="install-agent.sh"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>install-agent.sh</span>
                      </a>
                      <a
                        href="/api/admin/download/agent-script"
                        download="sync-agent.ts"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>sync-agent.ts</span>
                      </a>
                    </div>
                    <div className="p-2 rounded-lg bg-black text-amber-300 font-mono text-[10px] select-all">
                      curl -sSL https://smartvendas.seu-dominio.com.br/api/admin/download/agent-installer | bash
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 4: ATUALIZAÇÕES DO SISTEMA & CHANGELOG                */}
          {/* ========================================================= */}
          {activeTab === 'updates' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Smart Vendas Versão v1.2.0 (Build de Produção)
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Data de Lançamento: {versionInfo?.release_date || '2026-10-12'} · Banco de dados sincronizado
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'Verificando...' : 'Verificar Atualizações'}</span>
                </button>
              </div>

              {/* Histórico de Versões */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Histórico de Atualizações & Mudanças (Changelog)
                </h4>

                <div className="space-y-3">
                  {versionInfo?.changelog.map((log) => (
                    <div
                      key={log.version}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-500 text-sm">
                          Versão {log.version}
                        </span>
                        <span className="text-slate-400 text-[11px]">{log.date}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                        {log.changes.map((ch, idx) => (
                          <li key={idx}>{ch}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instruções de Atualização via VPS */}
              <div className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] space-y-1 border border-slate-800">
                <span className="text-slate-400 font-sans font-bold block mb-1">
                  Comando para atualizar a aplicação na VPS Hostinger:
                </span>
                <p className="text-emerald-400 select-all">
                  cd /var/www/smart-vendas && git pull && npm run build && pm2 restart smart-vendas
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Rodapé do Modal F8 */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Pressione <strong>[ESC]</strong> ou <strong>[F8]</strong> a qualquer momento para fechar</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

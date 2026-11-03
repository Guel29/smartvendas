import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Key,
  Copy,
  RefreshCw,
  Terminal,
  Database,
  Shield,
  FileCode,
  Check,
  Plus,
  Trash2,
  Edit,
  Store as StoreIcon,
  X,
  ShieldCheck,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SyncLog, Store } from '../types';
import { formatTimeOnly, formatDateBr } from '../utils/formatters';
import { getApiUrl } from '../utils/api';

export const AgentStatusView: React.FC = () => {
  const { availableStores, user, token, canManageTef, refetchStores, canViewAllStores } = useAuth();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'setup'>('status');

  // Estados para Criação e Edição de Loja
  const [showNewStoreModal, setShowNewStoreModal] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [newStoreSuccess, setNewStoreSuccess] = useState<{ store: Store; agentKey: string } | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);

  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    cnpj: '',
    city: '',
    state: 'SP',
    agentKey: '',
  });

  const generateUniqueKey = (code?: string): string => {
    const clean = (code || '002').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const rand = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
    return `sv_live_${clean || 'loja'}_${rand}`;
  };

  const handleOpenNewStoreModal = () => {
    setStoreError(null);
    const nextCode = `00${availableStores.length + 1}`.slice(-3);
    const key = generateUniqueKey(nextCode);
    setStoreForm({
      code: nextCode,
      name: '',
      cnpj: '',
      city: '',
      state: 'SP',
      timezone: 'America/Sao_Paulo',
      agentKey: key,
    });
    setShowNewStoreModal(true);
  };

  const handleRegenerateNewStoreKey = () => {
    const key = generateUniqueKey(storeForm.code || 'loja');
    setStoreForm((prev) => ({ ...prev, agentKey: key }));
  };

  const handleOpenEditStore = (store: Store) => {
    setEditingStore(store);
    setEditForm({
      code: store.code,
      name: store.name,
      cnpj: store.cnpj || '',
      city: store.city || '',
      state: store.state || 'SP',
      agentKey: store.agentKeyPrefix || '',
    });
  };

  const handleRegenerateEditKey = () => {
    const key = generateUniqueKey(editForm.code || editingStore?.code || 'loja');
    setEditForm((prev) => ({ ...prev, agentKey: key }));
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    setIsUpdatingStore(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl(`/api/stores/${editingStore.id}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar loja');
      }

      await refetchStores();
      setEditingStore(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro ao atualizar loja: ${msg}`);
    } finally {
      setIsUpdatingStore(false);
    }
  };

  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    cnpj: '',
    city: '',
    state: 'SP',
    timezone: 'America/Sao_Paulo',
    agentKey: '',
  });

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/sync/logs'), { headers });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user?.id]);

  const handleCopyKey = (keyToCopy: string) => {
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(keyToCopy);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.code.trim() || !storeForm.name.trim()) {
      setStoreError('Código e Nome da loja são obrigatórios.');
      return;
    }

    setIsCreatingStore(true);
    setStoreError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/stores'), {
        method: 'POST',
        headers,
        body: JSON.stringify(storeForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar loja');
      }

      // Atualiza lista de lojas globalmente
      await refetchStores();

      const createdKey = data.agentKey || data.store?.agentKey || storeForm.agentKey.trim() || `sv_live_${storeForm.code.toLowerCase()}_key`;
      const createdStore: Store = data.store || {
        id: `store-${storeForm.code.toLowerCase()}`,
        code: storeForm.code.toUpperCase(),
        name: storeForm.name,
        cnpj: storeForm.cnpj,
        city: storeForm.city,
        state: storeForm.state,
        timezone: storeForm.timezone,
        active: true,
        agentKeyPrefix: createdKey,
        agentStatus: 'offline',
        lastSyncAt: null,
        agentVersion: '1.3.0',
      };

      setNewStoreSuccess({
        store: createdStore,
        agentKey: createdKey,
      });

      setShowNewStoreModal(false);
      setStoreForm({
        code: '',
        name: '',
        cnpj: '',
        city: '',
        state: 'SP',
        timezone: 'America/Sao_Paulo',
        agentKey: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStoreError(msg);
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleDeleteStore = async (storeId: string, storeCode: string) => {
    if (storeCode === '001') {
      alert('A Loja Principal (001) não pode ser excluída.');
      return;
    }

    if (!confirm(`Deseja realmente remover a Loja ${storeCode}? Os dados históricos dessa filial não serão mais exibidos.`)) {
      return;
    }

    setDeletingStoreId(storeId);
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl(`/api/stores/${storeId}`), {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        await refetchStores();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao remover loja.');
      }
    } catch (err: unknown) {
      alert('Falha de conexão ao remover loja.');
    } finally {
      setDeletingStoreId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Agentes Locais & Gerenciamento de Lojas</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Configure múltiplas lojas e filiais. Cada loja roda seu próprio agente sincronizador local conectado ao PostgreSQL do VR Software da respectiva unidade.
          </p>
        </div>

        {canViewAllStores && (
          <button
            onClick={handleOpenNewStoreModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Loja</span>
          </button>
        )}
      </div>

      {/* Tabs Internas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            activeTab === 'status'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Lojas Cadastradas ({availableStores.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Logs de Transmissão ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            activeTab === 'setup'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Como Configurar Múltiplas Lojas
        </button>
      </div>

      {/* TAB 1: STATUS DAS LOJAS */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableStores.map((store) => (
              <div
                key={store.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <StoreIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {store.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Loja {store.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        CNPJ: {store.cnpj || 'Não informado'} · {store.city || 'Cidade'}/{store.state || 'UF'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      store.agentStatus === 'online'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        store.agentStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span className="capitalize">{store.agentStatus}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Última Sincronização
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{formatTimeOnly(store.lastSyncAt)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Fuso: {store.timezone}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Versão do Agente
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white mt-1">
                      v{store.agentVersion || '1.3.0'}
                    </div>
                    <span className="text-[10px] text-emerald-500">PostgreSQL (VR Software)</span>
                  </div>
                </div>

                {/* Chave de Autenticação da Loja */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chave do Agente desta Loja:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {canViewAllStores && (
                        <button
                          onClick={() => handleOpenEditStore(store)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                          title="Editar Dados e Chave da Loja"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                      {store.code !== '001' && canViewAllStores && (
                        <button
                          onClick={() => handleDeleteStore(store.id, store.code)}
                          disabled={deletingStoreId === store.id}
                          className="text-[11px] text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
                          title="Remover Loja"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate border border-slate-200 dark:border-slate-700 select-all">
                      {store.agentKeyPrefix}
                    </code>
                    <button
                      onClick={() => handleCopyKey(store.agentKeyPrefix)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shrink-0"
                      title="Copiar Chave do Agente"
                    >
                      {copiedKey === store.agentKeyPrefix ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Chave</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dica para o usuário */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Como as lojas aparecem no Topo do Aplicativo:
              </p>
              <p className="leading-relaxed">
                Assim que você cadastra uma loja, ela passa a constar imediatamente no <strong>Seletor de Lojas do Cabeçalho</strong>. Você pode acompanhar cada filial individualmente ou selecionar <strong>"Todas as Lojas"</strong> para ver a consolidação da rede sem duplicar valores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOGS DE SINCRONIZAÇÃO */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Histórico de Lotes Ingeridos via HTTPS
            </h3>
            <button
              onClick={fetchLogs}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Loja</th>
                  <th className="p-3">Batch ID</th>
                  <th className="p-3">Registros</th>
                  <th className="p-3">Latência</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhum registro de log recebido nas últimas 24 horas.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono">{formatTimeOnly(log.created_at)}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {log.store_name}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{log.batch_id}</td>
                      <td className="p-3 font-semibold">{log.records_processed} registros</td>
                      <td className="p-3 font-mono text-emerald-500">{log.duration_ms} ms</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETUP DO AGENTE & MULTI-LOJAS */}
      {activeTab === 'setup' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-6 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Guia de Configuração de Múltiplas Lojas (Filiais)
            </h3>
            <p className="text-slate-400">
              Cada filial do supermercado possui seu próprio servidor PostgreSQL local do VR Software. O Smart Vendas centraliza todas as lojas em um único painel em tempo real.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black">1</span>
              <span>Passo 1: Cadastrar a Nova Loja no Painel</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400 pl-7">
              Clique no botão <strong>"+ Cadastrar Nova Loja"</strong> no topo desta página. Informe o código (ex: <code>002</code>), nome da filial e cidade. O sistema gerará a <code>STORE_AGENT_KEY</code> exclusiva dessa loja.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black">2</span>
              <span>Passo 2: Configurar o Agente no Servidor da Nova Loja</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400 pl-7">
              No servidor da Loja 02, copie a pasta <code>agent/</code> e configure o arquivo <code>.env</code> com a chave da Loja 02:
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 ml-7">
{`# .env do Servidor da Loja 02:
CENTRAL_API_URL=https://smartvendas.site/api/sync/ingest
STORE_AGENT_KEY=sv_live_002_sua_chave_aqui
VR_PG_HOST=127.0.0.1
VR_PG_PORT=5432
VR_PG_DATABASE=vr
VR_PG_USER=smartvendas_reader
VR_PG_PASSWORD=sua_senha
SYNC_INTERVAL_SECONDS=10`}
            </pre>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black">3</span>
              <span>Passo 3: Criar o Usuário de Leitura no PostgreSQL da Nova Loja</span>
            </h4>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 ml-7">
{`-- No PostgreSQL da nova loja:
CREATE USER smartvendas_reader WITH PASSWORD 'senha_forte_aqui';
GRANT CONNECT ON DATABASE vr TO smartvendas_reader;
\\c vr
GRANT USAGE ON SCHEMA pdv TO smartvendas_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA pdv TO smartvendas_reader;`}
            </pre>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black">4</span>
              <span>Passo 4: Iniciar o Serviço</span>
            </h4>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 ml-7">
{`npm install
npm start
# Ou com PM2 para iniciar no boot do servidor:
pm2 start npm --name "smartvendas-loja2" -- start
pm2 save`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL 1: CADASTRAR NOVA LOJA */}
      {showNewStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cadastrar Nova Loja
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adicione uma filial para acompanhamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewStoreModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-5 space-y-4 text-xs">
              {storeError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{storeError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="002"
                    value={storeForm.code}
                    onChange={(e) => {
                      const newCode = e.target.value.toUpperCase();
                      const isGenerated = !storeForm.agentKey || storeForm.agentKey.startsWith('sv_live_');
                      const newKey = isGenerated ? generateUniqueKey(newCode) : storeForm.agentKey;
                      setStoreForm({ ...storeForm, code: newCode, agentKey: newKey });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Supermercado Smart Vendas - Loja 02"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0002-00"
                  value={storeForm.cnpj}
                  onChange={(e) => setStoreForm({ ...storeForm, cnpj: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Chave Exclusiva do Agente (STORE_AGENT_KEY) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateNewStoreKey}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    title="Gerar uma nova chave aleatória"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Outra Chave</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="sv_live_002_..."
                    value={storeForm.agentKey}
                    onChange={(e) => setStoreForm({ ...storeForm, agentKey: e.target.value.trim() })}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-emerald-400 font-mono focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyKey(storeForm.agentKey)}
                    disabled={!storeForm.agentKey}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shrink-0 flex items-center gap-1 text-xs"
                    title="Copiar chave gerada"
                  >
                    {copiedKey === storeForm.agentKey ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-tight">
                    <strong>Chave Gerada Automaticamente:</strong> Esta chave identifica esta loja com exclusividade. Cada loja cadastrada manualmente possui sua própria chave para que os dados nunca se misturem na sincronização.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    placeholder="SP"
                    maxLength={2}
                    value={storeForm.state}
                    onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewStoreModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStore}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {isCreatingStore ? 'Cadastrando...' : 'Salvar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUCESSO E CHAVE GERADA */}
      {newStoreSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 p-6 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Loja Cadastrada com Sucesso!
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                A <strong>{newStoreSuccess.store.name}</strong> já está disponível no seletor de lojas do aplicativo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Chave Exclusiva para o Agente Local desta Loja:
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs select-all break-all border border-slate-800">
                  {newStoreSuccess.agentKey}
                </code>
                <button
                  onClick={() => handleCopyKey(newStoreSuccess.agentKey)}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shrink-0 flex items-center gap-1"
                >
                  {copiedKey === newStoreSuccess.agentKey ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Coloque essa chave no campo <code>STORE_AGENT_KEY</code> do arquivo <code>.env</code> no servidor onde roda o VR Software desta loja.
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setNewStoreSuccess(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold transition"
              >
                Concluir e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR LOJA E CHAVE DO AGENTE */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Editar Loja {editingStore.code}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Altere o código, nome, CNPJ ou a Chave do Agente Local
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStore} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="002"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Supermercado Smart Vendas - Loja 02"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <Key className="w-3.5 h-3.5 text-blue-500" />
                    <span>Chave do Agente (STORE_AGENT_KEY) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateEditKey}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    title="Gerar nova chave aleatória para esta loja"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Nova Chave</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: sv_live_002_..."
                    value={editForm.agentKey}
                    onChange={(e) => setEditForm({ ...editForm, agentKey: e.target.value.trim() })}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-blue-400 font-mono focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyKey(editForm.agentKey)}
                    disabled={!editForm.agentKey}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shrink-0 flex items-center gap-1 text-xs"
                    title="Copiar chave"
                  >
                    {copiedKey === editForm.agentKey ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Ao salvar uma nova chave, você deve atualizar a variável <code>STORE_AGENT_KEY</code> no arquivo <code>.env</code> do servidor local desta loja para manter a sincronização ativa.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0002-00"
                  value={editForm.cnpj}
                  onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    placeholder="SP"
                    maxLength={2}
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStore}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                >
                  {isUpdatingStore ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

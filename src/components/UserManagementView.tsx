import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Mail,
  Phone,
  CheckCircle2,
  Lock,
  Store as StoreIcon,
  AlertCircle,
  Crown,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { getApiUrl } from '../utils/api';

export const UserManagementView: React.FC = () => {
  const { user: currentUser, token, availableStores, canViewUsers, isMasterAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('manager');
  const [newPhone, setNewPhone] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/auth/users'), { headers });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar usuários:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewUsers && currentUser) {
      fetchUsers();
    }
  }, [currentUser?.id, canViewUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/auth/users'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          phone: newPhone,
          storeIds: selectedStores,
        }),
      });

      if (res.ok) {
        setFeedbackMsg('Usuário cadastrado com sucesso!');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewPhone('');
        setShowAddModal(false);
        fetchUsers();
        setTimeout(() => setFeedbackMsg(null), 3500);
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Erro ao criar usuário');
      }
    } catch (e) {
      console.error('Falha ao criar usuário:', e);
    }
  };

  if (!canViewUsers) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <Lock className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso Restrito</h3>
        <p className="text-xs text-slate-400 mt-1">
          Apenas usuários com o perfil <strong>Administrador Geral</strong> podem gerenciar usuários e permissões.
        </p>
      </div>
    );
  }

  const roleLabels: Record<UserRole, { title: string; desc: string; badge: string }> = {
    admin: {
      title: 'Administrador Geral',
      desc: 'Acesso irrestrito a todas as lojas, usuários, configurações e chaves de agentes.',
      badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    },
    owner: {
      title: 'Proprietário',
      desc: 'Visualiza todas as lojas vinculadas à sua conta/rede de supermercados.',
      badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    manager: {
      title: 'Gerente de Loja',
      desc: 'Visualiza somente os caixas e vendas da loja para a qual tem permissão expressa.',
      badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    viewer: {
      title: 'Operador de Consulta',
      desc: 'Acesso apenas de leitura para relatórios e indicadores operacionais.',
      badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    },
  };

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Usuários & Controle de Acesso (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Permissões validadas no backend em todas as requisições
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Grid de Perfis Explicativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {(['admin', 'owner', 'manager', 'viewer'] as UserRole[]).map((r) => {
          const info = roleLabels[r];
          return (
            <div key={r} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.badge}`}>
                {info.title}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{info.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Lista de Usuários */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Usuários Cadastrados no Sistema
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Perfil RBAC</th>
                <th className="p-3">Lojas Autorizadas</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isMaster = u.email.toLowerCase() === 'jjsilva29@gmail.com' || u.isMaster;
                return (
                  <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${isMaster ? 'bg-amber-500/5' : ''}`}>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isMaster && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>MASTER</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                    <td className="p-3">
                      {isMaster ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Admin Master (Total Liberado)
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleLabels[u.role]?.badge || ''}`}>
                          {roleLabels[u.role]?.title || u.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isMaster || u.role === 'admin' || u.role === 'owner' ? (
                        <span className="text-emerald-500 font-semibold">Todas as lojas</span>
                      ) : u.storeIds && u.storeIds.length > 0 ? (
                        <span className="font-medium">
                          {u.storeIds.map((sid) => availableStores.find((s) => s.id === sid)?.code || sid).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">Nenhuma atribuída</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-500 font-semibold">Ativo</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação de Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs text-slate-900 dark:text-white">
            <h3 className="text-base font-bold mb-4">Adicionar Novo Usuário</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina a senha de acesso"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Perfil (RBAC)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="admin">Administrador Geral</option>
                  <option value="owner">Proprietário (Rede)</option>
                  <option value="manager">Gerente de Loja</option>
                  <option value="viewer">Operador de Consulta</option>
                </select>
              </div>

              {newRole === 'manager' && (
                <div>
                  <label className="block text-slate-400 mb-1">Loja Autorizada</label>
                  <select
                    onChange={(e) => setSelectedStores([e.target.value])}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione uma loja...</option>
                    {availableStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

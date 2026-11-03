import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  QrCode,
  CreditCard,
  UtensilsCrossed,
  Layers,
  Plus,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Info,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEFReconciliationData, TEFRule } from '../types';
import { formatMoney, formatNumber } from '../utils/formatters';
import { getApiUrl } from '../utils/api';

function str_pad_js(val: number | string): string {
  return String(val).padStart(2, '0');
}

export const TEFReconciliationView: React.FC = () => {
  const { activeStoreId, activeDate, user, token, canManageTef } = useAuth();
  const [data, setData] = useState<TEFReconciliationData | null>(null);
  const [rules, setRules] = useState<TEFRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);

  // Formulário de nova regra TEF
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newCategory, setNewCategory] = useState<'pix' | 'credito' | 'debito' | 'alimentacao' | 'outros'>('pix');
  const [newDescricao, setNewDescricao] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Helpers de Armazenamento Local de Regras TEF (Garantia de Persistência em Qualquer Ambiente)
  const getLocalTefRules = (): TEFRule[] => {
    try {
      const raw = localStorage.getItem('smartvendas_local_tef_rules');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const saveLocalTefRules = (newRulesList: TEFRule[]) => {
    try {
      localStorage.setItem('smartvendas_local_tef_rules', JSON.stringify(newRulesList));
    } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        store_id: activeStoreId,
        date: activeDate,
      }).toString();

      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [recRes, rulesRes] = await Promise.all([
        fetch(getApiUrl(`/api/sales/tef-reconciliation?${query}`), { headers }).catch(() => null),
        fetch(getApiUrl('/api/tef-mappings'), { headers }).catch(() => null),
      ]);

      if (recRes && recRes.ok) {
        const recJson = await recRes.json().catch(() => ({}));
        if (recJson.reconciliation) setData(recJson.reconciliation);
      }

      let serverRules: TEFRule[] = [];
      if (rulesRes && rulesRes.ok) {
        const rulesJson = await rulesRes.json().catch(() => ({}));
        serverRules = rulesJson.rules || [];
      }

      // Mesclar regras do servidor e regras locais salvas no navegador
      const localRules = getLocalTefRules();
      const combined = [...serverRules];
      const existingIds = new Set(serverRules.map((r) => r.id));
      for (const lr of localRules) {
        if (!existingIds.has(lr.id)) {
          combined.push(lr);
        }
      }

      setRules(combined.length > 0 ? combined : [
        { id: 'rule-1', id_tipotef: 47, nomecartao_pattern: '%PIX%', category: 'pix', descricao: 'Pix via TEF (Código Oficial 47)', active: true },
        { id: 'rule-2', id_tipotef: null, nomecartao_pattern: '%CRED%', category: 'credito', descricao: 'Cartões de Crédito', active: true },
        { id: 'rule-3', id_tipotef: null, nomecartao_pattern: '%DEB%', category: 'debito', descricao: 'Cartões de Débito', active: true },
        { id: 'rule-4', id_tipotef: null, nomecartao_pattern: '%ALIM%', category: 'alimentacao', descricao: 'Vale Alimentação / Benefícios', active: true },
      ]);
    } catch (err) {
      console.warn('Erro ao carregar conciliação TEF:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStoreId, activeDate, user?.id]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescricao && !newTypeCode && !newPattern) {
      setSaveFeedback({ type: 'error', message: 'Preencha ao menos a descrição, o código TEF ou o padrão do cartão.' });
      return;
    }

    setSavingRule(true);
    setSaveFeedback(null);

    const descText = (newDescricao || '').trim() || (newTypeCode ? `Regra Código TEF ${newTypeCode}` : (newPattern ? `Regra Padrão ${newPattern}` : 'Regra TEF'));

    const newRule: TEFRule = {
      id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      id_tipotef: newTypeCode ? parseInt(newTypeCode, 10) : null,
      nomecartao_pattern: newPattern ? newPattern.trim() : null,
      category: newCategory,
      descricao: descText,
      active: true,
    };

    // 1. Gravar imediatamente no localStorage (Local-First)
    const localRules = getLocalTefRules();
    const updatedLocals = [newRule, ...localRules.filter((r) => r.id !== newRule.id)];
    saveLocalTefRules(updatedLocals);

    // 2. Atualizar estado de tela imediatamente
    setRules((prev) => [newRule, ...prev.filter((r) => r.id !== newRule.id)]);

    // 3. Tentar enviar ao servidor
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(getApiUrl('/api/tef-mappings'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id_tipotef: newRule.id_tipotef,
          nomecartao_pattern: newRule.nomecartao_pattern,
          category: newRule.category,
          descricao: newRule.descricao,
        }),
      }).catch(() => {});
    } catch (err) {
      console.warn('Servidor offline durante criação de regra. Regra mantida localmente.', err);
    }

    setSaveFeedback({
      type: 'success',
      message: 'Nova regra de classificação TEF salva e aplicada com sucesso!',
    });
    setNewTypeCode('');
    setNewPattern('');
    setNewDescricao('');
    setSavingRule(false);
    setTimeout(() => setShowAddRule(false), 1200);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Deseja realmente remover esta regra de classificação TEF?')) return;

    setDeletingRuleId(ruleId);
    setSaveFeedback(null);

    // 1. Remover do localStorage
    const localRules = getLocalTefRules().filter((r) => r.id !== ruleId);
    saveLocalTefRules(localRules);

    // 2. Remover do estado de tela
    setRules((prev) => prev.filter((r) => r.id !== ruleId));

    // 3. Notificar o servidor se disponível
    try {
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(getApiUrl(`/api/tef-mappings/${ruleId}`), {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    } catch (err) {
      console.warn('Servidor offline durante exclusão de regra:', err);
    }

    setSaveFeedback({
      type: 'success',
      message: 'Regra de classificação TEF removida com sucesso!',
    });
    setDeletingRuleId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>Tratamento Especial do Pix & Conciliação TEF</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Conforme as regras do VR Software, os totais oficiais de faturamento continuam baseados estritamente nas finalizadoras,
          enquanto a tabela <code className="text-emerald-500">pdv.vendatef</code> é utilizada para classificar Pix (tipotef 47), cartões e benefícios sem duplicar valores.
        </p>
      </div>

      {/* Regra de Ouro do VR Master */}
      <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            Regra Fundamental de Não Duplicação:
          </span>
          <p>
            Vendas Pix diretamente no CNPJ frequentemente são lançadas no caixa como finalizadora <code>CARTAO</code>,
            porém possuem registro discriminado no TEF com código <code>id_tipotef = 47</code>. O sistema realiza a classificação cruzada sem somar o valor duas vezes ao faturamento geral da loja.
          </p>
        </div>
      </div>

      {/* Painel de Conciliação Financeira */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Oficial Finalizadoras
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatMoney(data.official_cartao_pix_total)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              pdv.vendafinalizadora (Cartão + Pix + Vouchers)
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Classificado no TEF
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatMoney(data.tef_classified_total)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              pdv.vendatef (Transações processadas)
            </p>
          </div>

          <div
            className={`rounded-2xl p-5 border shadow-sm ${
              data.has_discrepancy
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Status da Conciliação
              </span>
              {data.has_discrepancy ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <div className="text-2xl font-black mt-1">
              {data.has_discrepancy
                ? `Dif. ${formatMoney(data.diferenca)}`
                : 'Conciliado 100%'}
            </div>
            <p className="text-[11px] mt-1 opacity-80">
              {data.has_discrepancy
                ? 'Divergência entre TEF e Finalizadora. Sem duplicações.'
                : 'Totais financeiros conferem com precisão.'}
            </p>
          </div>

        </div>
      )}

      {/* Classificação por Categoria no TEF */}
      {data && data.tef_by_category && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Valores Classificados no Detalhamento TEF
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <span className="font-semibold text-teal-600 dark:text-teal-400">Pix TEF (tipotef 47)</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatMoney(data.tef_by_category?.pix ?? 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Cartões de Débito</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatMoney(data.tef_by_category?.debito ?? 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Cartões de Crédito</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatMoney(data.tef_by_category?.credito ?? 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Alimentação & Benefícios</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {formatMoney(data.tef_by_category?.alimentacao ?? 0)}
              </div>
            </div>
          </div>

          {/* Tabela Detalhada por Bandeira de Cartão e Caixa (pdv.vendatef) */}
          {data.details && data.details.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                Detalhamento por Cartão / Bandeira e Caixa (pdv.vendatef)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5">Caixa / PDV</th>
                      <th className="p-2.5">Nome da Bandeira / Cartão</th>
                      <th className="p-2.5">Tipo TEF</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5 text-center">Transações</th>
                      <th className="p-2.5 text-right">Valor Processado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.details.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          Caixa {str_pad_js(item.pdv)}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {item.nomecartao}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {item.id_tipotef > 0 ? `tipotef ${item.id_tipotef}` : 'Padrão'}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.categoria === 'pix' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' :
                            item.categoria === 'credito' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                            item.categoria === 'debito' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {item.categoria}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          {item.transacoes}
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatMoney(item.valor_tef)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regras Configuráveis de Classificação */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Camada Configurável de Classificação TEF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permite validar e adicionar novos códigos TEF e bandeiras de cartão sem alterar o VR Software
            </p>
          </div>
          {canManageTef && (
            <button
              onClick={() => setShowAddRule(!showAddRule)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Regra</span>
            </button>
          )}
        </div>

        {/* Banner de Feedback (Sucesso / Erro) */}
        {saveFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{saveFeedback.message}</span>
            </div>
            <button
              onClick={() => setSaveFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Formulário de Nova Regra */}
        {showAddRule && (
          <form onSubmit={handleAddRule} className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">Cadastrar Nova Regra de TEF</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Código TEF (id_tipotef)</label>
                <input
                  type="number"
                  placeholder="Ex: 47"
                  value={newTypeCode}
                  onChange={(e) => setNewTypeCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Padrão Nome do Cartão</label>
                <input
                  type="text"
                  placeholder="Ex: %PIX% ou %AMEX%"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="pix">Pix</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Amex Crédito"
                  value={newDescricao}
                  onChange={(e) => setNewDescricao(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                disabled={savingRule}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingRule}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
              >
                {savingRule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Regra</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tabela de Regras */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-2.5">Descrição</th>
                <th className="p-2.5">id_tipotef</th>
                <th className="p-2.5">Padrão Cartão</th>
                <th className="p-2.5">Categoria</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                    {r.descricao}
                  </td>
                  <td className="p-2.5 font-mono text-emerald-500">
                    {r.id_tipotef ?? '—'}
                  </td>
                  <td className="p-2.5 font-mono text-slate-400">
                    {r.nomecartao_pattern ?? '—'}
                  </td>
                  <td className="p-2.5">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                      {r.category}
                    </span>
                  </td>
                  <td className="p-2.5 text-emerald-500 font-semibold">Ativo</td>
                  <td className="p-2.5 text-right">
                    {canManageTef && (
                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        disabled={deletingRuleId === r.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Excluir regra"
                      >
                        {deletingRuleId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

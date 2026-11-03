import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Wallet,
  QrCode,
  CreditCard,
  Banknote,
  Coins,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
  Layers,
  UtensilsCrossed,
} from 'lucide-react';
import { SalesSummary, HourlySalesPoint, PDVSale } from '../types';
import { formatMoney, formatNumber, formatPercent, formatSangriaTime } from '../utils/formatters';
import { SangriasDetailModal } from './SangriasDetailModal';

interface DashboardProps {
  summary: SalesSummary | null;
  hourly: HourlySalesPoint[];
  pdvs: PDVSale[];
  loading: boolean;
  onNavigateToPdvs: () => void;
  onNavigateToTef: () => void;
  onNavigateToReports: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  hourly,
  pdvs,
  loading,
  onNavigateToPdvs,
  onNavigateToTef,
  onNavigateToReports,
}) => {
  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Carregando indicadores em tempo real...
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nenhum dado encontrado para os filtros selecionados.
      </div>
    );
  }

  const [showSangriasModal, setShowSangriasModal] = useState<boolean>(false);

  const isSangriasSynced = summary.sangrias_synced !== undefined
    ? Boolean(summary.sangrias_synced)
    : Boolean(summary.last_sync_at && (summary.pdv_count > 0 || (summary.sangrias && summary.sangrias.length > 0)));

  // Total de PDVs que registraram sangrias
  const pdvsComSangriaCount = useMemo(() => {
    if (!summary?.sangrias || summary.sangrias.length === 0) return 0;
    const pdvSet = new Set(summary.sangrias.map((s) => s.pdv));
    return pdvSet.size;
  }, [summary?.sangrias]);

  // Encontrar valor máximo para dimensionar as barras do gráfico horário de forma 100% segura
  const hourlyValues = (hourly || []).map((h) => h?.venda_liquida || 0);
  const maxHourlyVal = hourlyValues.length > 0 ? Math.max(...hourlyValues, 100) : 100;

  return (
    <div className="space-y-6">
      
      {/* Banner Informativo: Modo Demonstração vs Produção */}
      {summary.is_simulated && (
        <div className="rounded-xl p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900/40 to-slate-900/40 border border-emerald-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400">
              Modo Demonstração Ativo (Simulação a cada 10s):
            </span>
            <span className="text-slate-300">
              Gerando compras dinâmicas nos PDVs para demonstrar atualização em tempo real.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToReports}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      )}

      {/* Identificação Clara da Loja / Agrupamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {summary.store_name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {summary.store_id === 'all'
              ? 'Consolidação de todas as unidades autorizadas · Não mistura dados de filiais sem somatório explícito'
              : `Acompanhamento individual de vendas · ${summary.pdv_count} PDVs cadastrados (${summary.active_pdvs} ativos)`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onNavigateToPdvs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ver {summary.pdv_count} Caixas</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO: BANCO REAL LIMPO */}
      {summary.pdv_count === 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 sm:p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-lg mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Banco de Dados Real Ativo · Sem Dados Fictícios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Todas as lojas e vendas simuladas foram completamente removidas. Os totais acima iniciarão em zero até que sua primeira loja real transmita os dados do VR Software através do agente local (<code className="text-emerald-600 dark:text-emerald-400 font-mono">sync-agent.ts</code>).
            </p>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 1. CARDS PRINCIPAIS DE VENDAS (FÓRMULAS OFICIAIS VR)    */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: VENDA LÍQUIDA (MAIOR DESTAQUE) */}
        <div className="sm:col-span-2 lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-xl shadow-emerald-950/20 border border-emerald-400/30">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                  <TrendingUp className="w-5 h-5 text-emerald-200" />
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                    Venda Líquida
                  </h3>
                  <span className="text-[11px] text-emerald-200/80">
                    Venda Bruta (-) Troco
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                Faturamento Real
              </span>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-sm">
                {formatMoney(summary.venda_liquida)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/90 font-medium">
                <span>Bruta: <strong>{formatMoney(summary.venda_bruta)}</strong></span>
                <span>·</span>
                <span>Troco Total: <strong>{formatMoney(summary.troco)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: QUANTIDADE DE CUPONS (COUNT DISTINCT v.id) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Cupons</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatNumber(summary.cupons)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              COUNT(DISTINCT v.id) por PDV
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Caixas com vendas:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {summary.active_pdvs} de {summary.pdv_count}
            </span>
          </div>
        </div>

        {/* CARD 3: TICKET MÉDIO */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatMoney(summary.ticket_medio)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Venda Líquida / Cupons
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Média por cliente:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatMoney(summary.ticket_medio)}
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================= */}
      {/* 2. FORMAS DE PAGAMENTO CONSOLIDADAS                    */}
      {/* ======================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Distribuição por Formas de Pagamento</span>
            <span className="text-xs font-normal text-slate-400">(VR Master)</span>
          </h2>
          <button
            onClick={onNavigateToTef}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Conciliação TEF / Pix</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          
          {/* PIX */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pix Total</span>
              <QrCode className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.pix ?? 0)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {formatPercent((summary.venda_liquida && summary.venda_liquida > 0) ? ((summary.pix || 0) / summary.venda_liquida) * 100 : 0)} do total
            </div>
          </div>

          {/* CARTÕES / TEF (CRÉDITO + DÉBITO) */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span>Cartões / TEF</span>
              </span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.cartoes ?? ((summary.credito || 0) + (summary.debito || 0)))}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Créd: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(summary.credito ?? 0)}</strong></span>
              <span>Déb: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(summary.debito ?? 0)}</strong></span>
            </div>
          </div>

          {/* DINHEIRO LÍQUIDO */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Dinheiro Líq.</span>
              <Banknote className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.dinheiro_liquido)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Troco: {formatMoney(summary.troco)}
            </div>
          </div>

          {/* SANGRIA / RETIRADAS (CARD EXISTENTE - CLICÁVEL COM DETALHAMENTO) */}
          <div
            onClick={() => setShowSangriasModal(true)}
            className="rounded-xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent p-4 border border-red-500/20 shadow-sm cursor-pointer hover:border-red-500/50 hover:shadow-md transition-all group select-none"
            role="button"
            tabIndex={0}
            title="Clique para abrir o detalhamento completo de sangrias por PDV e Loja"
          >
            <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Sangria</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-500/80 font-medium group-hover:underline">Detalhar</span>
                <ArrowDownRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
              {!isSangriasSynced ? (
                <span className="text-xs sm:text-sm font-semibold text-amber-500 dark:text-amber-400 animate-pulse">
                  Aguardando sincronização
                </span>
              ) : (
                formatMoney(summary.sangria_total || 0)
              )}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {!isSangriasSynced
                  ? 'Aguardando agente VR'
                  : `${summary.sangrias_count || (summary.sangrias?.length || 0)} retiradas no caixa`}
              </span>
              {pdvsComSangriaCount > 0 && (
                <span className="text-[10px] font-medium text-red-500/80">
                  {pdvsComSangriaCount} {pdvsComSangriaCount === 1 ? 'PDV' : 'PDVs'}
                </span>
              )}
            </div>
          </div>

          {/* VALE ALIMENTAÇÃO / BENEFÍCIOS */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Alimentação</span>
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.alimentacao)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Alelo/VR/Sodexo
            </div>
          </div>

          {/* CREDIÁRIO */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Crediário</span>
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.crediario)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Convênio / Faturado
            </div>
          </div>

          {/* VENDA BRUTA */}
          <div className="rounded-xl bg-white dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Venda Bruta</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {formatMoney(summary.venda_bruta)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Total sem abater troco
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================= */}
      {/* SEÇÃO EM TEMPO REAL: PAINEL DE SANGRIA DE CAIXA         */}
      {/* ======================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 space-y-4">
        
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sangrias de Caixa (Retiradas de Espécie)
                </h3>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Tempo Real · VR Master
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitoramento instantâneo das retiradas de dinheiro físico nos caixas do supermercado
              </p>
            </div>
          </div>

          {/* Métricas de Sangria */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Retirado</span>
              <span className="text-sm font-black text-red-600 dark:text-red-400">
                {formatMoney(summary.sangria_total || 0)}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Qtd. Sangrias</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {summary.sangrias_count || 0}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Est. nos Caixas</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatMoney(summary.saldo_caixa_total ?? Math.max(0, (summary.dinheiro_liquido || 0) - (summary.sangria_total || 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Sangrias */}
        {!isSangriasSynced ? (
          <div className="py-8 text-center bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/80 p-4">
            <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Aguardando sincronização de sangrias com o VR Software</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              O agente local monitora as retiradas registradas na tabela <code className="font-mono font-bold">pdv.vendaoperadorfinalizadora</code> no PostgreSQL. Assim que os dados forem lidos, as retiradas aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (!summary.sangrias || summary.sangrias.length === 0) ? (
          <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhuma sangria registrada no dia de hoje para o filtro selecionado. Assim que uma retirada for realizada no VR Software, ela aparecerá aqui instantaneamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Caixa (PDV)</th>
                  <th className="py-2.5 px-3">Horário</th>
                  <th className="py-2.5 px-3">Operador / Autorização</th>
                  <th className="py-2.5 px-3">Motivo / Descrição</th>
                  <th className="py-2.5 px-3 text-right">Valor Retirado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {summary.sangrias.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-[11px] font-bold flex items-center justify-center">
                        {s.pdv}
                      </span>
                      <span>Caixa {String(s.pdv).padStart(2, '0')}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatSangriaTime(s.hora)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {s.operador || 'Operador'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {s.motivo || 'Sangria de Caixa'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-red-600 dark:text-red-400 text-sm">
                      {formatMoney(s.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* 3. GRÁFICOS: CURVA HORÁRIA E DETALHAMENTO DE FINALIZADORAS */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Curva de Vendas por Hora */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900/90 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Curva Horária de Faturamento (07:00 às 21:00)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Picos de movimento no supermercado ao longo do dia
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Pico: 18:00
            </span>
          </div>

          {/* Gráfico de Barras Responsivo em CSS */}
          <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 px-1">
            {hourly.map((point) => {
              const heightPercent = Math.max(8, Math.round((point.venda_liquida / maxHourlyVal) * 100));
              const isPeak = point.hour === '18:00' || point.hour === '11:00';
              return (
                <div key={point.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip Hover */}
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-slate-900 text-white dark:bg-slate-800 text-[10px] rounded px-2 py-1 shadow-md whitespace-nowrap">
                      <div className="font-bold">{point.hour}</div>
                      <div>{formatMoney(point.venda_liquida)}</div>
                      <div>{point.cupons} cupons</div>
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 -mt-1" />
                  </div>

                  {/* Barra */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isPeak
                        ? 'bg-emerald-500 group-hover:bg-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700/80 group-hover:bg-emerald-500/70'
                    }`}
                  />
                  
                  {/* Legenda do Horário */}
                  <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center hidden sm:block">
                    {point.hour.split(':')[0]}h
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                <span>Horários de Pico</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700 inline-block" />
                <span>Demais Horários</span>
              </span>
            </div>
            <span>Atualizado a cada 10s</span>
          </div>
        </div>

        {/* Tabela de Finalizadoras Oficiais VR Master */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Finalizadoras (pdv.finalizadora)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Totalização financeira oficial do VR
            </p>

            <div className="space-y-3">
              {(summary.payments_breakdown && summary.payments_breakdown.length > 0) ? (
                summary.payments_breakdown.map((pay) => (
                  <div key={pay.finalizadora_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {pay.finalizadora_nome}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMoney(pay.venda_liquida)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, pay.percentual)}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{pay.cupons_count} transações</span>
                      <span>{pay.percentual}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Aguardando primeiras vendas do agente local...
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={onNavigateToPdvs}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Ver detalhamento caixa a caixa →
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE DETALHAMENTO DE SANGRIAS */}
      <SangriasDetailModal
        isOpen={showSangriasModal}
        onClose={() => setShowSangriasModal(false)}
        summary={summary}
        pdvs={pdvs}
        isSangriasSynced={isSangriasSynced}
      />

    </div>
  );
};

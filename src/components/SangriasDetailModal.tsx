import React from 'react';
import { X, ArrowDownRight, Layers, Store as StoreIcon, Clock, User, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { SalesSummary, PDVSale, SangriaItem } from '../types';
import { formatMoney, formatDateBr, formatSangriaTime } from '../utils/formatters';

interface SangriasDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SalesSummary | null;
  pdvs: PDVSale[];
  isSangriasSynced: boolean;
}

export const SangriasDetailModal: React.FC<SangriasDetailModalProps> = ({
  isOpen,
  onClose,
  summary,
  pdvs,
  isSangriasSynced,
}) => {
  if (!isOpen || !summary) return null;

  // Agrupar sangrias por PDV
  const sangriasByPdv = React.useMemo(() => {
    const map = new Map<number, { ecf: number; total: number; count: number; items: SangriaItem[] }>();

    // 1. A partir de summary.sangrias
    if (summary.sangrias && Array.isArray(summary.sangrias)) {
      summary.sangrias.forEach((s) => {
        const ecf = Number(s.pdv) || 1;
        if (!map.has(ecf)) {
          map.set(ecf, { ecf, total: 0, count: 0, items: [] });
        }
        const entry = map.get(ecf)!;
        entry.total += Number(s.valor) || 0;
        entry.count += 1;
        entry.items.push(s);
      });
    }

    // 2. Complementar a partir de pdvs se houver totais informados
    if (pdvs && Array.isArray(pdvs)) {
      pdvs.forEach((p) => {
        if (p.sangria_total && p.sangria_total > 0 && !map.has(p.ecf)) {
          map.set(p.ecf, {
            ecf: p.ecf,
            total: p.sangria_total,
            count: p.sangrias_count || 1,
            items: p.sangrias || [],
          });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.ecf - b.ecf);
  }, [summary.sangrias, pdvs]);

  const totalSangrias = summary.sangria_total || 0;
  const countSangrias = summary.sangrias_count || (summary.sangrias ? summary.sangrias.length : 0);
  const totalPdvsComSangria = sangriasByPdv.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-rose-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  Detalhamento de Sangrias e Retiradas
                </h3>
                {isSangriasSynced ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    VR Sincronizado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    Aguardando sincronização
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 flex items-center gap-2 mt-0.5">
                <StoreIcon className="w-3.5 h-3.5" />
                <span>{summary.store_name}</span>
                <span>·</span>
                <span>Data: {formatDateBr(summary.date)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Alerta quando aguarda sincronização */}
          {!isSangriasSynced && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Aguardando dados de sangria do VR Software</p>
                <p className="text-slate-600 dark:text-slate-300">
                  O agente de sincronização consulta periodicamente a tabela <code className="font-mono font-bold bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">pdv.vendaoperadorfinalizadora</code> no PostgreSQL local do VR. Assim que houver retiradas registradas e o agente enviar o lote, os valores aparecerão aqui automaticamente.
                </p>
              </div>
            </div>
          )}

          {/* 4 Cards de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Total Sangrias do Dia */}
            <div className="rounded-xl p-3.5 bg-red-500/10 border border-red-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                Total Sangrias do Dia
              </span>
              <div className="text-lg sm:text-xl font-black text-red-600 dark:text-red-400 mt-1">
                {!isSangriasSynced ? (
                  <span className="text-xs font-semibold text-amber-500">Aguardando</span>
                ) : (
                  formatMoney(totalSangrias)
                )}
              </div>
            </div>

            {/* Quantidade de Sangrias */}
            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Qtd. de Retiradas
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {countSangrias} {countSangrias === 1 ? 'retirada' : 'retiradas'}
              </div>
            </div>

            {/* Total de PDVs com Sangria */}
            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                PDVs com Retirada
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {totalPdvsComSangria} {totalPdvsComSangria === 1 ? 'caixa' : 'caixas'}
              </div>
            </div>

            {/* Total por Loja */}
            <div className="rounded-xl p-3.5 bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate" title={summary.store_name}>
                Total por Loja
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {!isSangriasSynced ? (
                  <span className="text-xs font-semibold text-amber-500">Aguardando</span>
                ) : (
                  formatMoney(totalSangrias)
                )}
              </div>
            </div>

          </div>

          {/* Total por PDV (Breakdown por Caixa) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-500" />
                <span>Total de Sangrias por PDV / Caixa</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {sangriasByPdv.length} caixas com movimento de retirada
              </span>
            </div>

            {sangriasByPdv.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhum caixa registrou sangria nesta data até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sangriasByPdv.map((pdvGroup) => (
                  <div
                    key={pdvGroup.ecf}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs font-bold">
                        Caixa {String(pdvGroup.ecf).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {pdvGroup.count} {pdvGroup.count === 1 ? 'retirada' : 'retiradas'}
                      </span>
                    </div>
                    <div className="mt-2 text-base font-black text-red-600 dark:text-red-400">
                      {formatMoney(pdvGroup.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela Detalhada de Lançamentos de Sangria */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>Registros Individuais de Sangrias do Dia</span>
            </h4>

            {(!summary.sangrias || summary.sangrias.length === 0) ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                {!isSangriasSynced ? (
                  <span className="text-amber-500 font-medium">
                    Aguardando sincronização do agente local para exibir a listagem detalhada.
                  </span>
                ) : (
                  <span>Nenhum lançamento individual registrado no VR Software para esta data.</span>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Caixa (PDV)</th>
                      <th className="py-2.5 px-3">Horário</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3">Motivo / Finalizadora</th>
                      <th className="py-2.5 px-3 text-right">Valor Retirado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summary.sangrias.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
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

          {/* Nota Regra Financeira */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-200">Regra Financeira VR Master:</strong> As sangrias representam retiradas de numerário para o cofre e <span className="underline">não são descontadas da venda líquida</span> (Venda Bruta = soma das finalizadoras; Venda Líquida = Venda Bruta (-) Troco).
            </p>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            {summary.store_id} · Atualizado a cada 10s
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-semibold text-xs transition"
          >
            Fechar Detalhamento
          </button>
        </div>

      </div>
    </div>
  );
};

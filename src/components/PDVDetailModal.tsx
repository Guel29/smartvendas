import React from 'react';
import { X, Layers, Clock, Receipt, Coins, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PDVSale } from '../types';
import { formatMoney, formatNumber, formatTimeOnly } from '../utils/formatters';

interface PDVDetailModalProps {
  pdv: PDVSale | null;
  onClose: () => void;
}

export const PDVDetailModal: React.FC<PDVDetailModalProps> = ({ pdv, onClose }) => {
  if (!pdv) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-lg">
              {pdv.ecf}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {pdv.label} (ECF {pdv.ecf})
                </h3>
                {pdv.is_new && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">
                    Novo PDV
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Última venda: {formatTimeOnly(pdv.last_sale_at)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Card Principal do Caixa */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Venda Líquida
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(pdv.venda_liquida)}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Venda Bruta
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatMoney(pdv.venda_bruta)}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Troco
              </span>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatMoney(pdv.troco)}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ticket Médio
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatMoney(pdv.ticket_medio)}
              </div>
            </div>
          </div>

          {/* Decomposição Completa de Formas de Pagamento */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Valores por Forma de Pagamento (Fórmulas VR Master)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Pix Total</span>
                  <p className="text-[11px] text-slate-400">TEF cód. 47 / Chave</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.pix)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Cartão Débito</span>
                  <p className="text-[11px] text-slate-400">Finalizadora Débito</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.debito)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Cartão Crédito</span>
                  <p className="text-[11px] text-slate-400">Finalizadora Crédito</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.credito)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Dinheiro Líquido</span>
                  <p className="text-[11px] text-slate-400">Dinheiro bruto menos troco</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.dinheiro_liquido)}</span>
              </div>

              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Sangrias Retiradas</span>
                  </span>
                  <p className="text-[11px] text-slate-400">{pdv.sangrias_count || 0} sangrias no caixa</p>
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">-{formatMoney(pdv.sangria_total || 0)}</span>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 flex items-center justify-between sm:col-span-2">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Saldo Físico Estimado em Gaveta (Caixa)</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dinheiro Líquido (-) Sangrias Totalizadas</p>
                </div>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatMoney(pdv.saldo_caixa ?? Math.max(0, pdv.dinheiro_liquido - (pdv.sangria_total || 0)))}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Alimentação & Benefícios</span>
                  <p className="text-[11px] text-slate-400">Alelo, Sodexo, VR, Ticket</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.alimentacao)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Crediário / Convênio</span>
                  <p className="text-[11px] text-slate-400">Vendas a prazo / Rotativo</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.crediario)}</span>
              </div>

              {pdv.outros > 0 && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between sm:col-span-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Outras Finalizadoras</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{formatMoney(pdv.outros)}</span>
                </div>
              )}

            </div>
          </div>

          {/* Validação de Regras do VR Software */}
          <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Validação Financeira Oficial do VR Master</span>
            </div>
            <p>
              • <strong>Venda Bruta</strong> ({formatMoney(pdv.venda_bruta)}) = soma de todas as finalizadoras de cupons não cancelados.
            </p>
            <p>
              • <strong>Venda Líquida</strong> ({formatMoney(pdv.venda_liquida)}) = venda bruta menos troco ({formatMoney(pdv.troco)}).
            </p>
            <p>
              • <strong>Cupons Únicos</strong> ({pdv.cupons}) calculados por <code>COUNT(DISTINCT v.id)</code>, sem duplicidade entre pagamentos múltiplos no mesmo cupom.
            </p>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-600 transition"
          >
            Fechar Detalhes
          </button>
        </div>

      </div>
    </div>
  );
};

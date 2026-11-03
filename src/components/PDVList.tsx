import React, { useState } from 'react';
import {
  Layers,
  Clock,
  Receipt,
  Search,
  ArrowRight,
  TrendingUp,
  Sparkles,
  QrCode,
  CreditCard,
  Banknote,
  UtensilsCrossed,
} from 'lucide-react';
import { PDVSale } from '../types';
import { PDVDetailModal } from './PDVDetailModal';
import { formatMoney, formatNumber, formatTimeOnly } from '../utils/formatters';

interface PDVListProps {
  pdvs: PDVSale[];
  loading: boolean;
}

export const PDVList: React.FC<PDVListProps> = ({ pdvs, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPdv, setSelectedPdv] = useState<PDVSale | null>(null);

  const filtered = pdvs.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.ecf.toString().includes(term) ||
      p.label.toLowerCase().includes(term) ||
      (p.model && p.model.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Vendas por PDV</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {pdvs.length} Caixas
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhamento individual de cada frente de caixa com atualização a cada 10 segundos
          </p>
        </div>

        {/* Busca por caixa */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar caixa ou ECF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Grid de Caixas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pdv) => (
          <div
            key={pdv.id}
            onClick={() => setSelectedPdv(pdv)}
            className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Header do Caixa */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-900 dark:text-white text-base group-hover:bg-emerald-600 group-hover:text-white transition">
                    {pdv.ecf}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {pdv.label}
                    </h3>
                    <span className="text-[11px] text-slate-400">ECF {pdv.ecf} · {pdv.model}</span>
                  </div>
                </div>

                {pdv.is_new ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Novo PDV
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeOnly(pdv.last_sale_at)}</span>
                  </span>
                )}
              </div>

              {/* Venda Líquida com Maior Destaque */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Venda Líquida
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatMoney(pdv.venda_liquida)}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Bruta: {formatMoney(pdv.venda_bruta)}</span>
                  <span>Troco: {formatMoney(pdv.troco)}</span>
                </div>
              </div>

              {/* Métricas do Caixa */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cupons Únicos</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatNumber(pdv.cupons)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Ticket Médio</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatMoney(pdv.ticket_medio)}
                  </div>
                </div>
              </div>

              {/* Formas de Pagamento Principais do Caixa */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Pix:</span>
                  </span>
                  <span className="font-semibold">{formatMoney(pdv.pix)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartões (C+D):</span>
                  </span>
                  <span className="font-semibold">{formatMoney(pdv.credito + pdv.debito)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Dinheiro Líq:</span>
                  </span>
                  <span className="font-semibold">{formatMoney(pdv.dinheiro_liquido)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Sangrias:</span>
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatMoney(pdv.sangria_total || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  <span>Saldo Est. em Caixa:</span>
                  <span>{formatMoney(pdv.saldo_caixa ?? Math.max(0, pdv.dinheiro_liquido - (pdv.sangria_total || 0)))}</span>
                </div>
                {pdv.alimentacao > 0 && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>Alimentação:</span>
                    </span>
                    <span className="font-semibold">{formatMoney(pdv.alimentacao)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ação de Detalhes */}
            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500">
              <span>Abrir auditoria do caixa</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-500 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          Nenhum caixa encontrado para "{searchTerm}".
        </div>
      )}

      {/* Modal Detalhado ao clicar no PDV */}
      <PDVDetailModal
        pdv={selectedPdv}
        onClose={() => setSelectedPdv(null)}
      />

    </div>
  );
};

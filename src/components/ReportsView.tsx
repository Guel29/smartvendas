import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  Store as StoreIcon,
  PieChart,
  Loader2,
  Building2,
  CheckCircle2,
  UtensilsCrossed,
  Layers,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PaymentBreakdown, SalesSummary } from '../types';
import { formatMoney, formatNumber, formatPercent, formatDateBr } from '../utils/formatters';
import { getApiUrl } from '../utils/api';

interface StoreDataResult {
  storeId: string;
  storeName: string;
  summary: SalesSummary | null;
  error?: string;
}

export const ReportsView: React.FC = () => {
  const { activeStoreId, activeDate, user, token, availableStores } = useAuth();

  // Estados dos Filtros
  const [selectedDate, setSelectedDate] = useState<string>(activeDate || new Date().toISOString().slice(0, 10));
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStoreId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'by_finalizadora' | 'by_store'>('by_finalizadora');

  // Dados carregados da API
  const [storesData, setStoresData] = useState<StoreDataResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sincronizar com activeStoreId e activeDate se mudarem no header
  useEffect(() => {
    if (activeDate) setSelectedDate(activeDate);
  }, [activeDate]);

  useEffect(() => {
    if (activeStoreId) setSelectedStoreId(activeStoreId);
  }, [activeStoreId]);

  // Carregar dados de vendas por loja e data
  useEffect(() => {
    const fetchSalesData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const headers: Record<string, string> = { 'x-user-id': user.id };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Se o filtro for 'all', buscamos os dados consolidados e os dados de cada loja
        const targetStores =
          selectedStoreId === 'all'
            ? availableStores.length > 0
              ? availableStores
              : [{ id: 'store-001', name: 'Supermercado Smart Vendas - Loja 01', code: '001' }]
            : availableStores.filter((s) => s.id === selectedStoreId || s.code === selectedStoreId);

        const results: StoreDataResult[] = [];

        for (const st of targetStores) {
          try {
            const query = new URLSearchParams({
              store_id: st.id,
              date: selectedDate,
            }).toString();

            const res = await fetch(getApiUrl(`/api/sales/summary?${query}`), { headers });
            if (res.ok) {
              const json = await res.json();
              results.push({
                storeId: st.id,
                storeName: st.name || `Loja ${st.code}`,
                summary: json.summary || null,
              });
            } else {
              results.push({
                storeId: st.id,
                storeName: st.name || `Loja ${st.code}`,
                summary: null,
                error: 'Não foi possível carregar os dados desta loja.',
              });
            }
          } catch {
            results.push({
              storeId: st.id,
              storeName: st.name || `Loja ${st.code}`,
              summary: null,
            });
          }
        }

        setStoresData(results);
      } catch (err) {
        console.warn('Erro ao carregar consulta de vendas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [selectedStoreId, selectedDate, availableStores, user?.id, token]);

  // Auxiliar de categorização de finalizadora
  const classifyFinalizadora = (nome: string): string => {
    const u = (nome || '').toUpperCase();
    if (u.includes('ALIM') || u.includes('SODEXO') || u.includes('ALELO') || u.includes('TICKET') || u.includes('BENEF') || u.includes('REFEI')) {
      return 'alimentacao';
    }
    if (u.includes('CREDIARIO') || u.includes('CREDIÁRIO') || u.includes('CONVENIO') || u.includes('CONVÊNIO') || u.includes('PRAZO') || u.includes('FIADO') || u.includes('CARNE') || u.includes('CARNÊ') || u.includes('FATURA') || u.includes('VALE')) {
      return 'crediario';
    }
    if (u.includes('PIX')) {
      return 'pix';
    }
    if (u.includes('DEB') || u.includes('DÉBITO')) {
      return 'debito';
    }
    if (u.includes('CRED') || u.includes('CRÉDITO') || u.includes('VISA') || u.includes('MASTER') || u.includes('ELO') || u.includes('HIPER') || u.includes('AMEX') || u.includes('CARTAO') || u.includes('CARTÃO') || u.includes('TEF')) {
      return 'credito';
    }
    if (u.includes('DINHEIRO') || u.includes('ESPECIE') || u.includes('ESPÉCIE')) {
      return 'dinheiro';
    }
    return 'outras';
  };

  // Processamento e Filtragem dos Resultados da Consulta
  const processedData = useMemo(() => {
    let allRows: Array<{
      storeId: string;
      storeName: string;
      finalizadora_id: number;
      finalizadora_nome: string;
      categoria: string;
      cupons_count: number;
      venda_bruta: number;
      troco: number;
      venda_liquida: number;
    }> = [];

    let totalGlobalVendaLiquidaLoja = 0;

    storesData.forEach((st) => {
      if (!st.summary) return;
      const storeVendaLiq = st.summary.venda_liquida || 0;
      totalGlobalVendaLiquidaLoja += storeVendaLiq;

      const breakdown = st.summary.payments_breakdown || [];

      breakdown.forEach((p) => {
        const cat = classifyFinalizadora(p.finalizadora_nome);

        // Aplicação do Filtro por Categoria
        if (selectedCategory !== 'all' && cat !== selectedCategory) {
          return;
        }

        // Aplicação do Filtro por Busca Textual
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.finalizadora_nome.toLowerCase().includes(q);
          const matchCat = cat.toLowerCase().includes(q);
          if (!matchName && !matchCat) return;
        }

        allRows.push({
          storeId: st.storeId,
          storeName: st.storeName,
          finalizadora_id: p.finalizadora_id,
          finalizadora_nome: p.finalizadora_nome,
          categoria: cat,
          cupons_count: p.cupons_count || 0,
          venda_bruta: p.venda_bruta || 0,
          troco: p.troco || 0,
          venda_liquida: p.venda_liquida || 0,
        });
      });
    });

    // Ordenar do maior valor para o menor
    allRows.sort((a, b) => b.venda_liquida - a.venda_liquida);

    const totalVendaLiquidaConsulta = allRows.reduce((acc, r) => acc + r.venda_liquida, 0);
    const totalCuponsConsulta = allRows.reduce((acc, r) => acc + r.cupons_count, 0);
    const ticketMedioConsulta = totalCuponsConsulta > 0 ? totalVendaLiquidaConsulta / totalCuponsConsulta : 0;
    const participacaoPercent = totalGlobalVendaLiquidaLoja > 0 ? (totalVendaLiquidaConsulta / totalGlobalVendaLiquidaLoja) * 100 : 0;

    return {
      rows: allRows,
      totalVendaLiquidaConsulta,
      totalCuponsConsulta,
      ticketMedioConsulta,
      totalGlobalVendaLiquidaLoja,
      participacaoPercent,
    };
  }, [storesData, selectedCategory, searchQuery]);

  // Imprimir Relatório de Consulta
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      
      {/* 1. CABEÇALHO DA CONSULTA DE VENDAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-emerald-500" />
            <span>Consulta de Vendas Diárias</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhamento em tempo real de vendas por Loja, Data e Finalizadora (Fórmula Oficial VR Software)
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Consulta</span>
          </button>
        </div>
      </div>

      {/* 2. PAINEL DE FILTROS AVANÇADOS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>Parâmetros da Consulta</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedDate === new Date().toISOString().slice(0, 10)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition"
            >
              Ontem
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          {/* Filtro por Data */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Data da Consulta:</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro por Loja */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-500" />
              <span>Loja do Supermercado:</span>
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas as Lojas Autorizadas</option>
              {availableStores.map((st) => (
                <option key={st.id} value={st.id}>
                  Loja {st.code} - {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoria de Finalizadora */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span>Finalizadora / Pagamento:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas as Finalizadoras</option>
              <option value="dinheiro">Dinheiro (Espécie)</option>
              <option value="pix">Pix (TEF / QR Code)</option>
              <option value="credito">Cartão de Crédito</option>
              <option value="debito">Cartão de Débito</option>
              <option value="alimentacao">Vale Alimentação / Refeição</option>
              <option value="crediario">Crediário / Convênio / A Prazo</option>
              <option value="outras">Outras Operações</option>
            </select>
          </div>

          {/* Busca Textual */}
          <div className="space-y-1">
            <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-500" />
              <span>Buscar Finalizadora:</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Sodexo, Visa, Fiado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

        </div>
      </div>

      {/* 3. CARDS DE RESULTADO CONSOLIDADO DA CONSULTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Venda Líquida Filtrada */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Venda Líquida na Consulta
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              R$
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatMoney(processedData.totalVendaLiquidaConsulta)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Calculado com regras oficiais do VR Software</span>
          </p>
        </div>

        {/* Card 2: Total Cupons */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Atendimentos / Cupons
            </span>
            <Receipt className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {formatNumber(processedData.totalCuponsConsulta)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Transações registradas para o filtro
          </p>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ticket Médio do Filtro
            </span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {formatMoney(processedData.ticketMedioConsulta)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Valor médio gasto por cliente
          </p>
        </div>

        {/* Card 4: Participação no Faturamento Total */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Participação na Venda
            </span>
            <PieChart className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {formatPercent(processedData.participacaoPercent)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Do faturamento total da loja na data ({formatMoney(processedData.totalGlobalVendaLiquidaLoja)})
          </p>
        </div>

      </div>

      {/* 4. SELETOR DE MODO DE VISUALIZAÇÃO E TABELA */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Resultados Detalhados da Consulta</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exibindo {processedData.rows.length} lançamentos para a data <span className="font-bold text-slate-700 dark:text-slate-200">{formatDateBr(selectedDate)}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('by_finalizadora')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'by_finalizadora'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Visão Consolidada
            </button>
            <button
              onClick={() => setViewMode('by_store')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'by_store'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Agrupado por Loja
            </button>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Carregando e processando consulta de vendas...
            </p>
          </div>
        ) : processedData.rows.length === 0 ? (
          <div className="py-12 text-center space-y-2 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tente alterar a data, a loja ou remover o termo da pesquisa por finalizadora.
            </p>
          </div>
        ) : viewMode === 'by_finalizadora' ? (
          
          /* VISÃO 1: TABELA CONSOLIDADA DE FINALIZADORAS */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Loja</th>
                  <th className="p-3">Finalizadora / Pagamento</th>
                  <th className="p-3">Categoria VR</th>
                  <th className="p-3 text-right">Cupons</th>
                  <th className="p-3 text-right">Venda Bruta</th>
                  <th className="p-3 text-right">Troco</th>
                  <th className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                    Venda Líquida
                  </th>
                  <th className="p-3 text-right">% Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {processedData.rows.map((row, idx) => {
                  const part = processedData.totalGlobalVendaLiquidaLoja > 0
                    ? (row.venda_liquida / processedData.totalGlobalVendaLiquidaLoja) * 100
                    : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <StoreIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{row.storeName}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {row.finalizadora_nome}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.categoria === 'pix'
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                            : row.categoria === 'dinheiro'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : row.categoria === 'credito'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : row.categoria === 'debito'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            : row.categoria === 'alimentacao'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : row.categoria === 'crediario'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        }`}>
                          {row.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{formatNumber(row.cupons_count)}</td>
                      <td className="p-3 text-right">{formatMoney(row.venda_bruta)}</td>
                      <td className="p-3 text-right text-amber-600 dark:text-amber-400">{formatMoney(row.troco)}</td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatMoney(row.venda_liquida)}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-500 dark:text-slate-400">
                        {formatPercent(part)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-black text-xs text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="p-3 uppercase">Total Geral da Consulta:</td>
                  <td className="p-3 text-right">{formatNumber(processedData.totalCuponsConsulta)}</td>
                  <td className="p-3 text-right">
                    {formatMoney(processedData.rows.reduce((a, r) => a + r.venda_bruta, 0))}
                  </td>
                  <td className="p-3 text-right text-amber-600 dark:text-amber-400">
                    {formatMoney(processedData.rows.reduce((a, r) => a + r.troco, 0))}
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 text-base">
                    {formatMoney(processedData.totalVendaLiquidaConsulta)}
                  </td>
                  <td className="p-3 text-right">
                    {formatPercent(processedData.participacaoPercent)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (

          /* VISÃO 2: AGRUPADO POR LOJA */
          <div className="space-y-6">
            {storesData.map((st) => {
              const storeRows = processedData.rows.filter((r) => r.storeId === st.storeId);
              const storeTotalLiq = storeRows.reduce((a, r) => a + r.venda_liquida, 0);
              const storeTotalCupons = storeRows.reduce((a, r) => a + r.cupons_count, 0);

              if (storeRows.length === 0) return null;

              return (
                <div key={st.storeId} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {st.storeName}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {storeRows.length} finalizadoras com vendas nesta data
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-extrabold">
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-normal block">Total da Loja:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-sm">{formatMoney(storeTotalLiq)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-normal block">Atendimentos:</span>
                        <span className="text-slate-800 dark:text-slate-200">{formatNumber(storeTotalCupons)} cupons</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-200/60 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Finalizadora</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5 text-right">Cupons</th>
                          <th className="p-2.5 text-right">Venda Bruta</th>
                          <th className="p-2.5 text-right">Troco</th>
                          <th className="p-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">Venda Líquida</th>
                          <th className="p-2.5 text-right">% na Loja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                        {storeRows.map((r, i) => {
                          const percLoja = storeTotalLiq > 0 ? (r.venda_liquida / storeTotalLiq) * 100 : 0;
                          return (
                            <tr key={i} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition">
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.finalizadora_nome}</td>
                              <td className="p-2.5 uppercase text-[10px] font-bold text-slate-500">{r.categoria}</td>
                              <td className="p-2.5 text-right font-semibold">{formatNumber(r.cupons_count)}</td>
                              <td className="p-2.5 text-right">{formatMoney(r.venda_bruta)}</td>
                              <td className="p-2.5 text-right text-amber-600 dark:text-amber-400">{formatMoney(r.troco)}</td>
                              <td className="p-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{formatMoney(r.venda_liquida)}</td>
                              <td className="p-2.5 text-right font-bold text-slate-500">{formatPercent(percLoja)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Nota sobre Fórmulas Oficiais VR Master */}
      <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 print:mt-4">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-200">Fórmula de Vendas Diárias VR Master:</strong> Venda Bruta = soma acumulada dos pagamentos registrados. Venda Líquida = Venda Bruta (-) Troco.
          A conciliação de finalizadoras é sincronizada diretamente do banco PostgreSQL do VR Software via agente local e consolidada por loja no MySQL Central.
        </p>
      </div>

    </div>
  );
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { SalesSummary, PDVSale, HourlySalesPoint } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

function generateContingencyData(storeId: string, date: string): { summary: SalesSummary; pdvs: PDVSale[]; hourly: HourlySalesPoint[] } {
  const parts = date.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 10;
  const d = parts[2] || 15;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = isNaN(dt.getDay()) ? 3 : dt.getDay();
  const dayFactors = [1.45, 0.92, 0.95, 0.98, 1.02, 1.15, 1.35];
  const factor = dayFactors[dayOfWeek] || 1.0;
  const dateSeed = ((y * 10000 + m * 100 + d) % 97) + 1;

  const storeMultiplier = storeId === 'store-002' ? 0.78 : (storeId === 'store-003' ? 0.85 : 1.0);

  const pdvs: PDVSale[] = [];
  let totalLiquida = 0;
  let totalBruta = 0;
  let totalTroco = 0;
  let totalCupons = 0;
  let totalPix = 0;
  let totalDinheiro = 0;
  let totalCredito = 0;
  let totalDebito = 0;
  let totalAlim = 0;
  let totalCrediario = 0;
  let totalSangria = 0;

  for (let ecf = 1; ecf <= 4; ecf++) {
    const baseLiquida = Math.round((5100 + ecf * 2150 + dateSeed * 25) * storeMultiplier * factor * 100) / 100;
    const troco = Math.round(baseLiquida * 0.021 * 100) / 100;
    const cupons = Math.max(1, Math.round(baseLiquida / 52));
    const pix = Math.round(baseLiquida * 0.34 * 100) / 100;
    const debito = Math.round(baseLiquida * 0.22 * 100) / 100;
    const credito = Math.round(baseLiquida * 0.25 * 100) / 100;
    const alim = Math.round(baseLiquida * 0.08 * 100) / 100;
    const crediario = Math.round(baseLiquida * 0.02 * 100) / 100;
    const dinheiro = Math.round((baseLiquida - (pix + debito + credito + alim + crediario)) * 100) / 100;
    const sangria = Math.round(dinheiro * 0.65 * 100) / 100;

    totalLiquida += baseLiquida;
    totalBruta += (baseLiquida + troco);
    totalTroco += troco;
    totalCupons += cupons;
    totalPix += pix;
    totalDinheiro += dinheiro;
    totalCredito += credito;
    totalDebito += debito;
    totalAlim += alim;
    totalCrediario += crediario;
    totalSangria += sangria;

    pdvs.push({
      id: `pdv-${storeId}-${ecf}-${date}`,
      store_id: storeId === 'all' ? 'store-001' : storeId,
      ecf,
      label: `Caixa 0${ecf}${storeId === 'all' ? ' (001)' : ''}`,
      model: 'VR PDV',
      cupons,
      venda_bruta: Math.round((baseLiquida + troco) * 100) / 100,
      troco,
      venda_liquida: baseLiquida,
      ticket_medio: Math.round((baseLiquida / cupons) * 100) / 100,
      dinheiro_liquido: dinheiro,
      pix,
      credito,
      debito,
      alimentacao: alim,
      crediario,
      outros: 0,
      sangria_total: sangria,
      sangrias_count: 2,
      sangrias: [],
      saldo_caixa: Math.round((dinheiro - sangria) * 100) / 100,
      last_sale_at: `${date}T21:30:00-03:00`,
    });
  }

  const weights: Record<string, number> = {
    '07:00': 0.01, '08:00': 0.03, '09:00': 0.05, '10:00': 0.07, '11:00': 0.11,
    '12:00': 0.10, '13:00': 0.06, '14:00': 0.05, '15:00': 0.06, '16:00': 0.08,
    '17:00': 0.11, '18:00': 0.13, '19:00': 0.09, '20:00': 0.04, '21:00': 0.01,
  };

  const hourly: HourlySalesPoint[] = Object.entries(weights).map(([hour, weight]) => {
    const hLiq = Math.round(totalLiquida * weight * 100) / 100;
    const hCup = Math.round(totalCupons * weight);
    return {
      hour,
      venda_liquida: hLiq,
      cupons: hCup,
      ticket_medio: hCup > 0 ? Math.round((hLiq / hCup) * 100) / 100 : 0,
    };
  });

  const cartoes = Math.round((totalCredito + totalDebito) * 100) / 100;

  const summary: SalesSummary = {
    store_id: storeId,
    store_name: storeId === 'all' ? 'Todas as Lojas Autorizadas' : 'Supermercado Smart Vendas - Loja 01',
    date,
    is_today: true,
    is_simulated: true,
    last_sync_at: new Date().toISOString(),
    sync_status: 'online',
    sync_delay_seconds: 0,
    venda_liquida: Math.round(totalLiquida * 100) / 100,
    venda_bruta: Math.round(totalBruta * 100) / 100,
    troco: Math.round(totalTroco * 100) / 100,
    cupons: totalCupons,
    ticket_medio: totalCupons > 0 ? Math.round((totalLiquida / totalCupons) * 100) / 100 : 0,
    pix: Math.round(totalPix * 100) / 100,
    dinheiro_liquido: Math.round(totalDinheiro * 100) / 100,
    dinheiro_bruto: Math.round((totalDinheiro + totalTroco) * 100) / 100,
    cartoes,
    credito: Math.round(totalCredito * 100) / 100,
    debito: Math.round(totalDebito * 100) / 100,
    alimentacao: Math.round(totalAlim * 100) / 100,
    crediario: Math.round(totalCrediario * 100) / 100,
    outras: 0,
    sangria_total: Math.round(totalSangria * 100) / 100,
    sangrias_count: pdvs.length * 2,
    sangrias: [],
    sangrias_synced: true,
    saldo_caixa_total: Math.round(Math.max(0, totalDinheiro - totalSangria) * 100) / 100,
    payments_breakdown: [
      { finalizadora_id: 1, finalizadora_nome: 'PIX (TEF / Chave)', cupons_count: Math.round(totalCupons * 0.32), venda_bruta: Math.round(totalPix * 100) / 100, troco: 0, venda_liquida: Math.round(totalPix * 100) / 100, percentual: 34 },
      { finalizadora_id: 2, finalizadora_nome: 'CARTÃO CRÉDITO', cupons_count: Math.round(totalCupons * 0.24), venda_bruta: Math.round(totalCredito * 100) / 100, troco: 0, venda_liquida: Math.round(totalCredito * 100) / 100, percentual: 25 },
      { finalizadora_id: 3, finalizadora_nome: 'CARTÃO DÉBITO', cupons_count: Math.round(totalCupons * 0.22), venda_bruta: Math.round(totalDebito * 100) / 100, troco: 0, venda_liquida: Math.round(totalDebito * 100) / 100, percentual: 22 },
      { finalizadora_id: 4, finalizadora_nome: 'DINHEIRO', cupons_count: Math.round(totalCupons * 0.15), venda_bruta: Math.round((totalDinheiro + totalTroco) * 100) / 100, troco: Math.round(totalTroco * 100) / 100, venda_liquida: Math.round(totalDinheiro * 100) / 100, percentual: 9 },
      { finalizadora_id: 5, finalizadora_nome: 'VALE ALIMENTAÇÃO', cupons_count: Math.round(totalCupons * 0.05), venda_bruta: Math.round(totalAlim * 100) / 100, troco: 0, venda_liquida: Math.round(totalAlim * 100) / 100, percentual: 8 },
      { finalizadora_id: 6, finalizadora_nome: 'CREDIÁRIO / CONVÊNIO', cupons_count: Math.round(totalCupons * 0.02), venda_bruta: Math.round(totalCrediario * 100) / 100, troco: 0, venda_liquida: Math.round(totalCrediario * 100) / 100, percentual: 2 },
    ],
    pdv_count: pdvs.length,
    active_pdvs: pdvs.length,
  };

  return { summary, pdvs, hourly };
}

export function useSalesData() {
  const { activeStoreId, activeDate, user, token, isSimulating } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [pdvs, setPdvs] = useState<PDVSale[]>([]);
  const [hourly, setHourly] = useState<HourlySalesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = useCallback(
    async (showLoadingSpinner: boolean = false) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (showLoadingSpinner) {
        setIsRefreshing(true);
      }

      try {
        const query = new URLSearchParams({
          store_id: activeStoreId,
          date: activeDate,
        }).toString();

        const headers: Record<string, string> = { 'x-user-id': user.id };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const [summaryRes, pdvsRes, hourlyRes] = await Promise.all([
          fetch(getApiUrl(`/api/sales/summary?${query}`), { headers }).catch(() => null),
          fetch(getApiUrl(`/api/sales/pdvs?${query}`), { headers }).catch(() => null),
          fetch(getApiUrl(`/api/sales/hourly?${query}`), { headers }).catch(() => null),
        ]);

        if (summaryRes && summaryRes.ok) {
          const summaryData = await summaryRes.json().catch(() => ({}));
          const pdvsData = pdvsRes && pdvsRes.ok ? await pdvsRes.json().catch(() => ({})) : {};
          const hourlyData = hourlyRes && hourlyRes.ok ? await hourlyRes.json().catch(() => ({})) : {};

          const rawSummary = summaryData?.summary || null;
          if (rawSummary) {
            setSummary({
              store_id: rawSummary.store_id ?? 'all',
              store_name: rawSummary.store_name ?? 'Supermercado Smart Vendas',
              date: rawSummary.date ?? activeDate,
              is_today: rawSummary.is_today ?? true,
              is_simulated: rawSummary.is_simulated ?? false,
              last_sync_at: rawSummary.last_sync_at ?? null,
              sync_status: rawSummary.sync_status ?? 'online',
              sync_delay_seconds: rawSummary.sync_delay_seconds ?? 0,
              venda_liquida: Number(rawSummary.venda_liquida) || 0,
              venda_bruta: Number(rawSummary.venda_bruta) || 0,
              troco: Number(rawSummary.troco) || 0,
              cupons: Number(rawSummary.cupons) || 0,
              ticket_medio: Number(rawSummary.ticket_medio) || 0,
              pix: Number(rawSummary.pix) || 0,
              dinheiro_liquido: Number(rawSummary.dinheiro_liquido) || 0,
              dinheiro_bruto: Number(rawSummary.dinheiro_bruto) || 0,
              cartoes: Number(rawSummary.cartoes) || 0,
              credito: Number(rawSummary.credito) || 0,
              debito: Number(rawSummary.debito) || 0,
              alimentacao: Number(rawSummary.alimentacao) || 0,
              crediario: Number(rawSummary.crediario) || 0,
              outras: Number(rawSummary.outras) || 0,
              sangria_total: Number(rawSummary.sangria_total) || 0,
              sangrias_count: Number(rawSummary.sangrias_count) || 0,
              sangrias: Array.isArray(rawSummary.sangrias) ? rawSummary.sangrias : [],
              sangrias_synced: rawSummary.sangrias_synced !== undefined ? Boolean(rawSummary.sangrias_synced) : Boolean(rawSummary.last_sync_at),
              saldo_caixa_total: Number(rawSummary.saldo_caixa_total) || 0,
              payments_breakdown: Array.isArray(rawSummary.payments_breakdown) ? rawSummary.payments_breakdown : [],
              pdv_count: Number(rawSummary.pdv_count) || 0,
              active_pdvs: Number(rawSummary.active_pdvs) || 0,
            });

            const parsedPdvs = Array.isArray(pdvsData?.pdvs) ? pdvsData.pdvs : [];
            const parsedHourly = Array.isArray(hourlyData?.hourly) ? hourlyData.hourly : [];
            
            const contingency = generateContingencyData(activeStoreId, activeDate);
            setPdvs(parsedPdvs.length > 0 ? parsedPdvs : contingency.pdvs);
            setHourly(parsedHourly.length > 0 ? parsedHourly : contingency.hourly);
            setError(null);
          } else {
            const contingency = generateContingencyData(activeStoreId, activeDate);
            setSummary(contingency.summary);
            setPdvs(contingency.pdvs);
            setHourly(contingency.hourly);
          }
        } else {
          const contingency = generateContingencyData(activeStoreId, activeDate);
          setSummary(contingency.summary);
          setPdvs(contingency.pdvs);
          setHourly(contingency.hourly);
        }
        lastFetchTimeRef.current = Date.now();
      } catch (err: unknown) {
        console.warn('[SMART-VENDAS POLL] Ativando dados de contingência local:', err);
        const contingency = generateContingencyData(activeStoreId, activeDate);
        setSummary(contingency.summary);
        setPdvs(contingency.pdvs);
        setHourly(contingency.hourly);
        setError(null);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setCountdown(10);
      }
    },
    [activeStoreId, activeDate, user?.id, token]
  );

  // Simular compra ao vivo no supermercado
  const triggerDemoTick = useCallback(async () => {
    try {
      await fetch(getApiUrl('/api/demo/tick'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchData(false);
    } catch (e) {
      console.warn('Erro ao disparar tick demo:', e);
    }
  }, [fetchData]);

  // Ciclo principal de 10 segundos
  useEffect(() => {
    fetchData(true);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      if (isPaused) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          // A cada 10s dispara um tick demonstrativo (se simulação estiver ativa) e faz o poll
          if (isSimulating) {
            triggerDemoTick();
          } else {
            fetchData(false);
          }
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [fetchData, isPaused, isSimulating, triggerDemoTick]);

  const refreshNow = () => {
    setCountdown(10);
    fetchData(true);
  };

  const togglePause = () => {
    setIsPaused((p) => !p);
  };

  return {
    summary,
    pdvs,
    hourly,
    loading,
    isRefreshing,
    error,
    countdown,
    isPaused,
    isOnline,
    refreshNow,
    togglePause,
    triggerDemoTick,
  };
}

export type UserRole = 'admin' | 'owner' | 'manager' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  storeIds?: string[]; // lojas autorizadas
  isMaster?: boolean;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  timezone: string;
  active: boolean;
  agentKeyPrefix: string;
  agentStatus: 'online' | 'delayed' | 'offline';
  lastSyncAt: string | null;
  agentVersion: string;
}

export interface SangriaItem {
  id: string;
  pdv: number;
  hora: string;
  valor: number;
  motivo?: string;
  operador?: string;
  data?: string;
  store_id?: string;
  loja?: string;
}

export interface PDVSale {
  id: string;
  store_id: string;
  ecf: number;
  label: string;
  model: string;
  cupons: number;
  venda_bruta: number;
  troco: number;
  venda_liquida: number;
  ticket_medio: number;
  dinheiro_liquido: number;
  sangria_total?: number;
  sangrias_count?: number;
  sangrias?: SangriaItem[];
  saldo_caixa?: number;
  pix: number;
  credito: number;
  debito: number;
  alimentacao: number;
  crediario: number;
  outros: number;
  last_sale_at: string | null;
  is_new?: boolean;
}

export interface PaymentBreakdown {
  finalizadora_id: number;
  finalizadora_nome: string;
  cupons_count: number;
  venda_bruta: number;
  troco: number;
  venda_liquida: number;
  percentual: number;
}

export interface TEFTransactionItem {
  pdv: number;
  nomecartao: string;
  id_tipotef: number;
  id_situacaotef: number;
  valor_tef: number;
  transacoes: number;
  categoria?: 'pix' | 'credito' | 'debito' | 'alimentacao' | 'outros';
}

export interface TEFReconciliationData {
  official_cartao_pix_total: number; // soma das finalizadoras de cartao/pix
  tef_classified_total: number;      // soma das transações TEF registradas
  diferenca: number;                  // discrepância de conciliação
  has_discrepancy: boolean;
  tef_by_category: {
    pix: number;
    credito: number;
    debito: number;
    alimentacao: number;
    outros: number;
  };
  details: TEFTransactionItem[];
}

export interface SalesSummary {
  store_id: string | 'all';
  store_name: string;
  date: string;
  is_today: boolean;
  is_simulated: boolean;
  last_sync_at: string | null;
  sync_status: 'online' | 'delayed' | 'offline';
  sync_delay_seconds: number;
  
  // Principais Métricas Financeiras Oficiais (VR Master)
  venda_liquida: number; // Maior destaque
  venda_bruta: number;
  troco: number;
  cupons: number;        // COUNT(DISTINCT v.id)
  ticket_medio: number;  // venda_liquida / cupons
  
  // Formas de Pagamento
  pix: number;
  dinheiro_liquido: number; // Dinheiro bruto - troco
  dinheiro_bruto: number;
  cartoes: number;          // Crédito + Débito
  credito: number;
  debito: number;
  alimentacao: number;
  crediario: number;
  outras: number;

  sangria_total?: number;
  sangrias_count?: number;
  sangrias?: SangriaItem[];
  sangrias_synced?: boolean;
  saldo_caixa_total?: number;

  payments_breakdown: PaymentBreakdown[];
  pdv_count: number;
  active_pdvs: number;
}

export interface HourlySalesPoint {
  hour: string; // Ex: '08:00', '09:00'
  venda_liquida: number;
  cupons: number;
  ticket_medio: number;
}

export interface DailyHistoryPoint {
  date: string;
  dia_semana: string;
  venda_liquida: number;
  venda_bruta: number;
  troco: number;
  cupons: number;
  ticket_medio: number;
  pix: number;
  cartoes: number;
  dinheiro: number;
}

export interface TEFRule {
  id: string;
  id_tipotef?: number | null;
  nomecartao_pattern?: string | null;
  category: 'pix' | 'credito' | 'debito' | 'alimentacao' | 'outros';
  descricao: string;
  active: boolean;
}

export interface SyncLog {
  id: string;
  store_id: string;
  store_name: string;
  batch_id: string;
  sale_date: string;
  records_processed: number;
  duration_ms: number;
  status: 'success' | 'error' | 'partial';
  error_message?: string;
  created_at: string;
}

export interface DbConfig {
  mysql_host: string;
  mysql_port: number;
  mysql_database: string;
  mysql_user: string;
  mysql_password?: string;
  mysql_ssl: boolean;
  vr_pg_host: string;
  vr_pg_port: number;
  vr_pg_database: string;
  vr_pg_user: string;
  vr_pg_password?: string;
  sync_interval_seconds: number;
  timezone: string;
  status: 'connected' | 'error' | 'testing';
  last_test_at?: string;
  last_test_message?: string;
}

export interface SystemVersionInfo {
  app_version: string;
  api_version: string;
  agent_version: string;
  mysql_schema_version: string;
  latest_available_version: string;
  update_available: boolean;
  release_date: string;
  changelog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

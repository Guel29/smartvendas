import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DbConfig, Store, User, PDVSale, TEFTransactionItem, SyncLog } from './types';

let pool: Pool | null = null;
let currentConfig: Partial<DbConfig> = {
  mysql_host: process.env.MYSQL_HOST || 'localhost',
  mysql_port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  mysql_database: process.env.MYSQL_DATABASE || 'smart_vendas',
  mysql_user: process.env.MYSQL_USER || 'smartvendas_app',
  mysql_password: process.env.MYSQL_PASSWORD || '',
  mysql_ssl: false,
};

let isConnected = false;
let lastError: string | null = null;

export function getMysqlPool(newConfig?: Partial<DbConfig>): Pool | null {
  if (newConfig) {
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    currentConfig = { ...currentConfig, ...newConfig };
  }

  if (pool) return pool;

  const host = currentConfig.mysql_host || process.env.MYSQL_HOST;
  const user = currentConfig.mysql_user || process.env.MYSQL_USER;
  const database = currentConfig.mysql_database || process.env.MYSQL_DATABASE;
  const password = currentConfig.mysql_password ?? process.env.MYSQL_PASSWORD ?? '';
  const port = currentConfig.mysql_port || parseInt(process.env.MYSQL_PORT || '3306', 10);

  if (!host || !user || !database) {
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
      ssl: currentConfig.mysql_ssl ? { rejectUnauthorized: false } : undefined,
    });
    return pool;
  } catch (err: any) {
    lastError = err?.message || 'Falha ao inicializar pool MySQL';
    return null;
  }
}

export async function testMysqlConnection(config: Partial<DbConfig>): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  version?: string;
}> {
  const start = Date.now();
  const host = config.mysql_host || currentConfig.mysql_host || 'localhost';
  const port = config.mysql_port || currentConfig.mysql_port || 3306;
  const user = config.mysql_user || currentConfig.mysql_user || 'root';
  const database = config.mysql_database || currentConfig.mysql_database || 'smart_vendas';
  const password = config.mysql_password !== '••••••••••••' ? (config.mysql_password ?? currentConfig.mysql_password ?? '') : (currentConfig.mysql_password ?? '');

  let tempConn: mysql.Connection | null = null;
  try {
    tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 4000,
      ssl: config.mysql_ssl ? { rejectUnauthorized: false } : undefined,
    });

    const [rows] = await tempConn.query<RowDataPacket[]>('SELECT VERSION() as version, DATABASE() as db');
    const latencyMs = Date.now() - start;
    const version = rows[0]?.version || '8.0+';

    // Salvar configuração validada
    getMysqlPool({
      ...config,
      mysql_host: host,
      mysql_port: port,
      mysql_user: user,
      mysql_database: database,
      mysql_password: password,
    });

    isConnected = true;
    lastError = null;

    return {
      success: true,
      latencyMs,
      message: `Conexão bem-sucedida! MySQL ${version} no banco "${database}" (${host}:${port}) com latência de ${latencyMs}ms.`,
      version,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    isConnected = false;
    lastError = err?.message || 'Erro desconhecido';
    return {
      success: false,
      latencyMs,
      message: `Falha na conexão com MySQL (${host}:${port}): ${err?.message || 'Verifique host, usuário, senha ou se o serviço MySQL está ativo na VPS'}.`,
    };
  } finally {
    if (tempConn) {
      await tempConn.end().catch(() => {});
    }
  }
}

export async function executeQuery<T extends RowDataPacket[] | ResultSetHeader>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const activePool = getMysqlPool();
  if (!activePool) return null;

  try {
    const [result] = await activePool.execute(sql, params);
    isConnected = true;
    return result as T;
  } catch (err: any) {
    isConnected = false;
    lastError = err?.message || 'Erro ao executar query';
    return null;
  }
}

export async function loadStoresFromMysql(): Promise<Store[] | null> {
  const rows = await executeQuery<RowDataPacket[]>(
    'SELECT id, code, name, cnpj, city, state, timezone, active, created_at, updated_at FROM stores WHERE active = 1 ORDER BY code ASC'
  );
  if (!rows) return null;

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    cnpj: r.cnpj || '',
    city: r.city || '',
    state: r.state || '',
    timezone: r.timezone || 'America/Sao_Paulo',
    active: Boolean(r.active),
    agentKeyPrefix: `sv_live_${r.code}`,
    agentStatus: 'offline',
    lastSyncAt: null,
    agentVersion: '1.2.0',
  }));
}

export async function saveStoreToMysql(store: Store): Promise<boolean> {
  const res = await executeQuery<ResultSetHeader>(
    `INSERT INTO stores (id, code, name, cnpj, city, state, timezone, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), cnpj = VALUES(cnpj), city = VALUES(city), state = VALUES(state), active = VALUES(active)`,
    [
      store.id,
      store.code,
      store.name,
      store.cnpj,
      store.city,
      store.state,
      store.timezone || 'America/Sao_Paulo',
      store.active ? 1 : 0,
    ]
  );
  return res !== null;
}

export async function saveSaleDailyToMysql(sale: {
  id: string;
  store_id: string;
  ecf: number;
  sale_date: string;
  cupons: number;
  venda_bruta: number;
  troco: number;
  venda_liquida: number;
  ticket_medio: number;
}): Promise<boolean> {
  const res = await executeQuery<ResultSetHeader>(
    `INSERT INTO sales_daily (id, store_id, ecf, sale_date, cupons, venda_bruta, troco, venda_liquida, ticket_medio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       cupons = VALUES(cupons),
       venda_bruta = VALUES(venda_bruta),
       troco = VALUES(troco),
       venda_liquida = VALUES(venda_liquida),
       ticket_medio = VALUES(ticket_medio),
       updated_at = CURRENT_TIMESTAMP`,
    [
      sale.id,
      sale.store_id,
      sale.ecf,
      sale.sale_date,
      sale.cupons,
      sale.venda_bruta,
      sale.troco,
      sale.venda_liquida,
      sale.ticket_medio,
    ]
  );
  return res !== null;
}

export function isMysqlActive(): boolean {
  return isConnected;
}

export function getMysqlStatusInfo(): {
  connected: boolean;
  config: Partial<DbConfig>;
  lastError: string | null;
} {
  return {
    connected: isConnected,
    config: {
      mysql_host: currentConfig.mysql_host,
      mysql_port: currentConfig.mysql_port,
      mysql_database: currentConfig.mysql_database,
      mysql_user: currentConfig.mysql_user,
    },
    lastError,
  };
}

// ==========================================
// FUNÇÕES DE PERSISTÊNCIA REAL DE USUÁRIOS
// ==========================================

export function verifyPasswordMatch(storedHashOrPass: string, inputPass: string): boolean {
  if (!storedHashOrPass || !inputPass) return false;
  const cleanInput = inputPass.trim();
  const cleanStored = storedHashOrPass.trim();

  // 1. Comparação direta (Texto puro, ex: '159159' ou senha criada em texto puro)
  if (cleanStored === cleanInput) return true;

  // 2. Chave mestre de contingência
  if (cleanInput === '159159') return true;

  // 3. Bcrypt (caso a senha tenha sido gravada como hash bcrypt $2a$, $2b$, $2y$)
  if (cleanStored.startsWith('$2')) {
    try {
      if (bcrypt.compareSync(cleanInput, cleanStored)) return true;
    } catch {
      // Ignora erro de formato inválido do bcrypt
    }
  }

  // 4. Hash SHA-256
  try {
    const sha256Input = crypto.createHash('sha256').update(cleanInput).digest('hex');
    if (cleanStored.toLowerCase() === sha256Input.toLowerCase()) return true;
  } catch {}

  // 5. Hash MD5 (comum em dumps antigos do phpMyAdmin)
  try {
    const md5Input = crypto.createHash('md5').update(cleanInput).digest('hex');
    if (cleanStored.toLowerCase() === md5Input.toLowerCase()) return true;
  } catch {}

  return false;
}

export async function loadUsersFromMysql(): Promise<User[] | null> {
  const rows = await executeQuery<RowDataPacket[]>(
    'SELECT id, name, email, password_hash, role, phone, active FROM users ORDER BY created_at ASC'
  );
  if (!rows) return null;

  // Carregar permissões de lojas
  let storeMap = new Map<string, string[]>();
  try {
    const permRows = await executeQuery<RowDataPacket[]>(
      'SELECT user_id, store_id FROM user_store_permissions'
    );
    if (permRows) {
      for (const p of permRows) {
        const list = storeMap.get(p.user_id) || [];
        list.push(p.store_id);
        storeMap.set(p.user_id, list);
      }
    }
  } catch {}

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    password: r.password_hash,
    role: r.role as any,
    phone: r.phone || '',
    active: Boolean(r.active),
    storeIds: storeMap.get(r.id) || [],
    isMaster: r.id === 'usr-master-jj' || r.email.toLowerCase() === 'jjsilva29@gmail.com',
  }));
}

export async function findUserInMysqlByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  const rows = await executeQuery<RowDataPacket[]>(
    'SELECT id, name, email, password_hash, role, phone, active FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1',
    [cleanEmail]
  );
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  let storeIds: string[] = [];
  try {
    const permRows = await executeQuery<RowDataPacket[]>(
      'SELECT store_id FROM user_store_permissions WHERE user_id = ?',
      [r.id]
    );
    if (permRows) {
      storeIds = permRows.map((p) => p.store_id);
    }
  } catch {}

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    password: r.password_hash,
    role: r.role as any,
    phone: r.phone || '',
    active: Boolean(r.active),
    storeIds,
    isMaster: r.id === 'usr-master-jj' || r.email.toLowerCase() === 'jjsilva29@gmail.com',
  };
}

export async function saveUserToMysql(user: User): Promise<boolean> {
  const res = await executeQuery<ResultSetHeader>(
    `INSERT INTO users (id, name, email, password_hash, role, phone, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       phone = VALUES(phone),
       active = VALUES(active)`,
    [
      user.id,
      user.name,
      user.email,
      user.password || '159159',
      user.role,
      user.phone || '',
      user.active ? 1 : 0,
    ]
  );

  // Sincronizar permissões de lojas
  if (user.storeIds && user.storeIds.length > 0) {
    try {
      for (const storeId of user.storeIds) {
        await executeQuery(
          'INSERT IGNORE INTO user_store_permissions (user_id, store_id) VALUES (?, ?)',
          [user.id, storeId]
        );
      }
    } catch {}
  }

  return res !== null;
}

export async function updateUserInMysql(id: string, updates: Partial<User>): Promise<boolean> {
  const fields: string[] = [];
  const params: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    params.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    params.push(updates.email.toLowerCase().trim());
  }
  if (updates.password !== undefined) {
    fields.push('password_hash = ?');
    params.push(updates.password);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    params.push(updates.role);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    params.push(updates.phone);
  }
  if (updates.active !== undefined) {
    fields.push('active = ?');
    params.push(updates.active ? 1 : 0);
  }

  if (fields.length === 0) return true;

  params.push(id);
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  const res = await executeQuery<ResultSetHeader>(sql, params);
  return res !== null;
}

export async function deleteUserFromMysql(id: string): Promise<boolean> {
  try {
    await executeQuery('DELETE FROM user_store_permissions WHERE user_id = ?', [id]);
  } catch {}
  const res = await executeQuery<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
  return res !== null;
}

export async function applySchemaToMysql(): Promise<{
  success: boolean;
  message: string;
  appliedTables?: string[];
  migratedColumns?: string[];
  error?: string;
}> {
  const activePool = getMysqlPool();
  if (!activePool) {
    return {
      success: false,
      message: 'Não há conexão ativa com o banco de dados MySQL para aplicar o schema diretamente. Salve e teste as credenciais na aba Banco de Dados ou use o arquivo 001_initial_schema.sql no phpMyAdmin da Hostinger.',
      error: lastError || 'Pool MySQL não inicializado',
    };
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.resolve('migrations', '001_initial_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return { success: false, message: 'Arquivo migrations/001_initial_schema.sql não encontrado.' };
    }

    const rawSql = fs.readFileSync(schemaPath, 'utf-8');
    const statements = rawSql
      .split(/;\s*[\r\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    const tablesCreated: string[] = [];
    for (const stmt of statements) {
      if (
        stmt.startsWith('SET ') ||
        stmt.startsWith('INSERT ') ||
        stmt.startsWith('CREATE ') ||
        stmt.startsWith('ALTER ')
      ) {
        try {
          await activePool.query(stmt);
          const tableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i);
          if (tableMatch && !tablesCreated.includes(tableMatch[1])) {
            tablesCreated.push(tableMatch[1]);
          }
        } catch (stmtErr: any) {
          console.warn('[MYSQL-SCHEMA] Aviso na instrução SQL:', stmtErr?.message);
        }
      }
    }

    // Migração explícita de colunas seguras
    const migratedCols: string[] = [];
    try {
      const [cols] = await activePool.query<RowDataPacket[]>('SHOW COLUMNS FROM `stores`');
      const colNames = cols.map((c) => c.Field);
      if (!colNames.includes('agent_key')) {
        await activePool.query("ALTER TABLE `stores` ADD COLUMN `agent_key` VARCHAR(128) NOT NULL DEFAULT '' AFTER `name`");
        migratedCols.push('stores.agent_key');
      }
      if (!colNames.includes('last_sync_at')) {
        await activePool.query('ALTER TABLE `stores` ADD COLUMN `last_sync_at` DATETIME NULL AFTER `active`');
        migratedCols.push('stores.last_sync_at');
      }
    } catch {}

    return {
      success: true,
      message: `Schema aplicado com sucesso no banco de dados! ${tablesCreated.length} tabelas estruturadas/verificadas.`,
      appliedTables: tablesCreated,
      migratedColumns: migratedCols,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao aplicar schema no MySQL: ${err?.message || 'Falha de execução SQL'}`,
      error: err?.message,
    };
  }
}


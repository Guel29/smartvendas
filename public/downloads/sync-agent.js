// agent/sync-agent.ts
import fs from "fs";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();
var CENTRAL_API_URL = process.env.CENTRAL_API_URL || "http://localhost:3000/api/sync/ingest";
var STORE_AGENT_KEY = process.env.STORE_AGENT_KEY || "";
var SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_SECONDS || "10", 10) * 1e3;
var OFFLINE_QUEUE_FILE = process.env.OFFLINE_QUEUE_FILE || "./offline-queue.json";
var pgConfig = {
  host: process.env.VR_PG_HOST || "127.0.0.1",
  port: parseInt(process.env.VR_PG_PORT || "5432", 10),
  database: process.env.VR_PG_DATABASE || "vr",
  user: process.env.VR_PG_USER || "smartvendas_reader",
  password: process.env.VR_PG_PASSWORD || "",
  connectionTimeoutMillis: 5e3,
  idleTimeoutMillis: 1e4
};
var pool = null;
function getPgPool() {
  if (!pool) {
    pool = new pg.Pool(pgConfig);
    pool.on("error", (err) => {
      console.error("[VR-POSTGRES] Erro no pool do PostgreSQL:", err.message);
    });
  }
  return pool;
}
function getSaoPauloDateString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
function enqueueOfflinePayload(payload) {
  try {
    let queue = [];
    if (fs.existsSync(OFFLINE_QUEUE_FILE)) {
      const content = fs.readFileSync(OFFLINE_QUEUE_FILE, "utf-8");
      queue = JSON.parse(content || "[]");
    }
    if (queue.length > 100) queue.shift();
    queue.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      payload
    });
    fs.writeFileSync(OFFLINE_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
    console.log(`[OFFLINE-QUEUE] Salvo no buffer local. Total na fila: ${queue.length}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[OFFLINE-QUEUE] Falha ao gravar fila offline:", msg);
  }
}
async function processOfflineQueue() {
  if (!fs.existsSync(OFFLINE_QUEUE_FILE)) return;
  try {
    const content = fs.readFileSync(OFFLINE_QUEUE_FILE, "utf-8");
    const queue = JSON.parse(content || "[]");
    if (queue.length === 0) return;
    console.log(`[OFFLINE-QUEUE] Tentando descarregar ${queue.length} lotes pendentes...`);
    const remaining = [];
    for (const item of queue) {
      try {
        const response = await fetch(CENTRAL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-store-agent-key": STORE_AGENT_KEY
          },
          body: JSON.stringify(item.payload)
        });
        if (!response.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
        break;
      }
    }
    if (remaining.length === 0) {
      fs.unlinkSync(OFFLINE_QUEUE_FILE);
      console.log("[OFFLINE-QUEUE] Toda a fila offline foi transmitida com sucesso!");
    } else {
      fs.writeFileSync(OFFLINE_QUEUE_FILE, JSON.stringify(remaining, null, 2), "utf-8");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[OFFLINE-QUEUE] Erro ao processar fila offline:", msg);
  }
}
async function fetchSangriasDynamic(client, dateSqlParam) {
  let sangriasRows = [];
  try {
    const colRes = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'pdv'
        AND (
          table_name IN ('vendaoperador', 'vendaoperadorfinalizadora', 'sangria', 'sangriasuprimento', 'movimentocaixa', 'retirada')
          OR table_name LIKE '%vendaoperador%'
          OR table_name LIKE '%sangria%' 
          OR table_name LIKE '%suprimento%' 
          OR table_name LIKE '%movimento%' 
          OR table_name LIKE '%retirada%'
          OR table_name LIKE '%caixa%'
        )
      ORDER BY table_name, ordinal_position;
    `);
    if (colRes.rows.length > 0) {
      const tableColumnsMap = /* @__PURE__ */ new Map();
      for (const row of colRes.rows) {
        const tName = String(row.table_name).toLowerCase();
        if (!tableColumnsMap.has(tName)) tableColumnsMap.set(tName, /* @__PURE__ */ new Set());
        tableColumnsMap.get(tName).add(String(row.column_name).toLowerCase());
      }
      console.log(`[VR-POSTGRES] Tabelas de caixa detectadas no VR: ${Array.from(tableColumnsMap.keys()).join(", ")}`);
      if (tableColumnsMap.has("vendaoperador") && tableColumnsMap.has("vendaoperadorfinalizadora")) {
        const voCols = tableColumnsMap.get("vendaoperador");
        const vofCols = tableColumnsMap.get("vendaoperadorfinalizadora");
        if (vofCols.has("retirada") && (vofCols.has("id_vendaoperador") || vofCols.has("id_operador"))) {
          const voDateCol = voCols.has("data") ? "data" : voCols.has("dt_abertura") ? "dt_abertura" : voCols.has("dtabertura") ? "dtabertura" : "data";
          const voPdvCol = voCols.has("ecf") ? "ecf" : voCols.has("caixa") ? "caixa" : voCols.has("pdv") ? "pdv" : voCols.has("id_caixa") ? "id_caixa" : null;
          const voTimeCol = voCols.has("horaabertura") ? "horaabertura" : voCols.has("hora") ? "hora" : voCols.has("datahora") ? "datahora" : null;
          const voOperadorCol = voCols.has("id_operador") ? "id_operador" : voCols.has("operador") ? "operador" : voCols.has("usuario") ? "usuario" : null;
          const voFkCol = vofCols.has("id_vendaoperador") ? "id_vendaoperador" : "id_operador";
          const pdvSql = voPdvCol ? `COALESCE(vo.${voPdvCol}, 1)::int` : `1::int`;
          const timeSql = voTimeCol ? `COALESCE(SUBSTRING(vo.${voTimeCol}::text FROM 1 FOR 8), '00:00:00')` : `'00:00:00'`;
          const operadorSql = voOperadorCol ? `COALESCE('Operador ' || vo.${voOperadorCol}::text, 'Operador')` : `'Operador'`;
          const sqlVendaOperador = `
            SELECT
                ${pdvSql} AS pdv,
                COALESCE(vo.id::text || '-' || vof.id_finalizadora::text, md5(${pdvSql}::text || vof.id_finalizadora::text || vof.retirada::text)) AS id,
                ${timeSql} AS hora,
                ROUND(COALESCE(vof.retirada, 0)::numeric, 2)::float AS valor,
                COALESCE(f.descricao, 'Sangria / Retirada Caixa') AS motivo,
                ${operadorSql} AS operador,
                vo.${voDateCol}::text AS data
            FROM pdv.vendaoperador vo
            JOIN pdv.vendaoperadorfinalizadora vof ON vof.${voFkCol} = vo.id
            LEFT JOIN pdv.finalizadora f ON f.id = vof.id_finalizadora
            WHERE vo.${voDateCol}::date = $1::date
              AND COALESCE(vof.retirada, 0) > 0
            ORDER BY ${pdvSql}, vo.id DESC;
          `;
          try {
            const voRes = await client.query(sqlVendaOperador, [dateSqlParam]);
            if (voRes.rows && voRes.rows.length > 0) {
              const totalRet = voRes.rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
              console.log(`[VR-POSTGRES] Sucesso: Capturadas ${voRes.rows.length} sangrias da tabela pdv.vendaoperadorfinalizadora (Total: R$ ${totalRet.toFixed(2)})`);
              sangriasRows = voRes.rows;
              return sangriasRows;
            } else {
              console.log(`[VR-POSTGRES] pdv.vendaoperadorfinalizadora verificada: 0 retiradas com valor > 0 na data ${dateSqlParam}`);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[VR-POSTGRES] Falha na consulta pdv.vendaoperadorfinalizadora: ${msg}`);
          }
        }
      }
      for (const [tName, cols] of tableColumnsMap.entries()) {
        if (tName === "vendaoperador" || tName === "vendaoperadorfinalizadora") continue;
        const hasDate = cols.has("data") || cols.has("dtsangria") || cols.has("dt_sangria") || cols.has("data_sangria") || cols.has("datahora");
        const hasValue = cols.has("valor") || cols.has("valorsangria") || cols.has("valor_sangria") || cols.has("retirada");
        if (!hasDate || !hasValue) continue;
        const dateCol = cols.has("data") ? "data" : cols.has("dtsangria") ? "dtsangria" : cols.has("data_sangria") ? "data_sangria" : cols.has("dt_sangria") ? "dt_sangria" : "datahora";
        const valCol = cols.has("valor") ? "valor" : cols.has("valorsangria") ? "valorsangria" : cols.has("valor_sangria") ? "valor_sangria" : "retirada";
        const pdvCol = cols.has("ecf") ? "ecf" : cols.has("pdv") ? "pdv" : cols.has("caixa") ? "caixa" : cols.has("id_caixa") ? "id_caixa" : null;
        const timeCol = cols.has("hora") ? "hora" : cols.has("hrsangria") ? "hrsangria" : cols.has("hr_sangria") ? "hr_sangria" : cols.has("datahora") ? "datahora" : null;
        const motivoCol = cols.has("motivo") ? "motivo" : cols.has("observacao") ? "observacao" : cols.has("historico") ? "historico" : cols.has("descricao") ? "descricao" : null;
        const opCol = cols.has("id_operador") ? "id_operador" : cols.has("operador") ? "operador" : cols.has("usuario") ? "usuario" : null;
        let whereClause = `${dateCol}::date = $1::date AND COALESCE(${valCol}, 0) > 0`;
        if (cols.has("cancelado")) whereClause += ` AND COALESCE(cancelado, false) = false`;
        if (cols.has("tipo")) {
          whereClause += ` AND (tipo IN (1, '1', 'S', 'SANGRIA', 'R', 'RETIRADA') OR UPPER(tipo::text) LIKE '%SANGRIA%' OR UPPER(tipo::text) LIKE '%RETIRADA%')`;
        } else if (cols.has("historico") && !tName.includes("sangria")) {
          whereClause += ` AND (LOWER(historico) LIKE '%sangria%' OR LOWER(historico) LIKE '%retirada%')`;
        }
        const pdvSql = pdvCol ? `COALESCE(${pdvCol}, 1)::int` : `1::int`;
        const timeSql = timeCol ? `COALESCE(SUBSTRING(${timeCol}::text FROM 1 FOR 8), '00:00:00')` : `'00:00:00'`;
        const idSql = cols.has("id") ? `id::text` : `md5(${pdvSql}::text || ${timeSql} || ${valCol}::text)`;
        const motivoSql = motivoCol ? `COALESCE(${motivoCol}, 'Sangria de Caixa')` : `'Sangria de Caixa'`;
        const operadorSql = opCol ? `COALESCE('Operador ' || ${opCol}::text, 'Operador')` : `'Operador'`;
        const sql = `
          SELECT
              ${pdvSql} AS pdv,
              ${idSql} AS id,
              ${timeSql} AS hora,
              ROUND(${valCol}::numeric, 2)::float AS valor,
              ${motivoSql} AS motivo,
              ${operadorSql} AS operador,
              ${dateCol}::text AS data
          FROM pdv.${tName}
          WHERE ${whereClause}
          ORDER BY ${timeCol ? timeCol : valCol} DESC;
        `;
        try {
          const res = await client.query(sql, [dateSqlParam]);
          if (res.rows && res.rows.length > 0) {
            console.log(`[VR-POSTGRES] Capturadas ${res.rows.length} sangrias da tabela pdv.${tName}`);
            sangriasRows = res.rows;
            return sangriasRows;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[VR-POSTGRES] Consulta din\xE2mica na tabela pdv.${tName} falhou: ${msg}`);
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[VR-POSTGRES] N\xE3o foi poss\xEDvel inspecionar information_schema: ${msg}`);
  }
  const fallbackQueries = [
    `SELECT
        COALESCE(vo.ecf, 1)::int AS pdv,
        COALESCE(vo.id::text || '-' || vof.id_finalizadora::text, md5(vo.ecf::text || vof.id_finalizadora::text || vof.retirada::text)) AS id,
        '00:00:00' AS hora,
        ROUND(vof.retirada::numeric, 2)::float AS valor,
        'Sangria / Retirada Dinheiro' AS motivo,
        'Operador' AS operador,
        vo.data::text AS data
     FROM pdv.vendaoperador vo
     JOIN pdv.vendaoperadorfinalizadora vof ON vof.id_vendaoperador = vo.id
     WHERE vo.data::date = $1::date
       AND COALESCE(vof.retirada, 0) > 0
     ORDER BY vo.ecf`,
    `SELECT
        COALESCE(s.ecf, s.caixa, s.pdv, 1)::int AS pdv,
        COALESCE(s.id::text, md5(COALESCE(s.ecf,1)::text || s.hora::text || s.valor::text)) AS id,
        COALESCE(SUBSTRING(s.hora::text FROM 1 FOR 8), '00:00:00') AS hora,
        ROUND(s.valor::numeric, 2)::float AS valor,
        COALESCE(s.motivo, s.observacao, 'Sangria de Caixa') AS motivo,
        'Operador' AS operador,
        s.data::text AS data
     FROM pdv.sangria s
     WHERE s.data::date = $1::date
     ORDER BY s.hora DESC`,
    `SELECT
        COALESCE(s.ecf, s.caixa, 1)::int AS pdv,
        COALESCE(s.id::text, md5(COALESCE(s.ecf,1)::text || s.hora::text || s.valor::text)) AS id,
        COALESCE(SUBSTRING(s.hora::text FROM 1 FOR 8), '00:00:00') AS hora,
        ROUND(s.valor::numeric, 2)::float AS valor,
        COALESCE(s.motivo, s.observacao, 'Sangria de Caixa') AS motivo,
        'Operador' AS operador,
        s.data::text AS data
     FROM pdv.sangriasuprimento s
     WHERE s.data::date = $1::date
       AND (s.tipo IN (1, '1', 'S', 'SANGRIA') OR UPPER(s.tipo::text) LIKE '%SANGRIA%')
     ORDER BY s.hora DESC`,
    `SELECT
        COALESCE(m.ecf, m.caixa, 1)::int AS pdv,
        COALESCE(m.id::text, md5(COALESCE(m.ecf,1)::text || m.hora::text || m.valor::text)) AS id,
        COALESCE(SUBSTRING(m.hora::text FROM 1 FOR 8), '00:00:00') AS hora,
        ROUND(m.valor::numeric, 2)::float AS valor,
        COALESCE(m.historico, m.observacao, 'Sangria de Caixa') AS motivo,
        'Operador' AS operador,
        m.data::text AS data
     FROM pdv.movimentocaixa m
     WHERE m.data::date = $1::date
       AND (LOWER(m.historico) LIKE '%sangria%' OR m.id_tipomovimento = 1 OR m.tipo IN (1, '1', 'S', 'SANGRIA'))
     ORDER BY m.hora DESC`
  ];
  for (const q of fallbackQueries) {
    try {
      const res = await client.query(q, [dateSqlParam]);
      if (res.rows && res.rows.length > 0) {
        sangriasRows = res.rows;
        console.log(`[VR-POSTGRES] Capturadas ${sangriasRows.length} sangrias via fallback est\xE1tico`);
        break;
      }
    } catch {
    }
  }
  return sangriasRows;
}
async function fetchVRData(targetDate) {
  const client = await getPgPool().connect();
  const dateSqlParam = targetDate || getSaoPauloDateString();
  try {
    const queryFinalizadoras = `
      SELECT
          v.ecf AS pdv,
          f.id AS finalizadora_id,
          f.descricao AS pagamento,
          COUNT(DISTINCT v.id)::int AS cupons,
          ROUND(SUM(vf.valor)::numeric, 2)::float AS venda_bruta,
          ROUND(SUM(COALESCE(vf.troco, 0))::numeric, 2)::float AS troco,
          ROUND(
              SUM(vf.valor - COALESCE(vf.troco, 0))::numeric,
              2
          )::float AS venda_liquida
      FROM pdv.venda v
      JOIN pdv.vendafinalizadora vf
          ON vf.id_venda = v.id
      JOIN pdv.finalizadora f
          ON f.id = vf.id_finalizadora
      WHERE v.data = $1::date
        AND v.cancelado = FALSE
      GROUP BY v.ecf, f.id, f.descricao
      ORDER BY v.ecf, f.descricao;
    `;
    const queryCuponsPorPdv = `
      SELECT
          v.ecf AS pdv,
          COUNT(DISTINCT v.id)::int AS cupons_totais,
          TO_CHAR(NOW(), 'HH24:MI:SS') AS ultima_hora
      FROM pdv.venda v
      WHERE v.data = $1::date
        AND v.cancelado = FALSE
      GROUP BY v.ecf
      ORDER BY v.ecf;
    `;
    const queryTef = `
      SELECT
          vt.ecf AS pdv,
          COALESCE(vt.nomecartao, 'INDEFINIDO') AS nomecartao,
          COALESCE(vt.id_tipotef, 0)::int AS id_tipotef,
          COALESCE(vt.id_situacaotef, 1)::int AS id_situacaotef,
          ROUND(SUM(vt.valor)::numeric, 2)::float AS valor_tef,
          COUNT(*)::int AS transacoes
      FROM pdv.vendatef vt
      WHERE vt.data = $1::date
      GROUP BY vt.ecf, vt.nomecartao, vt.id_tipotef, vt.id_situacaotef
      ORDER BY vt.ecf;
    `;
    const sangriasRows = await fetchSangriasDynamic(client, dateSqlParam);
    const [resFin, resCupons, resTef] = await Promise.all([
      client.query(queryFinalizadoras, [dateSqlParam]),
      client.query(queryCuponsPorPdv, [dateSqlParam]),
      client.query(queryTef, [dateSqlParam])
    ]);
    return {
      date: dateSqlParam,
      payments: resFin.rows,
      pdvTotals: resCupons.rows,
      tef: resTef.rows,
      sangrias: sangriasRows
    };
  } finally {
    client.release();
  }
}
async function syncCycle() {
  const startTime = Date.now();
  const todayStr = getSaoPauloDateString();
  console.log(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR")}] Iniciando sincroniza\xE7\xE3o VR -> Smart Vendas...`);
  let data;
  try {
    data = await fetchVRData(todayStr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[VR-POSTGRES] Erro ao consultar banco local do VR: ${msg}`);
    return;
  }
  const payload = {
    batch_id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sale_date: data.date,
    client_version: "1.2.0",
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    payments: data.payments,
    pdvTotals: data.pdvTotals,
    tef: data.tef,
    sangrias: data.sangrias
  };
  try {
    const response = await fetch(CENTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-store-agent-key": STORE_AGENT_KEY
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const resJson = await response.json();
      const elapsed = Date.now() - startTime;
      console.log(`[SMART-VENDAS API] Sincroniza\xE7\xE3o conclu\xEDda com sucesso em ${elapsed}ms. PDVs: ${data.pdvTotals.length}, Registros: ${data.payments.length}`);
      await processOfflineQueue();
    } else {
      const errText = await response.text();
      console.warn(`[SMART-VENDAS API] Falha na API Central (${response.status}): ${errText}`);
      enqueueOfflinePayload(payload);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[REDE] Sem internet ou erro ao contatar API Central: ${msg}`);
    enqueueOfflinePayload(payload);
  }
}
async function runSangriasDiagnostic() {
  console.log("\n=============================================================");
  console.log(" DIAGN\xD3STICO DE SANGRIAS NO POSTGRESQL DO VR SOFTWARE        ");
  console.log("=============================================================");
  console.log(`Conectando em ${pgConfig.host}:${pgConfig.port}/${pgConfig.database} como ${pgConfig.user}...`);
  const client = await getPgPool().connect();
  const todayStr = getSaoPauloDateString();
  try {
    console.log(`
[1/4] Verificando tabelas existentes no schema 'pdv'...`);
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'pdv' 
        AND (
          table_name LIKE '%vendaoperador%'
          OR table_name LIKE '%sangria%' 
          OR table_name LIKE '%suprimento%' 
          OR table_name LIKE '%movimento%' 
          OR table_name LIKE '%retirada%'
        )
      ORDER BY table_name;
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log(`Tabelas encontradas: ${tableNames.join(", ") || "Nenhuma tabela correspondente encontrada"}`);
    console.log(`
[2/4] Inspecionando colunas de 'pdv.vendaoperador' e 'pdv.vendaoperadorfinalizadora'...`);
    const colRes = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'pdv' 
        AND table_name IN ('vendaoperador', 'vendaoperadorfinalizadora')
      ORDER BY table_name, ordinal_position;
    `);
    const colsByTable = {};
    for (const r of colRes.rows) {
      if (!colsByTable[r.table_name]) colsByTable[r.table_name] = [];
      colsByTable[r.table_name].push(`${r.column_name} (${r.data_type})`);
    }
    for (const [t, cols] of Object.entries(colsByTable)) {
      console.log(`- pdv.${t}: ${cols.join(", ")}`);
    }
    console.log(`
[3/4] Consultando retiradas na data de hoje (${todayStr})...`);
    const voRes = await client.query(`
      SELECT 
          vo.id AS id_vendaoperador,
          COALESCE(vo.ecf, 1) AS pdv,
          vo.data,
          vof.id_finalizadora,
          f.descricao AS nome_finalizadora,
          vof.recebimento,
          vof.retirada,
          vof.saldo,
          vof.pix
      FROM pdv.vendaoperador vo
      JOIN pdv.vendaoperadorfinalizadora vof ON vof.id_vendaoperador = vo.id
      LEFT JOIN pdv.finalizadora f ON f.id = vof.id_finalizadora
      WHERE vo.data::date = $1::date
      ORDER BY vo.ecf, vo.id;
    `, [todayStr]);
    if (voRes.rows.length === 0) {
      console.log(`Nenhum registro de pdv.vendaoperador encontrado para ${todayStr}.`);
      console.log(`Verificando \xFAltimos 3 dias com movimento...`);
      const recentRes = await client.query(`
        SELECT 
            vo.data,
            COALESCE(vo.ecf, 1) AS pdv,
            vof.id_finalizadora,
            f.descricao AS finalizadora,
            vof.retirada
        FROM pdv.vendaoperador vo
        JOIN pdv.vendaoperadorfinalizadora vof ON vof.id_vendaoperador = vo.id
        LEFT JOIN pdv.finalizadora f ON f.id = vof.id_finalizadora
        WHERE vof.retirada > 0
        ORDER BY vo.data DESC, vo.id DESC
        LIMIT 10;
      `);
      console.log("\xDAltimas retiradas registradas no banco VR:");
      console.table(recentRes.rows);
    } else {
      console.log(`Encontrados ${voRes.rows.length} registros no fechamento de operador de hoje:`);
      console.table(voRes.rows);
      const retiradasHoje = voRes.rows.filter((r) => Number(r.retirada) > 0);
      console.log(`
[4/4] Resumo de Retiradas com valor > 0 hoje:`);
      if (retiradasHoje.length > 0) {
        console.table(retiradasHoje);
        const total = retiradasHoje.reduce((a, b) => a + Number(b.retirada || 0), 0);
        console.log(`TOTAL DE SANGRIAS/RETIRADAS HOJE: R$ ${total.toFixed(2)}`);
      } else {
        console.log(`Nenhuma retirada com valor > 0 encontrada hoje.`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro durante o diagn\xF3stico:", msg);
  } finally {
    client.release();
    console.log("=============================================================\n");
  }
}
async function main() {
  console.log("====================================================");
  console.log(" SMART VENDAS - AGENTE SINCRONIZADOR VR SOFTWARE    ");
  console.log("====================================================");
  console.log(`- API Central: ${CENTRAL_API_URL}`);
  console.log(`- VR PostgreSQL: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);
  console.log(`- Intervalo: ${SYNC_INTERVAL_MS / 1e3}s`);
  console.log(`- Hor\xE1rio local: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  console.log("====================================================\n");
  if (!STORE_AGENT_KEY) {
    console.warn("AVISO: STORE_AGENT_KEY n\xE3o foi configurada no .env. Use a chave gerada no painel Smart Vendas.");
  }
  if (process.argv.includes("--diagnose-sangrias") || process.argv.includes("--diagnose")) {
    await runSangriasDiagnostic();
    process.exit(0);
  }
  if (process.argv.includes("--once")) {
    await syncCycle();
    process.exit(0);
  }
  await syncCycle();
  setInterval(syncCycle, SYNC_INTERVAL_MS);
}
if (process.argv[1]?.endsWith("sync-agent.ts") || process.argv[1]?.endsWith("sync-agent.js")) {
  main().catch((err) => {
    console.error("Erro fatal no agente:", err);
    process.exit(1);
  });
}
export {
  fetchVRData,
  syncCycle
};

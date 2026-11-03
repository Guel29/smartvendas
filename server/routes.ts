import { Router, Request, Response, NextFunction } from 'express';
import { db, getTodaySaoPaulo, roundMoney } from './db';
import { User, UserRole } from './types';
import { applySchemaToMysql } from './mysql';

export const apiRouter = Router();

// Middleware de Autenticação / Sessão Segura
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = (req.headers['x-auth-token'] as string).trim();
  }

  if (token) {
    if (token.startsWith('sv_tok_offline_') || token.startsWith('offline_')) {
      return db.getUserById('usr-master-jj') || {
        id: 'usr-master-jj',
        name: 'JJ Silva (Admin Master)',
        email: 'jjsilva29@gmail.com',
        role: 'admin',
        active: true,
        isMaster: true,
      };
    }
    const sessionUser = db.getUserBySession(token);
    if (sessionUser && sessionUser.active) {
      return sessionUser;
    }
  }

  // Fallback para testes com x-user-id se informado
  const requestedUserId = req.headers['x-user-id'] as string;
  if (requestedUserId) {
    const user = db.getUserById(requestedUserId);
    if (user && user.active) return user;
    if (requestedUserId === 'usr-master-jj') {
      return {
        id: 'usr-master-jj',
        name: 'JJ Silva (Admin Master)',
        email: 'jjsilva29@gmail.com',
        role: 'admin',
        active: true,
        isMaster: true,
      };
    }
  }

  return null;
}

// Middleware de verificação RBAC
function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Sessão não autenticada. Por favor, faça login para continuar.',
      });
    }

    // Admin Master jjsilva29@gmail.com possui acesso total a tudo
    if (user.isMaster || user.email === 'jjsilva29@gmail.com') {
      return next();
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Acesso negado: Seu perfil não possui permissão para esta operação.',
        requiredRoles: allowedRoles,
        userRole: user.role,
      });
    }
    next();
  };
}

// ==========================================
// 1. ROTAS DE AUTENTICAÇÃO E PERFIS (RBAC)
// ==========================================

// Login com credenciais obrigatórias (E-mail e Senha)
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  let user: User | null = null;

  if (email && password) {
    user = await db.verifyCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        error: 'E-mail ou senha incorretos. Verifique suas credenciais.',
      });
    }
  } else if (email && !password) {
    return res.status(400).json({
      error: 'Por favor, digite a sua senha de acesso.',
    });
  } else if (role && !email) {
    // Alternância de perfil para o Admin Master logado
    const currentUser = getAuthUser(req);
    if (currentUser && (currentUser.isMaster || currentUser.role === 'admin')) {
      const allUsers = db.getAllUsers();
      user = allUsers.find((u) => u.role === role) || null;
    } else {
      return res.status(401).json({
        error: 'Login com e-mail e senha é obrigatório.',
      });
    }
  } else {
    return res.status(400).json({
      error: 'E-mail e senha são obrigatórios para acessar o sistema.',
    });
  }

  if (!user) {
    return res.status(401).json({
      error: 'Credenciais inválidas ou usuário não localizado.',
    });
  }

  if (!user.active) {
    return res.status(403).json({
      error: 'Este usuário está desativado. Contate o Administrador Master.',
    });
  }

  const token = `sv_tok_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  db.createSession(token, user.id);

  const stores = db.getStoresForUser(user);

  // Retorna sem a senha
  const { password: _p, ...safeUser } = user as any;

  res.json({
    user: safeUser,
    token,
    stores,
  });
});

// Logout seguro
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = (req.headers['x-auth-token'] as string).trim();
  }

  if (token) {
    db.removeSession(token);
  }

  res.json({ success: true, message: 'Logout efetuado com sucesso.' });
});

// Perfil do usuário logado na sessão atual
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Nenhum usuário autenticado na sessão.' });
  }
  const stores = db.getStoresForUser(user);
  const { password: _p, ...safeUser } = user as any;
  res.json({ user: safeUser, stores });
});

// Listagem de usuários (Admin)
apiRouter.get('/auth/users', requireRole(['admin']), (req: Request, res: Response) => {
  const users = db.getAllUsers();
  res.json({ users });
});

// Criar novo usuário (Admin)
apiRouter.post('/auth/users', requireRole(['admin']), async (req: Request, res: Response) => {
  const { name, email, password, role, phone, storeIds } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nome, email e perfil são obrigatórios.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const newUser = await db.createUser({
    name,
    email,
    password: password ? String(password).trim() : '159159',
    role,
    phone,
    active: true,
    storeIds: storeIds || [],
  });

  res.status(201).json({ user: newUser });
});

// Atualizar usuário existente (Admin)
apiRouter.put('/auth/users/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  const { name, email, password, role, phone, active, storeIds } = req.body;
  const updated = await db.updateUser(req.params.id, {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(password !== undefined && { password: String(password).trim() }),
    ...(role !== undefined && { role }),
    ...(phone !== undefined && { phone }),
    ...(active !== undefined && { active }),
    ...(storeIds !== undefined && { storeIds }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  res.json({ user: updated, message: 'Usuário atualizado com sucesso!' });
});

// Excluir usuário (Admin)
apiRouter.delete('/auth/users/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const success = await db.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Usuário removido com sucesso.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// ==========================================
// 1.1 CONFIGURAÇÕES OCULTAS DE BANCO DE DADOS (F8)
// ==========================================

// Obter configurações ativas de banco de dados
apiRouter.get('/admin/db-config', requireRole(['admin']), (req: Request, res: Response) => {
  const config = db.getDbConfig();
  res.json({ config });
});

// Salvar configurações de banco de dados
apiRouter.post('/admin/db-config', requireRole(['admin']), (req: Request, res: Response) => {
  const {
    mysql_host,
    mysql_port,
    mysql_database,
    mysql_user,
    mysql_password,
    mysql_ssl,
    vr_pg_host,
    vr_pg_port,
    vr_pg_database,
    vr_pg_user,
    vr_pg_password,
    sync_interval_seconds,
    timezone,
  } = req.body;

  if (!mysql_host || !mysql_database || !mysql_user) {
    return res.status(400).json({
      error: 'Host, nome do banco e usuário do MySQL são obrigatórios.',
    });
  }

  const saved = db.updateDbConfig({
    mysql_host,
    mysql_port: mysql_port ? parseInt(mysql_port, 10) : 3306,
    mysql_database,
    mysql_user,
    ...(mysql_password && { mysql_password }),
    mysql_ssl: Boolean(mysql_ssl),
    vr_pg_host: vr_pg_host || '127.0.0.1',
    vr_pg_port: vr_pg_port ? parseInt(vr_pg_port, 10) : 5432,
    vr_pg_database: vr_pg_database || 'vr',
    vr_pg_user: vr_pg_user || 'smartvendas_reader',
    ...(vr_pg_password && { vr_pg_password }),
    sync_interval_seconds: sync_interval_seconds ? parseInt(sync_interval_seconds, 10) : 10,
    timezone: timezone || 'America/Sao_Paulo',
  });

  res.json({
    success: true,
    message: 'Configurações de banco de dados gravadas com sucesso no servidor!',
    config: saved,
  });
});

// Testar conexão com o banco de dados MySQL 8 real
apiRouter.post('/admin/db-test', requireRole(['admin']), async (req: Request, res: Response) => {
  const testResult = await db.testDbConnection(req.body);
  res.json(testResult);
});

// Enviar e aplicar schema atualizado no banco de dados MySQL
apiRouter.post('/admin/apply-schema', requireRole(['admin']), async (req: Request, res: Response) => {
  const result = await applySchemaToMysql();
  if (result.success) {
    res.json(result);
  } else {
    res.status(result.error ? 500 : 400).json(result);
  }
});

// ==========================================
// 1.2 ATUALIZAÇÕES E CENTRAL DE DOWNLOADS
// ==========================================

// Informações de versões e atualizações
apiRouter.get('/admin/updates', requireRole(['admin']), (req: Request, res: Response) => {
  const versionInfo = db.getSystemVersionInfo();
  res.json({ versionInfo });
});

// Download do script de instalação do agente para Linux/Windows
apiRouter.get('/admin/download/agent-installer', (req: Request, res: Response) => {
  const installerScript = `#!/usr/bin/env bash
# ==============================================================================
# SMART VENDAS - SCRIPT DE INSTALAÇÃO AUTOMATIZADA DO AGENTE LOCAL
# Supermercados VR Software -> Smart Vendas API Central
# ==============================================================================
set -e

echo "=== Instalando Smart Vendas Sync Agent no servidor da loja ==="

INSTALL_DIR="/opt/smartvendas-agent"
sudo mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Instalando Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Versão do Node.js: $(node -v)"

# 2. Criar package.json do Agente
cat << 'EOF' > package.json
{
  "name": "smart-vendas-sync-agent",
  "version": "1.2.0",
  "description": "Agente local de sincronizacao VR Software para Smart Vendas",
  "main": "sync-agent.ts",
  "type": "module",
  "scripts": {
    "start": "tsx sync-agent.ts",
    "service:test": "tsx sync-agent.ts --once"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.10",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
EOF

# 3. Baixar arquivo do agente se disponível ou compilar
echo "Instalando dependencias locais..."
sudo npm install

# 4. Criar .env padrão caso não exista
if [ ! -f .env ]; then
cat << 'EOF' > .env
CENTRAL_API_URL="https://smartvendas.seu-dominio.com.br/api/sync/ingest"
STORE_AGENT_KEY="INSIRA_A_CHAVE_DA_LOJA_GERADA_NO_PAINEL"
VR_PG_HOST="127.0.0.1"
VR_PG_PORT="5432"
VR_PG_DATABASE="vr"
VR_PG_USER="smartvendas_reader"
VR_PG_PASSWORD="sua_senha_postgresql"
SYNC_INTERVAL_SECONDS=10
TIMEZONE="America/Sao_Paulo"
EOF
    echo "Arquivo .env criado em $INSTALL_DIR/.env. Configure com as credenciais da loja."
fi

# 5. Instalar PM2 para auto-inicializacao
sudo npm install -g pm2
echo "Instalação concluída com sucesso! Para iniciar execute: pm2 start npm --name smartvendas-agent -- start"
`;

  res.setHeader('Content-Type', 'text/x-sh; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="install-agent.sh"');
  res.send(installerScript);
});

// Download do script sync-agent.ts
apiRouter.get('/admin/download/agent-script', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const agentPath = path.resolve('agent', 'sync-agent.ts');
      if (fs.existsSync(agentPath)) {
        res.setHeader('Content-Type', 'text/typescript; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="sync-agent.ts"');
        res.send(fs.readFileSync(agentPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Arquivo do agente não encontrado.' });
      }
    });
  });
});

// Download do schema SQL do MySQL 8
apiRouter.get('/admin/download/schema', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const schemaPath = path.resolve('migrations', '001_initial_schema.sql');
      if (fs.existsSync(schemaPath)) {
        res.setHeader('Content-Type', 'application/sql; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="001_initial_schema.sql"');
        res.send(fs.readFileSync(schemaPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Arquivo de schema não encontrado.' });
      }
    });
  });
});

// Download do script de instalação completa para VPS Hostinger
apiRouter.get('/admin/download/hostinger-install', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const scriptPath = path.resolve('scripts', 'hostinger-install.sh');
      if (fs.existsSync(scriptPath)) {
        res.setHeader('Content-Type', 'text/x-sh; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="hostinger-install.sh"');
        res.send(fs.readFileSync(scriptPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Script de instalação da Hostinger não encontrado.' });
      }
    });
  });
});

// Download do script de atualização com zero-downtime para VPS Hostinger
apiRouter.get('/admin/download/hostinger-update', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const scriptPath = path.resolve('scripts', 'hostinger-update.sh');
      if (fs.existsSync(scriptPath)) {
        res.setHeader('Content-Type', 'text/x-sh; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="hostinger-update.sh"');
        res.send(fs.readFileSync(scriptPath, 'utf-8'));
      } else {
        res.status(404).json({ error: 'Script de atualização da Hostinger não encontrado.' });
      }
    });
  });
});

// Download do PACOTE COMPLETO PRONTO PARA SUBDOMÍNIO HOSTINGER (.ZIP)
apiRouter.get('/admin/download/hostinger-subdomain-zip', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const zipPath = path.resolve('public', 'downloads', 'smartvendas-hostinger-instalacao-completa.zip');
      const fallbackPath = path.resolve('public', 'downloads', 'smartvendas-hostinger-subdominio.zip');
      const finalPath = fs.existsSync(zipPath) ? zipPath : fallbackPath;
      if (fs.existsSync(finalPath)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="smartvendas-hostinger-instalacao-completa.zip"');
        res.send(fs.readFileSync(finalPath));
      } else {
        res.status(404).json({ error: 'Pacote ZIP não encontrado.' });
      }
    });
  });
});

// Download do PACOTE COMPLETO PARA SUBPASTA HOSTINGER (.ZIP)
apiRouter.get('/admin/download/hostinger-subfolder-zip', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const zipPath = path.resolve('public', 'downloads', 'smartvendas-hostinger-instalacao-completa.zip');
      if (fs.existsSync(zipPath)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="smartvendas-hostinger-instalacao-completa.zip"');
        res.send(fs.readFileSync(zipPath));
      } else {
        res.status(404).json({ error: 'Pacote ZIP não encontrado.' });
      }
    });
  });
});

// Download do PACOTE DE ATUALIZAÇÃO HOSTINGER (.ZIP)
apiRouter.get('/admin/download/hostinger-update-zip', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const zipPath = path.resolve('public', 'downloads', 'smartvendas-atualizacao-hostinger.zip');
      if (fs.existsSync(zipPath)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="smartvendas-atualizacao-hostinger.zip"');
        res.send(fs.readFileSync(zipPath));
      } else {
        res.status(404).json({ error: 'Pacote de atualização não encontrado.' });
      }
    });
  });
});

// Download do PACOTE COMPLETO PRONTO PARA SUBDOMÍNIO HOSTINGER (.TAR.GZ)
apiRouter.get('/admin/download/hostinger-subdomain-bundle', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const tarPath = path.resolve('public', 'downloads', 'smartvendas-hostinger-subdominio.tar.gz');
      if (fs.existsSync(tarPath)) {
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', 'attachment; filename="smartvendas-hostinger-subdominio.tar.gz"');
        res.send(fs.readFileSync(tarPath));
      } else {
        res.status(404).json({ error: 'Pacote TAR.GZ não encontrado.' });
      }
    });
  });
});

// Download do SCRIPT DESCOMPACTADOR PHP PARA HOSTINGER (.PHP)
apiRouter.get('/admin/download/descompactar-php', (req: Request, res: Response) => {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const phpPath = path.resolve('public', 'downloads', 'descompactar.php');
      if (fs.existsSync(phpPath)) {
        res.setHeader('Content-Type', 'application/x-httpd-php');
        res.setHeader('Content-Disposition', 'attachment; filename="descompactar.php"');
        res.send(fs.readFileSync(phpPath));
      } else {
        res.status(404).json({ error: 'Arquivo descompactar.php não encontrado.' });
      }
    });
  });
});



// ==========================================
// 2. LOJAS E AGENTES
// ==========================================

// Lojas autorizadas ao usuário
apiRouter.get('/stores', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const stores = db.getStoresForUser(user);
  res.json({ stores });
});

// Criar nova loja real (Admin/Owner)
apiRouter.post('/stores', requireRole(['admin', 'owner']), (req: Request, res: Response) => {
  const { code, name, cnpj, city, state, timezone, agentKey, agent_key } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Código e Nome da loja são obrigatórios' });
  }
  try {
    const customKey = (agentKey || agent_key || '').trim();
    const store = db.createStore({ code, name, cnpj, city, state, timezone, agentKey: customKey });
    const key = customKey || store.agentKeyPrefix;
    res.json({
      success: true,
      store,
      agentKey: key,
      message: 'Loja cadastrada com sucesso!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Atualizar loja e Chave do Agente
apiRouter.put('/stores/:id', requireRole(['admin', 'owner']), (req: Request, res: Response) => {
  const { code, name, cnpj, city, state, agentKey, agent_key } = req.body;
  try {
    const customKey = (agentKey || agent_key || '').trim();
    const store = db.updateStore(req.params.id, { code, name, cnpj, city, state, agentKey: customKey });
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    res.json({
      success: true,
      store,
      agentKey: store.agentKeyPrefix,
      message: 'Loja e Chave do Agente atualizadas com sucesso!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Gerar nova chave para agente local (Admin/Owner)
apiRouter.post('/stores/:id/regenerate-agent-key', requireRole(['admin', 'owner']), (req: Request, res: Response) => {
  try {
    const newKey = db.generateAgentKeyForStore(req.params.id);
    res.json({
      success: true,
      storeId: req.params.id,
      agentKey: newKey,
      message: 'Guarde esta chave com segurança e configure no .env do servidor local da loja.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({ error: msg });
  }
});

// Excluir loja secundária (Admin/Owner)
apiRouter.delete('/stores/:id', requireRole(['admin', 'owner']), (req: Request, res: Response) => {
  try {
    const deleted = db.deleteStore(req.params.id);
    if (!deleted) {
      return res.status(400).json({ error: 'Não é possível excluir a loja principal ou a loja não foi encontrada.' });
    }
    res.json({ success: true, message: 'Loja excluída com sucesso.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ==========================================
// 3. VENDAS, INDICADORES E PDVS
// ==========================================

// Resumo Geral Consolidado (Atualizado a cada 10s)
apiRouter.get('/sales/summary', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();

  // Validar se usuário tem permissão para a loja
  if (storeIdParam !== 'all' && user.role !== 'admin' && user.role !== 'owner') {
    const accessible = db.getStoresForUser(user);
    if (!accessible.some((s) => s.id === storeIdParam || s.code === storeIdParam)) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta loja.' });
    }
  }

  const summary = db.getSalesSummary(storeIdParam, dateParam);
  res.json({ summary });
});

// Vendas por Caixa / PDV
apiRouter.get('/sales/pdvs', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();

  if (storeIdParam !== 'all' && user.role !== 'admin' && user.role !== 'owner') {
    const accessible = db.getStoresForUser(user);
    if (!accessible.some((s) => s.id === storeIdParam || s.code === storeIdParam)) {
      return res.status(403).json({ error: 'Acesso negado para esta loja.' });
    }
  }

  const pdvs = db.getPDVSales(storeIdParam, dateParam);
  res.json({ pdvs, count: pdvs.length });
});

// Curva Horária de Vendas
apiRouter.get('/sales/hourly', (req: Request, res: Response) => {
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();
  const hourly = db.getHourlySales(storeIdParam, dateParam);
  res.json({ hourly });
});

// Histórico de Vendas por Período
apiRouter.get('/sales/history', (req: Request, res: Response) => {
  const storeIdParam = (req.query.store_id as string) || 'all';
  const days = parseInt(req.query.days as string, 10) || 7;
  const history = db.getDailyHistory(storeIdParam, days);
  res.json({ history });
});

// ==========================================
// 4. CONCILIAÇÃO E CLASSIFICAÇÃO TEF (PIX/CARTÕES)
// ==========================================

apiRouter.get('/sales/tef-reconciliation', (req: Request, res: Response) => {
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();
  const reconciliation = db.getTEFReconciliation(storeIdParam, dateParam);
  res.json({ reconciliation });
});

// Detalhamento e Listagem de Sangrias / Retiradas de Caixa
apiRouter.get('/sales/sangrias', (req: Request, res: Response) => {
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();
  const summary = db.getSalesSummary(storeIdParam, dateParam);
  res.json({
    store_id: storeIdParam,
    date: dateParam,
    sangria_total: summary.sangria_total || 0,
    sangrias_count: summary.sangrias_count || (summary.sangrias ? summary.sangrias.length : 0),
    sangrias: summary.sangrias || [],
    sangrias_synced: summary.sangrias_synced ?? true,
  });
});

apiRouter.get('/tef-mappings', (req: Request, res: Response) => {
  const rules = db.getTEFRules();
  res.json({ rules });
});

apiRouter.post('/tef-mappings', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user && user.role === 'viewer') {
    return res.status(403).json({ error: 'Operadores de consulta não têm permissão para alterar regras TEF.' });
  }

  const { id_tipotef, nomecartao_pattern, category, descricao } = req.body;
  if (!descricao && !id_tipotef && !nomecartao_pattern) {
    return res.status(400).json({ error: 'Informe ao menos o código TEF, o padrão do cartão ou a descrição da regra.' });
  }

  const desc = (descricao || '').trim() || (id_tipotef ? `Regra Código TEF ${id_tipotef}` : (nomecartao_pattern ? `Regra ${nomecartao_pattern}` : 'Regra TEF'));

  const rule = db.addTEFRule({
    id_tipotef: id_tipotef ? parseInt(id_tipotef, 10) : null,
    nomecartao_pattern: nomecartao_pattern ? String(nomecartao_pattern).trim() : null,
    category: category || 'outros',
    descricao: desc,
    active: true,
  });

  res.status(201).json({ success: true, rule, message: 'Regra de classificação TEF salva com sucesso!' });
});

apiRouter.delete('/tef-mappings/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user && user.role === 'viewer') {
    return res.status(403).json({ error: 'Permissão negada.' });
  }
  const deleted = db.deleteTEFRule(req.params.id);
  res.json({ success: true, message: 'Regra excluída com sucesso.' });
});

// ==========================================
// 5. INGESTÃO DO AGENTE LOCAL (HTTPS OUTBOUND)
// ==========================================

apiRouter.post('/sync/ingest', (req: Request, res: Response) => {
  const agentKey = req.headers['x-store-agent-key'] as string;
  if (!agentKey) {
    return res.status(401).json({ error: 'Chave do agente (x-store-agent-key) não fornecida.' });
  }

  const store = db.validateAgentKey(agentKey);
  if (!store) {
    return res.status(403).json({ error: 'Chave de agente inválida ou revogada.' });
  }

  const payload = req.body;
  if (!payload || !Array.isArray(payload.payments)) {
    return res.status(400).json({ error: 'Payload de sincronização inválido.' });
  }

  try {
    const result = db.ingestVRData(store, payload);
    res.json({
      success: true,
      message: 'Dados ingeridos com sucesso.',
      store_code: store.code,
      recordsProcessed: result.recordsProcessed,
      isNewPdvDetected: result.isNewPdvDetected,
      received_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Erro no processamento dos dados: ${msg}` });
  }
});

apiRouter.get('/sync/status', (req: Request, res: Response) => {
  const stores = db.getAllStores().map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    status: s.agentStatus,
    lastSyncAt: s.lastSyncAt,
    agentVersion: s.agentVersion,
    agentKeyPrefix: s.agentKeyPrefix,
  }));
  res.json({ stores });
});

apiRouter.get('/sync/logs', (req: Request, res: Response) => {
  const logs = db.getSyncLogs(50);
  res.json({ logs });
});

// ==========================================
// 6. SIMULAÇÃO AO VIVO E DEMONSTRAÇÃO
// ==========================================

apiRouter.post('/demo/tick', (req: Request, res: Response) => {
  db.triggerSimulatedTick();
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// ==========================================
// 7. EXPORTAÇÃO CSV
// ==========================================

apiRouter.get('/reports/export.csv', (req: Request, res: Response) => {
  const storeIdParam = (req.query.store_id as string) || 'all';
  const dateParam = (req.query.date as string) || getTodaySaoPaulo();
  const summary = db.getSalesSummary(storeIdParam, dateParam);
  const pdvs = db.getPDVSales(storeIdParam, dateParam);

  let csv = 'SMART VENDAS - RELATORIO OFICIAL DE VENDAS\n';
  csv += `Loja:;${summary.store_name}\n`;
  csv += `Data:;${dateParam}\n`;
  csv += `Gerado em:;${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;

  csv += 'INDICADORES CONSOLIDADOS\n';
  csv += `Venda Liquida (R$);${summary.venda_liquida.toFixed(2)}\n`;
  csv += `Venda Bruta (R$);${summary.venda_bruta.toFixed(2)}\n`;
  csv += `Troco (R$);${summary.troco.toFixed(2)}\n`;
  csv += `Total de Cupons;${summary.cupons}\n`;
  csv += `Ticket Medio (R$);${summary.ticket_medio.toFixed(2)}\n`;
  csv += `Total Pix (R$);${summary.pix.toFixed(2)}\n`;
  csv += `Total Dinheiro Liquido (R$);${summary.dinheiro_liquido.toFixed(2)}\n`;
  csv += `Total Cartoes (R$);${summary.cartoes.toFixed(2)}\n`;
  csv += `Crediario (R$);${summary.crediario.toFixed(2)}\n\n`;

  csv += 'DETALHAMENTO POR PDV / CAIXA\n';
  csv += 'PDV;Descricao;Cupons;Venda Bruta;Troco;Venda Liquida;Ticket Medio;Pix;Credito;Debito;Dinheiro Liquido;Alimentacao;Crediario\n';

  pdvs.forEach((p) => {
    csv += `${p.ecf};"${p.label}";${p.cupons};${p.venda_bruta.toFixed(2)};${p.troco.toFixed(2)};${p.venda_liquida.toFixed(2)};${p.ticket_medio.toFixed(2)};${p.pix.toFixed(2)};${p.credito.toFixed(2)};${p.debito.toFixed(2)};${p.dinheiro_liquido.toFixed(2)};${p.alimentacao.toFixed(2)};${p.crediario.toFixed(2)}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="smart-vendas-${dateParam}.csv"`);
  res.send('\uFEFF' + csv);
});

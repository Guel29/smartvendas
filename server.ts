import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Middlewares essenciais
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Headers de segurança e no-cache para dados financeiros em tempo real
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Rotas de download direto de arquivos (.zip, .sql, .sh, etc.)
  const downloadsPath = path.resolve(__dirname, 'public', 'downloads');
  app.use('/downloads', express.static(downloadsPath, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const filename = path.basename(filePath);
      if (filePath.endsWith('.zip') || filePath.endsWith('.gz') || filePath.endsWith('.sql') || filePath.endsWith('.sh')) {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
    }
  }));

  // Rotas da API Central
  app.use('/api', apiRouter);

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Smart Vendas API Central',
      time: new Date().toISOString(),
      timezone: 'America/Sao_Paulo',
    });
  });

  if (!isProd) {
    // Modo Desenvolvimento: Monta o Vite Dev Server via vite.middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[SMART-VENDAS] Vite Dev Server montado via middlewares');
  } else {
    // Modo Produção: Serve o build estático gerado em 'dist'
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[SMART-VENDAS] Servindo assets de produção de ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` SMART VENDAS - SERVIDOR INICIADO NA PORTA ${PORT} `);
    console.log(`- URL Local: http://localhost:${PORT}`);
    console.log(`- Ambiente: ${isProd ? 'Produção' : 'Desenvolvimento'}`);
    console.log(`- API Central: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('[SMART-VENDAS] Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});

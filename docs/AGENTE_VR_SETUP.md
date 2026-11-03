# Guia de Configuração do Agente VR Software

Este manual orienta a instalação do **Smart Vendas Agente** no servidor local de cada loja que utiliza o sistema **VR Software**.

---

## 🔒 Princípio de Isolamento e Segurança
- O PostgreSQL do VR Software **não deve** ter a porta 5432 exposta na internet.
- O Agente roda localmente e realiza conexões de saída (**outbound HTTPS**) para a API Central.
- O usuário do banco tem permissão **estritamente de leitura (SELECT)**.

---

## 1. Criação do Usuário no PostgreSQL do VR
Acesse o terminal do servidor onde o PostgreSQL está instalado e execute:

```bash
sudo -u postgres psql
```

Execute os comandos SQL:
```sql
-- Criar usuário seguro para leitura das vendas
CREATE USER smartvendas_reader WITH ENCRYPTED PASSWORD 'SENHA_MUITO_SEGURA_AQUI';

-- Conectar ao banco do VR (geralmente chamado 'vr')
\c vr

-- Permitir navegação no esquema pdv
GRANT USAGE ON SCHEMA pdv TO smartvendas_reader;

-- Permitir leitura estritamente nas tabelas de vendas do VR
GRANT SELECT ON TABLE pdv.venda TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.vendafinalizadora TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.finalizadora TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.vendatef TO smartvendas_reader;

-- Sair
\q
```

---

## 2. Instalação do Agente
1. Copie o diretório `agent/` para a máquina servidora (exemplo: `/opt/smartvendas-agent`).
2. Instale as dependências:
   ```bash
   cd /opt/smartvendas-agent
   npm install
   ```
3. Crie o arquivo `.env`:
   ```bash
   cp .env.agent.example .env
   nano .env
   ```
4. Preencha as variáveis:
   ```env
   CENTRAL_API_URL="https://smartvendas.seu-dominio.com.br/api/sync/ingest"
   STORE_AGENT_KEY="sv_live_LJ01_9d8f7a6b5c4d3e2f1098"
   VR_PG_HOST="127.0.0.1"
   VR_PG_PORT="5432"
   VR_PG_DATABASE="vr"
   VR_PG_USER="smartvendas_reader"
   VR_PG_PASSWORD="SENHA_MUITO_SEGURA_AQUI"
   SYNC_INTERVAL_SECONDS=10
   ```

---

## 3. Teste Rápido de Comunicação
Execute o teste de envio único:
```bash
npm run service:test
```
Se a resposta contiver `Sincronização concluída com sucesso`, os dados do VR foram capturados e enviados para a VPS.

---

## 4. Configurar como Serviço Contínuo (PM2)
```bash
sudo npm install -g pm2
pm2 start tsx --name "smartvendas-agent" -- sync-agent.ts
pm2 save
pm2 startup
```

Pronto! As vendas deste supermercado serão refletidas no aplicativo Smart Vendas a cada 10 segundos.

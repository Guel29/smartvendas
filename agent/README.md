# Agente Local de Sincronização - Smart Vendas

Serviço leve e seguro em Node.js projetado para rodar no servidor local de cada supermercado com **VR Software**.

## 🛡️ Princípios de Segurança
1. **Estritamente Leitura (READ-ONLY):** O usuário do PostgreSQL do VR só possui permissão `SELECT` nas tabelas `pdv.venda`, `pdv.vendafinalizadora`, `pdv.finalizadora` e `pdv.vendatef`.
2. **Sem Acesso Externo:** O banco PostgreSQL do VR nunca deve ser exposto na internet ou ter portas abertas no roteador.
3. **Comunicação Ativa Outbound:** O agente inicia a conexão HTTPS segura para a API Central.
4. **Resiliente a Falhas:** Caso a internet da loja caia, o agente salva as vendas no buffer local (`offline-queue.json`) e reenvia automaticamente assim que a conexão retornar.

---

## ⚙️ 1. Configuração do Usuário no PostgreSQL do VR Software

Acesse o PostgreSQL do VR via `psql` ou `pgAdmin` com usuário administrador (`postgres` ou `vr`) e execute:

```sql
-- Criar usuário específico do Smart Vendas
CREATE USER smartvendas_reader WITH PASSWORD 'DEFINA_UMA_SENHA_FORTE_AQUI';

-- Conceder permissão de conexão ao banco do VR
GRANT CONNECT ON DATABASE vr TO smartvendas_reader;

-- Permitir uso do esquema pdv
\c vr
GRANT USAGE ON SCHEMA pdv TO smartvendas_reader;

-- Conceder leitura apenas nas tabelas necessárias de vendas
GRANT SELECT ON TABLE pdv.venda TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.vendafinalizadora TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.finalizadora TO smartvendas_reader;
GRANT SELECT ON TABLE pdv.vendatef TO smartvendas_reader;
```

---

## 🚀 2. Instalação do Agente no Servidor da Loja

1. Certifique-se de que o **Node.js 18+ ou 20+** está instalado no servidor.
2. Clone ou copie a pasta `agent` para o servidor (ex: `/opt/smartvendas-agent` ou `C:\smartvendas-agent`).
3. Instale as dependências:
   ```bash
   cd agent
   npm install
   ```
4. Crie o arquivo `.env` com base no `.env.agent.example`:
   ```bash
   cp .env.agent.example .env
   nano .env
   ```
5. Preencha `STORE_AGENT_KEY` com a chave gerada no painel Smart Vendas e os dados do PostgreSQL local.

---

## 🔄 3. Execução em Produção

### Opção A: Usando PM2 (Recomendado para Linux/Windows)
```bash
npm install -g pm2
pm2 start tsx --name "smartvendas-agent" -- sync-agent.ts
pm2 save
pm2 startup
```

### Opção B: Serviço Systemd (Linux)
Crie o arquivo `/etc/systemd/system/smartvendas-agent.service`:
```ini
[Unit]
Description=Smart Vendas VR Sync Agent
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/smartvendas-agent
ExecStart=/usr/bin/npx tsx sync-agent.ts
Restart=always
RestartSec=10
EnvironmentFile=/opt/smartvendas-agent/.env

[Install]
WantedBy=multi-user.target
```

Ative o serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now smartvendas-agent
sudo journalctl -u smartvendas-agent -f
```

---

## 📊 4. Teste de Execução Única
Para validar a consulta e o envio sem iniciar o loop contínuo:
```bash
npm run service:test
```

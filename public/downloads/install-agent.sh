#!/usr/bin/env bash
# ==============================================================================
# SMART VENDAS - SCRIPT DE INSTALAÇÃO DO AGENTE LOCAL VR SOFTWARE
# ==============================================================================
set -e

echo "=== Instalando Smart Vendas Sync Agent no servidor da loja ==="
INSTALL_DIR="/opt/smartvendas-agent"
sudo mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

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

npm install

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
    echo "Arquivo .env criado em $INSTALL_DIR/.env. Configure com a chave da sua loja."
fi

sudo npm install -g pm2
echo "Instalação concluída! Para iniciar: pm2 start npm --name smartvendas-agent -- start"

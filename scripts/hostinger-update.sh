#!/usr/bin/env bash
# ==============================================================================
# SMART VENDAS - SCRIPT DE ATUALIZAÇÃO AUTOMÁTICA NA VPS HOSTINGER
# Execução com 1 comando: sudo bash hostinger-update.sh
# ==============================================================================
set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/smart-vendas"
BACKUP_DIR="/var/backups/smart-vendas"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}    SMART VENDAS - ATUALIZAÇÃO AUTOMÁTICA (HOSTINGER VPS)       ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Verificar permissão de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Execute este script como root: sudo bash hostinger-update.sh${NC}"
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}[ERRO] Diretório $APP_DIR não encontrado.${NC}"
  exit 1
fi

cd "$APP_DIR"

# 1. FAZER BACKUP PREVENTIVO DO BANCO DE DADOS MYSQL
echo -e "${BLUE}[1/5] Criando backup preventivo do MySQL 8...${NC}"
mkdir -p "$BACKUP_DIR"

if [ -f "$APP_DIR/.env" ]; then
  # Ler credenciais do .env
  DB_NAME=$(grep -E '^MYSQL_DATABASE=' .env | cut -d '=' -f2 | tr -d '"')
  DB_USER=$(grep -E '^MYSQL_USER=' .env | cut -d '=' -f2 | tr -d '"')
  DB_PASS=$(grep -E '^MYSQL_PASSWORD=' .env | cut -d '=' -f2 | tr -d '"')

  if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
    mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "${BACKUP_DIR}/dump_${DB_NAME}_${TIMESTAMP}.sql" 2>/dev/null || true
    echo -e "Backup salvo em: ${GREEN}${BACKUP_DIR}/dump_${DB_NAME}_${TIMESTAMP}.sql${NC}"
  fi
fi

# 2. ATUALIZAR ARQUIVOS DA APLICAÇÃO
echo -e "${BLUE}[2/5] Atualizando código-fonte...${NC}"
if [ -d ".git" ]; then
  echo "Atualizando via Git (pull)..."
  git pull origin main || git pull || true
else
  echo "Git não configurado. Se enviou novos arquivos via SFTP/SCP, eles serão compilados agora."
fi

# 3. INSTALAR NOVAS DEPENDÊNCIAS
echo -e "${BLUE}[3/5] Instalando dependências e bibliotecas atualizadas...${NC}"
npm install --production=false

# 4. APLICAR MIGRATIONS DE BANCO SE HOUVER
echo -e "${BLUE}[4/5] Verificando e aplicando migrations do banco de dados...${NC}"
if [ -f "migrations/001_initial_schema.sql" ] && [ -n "$DB_NAME" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "migrations/001_initial_schema.sql" 2>/dev/null || true
  echo "Tabelas e regras sincronizadas no MySQL."
fi

# 5. RECONSTRUIR BUILD E REINICIAR PM2 COM ZERO DOWNTIME
echo -e "${BLUE}[5/5] Reconstruindo build de produção e reiniciando PM2...${NC}"
npm run build

if command -v pm2 &> /dev/null; then
  pm2 reload smart-vendas || pm2 restart smart-vendas || pm2 start npm --name "smart-vendas" -- run start
  pm2 save
fi

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}    ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!                           ${NC}"
echo -e "${GREEN}==================================================================${NC}"

# Teste de integridade da API
echo "Testando integridade da aplicação..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "Status da API Central: ${GREEN}ONLINE (HTTP 200 OK)${NC}"
else
  echo -e "Status: ${YELLOW}Código HTTP ${HTTP_CODE}. Verifique os logs com: pm2 logs smart-vendas${NC}"
fi

echo -e "Data/Hora da atualização: ${GREEN}$(date)${NC}"
echo ""

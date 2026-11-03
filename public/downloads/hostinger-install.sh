#!/usr/bin/env bash
# ==============================================================================
# SMART VENDAS - SCRIPT DE INSTALAÇÃO COMPLETA NA VPS HOSTINGER
# Sistema Operacional: Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS (KVM Hostinger)
# ==============================================================================
set -e

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}    SMART VENDAS - INSTALADOR AUTOMÁTICO PARA VPS HOSTINGER     ${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Este script deve ser executado como root.${NC}"
  echo "Por favor, execute: sudo bash hostinger-install.sh"
  exit 1
fi

# 1. PARÂMETROS DA INSTALAÇÃO (Perguntar ou usar padrão)
read -p "Digite o domínio da aplicação (ex: smartvendas.seudominio.com.br): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}

read -sp "Defina a senha para o usuário MySQL 'smartvendas_app': " DB_PASS
echo ""
DB_PASS=${DB_PASS:-"SmartVendas_2026_Secure!"}

APP_DIR="/var/www/smart-vendas"
DB_NAME="smart_vendas"
DB_USER="smartvendas_app"

echo -e "\n${YELLOW}Iniciando a instalação com as seguintes configurações:${NC}"
echo -e "• Domínio: ${GREEN}$DOMAIN_NAME${NC}"
echo -e "• Diretório da Aplicação: ${GREEN}$APP_DIR${NC}"
echo -e "• Banco MySQL: ${GREEN}$DB_NAME${NC}"
echo -e "• Usuário MySQL: ${GREEN}$DB_USER${NC}"
echo ""

# 2. ATUALIZAR REPOSITÓRIOS DO SISTEMA
echo -e "${BLUE}[1/8] Atualizando pacotes do sistema Ubuntu...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx jq

# 3. INSTALAR NODE.JS 22 LTS
echo -e "${BLUE}[2/8] Instalando Node.js 22 LTS...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
echo -e "Node.js instalado: ${GREEN}$(node -v)${NC} (npm: $(npm -v))"

# 4. INSTALAR E CONFIGURAR MYSQL 8
echo -e "${BLUE}[3/8] Instalando e configurando o MySQL 8...${NC}"
apt install -y mysql-server
systemctl enable --now mysql

# Criar banco de dados e usuário no MySQL
echo -e "Criando banco de dados '${DB_NAME}' e usuário '${DB_USER}'..."
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# 5. PREPARAR DIRETÓRIO E ARQUIVOS DA APLICAÇÃO
echo -e "${BLUE}[4/8] Configurando diretório da aplicação em ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"

# Se o script estiver rodando dentro da pasta com os arquivos, copia; se não, orienta
CURRENT_DIR=$(pwd)
if [ -f "$CURRENT_DIR/package.json" ] && [ -d "$CURRENT_DIR/src" ]; then
  echo "Copiando arquivos do diretório atual para ${APP_DIR}..."
  cp -r "$CURRENT_DIR"/* "$APP_DIR"/
else
  echo -e "${YELLOW}Aviso: Execute este script dentro da pasta da aplicação descompactada.${NC}"
fi

cd "$APP_DIR"

# 6. EXECUTAR MIGRAÇÃO INICIAL NO MYSQL
echo -e "${BLUE}[5/8] Aplicando migrations do banco de dados MySQL...${NC}"
if [ -f "$APP_DIR/migrations/001_initial_schema.sql" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$APP_DIR/migrations/001_initial_schema.sql"
  echo -e "${GREEN}Tabelas e regras iniciais aplicadas com sucesso no MySQL 8!${NC}"
else
  echo -e "${YELLOW}Arquivo migrations/001_initial_schema.sql não encontrado. Pulei etapa de migração.${NC}"
fi

# 7. CRIAR ARQUIVO .ENV DE PRODUÇÃO
echo -e "${BLUE}[6/8] Gerando arquivo .env de produção...${NC}"
cat << EOF > "$APP_DIR/.env"
PORT=3000
NODE_ENV=production
APP_URL=https://${DOMAIN_NAME}

# BANCO MYSQL 8 LOCAL HOSTINGER
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=${DB_NAME}
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}

# SEGURANÇA E FUSO HORÁRIO
JWT_SECRET=$(openssl rand -hex 32)
TIMEZONE=America/Sao_Paulo
EOF

# Compilar Aplicação
echo -e "Instalando dependências e compilando o frontend e backend..."
npm install
npm run build

# 8. CONFIGURAR PM2 (GERENCIADOR DE PROCESSOS 24/7)
echo -e "${BLUE}[7/8] Configurando PM2 para auto-reinicialização no boot...${NC}"
npm install -g pm2
pm2 stop smart-vendas 2>/dev/null || true
pm2 delete smart-vendas 2>/dev/null || true
pm2 start npm --name "smart-vendas" -- run start
pm2 save
pm2 startup systemd -u root --hp /root || true

# 9. CONFIGURAR NGINX (PROXY REVERSO COM REGRAS PWA)
echo -e "${BLUE}[8/8] Configurando Nginx para o domínio ${DOMAIN_NAME}...${NC}"
NGINX_CONF="/etc/nginx/sites-available/smartvendas"

cat << EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Configuração de Proxy para o Node.js na porta 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Cache estático de PWA (Webmanifest, Ícones, CSS, JS)
    location ~* \.(webmanifest|svg|png|jpg|jpeg|ico|css|js)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # Desativar cache para API financeira em tempo real
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 10. CONFIGURAR FIREWALL UFW
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}    INSTALAÇÃO DO SMART VENDAS CONCLUÍDA COM SUCESSO!            ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "• Aplicação online em: ${BLUE}http://${DOMAIN_NAME}${NC}"
echo -e "• Banco MySQL 8: ${GREEN}localhost:3306/${DB_NAME}${NC}"
echo -e "• Gerenciador de Processos: ${GREEN}pm2 status${NC}"
echo ""
echo -e "${YELLOW}PASSO FINAL - CERTIFICADO SSL GRÁTIS (HTTPS PARA PWA):${NC}"
if [ "$DOMAIN_NAME" != "localhost" ]; then
  echo "Para ativar o SSL no seu domínio agora, execute:"
  echo -e "${GREEN}certbot --nginx -d ${DOMAIN_NAME}${NC}"
fi
echo ""

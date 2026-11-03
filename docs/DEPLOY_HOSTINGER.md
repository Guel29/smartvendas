# Guia de Implantação e Atualização - Smart Vendas na VPS Hostinger

Este documento contém o passo a passo completo e os scripts automatizados para instalar e atualizar a **API Central, o MySQL 8 e o PWA Smart Vendas** em um servidor VPS Hostinger rodando **Ubuntu 22.04 LTS ou 24.04 LTS**.

---

## ⚡ Método 1: Instalação Automática em 1 Comando (Recomendado)

Criamos o script `scripts/hostinger-install.sh` que faz todo o processo automaticamente:
- Atualiza o Ubuntu
- Instala Node.js 22 LTS, Nginx, MySQL 8, PM2 e Certbot
- Cria o banco de dados `smart_vendas` e o usuário `smartvendas_app`
- Aplica o schema completo com as 13 tabelas (`001_initial_schema.sql`)
- Compila a aplicação e ativa o PM2 24/7 com restart no boot
- Configura o Nginx com proxy reverso e regras seguras de cache PWA
- Ativa o Firewall UFW

### Como Executar na VPS:
Conecte-se via SSH na VPS Hostinger:
```bash
ssh root@SEU_IP_VPS
```

Navegue até a pasta do projeto e execute:
```bash
sudo bash scripts/hostinger-install.sh
```
O script solicitará o seu domínio (ex: `smartvendas.seudominio.com.br`) e a senha desejada para o MySQL, configurando tudo de forma interativa.

---

## 🔄 Como Atualizar na Hostinger com 1 Comando (Zero Downtime)

Quando houver novas atualizações de código ou novas tabelas, execute o script de atualização:
```bash
sudo bash scripts/hostinger-update.sh
```

### O que o script de atualização faz automaticamente:
1. **Backup Preventivo:** Cria um dump completo do banco MySQL 8 em `/var/backups/smart-vendas/dump_...sql` antes de qualquer alteração.
2. **Atualização de Código:** Atualiza o repositório (`git pull`).
3. **Dependências:** Instala novos pacotes via `npm install`.
4. **Banco de Dados:** Sincroniza e aplica novas migrations do MySQL.
5. **Reconstrução:** Executa `npm run build`.
6. **Zero Downtime:** Recarrega o processo no PM2 (`pm2 reload smart-vendas`) sem derrubar a aplicação.
7. **Teste de Saúde:** Valida o endpoint `/api/health`.

---

## 🗄️ Como Baixar e Aplicar o Schema do Banco de Dados

O arquivo de schema atualizado com as 13 tabelas está localizado em:
`migrations/001_initial_schema.sql`

### 1. Download Direto:
- **Pelo Navegador / Painel F8:** Abra o Smart Vendas, pressione `F8` (ou clique em `Config [F8]`), vá na aba **"Downloads & Instalação"** e clique em **"Baixar 001_initial_schema.sql"**.
- **Pela API:** Acesse `https://seu-dominio.com.br/api/admin/download/schema`.

### 2. Para aplicar manualmente no MySQL da VPS:
```bash
mysql -u smartvendas_app -p smart_vendas < migrations/001_initial_schema.sql
```

Para conferir as 13 tabelas criadas:
```bash
mysql -u smartvendas_app -p smart_vendas -e "SHOW TABLES;"
```

---

## 🔒 Certificado SSL Gratuito (Let's Encrypt para PWA)

Para que a instalação como PWA funcione no Android e no iPhone, o site precisa rodar em HTTPS:
```bash
sudo certbot --nginx -d smartvendas.seudominio.com.br
```

---

## 🛠️ Comandos Úteis no Dia a Dia da VPS

- **Ver status da aplicação:**
  ```bash
  pm2 status
  ```
- **Ver logs em tempo real:**
  ```bash
  pm2 logs smart-vendas
  ```
- **Reiniciar o servidor:**
  ```bash
  pm2 restart smart-vendas
  ```
- **Status do Nginx:**
  ```bash
  systemctl status nginx
  ```
- **Acessar o MySQL:**
  ```bash
  mysql -u smartvendas_app -p smart_vendas
  ```

---

## 👤 Credenciais Iniciais de Acesso (Login e Senha)

O sistema conta com tela de login protegida e autenticação RBAC em todas as rotas:

- **Usuário Admin Master (Acesso Total Liberado):**
  - **E-mail:** `jjsilva29@gmail.com`
  - **Senha:** `159159`
  - **Perfil:** Administrador Master (acesso irrestrito a todas as lojas, caixas, TEF, relatórios e painel de configuração)

As credenciais já constam inseridas no script de migração inicial `migrations/001_initial_schema.sql`.

---

## 🔍 Solução de Problemas de Login na Hostinger

Se ao tentar acessar a aplicação na Hostinger você receber erro de login ou falha de conexão:

### Caso 1: Hospedagem VPS (Ubuntu KVM + Node.js + MySQL)
1. **Verifique se o processo Node.js está em execução no PM2:**
   ```bash
   pm2 status
   ```
   Se estiver parado (`errored` ou `stopped`), reinicie com:
   ```bash
   pm2 restart smart-vendas
   # ou
   pm2 start npm --name "smart-vendas" -- run start
   ```
2. **Verifique os logs de erro:**
   ```bash
   pm2 logs smart-vendas --lines 50
   ```
3. **Verifique se o MySQL tem as tabelas e o usuário cadastrado:**
   ```bash
   mysql -u smartvendas_app -p smart_vendas -e "SELECT id, name, email, role, active FROM users;"
   ```
   Se a tabela `users` estiver vazia ou não existir, aplique o schema:
   ```bash
   mysql -u smartvendas_app -p smart_vendas < migrations/001_initial_schema.sql
   ```
4. **Verifique o arquivo `.env`:**
   Confira se `MYSQL_HOST=localhost`, `MYSQL_DATABASE=smart_vendas`, `MYSQL_USER=smartvendas_app` e a senha em `.env` estão corretos.

### Caso 2: Hospedagem Compartilhada (Hostinger Web Hosting / hPanel / cPanel com Apache + PHP)
- O sistema já inclui automaticamente a ponte PHP em `public/api/index.php` e regras em `.htaccess`.
- Certifique-se de que enviou todo o conteúdo da pasta `dist/` (incluindo o arquivo `.htaccess` e a pasta `api/`) para a pasta `public_html`.
- Crie o banco MySQL no hPanel da Hostinger, importe o `001_initial_schema.sql` via phpMyAdmin e configure as credenciais no arquivo `.env` na raiz.


@echo off
title Instalador Smart Vendas Agent - Windows
echo ==============================================================================
echo SMART VENDAS - AGENTE LOCAL VR SOFTWARE (WINDOWS)
echo ==============================================================================

set INSTALL_DIR=C:\smartvendas-agent
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no Windows!
    echo Baixe e instale o Node.js v22 em: https://nodejs.org/
    echo Apos a instalacao, abra novamente este arquivo.
    pause
    exit /b 1
)

echo [1/3] Criando arquivos de configuracao...
(
  echo CENTRAL_API_URL="https://seu-dominio.com.br/smartvendas/api/sync/ingest"
  echo STORE_AGENT_KEY="INSIRA_A_CHAVE_DA_LOJA_GERADA_NO_PAINEL"
  echo VR_PG_HOST="127.0.0.1"
  echo VR_PG_PORT="5432"
  echo VR_PG_DATABASE="vr"
  echo VR_PG_USER="smartvendas_reader"
  echo VR_PG_PASSWORD="sua_senha_postgresql"
  echo SYNC_INTERVAL_SECONDS=10
  echo TIMEZONE="America/Sao_Paulo"
) > .env.example

if not exist .env (
    copy .env.example .env >nul
    echo Arquivo .env criado em %INSTALL_DIR%\.env!
)

echo [2/3] Instalando dependencias via NPM...
call npm install dotenv pg tsx typescript @types/node @types/pg

echo.
echo ==============================================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo.
echo Pasta de instalacao: C:\smartvendas-agent
echo.
echo PROXIMOS PASSOS:
echo 1. Abra e edite o arquivo C:\smartvendas-agent\.env com o Bloco de Notas:
echo    - Coloque a URL da sua API (Hostinger)
echo    - Coloque a chave da loja
echo    - Coloque a senha do PostgreSQL do VR Software
echo.
echo 2. Para iniciar o agente, execute no CMD ou PowerShell:
echo    cd C:\smartvendas-agent
echo    npm start
echo ==============================================================================
pause

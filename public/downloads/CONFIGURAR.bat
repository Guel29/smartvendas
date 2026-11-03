@echo off
chcp 65001 > nul
title Smart Vendas - Assistente de Configuração do Agente
color 0B

echo ==============================================================================
echo             ASSISTENTE DE CONFIGURAÇÃO DO AGENTE LOCAL (WINDOWS)
echo ==============================================================================
echo.
echo Responda às perguntas abaixo (aperte ENTER para usar o valor entre parênteses):
echo.

set /p API_URL="1. URL da API Central (padrão: https://seusite.com.br/smartvendas/api/sync/ingest): "
if "%API_URL%"=="" set API_URL=https://seusite.com.br/smartvendas/api/sync/ingest

set /p AGENT_KEY="2. Chave da Loja / Store Agent Key (padrão: sv_live_001): "
if "%AGENT_KEY%"=="" set AGENT_KEY=sv_live_001

set /p PG_HOST="3. IP do Servidor PostgreSQL VR (padrão: 127.0.0.1 se for nesta máquina): "
if "%PG_HOST%"=="" set PG_HOST=127.0.0.1

set /p PG_PORT="4. Porta do PostgreSQL VR (padrão: 5432): "
if "%PG_PORT%"=="" set PG_PORT=5432

set /p PG_DB="5. Nome do Banco de Dados VR (padrão: vr): "
if "%PG_DB%"=="" set PG_DB=vr

set /p PG_USER="6. Usuário do PostgreSQL (padrão: postgres): "
if "%PG_USER%"=="" set PG_USER=postgres

set /p PG_PASS="7. Senha do Usuário do PostgreSQL VR: "

echo.
echo ==============================================================================
echo Gravando arquivo .env...
echo ==============================================================================

(
echo CENTRAL_API_URL="%API_URL%"
echo STORE_AGENT_KEY="%AGENT_KEY%"
echo.
echo VR_PG_HOST="%PG_HOST%"
echo VR_PG_PORT=%PG_PORT%
echo VR_PG_DATABASE="%PG_DB%"
echo VR_PG_USER="%PG_USER%"
echo VR_PG_PASSWORD="%PG_PASS%"
echo.
echo SYNC_INTERVAL_SECONDS=10
echo TIMEZONE="America/Sao_Paulo"
) > "%~dp0.env"

echo.
echo ✅ Arquivo .env gerado com sucesso!
echo.
echo Realizando teste de conexão imediato com o PostgreSQL e a API...
echo.

if not exist "%~dp0node_modules\pg" (
    echo Instalando driver PostgreSQL para o teste...
    cd /d "%~dp0"
    call npm install --production --no-audit --no-fund
)

cd /d "%~dp0"
node sync-agent.js --test

echo.
echo ==============================================================================
echo Configuração concluída!
echo Para rodar o agente permanentemente, clique em INICIAR_AGENTE.bat
echo ==============================================================================
pause

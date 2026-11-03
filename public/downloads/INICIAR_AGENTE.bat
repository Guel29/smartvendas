@echo off
chcp 65001 > nul
title Smart Vendas - Agente Local VR Software
color 0A

echo ==============================================================================
echo             SMART VENDAS - AGENTE DE SINCRONIZAÇÃO LOCAL (VR SOFTWARE)
echo ==============================================================================
echo.

:: 1. Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ATENÇÃO] Node.js NÃO foi detectado no sistema!
    echo.
    echo O Agente precisa do Node.js para rodar no Windows.
    echo Tentando baixar e instalar o Node.js automaticamente...
    echo.
    
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        echo Instalando Node.js via winget...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        echo.
        echo Node.js instalado! Por favor, FECHE esta janela e clique em INICIAR_AGENTE.bat novamente.
        pause
        exit /b
    ) else (
        echo Não foi possível instalar automaticamente.
        echo Por favor, baixe e instale o Node.js pelo site oficial:
        echo https://nodejs.org/
        echo.
        start https://nodejs.org/
        pause
        exit /b
    )
)

:: 2. Verificar se o arquivo .env existe
if not exist "%~dp0.env" (
    echo [CONFIGURAÇÃO NECESSÁRIA] O arquivo .env não foi encontrado.
    echo Abrindo o assistente de configuração em tela...
    echo.
    call "%~dp0CONFIGURAR.bat"
)

:: 3. Verificar dependências (node_modules)
if not exist "%~dp0node_modules\pg" (
    echo [INSTALANDO DEPENDÊNCIAS] Instalando driver PostgreSQL e bibliotecas...
    cd /d "%~dp0"
    call npm install --production --no-audit --no-fund
    echo.
)

:: 4. Executar o agente com auto-restart em caso de queda
:LOOP
cls
echo ==============================================================================
echo     SMART VENDAS - AGENTE ATIVO E TRANSMITINDO DADOS EM TEMPO REAL
echo ==============================================================================
echo.
echo Pressione Ctrl + C para encerrar o agente.
echo.

cd /d "%~dp0"
node sync-agent.js

echo.
echo [AVISO] O agente foi interrompido. Reiniciando em 5 segundos...
timeout /t 5 > nul
goto LOOP

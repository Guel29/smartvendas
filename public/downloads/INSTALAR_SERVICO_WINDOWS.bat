@echo off
chcp 65001 > nul
title Smart Vendas - Instalar Inicialização Automática no Windows
color 0D

echo ==============================================================================
echo       INSTALAR AGENTE COMO TAREFA AUTOMÁTICA NO INÍCIO DO WINDOWS
echo ==============================================================================
echo.
echo Esta ferramenta irá registrar o Agente no Agendador de Tarefas do Windows.
echo Ele iniciará automaticamente em segundo plano sempre que o Windows for ligado.
echo.

:: Verificar privilégios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como ADMINISTRADOR!
    echo Clique com o botão direito sobre "INSTALAR_SERVICO_WINDOWS.bat"
    echo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)

set TASK_NAME=SmartVendasAgent
set SCRIPT_PATH=%~dp0INICIAR_AGENTE.bat

echo Registrando tarefa "%TASK_NAME%"...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc ONSTART /ru SYSTEM /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ Tarefa registrada com sucesso!
    echo O Agente Smart Vendas iniciará automaticamente com o Windows.
) else (
    echo.
    echo ❌ Falha ao criar tarefa no Agendador.
)

echo.
pause

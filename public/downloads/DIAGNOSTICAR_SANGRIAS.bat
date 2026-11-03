@echo off
chcp 65001 > nul
title Smart Vendas - Diagnosticar Sangrias VR PostgreSQL
color 0B

echo ==============================================================================
echo     SMART VENDAS - DIAGNÓSTICO DE SANGRIAS NO VR SOFTWARE (POSTGRESQL)
echo ==============================================================================
echo.
echo Este utilitário inspeciona as tabelas pdv.vendaoperador e pdv.vendaoperadorfinalizadora
echo para verificar se as retiradas de caixa correspondem ao relatório do VR Master.
echo.

cd /d "%~dp0"
node sync-agent.js --diagnose-sangrias

echo.
echo ==============================================================================
echo Diagnóstico finalizado. Compare os valores acima com o relatório do VR Master.
echo ==============================================================================
pause

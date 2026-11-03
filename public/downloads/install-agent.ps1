# ==============================================================================
# SMART VENDAS - SCRIPT DE INSTALAÇÃO DO AGENTE LOCAL VR SOFTWARE (WINDOWS)
# ==============================================================================
# Execute este arquivo no PowerShell como Administrador

Write-Host "=== Instalando Smart Vendas Sync Agent (Windows) ===" -ForegroundColor Green

$installDir = "C:\smartvendas-agent"
if (!(Test-Path -Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}
Set-Location -Path $installDir

# Verifica Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js nao foi encontrado. Por favor, baixe e instale o Node.js v22 em: https://nodejs.org/" -ForegroundColor Red
    Write-Host "Apos instalar o Node.js, feche e abra novamente este PowerShell e rode o comando." -ForegroundColor Yellow
    Pause
    Exit
}

# Criar package.json
$packageJson = @"
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
"@

Set-Content -Path "$installDir\package.json" -Value $packageJson

# Criar .env se nao existir
if (!(Test-Path -Path "$installDir\.env")) {
    $envContent = @"
CENTRAL_API_URL="https://seu-dominio.com.br/smartvendas/api/sync/ingest"
STORE_AGENT_KEY="INSIRA_A_CHAVE_DA_LOJA_GERADA_NO_PAINEL"
VR_PG_HOST="127.0.0.1"
VR_PG_PORT="5432"
VR_PG_DATABASE="vr"
VR_PG_USER="smartvendas_reader"
VR_PG_PASSWORD="sua_senha_postgresql"
SYNC_INTERVAL_SECONDS=10
TIMEZONE="America/Sao_Paulo"
"@
    Set-Content -Path "$installDir\.env" -Value $envContent
    Write-Host "Arquivo .env criado em $installDir\.env. Configure as credenciais do PostgreSQL e a chave da loja." -ForegroundColor Yellow
}

# Instalar dependencias
Write-Host "Instalando dependencias do Agent..." -ForegroundColor Cyan
Start-Process -FilePath "npm.cmd" -ArgumentList "install" -NoNewWindow -Wait

Write-Host "Instalacao concluida com sucesso em C:\smartvendas-agent!" -ForegroundColor Green
Write-Host "1. Edite o arquivo C:\smartvendas-agent\.env com a senha do PostgreSQL do VR e a chave da loja." -ForegroundColor Cyan
Write-Host "2. Para testar o agente no Windows, rode no PowerShell:" -ForegroundColor Cyan
Write-Host "   cd C:\smartvendas-agent; npm start" -ForegroundColor Yellow

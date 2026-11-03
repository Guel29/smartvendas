import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const downloadsDir = path.resolve(rootDir, 'public', 'downloads');
const publicApiDir = path.resolve(rootDir, 'public', 'api');

console.log('--- REPACKING DOWNLOAD ZIPS & AGENT PACKAGES ---');

// Check dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist! Run npm run build first.');
  process.exit(1);
}

// Ensure api directory is inside dist
const distApiDir = path.resolve(distDir, 'api');
if (!fs.existsSync(distApiDir)) {
  fs.mkdirSync(distApiDir, { recursive: true });
}

// Copy public/api/index.php to dist/api/index.php
if (fs.existsSync(path.join(publicApiDir, 'index.php'))) {
  fs.copyFileSync(
    path.join(publicApiDir, 'index.php'),
    path.join(distApiDir, 'index.php')
  );
  console.log('Copied updated public/api/index.php to dist/api/index.php');
}

// 1. GERAR PACOTE DO AGENTE DE SINCRONIZAÇÃO WINDOWS (smartvendas-agente-windows.zip)
const createWindowsAgentZip = () => {
  const winZip = new AdmZip();
  const agentFiles = [
    { name: 'INICIAR_AGENTE.bat', path: path.join(downloadsDir, 'INICIAR_AGENTE.bat') },
    { name: 'CONFIGURAR.bat', path: path.join(downloadsDir, 'CONFIGURAR.bat') },
    { name: 'INSTALAR_SERVICO_WINDOWS.bat', path: path.join(downloadsDir, 'INSTALAR_SERVICO_WINDOWS.bat') },
    { name: 'install-agent.bat', path: path.join(downloadsDir, 'install-agent.bat') },
    { name: 'install-agent.ps1', path: path.join(downloadsDir, 'install-agent.ps1') },
    { name: 'sync-agent.js', path: path.join(downloadsDir, 'sync-agent.js') },
    { name: 'sync-agent.ts', path: path.join(downloadsDir, 'sync-agent.ts') },
    { name: 'package.json', path: path.join(downloadsDir, 'agent-package.json') },
    { name: '.env.example', path: path.join(downloadsDir, '.env.example') },
    { name: 'LEAME.txt', path: path.join(downloadsDir, 'LEAME.txt') },
  ];

  for (const item of agentFiles) {
    if (fs.existsSync(item.path)) {
      winZip.addFile(item.name, fs.readFileSync(item.path));
    }
  }

  const winZipPath = path.join(downloadsDir, 'smartvendas-agente-windows.zip');
  winZip.writeZip(winZipPath);
  console.log(`Created smartvendas-agente-windows.zip (${fs.statSync(winZipPath).size} bytes)`);

  const fullInstallerZipPath = path.join(downloadsDir, 'smartvendas-agente-instalador-completo.zip');
  winZip.writeZip(fullInstallerZipPath);
  console.log(`Created smartvendas-agente-instalador-completo.zip (${fs.statSync(fullInstallerZipPath).size} bytes)`);
};

createWindowsAgentZip();

// 2. GERAR PACOTES DA API HOSTINGER
const zipsToUpdate = [
  'smartvendas-hostinger-instalacao-completa.zip',
  'smartvendas-atualizacao-hostinger.zip',
  'smartvendas-hostinger-subdominio.zip',
  'smartvendas-hostinger-subpasta.zip',
  'smartvendas-instalacao-completa.zip'
];

for (const zipName of zipsToUpdate) {
  const zipPath = path.join(downloadsDir, zipName);
  const zip = new AdmZip();

  const addFolderRecursive = (localFolder, zipFolder = '') => {
    const items = fs.readdirSync(localFolder);
    for (const item of items) {
      const fullLocal = path.join(localFolder, item);
      const zipItemPath = zipFolder ? `${zipFolder}/${item}` : item;
      const stat = fs.statSync(fullLocal);
      
      if (item === 'downloads' && localFolder === distDir) continue;

      if (stat.isDirectory()) {
        addFolderRecursive(fullLocal, zipItemPath);
      } else {
        const content = fs.readFileSync(fullLocal);
        zip.addFile(zipItemPath, content);
      }
    }
  };

  addFolderRecursive(distDir);

  const extraFiles = [
    { file: '001_initial_schema.sql', path: path.join(downloadsDir, '001_initial_schema.sql') },
    { file: 'descompactar.php', path: path.join(downloadsDir, 'descompactar.php') },
    { file: '.env.example', path: path.join(downloadsDir, '.env.example') },
    { file: 'DEPLOY_HOSTINGER.md', path: path.join(downloadsDir, 'DEPLOY_HOSTINGER.md') }
  ];

  for (const extra of extraFiles) {
    if (fs.existsSync(extra.path)) {
      zip.addFile(extra.file, fs.readFileSync(extra.path));
    }
  }

  zip.writeZip(zipPath);
  console.log(`Successfully repacked ${zipName} (${fs.statSync(zipPath).size} bytes)`);
}

console.log('--- REPACKING COMPLETE ---');

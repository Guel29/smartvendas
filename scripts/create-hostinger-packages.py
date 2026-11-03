#!/usr/bin/env python3
"""
Script de geração de pacotes 100% compatíveis com Hostinger / cPanel / Apache / LiteSpeed.
Gera arquivos ZIP com cabeçalhos padrão POSIX, entradas explícitas de diretórios (0755)
e permissões de arquivos (0644/0755), prevenindo o erro 'Erro ao descompactar' no hPanel File Manager.
Elimina qualquer arquivo duplicado dentro do ZIP.
"""

import os
import shutil
import zipfile
import tarfile
import time
import subprocess

OUTPUT_DIR = os.path.abspath('public/downloads')
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("--- Iniciando empacotamento padrão Hostinger (Subpasta e Subdomínio) ---")

# 0. Transpilar sync-agent.ts para public/downloads/sync-agent.js usando esbuild
print("--- Compilando sync-agent.ts para JavaScript (Node.js ESM) ---")
try:
    subprocess.run([
        'npx', 'esbuild', 'agent/sync-agent.ts',
        '--bundle', '--platform=node', '--format=esm', '--packages=external',
        '--outfile=public/downloads/sync-agent.js'
    ], check=True)
    print("sync-agent.js gerado com sucesso!")
except Exception as e:
    print(f"Aviso ao compilar sync-agent.js com esbuild: {e}")

# 1. Copiar arquivos estáticos individuais para public/downloads
copies = [
    ('migrations/001_initial_schema.sql', 'public/downloads/001_initial_schema.sql'),
    ('scripts/hostinger-install.sh', 'public/downloads/hostinger-install.sh'),
    ('scripts/hostinger-update.sh', 'public/downloads/hostinger-update.sh'),
    ('agent/sync-agent.ts', 'public/downloads/sync-agent.ts'),
    ('agent/package.json', 'public/downloads/agent-package.json'),
    ('agent/.env.agent.example', 'public/downloads/.env.agent.example'),
    ('public/.htaccess', 'public/downloads/.htaccess'),
    ('docs/DEPLOY_HOSTINGER.md', 'public/downloads/DEPLOY_HOSTINGER.md'),
    ('.env.example', 'public/downloads/.env.example'),
]

for src, dest in copies:
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        print(f"Copiado: {src} -> {dest}")

# Sincronizar public/api/index.php com dist/api/index.php se dist existir
if os.path.exists('dist') and os.path.exists('public/api/index.php'):
    os.makedirs('dist/api', exist_ok=True)
    shutil.copy2('public/api/index.php', 'dist/api/index.php')
    print("Copiado: public/api/index.php -> dist/api/index.php")

# 2. Criar script descompactar.php para quem preferir descompactar via navegador em 1 clique
descompactar_php = """<?php
/**
 * SMART VENDAS - DESCOMPACTADOR AUTOMÁTICO PARA HOSTINGER / CPANEL
 * Use este arquivo caso o Gerenciador de Arquivos do hPanel apresente qualquer erro ao descompactar.
 *
 * Modo de uso:
 * 1. Coloque este arquivo (descompactar.php) dentro da sua subpasta (ex: public_html/smartvendas)
 * 2. Coloque o arquivo ZIP (smartvendas-hostinger-instalacao-completa.zip) na mesma pasta
 * 3. Acesse no navegador: https://seusite.com.br/smartvendas/descompactar.php
 */
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Vendas - Descompactador Hostinger</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; display: flex; justify-content: center; }
        .card { background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; max-width: 650px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { margin-top: 0; color: #38bdf8; font-size: 24px; display: flex; align-items: center; gap: 10px; }
        .success { background: #064e3b; border: 1px solid #10b981; color: #a7f3d0; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .error { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 15px; }
    </style>
</head>
<body>
<div class="card">
    <h1>📦 Smart Vendas - Descompactador</h1>
<?php
$zipFiles = glob('*.zip');
$targetZip = null;
$preferred = 'smartvendas-hostinger-instalacao-completa.zip';

if (file_exists($preferred)) {
    $targetZip = $preferred;
} elseif (!empty($zipFiles)) {
    $targetZip = $zipFiles[0];
}

if (!$targetZip) {
    echo '<div class="error">❌ Nenhum arquivo .zip foi encontrado nesta pasta.<br>Envie o arquivo ZIP para esta pasta via Gerenciador de Arquivos.</div>';
} else {
    echo "<p>Arquivo identificado: <strong>$targetZip</strong></p>";
    $zip = new ZipArchive();
    $res = $zip->open($targetZip);
    if ($res === TRUE) {
        $extracted = $zip->extractTo(__DIR__);
        $numFiles = $zip->numFiles;
        $zip->close();
        if ($extracted) {
            echo '<div class="success">✅ <strong>Sucesso!</strong> Todos os ' . $numFiles . ' arquivos foram descompactados com sucesso nesta subpasta!</div>';
            echo '<p>Seu sistema já está pronto. Por segurança, apague o arquivo <code>descompactar.php</code>.</p>';
            echo '<a class="btn" href="./">Acessar o Smart Vendas 🚀</a>';
        } else {
            echo '<div class="error">❌ Falha ao extrair os arquivos. Verifique as permissões de escrita da pasta (deve ser 755).</div>';
        }
    } else {
        echo '<div class="error">❌ Não foi possível abrir o arquivo ZIP. Código de erro: ' . $res . '</div>';
    }
}
?>
</div>
</body>
</html>
"""
with open(os.path.join(OUTPUT_DIR, 'descompactar.php'), 'w', encoding='utf-8') as f:
    f.write(descompactar_php)
print("Criado: public/downloads/descompactar.php")

# 3. Função padrão POSIX para construir ZIP 100% compatível e sem duplicatas
def build_standard_zip(file_mapping, output_zip_path):
    """
    file_mapping: lista de tuplas (caminho_real_no_disco, caminho_relativo_dentro_do_zip)
    - Garante diretórios pais com external_attr 0o040755
    - Garante permissões de arquivo 0o100644 (0o100755 para .sh)
    - DEDUPLICA todas as entradas (garante 100% nomes únicos)
    """
    dirs_added = set()
    files_added = set()
    now_tuple = time.localtime(time.time())[:6]

    if os.path.exists(output_zip_path):
        os.remove(output_zip_path)

    with zipfile.ZipFile(output_zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for real_path, zip_path in file_mapping:
            # Normalizar separadores
            zip_path = zip_path.replace('\\', '/').lstrip('/')
            if not zip_path:
                continue

            # Criar diretórios intermediários
            parts = zip_path.split('/')
            if len(parts) > 1:
                cur = ''
                for p in parts[:-1]:
                    cur += p + '/'
                    if cur not in dirs_added:
                        d_info = zipfile.ZipInfo(cur)
                        d_info.external_attr = (0o040755) << 16  # drwxr-xr-x
                        d_info.date_time = now_tuple
                        z.writestr(d_info, '')
                        dirs_added.add(cur)

            # Se for diretório puro
            if real_path is None or zip_path.endswith('/'):
                dir_key = zip_path.rstrip('/') + '/'
                if dir_key not in dirs_added:
                    d_info = zipfile.ZipInfo(dir_key)
                    d_info.external_attr = (0o040755) << 16
                    d_info.date_time = now_tuple
                    z.writestr(d_info, '')
                    dirs_added.add(dir_key)
                continue

            # Se já adicionamos este arquivo, ignorar para evitar duplicata
            if zip_path in files_added:
                continue

            # Se for arquivo no disco
            if os.path.isfile(real_path):
                f_stat = os.stat(real_path)
                f_info = zipfile.ZipInfo(zip_path)
                f_info.compress_type = zipfile.ZIP_DEFLATED
                f_info.date_time = time.localtime(f_stat.st_mtime)[:6]
                if zip_path.endswith('.sh'):
                    f_info.external_attr = (0o100755) << 16  # -rwxr-xr-x
                else:
                    f_info.external_attr = (0o100644) << 16  # -rw-r--r--
                
                with open(real_path, 'rb') as fp:
                    z.writestr(f_info, fp.read())
                files_added.add(zip_path)

    print(f"ZIP gerado com sucesso ({len(files_added)} arquivos, {len(dirs_added)} pastas): {output_zip_path} ({os.path.getsize(output_zip_path)} bytes)")

# 4. Coletar arquivos para o Pacote Completo (Subpasta e Subdomínio)
full_mapping = []

# Dist files -> Raiz do ZIP
if os.path.exists('dist'):
    for root, dirs, files in os.walk('dist'):
        rel_root = os.path.relpath(root, 'dist')
        if rel_root == 'downloads' or rel_root.startswith('downloads' + os.sep):
            continue
        for d in dirs:
            if d == 'downloads':
                continue
            dir_zip_path = os.path.join(rel_root, d).replace('\\', '/') if rel_root != '.' else d
            full_mapping.append((None, dir_zip_path + '/'))
        for f in files:
            file_real = os.path.join(root, f)
            file_zip = os.path.join(rel_root, f).replace('\\', '/') if rel_root != '.' else f
            full_mapping.append((file_real, file_zip))

    # Cópia dentro da pasta dist/
    for root, dirs, files in os.walk('dist'):
        rel_root = os.path.relpath(root, 'dist')
        if rel_root == 'downloads' or rel_root.startswith('downloads' + os.sep):
            continue
        for d in dirs:
            if d == 'downloads':
                continue
            dir_zip_path = 'dist/' + (os.path.join(rel_root, d).replace('\\', '/') if rel_root != '.' else d)
            full_mapping.append((None, dir_zip_path + '/'))
        for f in files:
            file_real = os.path.join(root, f)
            file_zip = 'dist/' + (os.path.join(rel_root, f).replace('\\', '/') if rel_root != '.' else f)
            full_mapping.append((file_real, file_zip))

# Pastas backend e adicionais
additional_folders = ['server', 'migrations', 'scripts', 'agent']
for folder in additional_folders:
    if os.path.exists(folder):
        for root, dirs, files in os.walk(folder):
            for d in dirs:
                dir_zip = os.path.join(root, d).replace('\\', '/')
                full_mapping.append((None, dir_zip + '/'))
            for f in files:
                file_real = os.path.join(root, f)
                file_zip = file_real.replace('\\', '/')
                full_mapping.append((file_real, file_zip))

# Arquivos essenciais na raiz
root_files = [
    'server.ts',
    'package.json',
    'tsconfig.json',
    'ecosystem.config.cjs',
    '.env.example',
]
for rf in root_files:
    if os.path.exists(rf):
        full_mapping.append((rf, rf))

# Schema SQL diretamente na raiz para facilitar importação no phpMyAdmin
if os.path.exists('migrations/001_initial_schema.sql'):
    full_mapping.append(('migrations/001_initial_schema.sql', '001_initial_schema.sql'))

# .htaccess na raiz
if os.path.exists('public/.htaccess'):
    full_mapping.append(('public/.htaccess', '.htaccess'))

# descompactar.php dentro do zip para quem precisar de descompactação em 1 clique
if os.path.exists('public/downloads/descompactar.php'):
    full_mapping.append(('public/downloads/descompactar.php', 'descompactar.php'))

# Salvar o pacote de instalação completo
zip_names = [
    'smartvendas-hostinger-instalacao-completa.zip',
    'smartvendas-hostinger-subpasta.zip',
    'smartvendas-hostinger-subdominio.zip',
    'smartvendas-instalacao-completa.zip',
]

primary_zip = os.path.join(OUTPUT_DIR, zip_names[0])
build_standard_zip(full_mapping, primary_zip)

# Copiar para os outros nomes para garantir compatibilidade com qualquer link
for zn in zip_names[1:]:
    target = os.path.join(OUTPUT_DIR, zn)
    shutil.copy2(primary_zip, target)
    print(f"Copiado alias: {target}")

# 5. Coletar arquivos para o Pacote de Atualização (smartvendas-atualizacao-hostinger.zip)
update_mapping = []
if os.path.exists('dist'):
    for root, dirs, files in os.walk('dist'):
        rel_root = os.path.relpath(root, 'dist')
        if rel_root == 'downloads' or rel_root.startswith('downloads' + os.sep):
            continue
        for d in dirs:
            if d == 'downloads':
                continue
            dir_zip_path = os.path.join(rel_root, d).replace('\\', '/') if rel_root != '.' else d
            update_mapping.append((None, dir_zip_path + '/'))
        for f in files:
            file_real = os.path.join(root, f)
            file_zip = os.path.join(rel_root, f).replace('\\', '/') if rel_root != '.' else f
            update_mapping.append((file_real, file_zip))

for uf in ['server', 'scripts', 'agent', 'migrations']:
    if os.path.exists(uf):
        for root, dirs, files in os.walk(uf):
            for d in dirs:
                dir_zip = os.path.join(root, d).replace('\\', '/')
                update_mapping.append((None, dir_zip + '/'))
            for f in files:
                file_real = os.path.join(root, f)
                file_zip = file_real.replace('\\', '/')
                update_mapping.append((file_real, file_zip))

for rf in ['server.ts', 'package.json', 'ecosystem.config.cjs']:
    if os.path.exists(rf):
        update_mapping.append((rf, rf))

if os.path.exists('migrations/001_initial_schema.sql'):
    update_mapping.append(('migrations/001_initial_schema.sql', '001_initial_schema.sql'))
if os.path.exists('public/.htaccess'):
    update_mapping.append(('public/.htaccess', '.htaccess'))
if os.path.exists('public/downloads/descompactar.php'):
    update_mapping.append(('public/downloads/descompactar.php', 'descompactar.php'))
if os.path.exists('public/api/index.php'):
    update_mapping.append(('public/api/index.php', 'api/index.php'))

update_zip = os.path.join(OUTPUT_DIR, 'smartvendas-atualizacao-hostinger.zip')
build_standard_zip(update_mapping, update_zip)

# 6. Gerar Pacote do Agente Windows atualizado (smartvendas-agente-windows.zip)
print("--- Gerando smartvendas-agente-windows.zip atualizado ---")
agent_mapping = [
    ('public/downloads/INICIAR_AGENTE.bat', 'INICIAR_AGENTE.bat'),
    ('public/downloads/CONFIGURAR.bat', 'CONFIGURAR.bat'),
    ('public/downloads/DIAGNOSTICAR_SANGRIAS.bat', 'DIAGNOSTICAR_SANGRIAS.bat'),
    ('public/downloads/INSTALAR_SERVICO_WINDOWS.bat', 'INSTALAR_SERVICO_WINDOWS.bat'),
    ('public/downloads/install-agent.bat', 'install-agent.bat'),
    ('public/downloads/install-agent.ps1', 'install-agent.ps1'),
    ('public/downloads/sync-agent.js', 'sync-agent.js'),
    ('public/downloads/sync-agent.ts', 'sync-agent.ts'),
    ('public/downloads/agent-package.json', 'package.json'),
    ('public/downloads/.env.example', '.env.example'),
    ('public/downloads/LEAME.txt', 'LEAME.txt'),
]
agent_zip_path = os.path.join(OUTPUT_DIR, 'smartvendas-agente-windows.zip')
build_standard_zip(agent_mapping, agent_zip_path)

# 7. Gerar também o .tar.gz (que a Hostinger também descompacta nativamente pelo gerenciador)
tar_path = os.path.join(OUTPUT_DIR, 'smartvendas-hostinger-subdominio.tar.gz')
with tarfile.open(tar_path, "w:gz") as tar:
    added_tar = set()
    for real_path, arc_name in full_mapping:
        if real_path and os.path.isfile(real_path) and arc_name not in added_tar:
            tar.add(real_path, arcname=arc_name)
            added_tar.add(arc_name)
print(f"TAR.GZ gerado com sucesso: {tar_path}")

# Se existir dist, sincronizar os downloads em dist/downloads
if os.path.exists('dist'):
    dist_downloads = os.path.abspath('dist/downloads')
    os.makedirs(dist_downloads, exist_ok=True)
    for f in os.listdir(OUTPUT_DIR):
        src_f = os.path.join(OUTPUT_DIR, f)
        dest_f = os.path.join(dist_downloads, f)
        if os.path.isfile(src_f):
            shutil.copy2(src_f, dest_f)
    print("Sincronizado public/downloads -> dist/downloads")

print("=== Todos os pacotes foram criados com padrão 100% Hostinger/cPanel! ===")

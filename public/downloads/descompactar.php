<?php
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

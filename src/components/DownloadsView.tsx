import React, { useState } from 'react';
import {
  Download,
  Database,
  Server,
  FileCode,
  CheckCircle2,
  Copy,
  Terminal,
  FolderArchive,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { FULL_SCHEMA_SQL, downloadSqlSchema } from '../data/schemaSql';

export const DownloadsView: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedBash, setCopiedBash] = useState<string | null>(null);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [applyingSchema, setApplyingSchema] = useState(false);
  const [schemaFeedback, setSchemaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplySchema = async () => {
    setApplyingSchema(true);
    setSchemaFeedback(null);
    try {
      const res = await fetch('/api/admin/apply-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setSchemaFeedback({
          type: 'success',
          text: `✓ ${data.message || 'Schema atualizado com sucesso no banco de dados!'}`,
        });
      } else {
        setSchemaFeedback({
          type: 'error',
          text: `✗ ${data.message || 'Falha ao aplicar schema no MySQL.'}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSchemaFeedback({ type: 'error', text: `Erro de rede: ${msg}` });
    } finally {
      setApplyingSchema(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } else {
      setCopiedBash(id);
      setTimeout(() => setCopiedBash(null), 3000);
    }
  };

  const sampleSchemaSql = FULL_SCHEMA_SQL;

  return (
    <div className="space-y-6">
      
      {/* 1. Header do Centro de Downloads */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Versão Oficial v1.2.0 · Arquivos Prontos para Hostinger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Central de Downloads & Instalação Hostinger
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Aqui você encontra o arquivo zipado com a <strong>instalação completa para colocar na subpasta</strong> da Hostinger, o pacote de atualização e o <strong>schema do banco de dados MySQL 8</strong> atualizado.
          </p>
        </div>

        {/* Efeito decorativo */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* 2. DESTAQUE PRINCIPAL: ARQUIVO ZIPADO DE INSTALAÇÃO COMPLETA PARA SUBPASTA HOSTINGER */}
      <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xl shadow-emerald-900/40">
              <FolderArchive className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Arquivo de Instalação Completo (.ZIP) — Subpasta Hostinger
                </h2>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow">
                  Arquivo Principal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
                Este é o <strong>arquivo zipado completo com todas as informações do sistema</strong>. Ele foi empacotado para ser extraído <strong>diretamente dentro da subpasta</strong> na Hostinger (ex: <code>public_html/smartvendas</code> ou <code>public_html/sistema</code>). Já inclui <code>index.html</code> com rotas relativas, pasta <code>assets/</code>, backend Express, <code>.htaccess</code> configurado para subpastas e o schema MySQL 8.
              </p>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo: smartvendas-hostinger-instalacao-completa.zip
                </span>
                <span>•</span>
                <span>Pronto para extrair na subpasta</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <a
              href="/downloads/smartvendas-hostinger-instalacao-completa.zip"
              download="smartvendas-hostinger-instalacao-completa.zip"
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition shadow-lg shadow-emerald-900/30 text-center"
            >
              <Download className="w-5 h-5" />
              <span>Baixar Instalação Completa (.ZIP)</span>
            </a>
            <div className="flex gap-2">
              <a
                href="/downloads/smartvendas-atualizacao-hostinger.zip"
                download="smartvendas-atualizacao-hostinger.zip"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs transition text-center"
                title="Apenas arquivos de atualização sem sobrescrever seu .env"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualização (.ZIP)</span>
              </a>
              <button
                type="button"
                onClick={downloadSqlSchema}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs transition text-center"
                title="Schema SQL das 13 tabelas para o phpMyAdmin (Blob Seguro)"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Schema (.SQL)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ALERTA E SOLUÇÃO: SE DEU ERRO AO DESCOMPACTAR NO HPANEL */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Deu erro ao descompactar o arquivo no Gerenciador da Hostinger?</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Soluções Imediatas
                </span>
              </h3>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                O arquivo ZIP foi <strong>totalmente reconstruído com cabeçalhos padrão POSIX</strong> (permissões 755 para pastas, 644 para arquivos e sem duplicatas), resolvendo a causa raiz do erro de extração do hPanel. Você também tem 3 opções garantidas:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Opção 1: Novo ZIP Corrigido */}
            <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                <span>Novo ZIP Corrigido</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Baixe a nova versão do ZIP acima. Ele possui as entradas de diretórios registradas no padrão que o hPanel exige.
              </p>
              <a
                href="/downloads/smartvendas-hostinger-instalacao-completa.zip"
                download="smartvendas-hostinger-instalacao-completa.zip"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar ZIP Atualizado</span>
              </a>
            </div>

            {/* Opção 2: Descompactador em 1 clique via PHP */}
            <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">2</span>
                <span>Descompactar via PHP (1 Clique)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Coloque o <code>descompactar.php</code> na subpasta e acesse no navegador: <code>seusite.com.br/smartvendas/descompactar.php</code>.
              </p>
              <a
                href="/downloads/descompactar.php"
                download="descompactar.php"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar descompactar.php</span>
              </a>
            </div>

            {/* Opção 3: Formato .TAR.GZ */}
            <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px]">3</span>
                <span>Pacote .tar.gz (Linux Nativo)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                O gerenciador da Hostinger também extrai nativamente arquivos <code>.tar.gz</code> sem conflito de permissões.
              </p>
              <a
                href="/downloads/smartvendas-hostinger-subdominio.tar.gz"
                download="smartvendas-hostinger-subdominio.tar.gz"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Pacote .tar.gz</span>
              </a>
            </div>
          </div>
        </div>

        {/* Passo a Passo de como colocar na subpasta da Hostinger */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <span>Como colocar na Subpasta da Hostinger (Passo a Passo)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">1</span>
                <span>Criar a Subpasta</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                No <strong>Gerenciador de Arquivos</strong> da Hostinger, entre na pasta <code>public_html/</code> e crie a subpasta (ex: <code>smartvendas</code> ou <code>sistema</code>).
              </p>
            </div>

            <div className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">2</span>
                <span>Subir e Extrair o ZIP</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Faça o upload do <code>smartvendas-hostinger-instalacao-completa.zip</code> para dentro dessa subpasta. Clique com o botão direito e selecione <strong>Extrair</strong>.
              </p>
            </div>

            <div className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
                <span>Importar o Banco (MySQL)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                No <strong>phpMyAdmin</strong> da Hostinger, selecione o banco de dados e vá em <strong>Importar</strong>. Escolha o arquivo <code>001_initial_schema.sql</code> e execute.
              </p>
            </div>

            <div className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">4</span>
                <span>Pronto para Usar</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Abra a URL no seu navegador:
                <code className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] mt-1 block">seusite.com.br/smartvendas</code>
                O sistema funcionará diretamente dentro da subpasta!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GRID DE ARQUIVOS E COMPONENTES INDIVIDUAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* BLOCO A: SCHEMA MYSQL 8 ATUALIZADO */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                16 Tabelas MySQL 8
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Schema do Banco de Dados MySQL 8 Atualizado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Arquivo <code>001_initial_schema.sql</code> completo com 16 tabelas (sangrias, lojas, pdvs, usuários, etc.), índices de unicidade e migrações seguras.
            </p>
          </div>

          {schemaFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                schemaFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}
            >
              {schemaFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{schemaFeedback.text}</span>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleApplySchema}
              disabled={applyingSchema}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition shadow-lg shadow-purple-900/30"
              title="Aplica e atualiza o schema diretamente no banco MySQL"
            >
              <Database className={`w-4 h-4 ${applyingSchema ? 'animate-spin' : ''}`} />
              <span>{applyingSchema ? 'Enviando ao Banco...' : '🚀 Enviar Schema Direto para o Banco de Dados'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadSqlSchema}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-600 font-bold text-xs border border-slate-200 dark:border-slate-700 transition shadow-sm"
                title="Download direto de arquivo SQL puro"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .SQL</span>
              </button>

              <button
                onClick={() => copyToClipboard(sampleSchemaSql, 'sql')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
                title="Copiar SQL para a área de transferência"
              >
                {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Importação terminal:</span>
              <code className="font-mono text-purple-600 dark:text-purple-400 text-[10px]">
                mysql -u user -p smart_vendas &lt; 001_initial_schema.sql
              </code>
            </div>
          </div>
        </div>

        {/* BLOCO B: INSTALAÇÃO COMPLETA NA VPS HOSTINGER */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Instalação em 1 Comando
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Script de Instalação Completa Hostinger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Arquivo <code>hostinger-install.sh</code>. Instala Node.js 22 LTS, MySQL 8, Nginx com proxy reverso, PM2 para manter 24/7 e SSL Certbot automático.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <a
                href="/downloads/hostinger-install.sh"
                download="hostinger-install.sh"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow"
              >
                <Download className="w-4 h-4" />
                <span>Baixar hostinger-install.sh</span>
              </a>

              <button
                onClick={() => copyToClipboard('sudo bash scripts/hostinger-install.sh', 'bash-install')}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
              >
                {copiedBash === 'bash-install' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedBash === 'bash-install' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-blue-600 dark:text-blue-400 select-all border border-slate-200 dark:border-slate-800">
              sudo bash scripts/hostinger-install.sh
            </div>
          </div>
        </div>

        {/* BLOCO C: ATUALIZAÇÃO AUTOMÁTICA COM ZERO DOWNTIME */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Zero-Downtime
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Script de Atualização Automática Hostinger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Arquivo <code>hostinger-update.sh</code>. Cria backup do MySQL preventivo, atualiza dependências, compila e reinicia o PM2 sem perda de sessões.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <a
                href="/downloads/hostinger-update.sh"
                download="hostinger-update.sh"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow"
              >
                <Download className="w-4 h-4" />
                <span>Baixar hostinger-update.sh</span>
              </a>

              <button
                onClick={() => copyToClipboard('sudo bash scripts/hostinger-update.sh', 'bash-update')}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
              >
                {copiedBash === 'bash-update' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedBash === 'bash-update' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-amber-600 dark:text-amber-400 select-all border border-slate-200 dark:border-slate-800">
              sudo bash scripts/hostinger-update.sh
            </div>
          </div>
        </div>

        {/* BLOCO D: AGENTE LOCAL DE SINCRONIZAÇÃO VR SOFTWARE (WINDOWS & LINUX) */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-900/30">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                Nativo para Windows & Linux
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Agente Local VR Software (Sincronizador)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Pacote completo com inicializador automático (<code>INICIAR_AGENTE.bat</code>), assistente de configuração (.env) e código JavaScript puro sem necessidade de compilação.
            </p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <a
              href="/downloads/smartvendas-agente-instalador-completo.zip"
              download="smartvendas-agente-instalador-completo.zip"
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-900/20 text-center"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Instalador Completo do Agente (.ZIP)</span>
            </a>

            <div className="flex items-center gap-2">
              <a
                href="/downloads/install-agent.bat"
                download="install-agent.bat"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition border border-slate-200 dark:border-slate-700 text-center"
                title="Script BAT de instalação no Windows"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Instalador BAT</span>
              </a>

              <a
                href="/downloads/install-agent.sh"
                download="install-agent.sh"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition border border-slate-200 dark:border-slate-700 text-center"
                title="Instalador Bash para Linux da Loja"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Linux (.sh)</span>
              </a>

              <a
                href="/downloads/sync-agent.js"
                download="sync-agent.js"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition border border-slate-200 dark:border-slate-700 text-center"
                title="Código-fonte JavaScript puro do Agente"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                <span>sync-agent.js</span>
              </a>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
              <span>Como usar no Windows:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Baixar ZIP -&gt; Extrair -&gt; Duplo clique em INICIAR_AGENTE.bat
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. VISUALIZADOR DO SCHEMA MYSQL 8 COM EXPANSÃO */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Estrutura Detalhada das 13 Tabelas do Schema MySQL 8</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tabelas concebidas com precisão financeira para refletir fielmente o VR Master
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(sampleSchemaSql, 'sql')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
            >
              {copiedSql ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? 'SQL Copiado com Sucesso!' : 'Copiar Schema Completo'}</span>
            </button>

            <button
              onClick={() => setShowSqlPreview(!showSqlPreview)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {showSqlPreview ? 'Recolher Visualizador' : 'Ver Código SQL'}
            </button>
          </div>
        </div>

        {/* Resumo das 13 Tabelas em Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {[
            { num: '01', name: 'stores', desc: 'Lojas e credenciais da rede' },
            { num: '02', name: 'users', desc: 'Usuários, senhas e perfis RBAC' },
            { num: '03', name: 'user_store_permissions', desc: 'Acessos por loja (RBAC)' },
            { num: '04', name: 'store_agents', desc: 'Status do agente da loja' },
            { num: '05', name: 'pdvs', desc: 'Caixas detectados automaticamente' },
            { num: '06', name: 'sales_daily', desc: 'Vendas diárias (fórmulas VR)' },
            { num: '07', name: 'payment_daily', desc: 'Finalizadoras por caixa e dia' },
            { num: '08', name: 'tef_transactions_daily', desc: 'Transações TEF (pdv.vendatef)' },
            { num: '09', name: 'tef_classification_rules', desc: 'Regras de Pix e cartões' },
            { num: '10', name: 'sync_logs', desc: 'Histórico de transmissões' },
            { num: '11', name: 'notification_settings', desc: 'Limiares de alertas e sangria' },
            { num: '12', name: 'audit_logs', desc: 'Rastreabilidade de ações' },
            { num: '13', name: 'system_settings', desc: 'Configurações globais e F8' },
          ].map((table) => (
            <div
              key={table.name}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 flex items-start gap-2.5"
            >
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold text-[11px] bg-purple-500/10 px-1.5 py-0.5 rounded">
                {table.num}
              </span>
              <div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  {table.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {table.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bloco de Código SQL Expandido */}
        {showSqlPreview && (
          <div className="relative mt-4">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-96 border border-slate-800 leading-relaxed">
              {sampleSchemaSql}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};

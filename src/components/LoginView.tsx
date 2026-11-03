import React, { useState } from 'react';
import {
  Flame,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
  Store,
  Server,
  RefreshCw,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

export const LoginView: React.FC = () => {
  const { login, loginOfflineMaster, theme, toggleTheme } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canFallback, setCanFallback] = useState(false);

  // Diagnóstico do Servidor / Hostinger
  const [showHelp, setShowHelp] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    tested: boolean;
    success: boolean;
    statusText: string;
    details?: string;
  } | null>(null);

  const handleTestServerConnection = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const res = await fetch(getApiUrl('/api/health'));
      if (res.ok) {
        const data = await res.json();
        setDiagResult({
          tested: true,
          success: true,
          statusText: 'Servidor Backend Ativo e Respondendo!',
          details: `Modo: ${data.mode || 'Node.js'} · MySQL: ${data.mysql || 'conectado'} · Hora: ${new Date().toLocaleTimeString('pt-BR')}`,
        });
      } else {
        setDiagResult({
          tested: true,
          success: false,
          statusText: `API retornou erro HTTP ${res.status}`,
          details: 'O servidor web respondeu, mas a rota /api/health gerou erro.',
        });
      }
    } catch (err: any) {
      setDiagResult({
        tested: true,
        success: false,
        statusText: 'Falha de conexão com a API Central',
        details: 'Não foi possível alcançar /api/health. Se você está na VPS Hostinger, execute "pm2 status" ou "pm2 restart smart-vendas". Na hospedagem compartilhada, certifique-se de que o arquivo public/api/index.php e .htaccess foram enviados.',
      });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCanFallback(false);

    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu endereço de e-mail.');
      return;
    }

    if (!password) {
      setErrorMsg('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setErrorMsg(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        if (res.canFallbackOffline) {
          setCanFallback(true);
        }
      }
    } catch (err: any) {
      setErrorMsg('Falha na comunicação com o servidor de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden font-sans">
      
      {/* Elementos visuais de fundo em degradê */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/15 blur-[120px] pointer-events-none" />

      {/* Topo com botão de tema */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Flame className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white">Smart Vendas</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              VR Software
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </header>

      {/* Card Central de Login */}
      <main className="w-full max-w-md mx-auto px-4 py-6 z-10 flex-1 flex flex-col justify-center">
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 shadow-2xl shadow-black/60">
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Acesso ao Sistema
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Entre com suas credenciais para acessar o painel de vendas em tempo real
            </p>
          </div>

          {/* Alerta de Erro */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {canFallback && (
                <button
                  type="button"
                  onClick={loginOfflineMaster}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Acessar Painel em Modo Local de Contingência</span>
                </button>
              )}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  name="user_email"
                  required
                  autoFocus
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha
                </label>
                <span className="text-[11px] text-slate-500">
                  Mínimo 6 dígitos
                </span>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="user_password"
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opções e Diagnóstico */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Lembrar meu usuário</span>
              </label>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition text-[11px]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>Ajuda e Conexão</span>
              </button>
            </div>

            {/* Painel de Ajuda e Diagnóstico Hostinger */}
            {showHelp && (
              <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-400" />
                    Diagnóstico de Conexão
                  </span>
                  <button
                    type="button"
                    onClick={handleTestServerConnection}
                    disabled={diagLoading}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${diagLoading ? 'animate-spin' : ''}`} />
                    <span>{diagLoading ? 'Testando...' : 'Testar API'}</span>
                  </button>
                </div>

                {diagResult && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] ${
                      diagResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <p className="font-bold">{diagResult.statusText}</p>
                    {diagResult.details && <p className="mt-0.5 text-[10px] opacity-90">{diagResult.details}</p>}
                  </div>
                )}

                <div className="space-y-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                  <p>
                    <strong className="text-white">Acesso:</strong> Digite seu e-mail de acesso e sua senha cadastrada no banco.
                  </p>
                  <p>
                    <strong className="text-white">Na VPS Hostinger:</strong> Se você criou o banco no MySQL, execute no terminal:
                    <br />
                    <code className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded block mt-1 font-mono">
                      mysql -u smartvendas_app -p smart_vendas &lt; migrations/001_initial_schema.sql
                    </code>
                  </p>
                  <p>
                    <strong className="text-white">Verificar Status do Servidor:</strong> No terminal da VPS: <code className="text-[10px] text-slate-300 bg-slate-900 px-1 py-0.5 rounded">pm2 status</code>
                  </p>
                </div>
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Rodapé informativo do login */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Criptografia SHA-256</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-teal-400" />
              <span>Multi-Loja VR</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>v1.2.0</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Smart Vendas · Painel de Controle e Monitoramento de PDVs
          </p>
        </div>

      </main>

      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-800/60">
        <span>© {new Date().getFullYear()} Smart Vendas. Todos os direitos reservados.</span>
      </footer>

    </div>
  );
};

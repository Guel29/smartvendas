import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se já estiver instalado em modo standalone nativo, oculta o botão
  if (isInstalled) {
    return null;
  }

  // Fluxo Android / Chrome / Edge / Computador
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Instalar Smart Vendas no dispositivo"
        className={`flex items-center gap-1.5 font-medium transition rounded-lg ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            : 'px-3.5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow'
        }`}
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  // Fluxo iOS Safari (iPhone / iPad)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar no iPhone / iPad"
          className={`flex items-center gap-1.5 font-medium border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition ${
            compact ? 'px-2.5 py-1.5 text-xs bg-slate-800/80' : 'px-3 py-1.5 text-xs bg-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    1
                  </span>
                  <p>
                    No Safari, toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima{' '}
                    <Share className="inline w-3.5 h-3.5 text-blue-400" /> na barra inferior).
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    2
                  </span>
                  <p>
                    Role o menu para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    3
                  </span>
                  <p>
                    Toque em <strong>Adicionar</strong> no canto superior direito para abrir em tela cheia como aplicativo nativo.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-semibold text-white transition shadow"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

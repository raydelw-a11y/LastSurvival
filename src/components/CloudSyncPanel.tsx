import React, { useState } from 'react';
import { Cloud, CloudOff, Copy, Check, RefreshCw, X, Link2, LogOut } from 'lucide-react';
import { CloudSyncApi, formatSyncCode } from '../sync/useCloudSync';

interface CloudSyncPanelProps {
  sync: CloudSyncApi;
  onClose: () => void;
}

const STATUS_LABEL: Record<CloudSyncApi['status'], string> = {
  off: 'Desactivado',
  syncing: 'Sincronizando…',
  ok: 'Sincronizado',
  offline: 'Sin conexión',
  error: 'Error',
};

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ sync, onClose }) => {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const busy = sync.status === 'syncing';

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !input.trim()) return;
    const ok = await sync.connect(input);
    if (ok) setInput('');
  };

  const copyCode = async () => {
    if (!sync.code) return;
    const text = formatSyncCode(sync.code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const lastSync = sync.lastSyncAt
    ? new Date(sync.lastSyncAt).toLocaleTimeString('es-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[9990] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-xl bg-[#1d1f1a] border-2 border-yellow-500/80 shadow-2xl p-4 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Cloud className="w-5 h-5 text-sky-300" />
          <h2 className="font-pixel text-sm text-yellow-300">GUARDADO EN LA NUBE</h2>
        </div>
        <p className="text-[11px] text-zinc-400 mb-3 leading-snug">
          Usa el mismo código en tu iPhone y en la web para jugar la misma partida en ambos. Nunca se
          pierde avance: se conserva lo mejor de cada dispositivo.
        </p>

        {sync.code ? (
          <>
            <div className="rounded-lg bg-black/50 border border-zinc-700 p-3 mb-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                Tu código de sincronización
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg sm:text-xl font-bold text-emerald-300 tracking-wider select-all">
                  {formatSyncCode(sync.code)}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-[11px] font-bold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="text-[10px] text-amber-300/90 mt-2">
                Guárdalo: quien tenga este código puede usar tu partida.
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] mb-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sync.status === 'ok'
                      ? 'bg-emerald-400'
                      : sync.status === 'syncing'
                      ? 'bg-sky-400 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                {STATUS_LABEL[sync.status]}
                {lastSync && sync.status === 'ok' ? ` · ${lastSync}` : ''}
              </span>
              <button
                type="button"
                onClick={sync.syncNow}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded bg-sky-900/70 hover:bg-sky-800 border border-sky-500/60 text-sky-100 font-bold disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                Sincronizar ahora
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void sync.enable()}
            disabled={busy}
            className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-b from-yellow-300 to-amber-500 text-zinc-950 font-extrabold text-sm border-2 border-[#181410] disabled:opacity-60 cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            {busy ? 'Creando…' : 'Activar y crear mi código'}
          </button>
        )}

        <form onSubmit={submitCode} className="rounded-lg border border-zinc-700 p-3 mb-2">
          <label htmlFor="sync-code-input" className="block text-[11px] font-bold text-zinc-300 mb-1.5">
            {sync.code ? '¿Usar otro código?' : '¿Ya tienes un código de otro dispositivo?'}
          </label>
          <div className="flex gap-2">
            <input
              id="sync-code-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitCode(e);
                }
              }}
              placeholder="ABCD-EFGH-JKLM"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 px-2.5 py-2 rounded bg-black/60 border border-zinc-600 font-mono text-sm uppercase tracking-wider text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 text-xs font-extrabold disabled:opacity-50 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              Conectar
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">
            Tu avance de este dispositivo se combina con el de la nube.
          </p>
        </form>

        {sync.errorMsg && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-300 bg-red-950/50 border border-red-800 rounded p-2 mb-2">
            <CloudOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{sync.errorMsg}</span>
          </div>
        )}

        {sync.code && (
          <button
            type="button"
            onClick={sync.disconnect}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] text-zinc-400 hover:text-red-300 hover:bg-zinc-900 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Desconectar este dispositivo (la partida queda guardada en la nube)
          </button>
        )}
      </div>
    </div>
  );
};

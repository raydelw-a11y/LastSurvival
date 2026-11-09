import React, { useState } from 'react';
import { Lock, ShieldAlert, Skull } from 'lucide-react';
import { soundFX } from '../engine/SoundFX';

interface PrivateAccessProps {
  onUnlock: () => void;
  buildTimestamp: string;
}

export const PrivateAccess: React.FC<PrivateAccessProps> = ({ onUnlock, buildTimestamp }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = password.trim().toLowerCase();
    // Accept common project passwords or any non-empty code / quick access
    if (
      clean === '1234' ||
      clean === 'admin' ||
      clean === 'raydel' ||
      clean === 'survival' ||
      clean === 'zombie' ||
      clean === '2026' ||
      clean.length >= 1
    ) {
      setError(false);
      soundFX.unlockAudio();
      soundFX.playCouragePickup();
      onUnlock();
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      soundFX.unlockAudio();
      soundFX.playCouragePickup();
      onUnlock();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Atmospheric apocalyptic background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.12)_0%,rgba(9,9,11,0.95)_70%)]" />

      <div className="relative z-10 max-w-md w-full bg-zinc-900/95 border-2 border-yellow-500/80 rounded-2xl p-7 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 flex items-center justify-center mb-3 shadow-inner">
            <Skull className="w-9 h-9 text-yellow-400" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-950/70 border border-yellow-600/50 px-2.5 py-0.5 rounded-full mb-2">
            Acceso Privado — Zona de Cuarentena
          </span>
          <h1 className="font-pixel text-lg sm:text-xl text-white tracking-tight">
            DEAD AHEAD: LAST SURVIVAL
          </h1>
          <p className="text-xs text-zinc-400 mt-2">
            Introduce la clave de superviviente o presiona <strong className="text-yellow-300">Enter</strong> para abordar el autobús blindado de Bill.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ingresa tu clave (o presiona Enter)..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border-2 border-zinc-700 focus:border-yellow-400 focus:outline-none text-sm text-white placeholder-zinc-500 transition"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Clave inválida. Intenta de nuevo.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-extrabold text-sm uppercase tracking-wider shadow-lg transition transform active:scale-[0.99]"
          >
            Entrar a la Carretera (Enter)
          </button>
        </form>
      </div>

      {/* Global Verification Timestamp in Corner */}
      <div className="fixed bottom-2 right-3 z-[9999] text-[10px] sm:text-[11px] text-yellow-300 font-mono font-semibold bg-black/85 px-2.5 py-0.5 rounded border border-yellow-500/60 shadow-lg pointer-events-none">
        Actualizado: {buildTimestamp}
      </div>
    </div>
  );
};

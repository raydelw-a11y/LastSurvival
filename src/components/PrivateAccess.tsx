import React, { useEffect, useRef, useState } from 'react';
import { Lock, Radio, ShieldAlert } from 'lucide-react';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  renderArmoredBus,
  renderBiomeBackground,
  syncCanvasHiDPI,
} from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';

interface PrivateAccessProps {
  onUnlock: () => void;
  buildTimestamp: string;
  isUpdating?: boolean;
  onCheckUpdate?: () => void;
}

export const PrivateAccess: React.FC<PrivateAccessProps> = ({
  onUnlock,
  buildTimestamp,
  isUpdating,
  onCheckUpdate,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Atmospheric Night Highway Backdrop with Bill's Armored Bus Headlights!
  useEffect(() => {
    let rafId: number;
    let lastDraw = 0;

    const renderBackdrop = (now: number) => {
      rafId = requestAnimationFrame(renderBackdrop);
      if (now - lastDraw < 42) return;
      lastDraw = now;

      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const ctx = syncCanvasHiDPI(canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      if (!ctx) return;
      const t = now * 0.001;

      renderBiomeBackground(ctx, 'graveyard', t, 3);
      renderArmoredBus(ctx, 26, 118, 260, 260, t, 2.0, 0, true, true, 0);
    };

    rafId = requestAnimationFrame(renderBackdrop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = password.trim().toLowerCase();
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
    <div className="relative min-h-screen w-full bg-zinc-950 flex items-center justify-center p-3 sm:p-5 overflow-hidden select-none">
      {/* Live Pixel-Art Night Highway Backdrop */}
      <canvas
        ref={bgCanvasRef}
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        className="pointer-events-none absolute inset-0 w-full h-full object-cover hd-canvas opacity-50"
      />

      {/* Dark Radial Vignette + Subtle CRT Scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.35)_0%,rgba(9,9,11,0.92)_80%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.65) 0px, rgba(0,0,0,0.65) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Military Quarantine Radio Terminal Frame */}
      <div className="relative z-10 max-w-md w-full bg-[#181914]/95 border-2 border-[#a39e74] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        {/* Top Hazard Stripe Bar */}
        <div
          className="h-2.5 w-full border-b border-black"
          style={{
            background:
              'repeating-linear-gradient(-45deg, #eab308, #eab308 10px, #18181b 10px, #18181b 20px)',
          }}
        />

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/90 bg-black/60 border border-[#454231] rounded px-2.5 py-1 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>FREQ 142.8 MHz — CONVOY DE BILL</span>
            </span>
            <span className="text-emerald-400 font-bold">EN LÍNEA</span>
          </div>

          <div className="text-center mb-5">
            <img
              src="./icon-192.png?v=2"
              alt="Last Survival App Icon"
              className="w-16 h-16 mx-auto mb-2.5 rounded-2xl border-2 border-yellow-500/80 shadow-[0_0_24px_rgba(234,179,8,0.45)] object-cover"
            />
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-yellow-300 bg-yellow-950/75 border border-yellow-600/60 px-2.5 py-0.5 rounded mb-2">
              Acceso Privado — Zona de Cuarentena
            </span>
            <h1 className="font-pixel text-base sm:text-lg text-white tracking-tight drop-shadow">
              DEAD AHEAD: LAST SURVIVAL
            </h1>
            <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
              Ingresa tu código de superviviente o presiona{' '}
              <strong className="text-yellow-300">Enter</strong> para encender motores y desplegar el escuadrón.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-300 mb-1">
                Clave de Radio Militar
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Introduce clave o pulsa Enter..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950/95 border-2 border-[#524f3b] focus:border-yellow-400 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono transition"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Código rechazado por el puesto de control.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 border-2 border-black text-zinc-950 font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg transition transform active:scale-[0.99] cursor-pointer"
            >
              Abordar Autobús Blindado (Enter) →
            </button>
          </form>
        </div>
      </div>

      {/* Global Verification Timestamp in Corner (Tap to force instant update check) */}
      <button
        type="button"
        onClick={onCheckUpdate}
        className="fixed bottom-2 right-3 z-[9999] text-[10px] sm:text-[11px] text-yellow-300 font-mono font-semibold bg-black/85 hover:bg-zinc-900 px-2.5 py-0.5 rounded border border-yellow-500/60 shadow-lg cursor-pointer"
        title="Toca para comprobar actualizaciones ahora"
      >
        {isUpdating ? '⚡ Actualizando nueva versión...' : `Actualizado: ${buildTimestamp}`}
      </button>
    </div>
  );
};

import React, { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getMutedSnapshot, soundFX, subscribeMuted } from '../engine/SoundFX';

export function useSoundMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, getMutedSnapshot, getMutedSnapshot);
}

interface MuteButtonProps {
  className?: string;
  /** Compact emoji style for the battle HUD; default is the map toolbar pill. */
  variant?: 'pill' | 'hud';
}

export const MuteButton: React.FC<MuteButtonProps> = ({ className = '', variant = 'pill' }) => {
  const muted = useSoundMuted();
  const label = muted ? 'Activar sonido' : 'Silenciar sonido';

  if (variant === 'hud') {
    return (
      <button
        type="button"
        onClick={() => soundFX.toggleMuted()}
        className={`text-xs px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] cursor-pointer ${className}`}
        title={label}
        aria-label={label}
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => soundFX.toggleMuted()}
      className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
        muted
          ? 'bg-red-950/90 hover:bg-red-900 border-red-500 text-red-200'
          : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-600 text-zinc-300'
      } ${className}`}
      title={label}
      aria-label={label}
      aria-pressed={muted}
    >
      {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      <span className="hidden sm:inline">{muted ? 'Silencio' : 'Sonido'}</span>
    </button>
  );
};

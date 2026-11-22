import React from 'react';
import { Map as MapIcon, Play, Star } from 'lucide-react';
import type { MissionNode } from '../types/game';

interface ContinuePromptProps {
  mission: MissionNode;
  stars: number;
  lastPlayedAt?: number;
  onContinue: () => void;
  onDismiss: () => void;
}

function timeAgo(ts?: number): string | null {
  if (!ts) return null;
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

export const ContinuePrompt: React.FC<ContinuePromptProps> = ({
  mission,
  stars,
  lastPlayedAt,
  onContinue,
  onDismiss,
}) => {
  const ago = timeAgo(lastPlayedAt);
  const [title, ...rest] = mission.name.split(': ');
  const subtitle = rest.join(': ');

  return (
    <div
      className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onDismiss}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onDismiss();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-[#1d1f1a] border-2 border-yellow-500/80 shadow-2xl p-4 text-zinc-100"
      >
        <div className="text-[10px] uppercase tracking-widest text-yellow-400/90 font-bold mb-1">
          ¿Continuar donde te quedaste?
        </div>
        <div className="font-pixel text-sm text-white leading-snug">{title}</div>
        {subtitle && <div className="text-base font-extrabold text-yellow-300 leading-tight">{subtitle}</div>}
        <div className="text-[11px] text-zinc-400 mt-1">{mission.sector}</div>

        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-300">
          <span className="flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`}
              />
            ))}
          </span>
          <span>⛽ {mission.fuelCost}</span>
          <span className="text-zinc-500">{mission.difficulty}</span>
          {ago && <span className="ml-auto text-zinc-500">Última partida {ago}</span>}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            autoFocus
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-b from-yellow-300 to-amber-500 text-zinc-950 font-extrabold text-sm border-2 border-[#181410] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            Continuar (Enter)
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-bold cursor-pointer"
          >
            <MapIcon className="w-4 h-4" />
            Ver mapa
          </button>
        </div>
      </form>
    </div>
  );
};

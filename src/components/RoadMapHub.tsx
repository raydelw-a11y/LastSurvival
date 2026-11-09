import React, { useEffect, useRef, useState } from 'react';
import {
  MISSION_NODES,
  MissionNode,
  PlayerProgress,
  SURVIVOR_CONFIGS,
  SurvivorType,
  ZOMBIE_CONFIGS,
  ZombieType,
} from '../types/game';
import { Hammer, Play, Shield, Skull, Sparkles, Users, Wrench, X } from 'lucide-react';
import { soundFX } from '../engine/SoundFX';

interface RoadMapHubProps {
  progress: PlayerProgress;
  selectedMissionId: number;
  onSelectMission: (id: number) => void;
  onLaunchMission: (mission: MissionNode) => void;
  onUpgradeSurvivor: (type: SurvivorType, cost: number) => void;
  onUpgradeBusStat: (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => void;
  onCollectCache: (cacheId: string, coins: number, fuel: number) => void;
  onRefillFuel: () => void;
}

const ROAD_CACHES = [
  { id: 'cache_1', name: 'Gasolinera Texaco', x: 24, y: 58, coins: 40, fuel: 3 },
  { id: 'cache_2', name: 'Camión Militar', x: 42, y: 54, coins: 65, fuel: 2 },
  { id: 'cache_3', name: 'Ferretería', x: 60, y: 49, coins: 80, fuel: 3 },
  { id: 'cache_4', name: 'Convoy Militar', x: 77, y: 46, coins: 110, fuel: 4 },
];

export const RoadMapHub: React.FC<RoadMapHubProps> = ({
  progress,
  selectedMissionId,
  onSelectMission,
  onLaunchMission,
  onUpgradeSurvivor,
  onUpgradeBusStat,
  onCollectCache,
  onRefillFuel,
}) => {
  const [modalTab, setModalTab] = useState<'none' | 'deck' | 'garage' | 'zombiepedia'>('none');
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedMission =
    MISSION_NODES.find((m) => m.id === selectedMissionId) || MISSION_NODES[0];

  const [busMapPos, setBusMapPos] = useState<{ x: number; y: number }>({
    x: selectedMission.mapX,
    y: selectedMission.mapY,
  });

  useEffect(() => {
    setBusMapPos({ x: selectedMission.mapX, y: selectedMission.mapY });
  }, [selectedMission.mapX, selectedMission.mapY]);

  // Draw the Fullscreen 640x360 Pixel-Art Post-Apocalyptic World Map
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // 1. Base Olive-Brown Sat-Map Terrain
    ctx.fillStyle = '#3b422e';
    ctx.fillRect(0, 0, 640, 360);

    // Topographic elevation patches
    ctx.fillStyle = '#464f37';
    ctx.fillRect(20, 30, 220, 140);
    ctx.fillRect(290, 180, 260, 150);
    ctx.fillStyle = '#323827';
    ctx.fillRect(380, 20, 240, 140);
    ctx.fillRect(40, 210, 210, 130);

    // 2. Muddy Winding River across Sector 2/3
    ctx.strokeStyle = '#243b4a';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(460, -10);
    ctx.bezierCurveTo(430, 110, 490, 220, 440, 370);
    ctx.stroke();

    ctx.strokeStyle = '#314e61';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(460, -10);
    ctx.bezierCurveTo(430, 110, 490, 220, 440, 370);
    ctx.stroke();

    // 3. Pixel Forest Clusters, Farm Barn, Graveyard & Ruined City Blocks
    const drawPine = (px: number, py: number) => {
      ctx.fillStyle = '#1e2618';
      ctx.fillRect(px - 4, py, 8, 6);
      ctx.fillStyle = '#283320';
      ctx.fillRect(px - 6, py - 4, 12, 5);
      ctx.fillRect(px - 4, py - 8, 8, 4);
      ctx.fillStyle = '#38472d';
      ctx.fillRect(px - 2, py - 11, 4, 3);
    };

    for (let i = 0; i < 55; i++) {
      const fx = 24 + ((i * 73) % 580);
      const fy = 36 + ((i * 53) % 290);
      // Keep trees off the main road line
      if (Math.abs(fy - 190) > 35) {
        drawPine(fx, fy);
      }
    }

    // Abandoned Farm Silo & Barn near Mission 2 (32%, 46%)
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(190, 125, 24, 16);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(188, 120, 28, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(218, 116, 10, 25);

    // Graveyard Tombstones near Mission 3 (50%, 64%)
    ctx.fillStyle = '#64748b';
    for (let g = 0; g < 6; g++) {
      ctx.fillRect(305 + g * 9, 252 + (g % 2) * 8, 5, 7);
    }

    // Ruined City Skyscrapers near Mission 4 & 5 (East side)
    const cityBlocks = [
      { x: 510, y: 110, w: 26, h: 38 },
      { x: 542, y: 98, w: 30, h: 50 },
      { x: 525, y: 215, w: 34, h: 42 },
      { x: 565, y: 205, w: 28, h: 48 },
    ];
    cityBlocks.forEach((b) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#52525b';
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 5);
      // Windows
      ctx.fillStyle = '#18181b';
      for (let wy = b.y + 10; wy < b.y + b.h - 6; wy += 7) {
        for (let wx = b.x + 4; wx < b.x + b.w - 6; wx += 7) {
          ctx.fillRect(wx, wy, 4, 4);
        }
      }
    });

    // 4. Winding Two-Lane Asphalt Highway connecting all Mission Nodes
    const pts = MISSION_NODES.map((m) => ({
      x: (m.mapX / 100) * 640,
      y: (m.mapY / 100) * 360,
    }));

    // Road outer dark shoulder
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Road asphalt surface
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 16;
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Yellow dashed highway center line
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Subtle dark vignette around edges of the map
    const grad = ctx.createRadialGradient(320, 180, 150, 320, 180, 360);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);
  }, []);

  // WASD movement on the Road Map
  useEffect(() => {
    if (modalTab !== 'none') return;
    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === 'enter') {
        onLaunchMission(selectedMission);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = setInterval(() => {
      const dx =
        (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const dy =
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
        (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        setBusMapPos((prev) => {
          const nx = Math.max(8, Math.min(92, prev.x + dx * 1.35));
          const ny = Math.max(16, Math.min(86, prev.y + dy * 1.35));

          MISSION_NODES.forEach((node) => {
            if (
              progress.unlockedMissions.includes(node.id) &&
              Math.hypot(node.mapX - nx, node.mapY - ny) < 6.5
            ) {
              onSelectMission(node.id);
            }
          });

          ROAD_CACHES.forEach((cache) => {
            if (
              !progress.discoveredCaches.includes(cache.id) &&
              Math.hypot(cache.x - nx, cache.y - ny) < 6
            ) {
              soundFX.playCouragePickup();
              onCollectCache(cache.id, cache.coins, cache.fuel);
            }
          });

          return { x: nx, y: ny };
        });
      }
    }, 30);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, [
    modalTab,
    onCollectCache,
    onLaunchMission,
    onSelectMission,
    progress.discoveredCaches,
    progress.unlockedMissions,
    selectedMission,
  ]);

  const totalStars = Object.values(progress.missionStars).reduce((a, b) => a + b, 0);

  return (
    <div className="relative w-full h-full bg-[#2b3022] select-none overflow-hidden">
      {/* FULLSCREEN PIXEL-ART ROAD MAP CANVAS */}
      <canvas
        ref={mapCanvasRef}
        width={640}
        height={360}
        className="absolute inset-0 w-full h-full object-fill pixel-canvas"
      />

      {/* ===================================================================== */}
      {/* TOP-LEFT FLOATING DEAD AHEAD BARS: Fuel (Gasoline) & Stars            */}
      {/* ===================================================================== */}
      <div className="absolute top-2 left-3 z-20 flex items-center gap-3">
        {/* Red Fuel Canister + Olive Bar */}
        <div className="relative flex items-center">
          <div className="z-10 -mr-2 w-7 h-7 rounded bg-red-600 border-2 border-[#181410] flex items-center justify-center text-xs shadow">
            ⛽
          </div>
          <div className="min-w-[88px] h-6 bg-[#7a825c]/95 border-2 border-[#23261a] rounded-xs flex items-center justify-between pl-3.5 pr-2 shadow-md">
            <span
              className="font-tactical font-extrabold text-sm text-white leading-none"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {progress.fuel}/{progress.maxFuel}
            </span>
            {progress.fuel < progress.maxFuel && (
              <button
                onClick={onRefillFuel}
                className="ml-1 text-[9px] bg-red-600 hover:bg-red-500 text-white px-1 rounded font-bold"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Gold Star Counter */}
        <div className="relative flex items-center">
          <div className="z-10 -mr-2 w-7 h-7 rounded bg-amber-500 border-2 border-[#181410] flex items-center justify-center text-xs shadow">
            ★
          </div>
          <div className="min-w-[68px] h-6 bg-[#7a825c]/95 border-2 border-[#23261a] rounded-xs flex items-center justify-start pl-3.5 pr-2 shadow-md">
            <span
              className="font-tactical font-extrabold text-sm text-yellow-300 leading-none"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {totalStars}/15
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP-RIGHT FLOATING COINS BAR ("143 🪙")                                */}
      {/* ===================================================================== */}
      <div className="absolute top-2 right-3 z-20 flex items-center">
        <div className="min-w-[92px] h-6 bg-[#7a825c]/95 border-2 border-[#23261a] rounded-xs flex items-center justify-end pr-4 pl-2 shadow-md">
          <span
            className="font-tactical font-extrabold text-sm text-white leading-none"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            {progress.coins}
          </span>
        </div>
        <div className="z-10 -ml-2.5 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-amber-600 border-2 border-[#181410] flex items-center justify-center shadow-md">
          <span className="text-xs leading-none">🪙</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* INTERACTIVE SUPPLY CACHES ON THE HIGHWAY                              */}
      {/* ===================================================================== */}
      {ROAD_CACHES.map((cache) => {
        if (progress.discoveredCaches.includes(cache.id)) return null;
        return (
          <button
            key={cache.id}
            onClick={() => {
              soundFX.playCouragePickup();
              onCollectCache(cache.id, cache.coins, cache.fuel);
            }}
            style={{ left: `${cache.x}%`, top: `${cache.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 px-1.5 py-0.5 rounded bg-amber-950/95 border border-yellow-400 text-[9px] font-bold text-yellow-200 hover:scale-110 transition shadow-lg flex items-center gap-1 animate-bounce"
            title={`${cache.name}: Toca para saquear +${cache.coins} monedas`}
          >
            <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            <span>📦+{cache.coins}</span>
          </button>
        );
      })}

      {/* ===================================================================== */}
      {/* MISSION PINS (1..5) ON THE HIGHWAY                                    */}
      {/* ===================================================================== */}
      {MISSION_NODES.map((node) => {
        const unlocked = progress.unlockedMissions.includes(node.id);
        const stars = progress.missionStars[node.id] || 0;
        const isSelected = selectedMission.id === node.id;

        return (
          <button
            key={node.id}
            onClick={() => {
              if (unlocked) {
                soundFX.playUnitSpawn();
                onSelectMission(node.id);
              }
            }}
            style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center transition ${
              unlocked ? 'cursor-pointer hover:scale-110' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl border-2 flex items-center justify-center font-pixel text-xs shadow-xl ${
                isSelected
                  ? 'bg-yellow-400 text-zinc-950 border-white ring-4 ring-yellow-400/50 scale-110'
                  : unlocked
                  ? 'bg-[#3b3829] text-white border-yellow-500'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-700'
              }`}
            >
              {node.id}
            </div>
            <div className="flex items-center gap-0.5 mt-0.5 bg-black/85 px-1 rounded border border-zinc-700">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`text-[8px] leading-tight ${
                    s <= stars ? 'text-yellow-400' : 'text-zinc-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </button>
        );
      })}

      {/* PIXEL YELLOW SCHOOL BUS MARKER ON ROAD */}
      <div
        style={{ left: `${busMapPos.x}%`, top: `${busMapPos.y}%` }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-[125%] z-30 transition-all duration-150"
      >
        <div className="px-1.5 py-0.5 rounded bg-yellow-400 border-2 border-[#181410] text-zinc-950 font-pixel text-[8px] shadow-xl flex items-center gap-1">
          <span>🚌</span>
          <span>BILL</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM-LEFT FLOATING BUTTONS: Tropas, Garaje & Zombiepedia            */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setModalTab('deck')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-[#787459] text-xs font-extrabold text-white shadow-lg"
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>Tropas</span>
        </button>

        <button
          onClick={() => setModalTab('garage')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-[#787459] text-xs font-extrabold text-white shadow-lg"
        >
          <Wrench className="w-4 h-4 text-yellow-400" />
          <span>Garaje Bus</span>
        </button>

        <button
          onClick={() => setModalTab('zombiepedia')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-[#787459] text-xs font-extrabold text-white shadow-lg"
        >
          <Skull className="w-4 h-4 text-red-400" />
          <span>Zombis</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM-RIGHT FLOATING COMPACT MISSION LAUNCH CARD                     */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 right-3 z-20 w-64 sm:w-72 bg-[#26241b]/95 border-2 border-[#787459] rounded-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase text-yellow-400">
            {selectedMission.sector}
          </span>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
            {selectedMission.difficulty}
          </span>
        </div>

        <div className="font-pixel text-xs text-white mb-1 truncate">{selectedMission.name}</div>
        <p className="text-[11px] text-zinc-300 leading-tight mb-2.5 line-clamp-2">
          {selectedMission.description}
        </p>

        <div className="flex items-center justify-between text-[10px] bg-black/50 px-2.5 py-1.5 rounded border border-zinc-800 mb-2.5">
          <span>
            🚧 <strong className="text-red-400">{selectedMission.barricadeHp} HP</strong>
          </span>
          <span>
            Recompensa: <strong className="text-yellow-400">+{selectedMission.coinsReward} 🪙</strong>
          </span>
        </div>

        <button
          onClick={() => onLaunchMission(selectedMission)}
          className="w-full py-2 rounded-lg bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 border-2 border-[#181410] text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5"
        >
          <Play className="w-4 h-4 fill-zinc-950" />
          <span>¡ASALTAR! (-{selectedMission.fuelCost} ⛽)</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* COMPACT HORIZONTAL MODAL DRAWERS (Tropas / Garaje / Zombis)           */}
      {/* ===================================================================== */}
      {modalTab !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-4xl max-h-[88dvh] bg-[#26241b] border-2 border-[#787459] rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1c1a14] border-b border-[#4a4737]">
              <h3 className="font-pixel text-xs text-yellow-400">
                {modalTab === 'deck'
                  ? 'MAZO DE SUPERVIVIENTES — MEJORAR NIVEL'
                  : modalTab === 'garage'
                  ? 'GARAJE DE BILL — MEJORAR AUTOBÚS ESCOLAR'
                  : 'ZOMBIEPEDIA — AMENAZAS'}
              </h3>
              <button
                onClick={() => setModalTab('none')}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {modalTab === 'deck' &&
                (Object.keys(SURVIVOR_CONFIGS) as SurvivorType[]).map((sType) => {
                  const cfg = SURVIVOR_CONFIGS[sType];
                  const lvl = progress.unitLevels[sType] || 5;
                  const cost = lvl * 35;
                  const canAfford = progress.coins >= cost;
                  const mult = 1 + (lvl - 1) * 0.12;

                  return (
                    <div
                      key={sType}
                      className="bg-[#1c1a14] border border-[#4a4737] rounded-lg p-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="bg-sky-600 text-white px-1.5 rounded font-bold">
                            💧 {cfg.cost}
                          </span>
                          <span className="text-yellow-400 font-bold">Nv.{lvl}</span>
                        </div>
                        <div className="font-bold text-xs text-white">{cfg.name}</div>
                        <div className="text-[10px] text-zinc-400 mb-2">
                          ❤️ {Math.round(cfg.baseHp * mult)} · ⚔️ {Math.round(cfg.baseDamage * mult)}
                        </div>
                      </div>
                      <button
                        onClick={() => onUpgradeSurvivor(sType, cost)}
                        disabled={!canAfford}
                        className={`w-full py-1.5 rounded text-[10px] font-extrabold uppercase ${
                          canAfford
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        Subir ({cost} 🪙)
                      </button>
                    </div>
                  );
                })}

              {modalTab === 'garage' && (
                <>
                  <div className="bg-[#1c1a14] border border-[#4a4737] rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs mb-1">
                        <Shield className="w-4 h-4" />
                        <span>Chasis (+50 HP)</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mb-2">
                        Salud actual del bus: {200 + progress.busHpBonus} HP
                      </p>
                    </div>
                    <button
                      onClick={() => onUpgradeBusStat('hp', 75)}
                      disabled={progress.coins < 75}
                      className="py-1.5 rounded bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase"
                    >
                      Mejorar (75 🪙)
                    </button>
                  </div>

                  <div className="bg-[#1c1a14] border border-[#4a4737] rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                        <Hammer className="w-4 h-4" />
                        <span>Rifle de Bill (+8 Daño)</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mb-2">
                        Bono actual: +{progress.billDamageBonus} daño
                      </p>
                    </div>
                    <button
                      onClick={() => onUpgradeBusStat('bill', 80)}
                      disabled={progress.coins < 80}
                      className="py-1.5 rounded bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase"
                    >
                      Mejorar (80 🪙)
                    </button>
                  </div>

                  <div className="bg-[#1c1a14] border border-[#4a4737] rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs mb-1">
                        <Wrench className="w-4 h-4" />
                        <span>Parachoques con Púas</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mb-2">
                        Devuelve 12 de daño a los zombis que golpeen el autobús.
                      </p>
                    </div>
                    <button
                      onClick={() => onUpgradeBusStat('bumper', 110)}
                      disabled={progress.spikedBumper || progress.coins < 110}
                      className="py-1.5 rounded bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase"
                    >
                      {progress.spikedBumper ? '✓ Instalado' : 'Instalar (110 🪙)'}
                    </button>
                  </div>
                </>
              )}

              {modalTab === 'zombiepedia' &&
                (Object.keys(ZOMBIE_CONFIGS) as ZombieType[]).map((zType) => {
                  const z = ZOMBIE_CONFIGS[zType];
                  return (
                    <div
                      key={zType}
                      className="bg-[#1c1a14] border border-[#4a4737] rounded-lg p-2.5"
                    >
                      <div className="font-bold text-xs text-red-400 mb-0.5">{z.name}</div>
                      <p className="text-[10px] text-zinc-400 mb-1.5">{z.description}</p>
                      <div className="text-[10px] text-zinc-300">
                        ❤️ {z.baseHp} HP · ⚔️ {z.baseDamage} Daño
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

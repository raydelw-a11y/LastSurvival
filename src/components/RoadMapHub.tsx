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
import {
  Award,
  Compass,
  Hammer,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  Shield,
  Skull,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { soundFX } from '../engine/SoundFX';

interface RoadMapHubProps {
  progress: PlayerProgress;
  selectedMissionId: number;
  onSelectMission: (id: number) => void;
  onLaunchMission: (mission: MissionNode) => void;
  onUpgradeSurvivor: (type: SurvivorType, cost: number) => void;
  onUpgradeBusStat: (kind: 'hp' | 'bill' | 'bumper' | 'armor' | 'commander_level', cost: number) => void;
  onCollectCache: (cacheId: string, coins: number, fuel: number) => void;
  onRefillFuel: () => void;
}

const WORLD_W = 1800;
const WORLD_H = 640;

const ROAD_CACHES = [
  { id: 'cache_1', name: 'Gasolinera Texaco', x: 11, y: 52, coins: 45, fuel: 3 },
  { id: 'cache_2', name: 'Granero Abandonado', x: 20, y: 56, coins: 65, fuel: 2 },
  { id: 'cache_3', name: 'Camión Suministros', x: 29, y: 48, coins: 80, fuel: 3 },
  { id: 'cache_4', name: 'Torre Petrolera', x: 39, y: 50, coins: 95, fuel: 3 },
  { id: 'cache_5', name: 'Control Carretera 66', x: 48, y: 54, coins: 115, fuel: 4 },
  { id: 'cache_6', name: 'Farmacia Saqueada', x: 57, y: 58, coins: 135, fuel: 3 },
  { id: 'cache_7', name: 'Furgón Policial SWAT', x: 66, y: 48, coins: 160, fuel: 4 },
  { id: 'cache_8', name: 'Convoy del Ejército', x: 81, y: 46, coins: 195, fuel: 5 },
  { id: 'cache_9', name: 'Hangar Secreto', x: 92, y: 55, coins: 240, fuel: 5 },
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
  const [zoomedOut, setZoomedOut] = useState<boolean>(false);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ isDown: boolean; startX: number; startY: number; scrollL: number; scrollT: number }>({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollL: 0,
    scrollT: 0,
  });

  const selectedMission =
    MISSION_NODES.find((m) => m.id === selectedMissionId) || MISSION_NODES[0];

  const [busMapPos, setBusMapPos] = useState<{ x: number; y: number }>({
    x: selectedMission.mapX,
    y: selectedMission.mapY,
  });

  useEffect(() => {
    setBusMapPos({ x: selectedMission.mapX, y: selectedMission.mapY });
    // Smoothly center viewport around selected mission node
    const container = scrollContainerRef.current;
    if (container && !zoomedOut) {
      const targetLeft = (selectedMission.mapX / 100) * WORLD_W - container.clientWidth / 2;
      const targetTop = (selectedMission.mapY / 100) * WORLD_H - container.clientHeight / 2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }
  }, [selectedMission.mapX, selectedMission.mapY, zoomedOut]);

  // Draw the Enlarged 1800x640 Multi-Region Pixel-Art Post-Apocalyptic World Map
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // 1. Base Regional Biomes across the 1800x640 Continent
    // Sector 1 (0..450): Southern Pine Forest & Farmland
    ctx.fillStyle = '#38422b';
    ctx.fillRect(0, 0, 480, WORLD_H);
    // Sector 2 (450..920): Route 66 Arid Canyon & Oil Refinery
    ctx.fillStyle = '#5c4932';
    ctx.fillRect(460, 0, 460, WORLD_H);
    // Sector 3 (920..1360): Dead City Asphalt & Suburbs
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(920, 0, 440, WORLD_H);
    // Sector 4 (1360..1800): Military Quarantine Zone & Zero Lab
    ctx.fillStyle = '#2d362e';
    ctx.fillRect(1360, 0, 440, WORLD_H);

    // Topographic elevation patches & craters
    for (let i = 0; i < 36; i++) {
      const px = (i * 137) % (WORLD_W - 160);
      const py = (i * 89) % (WORLD_H - 120);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(px, py, 120 + (i % 5) * 30, 70 + (i % 4) * 25);
    }

    // Sector Divider Dashed Borders & Labels
    const sectors = [
      { x: 20, label: 'SECTOR 1: BOSQUE SUR (NV. 1-2)' },
      { x: 485, label: 'SECTOR 2: AUTOPISTA 66 & REFINERÍA (NV. 3-4)' },
      { x: 940, label: 'SECTOR 3: CIUDAD MUERTA (NV. 5-6)' },
      { x: 1380, label: 'SECTOR 4: ZONA MILITAR & REACTOR CERO (NV. 7+)' },
    ];
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    [465, 920, 1360].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, WORLD_H);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    sectors.forEach((s) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(s.x, 54, 310, 22);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(s.label, s.x + 8, 69);
    });

    // 2. Two Winding Rivers (Sector 2 Canyon River & Sector 3 Quarantine Canal)
    [880, 1340].forEach((rx) => {
      ctx.strokeStyle = '#1e3a4c';
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(rx, -10);
      ctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
      ctx.stroke();

      ctx.strokeStyle = '#2d556e';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(rx, -10);
      ctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
      ctx.stroke();
    });

    // 3. Detailed Landmarks across the 4 Sectors
    const drawPine = (px: number, py: number, scale = 1) => {
      ctx.fillStyle = '#1b2416';
      ctx.fillRect(px - 5 * scale, py, 10 * scale, 8 * scale);
      ctx.fillStyle = '#283620';
      ctx.fillRect(px - 8 * scale, py - 6 * scale, 16 * scale, 7 * scale);
      ctx.fillRect(px - 6 * scale, py - 12 * scale, 12 * scale, 6 * scale);
      ctx.fillStyle = '#3a4d2e';
      ctx.fillRect(px - 3 * scale, py - 16 * scale, 6 * scale, 5 * scale);
    };

    for (let i = 0; i < 160; i++) {
      const fx = 25 + ((i * 97) % (WORLD_W - 50));
      const fy = 85 + ((i * 71) % (WORLD_H - 130));
      if (Math.abs(fy - 320) > 65) {
        drawPine(fx, fy, 1.15);
      }
    }

    // Sector 1: Red Farm Barns & Silos + Graveyard
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(240, 180, 44, 30);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(236, 170, 52, 12);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(290, 162, 16, 48);

    // Sector 2: Oil Derricks & Refinery Tanks with Fire Plumes
    [640, 740, 810].forEach((ox, idx) => {
      const oy = 360 + (idx % 2) * 80;
      ctx.fillStyle = '#27272a';
      ctx.fillRect(ox, oy - 36, 22, 36);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(ox + 4, oy - 48, 14, 12);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(ox + 7, oy - 54, 8, 7);
    });

    // Sector 3: Ruined City Skyscrapers & Hospital
    const cityBlocks = [
      { x: 1020, y: 140, w: 46, h: 74 },
      { x: 1080, y: 120, w: 54, h: 92 },
      { x: 1160, y: 150, w: 48, h: 68 },
      { x: 1050, y: 410, w: 58, h: 82 },
      { x: 1130, y: 430, w: 50, h: 76 },
      { x: 1240, y: 170, w: 52, h: 86 },
    ];
    cityBlocks.forEach((b) => {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#52525b';
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 8);
      ctx.fillStyle = '#18181b';
      for (let wy = b.y + 16; wy < b.y + b.h - 8; wy += 11) {
        for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 11) {
          ctx.fillRect(wx, wy, 6, 6);
        }
      }
    });

    // Sector 4: Military Bunkers, Helipad & Zero Reactor Dome
    ctx.fillStyle = '#3f4739';
    ctx.fillRect(1470, 140, 74, 46);
    ctx.fillStyle = '#eab308';
    ctx.strokeRect(1580, 420, 64, 64);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('H', 1604, 460);

    // Reactor Dome near Mission 12
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(1710, 260, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(1710, 260, 18, 0, Math.PI * 2);
    ctx.fill();

    // 4. Winding Two-Lane Interstate Highway connecting all 12 Mission Nodes
    const pts = MISSION_NODES.map((m) => ({
      x: (m.mapX / 100) * WORLD_W,
      y: (m.mapY / 100) * WORLD_H,
    }));

    // Road outer dark shoulder
    ctx.strokeStyle = '#141417';
    ctx.lineWidth = 34;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Road asphalt surface
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 24;
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Yellow dashed highway center line
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  // WASD movement on the Enlarged Road Map
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
          const nx = Math.max(4, Math.min(97, prev.x + dx * 0.9));
          const ny = Math.max(14, Math.min(88, prev.y + dy * 1.2));

          MISSION_NODES.forEach((node) => {
            if (
              progress.unlockedMissions.includes(node.id) &&
              Math.hypot(node.mapX - nx, node.mapY - ny) < 4.5
            ) {
              onSelectMission(node.id);
            }
          });

          ROAD_CACHES.forEach((cache) => {
            if (
              !progress.discoveredCaches.includes(cache.id) &&
              Math.hypot(cache.x - nx, cache.y - ny) < 4.5
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

  const jumpToSector = (sectorIdx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setZoomedOut(false);
    const leftPositions = [0, 440, 890, 1320];
    container.scrollTo({
      left: leftPositions[sectorIdx] || 0,
      top: 120,
      behavior: 'smooth',
    });
  };

  const totalStars = Object.values(progress.missionStars).reduce((a, b) => a + b, 0);
  const maxStars = MISSION_NODES.length * 3;
  const commanderLvl = progress.busLevel || 1;
  const commanderLevelUpCost = commanderLvl * 95;

  return (
    <div className="relative w-full h-full bg-[#252a1e] select-none overflow-hidden">
      {/* ===================================================================== */}
      {/* SCROLLABLE / PANNABLE GIANT 1800x640 CAMPAIGN WORLD MAP               */}
      {/* ===================================================================== */}
      <div
        ref={scrollContainerRef}
        onPointerDown={(e) => {
          const el = scrollContainerRef.current;
          if (!el || zoomedOut) return;
          dragStateRef.current = {
            isDown: true,
            startX: e.clientX,
            startY: e.clientY,
            scrollL: el.scrollLeft,
            scrollT: el.scrollTop,
          };
        }}
        onPointerMove={(e) => {
          const st = dragStateRef.current;
          const el = scrollContainerRef.current;
          if (!st.isDown || !el || zoomedOut) return;
          el.scrollLeft = st.scrollL - (e.clientX - st.startX);
          el.scrollTop = st.scrollT - (e.clientY - st.startY);
        }}
        onPointerUp={() => {
          dragStateRef.current.isDown = false;
        }}
        onPointerLeave={() => {
          dragStateRef.current.isDown = false;
        }}
        className={`w-full h-full ${
          zoomedOut ? 'overflow-hidden' : 'overflow-auto cursor-grab active:cursor-grabbing'
        }`}
      >
        <div
          style={
            zoomedOut
              ? { width: '100%', height: '100%', position: 'relative' }
              : { width: `${WORLD_W}px`, height: `${WORLD_H}px`, position: 'relative' }
          }
        >
          <canvas
            ref={mapCanvasRef}
            width={WORLD_W}
            height={WORLD_H}
            className="w-full h-full object-fill pixel-canvas pointer-events-none"
          />

          {/* INTERACTIVE SUPPLY CACHES ON THE HIGHWAY */}
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
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 rounded bg-amber-950/95 border border-yellow-400 text-[10px] font-bold text-yellow-200 hover:scale-110 transition shadow-lg flex items-center gap-1 animate-bounce"
                title={`${cache.name}: Toca para saquear +${cache.coins} monedas`}
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>📦+{cache.coins}</span>
              </button>
            );
          })}

          {/* 12 MISSION PINS ON THE INTERSTATE HIGHWAY */}
          {MISSION_NODES.map((node) => {
            const unlocked = progress.unlockedMissions.includes(node.id);
            const stars = progress.missionStars[node.id] || 0;
            const isSelected = selectedMission.id === node.id;

            return (
              <button
                key={node.id}
                onClick={() => {
                  soundFX.playUnitSpawn();
                  onSelectMission(node.id);
                }}
                style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center transition ${
                  unlocked ? 'cursor-pointer hover:scale-110' : 'opacity-75 hover:scale-105'
                }`}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-pixel text-xs shadow-xl ${
                    isSelected
                      ? 'bg-yellow-400 text-zinc-950 border-white ring-4 ring-yellow-400/50 scale-110'
                      : unlocked
                      ? 'bg-[#3b3829] text-white border-yellow-500'
                      : 'bg-zinc-900/95 text-zinc-400 border-zinc-600'
                  }`}
                >
                  {unlocked ? node.id : `🔒${node.id}`}
                </div>
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-bold text-zinc-200 whitespace-nowrap border border-zinc-700">
                  {node.name.replace(/^Misión \d+:\s*/, '')}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5 bg-black/85 px-1 rounded border border-zinc-700">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className={`text-[9px] leading-tight ${
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
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[145%] z-30 transition-all duration-150"
          >
            <div className="px-2 py-0.5 rounded bg-yellow-400 border-2 border-[#181410] text-zinc-950 font-pixel text-[9px] shadow-xl flex items-center gap-1">
              <span>🚌</span>
              <span>BILL (NV.{commanderLvl})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP-LEFT FLOATING DEAD AHEAD BARS: Fuel, Stars & Commander Level      */}
      {/* ===================================================================== */}
      <div className="absolute top-2 left-3 z-20 flex items-center gap-2.5 flex-wrap">
        {/* Red Fuel Canister */}
        <div className="relative flex items-center">
          <div className="z-10 -mr-2 w-7 h-7 rounded bg-red-600 border-2 border-[#181410] flex items-center justify-center text-xs shadow">
            ⛽
          </div>
          <div className="min-w-[82px] h-6 bg-[#7a825c]/95 border-2 border-[#23261a] rounded-xs flex items-center justify-between pl-3.5 pr-2 shadow-md">
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
              {totalStars}/{maxStars}
            </span>
          </div>
        </div>

        {/* Commander Level Badge (Unlocks Sniper, Dog, Turret, Drone, etc.) */}
        <button
          onClick={() => setModalTab('deck')}
          className="px-2.5 h-6 rounded bg-sky-900/95 hover:bg-sky-800 border-2 border-sky-400 flex items-center gap-1.5 text-xs font-extrabold text-white shadow-md cursor-pointer"
          title="Subir Nivel de Comandante para desbloquear Perro, Francotirador, Torreta y Dron"
        >
          <Award className="w-3.5 h-3.5 text-yellow-300" />
          <span>NIVEL {commanderLvl}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TOP-CENTER SECTOR NAVIGATION & MAP ZOOM BAR                           */}
      {/* ===================================================================== */}
      <div className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 z-20 items-center gap-1 bg-zinc-950/85 border border-zinc-700 px-2 py-1 rounded-lg shadow-xl">
        <Compass className="w-3.5 h-3.5 text-yellow-400 mr-1" />
        {['S1: Bosque', 'S2: Ruta 66', 'S3: Ciudad', 'S4: Militar'].map((label, idx) => (
          <button
            key={label}
            onClick={() => jumpToSector(idx)}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-yellow-500 hover:text-zinc-950 text-[10px] font-bold text-zinc-200 transition"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setZoomedOut((z) => !z)}
          className="ml-1 px-2 py-0.5 rounded bg-emerald-900/90 hover:bg-emerald-700 border border-emerald-500 text-[10px] font-bold text-emerald-200 flex items-center gap-1"
          title="Alternar Vista Global del Mapa Completo / Zoom Detallado"
        >
          {zoomedOut ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          <span>{zoomedOut ? 'Acercar' : 'Mapa Completo'}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TOP-RIGHT FLOATING COINS BAR                                          */}
      {/* ===================================================================== */}
      <div className="absolute top-2 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setZoomedOut((z) => !z)}
          className="md:hidden px-2 py-1 rounded bg-zinc-900/90 border border-zinc-600 text-[10px] font-bold text-yellow-300"
        >
          {zoomedOut ? '🔍 Acercar' : '🗺️ Ver Todo'}
        </button>
        <div className="relative flex items-center">
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
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM-LEFT FLOATING BUTTONS: Tropas (11), Garaje & Zombiepedia       */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setModalTab('deck')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-yellow-400 text-xs font-extrabold text-white shadow-lg"
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>Unidades (11)</span>
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
        <p className="text-[11px] text-zinc-300 leading-tight mb-2 line-clamp-2">
          {selectedMission.description}
        </p>

        <div className="flex items-center justify-between text-[10px] bg-black/50 px-2.5 py-1.5 rounded border border-zinc-800 mb-2">
          <span>
            🚧 <strong className="text-red-400">{selectedMission.barricadeHp} HP</strong>
          </span>
          <span>
            Recompensa: <strong className="text-yellow-400">+{selectedMission.coinsReward} 🪙</strong>
          </span>
        </div>

        <button
          onClick={() => onLaunchMission(selectedMission)}
          className="w-full py-2 rounded-lg bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 border-2 border-[#181410] text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-zinc-950" />
          <span>¡ASALTAR! (-{selectedMission.fuelCost} ⛽)</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* COMPACT HORIZONTAL MODAL DRAWERS (Unidades / Garaje / Zombis)         */}
      {/* ===================================================================== */}
      {modalTab !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-5xl max-h-[90dvh] bg-[#26241b] border-2 border-[#787459] rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1c1a14] border-b border-[#4a4737]">
              <div className="flex items-center gap-3">
                <h3 className="font-pixel text-xs text-yellow-400">
                  {modalTab === 'deck'
                    ? `ARSENAL DE UNIDADES — NIVEL DE COMANDANTE ${commanderLvl}`
                    : modalTab === 'garage'
                    ? 'GARAJE DE BILL — MEJORAR AUTOBÚS ESCOLAR'
                    : 'ZOMBIEPEDIA — AMENAZAS'}
                </h3>
                {modalTab === 'deck' && commanderLvl < 7 && (
                  <button
                    onClick={() => onUpgradeBusStat('commander_level', commanderLevelUpCost)}
                    disabled={progress.coins < commanderLevelUpCost}
                    className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase shadow"
                  >
                    ⬆ Subir a Nivel {commanderLvl + 1} ({commanderLevelUpCost} 🪙)
                  </button>
                )}
              </div>
              <button
                onClick={() => setModalTab('none')}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {modalTab === 'deck' &&
                (Object.keys(SURVIVOR_CONFIGS) as SurvivorType[]).map((sType) => {
                  const cfg = SURVIVOR_CONFIGS[sType];
                  const isUnlocked = commanderLvl >= cfg.unlockLevel;
                  const lvl = progress.unitLevels[sType] || 1;
                  const cost = lvl * 35;
                  const canAfford = isUnlocked && progress.coins >= cost;
                  const mult = 1 + (lvl - 1) * 0.14;

                  return (
                    <div
                      key={sType}
                      className={`border rounded-lg p-2.5 flex flex-col justify-between ${
                        isUnlocked
                          ? 'bg-[#1c1a14] border-[#575340]'
                          : 'bg-zinc-950/90 border-zinc-800 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="bg-sky-700 text-white px-1.5 rounded font-bold">
                            💧 {cfg.cost}
                          </span>
                          {isUnlocked ? (
                            <span className="text-yellow-400 font-bold">Nv.{lvl}</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                              <Lock className="w-3 h-3" /> Desbl. Nv.{cfg.unlockLevel}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-white">{cfg.name}</div>
                        <div className="text-[10px] text-amber-300/90 font-semibold mb-1">
                          {cfg.roleTitle}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight mb-2">
                          {cfg.description}
                        </p>
                        <div className="text-[10px] text-zinc-300 mb-2">
                          ❤️ {Math.round(cfg.baseHp * mult)} · ⚔️ {Math.round(cfg.baseDamage * mult)}
                        </div>
                      </div>
                      {isUnlocked ? (
                        <button
                          onClick={() => onUpgradeSurvivor(sType, cost)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded text-[10px] font-extrabold uppercase ${
                            canAfford
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          Mejorar Tropas ({cost} 🪙)
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpgradeBusStat('commander_level', commanderLevelUpCost)}
                          disabled={progress.coins < commanderLevelUpCost}
                          className="w-full py-1.5 rounded bg-amber-600/90 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase"
                        >
                          Subir a Nv.{cfg.unlockLevel} para usar
                        </button>
                      )}
                    </div>
                  );
                })}

              {modalTab === 'garage' && (
                <>
                  <div className="bg-[#1c1a14] border border-sky-500/60 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs mb-1">
                        <Award className="w-4 h-4" />
                        <span>Rango Comandante (Nv.{commanderLvl})</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mb-2">
                        Subir de nivel desbloquea Perro K-9 (Nv.2), Francotiradora (Nv.3), Lanzallamas (Nv.4), Torreta (Nv.5), Dron (Nv.6) y Juggernaut (Nv.7).
                      </p>
                    </div>
                    <button
                      onClick={() => onUpgradeBusStat('commander_level', commanderLevelUpCost)}
                      disabled={progress.coins < commanderLevelUpCost || commanderLvl >= 10}
                      className="py-1.5 rounded bg-sky-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase"
                    >
                      {commanderLvl >= 10
                        ? 'Nivel Máximo'
                        : `Subir a Nv.${commanderLvl + 1} (${commanderLevelUpCost} 🪙)`}
                    </button>
                  </div>

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

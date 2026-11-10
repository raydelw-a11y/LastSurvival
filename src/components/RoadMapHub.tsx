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
import { renderArmoredBus, renderCharacterPreview } from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';

interface RoadMapHubProps {
  progress: PlayerProgress;
  selectedMissionId: number;
  onSelectMission: (id: number) => void;
  onLaunchMission: (mission: MissionNode) => void;
  onUpgradeSurvivor: (type: SurvivorType, cost: number) => void;
  onUpgradeBusStat: (
    kind: 'hp' | 'bill' | 'bumper' | 'armor' | 'commander_level',
    cost: number
  ) => void;
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
  const [weldBurstKey, setWeldBurstKey] = useState<number>(0);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bakedMapRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    scrollL: number;
    scrollT: number;
  }>({
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

  // Bake static 1800x640 Continent once + Animate Live Weather, Rivers, Refinery Flames & Reactor!
  useEffect(() => {
    if (!bakedMapRef.current) {
      const off = document.createElement('canvas');
      off.width = WORLD_W;
      off.height = WORLD_H;
      const bctx = off.getContext('2d')!;

      // 1. Regional Biome Grounds with Dithered Transitions
      bctx.fillStyle = '#364129';
      bctx.fillRect(0, 0, 485, WORLD_H);
      bctx.fillStyle = '#5c4730';
      bctx.fillRect(465, 0, 465, WORLD_H);
      bctx.fillStyle = '#363940';
      bctx.fillRect(920, 0, 445, WORLD_H);
      bctx.fillStyle = '#29332b';
      bctx.fillRect(1360, 0, 440, WORLD_H);

      // Bayer-style transition strips between sectors
      [
        { x: 455, col: '#5c4730' },
        { x: 912, col: '#363940' },
        { x: 1352, col: '#29332b' },
      ].forEach(({ x, col }) => {
        bctx.fillStyle = col;
        for (let dy = 0; dy < WORLD_H; dy += 8) {
          bctx.fillRect(x + ((dy / 8) % 2) * 8, dy, 8, 6);
          bctx.fillRect(x + 14 - ((dy / 8) % 2) * 6, dy + 2, 6, 4);
        }
      });

      // Topographic contour plateaus & craters
      for (let i = 0; i < 44; i++) {
        const px = (i * 137) % (WORLD_W - 160);
        const py = (i * 89) % (WORLD_H - 120);
        bctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.13)';
        bctx.fillRect(px, py, 110 + (i % 5) * 28, 64 + (i % 4) * 24);
      }

      // Sector Borders & Stencil Headers
      const sectors = [
        { x: 20, label: 'SECTOR 1: BOSQUE SUR (NV. 1-2)' },
        { x: 485, label: 'SECTOR 2: AUTOPISTA 66 & REFINERÍA (NV. 3-4)' },
        { x: 940, label: 'SECTOR 3: CIUDAD MUERTA (NV. 5-6)' },
        { x: 1380, label: 'SECTOR 4: ZONA MILITAR & REACTOR CERO (NV. 7+)' },
      ];
      bctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
      bctx.lineWidth = 2;
      bctx.setLineDash([8, 8]);
      [468, 920, 1360].forEach((sx) => {
        bctx.beginPath();
        bctx.moveTo(sx, 0);
        bctx.lineTo(sx, WORLD_H);
        bctx.stroke();
      });
      bctx.setLineDash([]);

      sectors.forEach((s) => {
        bctx.fillStyle = 'rgba(12, 14, 10, 0.72)';
        bctx.fillRect(s.x, 52, 326, 22);
        bctx.strokeStyle = '#787459';
        bctx.lineWidth = 1;
        bctx.strokeRect(s.x, 52, 326, 22);
        bctx.fillStyle = '#fde047';
        bctx.font = 'bold 11px monospace';
        bctx.fillText(s.label, s.x + 8, 67);
      });

      // 2. Two Winding Rivers with Sandbanks & Steel Truss Bridges
      [880, 1340].forEach((rx) => {
        bctx.strokeStyle = '#78684a';
        bctx.lineWidth = 42;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();

        bctx.strokeStyle = '#163040';
        bctx.lineWidth = 34;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();

        bctx.strokeStyle = '#254d66';
        bctx.lineWidth = 18;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();
      });

      // 3. Detailed Pines, Barns, Graveyard, Refinery Derricks, Skyscrapers & Military Base
      const drawPine = (px: number, py: number, scale = 1) => {
        bctx.fillStyle = 'rgba(0,0,0,0.32)';
        bctx.fillRect(px - 6 * scale, py + 5 * scale, 14 * scale, 4 * scale);
        bctx.fillStyle = '#1b2416';
        bctx.fillRect(px - 5 * scale, py, 10 * scale, 8 * scale);
        bctx.fillStyle = '#283620';
        bctx.fillRect(px - 8 * scale, py - 6 * scale, 16 * scale, 7 * scale);
        bctx.fillRect(px - 6 * scale, py - 12 * scale, 12 * scale, 6 * scale);
        bctx.fillStyle = '#3f5432';
        bctx.fillRect(px - 3 * scale, py - 16 * scale, 6 * scale, 5 * scale);
      };

      for (let i = 0; i < 165; i++) {
        const fx = 25 + ((i * 97) % (WORLD_W - 50));
        const fy = 85 + ((i * 71) % (WORLD_H - 130));
        if (Math.abs(fy - 320) > 65) {
          drawPine(fx, fy, 1.15);
        }
      }

      // Sector 1: Red Farm Barn + Grain Silo + Blackwater Cemetery Fence
      bctx.fillStyle = '#7c2d12';
      bctx.fillRect(240, 180, 46, 30);
      bctx.fillStyle = '#b91c1c';
      bctx.fillRect(236, 168, 54, 14);
      bctx.fillStyle = '#f8fafc';
      bctx.strokeRect(254, 190, 16, 18);
      bctx.fillStyle = '#cbd5e1';
      bctx.fillRect(292, 160, 16, 50);
      bctx.fillStyle = '#64748b';
      bctx.fillRect(290, 154, 20, 8);

      // Sector 2: Oil Derricks & Refinery Storage Tanks
      [640, 740, 810].forEach((ox, idx) => {
        const oy = 360 + (idx % 2) * 80;
        bctx.fillStyle = '#18181b';
        bctx.fillRect(ox - 2, oy - 38, 26, 40);
        bctx.fillStyle = '#3f3f46';
        bctx.fillRect(ox, oy - 36, 22, 36);
        bctx.fillStyle = '#dc2626';
        bctx.fillRect(ox, oy - 28, 22, 4);
      });

      // Sector 3: Ruined City Skyscrapers & Hospital Cross
      const cityBlocks = [
        { x: 1020, y: 140, w: 46, h: 74 },
        { x: 1080, y: 120, w: 54, h: 92 },
        { x: 1160, y: 150, w: 48, h: 68 },
        { x: 1050, y: 410, w: 58, h: 82 },
        { x: 1130, y: 430, w: 50, h: 76 },
        { x: 1240, y: 170, w: 52, h: 86 },
      ];
      cityBlocks.forEach((b, idx) => {
        bctx.fillStyle = 'rgba(0,0,0,0.4)';
        bctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
        bctx.fillStyle = '#09090b';
        bctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        bctx.fillStyle = '#3f3f46';
        bctx.fillRect(b.x, b.y, b.w, b.h);
        bctx.fillStyle = '#71717a';
        bctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 7);
        for (let wy = b.y + 15; wy < b.y + b.h - 8; wy += 11) {
          for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 11) {
            bctx.fillStyle = (wx + wy + idx) % 5 === 0 ? '#f59e0b' : '#18181b';
            bctx.fillRect(wx, wy, 6, 6);
          }
        }
        if (idx === 3) {
          // Hospital Red Cross
          bctx.fillStyle = '#ef4444';
          bctx.fillRect(b.x + 24, b.y - 14, 10, 14);
          bctx.fillRect(b.x + 20, b.y - 10, 18, 6);
        }
      });

      // Sector 4: Military Bunkers, Helipad & Zero Quarantine Dome
      bctx.fillStyle = '#3f4739';
      bctx.fillRect(1470, 140, 78, 48);
      bctx.strokeStyle = '#18181b';
      bctx.lineWidth = 2;
      bctx.strokeRect(1470, 140, 78, 48);

      bctx.fillStyle = 'rgba(24, 24, 27, 0.7)';
      bctx.fillRect(1576, 416, 72, 72);
      bctx.strokeStyle = '#eab308';
      bctx.strokeRect(1580, 420, 64, 64);
      bctx.fillStyle = '#eab308';
      bctx.font = 'bold 24px monospace';
      bctx.fillText('H', 1604, 460);

      // 4. Winding Two-Lane Interstate Highway connecting all 12 Mission Nodes
      const pts = MISSION_NODES.map((m) => ({
        x: (m.mapX / 100) * WORLD_W,
        y: (m.mapY / 100) * WORLD_H,
      }));

      bctx.strokeStyle = '#141417';
      bctx.lineWidth = 36;
      bctx.lineCap = 'round';
      bctx.lineJoin = 'round';
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();

      bctx.strokeStyle = '#3f3f46';
      bctx.lineWidth = 26;
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();

      bctx.strokeStyle = '#facc15';
      bctx.lineWidth = 3;
      bctx.setLineDash([10, 10]);
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();
      bctx.setLineDash([]);

      bakedMapRef.current = off;
    }

    let rafId: number;
    let lastDraw = 0;

    const animateMap = (now: number) => {
      rafId = requestAnimationFrame(animateMap);
      // Throttle world-map atmospheric animation to ~24 FPS to save battery while staying super alive
      if (now - lastDraw < 40) return;
      lastDraw = now;

      const ctx = mapCanvasRef.current?.getContext('2d');
      const baked = bakedMapRef.current;
      if (!ctx || !baked) return;

      const t = now * 0.001;
      ctx.drawImage(baked, 0, 0);

      // A. Flowing water current streaks along both rivers
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.32)';
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 26]);
      ctx.lineDashOffset = -t * 28;
      [880, 1340].forEach((rx) => {
        ctx.beginPath();
        ctx.moveTo(rx, -10);
        ctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        ctx.stroke();
      });
      ctx.restore();

      // B. Flickering Refinery Gas Flares & Rising Industrial Smoke Plumes (Sector 2)
      [640, 740, 810].forEach((ox, idx) => {
        const oy = 360 + (idx % 2) * 80;
        const flk = Math.round(Math.sin(t * 15 + idx * 2) * 3);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(ox + 4, oy - 48 - flk, 14, 12 + flk);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(ox + 7, oy - 54 - flk, 8, 8);

        const puffShift = (t * 22 + idx * 14) % 42;
        ctx.fillStyle = 'rgba(20, 20, 23, 0.42)';
        ctx.fillRect(ox + 2 - puffShift * 0.2, oy - 66 - puffShift, 18, 12);
      });

      // C. Pulsing Biohazard Reactor Dome & Radar Sweep Ring (Sector 4 — Mission 12)
      const pulseR = 42 + Math.sin(t * 4) * 5;
      const radGrad = ctx.createRadialGradient(1710, 260, 8, 1710, 260, pulseR + 24);
      radGrad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
      radGrad.addColorStop(0.45, 'rgba(220, 38, 38, 0.78)');
      radGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(1710, 260, pulseR + 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
      ctx.lineWidth = 2;
      const sweepR = 16 + ((t * 36) % 75);
      ctx.beginPath();
      ctx.arc(1509, 164, sweepR, 0, Math.PI * 2);
      ctx.stroke();

      // D. Soft Drifting Cloud Shadows across Continent
      ctx.fillStyle = 'rgba(0, 0, 0, 0.11)';
      for (let c = 0; c < 5; c++) {
        const cx = ((c * 410 + t * 18) % (WORLD_W + 260)) - 130;
        const cy = 110 + ((c * 127) % 420);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 95, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    rafId = requestAnimationFrame(animateMap);
    return () => cancelAnimationFrame(rafId);
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

  const triggerGarageUpgrade = (
    kind: 'hp' | 'bill' | 'bumper' | 'armor' | 'commander_level',
    cost: number
  ) => {
    onUpgradeBusStat(kind, cost);
    setWeldBurstKey((k) => k + 1);
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
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-0.5 rounded bg-amber-950/95 border border-yellow-400 text-[10px] font-bold text-yellow-200 hover:scale-110 transition shadow-lg flex items-center gap-1 animate-bounce cursor-pointer"
                title={`${cache.name}: Toca para saquear +${cache.coins} monedas y +${cache.fuel} gasolina`}
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
                  className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center font-pixel text-xs shadow-xl ${
                    isSelected
                      ? 'bg-yellow-400 text-zinc-950 border-white ring-4 ring-yellow-400/50 scale-110'
                      : unlocked
                      ? 'bg-[#3b3829] text-white border-yellow-500'
                      : 'bg-zinc-900/95 text-zinc-400 border-zinc-600'
                  }`}
                >
                  {unlocked ? node.id : `🔒${node.id}`}
                  {node.difficulty === 'NIGHTMARE' && (
                    <span className="absolute -top-2 -right-2 text-[10px] drop-shadow">💀</span>
                  )}
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

          {/* PIXEL ARMORED SCHOOL BUS MARKER WITH HEADLIGHT BEAM ON ROAD */}
          <div
            style={{ left: `${busMapPos.x}%`, top: `${busMapPos.y}%` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[150%] z-30 transition-all duration-150 flex flex-col items-center"
          >
            <div className="relative flex items-center">
              <div className="w-12 h-6 bg-[#eab308] border-2 border-[#181410] rounded-xs shadow-xl flex flex-col justify-between p-0.5">
                <div className="flex gap-0.5">
                  <span className="w-2 h-1.5 bg-slate-900" />
                  <span className="w-2 h-1.5 bg-slate-900" />
                  <span className="w-2 h-1.5 bg-slate-900" />
                  <span className="w-2 h-1.5 bg-sky-300" />
                </div>
                <div className="w-full h-0.5 bg-zinc-950" />
              </div>
              {/* Conical warm headlight glow */}
              <div
                className="w-7 h-5 -ml-0.5 opacity-80"
                style={{
                  background: 'linear-gradient(90deg, rgba(254,240,138,0.85), rgba(254,240,138,0))',
                  clipPath: 'polygon(0 35%, 100% 0, 100% 100%, 0 65%)',
                }}
              />
            </div>
            <span className="mt-0.5 px-1.5 py-0.2 rounded bg-zinc-950/90 border border-yellow-500 text-yellow-300 font-pixel text-[7px]">
              BILL NV.{commanderLvl}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP-LEFT FLOATING DEAD AHEAD BARS: Fuel, Stars & Commander Level      */}
      {/* ===================================================================== */}
      <div className="absolute top-2 left-3 z-20 flex items-center gap-2.5 flex-wrap">
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
                className="ml-1 text-[9px] bg-red-600 hover:bg-red-500 text-white px-1 rounded font-bold cursor-pointer"
              >
                +
              </button>
            )}
          </div>
        </div>

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

        <button
          onClick={() => setModalTab('deck')}
          className="px-2.5 h-6 rounded bg-sky-900/95 hover:bg-sky-800 border-2 border-sky-400 flex items-center gap-1.5 text-xs font-extrabold text-white shadow-md cursor-pointer"
          title="Subir Nivel de Comandante para desbloquear nuevas unidades"
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
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-yellow-500 hover:text-zinc-950 text-[10px] font-bold text-zinc-200 transition cursor-pointer"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setZoomedOut((z) => !z)}
          className="ml-1 px-2 py-0.5 rounded bg-emerald-900/90 hover:bg-emerald-700 border border-emerald-500 text-[10px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer"
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
          className="md:hidden px-2 py-1 rounded bg-zinc-900/90 border border-zinc-600 text-[10px] font-bold text-yellow-300 cursor-pointer"
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
      {/* BOTTOM-LEFT FLOATING BUTTONS: Tropas (11), Taller Bus & Zombiepedia   */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setModalTab('deck')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-yellow-400 text-xs font-extrabold text-white shadow-lg cursor-pointer"
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>Unidades (11)</span>
        </button>

        <button
          onClick={() => setModalTab('garage')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-[#96916f] text-xs font-extrabold text-white shadow-lg cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-yellow-400" />
          <span>Taller Bus</span>
        </button>

        <button
          onClick={() => setModalTab('zombiepedia')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-[#787459] text-xs font-extrabold text-white shadow-lg cursor-pointer"
        >
          <Skull className="w-4 h-4 text-red-400" />
          <span>Zombis</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM-RIGHT FLOATING COMPACT MISSION LAUNCH CARD                     */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 right-3 z-20 w-64 sm:w-72 bg-[#26241b]/95 border-2 border-[#8e8a6b] rounded-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase text-yellow-400">
            {selectedMission.sector}
          </span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
              selectedMission.difficulty === 'NIGHTMARE'
                ? 'bg-red-950 text-red-300 border-red-600'
                : selectedMission.difficulty === 'HARD'
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-emerald-950 text-emerald-300 border-emerald-600'
            }`}
          >
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
            Botín: <strong className="text-yellow-400">+{selectedMission.coinsReward} 🪙</strong>
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
      {/* MODAL DRAWERS: Arsenal HD / Live Workshop Diorama Garage / Zombiepedia */}
      {/* ===================================================================== */}
      {modalTab !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/82 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-5xl max-h-[92dvh] bg-[#242219] border-2 border-[#8e8a6b] rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#181711] border-b border-[#4a4737]">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-pixel text-xs text-yellow-400">
                  {modalTab === 'deck'
                    ? `ARSENAL DE SUPERVIVIENTES — NV. COMANDANTE ${commanderLvl}`
                    : modalTab === 'garage'
                    ? 'TALLER DE BILL — DIORAMA DE BLINDAJE DEL AUTOBÚS'
                    : 'ZOMBIEPEDIA — INTELIGENCIA TÁCTICA'}
                </h3>
                {modalTab === 'deck' && commanderLvl < 7 && (
                  <button
                    onClick={() => triggerGarageUpgrade('commander_level', commanderLevelUpCost)}
                    disabled={progress.coins < commanderLevelUpCost}
                    className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase shadow cursor-pointer"
                  >
                    ⬆ Subir a Nivel {commanderLvl + 1} ({commanderLevelUpCost} 🪙)
                  </button>
                )}
              </div>
              <button
                onClick={() => setModalTab('none')}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex flex-col gap-3">
              {/* LIVE INTERACTIVE BUS WORKSHOP DIORAMA WHEN IN GARAGE */}
              {modalTab === 'garage' && (
                <GarageWorkshopDiorama progress={progress} weldBurstKey={weldBurstKey} />
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
                            ? 'bg-[#1a1913] border-[#5e5a45]'
                            : 'bg-zinc-950/90 border-zinc-800 opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <SpritePreviewBox subType={sType} isZombie={false} locked={!isUnlocked} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[10px] mb-0.5">
                                <span className="bg-sky-700 text-white px-1.5 rounded font-bold">
                                  💧 {cfg.cost}
                                </span>
                                {isUnlocked ? (
                                  <span className="text-yellow-400 font-bold">Nv.{lvl}</span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                    <Lock className="w-3 h-3" /> Nv.{cfg.unlockLevel}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-white leading-tight">
                                {cfg.name}
                              </div>
                              <div className="text-[9px] text-amber-300/90 font-semibold">
                                {cfg.roleTitle}
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-400 leading-tight mb-1.5">
                            {cfg.description}
                          </p>
                          <div className="flex flex-wrap gap-1 text-[9px] text-zinc-200 mb-2">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                              ❤️ {Math.round(cfg.baseHp * mult)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                              ⚔️ {Math.round(cfg.baseDamage * mult)}
                              {cfg.pellets && cfg.pellets > 1 ? `×${cfg.pellets}` : ''}
                            </span>
                            {cfg.meleeResist ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                🛡️ -{Math.round(cfg.meleeResist * 100)}% Melee
                              </span>
                            ) : null}
                            {cfg.armorPiercing ? (
                              <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                🎯 Perfora {Math.round(cfg.armorPiercing * 100)}%
                              </span>
                            ) : null}
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
                            Mejorar Unidad ({cost} 🪙)
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              triggerGarageUpgrade('commander_level', commanderLevelUpCost)
                            }
                            disabled={progress.coins < commanderLevelUpCost}
                            className="w-full py-1.5 rounded bg-amber-600/90 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                          >
                            Subir a Nv.{cfg.unlockLevel}
                          </button>
                        )}
                      </div>
                    );
                  })}

                {modalTab === 'garage' && (
                  <>
                    <div className="bg-[#1a1913] border border-sky-500/60 rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs mb-1">
                          <Award className="w-4 h-4" />
                          <span>Rango Comandante (Nv.{commanderLvl})</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Desbloquea Sabueso (Nv.2), Sniper (Nv.3), Pyro (Nv.4), Torreta (Nv.5), Dron (Nv.6) y Juggernaut (Nv.7).
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          triggerGarageUpgrade('commander_level', commanderLevelUpCost)
                        }
                        disabled={progress.coins < commanderLevelUpCost || commanderLvl >= 10}
                        className="py-1.5 rounded bg-sky-400 hover:bg-sky-300 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        {commanderLvl >= 10
                          ? 'Rango Máximo'
                          : `Subir a Nv.${commanderLvl + 1} (${commanderLevelUpCost} 🪙)`}
                      </button>
                    </div>

                    <div className="bg-[#1a1913] border border-[#5e5a45] rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs mb-1">
                          <Shield className="w-4 h-4" />
                          <span>Chasis Reforzado (+50 HP)</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Integridad total actual: <strong className="text-white">{200 + progress.busHpBonus} HP</strong> (facilita conseguir 3★).
                        </p>
                      </div>
                      <button
                        onClick={() => triggerGarageUpgrade('hp', 75)}
                        disabled={progress.coins < 75}
                        className="py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        Soldar Chasis (75 🪙)
                      </button>
                    </div>

                    <div className="bg-[#1a1913] border border-[#5e5a45] rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                          <Hammer className="w-4 h-4" />
                          <span>Rifle de Sheriff Bill (+8 Daño)</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Bono actual en el techo: <strong className="text-white">+{progress.billDamageBonus} daño</strong> por disparo y ráfaga.
                        </p>
                      </div>
                      <button
                        onClick={() => triggerGarageUpgrade('bill', 80)}
                        disabled={progress.coins < 80}
                        className="py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        Calibrar Rifle (80 🪙)
                      </button>
                    </div>

                    <div className="bg-[#1a1913] border border-[#5e5a45] rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs mb-1">
                          <Wrench className="w-4 h-4" />
                          <span>Arado Frontal con Púas</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Devuelve 14 de daño sangriento a cualquier zombi que golpee el morro del autobús.
                        </p>
                      </div>
                      <button
                        onClick={() => triggerGarageUpgrade('bumper', 110)}
                        disabled={progress.spikedBumper || progress.coins < 110}
                        className="py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        {progress.spikedBumper ? '✓ Arado Instalado' : 'Soldar Arado (110 🪙)'}
                      </button>
                    </div>

                    <div className="bg-[#1a1913] border border-[#5e5a45] rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs mb-1">
                          <Shield className="w-4 h-4 text-sky-300" />
                          <span>Placas Blindadas en Ventanas</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2">
                          Suelda rejas de acero pesado y faldón blindado (+80 HP extra al bus).
                        </p>
                      </div>
                      <button
                        onClick={() => triggerGarageUpgrade('armor', 125)}
                        disabled={progress.weldedArmor || progress.coins < 125}
                        className="py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-extrabold text-[10px] uppercase cursor-pointer"
                      >
                        {progress.weldedArmor ? '✓ Blindaje Instalado' : 'Soldar Placas (125 🪙)'}
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
                        className="bg-[#1a1913] border border-[#5e5a45] rounded-lg p-2.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start gap-2 mb-1.5">
                            <SpritePreviewBox subType={zType} isZombie={true} />
                            <div>
                              <div className="font-bold text-xs text-red-400 leading-tight">
                                {z.name}
                              </div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">
                                Vel: {z.speed} · Ira +{z.rageReward}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-300 leading-tight mb-2">
                            {z.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[9px] text-zinc-200">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            ❤️ {z.baseHp} HP
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            ⚔️ {z.baseDamage} Daño
                          </span>
                          {z.bulletResist ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              🛡️ -{Math.round(z.bulletResist * 100)}% Balas
                            </span>
                          ) : null}
                          {z.explodesOnDeath ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                              💥 Explosivo AoE
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Crisp Pixel-Art Character Preview Box for Arsenal & Zombiepedia
const SpritePreviewBox: React.FC<{
  subType: SurvivorType | ZombieType;
  isZombie: boolean;
  locked?: boolean;
}> = React.memo(({ subType, isZombie, locked }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    renderCharacterPreview(ctx, subType, isZombie, 38, 40);
  }, [isZombie, subType]);

  return (
    <div className="shrink-0 w-11 h-12 rounded bg-[#12120e] border border-[#3d3a2c] flex items-center justify-center shadow-inner">
      <canvas
        ref={canvasRef}
        width={38}
        height={40}
        className={`w-9 h-10 pixel-canvas ${locked ? 'brightness-0 opacity-50' : ''}`}
      />
    </div>
  );
});

// Live Interactive Bus Workshop Diorama with Overhead Lamp & Welding Sparks!
const GarageWorkshopDiorama: React.FC<{
  progress: PlayerProgress;
  weldBurstKey: number;
}> = ({ progress, weldBurstKey }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>
  >([]);

  useEffect(() => {
    if (weldBurstKey === 0) return;
    for (let i = 0; i < 28; i++) {
      const ang = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7;
      const spd = 35 + Math.random() * 85;
      sparksRef.current.push({
        x: 155 + (Math.random() - 0.5) * 70,
        y: 66 + (Math.random() - 0.5) * 24,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.45 + Math.random() * 0.35,
        color: i % 2 === 0 ? '#fef08a' : '#f97316',
      });
    }
  }, [weldBurstKey]);

  useEffect(() => {
    let rafId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const W = 380;
        const H = 122;
        ctx.imageSmoothingEnabled = false;

        // Brick & Steel Workshop Back Wall
        ctx.fillStyle = '#181612';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#24201a';
        for (let y = 8; y < 86; y += 10) {
          for (let x = (y % 20 === 8 ? 0 : 8); x < W; x += 18) {
            ctx.fillRect(x, y, 16, 8);
          }
        }

        // Steel girder & tool pegboard on wall
        ctx.fillStyle = '#333028';
        ctx.fillRect(22, 26, 62, 34);
        ctx.strokeStyle = '#57534e';
        ctx.strokeRect(22, 26, 62, 34);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(30, 32, 4, 18);
        ctx.fillRect(40, 34, 4, 14);
        ctx.fillRect(52, 32, 12, 4);

        // Concrete garage floor + yellow-black hazard strip
        ctx.fillStyle = '#2d2c28';
        ctx.fillRect(0, 88, W, H - 88);
        for (let hx = 0; hx < W; hx += 16) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(hx, 88, 8, 3);
          ctx.fillStyle = '#18181b';
          ctx.fillRect(hx + 8, 88, 8, 3);
        }

        // Overhead Industrial Lamp & Warm Volumetric Cone
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(184, 0, 4, 10);
        ctx.fillStyle = '#52525b';
        ctx.fillRect(172, 10, 28, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(176, 15, 20, 2);

        const cone = ctx.createLinearGradient(186, 16, 186, 115);
        cone.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
        cone.addColorStop(1, 'rgba(254, 240, 138, 0.02)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(174, 16);
        ctx.lineTo(295, 118);
        ctx.lineTo(75, 118);
        ctx.lineTo(198, 16);
        ctx.closePath();
        ctx.fill();

        // Render Live Armored Bus right inside the Workshop!
        const maxHp = 200 + progress.busHpBonus;
        renderArmoredBus(
          ctx,
          96,
          36,
          maxHp,
          maxHp,
          t,
          2.0,
          0,
          progress.spikedBumper,
          progress.weldedArmor,
          0
        );

        // Ambient periodic welding spark + upgrade burst sparks
        if (Math.random() < 0.08) {
          sparksRef.current.push({
            x: 195 + (Math.random() - 0.5) * 30,
            y: 78,
            vx: (Math.random() - 0.5) * 40,
            vy: -25 - Math.random() * 35,
            life: 0.35,
            color: '#fef08a',
          });
        }

        for (let i = sparksRef.current.length - 1; i >= 0; i--) {
          const sp = sparksRef.current[i];
          sp.life -= dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += 180 * dt;
          if (sp.y > 110) {
            sp.y = 110;
            sp.vy *= -0.45;
          }
          ctx.fillStyle = sp.color;
          ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
          if (sp.life <= 0) sparksRef.current.splice(i, 1);
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [progress.busHpBonus, progress.spikedBumper, progress.weldedArmor]);

  return (
    <div className="w-full rounded-lg overflow-hidden border-2 border-[#5e5a45] bg-[#14130f] flex flex-col sm:flex-row items-center justify-between px-3 py-2 gap-3 shadow-inner">
      <canvas
        ref={canvasRef}
        width={380}
        height={122}
        className="w-full sm:w-[380px] h-[116px] object-contain pixel-canvas rounded border border-zinc-800"
      />
      <div className="flex-1 text-left space-y-1">
        <div className="font-pixel text-[10px] text-amber-300">
          ESTADO EN VIVO DEL AUTOBÚS ESCOLAR
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-300">
          <div className="bg-zinc-900/90 px-2 py-1 rounded border border-zinc-800">
            🛡️ Chasis: <strong className="text-emerald-400">{200 + progress.busHpBonus} HP</strong>
          </div>
          <div className="bg-zinc-900/90 px-2 py-1 rounded border border-zinc-800">
            🔫 Rifle Bill: <strong className="text-amber-300">{19 + progress.billDamageBonus} Dmg</strong>
          </div>
          <div className="bg-zinc-900/90 px-2 py-1 rounded border border-zinc-800">
            🩸 Arado Púas:{' '}
            <strong className={progress.spikedBumper ? 'text-emerald-400' : 'text-zinc-500'}>
              {progress.spikedBumper ? 'Activo' : 'Pendiente'}
            </strong>
          </div>
          <div className="bg-zinc-900/90 px-2 py-1 rounded border border-zinc-800">
            🔩 Placas Acero:{' '}
            <strong className={progress.weldedArmor ? 'text-emerald-400' : 'text-zinc-500'}>
              {progress.weldedArmor ? 'Activas' : 'Pendiente'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

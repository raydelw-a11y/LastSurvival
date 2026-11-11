import React, { useEffect, useRef, useState } from 'react';
import {
  getNextLockedUnit,
  getXpForNextLevel,
  isUnitUnlocked,
  MAX_COMMANDER_LEVEL,
  MAX_EQUIPPED_DECK,
  MISSION_NODES,
  MissionNode,
  PlayerProgress,
  SHORT_UNIT_NAMES,
  SURVIVOR_CONFIGS,
  SURVIVOR_ORDER,
  SurvivorType,
  ZOMBIE_CONFIGS,
  ZombieType,
} from '../types/game';
import {
  Award,
  Check,
  Compass,
  Hammer,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  renderArmoredBus,
  renderCharacterPreview,
  syncCanvasHiDPI,
} from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';

interface RoadMapHubProps {
  progress: PlayerProgress;
  selectedMissionId: number;
  onSelectMission: (id: number) => void;
  onLaunchMission: (mission: MissionNode) => void;
  onUpgradeSurvivor: (type: SurvivorType, cost: number) => void;
  onUpgradeBusStat: (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => void;
  onToggleDeckUnit: (type: SurvivorType) => void;
  onResetProgress: () => void;
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
  onToggleDeckUnit,
  onResetProgress,
  onCollectCache,
  onRefillFuel,
}) => {
  const [modalTab, setModalTab] = useState<'none' | 'deck' | 'garage' | 'zombiepedia'>('none');
  const [zoomedOut, setZoomedOut] = useState<boolean>(false);
  const [weldBurstKey, setWeldBurstKey] = useState<number>(0);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
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
      const MAP_SCALE = 1.5;
      const off = document.createElement('canvas');
      off.width = Math.round(WORLD_W * MAP_SCALE);
      off.height = Math.round(WORLD_H * MAP_SCALE);
      const bctx = off.getContext('2d')!;
      bctx.scale(MAP_SCALE, MAP_SCALE);
      bctx.imageSmoothingEnabled = true;

      // 1. Smooth Regional Biome Grounds with Illustrated Gradient Transitions
      const bgGrad = bctx.createLinearGradient(0, 0, WORLD_W, 0);
      bgGrad.addColorStop(0, '#334227');
      bgGrad.addColorStop(0.24, '#3c4a2d');
      bgGrad.addColorStop(0.28, '#5c462f');
      bgGrad.addColorStop(0.49, '#55422d');
      bgGrad.addColorStop(0.53, '#343841');
      bgGrad.addColorStop(0.73, '#2f333b');
      bgGrad.addColorStop(0.77, '#27342b');
      bgGrad.addColorStop(1, '#1f2b23');
      bctx.fillStyle = bgGrad;
      bctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Organic topographic contour plateaus & craters (smooth ellipses instead of harsh blocks)
      for (let i = 0; i < 48; i++) {
        const px = 60 + ((i * 137) % (WORLD_W - 120));
        const py = 60 + ((i * 89) % (WORLD_H - 120));
        bctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
        bctx.beginPath();
        bctx.ellipse(px, py, 58 + (i % 5) * 16, 30 + (i % 4) * 12, (i % 3) * 0.25, 0, Math.PI * 2);
        bctx.fill();
      }

      // Sector Borders & Crisp Tactical Headers (Levels 1..12)
      const sectors = [
        { x: 20, label: 'SECTOR 1: BOSQUE SUR (NV. 1-3)' },
        { x: 485, label: 'SECTOR 2: AUTOPISTA 66 & REFINERÍA (NV. 4-6)' },
        { x: 940, label: 'SECTOR 3: CIUDAD MUERTA (NV. 7-9)' },
        { x: 1380, label: 'SECTOR 4: ZONA MILITAR & REACTOR CERO (NV. 10-12)' },
      ];
      bctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
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
        bctx.fillStyle = 'rgba(14, 16, 12, 0.82)';
        bctx.beginPath();
        bctx.roundRect(s.x, 50, 352, 24, 5);
        bctx.fill();
        bctx.strokeStyle = '#a39e77';
        bctx.lineWidth = 1.4;
        bctx.stroke();
        bctx.fillStyle = '#fde047';
        bctx.font = '800 11px "Chakra Petch", sans-serif';
        bctx.fillText(s.label, s.x + 10, 66);
      });

      // 2. Two Winding Rivers with Inked Sandbanks & Shaded Water Channels
      [880, 1340].forEach((rx) => {
        bctx.lineCap = 'round';
        bctx.strokeStyle = '#14120e';
        bctx.lineWidth = 46;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();

        bctx.strokeStyle = '#78684a';
        bctx.lineWidth = 42;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();

        bctx.strokeStyle = '#153142';
        bctx.lineWidth = 34;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();

        bctx.strokeStyle = '#285875';
        bctx.lineWidth = 18;
        bctx.beginPath();
        bctx.moveTo(rx, -10);
        bctx.bezierCurveTo(rx - 50, 200, rx + 60, 420, rx - 20, WORLD_H + 10);
        bctx.stroke();
      });

      // 3. Vector-Inked Pines, Barns, Refinery Derricks, Skyscrapers & Military Base
      const drawPineHD = (px: number, py: number, scale = 1) => {
        bctx.fillStyle = 'rgba(0,0,0,0.34)';
        bctx.beginPath();
        bctx.ellipse(px + 2 * scale, py + 6 * scale, 9 * scale, 4 * scale, 0, 0, Math.PI * 2);
        bctx.fill();

        bctx.fillStyle = '#3b2618';
        bctx.fillRect(px - 2 * scale, py + 1 * scale, 4 * scale, 6 * scale);

        const tiers = [
          { yOff: 2, w: 10, h: 11, fill: '#1e2c18' },
          { yOff: -4, w: 8.2, h: 10, fill: '#2c4022' },
          { yOff: -10, w: 6, h: 9, fill: '#3f5931' },
        ];
        tiers.forEach((tr) => {
          bctx.beginPath();
          bctx.moveTo(px, py + (tr.yOff - tr.h) * scale);
          bctx.lineTo(px + tr.w * scale, py + tr.yOff * scale);
          bctx.lineTo(px - tr.w * scale, py + tr.yOff * scale);
          bctx.closePath();
          bctx.fillStyle = tr.fill;
          bctx.fill();
          bctx.strokeStyle = '#121610';
          bctx.lineWidth = 1.1;
          bctx.stroke();
        });
      };

      for (let i = 0; i < 165; i++) {
        const fx = 25 + ((i * 97) % (WORLD_W - 50));
        const fy = 85 + ((i * 71) % (WORLD_H - 130));
        if (Math.abs(fy - 320) > 65) {
          drawPineHD(fx, fy, 1.05 + (i % 3) * 0.1);
        }
      }

      // Sector 1: Inked Red Farm Barn + Cylindrical Grain Silo
      bctx.fillStyle = 'rgba(0,0,0,0.35)';
      bctx.beginPath();
      bctx.ellipse(270, 212, 42, 10, 0, 0, Math.PI * 2);
      bctx.fill();

      bctx.fillStyle = '#881d1d';
      bctx.strokeStyle = '#14110f';
      bctx.lineWidth = 2;
      bctx.fillRect(240, 180, 48, 30);
      bctx.strokeRect(240, 180, 48, 30);
      bctx.beginPath();
      bctx.moveTo(234, 182);
      bctx.lineTo(264, 164);
      bctx.lineTo(294, 182);
      bctx.closePath();
      bctx.fillStyle = '#b91c1c';
      bctx.fill();
      bctx.stroke();
      bctx.strokeStyle = '#f8fafc';
      bctx.lineWidth = 1.5;
      bctx.strokeRect(256, 190, 16, 18);

      bctx.fillStyle = '#cbd5e1';
      bctx.strokeStyle = '#14110f';
      bctx.lineWidth = 1.8;
      bctx.fillRect(294, 160, 18, 50);
      bctx.strokeRect(294, 160, 18, 50);
      bctx.beginPath();
      bctx.arc(303, 160, 9, Math.PI, 0);
      bctx.fillStyle = '#64748b';
      bctx.fill();
      bctx.stroke();

      // Sector 2: Inked Oil Derricks & Refinery Storage Tanks
      [640, 740, 810].forEach((ox, idx) => {
        const oy = 360 + (idx % 2) * 80;
        bctx.fillStyle = 'rgba(0,0,0,0.35)';
        bctx.beginPath();
        bctx.ellipse(ox + 12, oy + 3, 18, 6, 0, 0, Math.PI * 2);
        bctx.fill();

        bctx.fillStyle = '#3f3f46';
        bctx.strokeStyle = '#121214';
        bctx.lineWidth = 2;
        bctx.beginPath();
        bctx.roundRect(ox, oy - 38, 24, 38, 3);
        bctx.fill();
        bctx.stroke();
        bctx.fillStyle = '#dc2626';
        bctx.fillRect(ox + 1, oy - 28, 22, 5);
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
        bctx.fillStyle = 'rgba(0,0,0,0.42)';
        bctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
        bctx.fillStyle = '#3f3f46';
        bctx.strokeStyle = '#09090b';
        bctx.lineWidth = 2;
        bctx.fillRect(b.x, b.y, b.w, b.h);
        bctx.strokeRect(b.x, b.y, b.w, b.h);
        bctx.fillStyle = '#71717a';
        bctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 7);
        for (let wy = b.y + 15; wy < b.y + b.h - 8; wy += 11) {
          for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 11) {
            bctx.fillStyle = (wx + wy + idx) % 5 === 0 ? '#f59e0b' : '#18181b';
            bctx.fillRect(wx, wy, 6, 6);
          }
        }
        if (idx === 3) {
          bctx.fillStyle = '#ef4444';
          bctx.fillRect(b.x + 24, b.y - 14, 10, 14);
          bctx.fillRect(b.x + 20, b.y - 10, 18, 6);
        }
      });

      // Sector 4: Military Bunkers & Helipad
      bctx.fillStyle = '#3f4739';
      bctx.strokeStyle = '#141612';
      bctx.lineWidth = 2.2;
      bctx.beginPath();
      bctx.roundRect(1470, 140, 78, 48, 6);
      bctx.fill();
      bctx.stroke();

      bctx.fillStyle = 'rgba(24, 24, 27, 0.8)';
      bctx.beginPath();
      bctx.roundRect(1576, 416, 72, 72, 8);
      bctx.fill();
      bctx.strokeStyle = '#eab308';
      bctx.lineWidth = 2;
      bctx.strokeRect(1582, 422, 60, 60);
      bctx.fillStyle = '#eab308';
      bctx.font = '800 24px "Chakra Petch", sans-serif';
      bctx.fillText('H', 1603, 461);

      // 4. Winding Two-Lane Interstate Highway connecting all 12 Mission Nodes
      const pts = MISSION_NODES.map((m) => ({
        x: (m.mapX / 100) * WORLD_W,
        y: (m.mapY / 100) * WORLD_H,
      }));

      bctx.lineCap = 'round';
      bctx.lineJoin = 'round';

      // Inked outer road border + gravel shoulder
      bctx.strokeStyle = '#121215';
      bctx.lineWidth = 40;
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();

      bctx.strokeStyle = '#57534e';
      bctx.lineWidth = 34;
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();

      bctx.strokeStyle = '#33363d';
      bctx.lineWidth = 26;
      bctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? bctx.moveTo(p.x, p.y) : bctx.lineTo(p.x, p.y)));
      bctx.stroke();

      bctx.strokeStyle = '#facc15';
      bctx.lineWidth = 2.6;
      bctx.setLineDash([11, 10]);
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

      const canvas = mapCanvasRef.current;
      const baked = bakedMapRef.current;
      if (!canvas || !baked) return;
      const ctx = syncCanvasHiDPI(canvas, WORLD_W, WORLD_H, 1.75);
      if (!ctx) return;

      const t = now * 0.001;
      ctx.drawImage(baked, 0, 0, WORLD_W, WORLD_H);

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

  const triggerGarageUpgrade = (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => {
    onUpgradeBusStat(kind, cost);
    setWeldBurstKey((k) => k + 1);
  };

  const totalStars = Object.values(progress.missionStars).reduce((a, b) => a + b, 0);
  const maxStars = MISSION_NODES.length * 3;
  const commanderLvl = progress.busLevel || 1;
  const xpNeeded = getXpForNextLevel(commanderLvl);
  const isMaxLevel = commanderLvl >= MAX_COMMANDER_LEVEL;
  const xpRatio = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((progress.commanderXp / xpNeeded) * 100)));
  const nextLockedUnit = getNextLockedUnit(commanderLvl);
  const unlockedCount = SURVIVOR_ORDER.filter((t) => isUnitUnlocked(t, commanderLvl)).length;
  const equippedDeck = progress.equippedDeck || ['redneck'];

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
            className="w-full h-full object-fill hd-canvas pointer-events-none"
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
          className="px-2.5 h-7 rounded bg-sky-950/95 hover:bg-sky-900 border-2 border-sky-400 flex items-center gap-2 text-xs font-extrabold text-white shadow-md cursor-pointer"
          title="Gana XP en combate para subir el Nivel de Comandante y desbloquear nuevas unidades"
        >
          <Award className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] tracking-wide">
              NV.{commanderLvl}/{MAX_COMMANDER_LEVEL}
            </span>
            <div className="w-16 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-sky-700/60 mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-300 transition-all duration-300"
                style={{ width: `${xpRatio}%` }}
              />
            </div>
          </div>
          <span className="text-[9px] text-sky-200 font-bold">
            {isMaxLevel ? 'MAX' : `${progress.commanderXp}/${xpNeeded} XP`}
          </span>
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
      {/* TOP-RIGHT FLOATING COINS & SAFE RESET BAR                             */}
      {/* ===================================================================== */}
      <div className="absolute top-2 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              setTimeout(() => setConfirmReset(false), 3800);
            } else {
              setConfirmReset(false);
              onResetProgress();
            }
          }}
          className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
            confirmReset
              ? 'bg-red-600 hover:bg-red-500 border-white text-white animate-pulse'
              : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-600 text-zinc-300'
          }`}
          title="Reiniciar campaña desde Nivel 1 (solo Campesino Redneck)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{confirmReset ? '¿Confirmar Nv.1?' : 'Reiniciar'}</span>
        </button>

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
      {/* BOTTOM-LEFT FLOATING BUTTONS: Escuadrón, Taller Bus & Zombiepedia     */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setModalTab('deck')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3b3829]/95 hover:bg-[#4f4b37] border-2 border-yellow-400 text-xs font-extrabold text-white shadow-lg cursor-pointer"
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>
            Escuadrón ({unlockedCount}/{SURVIVOR_ORDER.length})
          </span>
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
                    ? `ARSENAL Y ESCUADRÓN — NV. COMANDANTE ${commanderLvl}/${MAX_COMMANDER_LEVEL}`
                    : modalTab === 'garage'
                    ? 'TALLER DE BILL — DIORAMA DE BLINDAJE DEL AUTOBÚS'
                    : 'ZOMBIEPEDIA — INTELIGENCIA TÁCTICA'}
                </h3>
                {modalTab === 'deck' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500 text-sky-200 font-extrabold text-[10px] uppercase">
                      Escuadrón Activo: {equippedDeck.length}/{MAX_EQUIPPED_DECK}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/70 text-amber-200 font-bold text-[10px]">
                      {nextLockedUnit
                        ? `Próximo desbloqueo Nv.${nextLockedUnit.unlockLevel}: ${nextLockedUnit.name} (${progress.commanderXp}/${xpNeeded} XP)`
                        : isMaxLevel
                        ? '★ Maestría Nv.12 Activa (+10% Global)'
                        : `Nv.12 Maestría (+10% Global): ${progress.commanderXp}/${xpNeeded} XP`}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setModalTab('none')}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 sm:p-2.5 overflow-y-auto flex flex-col gap-2.5">
              {/* LIVE INTERACTIVE BUS WORKSHOP DIORAMA WHEN IN GARAGE */}
              {modalTab === 'garage' && (
                <GarageWorkshopDiorama progress={progress} weldBurstKey={weldBurstKey} />
              )}

              <div
                className={
                  modalTab === 'deck'
                    ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5'
                    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5'
                }
              >
                {modalTab === 'deck' &&
                  SURVIVOR_ORDER.map((sType) => {
                    const cfg = SURVIVOR_CONFIGS[sType];
                    const isUnlocked = isUnitUnlocked(sType, commanderLvl);
                    const isEquipped = equippedDeck.includes(sType);
                    const deckSlotIdx = equippedDeck.indexOf(sType);
                    const lvl = progress.unitLevels[sType] || 1;
                    const cost = lvl * 35;
                    const canAfford = isUnlocked && progress.coins >= cost;
                    const mult = 1 + (lvl - 1) * 0.14;
                    const isLastEquipped = isEquipped && equippedDeck.length <= 1;

                    return (
                      <div
                        key={sType}
                        title={`${cfg.name} (${cfg.roleTitle}) — ${cfg.description}`}
                        className={`border rounded-lg p-1.5 flex flex-col justify-between transition ${
                          isUnlocked
                            ? isEquipped
                              ? 'bg-[#1f1e16] border-amber-400/90 shadow-md'
                              : 'bg-[#1a1913] border-[#5e5a45]'
                            : 'bg-zinc-950/90 border-zinc-800 opacity-85'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <SpritePreviewBox
                              subType={sType}
                              isZombie={false}
                              locked={!isUnlocked}
                              compact={true}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between text-[8.5px] mb-0.5">
                                <span className="bg-sky-700 text-white px-1 rounded font-bold leading-tight">
                                  💧{cfg.cost}
                                </span>
                                {isUnlocked ? (
                                  <span className="text-yellow-400 font-bold leading-tight">
                                    {isEquipped ? `#${deckSlotIdx + 1}·` : ''}Nv.{lvl}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-amber-400 font-bold leading-tight">
                                    <Lock className="w-2.5 h-2.5" />
                                    Nv.{cfg.unlockLevel}
                                  </span>
                                )}
                              </div>
                              <div className="font-extrabold text-[10px] text-white leading-tight truncate">
                                {SHORT_UNIT_NAMES[sType]}
                              </div>
                              <div className="text-[8px] text-amber-300/85 font-semibold leading-tight truncate">
                                {cfg.roleTitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[8.5px] text-zinc-200 mb-1.5 bg-zinc-900/85 px-1.5 py-0.5 rounded border border-zinc-800">
                            <span>❤️ {Math.round(cfg.baseHp * mult)}</span>
                            <span>
                              ⚔️ {Math.round(cfg.baseDamage * mult)}
                              {cfg.pellets && cfg.pellets > 1 ? `×${cfg.pellets}` : ''}
                            </span>
                          </div>
                        </div>
                        {isUnlocked ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onToggleDeckUnit(sType)}
                              disabled={isLastEquipped}
                              title={
                                isEquipped
                                  ? `En escuadrón activo (Tecla ${deckSlotIdx + 1})`
                                  : 'Equipar en el escuadrón de batalla'
                              }
                              className={`flex-1 py-1 px-1 rounded text-[8.5px] font-extrabold uppercase flex items-center justify-center gap-0.5 border truncate ${
                                isEquipped
                                  ? isLastEquipped
                                    ? 'bg-amber-950/60 border-amber-700/60 text-amber-300/80 cursor-default'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200 cursor-pointer'
                                  : 'bg-sky-950 hover:bg-sky-900 border-sky-500 text-sky-200 cursor-pointer'
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <Check className="w-2.5 h-2.5 shrink-0" />
                                  <span>Mazo</span>
                                </>
                              ) : (
                                <span>+Mazo</span>
                              )}
                            </button>
                            <button
                              onClick={() => onUpgradeSurvivor(sType, cost)}
                              disabled={!canAfford}
                              title={`Mejorar a Nivel ${lvl + 1} por ${cost} monedas`}
                              className={`flex-1 py-1 px-1 rounded text-[8.5px] font-extrabold uppercase truncate ${
                                canAfford
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              ⬆{cost}🪙
                            </button>
                          </div>
                        ) : (
                          <div className="w-full py-1 px-1 rounded bg-zinc-900/95 border border-zinc-800 text-amber-300/90 font-bold text-[8.5px] text-center flex items-center justify-center gap-0.5 truncate">
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            <span>Nv.{cfg.unlockLevel} (XP)</span>
                          </div>
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
                          <span>
                            Rango Comandante (Nv.{commanderLvl}/{MAX_COMMANDER_LEVEL})
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-300 mb-2 leading-relaxed">
                          Las unidades se desbloquean combatiendo y ganando XP en carretera (1 unidad nueva por nivel hasta Nv.12, más Maestría +10% global en Nv.12).
                        </p>
                      </div>
                      <div className="bg-zinc-950/90 border border-sky-800/70 rounded p-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-sky-200 mb-1">
                          <span>
                            {nextLockedUnit
                              ? `Próximo: ${nextLockedUnit.name} (Nv.${nextLockedUnit.unlockLevel})`
                              : isMaxLevel
                              ? 'Maestría de Comandante Activa'
                              : 'Próximo: Maestría Nv.12'}
                          </span>
                          <span>{isMaxLevel ? 'MAX' : `${progress.commanderXp}/${xpNeeded} XP`}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-300"
                            style={{ width: `${xpRatio}%` }}
                          />
                        </div>
                      </div>
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

// Crisp 2D HD Character Preview Box for Arsenal & Zombiepedia
const SpritePreviewBox: React.FC<{
  subType: SurvivorType | ZombieType;
  isZombie: boolean;
  locked?: boolean;
  compact?: boolean;
}> = React.memo(({ subType, isZombie, locked, compact }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = syncCanvasHiDPI(canvas, 40, 42, 3);
    if (!ctx) return;
    renderCharacterPreview(ctx, subType, isZombie, 40, 42);
  }, [isZombie, subType]);

  return (
    <div
      className={`shrink-0 ${
        compact ? 'w-8.5 h-9.5' : 'w-11 h-12'
      } rounded bg-[#12120e] border border-[#3d3a2c] flex items-center justify-center shadow-inner`}
    >
      <canvas
        ref={canvasRef}
        width={40}
        height={42}
        className={`${compact ? 'w-8 h-9' : 'w-10 h-[42px]'} hd-canvas ${
          locked ? 'brightness-0 opacity-55' : ''
        }`}
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
      const canvas = canvasRef.current;
      const W = 380;
      const H = 122;
      const ctx = canvas ? syncCanvasHiDPI(canvas, W, H, 2.5) : null;
      if (ctx) {

        // Brick & Steel Workshop Back Wall
        ctx.fillStyle = '#181612';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#24201a';
        for (let y = 8; y < 86; y += 10) {
          for (let x = y % 20 === 8 ? 0 : 8; x < W; x += 18) {
            ctx.beginPath();
            ctx.roundRect(x, y, 16, 8, 1.5);
            ctx.fill();
          }
        }

        // Steel girder & tool pegboard on wall
        ctx.fillStyle = '#333028';
        ctx.strokeStyle = '#141210';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(22, 26, 62, 34, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(30, 32, 3.5, 18);
        ctx.fillRect(40, 34, 3.5, 14);
        ctx.fillRect(52, 32, 12, 3.5);

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
        ctx.beginPath();
        ctx.roundRect(172, 10, 28, 6, 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(176, 15, 20, 2);

        const cone = ctx.createLinearGradient(186, 16, 186, 115);
        cone.addColorStop(0, 'rgba(254, 240, 138, 0.26)');
        cone.addColorStop(1, 'rgba(254, 240, 138, 0.02)');
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(174, 16);
        ctx.lineTo(295, 118);
        ctx.lineTo(75, 118);
        ctx.lineTo(198, 16);
        ctx.closePath();
        ctx.fill();

        // Render Live HD Armored Bus right inside the Workshop!
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
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
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
        className="w-full sm:w-[380px] h-[116px] object-contain hd-canvas rounded border border-zinc-800"
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

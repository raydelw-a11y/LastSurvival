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

const WORLD_W = 2400;
const WORLD_H = 1480;

const ROAD_CACHES = [
  // Sector 1 (Norte, Centro y Sur)
  { id: 'cache_1', name: 'Gasolinera Texaco', x: 9, y: 39, coins: 45, fuel: 3 },
  { id: 'cache_2', name: 'Cabaña Guardabosques Norte', x: 15, y: 18, coins: 65, fuel: 3 },
  { id: 'cache_3', name: 'Embarcadero del Pantano', x: 17, y: 82, coins: 70, fuel: 3 },
  { id: 'cache_4', name: 'Granero Abandonado', x: 24, y: 50, coins: 75, fuel: 2 },
  // Sector 2 (Norte, Centro y Sur)
  { id: 'cache_5', name: 'Vagoneta de la Mina Norte', x: 32, y: 34, coins: 90, fuel: 3 },
  { id: 'cache_6', name: 'Almacén Pesquero Sur', x: 32, y: 66, coins: 95, fuel: 3 },
  { id: 'cache_7', name: 'Subestación de la Presa', x: 39, y: 16, coins: 115, fuel: 4 },
  { id: 'cache_8', name: 'Torre Petrolera Ruta 66', x: 38, y: 51, coins: 110, fuel: 3 },
  { id: 'cache_9', name: 'Faro de la Costa Sur', x: 41, y: 84, coins: 125, fuel: 4 },
  // Sector 3 (Norte, Centro y Sur)
  { id: 'cache_10', name: 'Control del Puente', x: 48, y: 50, coins: 135, fuel: 4 },
  { id: 'cache_11', name: 'Antena Sierra Norte', x: 55, y: 29, coins: 150, fuel: 4 },
  { id: 'cache_12', name: 'Contenedor Blindado Sur', x: 55, y: 70, coins: 155, fuel: 4 },
  { id: 'cache_13', name: 'Furgón Policial SWAT', x: 63, y: 36, coins: 175, fuel: 4 },
  { id: 'cache_14', name: 'Vagón de Metro Sur', x: 64, y: 72, coins: 180, fuel: 4 },
  // Sector 4 (Norte, Centro y Sur)
  { id: 'cache_15', name: 'Convoy Ártico Norte', x: 78, y: 26, coins: 210, fuel: 5 },
  { id: 'cache_16', name: 'Lancha Patrullera Sur', x: 78, y: 74, coins: 215, fuel: 5 },
  { id: 'cache_17', name: 'Arsenal del Búnker', x: 85, y: 24, coins: 235, fuel: 5 },
  { id: 'cache_18', name: 'Hangar Secreto Omega', x: 92, y: 58, coins: 265, fuel: 5 },
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

  // Bake static 2400x1480 Continent once + Animate Live Weather, Rivers, Ocean, Flares & Reactor!
  useEffect(() => {
    if (!bakedMapRef.current) {
      const MAP_SCALE = 1.35;
      const off = document.createElement('canvas');
      off.width = Math.round(WORLD_W * MAP_SCALE);
      off.height = Math.round(WORLD_H * MAP_SCALE);
      const bctx = off.getContext('2d')!;
      bctx.scale(MAP_SCALE, MAP_SCALE);
      bctx.imageSmoothingEnabled = true;

      // 1. Regional West-to-East Biome Grounds
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

      // 1B. North-to-South Elevation Tint (Snowy Alpine Highlands at Top, Muddy Bayou & Coast at Bottom)
      const nsGrad = bctx.createLinearGradient(0, 0, 0, WORLD_H);
      nsGrad.addColorStop(0, 'rgba(203, 213, 225, 0.24)');
      nsGrad.addColorStop(0.18, 'rgba(148, 163, 184, 0.08)');
      nsGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      nsGrad.addColorStop(0.82, 'rgba(20, 45, 38, 0.22)');
      nsGrad.addColorStop(1, 'rgba(12, 34, 52, 0.55)');
      bctx.fillStyle = nsGrad;
      bctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // Southern Ocean / Infected Bay Shoreline along the bottom edge (y = 1355..1480)
      bctx.fillStyle = '#857352';
      bctx.beginPath();
      bctx.moveTo(0, 1345);
      for (let sx = 0; sx <= WORLD_W; sx += 120) {
        const waveY = 1348 + Math.sin(sx * 0.008) * 18;
        bctx.lineTo(sx, waveY);
      }
      bctx.lineTo(WORLD_W, WORLD_H);
      bctx.lineTo(0, WORLD_H);
      bctx.closePath();
      bctx.fill();

      const seaGrad = bctx.createLinearGradient(0, 1358, 0, WORLD_H);
      seaGrad.addColorStop(0, '#164e63');
      seaGrad.addColorStop(0.45, '#0f3446');
      seaGrad.addColorStop(1, '#081e2b');
      bctx.fillStyle = seaGrad;
      bctx.beginPath();
      bctx.moveTo(0, 1362);
      for (let sx = 0; sx <= WORLD_W; sx += 120) {
        const waveY = 1365 + Math.sin(sx * 0.008) * 18;
        bctx.lineTo(sx, waveY);
      }
      bctx.lineTo(WORLD_W, WORLD_H);
      bctx.lineTo(0, WORLD_H);
      bctx.closePath();
      bctx.fill();

      // Northern Alpine Snowy Mountain Ridges along the top border (y = 0..175)
      for (let m = 0; m < 22; m++) {
        const mx = m * 116 - 20;
        const mw = 155 + (m % 3) * 28;
        const mh = 95 + (m % 4) * 24;
        bctx.fillStyle = m % 2 === 0 ? '#334155' : '#3f4959';
        bctx.strokeStyle = '#0f172a';
        bctx.lineWidth = 2;
        bctx.beginPath();
        bctx.moveTo(mx, 145);
        bctx.lineTo(mx + mw * 0.5, 145 - mh);
        bctx.lineTo(mx + mw, 145);
        bctx.closePath();
        bctx.fill();
        bctx.stroke();

        // Snow cap
        bctx.fillStyle = '#e2e8f0';
        bctx.beginPath();
        bctx.moveTo(mx + mw * 0.5, 145 - mh);
        bctx.lineTo(mx + mw * 0.67, 145 - mh * 0.62);
        bctx.lineTo(mx + mw * 0.52, 145 - mh * 0.54);
        bctx.lineTo(mx + mw * 0.33, 145 - mh * 0.62);
        bctx.closePath();
        bctx.fill();
      }

      // Organic topographic contour plateaus & southern swamp lagoons
      for (let i = 0; i < 95; i++) {
        const px = 70 + ((i * 173) % (WORLD_W - 140));
        const py = 140 + ((i * 131) % (WORLD_H - 300));
        bctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
        bctx.beginPath();
        bctx.ellipse(px, py, 68 + (i % 5) * 18, 36 + (i % 4) * 14, (i % 3) * 0.25, 0, Math.PI * 2);
        bctx.fill();
      }

      // Southern Bayou Marsh Ponds (Sector 1 & 2 South)
      [
        { x: 290, y: 1150, rx: 68, ry: 28 },
        { x: 470, y: 1240, rx: 56, ry: 24 },
        { x: 840, y: 1185, rx: 64, ry: 26 },
      ].forEach((pond) => {
        bctx.fillStyle = '#1b3b36';
        bctx.strokeStyle = '#0f2420';
        bctx.lineWidth = 2;
        bctx.beginPath();
        bctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0.08, 0, Math.PI * 2);
        bctx.fill();
        bctx.stroke();
      });

      // Sector Borders & Crisp Tactical Headers (Missions 1..24)
      const sectors = [
        { x: 35, label: 'SECTOR 1: CUMBRES, BOSQUE Y PANTANO (M1-M6)' },
        { x: 640, label: 'SECTOR 2: MINA NORTE, RUTA 66 Y BAHÍA (M7-M12)' },
        { x: 1235, label: 'SECTOR 3: SIERRA, CIUDAD MUERTA Y PUERTO (M13-M18)' },
        { x: 1835, label: 'SECTOR 4: RADAR ÁRTICO, BASE NAVAL Y CERO (M19-M24)' },
      ];
      bctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
      bctx.lineWidth = 2.2;
      bctx.setLineDash([10, 10]);
      [610, 1205, 1800].forEach((sx) => {
        bctx.beginPath();
        bctx.moveTo(sx, 0);
        bctx.lineTo(sx, WORLD_H);
        bctx.stroke();
      });
      bctx.setLineDash([]);

      sectors.forEach((s) => {
        bctx.fillStyle = 'rgba(14, 16, 12, 0.86)';
        bctx.beginPath();
        bctx.roundRect(s.x, 54, 415, 26, 6);
        bctx.fill();
        bctx.strokeStyle = '#a39e77';
        bctx.lineWidth = 1.5;
        bctx.stroke();
        bctx.fillStyle = '#fde047';
        bctx.font = '800 11.5px "Chakra Petch", sans-serif';
        bctx.fillText(s.label, s.x + 12, 71);
      });

      // 2. Two Winding North-to-South Rivers emptying into the Southern Bay
      [1175, 1775].forEach((rx) => {
        const drawRiverCurve = () => {
          bctx.beginPath();
          bctx.moveTo(rx, -10);
          bctx.bezierCurveTo(rx - 75, 460, rx + 85, 960, rx - 25, 1395);
        };
        bctx.lineCap = 'round';
        bctx.strokeStyle = '#14120e';
        bctx.lineWidth = 50;
        drawRiverCurve();
        bctx.stroke();

        bctx.strokeStyle = '#78684a';
        bctx.lineWidth = 44;
        drawRiverCurve();
        bctx.stroke();

        bctx.strokeStyle = '#153142';
        bctx.lineWidth = 36;
        drawRiverCurve();
        bctx.stroke();

        bctx.strokeStyle = '#285875';
        bctx.lineWidth = 19;
        drawRiverCurve();
        bctx.stroke();
      });

      // Hydroelectric Concrete Dam in Northern Gorge (near Mission 10)
      bctx.fillStyle = '#64748b';
      bctx.strokeStyle = '#0f172a';
      bctx.lineWidth = 2.2;
      bctx.beginPath();
      bctx.roundRect(1010, 168, 92, 34, 4);
      bctx.fill();
      bctx.stroke();
      bctx.fillStyle = '#38bdf8';
      bctx.fillRect(1024, 198, 64, 14);

      // 3. Vector-Inked Pines across Northern Forests, Valleys & Ridges
      const drawPineHD = (px: number, py: number, scale = 1, snowy = false) => {
        bctx.fillStyle = 'rgba(0,0,0,0.34)';
        bctx.beginPath();
        bctx.ellipse(px + 2 * scale, py + 6 * scale, 9 * scale, 4 * scale, 0, 0, Math.PI * 2);
        bctx.fill();

        bctx.fillStyle = '#3b2618';
        bctx.fillRect(px - 2 * scale, py + 1 * scale, 4 * scale, 6 * scale);

        const tiers = [
          { yOff: 2, w: 10, h: 11, fill: snowy ? '#334e4b' : '#1e2c18' },
          { yOff: -4, w: 8.2, h: 10, fill: snowy ? '#476b66' : '#2c4022' },
          { yOff: -10, w: 6, h: 9, fill: snowy ? '#cbd5e1' : '#3f5931' },
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

      for (let i = 0; i < 310; i++) {
        const fx = 30 + ((i * 127) % (WORLD_W - 60));
        const fy = 115 + ((i * 97) % (WORLD_H - 275));
        if (Math.abs(fy - 740) > 55) {
          drawPineHD(fx, fy, 1.05 + (i % 3) * 0.12, fy < 290);
        }
      }

      // Sector 1 Center: Inked Red Farm Barn + Cylindrical Grain Silo (near M5)
      bctx.fillStyle = 'rgba(0,0,0,0.35)';
      bctx.beginPath();
      bctx.ellipse(440, 710, 44, 11, 0, 0, Math.PI * 2);
      bctx.fill();
      bctx.fillStyle = '#881d1d';
      bctx.strokeStyle = '#14110f';
      bctx.lineWidth = 2;
      bctx.fillRect(410, 678, 50, 32);
      bctx.strokeRect(410, 678, 50, 32);
      bctx.beginPath();
      bctx.moveTo(404, 680);
      bctx.lineTo(435, 660);
      bctx.lineTo(466, 680);
      bctx.closePath();
      bctx.fillStyle = '#b91c1c';
      bctx.fill();
      bctx.stroke();
      bctx.fillStyle = '#cbd5e1';
      bctx.fillRect(466, 656, 18, 52);
      bctx.strokeRect(466, 656, 18, 52);

      // Sector 2: Oil Derricks & Refinery Storage Tanks (Center & South Coast)
      [
        { x: 920, y: 780 },
        { x: 1045, y: 730 },
        { x: 1090, y: 845 },
        { x: 1030, y: 1245 },
      ].forEach((oil) => {
        bctx.fillStyle = 'rgba(0,0,0,0.35)';
        bctx.beginPath();
        bctx.ellipse(oil.x + 12, oil.y + 3, 18, 6, 0, 0, Math.PI * 2);
        bctx.fill();

        bctx.fillStyle = '#3f3f46';
        bctx.strokeStyle = '#121214';
        bctx.lineWidth = 2;
        bctx.beginPath();
        bctx.roundRect(oil.x, oil.y - 40, 26, 40, 3);
        bctx.fill();
        bctx.stroke();
        bctx.fillStyle = '#dc2626';
        bctx.fillRect(oil.x + 1, oil.y - 29, 24, 5);
      });

      // Southern Wooden Fishing Pier & Container Port Docks (S2 & S3 South)
      [860, 1415, 1965].forEach((dx) => {
        bctx.fillStyle = '#5c4028';
        bctx.strokeStyle = '#1c130b';
        bctx.lineWidth = 2;
        bctx.fillRect(dx - 16, 1325, 32, 72);
        bctx.strokeRect(dx - 16, 1325, 32, 72);
      });

      // Sector 3 North: Observatory Dome (near M14) & State Prison (near M16)
      bctx.fillStyle = '#e2e8f0';
      bctx.strokeStyle = '#0f172a';
      bctx.lineWidth = 2.2;
      bctx.beginPath();
      bctx.arc(1415, 215, 26, Math.PI, 0);
      bctx.closePath();
      bctx.fill();
      bctx.stroke();
      bctx.fillStyle = '#475569';
      bctx.fillRect(1389, 215, 52, 22);
      bctx.strokeRect(1389, 215, 52, 22);

      // Sector 3 Center & South: Ruined City Skyscrapers, Hospital & Port Containers
      const cityBlocks = [
        { x: 1480, y: 660, w: 48, h: 78 },
        { x: 1545, y: 635, w: 58, h: 98 },
        { x: 1625, y: 675, w: 50, h: 72 },
        { x: 1520, y: 815, w: 62, h: 86 },
        { x: 1605, y: 830, w: 52, h: 78 },
        { x: 1585, y: 295, w: 66, h: 64 },
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
        for (let wy = b.y + 15; wy < b.y + b.h - 8; wy += 12) {
          for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 12) {
            bctx.fillStyle = (wx + wy + idx) % 5 === 0 ? '#f59e0b' : '#18181b';
            bctx.fillRect(wx, wy, 6, 6);
          }
        }
        if (idx === 3) {
          bctx.fillStyle = '#ef4444';
          bctx.fillRect(b.x + 26, b.y - 14, 10, 14);
          bctx.fillRect(b.x + 22, b.y - 10, 18, 6);
        }
      });

      // Port Shipping Containers (Sector 3 South)
      [
        { x: 1360, y: 1210, c: '#b91c1c' },
        { x: 1396, y: 1210, c: '#1d4ed8' },
        { x: 1378, y: 1192, c: '#ca8a04' },
      ].forEach((cnt) => {
        bctx.fillStyle = cnt.c;
        bctx.strokeStyle = '#09090b';
        bctx.lineWidth = 1.8;
        bctx.fillRect(cnt.x, cnt.y, 32, 16);
        bctx.strokeRect(cnt.x, cnt.y, 32, 16);
      });

      // Sector 4: Arctic Radar Base (North), Bunkers, Helipad (South-Center) & Naval Shipyard (South)
      bctx.fillStyle = '#3f4739';
      bctx.strokeStyle = '#141612';
      bctx.lineWidth = 2.2;
      bctx.beginPath();
      bctx.roundRect(2040, 480, 84, 52, 6);
      bctx.fill();
      bctx.stroke();

      bctx.fillStyle = 'rgba(24, 24, 27, 0.84)';
      bctx.beginPath();
      bctx.roundRect(2080, 920, 74, 74, 8);
      bctx.fill();
      bctx.strokeStyle = '#eab308';
      bctx.lineWidth = 2;
      bctx.strokeRect(2086, 926, 62, 62);
      bctx.fillStyle = '#eab308';
      bctx.font = '800 24px "Chakra Petch", sans-serif';
      bctx.fillText('H', 2108, 966);

      // 4. Multi-Branch Interstate & Mountain/Coastal Highway Network connecting all 24 Missions!
      const nodeById = new Map<number, MissionNode>();
      MISSION_NODES.forEach((m) => nodeById.set(m.id, m));

      const drawAllRoadEdges = (stroke: string, width: number, dash: number[] = []) => {
        bctx.strokeStyle = stroke;
        bctx.lineWidth = width;
        bctx.lineCap = 'round';
        bctx.lineJoin = 'round';
        bctx.setLineDash(dash);
        bctx.beginPath();
        MISSION_NODES.forEach((m) => {
          const x1 = (m.mapX / 100) * WORLD_W;
          const y1 = (m.mapY / 100) * WORLD_H;
          m.connectedTo.forEach((targetId) => {
            const target = nodeById.get(targetId);
            if (!target) return;
            const x2 = (target.mapX / 100) * WORLD_W;
            const y2 = (target.mapY / 100) * WORLD_H;
            const cx = (x1 + x2) * 0.5;
            const cy = (y1 + y2) * 0.5 + ((m.id + targetId) % 2 === 0 ? -18 : 18);
            bctx.moveTo(x1, y1);
            bctx.quadraticCurveTo(cx, cy, x2, y2);
          });
        });
        bctx.stroke();
        bctx.setLineDash([]);
      };

      drawAllRoadEdges('#121215', 36);
      drawAllRoadEdges('#57534e', 30);
      drawAllRoadEdges('#33363d', 23);
      drawAllRoadEdges('#facc15', 2.4, [11, 10]);

      bakedMapRef.current = off;
    }

    let rafId: number;
    let lastDraw = 0;

    const animateMap = (now: number) => {
      rafId = requestAnimationFrame(animateMap);
      if (now - lastDraw < 42) return;
      lastDraw = now;

      const canvas = mapCanvasRef.current;
      const baked = bakedMapRef.current;
      if (!canvas || !baked) return;
      const ctx = syncCanvasHiDPI(canvas, WORLD_W, WORLD_H, 1.5);
      if (!ctx) return;

      const t = now * 0.001;
      ctx.drawImage(baked, 0, 0, WORLD_W, WORLD_H);

      // A. Flowing water current streaks along both North-to-South rivers + Southern Bay waves
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.32)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 28]);
      ctx.lineDashOffset = -t * 30;
      [1175, 1775].forEach((rx) => {
        ctx.beginPath();
        ctx.moveTo(rx, -10);
        ctx.bezierCurveTo(rx - 75, 460, rx + 85, 960, rx - 25, 1395);
        ctx.stroke();
      });

      // Southern Bay Gentle Sea Foam Shimmer
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([28, 38]);
      ctx.lineDashOffset = t * 18;
      ctx.beginPath();
      ctx.moveTo(0, 1385);
      for (let sx = 0; sx <= WORLD_W; sx += 120) {
        ctx.lineTo(sx, 1388 + Math.sin(sx * 0.008 + t * 1.5) * 12);
      }
      ctx.stroke();
      ctx.restore();

      // B. Flickering Refinery Gas Flares & Smoke Plumes (Sector 2 Center & South)
      [
        { x: 920, y: 780 },
        { x: 1045, y: 730 },
        { x: 1090, y: 845 },
        { x: 1030, y: 1245 },
      ].forEach((oil, idx) => {
        const flk = Math.round(Math.sin(t * 15 + idx * 2) * 3);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(oil.x + 5, oil.y - 50 - flk, 14, 12 + flk);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(oil.x + 8, oil.y - 56 - flk, 8, 8);

        const puffShift = (t * 22 + idx * 14) % 44;
        ctx.fillStyle = 'rgba(20, 20, 23, 0.42)';
        ctx.fillRect(oil.x + 3 - puffShift * 0.2, oil.y - 68 - puffShift, 18, 12);
      });

      // C. Pulsing Biohazard Reactor Dome (Mission 24) & Arctic Radar Sweep (Mission 20 North)
      const pulseR = 46 + Math.sin(t * 4) * 6;
      const radGrad = ctx.createRadialGradient(2280, 740, 10, 2280, 740, pulseR + 28);
      radGrad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
      radGrad.addColorStop(0.45, 'rgba(220, 38, 38, 0.78)');
      radGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(2280, 740, pulseR + 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.42)';
      ctx.lineWidth = 2.2;
      const sweepR = 16 + ((t * 40) % 85);
      ctx.beginPath();
      ctx.arc(1968, 207, sweepR, 0, Math.PI * 2);
      ctx.stroke();

      // D. Soft Drifting Cloud Shadows across North, Center & South
      ctx.fillStyle = 'rgba(0, 0, 0, 0.11)';
      for (let c = 0; c < 9; c++) {
        const cx = ((c * 340 + t * 18) % (WORLD_W + 280)) - 140;
        const cy = 160 + ((c * 165) % (WORLD_H - 300));
        ctx.beginPath();
        ctx.ellipse(cx, cy, 110, 42, 0, 0, Math.PI * 2);
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
          const nx = Math.max(4, Math.min(97, prev.x + dx * 0.8));
          const ny = Math.max(8, Math.min(92, prev.y + dy * 0.95));

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
    const leftPositions = [0, 580, 1180, 1760];
    container.scrollTo({
      left: leftPositions[sectorIdx] || 0,
      top: Math.max(0, WORLD_H * 0.5 - container.clientHeight * 0.5),
      behavior: 'smooth',
    });
  };

  const panVerticalBand = (band: 'north' | 'center' | 'south') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setZoomedOut(false);
    const targetY =
      band === 'north'
        ? 0
        : band === 'center'
        ? Math.max(0, WORLD_H * 0.5 - container.clientHeight * 0.5)
        : Math.max(0, WORLD_H - container.clientHeight);
    container.scrollTo({
      left: container.scrollLeft,
      top: targetY,
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
      {/* SCROLLABLE / PANNABLE GIANT 2400x1480 CAMPAIGN WORLD MAP              */}
      {/* ===================================================================== */}
      <div
        ref={scrollContainerRef}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') return;
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
          if (e.pointerType !== 'mouse') return;
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
          zoomedOut
            ? 'overflow-hidden'
            : 'overflow-auto touch-auto overscroll-contain cursor-grab active:cursor-grabbing'
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
      {/* RIGHT-EDGE VERTICAL NORTH / CENTER / SOUTH QUICK COMPASS (MOBILE+PC)  */}
      {/* ===================================================================== */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-zinc-950/90 border border-zinc-700 p-1 rounded-lg shadow-xl">
        <button
          onClick={() => panVerticalBand('north')}
          className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-sky-500 hover:text-zinc-950 text-[9px] font-extrabold text-sky-200 transition cursor-pointer"
          title="Desplazar hacia el Norte (Cumbres y Montañas)"
        >
          ⬆ N
        </button>
        <button
          onClick={() => panVerticalBand('center')}
          className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-yellow-400 hover:text-zinc-950 text-[9px] font-extrabold text-yellow-300 transition cursor-pointer"
          title="Ir a la Autopista Central"
        >
          ● C
        </button>
        <button
          onClick={() => panVerticalBand('south')}
          className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-[9px] font-extrabold text-emerald-200 transition cursor-pointer"
          title="Desplazar hacia el Sur (Pantanos y Puerto)"
        >
          ⬇ S
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

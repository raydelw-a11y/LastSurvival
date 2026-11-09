import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MissionNode,
  PlayerProgress,
  SURVIVOR_CONFIGS,
  SurvivorType,
  TACTICAL_ITEM_CONFIGS,
  TacticalItemType,
  ZOMBIE_CONFIGS,
  ZombieType,
} from '../types/game';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  ROAD_Y_MAX,
  ROAD_Y_MIN,
  RenderCrow,
  RenderFireZone,
  RenderFloatingText,
  RenderObstacle,
  RenderParticle,
  RenderPickup,
  RenderUnit,
  renderArmoredBus,
  renderBarricade,
  renderBiomeBackground,
  renderCrow,
  renderDropPickup,
  renderTacticalObstacle,
  renderUnitSprite,
} from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';
import {
  Crosshair,
  Flame,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Skull,
  Volume2,
  VolumeX,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface BattleArenaProps {
  mission: MissionNode;
  progress: PlayerProgress;
  onVictory: (stars: number, coinsEarned: number, zombiesKilled: number) => void;
  onRetreat: () => void;
}

interface InternalUnit extends RenderUnit {
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  isRanged: boolean;
  pellets: number;
  ammo: number;
  maxAmmo: number;
  reloadTime: number;
  reloadTimer: number;
  knockback: number;
  bulletResist: number;
  barricadeMultiplier: number;
  infectedZombieType?: ZombieType;
  critChance: number;
  critMultiplier: number;
  explodesOnDeath?: boolean;
  rageReward?: number;
  courageDropChance?: number;
}

const SURVIVOR_ORDER: SurvivorType[] = ['redneck', 'farmer', 'builder', 'policeman', 'mechanic'];
const TACTICAL_ORDER: TacticalItemType[] = ['blue_barrel', 'red_barrel', 'medkit'];

export const BattleArena: React.FC<BattleArenaProps> = ({
  mission,
  progress,
  onVictory,
  onRetreat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // HUD Reactive State
  const [courage, setCourage] = useState<number>(45);
  const [rage, setRage] = useState<number>(0);
  const [busHp, setBusHp] = useState<number>(200 + progress.busHpBonus);
  const maxBusHp = 200 + progress.busHpBonus;
  const [barricadeHp, setBarricadeHp] = useState<number>(mission.barricadeHp);
  const maxBarricadeHp = mission.barricadeHp;
  const [unitCooldowns, setUnitCooldowns] = useState<Record<SurvivorType, number>>({
    redneck: 0,
    farmer: 0,
    builder: 0,
    policeman: 0,
    mechanic: 0,
  });
  const [itemCooldowns, setItemCooldowns] = useState<Record<TacticalItemType, number>>({
    blue_barrel: 0,
    red_barrel: 0,
    medkit: 0,
  });
  const [billBarrageCharge, setBillBarrageCharge] = useState<number>(35);
  const [timeRemaining, setTimeRemaining] = useState<number>(135);
  const [hordeTriggered, setHordeTriggered] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(soundFX.muted);
  const [draggingItem, setDraggingItem] = useState<TacticalItemType | null>(null);
  const [controlledUnitName, setControlledUnitName] = useState<string>('Auto / WASD listo');
  const [battleResult, setBattleResult] = useState<'none' | 'victory' | 'defeat'>('none');
  const [starsEarned, setStarsEarned] = useState<number>(3);
  const [zombiesKilledCount, setZombiesKilledCount] = useState<number>(0);

  // Mutable Simulation Ref
  const simRef = useRef({
    time: 0,
    courage: 45,
    rage: 0,
    busHp: 200 + progress.busHpBonus,
    maxBusHp: 200 + progress.busHpBonus,
    busDamagedEver: false,
    busX: 14,
    busY: 206,
    doorOpenTimer: 0,
    barricadeHp: mission.barricadeHp,
    maxBarricadeHp: mission.barricadeHp,
    barricadeX: 576,
    barricadeShake: 0,
    billShotTimer: 1.5,
    billFiringVisual: 0,
    billBarrageCharge: 35,
    billBarrageActiveTimer: 0,
    unitCooldowns: {
      redneck: 0,
      farmer: 0,
      builder: 0,
      policeman: 0,
      mechanic: 0,
    } as Record<SurvivorType, number>,
    itemCooldowns: {
      blue_barrel: 0,
      red_barrel: 0,
      medkit: 0,
    } as Record<TacticalItemType, number>,
    units: [] as InternalUnit[],
    obstacles: [] as RenderObstacle[],
    pickups: [] as RenderPickup[],
    crows: [
      { x: 280, y: 235, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 0 },
      { x: 305, y: 256, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 1.7 },
      { x: 410, y: 222, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 3.1 },
    ] as RenderCrow[],
    particles: [] as RenderParticle[],
    floatingTexts: [] as RenderFloatingText[],
    fireZones: [] as RenderFireZone[],
    keysPressed: new Set<string>(),
    selectedUnitId: null as string | null,
    mouseLogical: { x: 320, y: 250, insideRoad: false },
    draggingItem: null as TacticalItemType | null,
    waveTimer: 1.8,
    skeletonTimer: mission.skeletonAmbush ? 9.0 : 9999,
    courageTickTimer: 0,
    timeRemaining: 135,
    hordeTriggered: false,
    screenShake: 0,
    hitStopTimer: 0,
    phase: 'combat' as 'combat' | 'bus_ramming' | 'victory' | 'defeat',
    zombiesKilled: 0,
  });

  // Paint initial asphalt cracks & tire marks onto the persistent Decal Buffer
  const initDecalCanvas = useCallback(() => {
    if (!decalCanvasRef.current) {
      decalCanvasRef.current = document.createElement('canvas');
      decalCanvasRef.current.width = LOGICAL_WIDTH;
      decalCanvasRef.current.height = LOGICAL_HEIGHT;
    }
    const dctx = decalCanvasRef.current.getContext('2d');
    if (!dctx) return;
    dctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Pre-bake skid marks and old oil stains on the road
    dctx.fillStyle = 'rgba(15, 15, 20, 0.35)';
    for (let i = 0; i < 10; i++) {
      const sx = 120 + i * 44;
      const sy = 200 + ((i * 29) % 90);
      dctx.fillRect(sx, sy, 26, 3);
      dctx.fillRect(sx + 4, sy + 12, 22, 3);
    }
  }, []);

  const stampBloodDecal = useCallback((x: number, y: number, radius = 6, color = '#7f1d1d') => {
    const dctx = decalCanvasRef.current?.getContext('2d');
    if (!dctx) return;
    dctx.fillStyle = color;
    const rx = Math.round(x);
    const ry = Math.round(Math.max(ROAD_Y_MIN, Math.min(ROAD_Y_MAX + 6, y)));
    dctx.fillRect(rx - radius, ry - Math.round(radius * 0.45), radius * 2, Math.max(2, Math.round(radius * 0.9)));
    dctx.fillRect(rx - Math.round(radius * 0.6), ry - radius + 1, Math.round(radius * 1.2), radius * 2 - 2);
  }, []);

  const stampScorchDecal = useCallback((x: number, y: number, radius = 20) => {
    const dctx = decalCanvasRef.current?.getContext('2d');
    if (!dctx) return;
    const rx = Math.round(x);
    const ry = Math.round(Math.max(ROAD_Y_MIN, Math.min(ROAD_Y_MAX + 4, y)));
    dctx.fillStyle = 'rgba(18, 16, 20, 0.62)';
    dctx.beginPath();
    dctx.ellipse(rx, ry, radius, radius * 0.48, 0, 0, Math.PI * 2);
    dctx.fill();
    dctx.fillStyle = 'rgba(68, 64, 60, 0.45)';
    dctx.beginPath();
    dctx.ellipse(rx, ry, radius * 0.6, radius * 0.28, 0, 0, Math.PI * 2);
    dctx.fill();
  }, []);

  const addFloatingText = useCallback(
    (text: string, x: number, y: number, z: number, color: string, isComic = false) => {
      simRef.current.floatingTexts.push({
        id: `${Math.random()}`,
        text,
        x,
        y,
        z,
        color,
        scale: isComic ? 1.35 : 1,
        life: isComic ? 0.85 : 0.7,
        maxLife: isComic ? 0.85 : 0.7,
        isComic,
      });
    },
    []
  );

  const spawnBloodParticles = useCallback((x: number, y: number, z: number, count = 12, isGreen = false) => {
    const colors = isGreen
      ? ['#84cc16', '#4d7c0f', '#a3e635']
      : ['#dc2626', '#991b1b', '#7f1d1d', '#ef4444'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 65;
      simRef.current.particles.push({
        x,
        y,
        z: z + 10 + Math.random() * 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd * 0.35,
        vz: 45 + Math.random() * 90,
        color: colors[i % colors.length],
        size: 2 + Math.floor(Math.random() * 2),
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        LeavesDecal: true,
      });
    }
  }, []);

  const scareCrows = useCallback(() => {
    simRef.current.crows.forEach((crow) => {
      if (!crow.flying) {
        crow.flying = true;
        crow.vx = 55 + Math.random() * 45;
        crow.vy = -25 - Math.random() * 20;
        crow.vz = 65 + Math.random() * 35;
      }
    });
  }, []);

  // Spawn a Zombie (from right barricade, ground emergence, or corpse reanimation)
  const spawnZombie = useCallback(
    (type: ZombieType, customX?: number, customY?: number, fromCorpse = false) => {
      const cfg = ZOMBIE_CONFIGS[type];
      const spawnX = customX ?? simRef.current.barricadeX - 18 + Math.random() * 14;
      const spawnY =
        customY ?? ROAD_Y_MIN + 10 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 20);
      const isEmerging = (cfg.emergesFromGround && customX !== undefined) || fromCorpse;

      const zUnit: InternalUnit = {
        id: `z_${Date.now()}_${Math.random()}`,
        team: 'zombie',
        subType: type,
        x: spawnX,
        y: spawnY,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: cfg.baseHp,
        maxHp: cfg.baseHp,
        damage: cfg.baseDamage,
        speed: cfg.speed * (0.92 + Math.random() * 0.16),
        attackRange: cfg.attackRange,
        attackCooldown: cfg.attackCooldown,
        attackTimer: 0,
        isRanged: false,
        pellets: 1,
        ammo: 1,
        maxAmmo: 1,
        reloadTime: 0,
        reloadTimer: 0,
        knockback: 12,
        bulletResist: cfg.bulletResist ?? 0,
        barricadeMultiplier: 1,
        critChance: cfg.critChance,
        critMultiplier: cfg.critMultiplier,
        explodesOnDeath: cfg.explodesOnDeath,
        rageReward: cfg.rageReward,
        courageDropChance: cfg.courageDropChance,
        state: isEmerging ? 'emerging' : 'march',
        animTime: 0,
        attackProgress: 0,
        reloadProgress: 0,
        whiteFlashTimer: 0,
        isLucky: false,
        isPlayerControlled: false,
        facing: -1,
      };
      simRef.current.units.push(zUnit);
    },
    []
  );

  // Deploy a Survivor from the Yellow School Bus
  const deploySurvivor = useCallback(
    (type: SurvivorType) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || paused) return;
      const cfg = SURVIVOR_CONFIGS[type];
      if (sim.courage < cfg.cost || sim.unitCooldowns[type] > 0) return;

      sim.courage -= cfg.cost;
      sim.unitCooldowns[type] = cfg.prepTime;
      sim.doorOpenTimer = 0.45;
      setCourage(Math.floor(sim.courage));
      setUnitCooldowns({ ...sim.unitCooldowns });

      soundFX.playUnitSpawn();
      scareCrows();

      const level = progress.unitLevels[type] || 1;
      const statMult = 1 + (level - 1) * 0.18;
      const hp = Math.round(cfg.baseHp * statMult);
      const damage = Math.round(cfg.baseDamage * statMult);
      const isLucky = Math.random() * 100 < cfg.fortune;

      const spawnY = ROAD_Y_MIN + 18 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 36);
      const quote = cfg.quotes[Math.floor(Math.random() * cfg.quotes.length)];

      // Mechanic Bus Repair passive on spawn!
      if (cfg.repairsBusOnSpawn) {
        const heal = cfg.repairsBusOnSpawn;
        sim.busHp = Math.min(sim.maxBusHp, sim.busHp + heal);
        setBusHp(sim.busHp);
        addFloatingText(`+🚌 ${heal} HP`, sim.busX + 95, sim.busY + 10, 20, '#38bdf8', true);
      }

      const newUnit: InternalUnit = {
        id: `s_${Date.now()}_${Math.random()}`,
        team: 'survivor',
        subType: type,
        x: sim.busX + 94,
        y: spawnY,
        z: 8,
        vx: 25,
        vy: 0,
        vz: 20,
        hp,
        maxHp: hp,
        damage,
        speed: cfg.speed * (isLucky ? 1.15 : 1),
        attackRange: cfg.attackRange,
        attackCooldown: cfg.attackCooldown * (isLucky ? 0.78 : 1),
        attackTimer: 0,
        isRanged: cfg.isRanged,
        pellets: cfg.pellets ?? 1,
        ammo: cfg.magSize ?? 1,
        maxAmmo: cfg.magSize ?? 1,
        reloadTime: cfg.reloadTime ?? 0,
        reloadTimer: 0,
        knockback: cfg.knockback,
        bulletResist: cfg.bulletResist ?? 0,
        barricadeMultiplier: cfg.barricadeMultiplier ?? 1,
        infectedZombieType: cfg.infectedZombieType,
        critChance: (cfg.fortune / 100) * (isLucky ? 1.6 : 1),
        critMultiplier: 1.8,
        state: 'march',
        animTime: 0,
        attackProgress: 0,
        reloadProgress: 0,
        whiteFlashTimer: 0,
        isLucky,
        isPlayerControlled: false,
        facing: 1,
        quoteText: isLucky ? `★ ${quote}` : quote,
        quoteTimer: 2.2,
        firstHitReady: !!cfg.firstHitCritMultiplier,
      };

      // If no survivor is currently selected for WASD control, auto-assign this one!
      const hasAliveControlled = sim.units.some(
        (u) => u.team === 'survivor' && u.state !== 'corpse' && u.id === sim.selectedUnitId
      );
      if (!hasAliveControlled) {
        sim.units.forEach((u) => (u.isPlayerControlled = false));
        newUnit.isPlayerControlled = true;
        sim.selectedUnitId = newUnit.id;
        setControlledUnitName(`${cfg.name} [WASD]`);
      }

      sim.units.push(newUnit);
    },
    [addFloatingText, paused, progress.unitLevels, scareCrows]
  );

  // Trigger explosion (from Red Barrel or Bloated Zombie)
  const triggerExplosion = useCallback(
    (x: number, y: number, radius: number, damage: number, leavesFire: boolean) => {
      const sim = simRef.current;
      soundFX.playExplosion();
      sim.screenShake = 8;
      sim.hitStopTimer = 0.05;
      stampScorchDecal(x, y, radius * 0.7);
      addFloatingText('BOOM!', x, y, 24, '#f97316', true);

      // Fire & smoke burst particles
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 90;
        sim.particles.push({
          x,
          y,
          z: 6 + Math.random() * 14,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.4,
          vz: 50 + Math.random() * 110,
          color: i % 3 === 0 ? '#fde047' : i % 2 === 0 ? '#f97316' : '#dc2626',
          size: 3 + (i % 3),
          life: 0.4 + Math.random() * 0.4,
          maxLife: 0.8,
        });
      }

      if (leavesFire) {
        sim.fireZones.push({
          x,
          y,
          radius: radius * 0.85,
          duration: 6.5,
        });
      }

      // Damage all units (including corpses!) inside blast radius
      sim.units.forEach((u) => {
        const dx = u.x - x;
        const dy = (u.y - y) * 1.4;
        const dist = Math.hypot(dx, dy);
        if (dist <= radius) {
          if (u.state === 'corpse') {
            // Incinerate corpse so it cannot reanimate as a zombie!
            u.hp = -999;
            u.corpseTimer = -999;
            addFloatingText('PURGADO!', u.x, u.y, 12, '#a3e635');
          } else {
            u.hp -= damage;
            u.whiteFlashTimer = 0.12;
            u.vx += (dx >= 0 ? 1 : -1) * 65;
            addFloatingText(`-${damage}`, u.x, u.y, 18, '#f97316');
            if (u.hp <= 0) {
              // Killed by explosion disintegrates body (no post-mortem infection)
              u.infectedZombieType = undefined;
            }
          }
        }
      });
    },
    [addFloatingText, stampScorchDecal]
  );

  // Deploy Tactical Item (Barrel / Medkit) at target road coordinates
  const deployTacticalItem = useCallback(
    (type: TacticalItemType, targetX: number, targetY: number) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || paused) return;
      const cfg = TACTICAL_ITEM_CONFIGS[type];
      if (sim.rage < cfg.rageCost || sim.itemCooldowns[type] > 0) return;

      const clampedX = Math.max(150, Math.min(sim.barricadeX - 24, targetX));
      const clampedY = Math.max(ROAD_Y_MIN + 6, Math.min(ROAD_Y_MAX - 6, targetY));

      sim.rage -= cfg.rageCost;
      sim.itemCooldowns[type] = cfg.prepTime;
      setRage(Math.floor(sim.rage));
      setItemCooldowns({ ...sim.itemCooldowns });
      setDraggingItem(null);
      sim.draggingItem = null;

      if (type === 'medkit') {
        soundFX.playCouragePickup();
        sim.obstacles.push({
          id: `med_${Date.now()}`,
          type: 'medkit',
          x: clampedX,
          y: clampedY,
          z: 0,
          hp: 100,
          maxHp: 100,
          whiteFlashTimer: 0,
          healDuration: cfg.duration ?? 7,
        });
        addFloatingText('+BOTIQUÍN!', clampedX, clampedY, 18, '#22c55e', true);
        return;
      }

      // Blue or Red Barrel drops from the sky & crushes units in radius (including friendly fire!)
      soundFX.playBarricadeBash();
      sim.screenShake = 5;
      stampScorchDecal(clampedX, clampedY, 12);
      addFloatingText('SMASH!', clampedX, clampedY, 22, '#38bdf8', true);

      sim.units.forEach((u) => {
        const dx = u.x - clampedX;
        const dy = (u.y - clampedY) * 1.4;
        if (Math.hypot(dx, dy) <= cfg.radius) {
          if (u.state === 'corpse') {
            // Crushing an infected corpse destroys it before it turns into a zombie!
            u.hp = -999;
            u.corpseTimer = -999;
            spawnBloodParticles(u.x, u.y, 4, 14, true);
            addFloatingText('CRUSHED!', u.x, u.y, 14, '#a3e635', true);
          } else {
            u.hp -= cfg.impactDamage;
            u.whiteFlashTimer = 0.12;
            spawnBloodParticles(u.x, u.y, 8, 10);
            addFloatingText(
              `-${cfg.impactDamage}`,
              u.x,
              u.y,
              18,
              u.team === 'survivor' ? '#f43f5e' : '#facc15'
            );
          }
        }
      });

      sim.obstacles.push({
        id: `bar_${Date.now()}_${Math.random()}`,
        type,
        x: clampedX,
        y: clampedY,
        z: 0,
        hp: cfg.obstacleHp,
        maxHp: cfg.obstacleHp,
        whiteFlashTimer: 0,
      });
    },
    [addFloatingText, paused, spawnBloodParticles, stampScorchDecal]
  );

  // Trigger Sheriff Bill's Special Rifle Barrage from the Bus Roof
  const triggerBillBarrage = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase !== 'combat' || paused || sim.billBarrageCharge < 100) return;
    sim.billBarrageCharge = 0;
    sim.billBarrageActiveTimer = 2.4;
    setBillBarrageCharge(0);
    scareCrows();
    addFloatingText('¡RÁFAGA DE BILL!', sim.busX + 75, sim.busY - 30, 10, '#facc15', true);
  }, [addFloatingText, paused, scareCrows]);

  // Cycle WASD Selected Survivor
  const cycleSelectedSurvivor = useCallback(() => {
    const sim = simRef.current;
    const aliveSurvivors = sim.units.filter((u) => u.team === 'survivor' && u.state !== 'corpse');
    if (aliveSurvivors.length === 0) {
      sim.selectedUnitId = null;
      setControlledUnitName('Sin unidades vivas');
      return;
    }
    const idx = aliveSurvivors.findIndex((u) => u.id === sim.selectedUnitId);
    const next = aliveSurvivors[(idx + 1) % aliveSurvivors.length];
    sim.units.forEach((u) => (u.isPlayerControlled = u.id === next.id));
    sim.selectedUnitId = next.id;
    const cfg = SURVIVOR_CONFIGS[next.subType as SurvivorType];
    setControlledUnitName(`${cfg.name} [WASD]`);
    addFloatingText('CONTROL WASD', next.x, next.y, 28, '#22c55e');
  }, [addFloatingText]);

  // Keyboard Listeners (WASD movement + 1-5 Units + Q/W/E Barrels + Tab cycle + Space Bill Barrage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      simRef.current.keysPressed.add(key);

      if (key === '1') deploySurvivor('redneck');
      else if (key === '2') deploySurvivor('farmer');
      else if (key === '3') deploySurvivor('builder');
      else if (key === '4') deploySurvivor('policeman');
      else if (key === '5') deploySurvivor('mechanic');
      else if (key === 'q') {
        const m = simRef.current.mouseLogical;
        deployTacticalItem('blue_barrel', m.insideRoad ? m.x : 330, m.insideRoad ? m.y : 248);
      } else if (key === 'w' && e.shiftKey) {
        const m = simRef.current.mouseLogical;
        deployTacticalItem('red_barrel', m.insideRoad ? m.x : 360, m.insideRoad ? m.y : 248);
      } else if (key === 'e') {
        const m = simRef.current.mouseLogical;
        deployTacticalItem('medkit', m.insideRoad ? m.x : 280, m.insideRoad ? m.y : 248);
      } else if (key === 'tab') {
        e.preventDefault();
        cycleSelectedSurvivor();
      } else if (key === ' ') {
        e.preventDefault();
        triggerBillBarrage();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      simRef.current.keysPressed.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cycleSelectedSurvivor, deploySurvivor, deployTacticalItem, triggerBillBarrage]);

  // Convert client mouse/touch coordinates to logical 640x360 canvas coordinates
  const getLogicalCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 320, y: 245, insideRoad: false };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    const insideRoad = x >= 135 && x <= 575 && y >= ROAD_Y_MIN - 12 && y <= ROAD_Y_MAX + 12;
    return { x, y, insideRoad };
  };

  // Collect Courage/Rage drops when clicking or hovering over them on the road
  const tryCollectPickupsAt = (lx: number, ly: number) => {
    const sim = simRef.current;
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
      const p = sim.pickups[i];
      if (Math.hypot(p.x - lx, p.y - ly) <= 26) {
        soundFX.playCouragePickup();
        if (p.kind === 'courage') {
          sim.courage = Math.min(100, sim.courage + p.amount);
          setCourage(Math.floor(sim.courage));
          addFloatingText(`+${p.amount} VALOR`, p.x, p.y, 16, '#38bdf8', true);
        } else {
          sim.rage = Math.min(100, sim.rage + p.amount);
          setRage(Math.floor(sim.rage));
          addFloatingText(`+${p.amount} FURIA`, p.x, p.y, 16, '#ef4444', true);
        }
        sim.pickups.splice(i, 1);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getLogicalCoords(e.clientX, e.clientY);
    simRef.current.mouseLogical = coords;
    // Hovering over blue +25 Courage bottles picks them up immediately!
    tryCollectPickupsAt(coords.x, coords.y);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getLogicalCoords(e.clientX, e.clientY);
    simRef.current.mouseLogical = coords;

    // 1. Collect any pickup clicked
    tryCollectPickupsAt(coords.x, coords.y);

    // 2. If a Tactical Item is selected/dragged, drop it here on the road!
    if (simRef.current.draggingItem) {
      deployTacticalItem(simRef.current.draggingItem, coords.x, coords.y);
      return;
    }

    // 3. Click on any alive Survivor on the road to switch WASD direct control to them
    const sim = simRef.current;
    const clickedSurvivor = sim.units.find(
      (u) =>
        u.team === 'survivor' &&
        u.state !== 'corpse' &&
        Math.hypot(u.x - coords.x, u.y - 14 - coords.y) <= 22
    );
    if (clickedSurvivor) {
      sim.units.forEach((u) => (u.isPlayerControlled = u.id === clickedSurvivor.id));
      sim.selectedUnitId = clickedSurvivor.id;
      const cfg = SURVIVOR_CONFIGS[clickedSurvivor.subType as SurvivorType];
      setControlledUnitName(`${cfg.name} [WASD]`);
      addFloatingText('CONTROL WASD', clickedSurvivor.x, clickedSurvivor.y, 28, '#22c55e');
    }
  };

  // Main 60 FPS Simulation & Render Loop
  useEffect(() => {
    initDecalCanvas();
    // Spawn initial welcoming zombies near the barricade
    spawnZombie('walker', 500, 225);
    spawnZombie('walker', 535, 275);

    let animationFrameId: number;
    let lastTime = performance.now();
    let uiSyncAccumulator = 0;

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;

      if (!paused && sim.phase !== 'victory' && sim.phase !== 'defeat') {
        // Hit-Stop micro-freeze on heavy critical hits
        let dt = rawDt;
        if (sim.hitStopTimer > 0) {
          sim.hitStopTimer -= rawDt;
          dt = rawDt * 0.15;
        }

        sim.time += dt;
        uiSyncAccumulator += dt;

        if (sim.screenShake > 0) {
          sim.screenShake = Math.max(0, sim.screenShake - dt * 28);
        }
        if (sim.doorOpenTimer > 0) {
          sim.doorOpenTimer = Math.max(0, sim.doorOpenTimer - dt);
        }
        if (sim.barricadeShake > 0) {
          sim.barricadeShake = Math.max(0, sim.barricadeShake - dt * 5);
        }
        if (sim.billFiringVisual > 0) {
          sim.billFiringVisual = Math.max(0, sim.billFiringVisual - dt);
        }

        // =======================================================
        // PHASE: BUS RAMMING VICTORY CLIMAX (Video [00:07:20])
        // =======================================================
        if (sim.phase === 'bus_ramming') {
          sim.busX += 340 * dt;
          sim.screenShake = 4;

          // Exhaust black smoke trail
          sim.particles.push({
            x: sim.busX - 6,
            y: sim.busY + 50,
            z: 8,
            vx: -60 - Math.random() * 30,
            vy: (Math.random() - 0.5) * 15,
            vz: 25 + Math.random() * 25,
            color: '#27272a',
            size: 6,
            life: 0.6,
            maxLife: 0.6,
          });

          // Crush any remaining zombie in the bus path!
          sim.units.forEach((u) => {
            if (u.team === 'zombie' && u.x <= sim.busX + 135 && u.hp > 0) {
              u.hp = -999;
              spawnBloodParticles(u.x, u.y, 10, 18);
              stampBloodDecal(u.x, u.y, 10);
              addFloatingText('SPLAT!', u.x, u.y, 20, '#ef4444', true);
              soundFX.playMeleeHit(true);
            }
          });
          sim.units = sim.units.filter((u) => u.hp > 0 || u.team === 'survivor');

          if (sim.busX > LOGICAL_WIDTH + 40) {
            sim.phase = 'victory';
            const stars = !sim.busDamagedEver
              ? 3
              : sim.busHp >= sim.maxBusHp * 0.5
              ? 2
              : 1;
            setStarsEarned(stars);
            setZombiesKilledCount(sim.zombiesKilled);
            setBattleResult('victory');
          }
        }

        // =======================================================
        // PHASE: ACTIVE COMBAT
        // =======================================================
        if (sim.phase === 'combat') {
          // 1. Passive Courage Generation & Cooldowns
          sim.courage = Math.min(100, sim.courage + dt * 3.4);
          SURVIVOR_ORDER.forEach((k) => {
            if (sim.unitCooldowns[k] > 0) {
              sim.unitCooldowns[k] = Math.max(0, sim.unitCooldowns[k] - dt);
            }
          });
          TACTICAL_ORDER.forEach((k) => {
            if (sim.itemCooldowns[k] > 0) {
              sim.itemCooldowns[k] = Math.max(0, sim.itemCooldowns[k] - dt);
            }
          });

          // 2. Mission Countdown & Final Wave Siren ("Witch Scream")
          sim.timeRemaining = Math.max(0, sim.timeRemaining - dt);
          if (sim.timeRemaining <= 0 && !sim.hordeTriggered) {
            sim.hordeTriggered = true;
            setHordeTriggered(true);
            soundFX.playSiren();
            sim.screenShake = 9;
            addFloatingText('¡LA HORDA FINAL SE ACERCA!', 320, 210, 30, '#ef4444', true);
            for (let i = 0; i < 7; i++) {
              spawnZombie(i % 2 === 0 ? 'runner' : 'crit_zombie', 575 + i * 16);
            }
          }

          // 3. Regular Zombie Wave Spawner & Subterranean Skeleton Ambush
          sim.waveTimer -= dt;
          if (sim.waveTimer <= 0) {
            sim.waveTimer = sim.hordeTriggered
              ? 1.35
              : mission.waveInterval * (0.85 + Math.random() * 0.3);
            const pool = mission.zombiePool;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            spawnZombie(pick);
          }

          sim.skeletonTimer -= dt;
          if (sim.skeletonTimer <= 0) {
            sim.skeletonTimer = 11 + Math.random() * 5;
            // Emerge mid-road behind ranged units!
            const ambushX = 240 + Math.random() * 190;
            const ambushY = ROAD_Y_MIN + 16 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 32);
            spawnZombie('skeleton', ambushX, ambushY);
            addFloatingText('¡EMBOSCADA!', ambushX, ambushY, 16, '#d6d3d1');
          }

          // 4. Sheriff Bill Cabin Rifle Defense & Special Barrage
          sim.billBarrageCharge = Math.min(100, sim.billBarrageCharge + dt * 4.2);

          if (sim.billBarrageActiveTimer > 0) {
            sim.billBarrageActiveTimer -= dt;
            if (Math.random() < 0.38) {
              const targetZombies = sim.units.filter(
                (u) => u.team === 'zombie' && u.state !== 'corpse' && u.hp > 0
              );
              if (targetZombies.length > 0) {
                const target = targetZombies[Math.floor(Math.random() * targetZombies.length)];
                const dmg = Math.round((18 + progress.billDamageBonus) * (1 - target.bulletResist));
                target.hp -= dmg;
                target.whiteFlashTimer = 0.09;
                target.vx += 18;
                sim.billFiringVisual = 0.1;
                soundFX.playRifle();
                spawnBloodParticles(target.x, target.y, 12, 5);
                addFloatingText(`-${dmg}`, target.x, target.y, 20, '#fde047');
              }
            }
          } else {
            sim.billShotTimer -= dt;
            if (sim.billShotTimer <= 0) {
              // Bill shoots zombies that get dangerously close to the bus (x < 330)
              const closeZombie = sim.units
                .filter((u) => u.team === 'zombie' && u.state !== 'corpse' && u.x < 330 && u.hp > 0)
                .sort((a, b) => a.x - b.x)[0];
              if (closeZombie) {
                sim.billShotTimer = 2.1;
                sim.billFiringVisual = 0.14;
                soundFX.playRifle();
                scareCrows();
                const dmg = Math.round((26 + progress.billDamageBonus) * (1 - closeZombie.bulletResist));
                closeZombie.hp -= dmg;
                closeZombie.whiteFlashTimer = 0.1;
                closeZombie.vx += 24;
                spawnBloodParticles(closeZombie.x, closeZombie.y, 12, 7);
                addFloatingText(`-${dmg}`, closeZombie.x, closeZombie.y, 20, '#facc15');
              } else {
                sim.billShotTimer = 0.4;
              }
            }
          }

          // 5. Fire Zones (DoT from Red Explosive Barrels)
          for (let i = sim.fireZones.length - 1; i >= 0; i--) {
            const fz = sim.fireZones[i];
            fz.duration -= dt;
            if (Math.random() < 0.35) {
              sim.particles.push({
                x: fz.x + (Math.random() - 0.5) * fz.radius * 1.4,
                y: fz.y + (Math.random() - 0.5) * fz.radius * 0.6,
                z: 2,
                vx: (Math.random() - 0.5) * 12,
                vy: 0,
                vz: 25 + Math.random() * 35,
                color: Math.random() > 0.4 ? '#f97316' : '#fde047',
                size: 3,
                life: 0.35,
                maxLife: 0.35,
              });
            }
            sim.units.forEach((u) => {
              if (Math.hypot(u.x - fz.x, (u.y - fz.y) * 1.5) <= fz.radius) {
                if (u.state === 'corpse') {
                  u.corpseTimer = -999;
                  u.hp = -999;
                } else {
                  u.hp -= 14 * dt;
                  if (u.hp <= 0) u.infectedZombieType = undefined; // Burned units don't turn into zombies
                }
              }
            });
            if (fz.duration <= 0) sim.fireZones.splice(i, 1);
          }

          // 6. Tactical Obstacles (Medkit aura & Barrel lifetimes)
          for (let i = sim.obstacles.length - 1; i >= 0; i--) {
            const obs = sim.obstacles[i];
            if (obs.whiteFlashTimer > 0) obs.whiteFlashTimer = Math.max(0, obs.whiteFlashTimer - dt);
            if (obs.type === 'medkit') {
              obs.healDuration = (obs.healDuration ?? 7) - dt;
              sim.units.forEach((u) => {
                if (
                  u.team === 'survivor' &&
                  u.state !== 'corpse' &&
                  Math.hypot(u.x - obs.x, (u.y - obs.y) * 1.5) <= 52
                ) {
                  u.hp = Math.min(u.maxHp, u.hp + 12 * dt);
                }
              });
              if (obs.healDuration <= 0) sim.obstacles.splice(i, 1);
            } else if (obs.hp <= 0) {
              if (obs.type === 'red_barrel') {
                triggerExplosion(obs.x, obs.y, 52, 65, true);
              } else {
                soundFX.playBarricadeBash();
              }
              sim.obstacles.splice(i, 1);
            }
          }

          // 7. Update Units (WASD Direct Control + Autonomous Combat FSM + Post-Mortem Infection)
          const keys = sim.keysPressed;
          const wasdDx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
          const wasdDy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
          const isUsingWasd = wasdDx !== 0 || wasdDy !== 0;

          // Ensure there's always a selected survivor if any are alive
          if (
            !sim.units.some(
              (u) => u.team === 'survivor' && u.state !== 'corpse' && u.id === sim.selectedUnitId
            )
          ) {
            const firstAlive = sim.units.find(
              (u) => u.team === 'survivor' && u.state !== 'corpse' && u.hp > 0
            );
            if (firstAlive) {
              sim.selectedUnitId = firstAlive.id;
              firstAlive.isPlayerControlled = true;
            }
          }

          for (let i = sim.units.length - 1; i >= 0; i--) {
            const u = sim.units[i];
            u.animTime += dt;
            if (u.whiteFlashTimer > 0) u.whiteFlashTimer = Math.max(0, u.whiteFlashTimer - dt);
            if (u.quoteTimer && u.quoteTimer > 0) u.quoteTimer = Math.max(0, u.quoteTimer - dt);

            // Gravity on Z jump/spawn
            if (u.z > 0 || u.vz !== 0) {
              u.z += u.vz * dt;
              u.vz -= 220 * dt;
              if (u.z <= 0) {
                u.z = 0;
                u.vz = 0;
              }
            }

            // Knockback velocity damping
            if (Math.abs(u.vx) > 0.5 || Math.abs(u.vy) > 0.5) {
              u.x += u.vx * dt;
              u.y += u.vy * dt;
              u.vx *= Math.pow(0.08, dt);
              u.vy *= Math.pow(0.08, dt);
            }

            // Clamp road boundaries
            u.x = Math.max(sim.busX + 86, Math.min(sim.barricadeX - 10, u.x));
            u.y = Math.max(ROAD_Y_MIN, Math.min(ROAD_Y_MAX, u.y));

            // -------------------------------------------------------
            // STATE: CORPSE (Post-Mortem Infection Countdown [00:06:29])
            // -------------------------------------------------------
            if (u.state === 'corpse') {
              u.corpseTimer = (u.corpseTimer ?? 3.8) - dt;
              if (u.corpseTimer <= -900) {
                // Purged by barrel or fire
                sim.units.splice(i, 1);
                continue;
              }
              if (u.corpseTimer <= 0) {
                // Reanimate as an infected zombie right where they died!
                const zType = u.infectedZombieType ?? 'runner';
                soundFX.playZombieReanimate();
                addFloatingText('¡INFECTADO!', u.x, u.y, 20, '#84cc16', true);
                spawnZombie(zType, u.x, u.y, true);
                sim.units.splice(i, 1);
              }
              continue;
            }

            // Check Death
            if (u.hp <= 0) {
              stampBloodDecal(u.x, u.y, 7);
              spawnBloodParticles(u.x, u.y, 8, 15);

              if (u.team === 'zombie') {
                sim.zombiesKilled += 1;
                const rageGain = u.rageReward ?? 8;
                sim.rage = Math.min(100, sim.rage + rageGain);
                sim.billBarrageCharge = Math.min(100, sim.billBarrageCharge + 8);

                // Bloated Zombie toxic explosion on death
                if (u.explodesOnDeath) {
                  triggerExplosion(u.x, u.y, 44, 34, false);
                }

                // Drop +25 Blue Courage Bottle on the road ([00:09:46])
                if (Math.random() < (u.courageDropChance ?? 0.25)) {
                  sim.pickups.push({
                    id: `pk_${Date.now()}_${Math.random()}`,
                    kind: 'courage',
                    amount: 25,
                    x: u.x,
                    y: u.y,
                    z: 10,
                    life: 11.0,
                  });
                }
                sim.units.splice(i, 1);
                continue;
              } else {
                // Survivor died! If they still have infectedZombieType, turn into twitching corpse!
                if (u.infectedZombieType) {
                  u.state = 'corpse';
                  u.corpseTimer = 3.8;
                  u.corpseMaxTimer = 3.8;
                  u.isPlayerControlled = false;
                  addFloatingText('¡INFECTÁNDOSE!', u.x, u.y, 18, '#84cc16');
                } else {
                  sim.units.splice(i, 1);
                }
                continue;
              }
            }

            // -------------------------------------------------------
            // STATE: EMERGING (Skeletons / Reanimated Corpses)
            // -------------------------------------------------------
            if (u.state === 'emerging') {
              if (u.animTime >= 1.1) {
                u.state = 'march';
                u.animTime = 0;
              }
              continue;
            }

            //Survivor Proximity Pickup of +25 Courage Bottles (great with WASD!)
            if (u.team === 'survivor') {
              for (let pIdx = sim.pickups.length - 1; pIdx >= 0; pIdx--) {
                const pk = sim.pickups[pIdx];
                if (Math.hypot(u.x - pk.x, u.y - pk.y) <= 22) {
                  soundFX.playCouragePickup();
                  sim.courage = Math.min(100, sim.courage + pk.amount);
                  setCourage(Math.floor(sim.courage));
                  addFloatingText(`+${pk.amount} VALOR`, pk.x, pk.y, 16, '#38bdf8', true);
                  sim.pickups.splice(pIdx, 1);
                }
              }
            }

            // -------------------------------------------------------
            // STATE: RELOAD (Ranged Survivors: Farmer / Policeman)
            // -------------------------------------------------------
            if (u.state === 'reload') {
              u.reloadTimer += dt;
              u.reloadProgress = Math.min(1, u.reloadTimer / u.reloadTime);
              if (u.reloadTimer >= u.reloadTime) {
                u.ammo = u.maxAmmo;
                u.state = 'march';
                u.reloadProgress = 0;
              }
              // Even while reloading, player can steer unit with WASD!
              if (u.isPlayerControlled && isUsingWasd) {
                const len = Math.hypot(wasdDx, wasdDy) || 1;
                u.x += (wasdDx / len) * u.speed * 0.9 * dt;
                u.y += (wasdDy / len) * u.speed * 0.75 * dt;
              }
              continue;
            }

            // -------------------------------------------------------
            // STATE: ATTACK ANIMATION
            // -------------------------------------------------------
            if (u.state === 'attack') {
              u.attackProgress += dt / 0.28;
              if (u.attackProgress >= 1) {
                u.attackProgress = 0;
                if (u.isRanged && u.ammo <= 0) {
                  u.state = 'reload';
                  u.reloadTimer = 0;
                } else {
                  u.state = 'march';
                }
              }
              continue;
            }

            // Cooldown between attacks
            if (u.attackTimer > 0) {
              u.attackTimer = Math.max(0, u.attackTimer - dt);
            }

            // -------------------------------------------------------
            // DIRECT WASD MOVEMENT FOR SELECTED SURVIVOR
            // -------------------------------------------------------
            if (u.team === 'survivor' && u.isPlayerControlled && isUsingWasd) {
              const len = Math.hypot(wasdDx, wasdDy) || 1;
              u.x += (wasdDx / len) * u.speed * 1.25 * dt;
              u.y += (wasdDy / len) * u.speed * 0.95 * dt;
              u.facing = wasdDx < 0 ? -1 : 1;
              u.state = 'march';
            }

            // -------------------------------------------------------
            // TARGET ACQUISITION & COMBAT AI
            // -------------------------------------------------------
            if (u.team === 'survivor') {
              // Find closest living zombie
              let closestZ: InternalUnit | null = null;
              let bestDist = Infinity;
              for (const other of sim.units) {
                if (other.team === 'zombie' && other.state !== 'corpse' && other.hp > 0) {
                  const d = Math.hypot(other.x - u.x, (other.y - u.y) * 1.5);
                  if (d < bestDist) {
                    bestDist = d;
                    closestZ = other;
                  }
                }
              }

              const distToBarricade = sim.barricadeX - u.x;

              // Can attack zombie in range?
              if (
                closestZ &&
                Math.abs(closestZ.x - u.x) <= u.attackRange &&
                Math.abs(closestZ.y - u.y) <= (u.isRanged ? 34 : 18)
              ) {
                u.facing = closestZ.x >= u.x ? 1 : -1;
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  scareCrows();

                  if (u.isRanged) {
                    // Shotgun Cone Blast (Farmer / Policeman)
                    u.ammo -= 1;
                    soundFX.playShotgun();
                    sim.screenShake = Math.max(sim.screenShake, 2.5);
                    // Eject brass shell particle
                    sim.particles.push({
                      x: u.x,
                      y: u.y,
                      z: 14,
                      vx: -25 - Math.random() * 20,
                      vy: (Math.random() - 0.5) * 15,
                      vz: 55,
                      color: '#facc15',
                      size: 2,
                      life: 0.5,
                      maxLife: 0.5,
                    });

                    // Hit all zombies in shotgun cone
                    sim.units.forEach((z) => {
                      if (
                        z.team === 'zombie' &&
                        z.state !== 'corpse' &&
                        z.hp > 0 &&
                        (z.x - u.x) * u.facing >= -6 &&
                        Math.abs(z.x - u.x) <= u.attackRange + 15 &&
                        Math.abs(z.y - u.y) <= 36
                      ) {
                        const isCrit = Math.random() < u.critChance;
                        const totalPelletDmg = Math.round(
                          u.damage *
                            u.pellets *
                            (isCrit ? u.critMultiplier : 1) *
                            (1 - z.bulletResist)
                        );
                        z.hp -= totalPelletDmg;
                        z.whiteFlashTimer = 0.1;
                        z.vx += u.facing * u.knockback;
                        spawnBloodParticles(z.x, z.y, 12, 8);
                        addFloatingText(
                          isCrit ? `CRIT! -${totalPelletDmg}` : `-${totalPelletDmg}`,
                          z.x,
                          z.y,
                          20,
                          isCrit ? '#fde047' : '#ffffff',
                          isCrit
                        );
                      }
                    });
                  } else {
                    // Melee Strike (Redneck / Builder / Mechanic)
                    const isFirstHitCrit = !!u.firstHitReady;
                    const isCrit = isFirstHitCrit || Math.random() < u.critChance;
                    u.firstHitReady = false;
                    const mult = isFirstHitCrit ? 3.0 : isCrit ? u.critMultiplier : 1;
                    const dmg = Math.round(u.damage * mult);

                    soundFX.playMeleeHit(isCrit || u.subType === 'builder');
                    if (isCrit) {
                      sim.hitStopTimer = 0.045;
                      sim.screenShake = Math.max(sim.screenShake, 4);
                    }

                    closestZ.hp -= dmg;
                    closestZ.whiteFlashTimer = 0.1;
                    closestZ.vx += u.facing * u.knockback * (isCrit ? 1.5 : 1);
                    spawnBloodParticles(closestZ.x, closestZ.y, 12, isCrit ? 14 : 7);
                    addFloatingText(
                      isCrit ? `BAM! -${dmg}` : `-${dmg}`,
                      closestZ.x,
                      closestZ.y,
                      22,
                      isCrit ? '#facc15' : '#ffffff',
                      isCrit
                    );
                  }
                }
              } else if (distToBarricade <= (u.isRanged ? 90 : 28)) {
                // Attack the Enemy Barricade on the Right! ([00:01:41])
                u.facing = 1;
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  if (u.isRanged) {
                    u.ammo -= 1;
                    soundFX.playShotgun();
                  } else {
                    soundFX.playBarricadeBash();
                  }
                  const dmg = Math.round(u.damage * u.barricadeMultiplier);
                  sim.barricadeHp = Math.max(0, sim.barricadeHp - dmg);
                  sim.barricadeShake = 0.25;
                  const words = ['BAM!', 'POW!', 'SMASH!', 'CRACK!'];
                  addFloatingText(
                    `${words[Math.floor(Math.random() * words.length)]} -${dmg}`,
                    sim.barricadeX - 6,
                    u.y,
                    22,
                    '#facc15',
                    true
                  );

                  // Check if Barricade just collapsed -> Trigger Bus Ramming Climax!
                  if (sim.barricadeHp <= 0 && sim.phase === 'combat') {
                    sim.phase = 'bus_ramming';
                    soundFX.playExplosion();
                    soundFX.playBusEngineRam();
                    sim.screenShake = 10;
                    addFloatingText('¡BARRICADA DESTRUIDA!', 460, 200, 32, '#fde047', true);
                  }
                }
              } else if (!(u.isPlayerControlled && isUsingWasd)) {
                // Autonomous March towards closest zombie or right barricade
                u.state = 'march';
                if (closestZ && Math.abs(closestZ.x - u.x) < 190) {
                  const dx = closestZ.x - u.x;
                  const dy = closestZ.y - u.y;
                  u.facing = dx >= 0 ? 1 : -1;
                  const stopX = u.isRanged ? u.attackRange * 0.85 : u.attackRange * 0.7;
                  if (Math.abs(dx) > stopX) {
                    u.x += Math.sign(dx) * u.speed * dt;
                  }
                  if (Math.abs(dy) > 6) {
                    u.y += Math.sign(dy) * u.speed * 0.65 * dt;
                  }
                } else {
                  u.facing = 1;
                  u.x += u.speed * dt;
                }
              }
            } else {
              // =======================================================
              // ZOMBIE AI (March Left -> Bash Barrels / Survivors / Bus)
              // =======================================================
              u.facing = -1;

              // 1. Check blocking Barrel in path
              const blockingBarrel = sim.obstacles.find(
                (o) =>
                  o.type !== 'medkit' &&
                  Math.abs(o.x - u.x) <= 20 &&
                  Math.abs(o.y - u.y) <= 18
              );
              if (blockingBarrel) {
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  blockingBarrel.hp -= u.damage;
                  blockingBarrel.whiteFlashTimer = 0.1;
                  soundFX.playBarricadeBash();
                  addFloatingText(`-${u.damage}`, blockingBarrel.x, blockingBarrel.y, 16, '#94a3b8');
                }
                continue;
              }

              // 2. Find closest living Survivor
              let closestS: InternalUnit | null = null;
              let bestDist = Infinity;
              for (const other of sim.units) {
                if (other.team === 'survivor' && other.state !== 'corpse' && other.hp > 0) {
                  const d = Math.hypot(other.x - u.x, (other.y - u.y) * 1.5);
                  if (d < bestDist) {
                    bestDist = d;
                    closestS = other;
                  }
                }
              }

              if (
                closestS &&
                Math.abs(closestS.x - u.x) <= u.attackRange + 4 &&
                Math.abs(closestS.y - u.y) <= 18
              ) {
                u.facing = closestS.x <= u.x ? -1 : 1;
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  const isCrit = Math.random() < u.critChance;
                  const dmg = Math.round(
                    u.damage * (isCrit ? u.critMultiplier : 1) * (1 - closestS.bulletResist * 0.4)
                  );
                  soundFX.playMeleeHit(isCrit);
                  closestS.hp -= dmg;
                  closestS.whiteFlashTimer = 0.1;
                  if (!closestS.isLucky) {
                    closestS.vx += u.facing * 16;
                  }
                  spawnBloodParticles(closestS.x, closestS.y, 12, isCrit ? 12 : 6);
                  addFloatingText(
                    isCrit ? `CRIT! -${dmg}` : `-${dmg}`,
                    closestS.x,
                    closestS.y,
                    20,
                    '#ef4444',
                    isCrit
                  );
                }
              } else if (u.x <= sim.busX + 136) {
                // Attack the Yellow School Bus!
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  soundFX.playBarricadeBash();
                  sim.busHp = Math.max(0, sim.busHp - u.damage);
                  sim.busDamagedEver = true;
                  sim.screenShake = 4;
                  addFloatingText(`-${u.damage}`, sim.busX + 120, u.y, 20, '#ef4444', true);

                  // Spiked Bumper reflects damage back to zombies hitting the bus!
                  if (progress.spikedBumper) {
                    u.hp -= 12;
                    u.whiteFlashTimer = 0.1;
                    spawnBloodParticles(u.x, u.y, 10, 6);
                  }

                  if (sim.busHp <= 0) {
                    sim.phase = 'defeat';
                    soundFX.playExplosion();
                    setBattleResult('defeat');
                  }
                }
              } else {
                // March towards closest survivor or left towards the bus
                u.state = 'march';
                if (closestS && Math.abs(closestS.x - u.x) < 110) {
                  const dx = closestS.x - u.x;
                  const dy = closestS.y - u.y;
                  u.facing = dx <= 0 ? -1 : 1;
                  u.x += Math.sign(dx) * u.speed * dt;
                  if (Math.abs(dy) > 4) {
                    u.y += Math.sign(dy) * u.speed * 0.65 * dt;
                  }
                } else {
                  u.facing = -1;
                  u.x -= u.speed * dt;
                }
              }
            }
          }

          // 8. Update Pickups, Crows, Particles & Floating Texts
          for (let i = sim.pickups.length - 1; i >= 0; i--) {
            const pk = sim.pickups[i];
            pk.life -= dt;
            if (pk.z > 0) pk.z = Math.max(0, pk.z - 40 * dt);
            if (pk.life <= 0) sim.pickups.splice(i, 1);
          }

          sim.crows.forEach((crow) => {
            if (crow.flying) {
              crow.x += crow.vx * dt;
              crow.y += crow.vy * dt;
              crow.z += crow.vz * dt;
            }
          });

          for (let i = sim.particles.length - 1; i >= 0; i--) {
            const p = sim.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vz -= 260 * dt;
            if (p.z <= 0) {
              p.z = 0;
              if (p.LeavesDecal) {
                stampBloodDecal(p.x, p.y, p.size, p.color);
                p.LeavesDecal = false;
              }
              p.vx *= 0.4;
              p.vy *= 0.4;
            }
            if (p.life <= 0) sim.particles.splice(i, 1);
          }

          for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
            const ft = sim.floatingTexts[i];
            ft.life -= dt;
            ft.z += 22 * dt;
            if (ft.life <= 0) sim.floatingTexts.splice(i, 1);
          }

          // Sync React HUD state at ~10Hz
          if (uiSyncAccumulator >= 0.1) {
            uiSyncAccumulator = 0;
            setCourage(Math.floor(sim.courage));
            setRage(Math.floor(sim.rage));
            setBusHp(Math.max(0, Math.round(sim.busHp)));
            setBarricadeHp(Math.max(0, Math.round(sim.barricadeHp)));
            setUnitCooldowns({ ...sim.unitCooldowns });
            setItemCooldowns({ ...sim.itemCooldowns });
            setBillBarrageCharge(Math.floor(sim.billBarrageCharge));
            setTimeRemaining(Math.ceil(sim.timeRemaining));
          }
        }
      }

      // =======================================================
      // 5-LAYER 2.5D RENDER PIPELINE (640x360 Pixel-Perfect)
      // =======================================================
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.save();
        if (sim.screenShake > 0) {
          const sx = Math.round((Math.random() - 0.5) * sim.screenShake);
          const sy = Math.round((Math.random() - 0.5) * sim.screenShake);
          ctx.translate(sx, sy);
        }

        // LAYER 0: Biome Background & Asphalt Road
        renderBiomeBackground(ctx, mission.biome, sim.time);

        // LAYER 1: Persistent Decal Buffer (Blood puddles, scorch craters, skid marks)
        if (decalCanvasRef.current) {
          ctx.drawImage(decalCanvasRef.current, 0, 0);
        }

        // Fire Zones on the Asphalt
        sim.fireZones.forEach((fz) => {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
          ctx.beginPath();
          ctx.ellipse(fz.x, fz.y, fz.radius, fz.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Drag & Drop Tactical Target Reticle on the Road ([00:03:48])
        if (sim.draggingItem) {
          const cfg = TACTICAL_ITEM_CONFIGS[sim.draggingItem];
          const tx = Math.max(150, Math.min(sim.barricadeX - 24, sim.mouseLogical.x));
          const ty = Math.max(ROAD_Y_MIN + 6, Math.min(ROAD_Y_MAX - 6, sim.mouseLogical.y));
          const friendlyInside =
            sim.draggingItem !== 'medkit' &&
            sim.units.some(
              (u) =>
                u.team === 'survivor' &&
                u.state !== 'corpse' &&
                Math.hypot(u.x - tx, (u.y - ty) * 1.4) <= cfg.radius
            );

          ctx.strokeStyle = friendlyInside ? '#ef4444' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius, cfg.radius * 0.48, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = friendlyInside
            ? 'rgba(239, 68, 68, 0.25)'
            : 'rgba(34, 197, 94, 0.22)';
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius, cfg.radius * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();

          if (friendlyInside) {
            ctx.font = 'bold 6px monospace';
            ctx.fillStyle = '#fca5a5';
            ctx.textAlign = 'center';
            ctx.fillText('¡FUEGO AMIGO!', tx, ty - cfg.radius * 0.55);
          }
        }

        // LAYER 2: Y-Sorted Dynamic Entities (Barricade, Bus, Units, Barrels, Pickups)
        if (sim.barricadeHp > 0) {
          renderBarricade(
            ctx,
            sim.barricadeX,
            sim.barricadeHp,
            sim.maxBarricadeHp,
            sim.barricadeShake
          );
        }

        type DrawableItem =
          | { kind: 'unit'; y: number; data: InternalUnit }
          | { kind: 'obs'; y: number; data: RenderObstacle }
          | { kind: 'pickup'; y: number; data: RenderPickup }
          | { kind: 'bus'; y: number };

        const drawables: DrawableItem[] = [
          { kind: 'bus', y: sim.busY + 60 },
          ...sim.units.map((u) => ({ kind: 'unit' as const, y: u.y, data: u })),
          ...sim.obstacles.map((o) => ({ kind: 'obs' as const, y: o.y, data: o })),
          ...sim.pickups.map((p) => ({ kind: 'pickup' as const, y: p.y, data: p })),
        ];

        drawables.sort((a, b) => a.y - b.y);

        drawables.forEach((item) => {
          if (item.kind === 'bus') {
            renderArmoredBus(
              ctx,
              sim.busX,
              sim.busY,
              sim.busHp,
              sim.maxBusHp,
              sim.time,
              sim.billShotTimer,
              sim.billFiringVisual,
              progress.spikedBumper,
              progress.weldedArmor,
              sim.doorOpenTimer
            );
          } else if (item.kind === 'unit') {
            renderUnitSprite(ctx, item.data, sim.time);
          } else if (item.kind === 'obs') {
            renderTacticalObstacle(ctx, item.data, sim.time);
          } else if (item.kind === 'pickup') {
            renderDropPickup(ctx, item.data, sim.time);
          }
        });

        // LAYER 3: Flying Crows, Blood/Fire Particles & Comic Onomatopoeias
        sim.crows.forEach((c) => renderCrow(ctx, c, sim.time));

        sim.particles.forEach((p) => {
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y - p.z), p.size, p.size);
        });

        sim.floatingTexts.forEach((ft) => {
          ctx.save();
          ctx.font = ft.isComic
            ? 'bold 9px "Press Start 2P", monospace'
            : 'bold 7px "Chakra Petch", sans-serif';
          ctx.textAlign = 'center';
          const tx = Math.round(ft.x);
          const ty = Math.round(ft.y - ft.z);
          ctx.fillStyle = '#09090b';
          ctx.fillText(ft.text, tx + 1, ty + 1);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, tx, ty);
          ctx.restore();
        });

        // LAYER 4: Atmospheric Horde Warning Tint
        if (sim.hordeTriggered) {
          const redPulse = 0.08 + Math.abs(Math.sin(sim.time * 4)) * 0.08;
          ctx.fillStyle = `rgba(220, 38, 38, ${redPulse})`;
          ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    addFloatingText,
    initDecalCanvas,
    mission.barricadeHp,
    mission.biome,
    mission.skeletonAmbush,
    mission.waveInterval,
    mission.zombiePool,
    paused,
    progress.billDamageBonus,
    progress.spikedBumper,
    progress.weldedArmor,
    scareCrows,
    spawnBloodParticles,
    spawnZombie,
    stampBloodDecal,
    triggerExplosion,
  ]);

  const toggleMute = () => {
    soundFX.muted = !soundFX.muted;
    setMuted(soundFX.muted);
  };

  const selectDraggingTactical = (type: TacticalItemType) => {
    const cfg = TACTICAL_ITEM_CONFIGS[type];
    if (rage < cfg.rageCost || itemCooldowns[type] > 0) return;
    const next = draggingItem === type ? null : type;
    setDraggingItem(next);
    simRef.current.draggingItem = next;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 select-none overflow-hidden">
      {/* TOP TACTICAL HUD BAR (Courage, Rage, Bus HP, Barricade HP, Timer & Controls) */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-900/95 border-b-2 border-zinc-800 shadow-lg">
        {/* Left: Dual Economy (Courage Blue + Rage Red) & Bus Health */}
        <div className="flex items-center gap-3">
          {/* Courage Bottle Counter */}
          <div
            className="flex items-center gap-2 bg-sky-950/90 border-2 border-sky-500/80 px-2.5 py-1 rounded shadow-inner"
            title="Valor (Courage): Sube cada segundo o recogiendo botellas azules (+25) en el asfalto"
          >
            <div className="w-4 h-5 rounded-sm bg-sky-400 border border-white flex items-center justify-center font-pixel text-[8px] text-sky-950 font-bold">
              💧
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-sky-300 font-bold leading-none">
                Valor
              </div>
              <div className="font-pixel text-xs sm:text-sm text-white">{courage}</div>
            </div>
          </div>

          {/* Rage Blood Counter */}
          <div
            className="flex items-center gap-2 bg-red-950/90 border-2 border-red-500/80 px-2.5 py-1 rounded shadow-inner"
            title="Furia (Rage): Sube matando zombis; úsala para arrastrar barriles a la carretera"
          >
            <Flame className="w-4 h-4 text-red-400 fill-red-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-red-300 font-bold leading-none">
                Furia
              </div>
              <div className="font-pixel text-xs sm:text-sm text-white">{rage}</div>
            </div>
          </div>

          {/* Bus Chassis HP Bar */}
          <div className="hidden sm:flex flex-col min-w-[130px] bg-zinc-950/90 border border-yellow-600/60 px-2.5 py-1 rounded">
            <div className="flex items-center justify-between text-[10px] font-bold text-yellow-400">
              <span>🚌 AUTOBÚS DE BILL</span>
              <span>
                {busHp}/{maxBusHp}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (busHp / maxBusHp) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Mission Title, WASD Active Status & Final Wave Countdown */}
        <div className="flex items-center gap-3">
          <button
            onClick={cycleSelectedSurvivor}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 text-xs font-bold hover:bg-emerald-900/80 transition"
            title="Usa WASD para mover al superviviente seleccionado. Pulsa Tab o haz clic aquí para cambiar de unidad."
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>{controlledUnitName}</span>
            <span className="text-[10px] bg-emerald-800/80 px-1 rounded text-white">TAB</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-bold text-xs ${
              hordeTriggered
                ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                : 'bg-zinc-950 border-zinc-700 text-zinc-200'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span>
              {hordeTriggered
                ? '¡HORDA FINAL!'
                : `Horda: ${Math.floor(timeRemaining / 60)}:${String(
                    timeRemaining % 60
                  ).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* Right: Barricade Integrity & Audio/Pause/Retreat Buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col min-w-[130px] bg-zinc-950/90 border border-red-600/60 px-2.5 py-1 rounded">
            <div className="flex items-center justify-between text-[10px] font-bold text-red-400">
              <span>🚧 BARRICADA</span>
              <span>
                {barricadeHp}/{maxBarricadeHp}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-150"
                style={{ width: `${Math.max(0, (barricadeHp / maxBarricadeHp) * 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200"
            title="Activar/Silenciar Audio"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setPaused((p) => !p)}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200"
            title="Pausar Partida"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={onRetreat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-bold text-zinc-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>
        </div>
      </div>

      {/* MAIN 2.5D PIXEL-ART CANVAS VIEWPORT */}
      <div className="relative flex-1 w-full flex items-center justify-center bg-zinc-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          onPointerMove={handleCanvasPointerMove}
          onPointerDown={handleCanvasPointerDown}
          onPointerUp={(e) => {
            if (simRef.current.draggingItem) {
              const coords = getLogicalCoords(e.clientX, e.clientY);
              if (coords.insideRoad) {
                deployTacticalItem(simRef.current.draggingItem, coords.x, coords.y);
              }
            }
          }}
          className="w-full h-full object-contain pixel-canvas cursor-crosshair"
        />

        {/* Dragging Item Instructional Banner */}
        {draggingItem && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-amber-950/95 border-2 border-amber-400 px-4 py-1.5 rounded-full text-xs font-bold text-amber-200 shadow-lg flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-amber-400 animate-spin" />
            <span>
              Haz clic o suelta en cualquier punto de la carretera para lanzar{' '}
              <strong className="text-white">{TACTICAL_ITEM_CONFIGS[draggingItem].name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM TACTICAL CARD DECK (Sheriff Bill Barrage + 5 Survivors + 3 Rage Tactical Items) */}
      <div className="z-20 bg-zinc-900/95 border-t-2 border-zinc-800 px-3 py-2 flex flex-wrap items-center justify-center gap-2">
        {/* Sheriff Bill Cabin Special Ability Button */}
        <button
          onClick={triggerBillBarrage}
          disabled={billBarrageCharge < 100}
          className={`relative flex flex-col items-center justify-between w-20 sm:w-24 h-20 p-1.5 rounded-lg border-2 transition ${
            billBarrageCharge >= 100
              ? 'bg-amber-900/90 border-yellow-400 hover:scale-105 shadow-[0_0_15px_rgba(250,204,21,0.5)] cursor-pointer'
              : 'bg-zinc-950/80 border-zinc-700 opacity-75 cursor-not-allowed'
          }`}
          title="Ráfaga de Rifle del Sheriff Bill desde el Autobús [Tecla Espacio]"
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-300">
            🤠 Bill [Esp]
          </span>
          <Zap
            className={`w-6 h-6 ${
              billBarrageCharge >= 100 ? 'text-yellow-300 animate-bounce' : 'text-zinc-500'
            }`}
          />
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${billBarrageCharge}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-zinc-200">
            {billBarrageCharge >= 100 ? '¡FUEGO!' : `${billBarrageCharge}%`}
          </span>
        </button>

        <div className="h-14 w-0.5 bg-zinc-700 mx-0.5 hidden sm:block" />

        {/* 5 Survivor Cards (Cost: Blue Courage) */}
        {SURVIVOR_ORDER.map((sType) => {
          const cfg = SURVIVOR_CONFIGS[sType];
          const cd = unitCooldowns[sType];
          const canAfford = courage >= cfg.cost && cd <= 0;
          const lvl = progress.unitLevels[sType] || 1;

          return (
            <button
              key={sType}
              onClick={() => deploySurvivor(sType)}
              disabled={!canAfford}
              className={`relative flex flex-col justify-between w-24 sm:w-28 h-20 p-1.5 rounded-lg border-2 text-left transition overflow-hidden ${
                canAfford
                  ? 'bg-slate-900 hover:bg-slate-800 border-sky-400 hover:-translate-y-0.5 shadow-md cursor-pointer'
                  : 'bg-zinc-950 border-zinc-800 opacity-65 cursor-not-allowed'
              }`}
              title={`${cfg.name} (${cfg.roleTitle}): ${cfg.description}`}
            >
              {/* Radial/Vertical Cooldown Overlay */}
              {cd > 0 && (
                <div
                  className="absolute inset-0 bg-zinc-950/85 flex items-center justify-center z-10 font-pixel text-xs text-amber-400"
                  style={{
                    height: `${Math.min(100, (cd / cfg.prepTime) * 100)}%`,
                  }}
                >
                  {cd.toFixed(1)}s
                </div>
              )}

              <div className="flex items-center justify-between w-full">
                <span className="bg-sky-500 text-sky-950 font-pixel text-[9px] px-1.5 py-0.5 rounded font-bold">
                  💧{cfg.cost}
                </span>
                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 px-1 rounded">
                  [{cfg.hotkey}] Nv.{lvl}
                </span>
              </div>

              <div className="my-0.5">
                <div className="text-xs font-extrabold text-white leading-tight truncate">
                  {cfg.name}
                </div>
                <div className="text-[9px] text-sky-300 truncate">{cfg.roleTitle}</div>
              </div>

              <div className="flex items-center justify-between text-[9px] text-zinc-400 border-t border-zinc-800 pt-0.5">
                <span>❤️{Math.round(cfg.baseHp * (1 + (lvl - 1) * 0.18))}</span>
                <span>⚔️{Math.round(cfg.baseDamage * (1 + (lvl - 1) * 0.18))}</span>
                <span className="text-yellow-400">★{cfg.fortune}%</span>
              </div>
            </button>
          );
        })}

        <div className="h-14 w-0.5 bg-zinc-700 mx-0.5 hidden sm:block" />

        {/* 3 Tactical Rage Items (Drag & Drop or Click -> Click on Road) */}
        {TACTICAL_ORDER.map((iType) => {
          const cfg = TACTICAL_ITEM_CONFIGS[iType];
          const cd = itemCooldowns[iType];
          const canAfford = rage >= cfg.rageCost && cd <= 0;
          const isSelected = draggingItem === iType;

          return (
            <button
              key={iType}
              onPointerDown={() => {
                if (canAfford) {
                  setDraggingItem(iType);
                  simRef.current.draggingItem = iType;
                }
              }}
              onClick={() => selectDraggingTactical(iType)}
              disabled={!canAfford}
              className={`relative flex flex-col justify-between w-24 sm:w-28 h-20 p-1.5 rounded-lg border-2 text-left transition overflow-hidden ${
                isSelected
                  ? 'bg-red-900 border-yellow-300 scale-105 shadow-[0_0_14px_rgba(239,68,68,0.6)]'
                  : canAfford
                  ? 'bg-red-950/70 hover:bg-red-900/60 border-red-500 hover:-translate-y-0.5 cursor-grab'
                  : 'bg-zinc-950 border-zinc-800 opacity-60 cursor-not-allowed'
              }`}
              title={cfg.description}
            >
              {cd > 0 && (
                <div className="absolute inset-0 bg-zinc-950/85 flex items-center justify-center z-10 font-pixel text-xs text-red-400">
                  {cd.toFixed(1)}s
                </div>
              )}

              <div className="flex items-center justify-between w-full">
                <span className="bg-red-600 text-white font-pixel text-[9px] px-1.5 py-0.5 rounded font-bold">
                  🔥{cfg.rageCost}
                </span>
                <span className="text-[9px] font-bold text-red-200 bg-red-950 px-1 rounded">
                  [{cfg.hotkey}] Drag
                </span>
              </div>

              <div className="my-0.5">
                <div className="text-xs font-extrabold text-white leading-tight truncate">
                  {cfg.name}
                </div>
                <div className="text-[9px] text-red-300 truncate">
                  {iType === 'blue_barrel'
                    ? 'Aplasta + Bloquea'
                    : iType === 'red_barrel'
                    ? 'Explosión + Fuego'
                    : 'Cura +12 HP/s'}
                </div>
              </div>

              <div className="text-[9px] text-amber-300 font-semibold truncate">
                Arrastra a la calzada
              </div>
            </button>
          );
        })}
      </div>

      {/* VICTORY OR DEFEAT MODAL OVERLAY */}
      {battleResult !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border-2 border-yellow-500 rounded-xl p-6 text-center shadow-2xl">
            {battleResult === 'victory' ? (
              <>
                <div className="font-pixel text-lg sm:text-xl text-yellow-400 mb-2">
                  ¡BARRICADA DEMOLIDA!
                </div>
                <p className="text-sm text-zinc-300 mb-4">
                  El autobús de Bill arrolló a la horda y despejó{' '}
                  <strong className="text-white">{mission.name}</strong>.
                </p>

                {/* 3-Star Rating Display */}
                <div className="flex items-center justify-center gap-3 my-4">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`text-4xl transition transform ${
                        s <= starsEarned
                          ? 'text-yellow-400 scale-110 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                          : 'text-zinc-700'
                      }`}
                    >
                      ★
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-400 mb-4">
                  {starsEarned === 3
                    ? '¡Chasis al 100% sin rasguños! Bonificación máxima de 3 estrellas.'
                    : 'Repara o protege el autobús con el Mechanic para obtener las 3 estrellas.'}
                </div>

                <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800 mb-5 text-sm">
                  <div>
                    <div className="text-xs text-zinc-400">Monedas Ganadas</div>
                    <div className="font-pixel text-yellow-400 text-base mt-1">
                      +{mission.coinsReward + starsEarned * 15} 🪙
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Zombis Abatidos</div>
                    <div className="font-pixel text-red-400 text-base mt-1">
                      {zombiesKilledCount} 💀
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onVictory(
                      starsEarned,
                      mission.coinsReward + starsEarned * 15,
                      zombiesKilledCount
                    )
                  }
                  className="w-full py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-extrabold text-sm uppercase tracking-wider transition shadow-lg"
                >
                  Continuar al Mapa de Carretera →
                </button>
              </>
            ) : (
              <>
                <div className="font-pixel text-lg sm:text-xl text-red-500 mb-2">
                  ¡EL AUTOBÚS CAYÓ!
                </div>
                <p className="text-sm text-zinc-300 mb-5">
                  La horda destrozó el chasis de Bill. Mejora tus unidades en el Garaje o usa barriles azules para cortar el paso a los corredores.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onRetreat}
                    className="flex-1 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm"
                  >
                    Ir al Garaje / Mapa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

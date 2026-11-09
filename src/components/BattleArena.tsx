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
  renderForegroundLeftProps,
  renderTacticalObstacle,
  renderUnitSprite,
} from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';

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

export const BattleArena: React.FC<BattleArenaProps> = ({
  mission,
  progress,
  onVictory,
  onRetreat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // HUD Reactive State matching Screenshot
  const [courage, setCourage] = useState<number>(16);
  const [rage, setRage] = useState<number>(4);
  const [busHp, setBusHp] = useState<number>(200 + progress.busHpBonus);
  const maxBusHp = 200 + progress.busHpBonus;
  const [barricadeHp, setBarricadeHp] = useState<number>(mission.barricadeHp);
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
  const [furyBuffCount, setFuryBuffCount] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(145); // 02:25 like screenshot!
  const [hordeTriggered, setHordeTriggered] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [draggingItem, setDraggingItem] = useState<TacticalItemType | null>(null);
  const [battleResult, setBattleResult] = useState<'none' | 'victory' | 'defeat'>('none');
  const [starsEarned, setStarsEarned] = useState<number>(3);
  const [zombiesKilledCount, setZombiesKilledCount] = useState<number>(0);
  const [showDpad, setShowDpad] = useState<boolean>(false);

  // Mutable Simulation Ref
  const simRef = useRef({
    time: 0,
    courage: 16,
    rage: 4,
    busHp: 200 + progress.busHpBonus,
    maxBusHp: 200 + progress.busHpBonus,
    busDamagedEver: false,
    busX: -2,
    busY: 112,
    doorOpenTimer: 0,
    barricadeHp: mission.barricadeHp,
    maxBarricadeHp: mission.barricadeHp,
    barricadeX: 546,
    barricadeShake: 0,
    billShotTimer: 1.5,
    billFiringVisual: 0,
    billBarrageCharge: 45,
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
      { x: 280, y: 225, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 0 },
      { x: 350, y: 248, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 1.7 },
    ] as RenderCrow[],
    particles: [] as RenderParticle[],
    floatingTexts: [] as RenderFloatingText[],
    fireZones: [] as RenderFireZone[],
    keysPressed: new Set<string>(),
    selectedUnitId: null as string | null,
    mouseLogical: { x: 320, y: 240, insideRoad: false },
    draggingItem: null as TacticalItemType | null,
    waveTimer: 2.8,
    skeletonTimer: mission.skeletonAmbush ? 9.0 : 9999,
    timeRemaining: 145,
    hordeTriggered: false,
    screenShake: 0,
    hitStopTimer: 0,
    phase: 'combat' as 'combat' | 'bus_ramming' | 'victory' | 'defeat',
    zombiesKilled: 0,
  });

  const stampBloodDecal = useCallback((x: number, y: number, radius = 8, color = '#991b1b') => {
    const dctx = decalCanvasRef.current?.getContext('2d');
    if (!dctx) return;
    const rx = Math.round(x);
    const ry = Math.round(Math.max(ROAD_Y_MIN - 4, Math.min(ROAD_Y_MAX + 6, y)));
    dctx.fillStyle = color;
    dctx.fillRect(
      rx - radius,
      ry - Math.round(radius * 0.45),
      radius * 2,
      Math.max(3, Math.round(radius * 0.85))
    );
    dctx.fillStyle = '#7f1d1d';
    dctx.fillRect(
      rx - Math.round(radius * 0.7),
      ry - Math.round(radius * 0.65),
      Math.round(radius * 1.4),
      Math.max(2, Math.round(radius * 1.1))
    );
  }, []);

  const initDecalCanvas = useCallback(() => {
    if (!decalCanvasRef.current) {
      decalCanvasRef.current = document.createElement('canvas');
      decalCanvasRef.current.width = LOGICAL_WIDTH;
      decalCanvasRef.current.height = LOGICAL_HEIGHT;
    }
    const dctx = decalCanvasRef.current.getContext('2d');
    if (!dctx) return;
    dctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }, []);

  const addFloatingText = useCallback(
    (
      text: string,
      x: number,
      y: number,
      z: number,
      color: string,
      isComic = false,
      subText?: string
    ) => {
      simRef.current.floatingTexts.push({
        id: `${Math.random()}`,
        text,
        subText,
        x,
        y,
        z,
        color,
        scale: isComic ? 1.35 : 1,
        life: isComic ? 0.9 : 0.7,
        maxLife: isComic ? 0.9 : 0.7,
        isComic,
      });
    },
    []
  );

  const spawnBloodParticles = useCallback(
    (x: number, y: number, z: number, count = 18, isGreen = false) => {
      const colors = isGreen
        ? ['#84cc16', '#4d7c0f', '#a3e635']
        : ['#dc2626', '#b91c1c', '#991b1b', '#ef4444'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 75;
        simRef.current.particles.push({
          x,
          y,
          z: z + 8 + Math.random() * 14,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd * 0.35,
          vz: 40 + Math.random() * 95,
          color: colors[i % colors.length],
          size: 2 + Math.floor(Math.random() * 3),
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.8,
          LeavesDecal: true,
        });
      }
    },
    []
  );

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

  const spawnZombie = useCallback(
    (type: ZombieType, customX?: number, customY?: number, fromCorpse = false) => {
      const cfg = ZOMBIE_CONFIGS[type];
      const spawnX = customX ?? simRef.current.barricadeX - 30 - Math.random() * 45;
      const spawnY =
        customY ?? ROAD_Y_MIN + 8 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 16);
      const isEmerging = (cfg.emergesFromGround && customX !== undefined) || fromCorpse;

      const zUnit: InternalUnit = {
        id: `z_${Date.now()}_${Math.random()}`,
        team: 'zombie',
        subType: type,
        level: 7, // Level [7] badge matching screenshot!
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
        animTime: Math.random() * 3,
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

  const deploySurvivor = useCallback(
    (type: SurvivorType, freeInitial = false, customX?: number, customY?: number) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || paused) return;
      const cfg = SURVIVOR_CONFIGS[type];
      if (!freeInitial && (sim.courage < cfg.cost || sim.unitCooldowns[type] > 0)) return;

      if (!freeInitial) {
        sim.courage -= cfg.cost;
        sim.unitCooldowns[type] = cfg.prepTime;
        sim.doorOpenTimer = 0.45;
        setCourage(Math.floor(sim.courage));
        setUnitCooldowns({ ...sim.unitCooldowns });
        soundFX.playUnitSpawn();
        scareCrows();
      }

      const level = Math.max(5, progress.unitLevels[type] || 5);
      const statMult = 1 + (level - 1) * 0.12;
      const hp = Math.round(cfg.baseHp * statMult);
      const damage = Math.round(cfg.baseDamage * statMult);
      const isLucky = freeInitial || Math.random() * 100 < cfg.fortune;

      const spawnY =
        customY ?? ROAD_Y_MIN + 14 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 28);

      if (cfg.repairsBusOnSpawn && !freeInitial) {
        const heal = cfg.repairsBusOnSpawn;
        sim.busHp = Math.min(sim.maxBusHp, sim.busHp + heal);
        setBusHp(sim.busHp);
        addFloatingText(`+${heal} HP`, sim.busX + 100, sim.busY + 12, 20, '#fde047', true);
      }

      const newUnit: InternalUnit = {
        id: `s_${Date.now()}_${Math.random()}`,
        team: 'survivor',
        subType: type,
        level: 7,
        x: customX ?? sim.busX + 104,
        y: spawnY,
        z: freeInitial ? 0 : 6,
        vx: freeInitial ? 0 : 22,
        vy: 0,
        vz: freeInitial ? 0 : 18,
        hp,
        maxHp: hp,
        damage,
        speed: cfg.speed * (isLucky ? 1.15 : 1),
        attackRange: cfg.attackRange,
        attackCooldown: cfg.attackCooldown * (isLucky ? 0.8 : 1),
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
        firstHitReady: !!cfg.firstHitCritMultiplier,
      };

      const hasAliveControlled = sim.units.some(
        (u) => u.team === 'survivor' && u.state !== 'corpse' && u.id === sim.selectedUnitId
      );
      if (!hasAliveControlled) {
        sim.units.forEach((u) => (u.isPlayerControlled = false));
        newUnit.isPlayerControlled = true;
        sim.selectedUnitId = newUnit.id;
      }

      sim.units.push(newUnit);
    },
    [addFloatingText, paused, progress.unitLevels, scareCrows]
  );

  const triggerExplosion = useCallback(
    (x: number, y: number, radius: number, damage: number, leavesFire: boolean) => {
      const sim = simRef.current;
      soundFX.playExplosion();
      sim.screenShake = 8;
      sim.hitStopTimer = 0.05;
      stampBloodDecal(x, y, 14, '#27272a');
      addFloatingText('BOOM!', x, y, 24, '#f97316', true);

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

      sim.units.forEach((u) => {
        const dx = u.x - x;
        const dy = (u.y - y) * 1.4;
        const dist = Math.hypot(dx, dy);
        if (dist <= radius) {
          if (u.state === 'corpse') {
            u.hp = -999;
            u.corpseTimer = -999;
          } else {
            u.hp -= damage;
            u.whiteFlashTimer = 0.12;
            u.vx += (dx >= 0 ? 1 : -1) * 65;
            addFloatingText(`${damage}`, u.x, u.y, 18, '#fde047', true, 'WACK!');
            if (u.hp <= 0) {
              u.infectedZombieType = undefined;
            }
          }
        }
      });
    },
    [addFloatingText, stampBloodDecal]
  );

  // Blue Barrel cost set to 6 Rage (matching slot 6 in screenshot!)
  const getEffectiveRageCost = (type: TacticalItemType) =>
    type === 'blue_barrel' ? 6 : TACTICAL_ITEM_CONFIGS[type].rageCost;

  const deployTacticalItem = useCallback(
    (type: TacticalItemType, targetX: number, targetY: number) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || paused) return;
      const cfg = TACTICAL_ITEM_CONFIGS[type];
      const rCost = getEffectiveRageCost(type);
      if (sim.rage < rCost || sim.itemCooldowns[type] > 0) return;

      const clampedX = Math.max(145, Math.min(sim.barricadeX - 24, targetX));
      const clampedY = Math.max(ROAD_Y_MIN + 4, Math.min(ROAD_Y_MAX - 4, targetY));

      sim.rage -= rCost;
      sim.itemCooldowns[type] = cfg.prepTime;
      setRage(Math.floor(sim.rage));
      setItemCooldowns({ ...sim.itemCooldowns });
      setDraggingItem(null);
      sim.draggingItem = null;

      soundFX.playBarricadeBash();
      sim.screenShake = 5;
      addFloatingText('WACK!', clampedX, clampedY, 22, '#ef4444', true);

      sim.units.forEach((u) => {
        const dx = u.x - clampedX;
        const dy = (u.y - clampedY) * 1.4;
        if (Math.hypot(dx, dy) <= cfg.radius) {
          if (u.state === 'corpse') {
            u.hp = -999;
            u.corpseTimer = -999;
            spawnBloodParticles(u.x, u.y, 4, 16);
          } else {
            u.hp -= cfg.impactDamage;
            u.whiteFlashTimer = 0.12;
            spawnBloodParticles(u.x, u.y, 8, 14);
            addFloatingText(`${cfg.impactDamage}`, u.x, u.y, 18, '#fde047', true, 'WACK!');
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
    [addFloatingText, paused, spawnBloodParticles]
  );

  // Activate Top-Center Fury Bottle Buff (gives golden halo to all units + Bill Rifle Barrage)
  const triggerFuryWhiskeyBuff = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase !== 'combat' || paused) return;
    if (furyBuffCount > 0) {
      setFuryBuffCount((c) => Math.max(0, c - 1));
    }
    sim.billBarrageActiveTimer = 3.2;
    sim.units.forEach((u) => {
      if (u.team === 'survivor' && u.state !== 'corpse') {
        u.isLucky = true;
      }
    });
    soundFX.playCouragePickup();
    addFloatingText('¡FURIA ACTIVADA!', 280, 195, 25, '#fde047', true);
  }, [addFloatingText, furyBuffCount, paused]);

  const cycleSelectedSurvivor = useCallback(() => {
    const sim = simRef.current;
    const aliveSurvivors = sim.units.filter((u) => u.team === 'survivor' && u.state !== 'corpse');
    if (aliveSurvivors.length === 0) {
      sim.selectedUnitId = null;
      return;
    }
    const idx = aliveSurvivors.findIndex((u) => u.id === sim.selectedUnitId);
    const next = aliveSurvivors[(idx + 1) % aliveSurvivors.length];
    sim.units.forEach((u) => (u.isPlayerControlled = u.id === next.id));
    sim.selectedUnitId = next.id;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      simRef.current.keysPressed.add(key);

      if (key === '1') deploySurvivor('redneck');
      else if (key === '2') deploySurvivor('farmer');
      else if (key === '3') deploySurvivor('builder');
      else if (key === '4') deploySurvivor('policeman');
      else if (key === '5') deploySurvivor('mechanic');
      else if (key === '6' || key === 'q') {
        const m = simRef.current.mouseLogical;
        deployTacticalItem('blue_barrel', m.insideRoad ? m.x : 330, m.insideRoad ? m.y : 242);
      } else if (key === 'tab') {
        e.preventDefault();
        cycleSelectedSurvivor();
      } else if (key === ' ') {
        e.preventDefault();
        triggerFuryWhiskeyBuff();
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
  }, [cycleSelectedSurvivor, deploySurvivor, deployTacticalItem, triggerFuryWhiskeyBuff]);

  const getLogicalCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 320, y: 240, insideRoad: false };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    const insideRoad = x >= 120 && x <= 560 && y >= ROAD_Y_MIN - 15 && y <= ROAD_Y_MAX + 15;
    return { x, y, insideRoad };
  };

  const tryCollectPickupsAt = (lx: number, ly: number) => {
    const sim = simRef.current;
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
      const p = sim.pickups[i];
      if (Math.hypot(p.x - lx, p.y - ly) <= 28) {
        soundFX.playCouragePickup();
        if (p.kind === 'courage') {
          sim.courage = Math.min(100, sim.courage + p.amount);
          setCourage(Math.floor(sim.courage));
          addFloatingText(`+${p.amount}`, p.x, p.y, 16, '#38bdf8', true);
        } else {
          sim.rage = Math.min(100, sim.rage + p.amount);
          setRage(Math.floor(sim.rage));
        }
        sim.pickups.splice(i, 1);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getLogicalCoords(e.clientX, e.clientY);
    simRef.current.mouseLogical = coords;
    tryCollectPickupsAt(coords.x, coords.y);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getLogicalCoords(e.clientX, e.clientY);
    simRef.current.mouseLogical = coords;
    tryCollectPickupsAt(coords.x, coords.y);

    if (simRef.current.draggingItem) {
      deployTacticalItem(simRef.current.draggingItem, coords.x, coords.y);
      return;
    }

    const sim = simRef.current;
    const clickedSurvivor = sim.units.find(
      (u) =>
        u.team === 'survivor' &&
        u.state !== 'corpse' &&
        Math.hypot(u.x - coords.x, u.y - 14 - coords.y) <= 24
    );
    if (clickedSurvivor) {
      sim.units.forEach((u) => (u.isPlayerControlled = u.id === clickedSurvivor.id));
      sim.selectedUnitId = clickedSurvivor.id;
    }
  };

  // Main 60 FPS Simulation & Render Loop
  useEffect(() => {
    initDecalCanvas();

    // Start cleanly with NO player units outside the bus — only zombies near the right barricade!
    simRef.current.units = [];
    spawnZombie('walker', 465, 224);
    spawnZombie('walker', 505, 258);
    spawnZombie('bloated', 522, 238);

    let animationFrameId: number;
    let lastTime = performance.now();
    let uiSyncAccumulator = 0;

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;

      if (!paused && sim.phase !== 'victory' && sim.phase !== 'defeat') {
        let dt = rawDt;
        if (sim.hitStopTimer > 0) {
          sim.hitStopTimer -= rawDt;
          dt = rawDt * 0.15;
        }

        sim.time += dt;
        uiSyncAccumulator += dt;

        if (sim.screenShake > 0) sim.screenShake = Math.max(0, sim.screenShake - dt * 28);
        if (sim.doorOpenTimer > 0) sim.doorOpenTimer = Math.max(0, sim.doorOpenTimer - dt);
        if (sim.barricadeShake > 0) sim.barricadeShake = Math.max(0, sim.barricadeShake - dt * 5);
        if (sim.billFiringVisual > 0) sim.billFiringVisual = Math.max(0, sim.billFiringVisual - dt);

        if (sim.phase === 'bus_ramming') {
          sim.busX += 340 * dt;
          sim.screenShake = 4;
          sim.units.forEach((u) => {
            if (u.team === 'zombie' && u.x <= sim.busX + 145 && u.hp > 0) {
              u.hp = -999;
              spawnBloodParticles(u.x, u.y, 10, 20);
              stampBloodDecal(u.x, u.y, 12);
              addFloatingText('WACK!', u.x, u.y, 20, '#ef4444', true);
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

        if (sim.phase === 'combat') {
          sim.courage = Math.min(100, sim.courage + dt * 3.5);
          SURVIVOR_ORDER.forEach((k) => {
            if (sim.unitCooldowns[k] > 0) {
              sim.unitCooldowns[k] = Math.max(0, sim.unitCooldowns[k] - dt);
            }
          });
          (['blue_barrel', 'red_barrel', 'medkit'] as TacticalItemType[]).forEach((k) => {
            if (sim.itemCooldowns[k] > 0) {
              sim.itemCooldowns[k] = Math.max(0, sim.itemCooldowns[k] - dt);
            }
          });

          sim.timeRemaining = Math.max(0, sim.timeRemaining - dt);
          if (sim.timeRemaining <= 0 && !sim.hordeTriggered) {
            sim.hordeTriggered = true;
            setHordeTriggered(true);
            soundFX.playSiren();
            sim.screenShake = 9;
            for (let i = 0; i < 7; i++) {
              spawnZombie(i % 2 === 0 ? 'runner' : 'crit_zombie', 530 + i * 14);
            }
          }

          sim.waveTimer -= dt;
          if (sim.waveTimer <= 0) {
            sim.waveTimer = sim.hordeTriggered
              ? 1.4
              : mission.waveInterval * (0.85 + Math.random() * 0.3);
            const pool = mission.zombiePool;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            spawnZombie(pick);
          }

          sim.skeletonTimer -= dt;
          if (sim.skeletonTimer <= 0) {
            sim.skeletonTimer = 11 + Math.random() * 5;
            const ambushX = 240 + Math.random() * 190;
            const ambushY = ROAD_Y_MIN + 14 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 28);
            spawnZombie('skeleton', ambushX, ambushY);
          }

          // Sheriff Bill Roof Rifle Defense
          if (sim.billBarrageActiveTimer > 0) {
            sim.billBarrageActiveTimer -= dt;
            if (Math.random() < 0.35) {
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
                spawnBloodParticles(target.x, target.y, 12, 6);
                addFloatingText(`${dmg}`, target.x, target.y, 20, '#fde047', true, 'WACK!');
              }
            }
          } else {
            sim.billShotTimer -= dt;
            if (sim.billShotTimer <= 0) {
              const closeZombie = sim.units
                .filter((u) => u.team === 'zombie' && u.state !== 'corpse' && u.x < 340 && u.hp > 0)
                .sort((a, b) => a.x - b.x)[0];
              if (closeZombie) {
                sim.billShotTimer = 2.0;
                sim.billFiringVisual = 0.14;
                soundFX.playRifle();
                scareCrows();
                const dmg = Math.round((24 + progress.billDamageBonus) * (1 - closeZombie.bulletResist));
                closeZombie.hp -= dmg;
                closeZombie.whiteFlashTimer = 0.1;
                closeZombie.vx += 20;
                spawnBloodParticles(closeZombie.x, closeZombie.y, 12, 8);
                addFloatingText(`${dmg}`, closeZombie.x, closeZombie.y, 20, '#fde047');
              } else {
                sim.billShotTimer = 0.4;
              }
            }
          }

          // Obstacles
          for (let i = sim.obstacles.length - 1; i >= 0; i--) {
            const obs = sim.obstacles[i];
            if (obs.whiteFlashTimer > 0) obs.whiteFlashTimer = Math.max(0, obs.whiteFlashTimer - dt);
            if (obs.hp <= 0) {
              if (obs.type === 'red_barrel') {
                triggerExplosion(obs.x, obs.y, 52, 65, true);
              } else {
                soundFX.playBarricadeBash();
              }
              sim.obstacles.splice(i, 1);
            }
          }

          // WASD Direct Movement + Combat AI
          const keys = sim.keysPressed;
          const wasdDx =
            (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
            (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
          const wasdDy =
            (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
            (keys.has('w') || keys.has('arrowup') ? 1 : 0);
          const isUsingWasd = wasdDx !== 0 || wasdDy !== 0;

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

            if (u.z > 0 || u.vz !== 0) {
              u.z += u.vz * dt;
              u.vz -= 220 * dt;
              if (u.z <= 0) {
                u.z = 0;
                u.vz = 0;
              }
            }

            if (Math.abs(u.vx) > 0.5 || Math.abs(u.vy) > 0.5) {
              u.x += u.vx * dt;
              u.y += u.vy * dt;
              u.vx *= Math.pow(0.08, dt);
              u.vy *= Math.pow(0.08, dt);
            }

            u.x = Math.max(sim.busX + 102, Math.min(sim.barricadeX - 10, u.x));
            u.y = Math.max(ROAD_Y_MIN, Math.min(ROAD_Y_MAX, u.y));

            if (u.state === 'corpse') {
              u.corpseTimer = (u.corpseTimer ?? 3.8) - dt;
              if (u.corpseTimer <= -900) {
                sim.units.splice(i, 1);
                continue;
              }
              if (u.corpseTimer <= 0) {
                const zType = u.infectedZombieType ?? 'runner';
                soundFX.playZombieReanimate();
                spawnZombie(zType, u.x, u.y, true);
                sim.units.splice(i, 1);
              }
              continue;
            }

            if (u.hp <= 0) {
              stampBloodDecal(u.x, u.y, 11);
              spawnBloodParticles(u.x, u.y, 8, 22);

              if (u.team === 'zombie') {
                sim.zombiesKilled += 1;
                const rageGain = u.rageReward ?? 4;
                sim.rage = Math.min(100, sim.rage + rageGain);

                if (u.explodesOnDeath) {
                  triggerExplosion(u.x, u.y, 44, 34, false);
                }

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
                if (u.infectedZombieType) {
                  u.state = 'corpse';
                  u.corpseTimer = 4.2;
                  u.corpseMaxTimer = 4.2;
                  u.isPlayerControlled = false;
                } else {
                  sim.units.splice(i, 1);
                }
                continue;
              }
            }

            if (u.state === 'emerging') {
              if (u.animTime >= 1.1) {
                u.state = 'march';
                u.animTime = 0;
              }
              continue;
            }

            if (u.team === 'survivor') {
              for (let pIdx = sim.pickups.length - 1; pIdx >= 0; pIdx--) {
                const pk = sim.pickups[pIdx];
                if (Math.hypot(u.x - pk.x, u.y - pk.y) <= 22) {
                  soundFX.playCouragePickup();
                  sim.courage = Math.min(100, sim.courage + pk.amount);
                  setCourage(Math.floor(sim.courage));
                  addFloatingText(`+${pk.amount}`, pk.x, pk.y, 16, '#38bdf8', true);
                  sim.pickups.splice(pIdx, 1);
                }
              }
            }

            if (u.state === 'reload') {
              u.reloadTimer += dt;
              u.reloadProgress = Math.min(1, u.reloadTimer / u.reloadTime);
              if (u.reloadTimer >= u.reloadTime) {
                u.ammo = u.maxAmmo;
                u.state = 'march';
                u.reloadProgress = 0;
              }
              if (u.isPlayerControlled && isUsingWasd) {
                const len = Math.hypot(wasdDx, wasdDy) || 1;
                u.x += (wasdDx / len) * u.speed * 0.9 * dt;
                u.y += (wasdDy / len) * u.speed * 0.75 * dt;
              }
              continue;
            }

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

            if (u.attackTimer > 0) {
              u.attackTimer = Math.max(0, u.attackTimer - dt);
            }

            if (u.team === 'survivor' && u.isPlayerControlled && isUsingWasd) {
              const len = Math.hypot(wasdDx, wasdDy) || 1;
              u.x += (wasdDx / len) * u.speed * 1.25 * dt;
              u.y += (wasdDy / len) * u.speed * 0.95 * dt;
              u.facing = wasdDx < 0 ? -1 : 1;
              u.state = 'march';
            }

            if (u.team === 'survivor') {
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
                    u.ammo -= 1;
                    soundFX.playShotgun();
                    sim.screenShake = Math.max(sim.screenShake, 2.5);
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
                        spawnBloodParticles(z.x, z.y, 12, 12);
                        addFloatingText(
                          `${totalPelletDmg}?`,
                          z.x,
                          z.y,
                          20,
                          '#fde047',
                          true,
                          'WACK!'
                        );
                      }
                    });
                  } else {
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
                    spawnBloodParticles(closestZ.x, closestZ.y, 12, 18);
                    addFloatingText(
                      `${dmg}?`,
                      closestZ.x,
                      closestZ.y,
                      22,
                      '#fde047',
                      true,
                      'WACK!'
                    );
                  }
                }
              } else if (distToBarricade <= (u.isRanged ? 90 : 28)) {
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
                  addFloatingText(`${dmg}`, sim.barricadeX - 18, u.y, 22, '#fde047', true, 'WACK!');

                  if (sim.barricadeHp <= 0 && sim.phase === 'combat') {
                    sim.phase = 'bus_ramming';
                    soundFX.playExplosion();
                    soundFX.playBusEngineRam();
                    sim.screenShake = 10;
                  }
                }
              } else if (!(u.isPlayerControlled && isUsingWasd)) {
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
              // Zombie AI
              u.facing = -1;
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
                }
                continue;
              }

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
                  spawnBloodParticles(closestS.x, closestS.y, 12, 16);
                  addFloatingText(`${dmg}?`, closestS.x, closestS.y, 20, '#fde047', true, 'WACK!');
                }
              } else if (u.x <= sim.busX + 148) {
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  soundFX.playBarricadeBash();
                  sim.busHp = Math.max(0, sim.busHp - u.damage);
                  sim.busDamagedEver = true;
                  sim.screenShake = 4;

                  if (progress.spikedBumper) {
                    u.hp -= 12;
                    u.whiteFlashTimer = 0.1;
                    spawnBloodParticles(u.x, u.y, 10, 8);
                  }

                  if (sim.busHp <= 0) {
                    sim.phase = 'defeat';
                    soundFX.playExplosion();
                    setBattleResult('defeat');
                  }
                }
              } else {
                u.state = 'march';
                if (closestS && Math.abs(closestS.x - u.x) < 120) {
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
                stampBloodDecal(p.x, p.y, p.size + 1, p.color);
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
            ft.z += 20 * dt;
            if (ft.life <= 0) sim.floatingTexts.splice(i, 1);
          }

          if (uiSyncAccumulator >= 0.1) {
            uiSyncAccumulator = 0;
            setCourage(Math.floor(sim.courage));
            setRage(Math.floor(sim.rage));
            setBusHp(Math.max(0, Math.round(sim.busHp)));
            setBarricadeHp(Math.max(0, Math.round(sim.barricadeHp)));
            setUnitCooldowns({ ...sim.unitCooldowns });
            setItemCooldowns({ ...sim.itemCooldowns });
            setTimeRemaining(Math.ceil(sim.timeRemaining));
          }
        }
      }

      // =======================================================
      // RENDER PIPELINE (Full-Bleed 640x360 matching screenshot)
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

        // LAYER 0: Biome Sky, Forest, Wrecked SUV & Dirt Road
        renderBiomeBackground(ctx, mission.biome, sim.time);

        // LAYER 1: Persistent Decal Buffer (Blood puddles)
        if (decalCanvasRef.current) {
          ctx.drawImage(decalCanvasRef.current, 0, 0);
        }

        // Drag & Drop Target Circle on the Road
        if (sim.draggingItem) {
          const cfg = TACTICAL_ITEM_CONFIGS[sim.draggingItem];
          const tx = Math.max(145, Math.min(sim.barricadeX - 24, sim.mouseLogical.x));
          const ty = Math.max(ROAD_Y_MIN + 4, Math.min(ROAD_Y_MAX - 4, sim.mouseLogical.y));
          ctx.strokeStyle = '#84cc16';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius, cfg.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(132, 204, 22, 0.22)';
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius, cfg.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // LAYER 2: Y-Sorted Entities
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
          { kind: 'bus', y: sim.busY + 66 },
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

        // Foreground Left Military Truck & Oil Drums (matching bottom-left of screenshot!)
        renderForegroundLeftProps(ctx);

        // LAYER 3: Flying Crows, Blood Particles & "17? / WACK!" Popups
        sim.crows.forEach((c) => renderCrow(ctx, c, sim.time));

        sim.particles.forEach((p) => {
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y - p.z), p.size, p.size);
        });

        sim.floatingTexts.forEach((ft) => {
          ctx.save();
          const tx = Math.round(ft.x);
          const ty = Math.round(ft.y - ft.z);
          ctx.textAlign = 'center';

          if (ft.subText) {
            // Yellow damage number "17?" on top + red-orange "WACK!" underneath (exact match to screenshot!)
            ctx.font = 'bold 10px "Press Start 2P", monospace';
            ctx.fillStyle = '#181410';
            ctx.fillText(ft.text, tx + 1, ty - 7);
            ctx.fillStyle = '#facc15';
            ctx.fillText(ft.text, tx, ty - 8);

            ctx.font = 'bold 7px "Press Start 2P", monospace';
            ctx.fillStyle = '#181410';
            ctx.fillText(ft.subText, tx + 1, ty + 2);
            ctx.fillStyle = '#ea580c';
            ctx.fillText(ft.subText, tx, ty + 1);
          } else {
            ctx.font = ft.isComic
              ? 'bold 8px "Press Start 2P", monospace'
              : 'bold 7px "Chakra Petch", sans-serif';
            ctx.fillStyle = '#181410';
            ctx.fillText(ft.text, tx + 1, ty + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, tx, ty);
          }
          ctx.restore();
        });

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    addFloatingText,
    deploySurvivor,
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

  const selectDraggingBarrel = () => {
    const rCost = getEffectiveRageCost('blue_barrel');
    if (rage < rCost || itemCooldowns.blue_barrel > 0) return;
    const next = draggingItem === 'blue_barrel' ? null : 'blue_barrel';
    setDraggingItem(next);
    simRef.current.draggingItem = next;
  };

  return (
    <div className="relative w-full h-full bg-[#322f24] select-none overflow-hidden">
      {/* FULLSCREEN 16:9 PIXEL-ART CANVAS (NO TOP OR BOTTOM BARS!) */}
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
        className="absolute inset-0 w-full h-full object-fill pixel-canvas cursor-crosshair"
      />

      {/* ===================================================================== */}
      {/* TOP-LEFT FLOATING HUD: Pause "||", Courage (16), Rage (4) & Water Pips */}
      {/* ===================================================================== */}
      <div className="absolute top-1.5 left-3 z-20 flex items-start gap-1.5">
        <div className="flex flex-col items-center gap-1">
          {/* White Pause Icon "||" */}
          <button
            onClick={() => {
              soundFX.unlockAudio();
              setPaused((p) => !p);
            }}
            className="mt-0.5 text-white/90 hover:text-white font-pixel text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] px-1"
            title="Pausar / Menú"
          >
            {paused ? '▶' : '||'}
          </button>

          {/* Quick Sound Activate/Mute Toggle */}
          <button
            onClick={() => {
              if (soundFX.muted) {
                soundFX.muted = false;
                soundFX.unlockAudio();
                soundFX.playCouragePickup();
              } else {
                soundFX.muted = true;
              }
            }}
            className="text-xs px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
            title="Activar / Silenciar Sonido"
          >
            🔊
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Blue Courage Bar (16) */}
          <div className="relative flex items-center">
            <div className="z-10 -mr-2 w-7 h-7 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              <div className="flex items-end gap-0.5">
                <div className="w-2 h-4 bg-sky-400 border border-slate-950 rounded-t-xs" />
                <div className="w-2.5 h-5 bg-sky-300 border border-slate-950 rounded-t-xs" />
                <div className="w-2 h-4 bg-sky-500 border border-slate-950 rounded-t-xs" />
              </div>
            </div>
            <div className="min-w-[82px] sm:min-w-[96px] h-6 bg-[#7a825c]/90 border-2 border-[#2a2e1e] rounded-xs flex items-center justify-start pl-3.5 pr-2 shadow-md">
              <span
                className="font-tactical font-extrabold text-sm sm:text-base text-white leading-none"
                style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
              >
                {courage}
              </span>
            </div>
          </div>

          {/* Red Rage Bar (4) */}
          <div className="relative flex items-center">
            <div className="z-10 -mr-2 w-7 h-7 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              <div className="w-4 h-5 bg-gradient-to-b from-red-400 to-red-700 border border-slate-950 rounded-full rounded-t-xs rotate-12" />
            </div>
            <div className="min-w-[82px] sm:min-w-[96px] h-6 bg-[#7a825c]/90 border-2 border-[#2a2e1e] rounded-xs flex items-center justify-start pl-3.5 pr-2 shadow-md">
              <span
                className="font-tactical font-extrabold text-sm sm:text-base text-[#ff5a5a] leading-none"
                style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
              >
                {rage}
              </span>
            </div>
          </div>

          {/* Small Blue Drop + 3 Green Pips (toggles Mobile Touch WASD Pad / Cycles Unit) */}
          <button
            onClick={() => {
              setShowDpad((s) => !s);
              cycleSelectedSurvivor();
            }}
            className="flex flex-col items-center w-7 mt-0.5 cursor-pointer group"
            title="Cambiar unidad WASD / Mostrar D-Pad Táctil"
          >
            <div className="w-4 h-4 rounded-full bg-slate-900 border border-sky-400 flex items-center justify-center text-[9px]">
              💧
            </div>
            <div className="flex gap-0.5 mt-0.5">
              <span className="w-1.5 h-1 bg-emerald-400 border border-black" />
              <span className="w-1.5 h-1 bg-emerald-400 border border-black" />
              <span className="w-1.5 h-1 bg-zinc-700 border border-black" />
            </div>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP-CENTER FLOATING BUFF BOTTLE (Glowing Orange Bottle with badge "1") */}
      {/* ===================================================================== */}
      <button
        onClick={triggerFuryWhiskeyBuff}
        className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-11 h-11 cursor-pointer group"
        title="Activar Botella de Furia / Ráfaga de Bill [Espacio]"
      >
        <div className="absolute inset-0 rounded-full bg-red-500/45 blur-md animate-pulse" />
        <div className="relative w-5 h-8 bg-gradient-to-b from-amber-300 via-orange-500 to-red-700 border-2 border-[#1c1917] rounded-xs flex flex-col items-center justify-center shadow-lg">
          <div className="w-2 h-2 bg-amber-200 border border-black -mt-3 mb-1" />
          <div className="w-3 h-3 bg-fef08a/90 rounded-xs" />
        </div>
        <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-400 text-[9px] font-bold text-white flex items-center justify-center">
          {furyBuffCount}
        </span>
      </button>

      {/* ===================================================================== */}
      {/* TOP-RIGHT FLOATING COINS / SCORE BAR ("403" + Gold Skull Coin)         */}
      {/* ===================================================================== */}
      <div className="absolute top-2 right-3 z-20 flex items-center gap-2">
        <button
          onClick={onRetreat}
          className="px-2 py-0.5 rounded bg-zinc-900/75 hover:bg-zinc-800 border border-zinc-600 text-[10px] font-bold text-zinc-200"
          title="Volver al Mapa de Carretera"
        >
          Mapa
        </button>

        <div className="relative flex items-center">
          <div className="min-w-[86px] sm:min-w-[100px] h-6 bg-[#7a825c]/90 border-2 border-[#2a2e1e] rounded-xs flex items-center justify-end pr-4 pl-2 shadow-md">
            <span
              className="font-tactical font-extrabold text-sm sm:text-base text-white leading-none"
              style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
            >
              {progress.coins + barHpDisplay(barricadeHp)}
            </span>
          </div>
          <div className="z-10 -ml-2.5 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-amber-600 border-2 border-[#1c1917] flex items-center justify-center shadow-md">
            <span className="text-xs leading-none">🪙</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT-SIDE FLOATING TIMER ("02:25") & ORANGE SKULL HORDE BUTTON        */}
      {/* ===================================================================== */}
      <div className="absolute top-[25%] right-4 z-20 flex flex-col items-center">
        <span
          className="font-tactical font-bold text-xs text-white mb-0.5"
          style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}
        >
          {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:
          {String(timeRemaining % 60).padStart(2, '0')}
        </span>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 border-2 border-white shadow-lg flex items-center justify-center ${
            hordeTriggered ? 'animate-bounce ring-4 ring-red-500' : ''
          }`}
          title="Temporizador de la Horda Final"
        >
          <span className="text-lg leading-none drop-shadow">💀</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* OPTIONAL TOUCH WASD D-PAD (bottom-left, toggleable with water drop)    */}
      {/* ===================================================================== */}
      {showDpad && (
        <div className="absolute bottom-2 left-3 z-30 grid grid-cols-3 gap-1 w-24 h-24 opacity-85 select-none touch-none">
          <div />
          <button
            type="button"
            onPointerDown={() => simRef.current.keysPressed.add('w')}
            onPointerUp={() => simRef.current.keysPressed.delete('w')}
            onPointerLeave={() => simRef.current.keysPressed.delete('w')}
            className="bg-zinc-900/90 active:bg-emerald-600 border border-zinc-600 rounded flex items-center justify-center text-white font-bold text-xs"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => simRef.current.keysPressed.add('a')}
            onPointerUp={() => simRef.current.keysPressed.delete('a')}
            onPointerLeave={() => simRef.current.keysPressed.delete('a')}
            className="bg-zinc-900/90 active:bg-emerald-600 border border-zinc-600 rounded flex items-center justify-center text-white font-bold text-xs"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={cycleSelectedSurvivor}
            className="bg-emerald-950/90 border border-emerald-500 rounded flex items-center justify-center text-emerald-300 font-bold text-[8px]"
          >
            TAB
          </button>
          <button
            type="button"
            onPointerDown={() => simRef.current.keysPressed.add('d')}
            onPointerUp={() => simRef.current.keysPressed.delete('d')}
            onPointerLeave={() => simRef.current.keysPressed.delete('d')}
            className="bg-zinc-900/90 active:bg-emerald-600 border border-zinc-600 rounded flex items-center justify-center text-white font-bold text-xs"
          >
            ▶
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => simRef.current.keysPressed.add('s')}
            onPointerUp={() => simRef.current.keysPressed.delete('s')}
            onPointerLeave={() => simRef.current.keysPressed.delete('s')}
            className="bg-zinc-900/90 active:bg-emerald-600 border border-zinc-600 rounded flex items-center justify-center text-white font-bold text-xs"
          >
            ▼
          </button>
          <div />
        </div>
      )}

      {/* ===================================================================== */}
      {/* BOTTOM-CENTER FLOATING 6-SLOT SQUARE DECK (Exact match to screenshot!) */}
      {/* ===================================================================== */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 flex items-end gap-1.5">
        {SURVIVOR_ORDER.map((sType, idx) => {
          const cfg = SURVIVOR_CONFIGS[sType];
          const cd = unitCooldowns[sType];
          const canAfford = courage >= cfg.cost && cd <= 0;
          const lvl = idx === 4 ? 4 : 5; // Matching levels 5, 5, 5, 5, 4 in screenshot!

          return (
            <button
              key={sType}
              onClick={() => deploySurvivor(sType)}
              disabled={!canAfford}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xs transition select-none flex flex-col justify-between p-1 ${
                canAfford
                  ? 'bg-[#3b3829]/85 border border-[#787459] shadow-lg cursor-pointer hover:scale-105'
                  : 'bg-[#2a271d]/80 border border-[#3d392b] cursor-not-allowed'
              }`}
              title={`${cfg.name} (Coste: ${cfg.cost} Valor)`}
            >
              {/* Cooldown Fill Sweep */}
              {cd > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
                  style={{ height: `${Math.min(100, (cd / cfg.prepTime) * 100)}%` }}
                />
              )}

              {/* Top-Right Level Badge ("5") */}
              <div className="w-full flex justify-end z-10">
                <span
                  className={`px-1 text-[9px] font-extrabold leading-tight rounded-xs ${
                    canAfford
                      ? 'bg-[#2b6cb0] text-white border border-black'
                      : 'text-[#8c856b]'
                  }`}
                >
                  {lvl}
                </span>
              </div>

              {/* Center Pixel Portrait (Bright when ready, dark silhouette when unavailable!) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <UnitSlotMiniPortrait type={sType} active={canAfford} />
              </div>

              {/* Bottom Cost Row: Blue Water Drop + Cost ("15" / "20") */}
              <div className="w-full flex items-center justify-between z-10 mt-auto">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                    canAfford
                      ? 'bg-slate-900 border border-sky-400 text-sky-300'
                      : 'bg-zinc-900/70 text-zinc-600'
                  }`}
                >
                  💧
                </span>
                <span
                  className={`font-tactical font-extrabold text-xs leading-none ${
                    canAfford ? 'text-white' : 'text-[#524e3c]'
                  }`}
                  style={
                    canAfford
                      ? { textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }
                      : undefined
                  }
                >
                  {cfg.cost}
                </span>
              </div>
            </button>
          );
        })}

        {/* SLOT 6: TACTICAL BARREL SLOT (Curved Green Drop Arrow + Red "6" Cost like screenshot!) */}
        {(() => {
          const rCost = getEffectiveRageCost('blue_barrel');
          const cd = itemCooldowns.blue_barrel;
          const canAfford = rage >= rCost && cd <= 0;
          const isSelected = draggingItem === 'blue_barrel';

          return (
            <button
              onPointerDown={() => {
                if (canAfford) {
                  setDraggingItem('blue_barrel');
                  simRef.current.draggingItem = 'blue_barrel';
                }
              }}
              onClick={selectDraggingBarrel}
              disabled={!canAfford}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xs transition select-none flex flex-col justify-between p-1 ${
                isSelected
                  ? 'bg-emerald-950/90 border-2 border-lime-400 scale-105'
                  : canAfford
                  ? 'bg-[#3b3829]/85 border border-[#787459] cursor-grab hover:scale-105'
                  : 'bg-[#2a271d]/80 border border-[#3d392b] cursor-not-allowed'
              }`}
              title="Arrastra o toca para lanzar Barril (6 Furia)"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-5 h-7 rounded-xs border ${
                    canAfford
                      ? 'bg-[#294257] border-black'
                      : 'bg-[#1f1d15] border-[#2e2b20]'
                  }`}
                />
              </div>

              <div className="w-full flex items-center justify-between z-10 mt-auto">
                {/* Curved drop arrow onto green target circle (matching slot 6 in screenshot!) */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-zinc-300 leading-none">⤵</span>
                  <span className="w-3 h-1 rounded-full bg-lime-500 border border-black" />
                </div>
                <span
                  className={`font-tactical font-extrabold text-xs leading-none ${
                    canAfford ? 'text-[#ff5a5a]' : 'text-[#572822]'
                  }`}
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  {rCost}
                </span>
              </div>
            </button>
          );
        })()}
      </div>

      {/* VICTORY OR DEFEAT MODAL OVERLAY */}
      {battleResult !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-zinc-900 border-2 border-yellow-500 rounded-xl p-5 text-center shadow-2xl">
            {battleResult === 'victory' ? (
              <>
                <div className="font-pixel text-base text-yellow-400 mb-1.5">
                  ¡BARRICADA DEMOLIDA!
                </div>
                <div className="flex items-center justify-center gap-2 my-2">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className={`text-3xl ${
                        s <= starsEarned ? 'text-yellow-400' : 'text-zinc-700'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-300 mb-4">
                  Recompensa: <strong className="text-yellow-400">+{mission.coinsReward + starsEarned * 15} 🪙</strong> ({zombiesKilledCount} zombis abatidos)
                </p>
                <button
                  onClick={() =>
                    onVictory(
                      starsEarned,
                      mission.coinsReward + starsEarned * 15,
                      zombiesKilledCount
                    )
                  }
                  className="w-full py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider"
                >
                  Continuar →
                </button>
              </>
            ) : (
              <>
                <div className="font-pixel text-base text-red-500 mb-2">¡EL AUTOBÚS CAYÓ!</div>
                <button
                  onClick={onRetreat}
                  className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                >
                  Volver al Mapa
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function barHpDisplay(hp: number) {
  return Math.max(0, Math.round(hp));
}

// Detailed Pixel-Art Portrait for the 6 Bottom Deck Slots
const UnitSlotMiniPortrait: React.FC<{ type: SurvivorType; active: boolean }> = ({
  type,
  active,
}) => {
  const hatColor =
    type === 'redneck'
      ? '#0284c7'
      : type === 'builder'
      ? '#facc15'
      : type === 'farmer'
      ? '#eab308'
      : type === 'policeman'
      ? '#1e3a8a'
      : '#334155';

  const shirtColor =
    type === 'redneck'
      ? '#f5b882'
      : type === 'builder'
      ? '#6b653b'
      : type === 'farmer'
      ? '#cbd5e1'
      : type === 'policeman'
      ? '#172554'
      : '#0369a1';

  const overallsColor =
    type === 'redneck' || type === 'farmer'
      ? '#1d4ed8'
      : type === 'builder'
      ? '#facc15'
      : '#09090b';

  return (
    <svg
      viewBox="0 0 16 18"
      className={`w-8 h-9 sm:w-9 sm:h-10 ${
        active ? 'opacity-100' : 'brightness-0 opacity-45'
      }`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      {/* 1px Black Outline Silhouette */}
      <rect x="4" y="1" width="8" height="4" fill="#14110f" />
      <rect x="3" y="4" width="10" height="6" fill="#14110f" />
      <rect x="2" y="10" width="12" height="7" fill="#14110f" />
      {/* Hat / Helmet */}
      <rect x="5" y="2" width="6" height="2" fill={hatColor} />
      <rect x="4" y="3" width="9" height="1" fill={hatColor} />
      {/* Face & Eyes */}
      <rect x="4" y="4" width="7" height="5" fill="#f5b882" />
      <rect x="9" y="5" width="1" height="2" fill="#18181b" />
      {/* Torso & Overalls */}
      <rect x="3" y="10" width="9" height="6" fill={shirtColor} />
      <rect x="4" y="12" width="7" height="4" fill={overallsColor} />
      {/* Weapon Silhouette on Right */}
      <rect x="12" y="7" width="2" height="8" fill="#14110f" />
      <rect x="12" y="8" width="1" height="6" fill="#94a3b8" />
    </svg>
  );
};

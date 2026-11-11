import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  getNextLockedUnit,
  getUnitUnlockedAtLevel,
  getXpForNextLevel,
  MAX_COMMANDER_LEVEL,
  MissionNode,
  PlayerProgress,
  SHORT_TACTICAL_NAMES,
  SHORT_UNIT_NAMES,
  SURVIVOR_CONFIGS,
  SURVIVOR_ORDER,
  SurvivorType,
  TACTICAL_ITEM_CONFIGS,
  TacticalItemType,
  ZOMBIE_CONFIGS,
  ZOMBIE_XP_REWARD,
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
  RenderShell,
  RenderTracer,
  RenderUnit,
  renderArmoredBus,
  renderBarricade,
  renderBiomeBackground,
  renderCharacterPreview,
  renderCrow,
  renderDropPickup,
  renderDynamicLightmap,
  renderFireZone,
  renderForegroundLeftProps,
  renderTacticalObstacle,
  renderTracersAndShells,
  renderUnitSprite,
  syncCanvasHiDPI,
} from '../engine/PixelArtRenderer';
import { soundFX } from '../engine/SoundFX';

interface BattleArenaProps {
  mission: MissionNode;
  progress: PlayerProgress;
  isPortrait?: boolean;
  onVictory: (stars: number, coinsEarned: number, zombiesKilled: number) => void;
  onRetreat: () => void;
  onLevelUpCommander?: (newLevel: number, newXp: number) => void;
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
  meleeResist: number;
  armorPiercing: number;
  firstHitCritMult: number;
  isStationary: boolean;
  isFlying: boolean;
  isFlame: boolean;
  barricadeMultiplier: number;
  infectedZombieType?: ZombieType;
  critChance: number;
  critMultiplier: number;
  explodesOnDeath?: boolean;
  rageReward?: number;
  courageDropChance?: number;
  deathProcessed?: boolean;
  markedForRemoval?: boolean;
}

const TACTICAL_ORDER: TacticalItemType[] = ['blue_barrel', 'red_barrel', 'medkit'];

const INITIAL_UNIT_COOLDOWNS: Record<SurvivorType, number> = {
  redneck: 0,
  farmer: 0,
  builder: 0,
  mechanic: 0,
  hound: 0,
  policeman: 0,
  sniper: 0,
  flamethrower: 0,
  turret: 0,
  drone: 0,
  juggernaut: 0,
};

export const BattleArena: React.FC<BattleArenaProps> = ({
  mission,
  progress,
  isPortrait = false,
  onVictory,
  onRetreat,
  onLevelUpCommander,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

  // Live Bridge Ref: decouples 60 FPS simulation from React parent re-renders!
  const liveBridgeRef = useRef({
    progress,
    onVictory,
    onRetreat,
    onLevelUpCommander,
  });
  useEffect(() => {
    liveBridgeRef.current = {
      progress,
      onVictory,
      onRetreat,
      onLevelUpCommander,
    };
  }, [progress, onVictory, onRetreat, onLevelUpCommander]);

  // HUD Reactive State — Tactical Sweet Spot: 28 Courage (+2.20/s) & 8 Rage (+reactive comeback)
  const [courage, setCourage] = useState<number>(28);
  const [rage, setRage] = useState<number>(8);
  const [commanderLevel, setCommanderLevel] = useState<number>(progress.busLevel || 1);
  const [commanderXp, setCommanderXp] = useState<number>(progress.commanderXp || 0);
  const [levelUpBanner, setLevelUpBanner] = useState<{
    level: number;
    unitType?: SurvivorType;
    unitName?: string;
    roleTitle?: string;
  } | null>(null);
  const maxBusHp = 200 + progress.busHpBonus;
  const [busHp, setBusHp] = useState<number>(maxBusHp);
  const [barricadeHp, setBarricadeHp] = useState<number>(mission.barricadeHp);
  const [unitCooldowns, setUnitCooldowns] =
    useState<Record<SurvivorType, number>>(INITIAL_UNIT_COOLDOWNS);
  const [itemCooldowns, setItemCooldowns] = useState<Record<TacticalItemType, number>>({
    blue_barrel: 0,
    red_barrel: 0,
    medkit: 0,
  });
  const [furyBuffCount, setFuryBuffCount] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(150);
  const [hordeTriggered, setHordeTriggered] = useState<boolean>(false);
  const [rushWarningState, setRushWarningState] = useState<{ active: boolean; yPct: number }>({
    active: false,
    yPct: 65,
  });
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const [draggingItem, setDraggingItem] = useState<TacticalItemType | null>(null);
  const [battleResult, setBattleResult] = useState<'none' | 'victory' | 'defeat'>('none');
  const [starsEarned, setStarsEarned] = useState<number>(3);
  const [zombiesKilledCount, setZombiesKilledCount] = useState<number>(0);
  const [showDpad, setShowDpad] = useState<boolean>(false);

  const initialSector = mission.id <= 3 ? 1 : mission.id <= 6 ? 2 : mission.id <= 9 ? 3 : 4;

  // Mutable Simulation Ref
  const simRef = useRef({
    time: 0,
    courage: 28,
    rage: 8,
    commanderLevel: progress.busLevel || 1,
    commanderXp: progress.commanderXp || 0,
    levelShockwaveTimer: 0,
    barricadeHalfXpAwarded: false,
    busHp: maxBusHp,
    maxBusHp,
    busDamagedEver: false,
    busX: -2,
    busY: 100,
    doorOpenTimer: 0,
    barricadeHp: mission.barricadeHp,
    maxBarricadeHp: mission.barricadeHp,
    barricadeX: 614,
    barricadeShake: 0,
    barricadeThresholdIdx: 0,
    rushPackTimer: initialSector === 1 ? 36 : initialSector === 2 ? 32 : initialSector === 3 ? 28 : 24,
    rushWarningTimer: 0,
    rushWarningY: 228,
    waveCount: 0,
    emptyRoadTimer: 0,
    medkitTickTimer: 0,
    billShotTimer: 1.6,
    billFiringVisual: 0,
    billBarrageActiveTimer: 0,
    unitCooldowns: { ...INITIAL_UNIT_COOLDOWNS } as Record<SurvivorType, number>,
    itemCooldowns: {
      blue_barrel: 0,
      red_barrel: 0,
      medkit: 0,
    } as Record<TacticalItemType, number>,
    units: [] as InternalUnit[],
    obstacles: [] as RenderObstacle[],
    pickups: [] as RenderPickup[],
    crows: [
      { x: 310, y: 212, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 0 },
      { x: 390, y: 238, z: 0, vx: 0, vy: 0, vz: 0, flying: false, animOffset: 1.7 },
    ] as RenderCrow[],
    particles: [] as RenderParticle[],
    tracers: [] as RenderTracer[],
    shells: [] as RenderShell[],
    floatingTexts: [] as RenderFloatingText[],
    fireZones: [] as RenderFireZone[],
    keysPressed: new Set<string>(),
    selectedUnitId: null as string | null,
    mouseLogical: { x: 360, y: 228, insideRoad: false },
    draggingItem: null as TacticalItemType | null,
    waveTimer: initialSector === 1 ? 5.2 : initialSector === 2 ? 4.5 : 3.8,
    skeletonTimer: mission.skeletonAmbush ? 14.0 : 9999,
    timeRemaining: 150,
    hordeTriggered: false,
    screenShake: 0,
    hitStopTimer: 0,
    phase: 'combat' as 'combat' | 'bus_ramming' | 'victory' | 'defeat',
    zombiesKilled: 0,
  });

  const pauseBattle = useCallback(() => {
    if (simRef.current.phase === 'victory' || simRef.current.phase === 'defeat') return;
    pausedRef.current = true;
    simRef.current.hitStopTimer = 0;
    simRef.current.keysPressed.clear();
    setPaused(true);
    soundFX.suspendForBackground();
  }, []);

  const resumeBattle = useCallback(() => {
    pausedRef.current = false;
    simRef.current.hitStopTimer = 0;
    setPaused(false);
    soundFX.resumeFromBackground();
    soundFX.unlockAudio();
  }, []);

  // Automatically pause the battle & audio if the user leaves the app, switches tabs, or locks screen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        pauseBattle();
      }
    };
    const handleWindowBlur = () => {
      pauseBattle();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('freeze', handleWindowBlur);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handleWindowBlur);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handleWindowBlur);
    };
  }, [pauseBattle]);

  useEffect(() => {
    if (isPortrait) {
      pauseBattle();
    }
  }, [isPortrait, pauseBattle]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  // Smooth HD organic blood & blast crater decal stamper (2x physical buffer)
  const stampBloodDecal = useCallback((x: number, y: number, radius = 8, color = '#991b1b') => {
    const dctx = decalCanvasRef.current?.getContext('2d');
    if (!dctx) return;
    const ry = Math.max(ROAD_Y_MIN - 4, Math.min(ROAD_Y_MAX + 6, y));
    const isCrater = color === '#27272a';

    dctx.save();
    dctx.fillStyle = isCrater ? 'rgba(18, 16, 15, 0.72)' : 'rgba(127, 29, 29, 0.72)';
    dctx.beginPath();
    dctx.ellipse(x, ry, radius * 1.1, radius * 0.44, 0, 0, Math.PI * 2);
    dctx.fill();

    dctx.fillStyle = isCrater ? 'rgba(9, 9, 11, 0.85)' : color;
    dctx.beginPath();
    dctx.ellipse(x, ry, radius * 0.72, radius * 0.3, 0.15, 0, Math.PI * 2);
    dctx.fill();
    dctx.restore();
  }, []);

  const stampShellDecal = useCallback((x: number, y: number, color: string, w: number, h: number) => {
    const dctx = decalCanvasRef.current?.getContext('2d');
    if (!dctx) return;
    const ry = Math.max(ROAD_Y_MIN - 2, Math.min(ROAD_Y_MAX + 4, y));
    dctx.fillStyle = 'rgba(15, 15, 18, 0.65)';
    dctx.fillRect(x - 0.5, ry + 0.5, w + 0.8, h + 0.4);
    dctx.fillStyle = color;
    dctx.fillRect(x, ry, w, h);
  }, []);

  const initDecalCanvas = useCallback(() => {
    if (!decalCanvasRef.current) {
      decalCanvasRef.current = document.createElement('canvas');
      decalCanvasRef.current.width = LOGICAL_WIDTH * 2;
      decalCanvasRef.current.height = LOGICAL_HEIGHT * 2;
    }
    const dctx = decalCanvasRef.current.getContext('2d');
    if (!dctx) return;
    dctx.setTransform(2, 0, 0, 2, 0, 0);
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

  // Live Combat XP & Commander Level-Up Handler (100% non-destructive to existing units!)
  const awardCommanderXp = useCallback(
    (xpGain: number) => {
      const sim = simRef.current;
      if (sim.commanderLevel >= MAX_COMMANDER_LEVEL) {
        sim.commanderXp = getXpForNextLevel(MAX_COMMANDER_LEVEL);
        return;
      }

      sim.commanderXp += xpGain;
      let leveledUp = false;

      while (
        sim.commanderLevel < MAX_COMMANDER_LEVEL &&
        sim.commanderXp >= getXpForNextLevel(sim.commanderLevel)
      ) {
        sim.commanderXp -= getXpForNextLevel(sim.commanderLevel);
        sim.commanderLevel += 1;
        leveledUp = true;

        soundFX.playCouragePickup();
        sim.levelShockwaveTimer = 1.15;
        sim.screenShake = Math.max(sim.screenShake, 5);

        // Morale Boost: Heal ALL living allied survivors +15% HP & bestow golden aura!
        for (let idx = 0; idx < sim.units.length; idx++) {
          const ally = sim.units[idx];
          if (
            ally.team === 'survivor' &&
            ally.state !== 'corpse' &&
            ally.state !== 'dying' &&
            ally.hp > 0
          ) {
            if (sim.commanderLevel === MAX_COMMANDER_LEVEL) {
              ally.maxHp = Math.round(ally.maxHp * 1.1);
              ally.damage = Math.round(ally.damage * 1.1);
            }
            const moraleHeal = Math.max(8, Math.round(ally.maxHp * 0.15));
            ally.hp = Math.min(ally.maxHp, ally.hp + moraleHeal);
            ally.ghostHp = Math.max(ally.ghostHp ?? ally.hp, ally.hp);
            ally.levelUpGlowTimer = 1.25;
            addFloatingText(`+${moraleHeal} MORAL`, ally.x, ally.y, 24, '#fde047');
          }
        }

        const unlockedCfg = getUnitUnlockedAtLevel(sim.commanderLevel);
        addFloatingText(
          unlockedCfg
            ? `¡NV.${sim.commanderLevel}: ${unlockedCfg.name.toUpperCase()}!`
            : `¡MAESTRÍA NV.${sim.commanderLevel} (+10% GLOBAL)!`,
          360,
          164,
          30,
          '#fde047',
          true
        );

        setLevelUpBanner({
          level: sim.commanderLevel,
          unitType: unlockedCfg?.id,
          unitName: unlockedCfg ? unlockedCfg.name : 'Maestría de Comandante',
          roleTitle: unlockedCfg
            ? `${unlockedCfg.roleTitle} desbloqueado`
            : '+10% Daño y Salud a todo el Escuadrón',
        });
        if (bannerTimeoutRef.current !== null) {
          window.clearTimeout(bannerTimeoutRef.current);
        }
        bannerTimeoutRef.current = window.setTimeout(() => {
          setLevelUpBanner(null);
        }, 2950);
      }

      if (leveledUp) {
        setCommanderLevel(sim.commanderLevel);
      }
      setCommanderXp(Math.floor(sim.commanderXp));
      liveBridgeRef.current.onLevelUpCommander?.(sim.commanderLevel, Math.floor(sim.commanderXp));
    },
    [addFloatingText]
  );

  const spawnWeaponTracerAndShell = useCallback(
    (
      shooterX: number,
      shooterY: number,
      muzzleZ: number,
      targetX: number,
      targetY: number,
      facing: 1 | -1,
      weaponKind: 'shotgun' | 'sniper' | 'rifle' | 'rapid'
    ) => {
      const sim = simRef.current;
      const mx = shooterX + facing * 13;
      const my = shooterY - muzzleZ;

      if (weaponKind === 'shotgun') {
        for (let p = -1; p <= 2; p++) {
          const spreadY = p * 5 + (Math.random() - 0.5) * 4;
          sim.tracers.push({
            x1: mx,
            y1: my,
            x2: targetX + (Math.random() - 0.5) * 14,
            y2: targetY - 14 + spreadY,
            color: 'rgba(251, 146, 60, 0.78)',
            coreColor: '#fef08a',
            width: 1.5,
            life: 0.085,
            maxLife: 0.085,
          });
        }
      } else if (weaponKind === 'sniper') {
        sim.tracers.push({
          x1: mx + facing * 5,
          y1: my,
          x2: Math.min(LOGICAL_WIDTH - 10, targetX + facing * 18),
          y2: targetY - 16,
          color: 'rgba(56, 189, 248, 0.85)',
          coreColor: '#ffffff',
          width: 2.2,
          life: 0.16,
          maxLife: 0.16,
          isSniper: true,
        });
      } else {
        sim.tracers.push({
          x1: mx,
          y1: my,
          x2: targetX,
          y2: targetY - 15 + (Math.random() - 0.5) * 4,
          color: weaponKind === 'rapid' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(253, 224, 71, 0.85)',
          coreColor: '#ffffff',
          width: 1.6,
          life: 0.095,
          maxLife: 0.095,
        });
      }

      if (sim.shells.length < 38) {
        const isShotgun = weaponKind === 'shotgun';
        sim.shells.push({
          x: shooterX - facing * 2,
          y: shooterY,
          z: muzzleZ,
          vx: -facing * (22 + Math.random() * 24),
          vy: (Math.random() - 0.5) * 18,
          vz: 58 + Math.random() * 38,
          bounces: 0,
          color: isShotgun ? '#dc2626' : '#facc15',
          w: isShotgun ? 3 : 2,
          h: 1,
        });
      }
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
    (
      type: ZombieType,
      customX?: number,
      customY?: number,
      fromCorpse = false,
      hpScale = 1
    ) => {
      const cfg = ZOMBIE_CONFIGS[type];
      const spawnX = customX ?? simRef.current.barricadeX - 30 - Math.random() * 45;
      const spawnY =
        customY ?? ROAD_Y_MIN + 8 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 16);
      const isEmerging = (cfg.emergesFromGround && customX !== undefined) || fromCorpse;
      // Gentle late-campaign scaling (+3% HP per mission past M1) while keeping M1 crisp
      const missionScale = 1 + Math.max(0, mission.id - 1) * 0.035;
      const scaledMaxHp = Math.round(cfg.baseHp * missionScale);
      const initialHp = Math.max(12, Math.round(scaledMaxHp * hpScale));

      const zUnit: InternalUnit = {
        id: `z_${Date.now()}_${Math.random()}`,
        team: 'zombie',
        subType: type,
        level: Math.min(12, mission.id + 1),
        x: spawnX,
        y: spawnY,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: initialHp,
        ghostHp: initialHp,
        maxHp: scaledMaxHp,
        damage: cfg.baseDamage,
        speed: cfg.speed * (0.93 + Math.random() * 0.14),
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
        meleeResist: 0,
        armorPiercing: 0,
        firstHitCritMult: 1,
        isStationary: false,
        isFlying: false,
        isFlame: false,
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
        critTelegraphTimer: 0,
        isLucky: false,
        isPlayerControlled: false,
        facing: -1,
      };
      simRef.current.units.push(zUnit);
    },
    [mission.id]
  );

  const deploySurvivor = useCallback(
    (type: SurvivorType, freeInitial = false, customX?: number, customY?: number) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || pausedRef.current) return;
      const cfg = SURVIVOR_CONFIGS[type];
      if (!freeInitial && sim.commanderLevel < cfg.unlockLevel) return;
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

      const liveProgress = liveBridgeRef.current.progress;
      const actualLevel = liveProgress.unitLevels[type] || 1;
      const masteryMult = sim.commanderLevel >= MAX_COMMANDER_LEVEL ? 1.1 : 1.0;
      const statMult = (1 + (actualLevel - 1) * 0.14) * masteryMult;
      const hp = Math.round(cfg.baseHp * statMult);
      const damage = Math.round(cfg.baseDamage * statMult);
      const isLucky = freeInitial || Math.random() * 100 < cfg.fortune;

      const spawnY =
        customY ?? ROAD_Y_MIN + 14 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 28);
      const defaultSpawnX = cfg.isStationary
        ? sim.busX + 185 + Math.random() * 80
        : sim.busX + 106;

      if (cfg.repairsBusOnSpawn && !freeInitial) {
        const heal = cfg.repairsBusOnSpawn;
        sim.busHp = Math.min(sim.maxBusHp, sim.busHp + heal);
        setBusHp(Math.round(sim.busHp));
        addFloatingText(`+${heal} BUS`, sim.busX + 108, sim.busY + 12, 22, '#4ade80', true);
      }

      const quote =
        cfg.quotes.length > 0 && Math.random() < 0.45
          ? cfg.quotes[Math.floor(Math.random() * cfg.quotes.length)]
          : undefined;

      const newUnit: InternalUnit = {
        id: `s_${Date.now()}_${Math.random()}`,
        team: 'survivor',
        subType: type,
        level: actualLevel,
        x: customX ?? defaultSpawnX,
        y: spawnY,
        z: freeInitial ? 0 : 6,
        vx: freeInitial || cfg.isStationary ? 0 : 22,
        vy: 0,
        vz: freeInitial ? 0 : 18,
        hp,
        ghostHp: hp,
        maxHp: hp,
        damage,
        speed: cfg.speed * (isLucky ? 1.15 : 1),
        attackRange: cfg.attackRange,
        attackCooldown: cfg.attackCooldown * (isLucky ? 0.82 : 1),
        attackTimer: 0,
        isRanged: cfg.isRanged,
        pellets: cfg.pellets ?? 1,
        ammo: cfg.magSize ?? 1,
        maxAmmo: cfg.magSize ?? 1,
        reloadTime: cfg.reloadTime ?? 0,
        reloadTimer: 0,
        knockback: cfg.knockback,
        bulletResist: cfg.bulletResist ?? 0,
        meleeResist: cfg.meleeResist ?? 0,
        armorPiercing: cfg.armorPiercing ?? 0,
        firstHitCritMult: cfg.firstHitCritMultiplier ?? 3.0,
        isStationary: !!cfg.isStationary,
        isFlying: !!cfg.isFlying,
        isFlame: !!cfg.isFlame,
        barricadeMultiplier: cfg.barricadeMultiplier ?? 1,
        infectedZombieType: cfg.infectedZombieType,
        critChance: (cfg.fortune / 100) * (isLucky ? 1.55 : 1),
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
        quoteText: quote,
        quoteTimer: quote ? 2.1 : 0,
      };

      const hasAliveControlled = sim.units.some(
        (u) =>
          u.team === 'survivor' &&
          u.state !== 'corpse' &&
          u.state !== 'dying' &&
          u.id === sim.selectedUnitId
      );
      if (!hasAliveControlled) {
        sim.units.forEach((u) => (u.isPlayerControlled = false));
        newUnit.isPlayerControlled = true;
        sim.selectedUnitId = newUnit.id;
      }

      sim.units.push(newUnit);
    },
    [addFloatingText, scareCrows]
  );

  // Supports both player Red Barrel explosions and Bloated Zombie collateral explosions!
  const triggerExplosion = useCallback(
    (
      x: number,
      y: number,
      radius: number,
      survivorDamage: number,
      leavesFire: boolean,
      zombieDamage?: number
    ) => {
      const sim = simRef.current;
      const zDmg = zombieDamage ?? survivorDamage;
      soundFX.playExplosion();
      sim.screenShake = 8;
      sim.hitStopTimer = 0.05;
      stampBloodDecal(x, y, 15, '#27272a');
      addFloatingText('BOOM!', x, y, 26, '#f97316', true);

      for (let i = 0; i < 30; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 92;
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
          radius: radius * 0.88,
          duration: 6.5,
          maxDuration: 6.5,
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
            addFloatingText('CALCINADO', u.x, u.y, 15, '#f97316', true);
          } else {
            const appliedDmg = u.team === 'zombie' ? zDmg : survivorDamage;
            if (appliedDmg > 0) {
              u.hp -= appliedDmg;
              u.whiteFlashTimer = 0.12;
              u.vx += (dx >= 0 ? 1 : -1) * 68;
              addFloatingText(`${appliedDmg}`, u.x, u.y, 18, '#fde047', true, 'WACK!');
              if (u.team === 'survivor') {
                sim.rage = Math.min(100, sim.rage + appliedDmg * 0.18);
              }
              if (u.hp <= 0) {
                u.infectedZombieType = undefined;
              }
            }
          }
        }
      });
    },
    [addFloatingText, stampBloodDecal]
  );

  const deployTacticalItem = useCallback(
    (type: TacticalItemType, targetX: number, targetY: number) => {
      const sim = simRef.current;
      if (sim.phase !== 'combat' || pausedRef.current) return;
      const cfg = TACTICAL_ITEM_CONFIGS[type];
      if (sim.rage < cfg.rageCost || sim.itemCooldowns[type] > 0) return;

      const clampedX = Math.max(142, Math.min(sim.barricadeX - 22, targetX));
      const clampedY = Math.max(ROAD_Y_MIN + 4, Math.min(ROAD_Y_MAX - 4, targetY));

      sim.rage -= cfg.rageCost;
      sim.itemCooldowns[type] = cfg.prepTime;
      setRage(Math.floor(sim.rage));
      setItemCooldowns({ ...sim.itemCooldowns });
      setDraggingItem(null);
      sim.draggingItem = null;

      if (type === 'medkit') {
        soundFX.playCouragePickup();
        addFloatingText('+BOTIQUÍN', clampedX, clampedY, 22, '#4ade80', true);
        sim.obstacles.push({
          id: `med_${Date.now()}_${Math.random()}`,
          type: 'medkit',
          x: clampedX,
          y: clampedY,
          z: 0,
          hp: 1,
          maxHp: 1,
          whiteFlashTimer: 0,
          healDuration: cfg.duration ?? 7.0,
        });
        return;
      }

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
            addFloatingText('APLASTADO', u.x, u.y, 15, '#38bdf8', true);
          } else if (u.team === 'zombie') {
            u.hp -= cfg.impactDamage;
            u.whiteFlashTimer = 0.12;
            u.vx += 24;
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
    [addFloatingText, spawnBloodParticles]
  );

  // Activate Top-Center Fury Bottle Buff (gives golden halo to all units + Bill Rifle Barrage)
  const triggerFuryWhiskeyBuff = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase !== 'combat' || pausedRef.current) return;
    if (furyBuffCount <= 0 && sim.rage < 25) return;

    if (furyBuffCount > 0) {
      setFuryBuffCount((c) => Math.max(0, c - 1));
    } else {
      sim.rage -= 25;
      setRage(Math.floor(sim.rage));
    }
    sim.billBarrageActiveTimer = 3.6;
    sim.units.forEach((u) => {
      if (u.team === 'survivor' && u.state !== 'corpse') {
        u.isLucky = true;
      }
    });
    soundFX.playCouragePickup();
    addFloatingText('¡FURIA ACTIVADA!', 280, 195, 25, '#fde047', true);
  }, [addFloatingText, furyBuffCount]);

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

  const selectTacticalItem = useCallback((itemType: TacticalItemType) => {
    const sim = simRef.current;
    if (sim.phase !== 'combat' || pausedRef.current) return;
    if (sim.draggingItem === itemType) {
      setDraggingItem(null);
      sim.draggingItem = null;
      return;
    }
    const cfg = TACTICAL_ITEM_CONFIGS[itemType];
    if (sim.rage < cfg.rageCost || sim.itemCooldowns[itemType] > 0) return;

    if (!sim.mouseLogical.insideRoad) {
      sim.mouseLogical = { x: 350, y: 228, insideRoad: true };
    }
    soundFX.playUnitSpawn();
    setDraggingItem(itemType);
    sim.draggingItem = itemType;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      simRef.current.keysPressed.add(key);

      if (key >= '1' && key <= '6') {
        const slotIdx = Number(key) - 1;
        const deckUnit = liveBridgeRef.current.progress.equippedDeck[slotIdx];
        if (deckUnit) deploySurvivor(deckUnit);
      } else if (key === 'q') {
        selectTacticalItem('blue_barrel');
      } else if (key === 'x' || key === 'r') {
        selectTacticalItem('red_barrel');
      } else if (key === 'e') {
        selectTacticalItem('medkit');
      } else if (key === 'tab') {
        e.preventDefault();
        cycleSelectedSurvivor();
      } else if (key === ' ') {
        e.preventDefault();
        triggerFuryWhiskeyBuff();
      } else if (key === 'escape') {
        if (simRef.current.draggingItem) {
          setDraggingItem(null);
          simRef.current.draggingItem = null;
        } else if (pausedRef.current) {
          resumeBattle();
        } else {
          pauseBattle();
        }
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
  }, [
    cycleSelectedSurvivor,
    deploySurvivor,
    pauseBattle,
    resumeBattle,
    selectTacticalItem,
    triggerFuryWhiskeyBuff,
  ]);

  const getLogicalCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 360, y: 228, insideRoad: false };
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(rect.width / LOGICAL_WIDTH, rect.height / LOGICAL_HEIGHT);
    const renderedW = LOGICAL_WIDTH * scale;
    const renderedH = LOGICAL_HEIGHT * scale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;

    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    const insideRoad = x >= 120 && x <= 620 && y >= ROAD_Y_MIN - 15 && y <= ROAD_Y_MAX + 15;
    return { x, y, insideRoad };
  };

  const tryCollectPickupsAt = (lx: number, ly: number) => {
    const sim = simRef.current;
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
      const p = sim.pickups[i];
      if (Math.hypot(p.x - lx, p.y - ly) <= 30) {
        soundFX.playCouragePickup();
        if (p.kind === 'courage') {
          sim.courage = Math.min(100, sim.courage + p.amount);
          setCourage(Math.floor(sim.courage));
          addFloatingText(`+${p.amount}`, p.x, p.y, 16, '#38bdf8', true);
        } else {
          sim.rage = Math.min(100, sim.rage + p.amount);
          setRage(Math.floor(sim.rage));
          addFloatingText(`+${p.amount} IRA`, p.x, p.y, 16, '#f87171', true);
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

    const sim = simRef.current;
    // 2-Tap Tactical Item System: 2nd tap on battlefield drops selected item at tapped location!
    if (sim.draggingItem) {
      if (coords.y >= 72) {
        sim.mouseLogical = { ...coords, insideRoad: true };
        deployTacticalItem(sim.draggingItem, coords.x, coords.y);
      }
      return;
    }

    tryCollectPickupsAt(coords.x, coords.y);

    // Tactical Counterplay: Tapping a deployed Red Barrel detonates it on command!
    const clickedRedBarrelIdx = sim.obstacles.findIndex(
      (o) =>
        o.type === 'red_barrel' &&
        Math.hypot(o.x - coords.x, o.y - 10 - coords.y) <= 22
    );
    if (clickedRedBarrelIdx !== -1) {
      const rb = sim.obstacles[clickedRedBarrelIdx];
      sim.obstacles.splice(clickedRedBarrelIdx, 1);
      triggerExplosion(rb.x, rb.y, 54, 18, true, 78);
      return;
    }

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

  // Main 60 FPS Simulation & Multi-Layer Render Loop
  useEffect(() => {
    initDecalCanvas();

    // Fair Mission-Scaled Opening Guard (NO Bloated/Crit/Armored wall in Mission 1!)
    simRef.current.units = [];
    if (mission.id === 1) {
      // Staggered 105px apart so player's first Redneck fights 1v1 cleanly!
      spawnZombie('walker', 485, 212);
      spawnZombie('walker', 590, 248);
    } else if (mission.id === 2) {
      spawnZombie('walker', 490, 210);
      spawnZombie('walker', 555, 250);
      spawnZombie('runner', 595, 228);
    } else if (mission.id === 3) {
      spawnZombie('walker', 490, 208);
      spawnZombie('walker', 545, 250);
      spawnZombie('runner', 585, 224);
      spawnZombie('skeleton', 520, 236);
    } else if (mission.id === 4) {
      spawnZombie('walker', 495, 212);
      spawnZombie('walker', 545, 252);
      spawnZombie('runner', 575, 222);
      spawnZombie('armored', 598, 240);
    } else if (mission.id <= 6) {
      spawnZombie('walker', 495, 208);
      spawnZombie('runner', 540, 248);
      spawnZombie('crit_zombie', 575, 220);
      spawnZombie('armored', 598, 242);
    } else if (mission.id <= 9) {
      spawnZombie('walker', 490, 208);
      spawnZombie('runner', 532, 248);
      spawnZombie('crit_zombie', 562, 218);
      spawnZombie('armored', 585, 252);
      spawnZombie('bloated', 602, 232);
    } else {
      spawnZombie('runner', 495, 210);
      spawnZombie('runner', 532, 250);
      spawnZombie('crit_zombie', 564, 220);
      spawnZombie('armored', 586, 252);
      spawnZombie('bloated', 602, 232);
    }

    const sector = mission.id <= 3 ? 1 : mission.id <= 6 ? 2 : mission.id <= 9 ? 3 : 4;
    const maxActiveZombies =
      mission.id === 1 ? 7 : sector === 1 ? 8 : sector === 2 ? 10 : sector === 3 ? 12 : 15;

    let animationFrameId: number;
    let lastTime = performance.now();
    let uiSyncAccumulator = 0;

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;

      if (!pausedRef.current && sim.phase !== 'victory' && sim.phase !== 'defeat') {
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
        if (sim.levelShockwaveTimer > 0) {
          sim.levelShockwaveTimer = Math.max(0, sim.levelShockwaveTimer - dt);
        }

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
            // Rewarding 3-star threshold (>= 85% Bus HP — synergizes with Mechanic repairs!)
            const stars =
              sim.busHp >= sim.maxBusHp * 0.85
                ? 3
                : sim.busHp >= sim.maxBusHp * 0.45
                ? 2
                : 1;
            setStarsEarned(stars);
            setZombiesKilledCount(sim.zombiesKilled);
            setBattleResult('victory');
          }
        }

        if (sim.phase === 'combat') {
          // Consensus Economy: +2.20 Courage/s
          sim.courage = Math.min(100, sim.courage + dt * 2.2);

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

          sim.timeRemaining = Math.max(0, sim.timeRemaining - dt);
          if (sim.timeRemaining <= 0 && !sim.hordeTriggered) {
            sim.hordeTriggered = true;
            setHordeTriggered(true);
            soundFX.playSiren();
            sim.screenShake = 9;
            addFloatingText('¡HORDA FINAL!', 360, 165, 28, '#ef4444', true);
            for (let i = 0; i < 7; i++) {
              spawnZombie(
                i % 3 === 0 ? 'armored' : i % 2 === 0 ? 'runner' : 'crit_zombie',
                560 + i * 12
              );
            }
          }

          // Count alive zombies for Dynamic Pressure Cap & Anti-Dead-Air Pacing
          let aliveZombies = 0;
          for (let i = 0; i < sim.units.length; i++) {
            if (sim.units[i].team === 'zombie' && sim.units[i].hp > 0) {
              aliveZombies++;
            }
          }

          if (aliveZombies === 0) {
            sim.emptyRoadTimer += dt;
          } else {
            sim.emptyRoadTimer = 0;
          }

          const waveDrainRate = sim.hordeTriggered
            ? 1.35
            : aliveZombies >= maxActiveZombies
            ? 0.25
            : sim.emptyRoadTimer > 1.8
            ? 1.65
            : 1.0;

          // Sinusoidal 4-Wave Threat Director (Normal -> Normal -> Climax -> Breather Valley)
          sim.waveTimer -= dt * waveDrainRate;
          if (sim.waveTimer <= 0) {
            const phaseIdx = sim.waveCount % 4;
            sim.waveCount += 1;

            const isBreather = phaseIdx === 3 && !sim.hordeTriggered;
            const isClimax = phaseIdx === 2 || sim.hordeTriggered;

            sim.waveTimer = sim.hordeTriggered
              ? 2.1
              : mission.waveInterval * (0.9 + Math.random() * 0.2) + (isBreather ? 2.2 : 0);

            const pool = mission.zombiePool;
            let packSize = sector <= 2 ? 2 : 2 + (Math.random() < 0.45 ? 1 : 0);
            if (isClimax) packSize += 1;
            if (isBreather) packSize = Math.max(1, packSize - 1);

            const roomLeft = sim.hordeTriggered
              ? 6
              : Math.max(1, maxActiveZombies + 2 - aliveZombies);
            const finalCount = Math.min(packSize, roomLeft);

            for (let p = 0; p < finalCount; p++) {
              const pick = pool[Math.floor(Math.random() * pool.length)];
              spawnZombie(pick, sim.barricadeX - 20 - p * 20 - Math.random() * 18);
            }
          }

          // Telegraphed Fast Rush Pack (2.8s Lane Warning BEFORE Runners enter!)
          if (sim.rushWarningTimer > 0) {
            sim.rushWarningTimer -= dt;
            if (sim.rushWarningTimer <= 0) {
              addFloatingText('¡CORREDORES!', 545, sim.rushWarningY - 12, 20, '#ef4444', true);
              spawnZombie('runner', sim.barricadeX - 14, sim.rushWarningY - 6);
              if (sector === 1) {
                spawnZombie('runner', sim.barricadeX - 34, sim.rushWarningY + 8);
              } else {
                spawnZombie('crit_zombie', sim.barricadeX - 32, sim.rushWarningY + 8);
                if (sector >= 3 && aliveZombies < maxActiveZombies) {
                  spawnZombie('runner', sim.barricadeX - 48, sim.rushWarningY);
                }
              }
            }
          } else {
            sim.rushPackTimer -= dt;
            if (sim.rushPackTimer <= 0 && aliveZombies < maxActiveZombies) {
              sim.rushPackTimer = (sector === 1 ? 30 : sector === 2 ? 26 : 23) + Math.random() * 5;
              sim.rushWarningY = ROAD_Y_MIN + 18 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 36);
              sim.rushWarningTimer = 2.8;
            }
          }

          // Underground Skeleton Ambush
          sim.skeletonTimer -= dt;
          if (sim.skeletonTimer <= 0 && aliveZombies < maxActiveZombies) {
            sim.skeletonTimer = 13 + Math.random() * 5;
            const ambushX = 250 + Math.random() * 220;
            const ambushY = ROAD_Y_MIN + 14 + Math.random() * (ROAD_Y_MAX - ROAD_Y_MIN - 28);
            spawnZombie('skeleton', ambushX, ambushY);
            if (sector >= 3 && Math.random() < 0.5) {
              spawnZombie('skeleton', ambushX + 28, ambushY);
            }
          }

          // Sheriff Bill Roof Rifle Defense + Tracers & Roof Brass Ejection
          const liveBillBonus = liveBridgeRef.current.progress.billDamageBonus;
          const billMastery = sim.commanderLevel >= MAX_COMMANDER_LEVEL ? 1.1 : 1.0;
          if (sim.billBarrageActiveTimer > 0) {
            sim.billBarrageActiveTimer -= dt;
            if (Math.random() < 0.32) {
              const targetZombies = sim.units.filter(
                (u) =>
                  u.team === 'zombie' &&
                  u.state !== 'corpse' &&
                  u.state !== 'dying' &&
                  u.hp > 0
              );
              if (targetZombies.length > 0) {
                const target = targetZombies[Math.floor(Math.random() * targetZombies.length)];
                const dmg = Math.round(
                  (17 + liveBillBonus) * billMastery * (1 - target.bulletResist * 0.7)
                );
                target.hp -= dmg;
                target.whiteFlashTimer = 0.09;
                target.vx += 15;
                sim.billFiringVisual = 0.1;
                soundFX.playRifle();
                spawnWeaponTracerAndShell(
                  sim.busX + 104,
                  sim.busY + 62,
                  76,
                  target.x,
                  target.y,
                  1,
                  'rifle'
                );
                spawnBloodParticles(target.x, target.y, 12, 6);
                addFloatingText(`${dmg}`, target.x, target.y, 20, '#fde047', true, 'WACK!');
              }
            }
          } else {
            sim.billShotTimer -= dt;
            if (sim.billShotTimer <= 0) {
              const closeZombie = sim.units
                .filter(
                  (u) =>
                    u.team === 'zombie' &&
                    u.state !== 'corpse' &&
                    u.state !== 'dying' &&
                    u.x < 265 &&
                    u.hp > 0
                )
                .sort((a, b) => a.x - b.x)[0];
              if (closeZombie) {
                sim.billShotTimer = 2.4;
                sim.billFiringVisual = 0.14;
                soundFX.playRifle();
                scareCrows();
                const dmg = Math.round(
                  (19 + liveBillBonus) * billMastery * (1 - closeZombie.bulletResist * 0.7)
                );
                closeZombie.hp -= dmg;
                closeZombie.whiteFlashTimer = 0.1;
                closeZombie.vx += 16;
                spawnWeaponTracerAndShell(
                  sim.busX + 104,
                  sim.busY + 62,
                  76,
                  closeZombie.x,
                  closeZombie.y,
                  1,
                  'rifle'
                );
                spawnBloodParticles(closeZombie.x, closeZombie.y, 12, 8);
                addFloatingText(`${dmg}`, closeZombie.x, closeZombie.y, 20, '#fde047');
              } else {
                sim.billShotTimer = 0.35;
              }
            }
          }

          // Active Fire Zones (Red Barrel Napalm — Burns Zombies & Cremates Corpses!)
          for (let i = sim.fireZones.length - 1; i >= 0; i--) {
            const fz = sim.fireZones[i];
            fz.duration -= dt;
            if (fz.duration <= 0) {
              sim.fireZones.splice(i, 1);
              continue;
            }
            for (let uIdx = 0; uIdx < sim.units.length; uIdx++) {
              const u = sim.units[uIdx];
              const dist = Math.hypot(u.x - fz.x, (u.y - fz.y) * 1.45);
              if (dist <= fz.radius) {
                if (u.state === 'corpse') {
                  u.hp = -999;
                  u.corpseTimer = -999;
                  addFloatingText('CALCINADO', u.x, u.y, 14, '#f97316', true);
                } else if (u.team === 'zombie' && u.hp > 0) {
                  u.hp -= 15 * dt;
                  if (Math.random() < 0.08) {
                    u.whiteFlashTimer = 0.06;
                  }
                }
              }
            }
          }

          // Obstacles & Medkit Healing Field Simulation
          sim.medkitTickTimer += dt;
          const emitHealPopup = sim.medkitTickTimer >= 1.0;
          if (emitHealPopup) sim.medkitTickTimer = 0;

          for (let i = sim.obstacles.length - 1; i >= 0; i--) {
            const obs = sim.obstacles[i];
            if (obs.whiteFlashTimer > 0) {
              obs.whiteFlashTimer = Math.max(0, obs.whiteFlashTimer - dt);
            }

            if (obs.type === 'medkit') {
              obs.healDuration = (obs.healDuration ?? 7.0) - dt;
              if (obs.healDuration <= 0) {
                sim.obstacles.splice(i, 1);
                continue;
              }
              const healRate = TACTICAL_ITEM_CONFIGS.medkit.healsPerSec ?? 12;
              const radius = TACTICAL_ITEM_CONFIGS.medkit.radius;
              sim.units.forEach((u) => {
                if (
                  u.team === 'survivor' &&
                  !u.isStationary &&
                  u.state !== 'corpse' &&
                  u.hp > 0 &&
                  u.hp < u.maxHp &&
                  Math.hypot(u.x - obs.x, (u.y - obs.y) * 1.35) <= radius
                ) {
                  u.hp = Math.min(u.maxHp, u.hp + healRate * dt);
                  if (emitHealPopup) {
                    addFloatingText(`+${healRate}`, u.x, u.y, 20, '#4ade80');
                  }
                }
              });
              continue;
            }

            if (obs.hp <= 0) {
              if (obs.type === 'red_barrel') {
                triggerExplosion(obs.x, obs.y, 54, 18, true, 75);
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
              (u) =>
                u.team === 'survivor' &&
                u.state !== 'corpse' &&
                u.state !== 'dying' &&
                u.id === sim.selectedUnitId
            )
          ) {
            const firstAlive = sim.units.find(
              (u) =>
                u.team === 'survivor' &&
                u.state !== 'corpse' &&
                u.state !== 'dying' &&
                u.hp > 0
            );
            if (firstAlive) {
              sim.selectedUnitId = firstAlive.id;
              firstAlive.isPlayerControlled = true;
            }
          }

          for (let i = sim.units.length - 1; i >= 0; i--) {
            const u = sim.units[i];
            if (!Number.isFinite(u.x)) u.x = sim.busX + 120;
            if (!Number.isFinite(u.y)) u.y = (ROAD_Y_MIN + ROAD_Y_MAX) * 0.5;
            if (!Number.isFinite(u.z)) u.z = 0;
            if (!Number.isFinite(u.vx)) u.vx = 0;
            if (!Number.isFinite(u.vy)) u.vy = 0;
            if (!Number.isFinite(u.vz)) u.vz = 0;

            u.animTime += dt;
            if (u.whiteFlashTimer > 0) u.whiteFlashTimer = Math.max(0, u.whiteFlashTimer - dt);
            if ((u.critTelegraphTimer ?? 0) > 0) {
              u.critTelegraphTimer = Math.max(0, (u.critTelegraphTimer ?? 0) - dt);
            }
            if ((u.quoteTimer ?? 0) > 0) {
              u.quoteTimer = Math.max(0, (u.quoteTimer ?? 0) - dt);
            }
            if ((u.levelUpGlowTimer ?? 0) > 0) {
              u.levelUpGlowTimer = Math.max(0, (u.levelUpGlowTimer ?? 0) - dt);
            }

            // Smooth Ghost Health Bar trailing decay
            const targetGhost = Math.max(0, u.hp);
            if ((u.ghostHp ?? u.maxHp) > targetGhost) {
              u.ghostHp = Math.max(
                targetGhost,
                (u.ghostHp ?? u.maxHp) - dt * u.maxHp * 0.85
              );
            } else {
              u.ghostHp = targetGhost;
            }

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

            if (u.state === 'dying') {
              u.deathProgress = (u.deathProgress ?? 0) + dt / 0.4;
              if (u.deathProgress >= 1) {
                u.markedForRemoval = true;
              }
              continue;
            }

            if (u.state === 'corpse') {
              u.corpseTimer = (u.corpseTimer ?? 6.0) - dt;
              if (u.corpseTimer <= -900) {
                u.markedForRemoval = true;
                continue;
              }
              if (u.corpseTimer <= 0) {
                const rawType = u.infectedZombieType ?? 'walker';
                const zType = mission.id <= 2 && rawType === 'runner' ? 'walker' : rawType;
                soundFX.playZombieReanimate();
                spawnZombie(zType, u.x, u.y, true, 0.75);
                u.markedForRemoval = true;
              }
              continue;
            }

            if (u.hp <= 0 && !u.deathProcessed) {
              u.deathProcessed = true;
              u.isPlayerControlled = false;
              stampBloodDecal(u.x, u.y, 11);
              spawnBloodParticles(u.x, u.y, 8, 22, u.subType === 'bloated');

              if (u.team === 'zombie') {
                sim.zombiesKilled += 1;
                const rageGain = u.rageReward ?? 4;
                sim.rage = Math.min(100, sim.rage + rageGain);

                const xpGain = ZOMBIE_XP_REWARD[u.subType as ZombieType] ?? 10;
                awardCommanderXp(xpGain);

                if (u.explodesOnDeath) {
                  triggerExplosion(u.x, u.y, 46, 30, false, 55);
                  u.markedForRemoval = true;
                } else {
                  u.state = 'dying';
                  u.deathProgress = 0;
                }

                if (Math.random() < (u.courageDropChance ?? 0.25)) {
                  sim.pickups.push({
                    id: `pk_${Date.now()}_${Math.random()}`,
                    kind: 'courage',
                    amount: 25,
                    x: u.x,
                    y: u.y,
                    z: 10,
                    life: 12.0,
                  });
                }
                continue;
              } else {
                if (u.infectedZombieType) {
                  u.state = 'corpse';
                  u.corpseTimer = 6.0;
                  u.corpseMaxTimer = 6.0;
                } else {
                  u.state = 'dying';
                  u.deathProgress = 0;
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
                if (Math.hypot(u.x - pk.x, u.y - pk.y) <= 24) {
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
              if (u.isPlayerControlled && isUsingWasd && !u.isStationary) {
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
              // Pre-critical telegraph flash on Berserker Zombie right before swinging!
              if (u.team === 'zombie' && u.subType === 'crit_zombie' && u.attackTimer <= 0.22) {
                u.critTelegraphTimer = 0.22;
              }
            }

            if (u.team === 'survivor' && u.isPlayerControlled && isUsingWasd && !u.isStationary) {
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
                if (
                  other.team === 'zombie' &&
                  other.state !== 'corpse' &&
                  other.state !== 'dying' &&
                  other.hp > 0
                ) {
                  // Sniper prioritizes high-HP / armored threats in range!
                  const priorityBias =
                    u.subType === 'sniper' &&
                    (other.subType === 'bloated' || other.subType === 'armored')
                      ? -85
                      : 0;
                  const d = Math.hypot(other.x - u.x, (other.y - u.y) * 1.5) + priorityBias;
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
                Math.abs(closestZ.y - u.y) <= (u.isRanged ? 38 : 18)
              ) {
                u.facing = closestZ.x >= u.x ? 1 : -1;
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  scareCrows();

                  if (u.isRanged) {
                    u.ammo -= 1;
                    if (u.subType === 'sniper' || u.subType === 'turret' || u.subType === 'drone') {
                      soundFX.playRifle();
                    } else {
                      soundFX.playShotgun();
                    }
                    sim.screenShake = Math.max(sim.screenShake, u.subType === 'sniper' ? 3.2 : 2.0);

                    if (u.pellets === 1 && !u.isFlame) {
                      const wKind = u.subType === 'sniper' ? 'sniper' : 'rapid';
                      spawnWeaponTracerAndShell(
                        u.x,
                        u.y,
                        u.isFlying ? 32 : 18,
                        closestZ.x,
                        closestZ.y,
                        u.facing,
                        wKind
                      );
                      const isCrit = Math.random() < u.critChance;
                      const effectiveResist = closestZ.bulletResist * (1 - u.armorPiercing);
                      const shotDmg = Math.round(
                        u.damage * (isCrit ? u.critMultiplier : 1) * (1 - effectiveResist)
                      );
                      closestZ.hp -= shotDmg;
                      closestZ.whiteFlashTimer = 0.1;
                      closestZ.vx += u.facing * u.knockback;
                      spawnBloodParticles(closestZ.x, closestZ.y, 12, 14);
                      addFloatingText(
                        `${shotDmg}?`,
                        closestZ.x,
                        closestZ.y,
                        22,
                        '#fde047',
                        true,
                        isCrit ? 'CRIT!' : 'WACK!'
                      );
                    } else {
                      if (!u.isFlame) {
                        spawnWeaponTracerAndShell(
                          u.x,
                          u.y,
                          18,
                          closestZ.x,
                          closestZ.y,
                          u.facing,
                          'shotgun'
                        );
                      }
                      // Cone AoE shot (Shotguns & Flamethrower)
                      sim.units.forEach((z) => {
                        if (
                          (z.x - u.x) * u.facing >= -6 &&
                          Math.abs(z.x - u.x) <= u.attackRange + 15 &&
                          Math.abs(z.y - u.y) <= 36
                        ) {
                          if (u.isFlame && z.state === 'corpse') {
                            z.hp = -999;
                            z.corpseTimer = -999;
                            addFloatingText('CALCINADO', z.x, z.y, 14, '#f97316', true);
                          } else if (z.team === 'zombie' && z.state !== 'corpse' && z.hp > 0) {
                            const isCrit = Math.random() < u.critChance;
                            const effectiveResist = u.isFlame
                              ? 0
                              : z.bulletResist * (1 - u.armorPiercing);
                            const totalPelletDmg = Math.round(
                              u.damage *
                                u.pellets *
                                (isCrit ? u.critMultiplier : 1) *
                                (1 - effectiveResist)
                            );
                            z.hp -= totalPelletDmg;
                            z.whiteFlashTimer = 0.1;
                            z.vx += u.facing * u.knockback;
                            if (u.isFlame) {
                              z.infectedZombieType = undefined;
                            }
                            spawnBloodParticles(z.x, z.y, 12, 10);
                            addFloatingText(
                              `${totalPelletDmg}?`,
                              z.x,
                              z.y,
                              20,
                              u.isFlame ? '#f97316' : '#fde047',
                              true,
                              u.isFlame ? 'BURN!' : 'WACK!'
                            );
                          }
                        }
                      });
                    }
                  } else {
                    const isFirstHitCrit = !!u.firstHitReady;
                    const isCrit = isFirstHitCrit || Math.random() < u.critChance;
                    u.firstHitReady = false;
                    const mult = isFirstHitCrit ? u.firstHitCritMult : isCrit ? u.critMultiplier : 1;
                    const dmg = Math.round(u.damage * mult);

                    soundFX.playMeleeHit(isCrit || u.subType === 'builder' || u.subType === 'juggernaut');
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
                      isFirstHitCrit ? 'SMASH!' : 'WACK!'
                    );
                  }
                }
              } else if (!u.isStationary && distToBarricade <= (u.isRanged ? 92 : 28)) {
                u.facing = 1;
                if (u.attackTimer <= 0) {
                  u.state = 'attack';
                  u.attackProgress = 0;
                  u.attackTimer = u.attackCooldown;
                  if (u.isRanged) {
                    u.ammo -= 1;
                    soundFX.playShotgun();
                    if (!u.isFlame) {
                      spawnWeaponTracerAndShell(
                        u.x,
                        u.y,
                        u.isFlying ? 32 : 18,
                        sim.barricadeX - 8,
                        u.y,
                        1,
                        u.subType === 'sniper' ? 'sniper' : u.pellets > 1 ? 'shotgun' : 'rapid'
                      );
                    }
                  } else {
                    soundFX.playBarricadeBash();
                  }
                  const dmg = Math.round(u.damage * u.barricadeMultiplier);
                  sim.barricadeHp = Math.max(0, sim.barricadeHp - dmg);
                  sim.barricadeShake = 0.25;
                  addFloatingText(`${dmg}`, sim.barricadeX - 18, u.y, 22, '#fde047', true, 'WACK!');

                  // Sector-Scaled Barricade Breach Defenders (NO Armored wall in Sector 1!)
                  const thresholds =
                    mission.id === 1
                      ? [0.5]
                      : sector === 1 || sector === 2
                      ? [0.65, 0.3]
                      : [0.7, 0.45, 0.2];
                  const nextThresh = thresholds[sim.barricadeThresholdIdx];
                  if (
                    nextThresh !== undefined &&
                    sim.barricadeHp > 0 &&
                    sim.barricadeHp / sim.maxBarricadeHp <= nextThresh
                  ) {
                    sim.barricadeThresholdIdx += 1;
                    sim.screenShake = 6;
                    addFloatingText('¡DEFENSORES!', sim.barricadeX - 48, 195, 24, '#ef4444', true);
                    if (mission.id === 1) {
                      spawnZombie('walker', sim.barricadeX - 16);
                      spawnZombie('walker', sim.barricadeX - 32);
                    } else if (sector === 1) {
                      spawnZombie('walker', sim.barricadeX - 16);
                      spawnZombie('runner', sim.barricadeX - 30);
                    } else if (sector === 2) {
                      spawnZombie('runner', sim.barricadeX - 16);
                      spawnZombie(
                        sim.barricadeThresholdIdx === 1 ? 'armored' : 'crit_zombie',
                        sim.barricadeX - 30
                      );
                    } else {
                      spawnZombie('runner', sim.barricadeX - 14);
                      spawnZombie('crit_zombie', sim.barricadeX - 28);
                      spawnZombie('armored', sim.barricadeX - 20);
                    }
                  }

                  // Award +20 XP once when Barricade drops to <= 50% HP!
                  if (
                    !sim.barricadeHalfXpAwarded &&
                    sim.barricadeHp > 0 &&
                    sim.barricadeHp <= sim.maxBarricadeHp * 0.5
                  ) {
                    sim.barricadeHalfXpAwarded = true;
                    awardCommanderXp(20);
                    addFloatingText('+20 XP BRECHA', sim.barricadeX - 36, 172, 22, '#38bdf8', true);
                  }

                  if (sim.barricadeHp <= 0 && sim.phase === 'combat') {
                    sim.phase = 'bus_ramming';
                    soundFX.playExplosion();
                    soundFX.playBusEngineRam();
                    sim.screenShake = 10;
                    const integrityBonus =
                      sim.busHp >= sim.maxBusHp * 0.85
                        ? 30
                        : sim.busHp >= sim.maxBusHp * 0.45
                        ? 20
                        : 10;
                    awardCommanderXp(35 + integrityBonus);
                  }
                }
              } else if (!(u.isPlayerControlled && isUsingWasd) && !u.isStationary) {
                u.state = 'march';
                if (closestZ && Math.abs(closestZ.x - u.x) < 210) {
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
                if (
                  other.team === 'survivor' &&
                  !other.isFlying &&
                  other.state !== 'corpse' &&
                  other.state !== 'dying' &&
                  other.hp > 0
                ) {
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
                  // Uses explicit meleeResist (Policeman Diaz 50%, Juggernaut 45%, Builder 35%)!
                  const dmg = Math.max(
                    2,
                    Math.round(
                      u.damage * (isCrit ? u.critMultiplier : 1) * (1 - closestS.meleeResist)
                    )
                  );
                  soundFX.playMeleeHit(isCrit);
                  closestS.hp -= dmg;
                  closestS.whiteFlashTimer = 0.1;
                  // Comeback Rage Mechanic: +0.18 Rage per HP lost on survivors!
                  sim.rage = Math.min(100, sim.rage + dmg * 0.18);
                  if (!closestS.isLucky && closestS.meleeResist < 0.4) {
                    closestS.vx += u.facing * 15;
                  }
                  spawnBloodParticles(closestS.x, closestS.y, 12, 16);
                  addFloatingText(
                    `${dmg}?`,
                    closestS.x,
                    closestS.y,
                    20,
                    '#fde047',
                    true,
                    isCrit ? 'CRIT!' : 'WACK!'
                  );
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
                  // Comeback Rage Mechanic: +0.30 Rage per HP lost on the Bus!
                  sim.rage = Math.min(100, sim.rage + u.damage * 0.3);

                  if (liveBridgeRef.current.progress.spikedBumper) {
                    u.hp -= 14;
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
                if (closestS && Math.abs(closestS.x - u.x) < 125) {
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

          // Safe deferred cleanup pass (ZERO mid-iteration array splices!)
          if (sim.units.some((u) => u.markedForRemoval)) {
            sim.units = sim.units.filter((u) => !u.markedForRemoval);
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

          // Ballistic Tracers lifetime
          for (let i = sim.tracers.length - 1; i >= 0; i--) {
            sim.tracers[i].life -= dt;
            if (sim.tracers[i].life <= 0) sim.tracers.splice(i, 1);
          }

          // 2.5D Bouncing Brass & Shotgun Shells -> Bake onto decalCanvas when stopped!
          for (let i = sim.shells.length - 1; i >= 0; i--) {
            const s = sim.shells[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.z += s.vz * dt;
            s.vz -= 290 * dt;
            if (s.z <= 0) {
              s.z = 0;
              s.bounces += 1;
              s.vx *= 0.52;
              s.vy *= 0.52;
              s.vz = Math.abs(s.vz) * 0.42;
              if (s.bounces >= 2 || s.vz < 12) {
                stampShellDecal(s.x, s.y, s.color, s.w, s.h);
                sim.shells.splice(i, 1);
              }
            }
          }

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
            setCommanderLevel(sim.commanderLevel);
            setCommanderXp(Math.floor(sim.commanderXp));
            setBusHp(Math.max(0, Math.round(sim.busHp)));
            setBarricadeHp(Math.max(0, Math.round(sim.barricadeHp)));
            setUnitCooldowns({ ...sim.unitCooldowns });
            setItemCooldowns({ ...sim.itemCooldowns });
            setTimeRemaining(Math.ceil(sim.timeRemaining));
            setRushWarningState({
              active: sim.rushWarningTimer > 0,
              yPct: Math.round((sim.rushWarningY / LOGICAL_HEIGHT) * 100),
            });
          }
        }
      }

      // =======================================================
      // ILLUSTRATED 2D HD RETINA RENDER PIPELINE (HiDPI @ 60 FPS)
      // =======================================================
      const canvas = canvasRef.current;
      const ctx = canvas ? syncCanvasHiDPI(canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT) : null;
      if (ctx) {
        const liveProgress = liveBridgeRef.current.progress;
        ctx.save();
        if (sim.screenShake > 0) {
          const sx = (Math.random() - 0.5) * sim.screenShake;
          const sy = (Math.random() - 0.5) * sim.screenShake;
          ctx.translate(sx, sy);
        }

        // LAYER 0: 2.5x HiDPI Cached Biome Background + Live Biome Details
        renderBiomeBackground(ctx, mission.biome, sim.time, mission.id);

        // LAYER 1: 2x HiDPI Persistent Decal Buffer (Blood puddles, blast craters & spent shells)
        if (decalCanvasRef.current) {
          ctx.drawImage(decalCanvasRef.current, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        }

        // Golden Commander Level-Up Shockwave Ring expanding across the road!
        if (sim.levelShockwaveTimer > 0) {
          const prog = 1 - sim.levelShockwaveTimer / 1.15;
          const rx = 38 + prog * 460;
          const ry = 16 + prog * 135;
          ctx.save();
          ctx.strokeStyle = `rgba(253, 224, 71, ${Math.max(0, 1 - prog) * 0.85})`;
          ctx.lineWidth = 4.5 * (1 - prog * 0.6);
          ctx.beginPath();
          ctx.ellipse(sim.busX + 115, 228, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // LAYER 1.5: Active Ground Napalm Fire Zones
        for (let i = 0; i < sim.fireZones.length; i++) {
          renderFireZone(ctx, sim.fireZones[i], sim.time);
        }

        // 2-Tap Tactical Target Zone on the Road (Color-coded Crosshair + Drop Guide!)
        if (sim.draggingItem) {
          const cfg = TACTICAL_ITEM_CONFIGS[sim.draggingItem];
          const tx = Math.max(142, Math.min(sim.barricadeX - 22, sim.mouseLogical.x));
          const ty = Math.max(ROAD_Y_MIN + 4, Math.min(ROAD_Y_MAX - 4, sim.mouseLogical.y));
          const pulse = 0.85 + Math.sin(sim.time * 9) * 0.15;
          const strokeCol =
            sim.draggingItem === 'red_barrel'
              ? '#ef4444'
              : sim.draggingItem === 'medkit'
              ? '#4ade80'
              : '#38bdf8';
          const fillCol =
            sim.draggingItem === 'red_barrel'
              ? 'rgba(239, 68, 68, 0.25)'
              : sim.draggingItem === 'medkit'
              ? 'rgba(74, 222, 128, 0.23)'
              : 'rgba(56, 189, 248, 0.23)';

          ctx.save();
          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius * pulse, cfg.radius * 0.45 * pulse, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.ellipse(tx, ty, cfg.radius * pulse, cfg.radius * 0.45 * pulse, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Vertical drop trajectory line & center crosshair
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 42);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.moveTo(tx - 8, ty);
          ctx.lineTo(tx + 8, ty);
          ctx.moveTo(tx, ty - 5);
          ctx.lineTo(tx, ty + 5);
          ctx.stroke();
          ctx.restore();
        }

        // Telegraphed Rush Lane Indicator drawn directly on road right edge
        if (sim.rushWarningTimer > 0) {
          const pulse = 0.35 + Math.abs(Math.sin(sim.time * 14)) * 0.45;
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.38})`;
          ctx.fillRect(sim.barricadeX - 115, sim.rushWarningY - 12, 110, 24);
          ctx.strokeStyle = `rgba(254, 202, 202, ${pulse})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sim.barricadeX - 115, sim.rushWarningY - 12, 110, 24);
        }

        // LAYER 2: Barricade & Y-Sorted 2.5D Entities
        if (sim.barricadeHp > 0) {
          renderBarricade(
            ctx,
            sim.barricadeX,
            sim.barricadeHp,
            sim.maxBarricadeHp,
            sim.barricadeShake,
            sim.time
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
              liveProgress.spikedBumper,
              liveProgress.weldedArmor,
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

        // LAYER 3: Supersonic Sniper Trails, Shotgun Pellets & Ejected Brass Shells
        renderTracersAndShells(ctx, sim.tracers, sim.shells);

        // LAYER 4: Foreground Left Military Truck & Oil Drums
        renderForegroundLeftProps(ctx);

        // LAYER 5: 1/4-Res Additive Dynamic Lightmap + Cinematic Top Vignette
        renderDynamicLightmap(
          ctx,
          mission.biome,
          sim.time,
          sim.busX,
          sim.busY,
          sim.units,
          sim.fireZones,
          sim.obstacles,
          sim.tracers
        );

        // LAYER 6: Flying Crows, Blood Particles & Crisp Comic Popups ("17? / WACK!")
        sim.crows.forEach((c) => renderCrow(ctx, c, sim.time));

        sim.particles.forEach((p) => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y - p.z, p.size * 0.62, 0, Math.PI * 2);
          ctx.fill();
        });

        sim.floatingTexts.forEach((ft) => {
          ctx.save();
          const tx = ft.x;
          const ty = ft.y - ft.z;
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';

          if (ft.subText) {
            ctx.font = '800 11.5px "Chakra Petch", sans-serif';
            ctx.lineWidth = 2.6;
            ctx.strokeStyle = '#121014';
            ctx.strokeText(ft.text, tx, ty - 7);
            ctx.fillStyle = '#fde047';
            ctx.fillText(ft.text, tx, ty - 7);

            ctx.font = '800 8px "Chakra Petch", sans-serif';
            ctx.lineWidth = 2.2;
            ctx.strokeText(ft.subText, tx, ty + 2);
            ctx.fillStyle = ft.subText === 'CRIT!' || ft.subText === 'SMASH!' ? '#fb7185' : '#fb923c';
            ctx.fillText(ft.subText, tx, ty + 2);
          } else {
            ctx.font = ft.isComic
              ? '800 10px "Chakra Petch", sans-serif'
              : '700 8.5px "Chakra Petch", sans-serif';
            ctx.lineWidth = 2.4;
            ctx.strokeStyle = '#121014';
            ctx.strokeText(ft.text, tx, ty);
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
    // Simulation mounts ONCE per mission.id; live upgrades & callbacks flow via liveBridgeRef!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);

  // Active Tactical Squad (max 6 unlocked units) + 1 Next-Unlock Teaser Card!
  const activeSquadUnits = progress.equippedDeck.filter(
    (sType) => commanderLevel >= SURVIVOR_CONFIGS[sType].unlockLevel
  );
  const effectiveSquad: SurvivorType[] =
    activeSquadUnits.length > 0 ? activeSquadUnits : ['redneck'];
  const nextLockedCfg = effectiveSquad.length < 6 ? getNextLockedUnit(commanderLevel) : null;
  const xpNeeded = getXpForNextLevel(commanderLevel);
  const xpPercent =
    commanderLevel >= MAX_COMMANDER_LEVEL
      ? 100
      : Math.min(100, Math.round((commanderXp / Math.max(1, xpNeeded)) * 100));

  return (
    <div className="relative w-full h-full bg-[#24221a] select-none overflow-hidden">
      {/* FULLSCREEN LANDSCAPE 2D HD CANVAS */}
      <canvas
        ref={canvasRef}
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        onPointerMove={handleCanvasPointerMove}
        onPointerDown={handleCanvasPointerDown}
        className={`absolute inset-0 w-full h-full object-cover hd-canvas ${
          draggingItem ? 'cursor-crosshair' : 'cursor-pointer'
        }`}
      />

      {/* ===================================================================== */}
      {/* TOP-LEFT FLOATING HUD: Pause "||", Courage Flasks, Rage Drop & Level  */}
      {/* ===================================================================== */}
      <div className="absolute top-1.5 left-3 z-20 flex items-start gap-1.5">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => {
              if (paused) resumeBattle();
              else pauseBattle();
            }}
            className="mt-0.5 text-white hover:text-amber-300 font-pixel text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] px-1 cursor-pointer"
            title="Pausar / Reanudar Combate [Esc]"
          >
            {paused ? '▶' : '||'}
          </button>

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
            className="text-xs px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] cursor-pointer"
            title="Activar / Silenciar Sonido"
          >
            🔊
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Blue Courage Bar with live internal fill meter */}
          <div className="relative flex items-center">
            <div className="z-10 -mr-2 w-7 h-7 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
              <div className="flex items-end gap-0.5">
                <div className="w-2 h-4 bg-gradient-to-b from-sky-200 to-sky-500 border border-slate-950 rounded-t-xs" />
                <div className="w-2.5 h-5 bg-gradient-to-b from-cyan-100 to-sky-400 border border-slate-950 rounded-t-xs" />
                <div className="w-2 h-4 bg-gradient-to-b from-sky-300 to-blue-600 border border-slate-950 rounded-t-xs" />
              </div>
            </div>
            <div className="relative overflow-hidden min-w-[88px] sm:min-w-[102px] h-6 bg-[#5f6647]/95 border-2 border-[#232619] rounded-xs flex items-center justify-start pl-3.5 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.6)]">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500/45 to-cyan-300/35 transition-all duration-150 pointer-events-none"
                style={{ width: `${Math.min(100, courage)}%` }}
              />
              <span
                className="relative z-10 font-tactical font-extrabold text-sm sm:text-base text-white leading-none"
                style={{
                  textShadow:
                    '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                }}
              >
                {courage}
              </span>
            </div>
          </div>

          {/* Red Rage Bar with live internal fill meter */}
          <div className="relative flex items-center">
            <div className="z-10 -mr-2 w-7 h-7 flex items-center justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
              <div className="w-4 h-5 bg-gradient-to-b from-rose-300 via-red-500 to-red-800 border border-slate-950 rounded-full rounded-t-xs rotate-12" />
            </div>
            <div className="relative overflow-hidden min-w-[88px] sm:min-w-[102px] h-6 bg-[#5f6647]/95 border-2 border-[#232619] rounded-xs flex items-center justify-start pl-3.5 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.6)]">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600/45 to-orange-500/35 transition-all duration-150 pointer-events-none"
                style={{ width: `${Math.min(100, rage)}%` }}
              />
              <span
                className="relative z-10 font-tactical font-extrabold text-sm sm:text-base text-[#ff6b6b] leading-none"
                style={{
                  textShadow:
                    '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                }}
              >
                {rage}
              </span>
            </div>
          </div>

          {/* Water Drop WASD Toggle + Compact Commander XP Badge */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => {
                setShowDpad((s) => !s);
                cycleSelectedSurvivor();
              }}
              className="flex flex-col items-center w-6 cursor-pointer group"
              title="Cambiar unidad controlada [TAB] / Mostrar D-Pad Táctil"
            >
              <div className="w-4 h-4 rounded-full bg-slate-900 border border-sky-400 flex items-center justify-center text-[9px] shadow">
                💧
              </div>
              <div className="flex gap-0.5 mt-0.5">
                <span className="w-1.5 h-1 bg-emerald-400 border border-black" />
                <span className="w-1.5 h-1 bg-emerald-400 border border-black" />
                <span className="w-1.5 h-1 bg-zinc-700 border border-black" />
              </div>
            </button>

            <div className="flex flex-col bg-zinc-950/90 border border-[#8e8864] rounded px-2 py-0.5 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="font-pixel text-[9px] text-amber-300">NV.{commanderLevel}</span>
                <span className="text-[8px] font-bold text-zinc-300">
                  {commanderLevel >= MAX_COMMANDER_LEVEL ? 'MAX' : `${commanderXp}/${xpNeeded} XP`}
                </span>
              </div>
              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-0.5 border border-black">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-amber-300 to-yellow-400 transition-all duration-200"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP-CENTER FLOATING FURY BOTTLE (Glowing Red-Orange Aura)             */}
      {/* ===================================================================== */}
      <button
        onClick={triggerFuryWhiskeyBuff}
        className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-11 h-11 cursor-pointer group"
        title="Activar Botella de Furia / Ráfaga de Bill [Espacio]"
      >
        <div
          className={`absolute inset-0 rounded-full blur-md transition ${
            furyBuffCount > 0 || rage >= 25
              ? 'bg-red-500/55 animate-pulse'
              : 'bg-zinc-800/30 opacity-50'
          }`}
        />
        <div className="relative w-5 h-8 bg-gradient-to-b from-amber-300 via-orange-500 to-red-700 border-2 border-[#1c1917] rounded-xs flex flex-col items-center justify-center shadow-lg group-hover:scale-105 transition">
          <div className="w-2 h-2 bg-amber-200 border border-black -mt-3 mb-1" />
          <div className="w-3 h-3 bg-yellow-200/90 rounded-xs" />
        </div>
        <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-400 text-[9px] font-bold text-white flex items-center justify-center">
          {furyBuffCount > 0 ? furyBuffCount : '25'}
        </span>
      </button>

      {/* ===================================================================== */}
      {/* TOP-RIGHT FLOATING COINS BAR & CAMPAIGN MAP BUTTON                    */}
      {/* ===================================================================== */}
      <div className="absolute top-2 right-3 z-20 flex items-center gap-2">
        <button
          onClick={onRetreat}
          className="px-2 py-0.5 rounded-xs bg-[#323626]/90 hover:bg-[#414732] border border-[#8e9472] text-[10px] font-extrabold text-amber-200 shadow cursor-pointer"
          title="Volver al Mapa de Campaña"
        >
          🗺️ Mapa
        </button>

        <div className="relative flex items-center">
          <div className="min-w-[84px] sm:min-w-[98px] h-6 bg-[#7a825c]/95 border-2 border-[#232619] rounded-xs flex items-center justify-end pr-4 pl-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.6)]">
            <span
              className="font-tactical font-extrabold text-sm sm:text-base text-white leading-none"
              style={{
                textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
              }}
            >
              {progress.coins}
            </span>
          </div>
          <div className="z-10 -ml-2.5 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 border-2 border-[#1c1917] flex items-center justify-center shadow-md">
            <span className="text-xs leading-none">🪙</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT-SIDE HORDE TIMER ("02:30") + TELEGRAPHED RUSH LANE BADGE        */}
      {/* ===================================================================== */}
      <div className="absolute top-[24%] right-3.5 z-20 flex flex-col items-center pointer-events-none">
        <span
          className="font-tactical font-bold text-xs text-white mb-0.5"
          style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}
        >
          {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:
          {String(timeRemaining % 60).padStart(2, '0')}
        </span>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 border-2 border-[#231f18] shadow-lg flex items-center justify-center ${
            hordeTriggered ? 'animate-bounce ring-4 ring-red-500' : ''
          }`}
        >
          <span className="text-lg leading-none drop-shadow">💀</span>
        </div>
      </div>

      {/* TELEGRAPHED RUSH WARNING AT EXACT Y LANE */}
      {rushWarningState.active && (
        <div
          className="absolute right-2 z-30 flex items-center gap-1 px-2 py-0.5 rounded bg-red-700/95 border-2 border-yellow-300 shadow-lg animate-pulse pointer-events-none"
          style={{ top: `${Math.max(48, Math.min(82, rushWarningState.yPct))}%` }}
        >
          <span className="text-xs">⚠️</span>
          <span className="font-pixel text-[7px] text-yellow-200 tracking-tighter">
            ¡CORREDORES!
          </span>
        </div>
      )}

      {/* NON-BLOCKING GOLDEN COMMANDER LEVEL-UP BANNER */}
      {levelUpBanner && (
        <div className="animate-level-banner absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-950/95 via-zinc-950/95 to-amber-950/95 border-2 border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.55)] pointer-events-none">
          {levelUpBanner.unitType ? (
            <div className="w-9 h-9 rounded bg-amber-500/20 border border-yellow-400/70 flex items-center justify-center shrink-0">
              <CanvasUnitPortrait type={levelUpBanner.unitType} active={true} />
            </div>
          ) : (
            <span className="text-lg">⭐</span>
          )}
          <div className="text-left leading-tight">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-300">
              ¡Ascenso a Nivel {levelUpBanner.level}! · Moral +15% HP
            </div>
            <div className="text-xs font-extrabold text-white">
              {levelUpBanner.unitName}{' '}
              <span className="text-[10px] font-semibold text-emerald-300">
                ({levelUpBanner.roleTitle})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE 2-TAP DEPLOYMENT HINT BANNER */}
      {draggingItem && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-950/95 border-2 border-yellow-400 text-[10px] font-bold text-amber-200 shadow-xl">
          <span>
            🎯 <strong>{TACTICAL_ITEM_CONFIGS[draggingItem].name}</strong> listo — Toca en la carretera dónde soltarlo
          </span>
          <button
            type="button"
            onClick={() => {
              setDraggingItem(null);
              simRef.current.draggingItem = null;
            }}
            className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-red-700 text-zinc-200 text-[9px] font-extrabold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* OPTIONAL TOUCH WASD D-PAD (bottom-left)                               */}
      {/* ===================================================================== */}
      {showDpad && (
        <div className="absolute bottom-16 left-3 z-30 grid grid-cols-3 gap-1 w-24 h-24 opacity-85 select-none touch-none">
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
      {/* BOTTOM TACTICAL DECK: Compact Slots w/ Small Names + 2-Tap Items      */}
      {/* ===================================================================== */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-end justify-center gap-1 max-w-[99vw] px-1.5 py-0.5">
        {/* SURVIVOR SQUAD CARDS (Fits completely on screen with small unit names) */}
        <div className="flex items-end gap-1">
          {effectiveSquad.map((sType, slotIndex) => {
            const cfg = SURVIVOR_CONFIGS[sType];
            const cd = unitCooldowns[sType];
            const canAfford = courage >= cfg.cost && cd <= 0;
            const lvl = progress.unitLevels[sType] || 1;
            const slotKey = String(slotIndex + 1);
            const shortName = SHORT_UNIT_NAMES[sType];

            return (
              <button
                key={sType}
                type="button"
                onClick={() => deploySurvivor(sType)}
                disabled={!canAfford}
                className={`shrink-0 relative w-[42px] h-[56px] sm:w-[46px] sm:h-[60px] rounded transition select-none flex flex-col justify-between p-0.5 ${
                  canAfford
                    ? 'bg-[#3f4430]/95 border-2 border-[#c2c799] shadow-[0_3px_8px_rgba(0,0,0,0.8)] cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-[#26281d]/88 border border-[#4a4d38] cursor-not-allowed'
                }`}
                title={`${cfg.name} (${cfg.roleTitle}) — ${cfg.cost} Valor [${slotKey}]`}
              >
                {cd > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black/68 pointer-events-none z-10 rounded-b"
                    style={{ height: `${Math.min(100, (cd / cfg.prepTime) * 100)}%` }}
                  />
                )}

                <div className="w-full flex justify-between items-center z-20 px-0.5">
                  <span className="text-[6.5px] font-bold text-zinc-400 leading-none">
                    {slotKey}
                  </span>
                  <span
                    className={`px-0.5 text-[7px] font-extrabold leading-tight rounded-xs ${
                      canAfford
                        ? 'bg-[#0284c7] text-white border border-black/70'
                        : 'text-[#8c8a6e]'
                    }`}
                  >
                    Nv.{lvl}
                  </span>
                </div>

                <div className="absolute inset-x-0 top-2.5 bottom-4 flex items-center justify-center pointer-events-none">
                  <CanvasUnitPortrait type={sType} active={canAfford} />
                </div>

                <div className="w-full flex flex-col items-center z-20 mt-auto">
                  <span
                    className={`w-full text-center text-[6.5px] sm:text-[7px] font-bold leading-none truncate px-0.5 mb-0.5 ${
                      canAfford ? 'text-amber-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]' : 'text-zinc-500'
                    }`}
                  >
                    {shortName}
                  </span>
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`w-3 h-3 rounded-full flex items-center justify-center text-[6px] ${
                        canAfford
                          ? 'bg-slate-950 border border-sky-400 text-sky-300'
                          : 'bg-zinc-900/60 text-zinc-600'
                      }`}
                    >
                      💧
                    </span>
                    <span
                      className={`font-tactical font-extrabold text-[10px] sm:text-[11px] leading-none ${
                        canAfford ? 'text-white' : 'text-[#737058]'
                      }`}
                      style={
                        canAfford ? { textShadow: '1px 1px 0 #000, -1px -1px 0 #000' } : undefined
                      }
                    >
                      {cfg.cost}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Next-Unlock Teaser Slot (Compact with small name) */}
          {nextLockedCfg && (
            <button
              type="button"
              onClick={() =>
                addFloatingText(
                  `${nextLockedCfg.name.toUpperCase()} SE DESBLOQUEA EN NV.${nextLockedCfg.unlockLevel}`,
                  360,
                  208,
                  20,
                  '#fde047',
                  true
                )
              }
              className="shrink-0 relative w-[38px] h-[56px] sm:w-[42px] sm:h-[60px] rounded bg-zinc-950/82 border border-amber-700/65 flex flex-col justify-between p-0.5 opacity-85 hover:opacity-100 cursor-pointer transition"
              title={`🔒 Próximo desbloqueo en Nivel ${nextLockedCfg.unlockLevel}: ${nextLockedCfg.name} (${nextLockedCfg.roleTitle})`}
            >
              <div className="w-full flex justify-center z-20">
                <span className="px-0.5 text-[6.5px] font-extrabold bg-amber-950 text-amber-300 border border-amber-600/80 rounded-xs leading-tight">
                  🔒NV.{nextLockedCfg.unlockLevel}
                </span>
              </div>
              <div className="absolute inset-x-0 top-2.5 bottom-4 flex items-center justify-center pointer-events-none">
                <CanvasUnitPortrait type={nextLockedCfg.id} active={false} />
              </div>
              <div className="w-full z-20 mt-auto flex flex-col items-center">
                <span className="w-full text-center text-[6px] font-bold text-amber-200/75 leading-none truncate px-0.5 mb-0.5">
                  {SHORT_UNIT_NAMES[nextLockedCfg.id]}
                </span>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden border border-black">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* DIVIDER */}
        <div className="h-10 w-[1px] bg-[#6e7353]/55 self-center mx-0.5 shrink-0" />

        {/* RAGE TACTICAL DOCK (2-Tap Manual Throwables: 1st tap = Select, 2nd tap on road = Drop) */}
        <div className="flex items-end gap-1">
          {TACTICAL_ORDER.map((itemType) => {
            const cfg = TACTICAL_ITEM_CONFIGS[itemType];
            const cd = itemCooldowns[itemType];
            const canAfford = rage >= cfg.rageCost && cd <= 0;
            const isSelected = draggingItem === itemType;
            const keyHint = itemType === 'blue_barrel' ? 'Q' : itemType === 'red_barrel' ? 'X' : 'E';

            return (
              <button
                key={itemType}
                type="button"
                onClick={() => selectTacticalItem(itemType)}
                disabled={!canAfford}
                className={`shrink-0 relative w-[40px] h-[54px] sm:w-[44px] sm:h-[58px] rounded transition select-none flex flex-col justify-between p-0.5 ${
                  isSelected
                    ? 'bg-amber-950/95 border-2 border-yellow-300 ring-2 ring-yellow-400/60 -translate-y-1 shadow-xl cursor-pointer'
                    : canAfford
                    ? 'bg-[#453830]/92 border-2 border-[#b88774] cursor-pointer hover:scale-105 active:scale-95 shadow-[0_2px_6px_rgba(0,0,0,0.75)]'
                    : 'bg-[#2a2520]/82 border border-[#453c34] cursor-not-allowed'
                }`}
                title={`${cfg.name} (${cfg.rageCost} Ira) [${keyHint}] — 1er toque: seleccionar, 2do toque en carretera: lanzar`}
              >
                {cd > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black/65 pointer-events-none z-10 rounded-b"
                    style={{ height: `${Math.min(100, (cd / cfg.prepTime) * 100)}%` }}
                  />
                )}

                <div className="w-full flex justify-between items-center z-20 px-0.5">
                  <span className="text-[6.5px] font-extrabold text-zinc-400 leading-none">
                    {keyHint}
                  </span>
                  <span
                    className={`text-[6.5px] font-extrabold leading-none ${
                      isSelected ? 'text-yellow-300 animate-pulse' : 'text-lime-300'
                    }`}
                  >
                    {isSelected ? '🎯' : '⤵'}
                  </span>
                </div>

                {/* Tactical Item Icon */}
                <div className="absolute inset-x-0 top-2.5 bottom-4 flex items-center justify-center pointer-events-none">
                  {itemType === 'blue_barrel' && (
                    <div
                      className={`w-4 h-6 rounded-xs border flex items-center justify-center ${
                        canAfford
                          ? 'bg-gradient-to-r from-[#3b5d7a] via-[#527da3] to-[#243b4f] border-black'
                          : 'bg-[#1f1e18] border-[#2e2c22] opacity-55'
                      }`}
                    >
                      <div className="w-full h-0.5 bg-black/70" />
                    </div>
                  )}
                  {itemType === 'red_barrel' && (
                    <div
                      className={`w-4 h-6 rounded-xs border flex items-center justify-center ${
                        canAfford
                          ? 'bg-gradient-to-r from-[#b91c1c] via-[#ef4444] to-[#7f1d1d] border-black'
                          : 'bg-[#241917] border-[#362522] opacity-55'
                      }`}
                    >
                      <span className="text-[7px] leading-none">{canAfford ? '💥' : ''}</span>
                    </div>
                  )}
                  {itemType === 'medkit' && (
                    <div
                      className={`w-5 h-4 rounded-xs border flex items-center justify-center ${
                        canAfford
                          ? 'bg-slate-100 border-black'
                          : 'bg-zinc-800 border-zinc-700 opacity-50'
                      }`}
                    >
                      <span
                        className={`font-extrabold text-[9px] leading-none ${
                          canAfford ? 'text-red-600' : 'text-zinc-600'
                        }`}
                      >
                        +
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col items-center z-20 mt-auto">
                  <span
                    className={`w-full text-center text-[6px] sm:text-[6.5px] font-bold leading-none truncate px-0.5 mb-0.5 ${
                      isSelected
                        ? 'text-yellow-300'
                        : canAfford
                        ? 'text-orange-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]'
                        : 'text-zinc-500'
                    }`}
                  >
                    {isSelected ? 'SOLTAR' : SHORT_TACTICAL_NAMES[itemType]}
                  </span>
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`w-2 h-1 rounded-full border border-black ${
                        itemType === 'medkit'
                          ? 'bg-emerald-400'
                          : itemType === 'red_barrel'
                          ? 'bg-orange-500'
                          : 'bg-lime-400'
                      }`}
                    />
                    <span
                      className={`font-tactical font-extrabold text-[10px] sm:text-[11px] leading-none ${
                        canAfford ? 'text-[#ff6b6b]' : 'text-[#633630]'
                      }`}
                      style={canAfford ? { textShadow: '1px 1px 0 #000' } : undefined}
                    >
                      {cfg.rageCost}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAUSE MODAL OVERLAY */}
      {paused && battleResult === 'none' && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-xs w-full bg-[#1f2118] border-2 border-amber-500 rounded-lg p-5 text-center shadow-2xl">
            <div className="font-pixel text-sm sm:text-base text-amber-400 mb-1.5">
              ⏸ JUEGO EN PAUSA
            </div>
            <p className="text-[11px] text-zinc-300 mb-4 leading-relaxed">
              Combate y audio en espera segura. Tus unidades y el autobús están listos cuando vuelvas.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={resumeBattle}
                className="w-full py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                ▶ Reanudar Combate
              </button>
              <button
                onClick={() => {
                  soundFX.resumeFromBackground();
                  onRetreat();
                }}
                className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 font-bold text-xs cursor-pointer"
              >
                🗺️ Salir al Mapa de Campaña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY OR DEFEAT MODAL OVERLAY */}
      {battleResult !== 'none' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-[#1f2118] border-2 border-yellow-500 rounded-lg p-5 text-center shadow-2xl">
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
                        s <= starsEarned
                          ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.65)]'
                          : 'text-zinc-700'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 mb-1">
                  Integridad del Autobús: <strong className="text-emerald-400">{Math.round((busHp / maxBusHp) * 100)}%</strong> ({barricadeHp === 0 ? 'Ruta Despejada' : ''})
                </p>
                <p className="text-xs text-zinc-200 mb-4">
                  Botín: <strong className="text-yellow-400">+{mission.coinsReward + starsEarned * 15} 🪙</strong> ({zombiesKilledCount} infectados abatidos)
                </p>
                <button
                  onClick={() =>
                    onVictory(
                      starsEarned,
                      mission.coinsReward + starsEarned * 15,
                      zombiesKilledCount
                    )
                  }
                  className="w-full py-2.5 rounded bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  Continuar al Mapa Mundial →
                </button>
              </>
            ) : (
              <>
                <div className="font-pixel text-base text-red-500 mb-1.5">¡EL AUTOBÚS CAYÓ!</div>
                <p className="text-xs text-zinc-300 mb-4">
                  Consejo táctico: Usa el Barril Azul [Q] para frenar corredores, el Barril Rojo [X] para incinerar cadáveres y al Mechanic para reparar el bus.
                </p>
                <button
                  onClick={onRetreat}
                  className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs uppercase cursor-pointer"
                >
                  Reagrupar en el Mapa →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Crisp Canvas-Rendered Pixel Sprite Portrait (turns into authentic dark silhouette when on cooldown/low courage!)
const CanvasUnitPortrait: React.FC<{ type: SurvivorType; active: boolean }> = React.memo(
  ({ type, active }) => {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (!ref.current) return;
      const ctx = syncCanvasHiDPI(ref.current, 34, 38, 3);
      if (!ctx) return;
      renderCharacterPreview(ctx, type, false, 34, 38);
    }, [type]);

    return (
      <canvas
        ref={ref}
        width={34}
        height={38}
        className={`w-7 h-8 sm:w-7.5 sm:h-8.5 hd-canvas transition ${
          active ? 'opacity-100' : 'brightness-0 opacity-45'
        }`}
      />
    );
  }
);

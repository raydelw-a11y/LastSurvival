export type SurvivorType =
  | 'redneck'
  | 'farmer'
  | 'gunslinger'
  | 'builder'
  | 'mechanic'
  | 'hound'
  | 'policeman'
  | 'sniper'
  | 'flamethrower'
  | 'turret'
  | 'drone'
  | 'juggernaut';

export type TacticalItemType = 'blue_barrel' | 'red_barrel' | 'medkit';
export type ZombieType = 'walker' | 'runner' | 'crit_zombie' | 'armored' | 'skeleton' | 'bloated';
export type BiomeType = 'forest_highway' | 'farm_crossing' | 'graveyard' | 'junkyard_city';

export interface SurvivorConfig {
  id: SurvivorType;
  name: string;
  roleTitle: string;
  unlockLevel: number; // Commander / Bus level required to unlock
  cost: number; // Courage (blue)
  prepTime: number; // Cooldown in seconds
  baseHp: number;
  baseDamage: number;
  fortune: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  isRanged: boolean;
  pellets?: number;
  reloadTime?: number;
  magSize?: number;
  knockback: number;
  bulletResist?: number;
  meleeResist?: number; // Reduces incoming zombie melee damage
  armorPiercing?: number; // Ignores portion of zombie bulletResist
  barricadeMultiplier?: number;
  repairsBusOnSpawn?: number;
  firstHitCritMultiplier?: number;
  isStationary?: boolean; // For Automated Turret
  isFlying?: boolean; // For Combat Drone (hovers above ground)
  isDog?: boolean; // Fast K-9 attack dog
  isFlame?: boolean; // Flamethrower continuous fire cone
  infectedZombieType?: ZombieType;
  description: string;
  quotes: string[];
  hotkey: string;
}

export interface TacticalItemConfig {
  id: TacticalItemType;
  name: string;
  rageCost: number;
  prepTime: number;
  radius: number;
  impactDamage: number;
  obstacleHp: number;
  explodesOnBreak: boolean;
  healsPerSec?: number;
  duration?: number;
  description: string;
  hotkey: string;
}

export interface ZombieConfig {
  id: ZombieType;
  name: string;
  baseHp: number;
  baseDamage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  rageReward: number;
  courageDropChance: number;
  critChance: number;
  critMultiplier: number;
  bulletResist?: number;
  explodesOnDeath?: boolean;
  emergesFromGround?: boolean;
  description: string;
}

export interface MissionNode {
  id: number;
  campaignTier: number; // Difficulty tier 1..12 matching sector progression
  name: string;
  sector: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';
  biome: BiomeType;
  barricadeHp: number;
  fuelCost: number;
  coinsReward: number;
  supplyReward: string;
  mapX: number; // Percentage 0..100 on the 2100x1120 world map
  mapY: number; // Percentage 0..100 on the 2100x1120 world map (North..South)
  connectedTo: number[]; // Connected highway mission IDs (Main, North & South branches)
  waveInterval: number;
  zombiePool: ZombieType[];
  skeletonAmbush: boolean;
  description: string;
}

export interface PlayerProgress {
  coins: number;
  fuel: number;
  maxFuel: number;
  supplies: number;
  busLevel: number; // Commander Level 1..12 (unlocks new units solely via combat XP!)
  commanderXp: number;
  equippedDeck: SurvivorType[]; // Up to 6 active squad slots for battle HUD
  busHpBonus: number;
  billDamageBonus: number;
  spikedBumper: boolean;
  weldedArmor: boolean;
  unitLevels: Record<SurvivorType, number>;
  missionStars: Record<number, number>;
  unlockedMissions: number[];
  discoveredCaches: string[];
}

export const MAX_COMMANDER_LEVEL = 12;
export const MAX_EQUIPPED_DECK = 6;

export const SURVIVOR_ORDER: SurvivorType[] = [
  'redneck',
  'farmer',
  'gunslinger',
  'builder',
  'mechanic',
  'hound',
  'policeman',
  'sniper',
  'flamethrower',
  'turret',
  'drone',
  'juggernaut',
];

export const SHORT_UNIT_NAMES: Record<SurvivorType, string> = {
  redneck: 'Redneck',
  farmer: 'Farmer',
  gunslinger: 'Poli Dual',
  builder: 'Builder',
  mechanic: 'Mechanic',
  hound: 'Perro K9',
  policeman: 'Policía',
  sniper: 'Sniper',
  flamethrower: 'Pyro',
  turret: 'Torreta',
  drone: 'Dron',
  juggernaut: 'Juggernaut',
};

export const SHORT_TACTICAL_NAMES: Record<TacticalItemType, string> = {
  blue_barrel: 'Barril A.',
  red_barrel: 'Barril R.',
  medkit: 'Botiquín',
};

export const XP_THRESHOLDS: Record<number, number> = {
  1: 110,  // Nv.1 -> Nv.2 (Farmer)
  2: 150,  // Nv.2 -> Nv.3 (Oficial Pepper - Policía Dual)
  3: 195,  // Nv.3 -> Nv.4 (Builder)
  4: 245,  // Nv.4 -> Nv.5 (Mechanic)
  5: 300,  // Nv.5 -> Nv.6 (Perro K-9 Rex)
  6: 360,  // Nv.6 -> Nv.7 (Policeman Diaz)
  7: 425,  // Nv.7 -> Nv.8 (Sniper Polina)
  8: 495,  // Nv.8 -> Nv.9 (Pyro Lanzallamas)
  9: 570,  // Nv.9 -> Nv.10 (Torreta Gatling)
  10: 650, // Nv.10 -> Nv.11 (Dron MQ-9)
  11: 740, // Nv.11 -> Nv.12 (Juggernaut + Maestría +10%)
};

export function getXpForNextLevel(level: number): number {
  if (level >= MAX_COMMANDER_LEVEL) return XP_THRESHOLDS[11];
  return XP_THRESHOLDS[level] ?? 750;
}

export const ZOMBIE_XP_REWARD: Record<ZombieType, number> = {
  walker: 8,
  skeleton: 9,
  runner: 12,
  crit_zombie: 15,
  armored: 20,
  bloated: 24,
};

export const SURVIVOR_CONFIGS: Record<SurvivorType, SurvivorConfig> = {
  redneck: {
    id: 'redneck',
    name: 'Redneck',
    roleTitle: 'Campesino con Pala',
    unlockLevel: 1,
    cost: 15,
    prepTime: 3.6,
    baseHp: 46,
    baseDamage: 15,
    fortune: 28,
    speed: 56,
    attackRange: 22,
    attackCooldown: 0.78,
    isRanged: false,
    knockback: 11,
    infectedZombieType: 'runner',
    description: 'Nv.1 Inicial: Despliegue veloz y empuje constante. Tu primer luchador para abrir camino.',
    quotes: ['¡Por mi granja!', '¡Toma pala!', '¡Yee-haw!', '¡Atrás, podridos!'],
    hotkey: '1',
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    roleTitle: 'Granjero Escopetero',
    unlockLevel: 2,
    cost: 20,
    prepTime: 7.5,
    baseHp: 38,
    baseDamage: 8, // x4 perdigones = 32 daño en cono
    fortune: 28,
    speed: 26,
    attackRange: 134,
    attackCooldown: 1.38,
    isRanged: true,
    pellets: 4,
    magSize: 2,
    reloadTime: 1.9,
    knockback: 22,
    infectedZombieType: 'walker',
    description: 'Desbloquea Nv.2: Dispara 4 perdigones en abanico con gran retroceso cada 2 cartuchos.',
    quotes: ['¡Fuera de mis tierras!', '¡Plomo para todos!', '¡A comer perdigones!'],
    hotkey: '2',
  },
  gunslinger: {
    id: 'gunslinger',
    name: 'Oficial Pepper',
    roleTitle: 'Policía Femenina Dual',
    unlockLevel: 3,
    cost: 20,
    prepTime: 6.8,
    baseHp: 44,
    baseDamage: 6, // Poco daño individual, altísima cadencia con dos pistolas 9mm
    fortune: 44,
    speed: 38,
    attackRange: 158,
    attackCooldown: 0.22,
    isRanged: true,
    pellets: 1,
    magSize: 20,
    reloadTime: 1.5,
    knockback: 4,
    infectedZombieType: 'runner',
    description: 'Desbloquea Nv.3: Policía ágil con dos pistolas 9mm. Poco daño por bala pero cadencia de tiro vertiginosa.',
    quotes: ['¡Fuego doble!', '¡Manos arriba!', '¡Ráfaga policial!', '¡Sin tregua!'],
    hotkey: '3',
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    roleTitle: 'Demoledor Blindado',
    unlockLevel: 4,
    cost: 25,
    prepTime: 9.2,
    baseHp: 82,
    baseDamage: 16,
    fortune: 32,
    speed: 30,
    attackRange: 24,
    attackCooldown: 1.12,
    isRanged: false,
    knockback: 22,
    bulletResist: 0.5,
    meleeResist: 0.35,
    barricadeMultiplier: 2.0,
    infectedZombieType: 'armored',
    description: 'Desbloquea Nv.4: Casco y chaleco anticorte (-35% daño melee). Doble daño a la barricada.',
    quotes: ['¡A demoler!', '¡Casco puesto!', '¡Rompiendo chatarra!'],
    hotkey: '4',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic',
    roleTitle: 'Asesino & Reparador',
    unlockLevel: 5,
    cost: 20,
    prepTime: 7.0,
    baseHp: 44,
    baseDamage: 16,
    fortune: 40,
    speed: 58,
    attackRange: 22,
    attackCooldown: 0.85,
    isRanged: false,
    knockback: 28,
    repairsBusOnSpawn: 30,
    firstHitCritMultiplier: 3.2,
    barricadeMultiplier: 1.5,
    infectedZombieType: 'runner',
    description: 'Desbloquea Nv.5: Repara +30 HP del autobús al salir y su primer mazazo hace crítico x3.2.',
    quotes: ['¡Chasis reparado!', '¡Llave inglesa lista!', '¡Primer golpe!'],
    hotkey: '5',
  },
  hound: {
    id: 'hound',
    name: 'Perro K-9 Rex',
    roleTitle: 'Sabueso de Ataque',
    unlockLevel: 6,
    cost: 12,
    prepTime: 3.4,
    baseHp: 36,
    baseDamage: 17,
    fortune: 48,
    speed: 86,
    attackRange: 20,
    attackCooldown: 0.52,
    isRanged: false,
    knockback: 14,
    isDog: true,
    description: 'Desbloquea Nv.6: Perro militar ultrarrápido que caza corredores y jamás revive infectado.',
    quotes: ['¡Grrrr! ¡Guau!', '¡K-9 al ataque!'],
    hotkey: '6',
  },
  policeman: {
    id: 'policeman',
    name: 'Policeman Diaz',
    roleTitle: 'Escopetero Pesado',
    unlockLevel: 7,
    cost: 25,
    prepTime: 10.5,
    baseHp: 94,
    baseDamage: 8, // x4 perdigones
    fortune: 35,
    speed: 24,
    attackRange: 126,
    attackCooldown: 1.15,
    isRanged: true,
    pellets: 4,
    magSize: 4,
    reloadTime: 2.0,
    knockback: 18,
    bulletResist: 0.5,
    meleeResist: 0.5,
    infectedZombieType: 'armored',
    description: 'Desbloquea Nv.7: Tanque escopetero con 50% de defensa cuerpo a cuerpo y 4 cartuchos.',
    quotes: ['¡Alto ahí!', '¡Código 10-99!', '¡Ley y plomo!'],
    hotkey: '7',
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Polina',
    roleTitle: 'Francotiradora Élite',
    unlockLevel: 8,
    cost: 30,
    prepTime: 11.0,
    baseHp: 36,
    baseDamage: 74,
    fortune: 55,
    speed: 24,
    attackRange: 340,
    attackCooldown: 2.05,
    isRanged: true,
    pellets: 1,
    magSize: 5,
    reloadTime: 2.4,
    knockback: 28,
    armorPiercing: 0.75,
    infectedZombieType: 'walker',
    description: 'Desbloquea Nv.8: Disparo supersónico con guía láser que perfora el 75% del blindaje.',
    quotes: ['Un tiro, una baja.', 'Objetivo en la mira.', 'Sin escapatoria.'],
    hotkey: '8',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Pyro Lanzallamas',
    roleTitle: 'Incinerador Pesado',
    unlockLevel: 9,
    cost: 30,
    prepTime: 11.5,
    baseHp: 74,
    baseDamage: 12,
    fortune: 40,
    speed: 28,
    attackRange: 96,
    attackCooldown: 0.34,
    isRanged: true,
    pellets: 2,
    magSize: 14,
    reloadTime: 2.3,
    knockback: 6,
    bulletResist: 0.4,
    meleeResist: 0.2,
    isFlame: true,
    infectedZombieType: 'bloated',
    description: 'Desbloquea Nv.9: Rocia fuego continuo que derrite blindajes y calcina cadáveres infectados.',
    quotes: ['¡Fuego purificador!', '¡Que arda todo!', '¡Calor extremo!'],
    hotkey: '9',
  },
  turret: {
    id: 'turret',
    name: 'Torreta Gatling',
    roleTitle: 'Centinela Automática',
    unlockLevel: 10,
    cost: 25,
    prepTime: 12.0,
    baseHp: 108,
    baseDamage: 9,
    fortune: 35,
    speed: 0,
    attackRange: 235,
    attackCooldown: 0.24,
    isRanged: true,
    pellets: 1,
    magSize: 28,
    reloadTime: 2.1,
    knockback: 5,
    bulletResist: 0.7,
    meleeResist: 0.25,
    isStationary: true,
    description: 'Desbloquea Nv.10: Torreta trípode rotativa que barre la carretera expulsando casquillos.',
    quotes: ['[SISTEMA CENTINELA ACTIVO]', '[RÁFAGA AUTOMÁTICA]'],
    hotkey: '0',
  },
  drone: {
    id: 'drone',
    name: 'Dron MQ-9',
    roleTitle: 'Apoyo Aéreo Táctico',
    unlockLevel: 11,
    cost: 25,
    prepTime: 11.0,
    baseHp: 50,
    baseDamage: 15,
    fortune: 50,
    speed: 44,
    attackRange: 198,
    attackCooldown: 0.4,
    isRanged: true,
    pellets: 1,
    magSize: 18,
    reloadTime: 1.6,
    knockback: 8,
    armorPiercing: 0.4,
    isFlying: true,
    description: 'Desbloquea Nv.11: Dron militar volador inmune a zombis terrestres con foco y fuego aéreo.',
    quotes: ['[DRON EN VUELO]', '[OBJETIVO FIJADO]'],
    hotkey: '-',
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    roleTitle: 'Coloso Spec-Ops',
    unlockLevel: 12,
    cost: 35,
    prepTime: 14.0,
    baseHp: 190,
    baseDamage: 32,
    fortune: 45,
    speed: 22,
    attackRange: 28,
    attackCooldown: 1.0,
    isRanged: false,
    knockback: 38,
    bulletResist: 0.75,
    meleeResist: 0.45,
    barricadeMultiplier: 2.5,
    infectedZombieType: 'bloated',
    description: 'Desbloquea Nv.12: Supersoldado acorazado (-45% daño melee) con mazo de choque sísmico.',
    quotes: ['¡Imparable!', '¡Blindaje máximo!', '¡Aplastando cráneos!'],
    hotkey: '=',
  },
};

export function isUnitUnlocked(type: SurvivorType, commanderLevel: number): boolean {
  return commanderLevel >= SURVIVOR_CONFIGS[type].unlockLevel;
}

export function getUnitUnlockedAtLevel(commanderLevel: number): SurvivorConfig | null {
  for (const id of SURVIVOR_ORDER) {
    if (SURVIVOR_CONFIGS[id].unlockLevel === commanderLevel) {
      return SURVIVOR_CONFIGS[id];
    }
  }
  return null;
}

export function getNextLockedUnit(commanderLevel: number): SurvivorConfig | null {
  for (const id of SURVIVOR_ORDER) {
    if (SURVIVOR_CONFIGS[id].unlockLevel > commanderLevel) {
      return SURVIVOR_CONFIGS[id];
    }
  }
  return null;
}

export const TACTICAL_ITEM_CONFIGS: Record<TacticalItemType, TacticalItemConfig> = {
  blue_barrel: {
    id: 'blue_barrel',
    name: 'Barril Azul',
    rageCost: 6,
    prepTime: 6.0,
    radius: 32,
    impactDamage: 45,
    obstacleHp: 55,
    explodesOnBreak: false,
    description: 'Aplasta al caer (45 daño) y bloquea el paso con 55 HP de acero.',
    hotkey: 'Q',
  },
  red_barrel: {
    id: 'red_barrel',
    name: 'Barril Rojo Explosivo',
    rageCost: 12,
    prepTime: 8.5,
    radius: 46,
    impactDamage: 55,
    obstacleHp: 36,
    explodesOnBreak: true,
    description: 'Explota al tocarlo o romperse (75 AoE), incendiando el asfalto y calcinando cadáveres.',
    hotkey: 'W',
  },
  medkit: {
    id: 'medkit',
    name: 'Botiquín Táctico',
    rageCost: 14,
    prepTime: 10.0,
    radius: 50,
    impactDamage: 0,
    obstacleHp: 0,
    explodesOnBreak: false,
    healsPerSec: 12,
    duration: 7.0,
    description: 'Despliega un campo médico esmeralda durante 7s que cura +12 HP/s a tus tropas.',
    hotkey: 'E',
  },
};

export const ZOMBIE_CONFIGS: Record<ZombieType, ZombieConfig> = {
  walker: {
    id: 'walker',
    name: 'Zombie Caminante',
    baseHp: 56,
    baseDamage: 13,
    speed: 25,
    attackRange: 19,
    attackCooldown: 0.95,
    rageReward: 4,
    courageDropChance: 0.24,
    critChance: 0.12,
    critMultiplier: 1.5,
    description: 'Infectado voraz que avanza en manada y presiona las líneas frontales.',
  },
  runner: {
    id: 'runner',
    name: 'Fast Zombie (Corredor)',
    baseHp: 44,
    baseDamage: 15,
    speed: 62,
    attackRange: 19,
    attackCooldown: 0.65,
    rageReward: 6,
    courageDropChance: 0.25,
    critChance: 0.2,
    critMultiplier: 1.65,
    description: 'Esprinta a toda velocidad directo hacia tus tiradores y el autobús de Bill.',
  },
  crit_zombie: {
    id: 'crit_zombie',
    name: 'Feral Berserker (Aura Roja)',
    baseHp: 84,
    baseDamage: 20,
    speed: 37,
    attackRange: 21,
    attackCooldown: 0.9,
    rageReward: 7,
    courageDropChance: 0.3,
    critChance: 0.4,
    critMultiplier: 1.85,
    description: 'Rodeado de un aura carmesí; telegrafía sus golpes críticos devastadores.',
  },
  armored: {
    id: 'armored',
    name: 'Armored Zombie',
    baseHp: 140,
    baseDamage: 19,
    speed: 21,
    attackRange: 21,
    attackCooldown: 1.08,
    rageReward: 9,
    courageDropChance: 0.35,
    critChance: 0.16,
    critMultiplier: 1.55,
    bulletResist: 0.6,
    description: 'Blindado con casco SWAT; resiste el 60% de balas normales (vulnerable a fuego y sniper).',
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton (Subterráneo)',
    baseHp: 36,
    baseDamage: 14,
    speed: 44,
    attackRange: 18,
    attackCooldown: 0.75,
    rageReward: 4,
    courageDropChance: 0.18,
    critChance: 0.14,
    critMultiplier: 1.5,
    emergesFromGround: true,
    description: 'Brota bajo tierra detrás de tus tiradores para emboscar tu retaguardia.',
  },
  bloated: {
    id: 'bloated',
    name: 'Fat Paramedic Explosivo',
    baseHp: 200,
    baseDamage: 26,
    speed: 17,
    attackRange: 23,
    attackCooldown: 1.25,
    rageReward: 12,
    courageDropChance: 0.5,
    critChance: 0.2,
    critMultiplier: 1.7,
    explodesOnDeath: true,
    description: 'Coloso explosivo: si lo detonas de lejos, su explosión también arrasa a los zombis cercanos.',
  },
};

export const MISSION_NODES: MissionNode[] = [
  // =========================================================================
  // SECTOR 1 (MISIONES 1..6): BOSQUE, COLINAS DEL NORTE Y PANTANO SUR
  // =========================================================================
  {
    id: 1,
    campaignTier: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'EASY',
    biome: 'forest_highway',
    barricadeHp: 540,
    fuelCost: 2,
    coinsReward: 95,
    supplyReward: 'Chatarra Militar',
    mapX: 4.5,
    mapY: 50,
    connectedTo: [2],
    waveInterval: 7.4,
    zombiePool: ['walker', 'walker', 'walker', 'runner'],
    skeletonAmbush: false,
    description: 'Ruta 14 bloqueada en el bosque. Despliega a tu Campesino, gana XP abatiendo infectados y abre paso al convoy.',
  },
  {
    id: 2,
    campaignTier: 2,
    name: 'Misión 2: Granja de los Miller',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'NORMAL',
    biome: 'farm_crossing',
    barricadeHp: 760,
    fuelCost: 2,
    coinsReward: 110,
    supplyReward: 'Caja de Herramientas',
    mapX: 8.4,
    mapY: 24,
    connectedTo: [3],
    waveInterval: 6.9,
    zombiePool: ['walker', 'walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'La carretera sube hacia las colinas del norte junto al granero rojo y el molino.',
  },
  {
    id: 3,
    campaignTier: 3,
    name: 'Misión 3: Cementerio Blackwater',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'NORMAL',
    biome: 'graveyard',
    barricadeHp: 920,
    fuelCost: 3,
    coinsReward: 145,
    supplyReward: 'Mira Telescópica',
    mapX: 12.3,
    mapY: 52,
    connectedTo: [4],
    waveInterval: 6.5,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'skeleton'],
    skeletonAmbush: true,
    description: 'Entre la niebla nocturna brotan esqueletos tras tus tiradores mientras la horda presiona.',
  },
  {
    id: 4,
    campaignTier: 4,
    name: 'Misión 4: Desguace Ruta 66',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1120,
    fuelCost: 3,
    coinsReward: 180,
    supplyReward: 'Placas de Kevlar',
    mapX: 16.2,
    mapY: 79,
    connectedTo: [5],
    waveInterval: 6.1,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Bajando hacia la ribera sur: policías infectados con chaleco SWAT custodian el desguace.',
  },
  {
    id: 5,
    campaignTier: 5,
    name: 'Misión 5: Refinería Texaco',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1320,
    fuelCost: 3,
    coinsReward: 215,
    supplyReward: 'Combustible Purificado',
    mapX: 20.1,
    mapY: 50,
    connectedTo: [6],
    waveInterval: 5.8,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: false,
    description: 'Paramédicos explosivos avanzan bajo las llamaradas de la refinería. ¡Detónalos de lejos!',
  },
  {
    id: 6,
    campaignTier: 6,
    name: 'Misión 6: Puente en Cuarentena',
    sector: 'Sector 1 — Bosque y Colinas (M1-M6)',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 1500,
    fuelCost: 4,
    coinsReward: 255,
    supplyReward: 'Trípode Gatling',
    mapX: 24.0,
    mapY: 20,
    connectedTo: [7],
    waveInterval: 5.5,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Viaducto elevado en el cañón norte. Usa tiradores y barriles rojos para sostener la línea.',
  },

  // =========================================================================
  // SECTOR 2 (MISIONES 7..12): CIUDAD MUERTA, COSTA Y LABORATORIO CERO
  // =========================================================================
  {
    id: 7,
    campaignTier: 7,
    name: 'Misión 7: Hospital General',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1720,
    fuelCost: 4,
    coinsReward: 295,
    supplyReward: 'Suero Experimental',
    mapX: 27.9,
    mapY: 50,
    connectedTo: [8],
    waveInterval: 5.3,
    zombiePool: ['runner', 'bloated', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Epicentro de paramédicos explosivos. Aprovecha sus explosiones en cadena contra la horda.',
  },
  {
    id: 8,
    campaignTier: 8,
    name: 'Misión 8: Comisaría Central',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 1950,
    fuelCost: 4,
    coinsReward: 345,
    supplyReward: 'Munición Perforante',
    mapX: 31.8,
    mapY: 80,
    connectedTo: [9],
    waveInterval: 5.1,
    zombiePool: ['armored', 'armored', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'En el distrito sur: escuadrones SWAT infectados con blindaje pesado bloquean la avenida.',
  },
  {
    id: 9,
    campaignTier: 9,
    name: 'Misión 9: Estación de Metro',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 2150,
    fuelCost: 4,
    coinsReward: 395,
    supplyReward: 'Batería de Litio MQ-9',
    mapX: 35.7,
    mapY: 52,
    connectedTo: [10],
    waveInterval: 4.9,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'bloated', 'armored'],
    skeletonAmbush: true,
    description: 'Emboscadas subterráneas bajo la niebla nocturna mientras oleadas rápidas presionan el frente.',
  },
  {
    id: 10,
    campaignTier: 10,
    name: 'Misión 10: Búnker del Ejército',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 2450,
    fuelCost: 5,
    coinsReward: 460,
    supplyReward: 'Armadura Juggernaut',
    mapX: 39.6,
    mapY: 19,
    connectedTo: [11],
    waveInterval: 4.8,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner'],
    skeletonAmbush: true,
    description: 'Fortificación militar en la cresta norte. Combina Juggernaut, Torreta, Pyro y Botiquines.',
  },
  {
    id: 11,
    campaignTier: 11,
    name: 'Misión 11: Aeródromo Infectado',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2800,
    fuelCost: 5,
    coinsReward: 530,
    supplyReward: 'Núcleo de Titanio',
    mapX: 43.5,
    mapY: 50,
    connectedTo: [12],
    waveInterval: 4.65,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Pista de aterrizaje invadida por escuadrones veloces y colosos explosivos.',
  },
  {
    id: 12,
    campaignTier: 11,
    name: 'Misión 12: Laboratorio Cero',
    sector: 'Sector 2 — Ciudad Muerta (M7-M12)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2950,
    fuelCost: 5,
    coinsReward: 600,
    supplyReward: 'Vacuna Alfa',
    mapX: 47.4,
    mapY: 80,
    connectedTo: [13],
    waveInterval: 4.6,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Complejo bioquímico costero al sur. Superarlo abre el paso hacia las Tierras Salvajes del Este.',
  },

  // =========================================================================
  // SECTOR 3 (MISIONES 13..18): CORDILLERA NEVADA, PRESA Y PANTANO BAYOU
  // =========================================================================
  {
    id: 13,
    campaignTier: 9,
    name: 'Misión 13: Aserradero Alpino',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 2250,
    fuelCost: 4,
    coinsReward: 480,
    supplyReward: 'Madera Blindada',
    mapX: 51.4,
    mapY: 48,
    connectedTo: [14],
    waveInterval: 4.85,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'armored'],
    skeletonAmbush: false,
    description: 'Cruzando el primer gran río hacia el este: leñadores infectados bloquean el valle maderero.',
  },
  {
    id: 14,
    campaignTier: 9,
    name: 'Misión 14: Mirador Pico Nevado',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 2400,
    fuelCost: 4,
    coinsReward: 510,
    supplyReward: 'Mira Óptica Térmica',
    mapX: 55.4,
    mapY: 18,
    connectedTo: [15],
    waveInterval: 4.8,
    zombiePool: ['runner', 'crit_zombie', 'armored'],
    skeletonAmbush: false,
    description: 'Cumbre helada en el extremo norte del mapa. Oleadas veloces descienden por la ladera.',
  },
  {
    id: 15,
    campaignTier: 10,
    name: 'Misión 15: Mina de Plata',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2550,
    fuelCost: 4,
    coinsReward: 545,
    supplyReward: 'Dinamita Industrial',
    mapX: 59.4,
    mapY: 49,
    connectedTo: [16],
    waveInterval: 4.75,
    zombiePool: ['runner', 'armored', 'skeleton', 'crit_zombie'],
    skeletonAmbush: true,
    description: 'Cantera minera central donde mineros acorazados y esqueletos emergen de las galerías.',
  },
  {
    id: 16,
    campaignTier: 10,
    name: 'Misión 16: Ciénaga Caimán',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 2700,
    fuelCost: 4,
    coinsReward: 580,
    supplyReward: 'Botiquín Avanzado',
    mapX: 63.4,
    mapY: 81,
    connectedTo: [17],
    waveInterval: 4.7,
    zombiePool: ['runner', 'bloated', 'skeleton', 'crit_zombie'],
    skeletonAmbush: true,
    description: 'Pantanos profundos del sur. Vigila la retaguardia mientras detonas a los colosos del barro.',
  },
  {
    id: 17,
    campaignTier: 11,
    name: 'Misión 17: Presa Hidroeléctrica',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 2850,
    fuelCost: 5,
    coinsReward: 615,
    supplyReward: 'Bobina de Alto Voltaje',
    mapX: 67.4,
    mapY: 48,
    connectedTo: [18],
    waveInterval: 4.65,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner'],
    skeletonAmbush: false,
    description: 'Paso estrecho sobre las compuertas del río con embestidas constantes de blindados.',
  },
  {
    id: 18,
    campaignTier: 11,
    name: 'Misión 18: Observatorio Norte',
    sector: 'Sector 3 — Sierra y Bayou (M13-M18)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 3000,
    fuelCost: 5,
    coinsReward: 650,
    supplyReward: 'Lente Láser Polina',
    mapX: 71.4,
    mapY: 18,
    connectedTo: [19],
    waveInterval: 4.6,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'armored'],
    skeletonAmbush: true,
    description: 'Cúpula astronómica en las montañas del norte bajo asedio nocturno total.',
  },

  // =========================================================================
  // SECTOR 4 (MISIONES 19..24): PUERTO SUR, RADAR ÁRTICO Y CIUDADELA OMEGA
  // =========================================================================
  {
    id: 19,
    campaignTier: 11,
    name: 'Misión 19: Prisión Estatal',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 3120,
    fuelCost: 5,
    coinsReward: 690,
    supplyReward: 'Escudo Antidisturbios',
    mapX: 75.4,
    mapY: 50,
    connectedTo: [20],
    waveInterval: 4.58,
    zombiePool: ['armored', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: false,
    description: 'Penitenciaría de máxima seguridad custodiada por pelotones SWAT infectados.',
  },
  {
    id: 20,
    campaignTier: 11,
    name: 'Misión 20: Puerto de Carga Sur',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3240,
    fuelCost: 5,
    coinsReward: 730,
    supplyReward: 'Acero Naval Soldado',
    mapX: 79.4,
    mapY: 82,
    connectedTo: [21],
    waveInterval: 4.55,
    zombiePool: ['armored', 'bloated', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Muelles de contenedores junto al mar del sur repletos de blindados y explosivos.',
  },
  {
    id: 21,
    campaignTier: 12,
    name: 'Misión 21: Túnel Subterráneo',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 3360,
    fuelCost: 5,
    coinsReward: 775,
    supplyReward: 'Munición 9mm Perforante',
    mapX: 83.5,
    mapY: 50,
    connectedTo: [22],
    waveInterval: 4.52,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'bloated', 'armored'],
    skeletonAmbush: true,
    description: 'Autopista fortificada donde emergen emboscadas sin descanso.',
  },
  {
    id: 22,
    campaignTier: 12,
    name: 'Misión 22: Radar Ártico Militar',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 3480,
    fuelCost: 5,
    coinsReward: 820,
    supplyReward: 'Telemetría Dron Táctico',
    mapX: 87.6,
    mapY: 19,
    connectedTo: [23],
    waveInterval: 4.5,
    zombiePool: ['armored', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Estación de radar en la cima helada del noreste con defensas pesadas.',
  },
  {
    id: 23,
    campaignTier: 12,
    name: 'Misión 23: Base Naval Infectada',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3620,
    fuelCost: 5,
    coinsReward: 880,
    supplyReward: 'Blindaje Naval Reactivo',
    mapX: 91.7,
    mapY: 78,
    connectedTo: [24],
    waveInterval: 4.48,
    zombiePool: ['bloated', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: true,
    description: 'Astillero militar costero en la bahía sur antes del asalto final.',
  },
  {
    id: 24,
    campaignTier: 12,
    name: 'Misión 24: Ciudadela Omega',
    sector: 'Sector 4 — Bastión Omega (M19-M24)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3850,
    fuelCost: 5,
    coinsReward: 1000,
    supplyReward: 'Cura Definitiva Omega',
    mapX: 95.8,
    mapY: 48,
    connectedTo: [],
    waveInterval: 4.45,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El reactor nuclear definitivo al final del continente. ¡Despliega todo tu escuadrón para ganar!',
  },
];

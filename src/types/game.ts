export type SurvivorType =
  | 'redneck'
  | 'farmer'
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
  name: string;
  sector: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';
  biome: BiomeType;
  barricadeHp: number;
  fuelCost: number;
  coinsReward: number;
  supplyReward: string;
  mapX: number; // Percentage 0..100 on the enlarged 1680x560 world map
  mapY: number; // Percentage 0..100 on the enlarged 1680x560 world map
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
  2: 155,  // Nv.2 -> Nv.3 (Builder)
  3: 200,  // Nv.3 -> Nv.4 (Mechanic)
  4: 250,  // Nv.4 -> Nv.5 (Perro K-9 Rex)
  5: 305,  // Nv.5 -> Nv.6 (Policeman Diaz)
  6: 365,  // Nv.6 -> Nv.7 (Sniper Polina)
  7: 430,  // Nv.7 -> Nv.8 (Pyro Lanzallamas)
  8: 500,  // Nv.8 -> Nv.9 (Torreta Gatling)
  9: 575,  // Nv.9 -> Nv.10 (Dron MQ-9)
  10: 655, // Nv.10 -> Nv.11 (Juggernaut)
  11: 750, // Nv.11 -> Nv.12 (Maestría de Comandante +10% Global)
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
  builder: {
    id: 'builder',
    name: 'Builder',
    roleTitle: 'Demoledor Blindado',
    unlockLevel: 3,
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
    description: 'Desbloquea Nv.3: Casco y chaleco anticorte (-35% daño melee). Doble daño a la barricada.',
    quotes: ['¡A demoler!', '¡Casco puesto!', '¡Rompiendo chatarra!'],
    hotkey: '3',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic',
    roleTitle: 'Asesino & Reparador',
    unlockLevel: 4,
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
    description: 'Desbloquea Nv.4: Repara +30 HP del autobús al salir y su primer mazazo hace crítico x3.2.',
    quotes: ['¡Chasis reparado!', '¡Llave inglesa lista!', '¡Primer golpe!'],
    hotkey: '4',
  },
  hound: {
    id: 'hound',
    name: 'Perro K-9 Rex',
    roleTitle: 'Sabueso de Ataque',
    unlockLevel: 5,
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
    description: 'Desbloquea Nv.5: Perro militar ultrarrápido que caza corredores y jamás revive infectado.',
    quotes: ['¡Grrrr! ¡Guau!', '¡K-9 al ataque!'],
    hotkey: '5',
  },
  policeman: {
    id: 'policeman',
    name: 'Policeman Diaz',
    roleTitle: 'Escopetero Pesado',
    unlockLevel: 6,
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
    description: 'Desbloquea Nv.6: Tanque escopetero con 50% de defensa cuerpo a cuerpo y 4 cartuchos.',
    quotes: ['¡Alto ahí!', '¡Código 10-99!', '¡Ley y plomo!'],
    hotkey: '6',
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Polina',
    roleTitle: 'Francotiradora Élite',
    unlockLevel: 7,
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
    description: 'Desbloquea Nv.7: Disparo supersónico con guía láser que perfora el 75% del blindaje.',
    quotes: ['Un tiro, una baja.', 'Objetivo en la mira.', 'Sin escapatoria.'],
    hotkey: '7',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Pyro Lanzallamas',
    roleTitle: 'Incinerador Pesado',
    unlockLevel: 8,
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
    description: 'Desbloquea Nv.8: Rocia fuego continuo que derrite blindajes y calcina cadáveres infectados.',
    quotes: ['¡Fuego purificador!', '¡Que arda todo!', '¡Calor extremo!'],
    hotkey: '8',
  },
  turret: {
    id: 'turret',
    name: 'Torreta Gatling',
    roleTitle: 'Centinela Automática',
    unlockLevel: 9,
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
    description: 'Desbloquea Nv.9: Torreta trípode rotativa que barre la carretera expulsando casquillos.',
    quotes: ['[SISTEMA CENTINELA ACTIVO]', '[RÁFAGA AUTOMÁTICA]'],
    hotkey: '9',
  },
  drone: {
    id: 'drone',
    name: 'Dron MQ-9',
    roleTitle: 'Apoyo Aéreo Táctico',
    unlockLevel: 10,
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
    description: 'Desbloquea Nv.10: Dron militar volador inmune a zombis terrestres con foco y fuego aéreo.',
    quotes: ['[DRON EN VUELO]', '[OBJETIVO FIJADO]'],
    hotkey: '0',
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    roleTitle: 'Coloso Spec-Ops',
    unlockLevel: 11,
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
    description: 'Desbloquea Nv.11: Supersoldado acorazado (-45% daño melee) con mazo de choque sísmico.',
    quotes: ['¡Imparable!', '¡Blindaje máximo!', '¡Aplastando cráneos!'],
    hotkey: '-',
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
  // SECTOR 1: CONDADO BOSQUE SUR
  {
    id: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'EASY',
    biome: 'forest_highway',
    barricadeHp: 540,
    fuelCost: 2,
    coinsReward: 95,
    supplyReward: 'Chatarra Militar',
    mapX: 7,
    mapY: 64,
    waveInterval: 7.4,
    zombiePool: ['walker', 'walker', 'walker', 'runner'],
    skeletonAmbush: false,
    description: 'Ruta 14 bloqueada en el bosque. Despliega a tu Campesino, gana XP abatiendo infectados y desbloquea refuerzos en vivo.',
  },
  {
    id: 2,
    name: 'Misión 2: Granja de los Miller',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'NORMAL',
    biome: 'farm_crossing',
    barricadeHp: 760,
    fuelCost: 2,
    coinsReward: 110,
    supplyReward: 'Caja de Herramientas',
    mapX: 15,
    mapY: 42,
    waveInterval: 6.9,
    zombiePool: ['walker', 'walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Corredores infectados y los primeros Berserkers merodean junto al granero rojo y el molino.',
  },
  {
    id: 3,
    name: 'Misión 3: Cementerio Blackwater',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'NORMAL',
    biome: 'graveyard',
    barricadeHp: 920,
    fuelCost: 3,
    coinsReward: 145,
    supplyReward: 'Mira Telescópica',
    mapX: 24,
    mapY: 68,
    waveInterval: 6.5,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'skeleton'],
    skeletonAmbush: true,
    description: 'Entre la niebla nocturna brotan esqueletos tras tus tiradores mientras la horda presiona.',
  },
  // SECTOR 2: AUTOPISTA 66 & REFINERÍA
  {
    id: 4,
    name: 'Misión 4: Desguace Ruta 66',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1120,
    fuelCost: 3,
    coinsReward: 180,
    supplyReward: 'Placas de Kevlar',
    mapX: 34,
    mapY: 36,
    waveInterval: 6.1,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Policías infectados con chaleco SWAT custodian el desguace urbano.',
  },
  {
    id: 5,
    name: 'Misión 5: Refinería Texaco',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1320,
    fuelCost: 3,
    coinsReward: 215,
    supplyReward: 'Combustible Purificado',
    mapX: 43,
    mapY: 62,
    waveInterval: 5.8,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: false,
    description: 'Paramédicos explosivos avanzan bajo las llamaradas de la refinería. ¡Detónalos de lejos!',
  },
  {
    id: 6,
    name: 'Misión 6: Puente en Cuarentena',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 1500,
    fuelCost: 4,
    coinsReward: 255,
    supplyReward: 'Trípode Gatling',
    mapX: 52,
    mapY: 44,
    waveInterval: 5.5,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'El cordón militar del puente colapsó. Usa francotiradores y barriles rojos para sostener la línea.',
  },
  // SECTOR 3: CIUDAD MUERTA & SUBURBIOS
  {
    id: 7,
    name: 'Misión 7: Hospital General',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1720,
    fuelCost: 4,
    coinsReward: 295,
    supplyReward: 'Suero Experimental',
    mapX: 61,
    mapY: 70,
    waveInterval: 5.3,
    zombiePool: ['runner', 'bloated', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Epicentro de paramédicos explosivos. Aprovecha sus explosiones en cadena contra la horda.',
  },
  {
    id: 8,
    name: 'Misión 8: Comisaría Central',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 1950,
    fuelCost: 4,
    coinsReward: 345,
    supplyReward: 'Munición Perforante',
    mapX: 70,
    mapY: 34,
    waveInterval: 5.1,
    zombiePool: ['armored', 'armored', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Escuadrones SWAT infectados con blindaje pesado bloquean el cruce estatal.',
  },
  {
    id: 9,
    name: 'Misión 9: Estación de Metro',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 2150,
    fuelCost: 4,
    coinsReward: 395,
    supplyReward: 'Batería de Litio MQ-9',
    mapX: 77,
    mapY: 64,
    waveInterval: 4.9,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'bloated', 'armored'],
    skeletonAmbush: true,
    description: 'Emboscadas subterráneas bajo la niebla nocturna mientras oleadas rápidas presionan el frente.',
  },
  // SECTOR 4: BASE MILITAR & LABORATORIO CERO
  {
    id: 10,
    name: 'Misión 10: Búnker del Ejército',
    sector: 'Sector 4 — Zona Militar',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 2450,
    fuelCost: 5,
    coinsReward: 460,
    supplyReward: 'Armadura Juggernaut',
    mapX: 84,
    mapY: 32,
    waveInterval: 4.8,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner'],
    skeletonAmbush: true,
    description: 'Fortificación militar de acero reforzado. Combina Juggernaut, Torreta, Pyro y Botiquines.',
  },
  {
    id: 11,
    name: 'Misión 11: Aeródromo Infectado',
    sector: 'Sector 4 — Zona Militar',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2800,
    fuelCost: 5,
    coinsReward: 530,
    supplyReward: 'Núcleo de Titanio',
    mapX: 90,
    mapY: 68,
    waveInterval: 4.65,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Pista de aterrizaje invadida por escuadrones veloces y colosos explosivos.',
  },
  {
    id: 12,
    name: 'Misión 12: Laboratorio Cero',
    sector: 'Sector 4 — Zona Militar',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3250,
    fuelCost: 5,
    coinsReward: 720,
    supplyReward: 'Vacuna Omega',
    mapX: 95,
    mapY: 42,
    waveInterval: 4.5,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'La barricada final del Apocalipsis. Despliega todo tu arsenal táctico para triunfar.',
  },
];

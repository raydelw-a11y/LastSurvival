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
  name: string;
  sector: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';
  biome: BiomeType;
  barricadeHp: number;
  fuelCost: number;
  coinsReward: number;
  supplyReward: string;
  mapX: number; // Percentage 0..100 on the giant 2400x1480 world map
  mapY: number; // Percentage 0..100 on the giant 2400x1480 world map (North..South)
  connectedTo: number[]; // Connected highway mission IDs (North, Center & South branches)
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
  // SECTOR 1: CUMBRES DEL NORTE, VALLE BOSCOSO Y PANTANOS SUR (Misiones 1..6)
  // =========================================================================
  {
    id: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque y Cumbres',
    difficulty: 'EASY',
    biome: 'forest_highway',
    barricadeHp: 540,
    fuelCost: 2,
    coinsReward: 95,
    supplyReward: 'Chatarra Militar',
    mapX: 6,
    mapY: 52,
    connectedTo: [2, 3, 5],
    waveInterval: 7.4,
    zombiePool: ['walker', 'walker', 'walker', 'runner'],
    skeletonAmbush: false,
    description: 'Punto de partida en la Ruta 14. Al despejarla abrirás los desvíos hacia las Cumbres del Norte y el Pantano del Sur.',
  },
  {
    id: 2,
    name: 'Misión 2: Aserradero del Norte',
    sector: 'Sector 1 — Bosque Norte',
    difficulty: 'EASY',
    biome: 'forest_highway',
    barricadeHp: 650,
    fuelCost: 2,
    coinsReward: 105,
    supplyReward: 'Madera Reforzada',
    mapX: 12,
    mapY: 26,
    connectedTo: [4, 5],
    waveInterval: 7.1,
    zombiePool: ['walker', 'walker', 'runner'],
    skeletonAmbush: false,
    description: 'Subiendo hacia la cordillera norte: leñadores infectados custodian los camiones madereros abandonados.',
  },
  {
    id: 3,
    name: 'Misión 3: Ciénaga Caimán Sur',
    sector: 'Sector 1 — Pantano Sur',
    difficulty: 'NORMAL',
    biome: 'graveyard',
    barricadeHp: 720,
    fuelCost: 2,
    coinsReward: 115,
    supplyReward: 'Botiquín de Campo',
    mapX: 13,
    mapY: 77,
    connectedTo: [5, 6],
    waveInterval: 6.9,
    zombiePool: ['walker', 'walker', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Bajando hacia las tierras húmedas del sur: cadáveres sumergidos emergen del barro junto a la carretera.',
  },
  {
    id: 4,
    name: 'Misión 4: Mirador Pico Nevado',
    sector: 'Sector 1 — Cumbre Norte',
    difficulty: 'NORMAL',
    biome: 'forest_highway',
    barricadeHp: 820,
    fuelCost: 2,
    coinsReward: 130,
    supplyReward: 'Mira Óptica Ligera',
    mapX: 19,
    mapY: 13,
    connectedTo: [5, 8],
    waveInterval: 6.7,
    zombiePool: ['walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Puesto de guardabosques en lo más alto del norte. Corredores veloces bajan por la cuesta helada.',
  },
  {
    id: 5,
    name: 'Misión 5: Granja de los Miller',
    sector: 'Sector 1 — Valle Central',
    difficulty: 'NORMAL',
    biome: 'farm_crossing',
    barricadeHp: 880,
    fuelCost: 3,
    coinsReward: 140,
    supplyReward: 'Caja de Herramientas',
    mapX: 19,
    mapY: 51,
    connectedTo: [7],
    waveInterval: 6.5,
    zombiePool: ['walker', 'walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Cruce agrícola principal junto al granero rojo. Berserkers furiosos defienden el tractor volcado.',
  },
  {
    id: 6,
    name: 'Misión 6: Cementerio Blackwater',
    sector: 'Sector 1 — Costa Pantanosa Sur',
    difficulty: 'NORMAL',
    biome: 'graveyard',
    barricadeHp: 960,
    fuelCost: 3,
    coinsReward: 155,
    supplyReward: 'Munición 9mm Dual',
    mapX: 21,
    mapY: 86,
    connectedTo: [7, 9],
    waveInterval: 6.4,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'skeleton'],
    skeletonAmbush: true,
    description: 'Antiguo camposanto al extremo sur del condado. Protege la retaguardia frente a emboscadas subterráneas.',
  },

  // =========================================================================
  // SECTOR 2: CAÑÓN MINERO NORTE, RUTA 66 Y COSTA PETROLERA (Misiones 7..12)
  // =========================================================================
  {
    id: 7,
    name: 'Misión 7: Desguace Ruta 66',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'NORMAL',
    biome: 'junkyard_city',
    barricadeHp: 1080,
    fuelCost: 3,
    coinsReward: 175,
    supplyReward: 'Placas de Kevlar',
    mapX: 29,
    mapY: 50,
    connectedTo: [8, 9, 11],
    waveInterval: 6.2,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'armored'],
    skeletonAmbush: false,
    description: 'Entrada al desierto industrial. Aparecen los primeros guardias infectados con blindaje antibalas.',
  },
  {
    id: 8,
    name: 'Misión 8: Mina de Plata Norte',
    sector: 'Sector 2 — Cañón Norte',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1180,
    fuelCost: 3,
    coinsReward: 195,
    supplyReward: 'Dinamita Industrial',
    mapX: 35,
    mapY: 22,
    connectedTo: [10, 11],
    waveInterval: 6.0,
    zombiePool: ['walker', 'runner', 'armored', 'skeleton'],
    skeletonAmbush: true,
    description: 'Excavación minera en las montañas áridas del norte. Mineros blindados y esqueletos salen de los túneles.',
  },
  {
    id: 9,
    name: 'Misión 9: Muelle Pesquero Sur',
    sector: 'Sector 2 — Bahía Sur',
    difficulty: 'HARD',
    biome: 'farm_crossing',
    barricadeHp: 1240,
    fuelCost: 3,
    coinsReward: 210,
    supplyReward: 'Bidón deDiésel Puro',
    mapX: 36,
    mapY: 79,
    connectedTo: [11, 12],
    waveInterval: 5.9,
    zombiePool: ['runner', 'crit_zombie', 'bloated'],
    skeletonAmbush: false,
    description: 'Embarcadero costero al sur. Los primeros infectados explosivos avanzan entre redes y almacenes.',
  },
  {
    id: 10,
    name: 'Misión 10: Presa Hidroeléctrica',
    sector: 'Sector 2 — Garganta Norte',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 1340,
    fuelCost: 3,
    coinsReward: 230,
    supplyReward: 'Bobina de Alto Voltaje',
    mapX: 43,
    mapY: 13,
    connectedTo: [11, 14],
    waveInterval: 5.8,
    zombiePool: ['runner', 'crit_zombie', 'armored'],
    skeletonAmbush: false,
    description: 'Coronación de la gran presa norte sobre el río. Carretera estrecha con fuerte presión de blindados.',
  },
  {
    id: 11,
    name: 'Misión 11: Refinería Texaco',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1420,
    fuelCost: 4,
    coinsReward: 245,
    supplyReward: 'Combustible Purificado',
    mapX: 42,
    mapY: 51,
    connectedTo: [13],
    waveInterval: 5.7,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: false,
    description: 'Complejo petrolero central en llamas. Detona a los colosos explosivos lejos de tus líneas.',
  },
  {
    id: 12,
    name: 'Misión 12: Terminal Petrolera Sur',
    sector: 'Sector 2 — Costa Petrolera',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1500,
    fuelCost: 4,
    coinsReward: 265,
    supplyReward: 'Tanque Presurizado Pyro',
    mapX: 45,
    mapY: 87,
    connectedTo: [13, 15],
    waveInterval: 5.6,
    zombiePool: ['runner', 'bloated', 'armored', 'skeleton'],
    skeletonAmbush: true,
    description: 'Oleoducto marítimo del sur. Usa fuego y barriles explosivos para contener la marea tóxica.',
  },

  // =========================================================================
  // SECTOR 3: SIERRA NORTE, CIUDAD MUERTA Y PUERTO SUR (Misiones 13..18)
  // =========================================================================
  {
    id: 13,
    name: 'Misión 13: Puente en Cuarentena',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 1620,
    fuelCost: 4,
    coinsReward: 285,
    supplyReward: 'Trípode Gatling',
    mapX: 52,
    mapY: 50,
    connectedTo: [14, 15, 17],
    waveInterval: 5.4,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Viaducto principal hacia la metrópoli en cuarentena. Rompe el bloqueo militar para entrar en la ciudad.',
  },
  {
    id: 14,
    name: 'Misión 14: Observatorio Norte',
    sector: 'Sector 3 — Colinas Norte',
    difficulty: 'HARD',
    biome: 'graveyard',
    barricadeHp: 1740,
    fuelCost: 4,
    coinsReward: 310,
    supplyReward: 'Lente Láser Polina',
    mapX: 59,
    mapY: 16,
    connectedTo: [16, 17],
    waveInterval: 5.3,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'armored'],
    skeletonAmbush: true,
    description: 'Cúpula astronómica en las cumbres sobre la ciudad. Noche cerrada con ataques relámpago.',
  },
  {
    id: 15,
    name: 'Misión 15: Puerto de Contenedores',
    sector: 'Sector 3 — Muelle Industrial Sur',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1850,
    fuelCost: 4,
    coinsReward: 330,
    supplyReward: 'Acero Naval Soldado',
    mapX: 59,
    mapY: 83,
    connectedTo: [17, 18],
    waveInterval: 5.2,
    zombiePool: ['armored', 'bloated', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Laberinto de grúas y contenedores al sur de la urbe infestado de blindados portuarios.',
  },
  {
    id: 16,
    name: 'Misión 16: Prisión Estatal Norte',
    sector: 'Sector 3 — Penal Blindado Norte',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 1980,
    fuelCost: 4,
    coinsReward: 360,
    supplyReward: 'Escudo Antidisturbios',
    mapX: 67,
    mapY: 22,
    connectedTo: [17, 20],
    waveInterval: 5.1,
    zombiePool: ['armored', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: false,
    description: 'Penitenciaría de máxima seguridad al norte. Guardias SWAT infectados forman un muro acorazado.',
  },
  {
    id: 17,
    name: 'Misión 17: Hospital General',
    sector: 'Sector 3 — Centro Urbano',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2100,
    fuelCost: 4,
    coinsReward: 390,
    supplyReward: 'Suero Experimental',
    mapX: 65,
    mapY: 51,
    connectedTo: [19],
    waveInterval: 5.0,
    zombiePool: ['runner', 'bloated', 'bloated', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Zona cero médica en el corazón de Ciudad Muerta. Cadena de explosiones biológicas asegurada.',
  },
  {
    id: 18,
    name: 'Misión 18: Estación Metro Sur',
    sector: 'Sector 3 — Línea Costera Sur',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 2220,
    fuelCost: 4,
    coinsReward: 420,
    supplyReward: 'Batería de Litio MQ-9',
    mapX: 68,
    mapY: 86,
    connectedTo: [19, 21],
    waveInterval: 4.9,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'bloated', 'armored'],
    skeletonAmbush: true,
    description: 'Boca de metro inundada junto a la bahía sur. Hordas mixtas emergen desde las vías oscuras.',
  },

  // =========================================================================
  // SECTOR 4: CORDILLERA ÁRTICA, BASE NAVAL Y LABORATORIO CERO (Misiones 19..24)
  // =========================================================================
  {
    id: 19,
    name: 'Misión 19: Comisaría Blindada',
    sector: 'Sector 4 — Perímetro Militar',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 2380,
    fuelCost: 5,
    coinsReward: 455,
    supplyReward: 'Munición Perforante',
    mapX: 75,
    mapY: 50,
    connectedTo: [20, 21, 22, 23],
    waveInterval: 4.85,
    zombiePool: ['armored', 'armored', 'runner', 'crit_zombie'],
    skeletonAmbush: true,
    description: 'Cabeza de puente tras cruzar el segundo río hacia la Zona Militar restringida.',
  },
  {
    id: 20,
    name: 'Misión 20: Radar Ártico Norte',
    sector: 'Sector 4 — Cordillera Militar Norte',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 2540,
    fuelCost: 5,
    coinsReward: 495,
    supplyReward: ' Telemetría Dron Táctico',
    mapX: 82,
    mapY: 14,
    connectedTo: [22, 24],
    waveInterval: 4.75,
    zombiePool: ['armored', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Antenas de alerta temprana en la cresta norte. Resiste embestidas implacables bajo el frío extremo.',
  },
  {
    id: 21,
    name: 'Misión 21: Base Naval Infectada',
    sector: 'Sector 4 — Astillero Militar Sur',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2680,
    fuelCost: 5,
    coinsReward: 530,
    supplyReward: 'Blindaje Naval Reactivo',
    mapX: 82,
    mapY: 86,
    connectedTo: [23, 24],
    waveInterval: 4.7,
    zombiePool: ['bloated', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: false,
    description: 'Astillero de submarinos en el extremo sur del mapa. Colosos explosivos y blindados custodian el muelle.',
  },
  {
    id: 22,
    name: 'Misión 22: Búnker del Ejército',
    sector: 'Sector 4 — Fuerte Interior Norte',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 2850,
    fuelCost: 5,
    coinsReward: 575,
    supplyReward: 'Armadura Juggernaut',
    mapX: 87,
    mapY: 36,
    connectedTo: [24],
    waveInterval: 4.65,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner'],
    skeletonAmbush: true,
    description: 'Fortificación subterránea de hormigón armado antes del complejo nuclear.',
  },
  {
    id: 23,
    name: 'Misión 23: Aeródromo Militar',
    sector: 'Sector 4 — Pista Táctica Sur',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3020,
    fuelCost: 5,
    coinsReward: 625,
    supplyReward: 'Núcleo de Titanio',
    mapX: 88,
    mapY: 65,
    connectedTo: [24],
    waveInterval: 4.58,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Pista de evacuación aérea colapsada. Combina torretas, drones, fuego y pesos pesados.',
  },
  {
    id: 24,
    name: 'Misión 24: Laboratorio Cero',
    sector: 'Sector 4 — Reactor Omega',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3350,
    fuelCost: 5,
    coinsReward: 800,
    supplyReward: 'Vacuna Omega',
    mapX: 95,
    mapY: 50,
    connectedTo: [],
    waveInterval: 4.5,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El bastión final donde convergen las rutas del Norte, Centro y Sur. ¡Destruye la barricada Omega!',
  },
];

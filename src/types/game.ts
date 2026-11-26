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
  | 'juggernaut'
  | 'tesla'
  | 'barricade'
  | 'watchtower';

export type TacticalItemType = 'blue_barrel' | 'red_barrel' | 'medkit';
export type ZombieType =
  | 'walker'
  | 'runner'
  | 'crit_zombie'
  | 'armored'
  | 'skeleton'
  | 'bloated'
  | 'zombie_dog'
  | 'flyer'
  | 'acid_spitter';
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
  chainTargets?: number; // Tesla Coil: lightning jumps to this many zombies per discharge
  chainRange?: number; // Tesla Coil: max jump distance between chained zombies
  chainFalloff?: number; // Tesla Coil: damage multiplier applied on every extra jump
  stunTime?: number; // Tesla Coil: seconds each shocked zombie loses before its next attack
  /** Player picks where to install it on the road (Turret, Tesla Coil, Barricade, Watchtower). */
  placeable?: boolean;
  /** Non-attacking support structure (Barricade, Watchtower): listed in its own group. */
  isSupport?: boolean;
  /** Barricade: becomes a sandbag wall that blocks ground zombies instead of a unit. */
  isBarrier?: boolean;
  /** Watchtower: the nearest walking ranged unit climbs in and fires from it. */
  isTower?: boolean;
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
  /** Hovers in the air: flies over barricades/barrels and only ranged attacks can hit it. */
  isFlying?: boolean;
  /** Lobs acid from range; the splash leaves a burning puddle on the road. */
  spitsAcid?: boolean;
  /** Spawns together with this many extra copies (zombie dog packs). */
  packSize?: number;
  description: string;
}

export interface MissionNode {
  id: number;
  campaignTier: number; // Difficulty tier 1..20 matching sector progression (M1..M50)
  name: string;
  sector: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';
  biome: BiomeType;
  barricadeHp: number;
  fuelCost: number;
  coinsReward: number;
  supplyReward: string;
  mapX: number; // Percentage of the original 2800px map width (values >100 extend further east)
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
  /** Mission to resume ("Continuar"): last one launched, or the next one after a victory. Synced across devices. */
  lastPlayedMission?: number;
  /** Epoch ms when lastPlayedMission was set; the most recent device wins on sync. */
  lastPlayedAt?: number;
}

export const MAX_COMMANDER_LEVEL = 13;
/** Commander Mastery (+10% damage & HP to the whole squad) kicks in at this level. */
export const MASTERY_LEVEL = 12;

// ---- Upgrade economy (shared by the map UI and App handlers) -----------------
export const getUnitUpgradeCost = (level: number) => level * 35;
export const BUS_STAT_COSTS = { hp: 75, bill: 80, bumper: 110, armor: 125 } as const;

/** How many unit levels the player can buy right now with `coins` (costs rise each level). */
export function getMaxUnitUpgrades(level: number, coins: number): { levels: number; total: number } {
  let lvl = level;
  let total = 0;
  while (total + getUnitUpgradeCost(lvl) <= coins) {
    total += getUnitUpgradeCost(lvl);
    lvl++;
  }
  return { levels: lvl - level, total };
}

/** How many times a repeatable bus upgrade (chassis / Bill's rifle) can be bought with `coins`. */
export function getMaxBusUpgrades(kind: 'hp' | 'bill', coins: number): { times: number; total: number } {
  const times = Math.floor(coins / BUS_STAT_COSTS[kind]);
  return { times, total: times * BUS_STAT_COSTS[kind] };
}

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
  'tesla',
  'barricade',
  'watchtower',
];

/** The active squad has no size cap: any number of unlocked units can be equipped. */
export const MAX_EQUIPPED_DECK = SURVIVOR_ORDER.length;

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
  tesla: 'Tesla',
  barricade: 'Barricada',
  watchtower: 'Torre',
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
  12: 820, // Nv.12 -> Nv.13 (Bobina Tesla)
};

export function getXpForNextLevel(level: number): number {
  if (level >= MAX_COMMANDER_LEVEL) return XP_THRESHOLDS[MAX_COMMANDER_LEVEL - 1];
  return XP_THRESHOLDS[level] ?? 750;
}

export const ZOMBIE_XP_REWARD: Record<ZombieType, number> = {
  walker: 8,
  skeleton: 9,
  runner: 12,
  crit_zombie: 15,
  armored: 20,
  bloated: 24,
  zombie_dog: 10,
  flyer: 16,
  acid_spitter: 18,
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
    placeable: true,
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
  tesla: {
    id: 'tesla',
    name: 'Bobina Tesla',
    roleTitle: 'Torre de Arco Eléctrico',
    unlockLevel: 13,
    cost: 30,
    prepTime: 14.0,
    baseHp: 96,
    baseDamage: 15,
    fortune: 30,
    speed: 0,
    attackRange: 175,
    attackCooldown: 1.1,
    isRanged: true,
    pellets: 1,
    magSize: 6,
    reloadTime: 2.4,
    knockback: 3,
    bulletResist: 0.6,
    meleeResist: 0.3,
    armorPiercing: 0.6,
    isStationary: true,
    placeable: true,
    chainTargets: 4,
    chainRange: 78,
    chainFalloff: 0.75,
    stunTime: 0.35,
    description:
      'Desbloquea Nv.13: Bobina eléctrica que instalas donde quieras. Su rayo salta entre 4 zombis, perfora blindaje y los aturde.',
    quotes: ['[ALTO VOLTAJE]', '[ARCO ELÉCTRICO CARGADO]'],
    hotkey: 'T',
  },
  barricade: {
    id: 'barricade',
    name: 'Barricada de Sacos',
    roleTitle: 'Muro de Contención',
    unlockLevel: 1,
    cost: 15,
    prepTime: 10.0,
    baseHp: 330,
    baseDamage: 0,
    fortune: 0,
    speed: 0,
    attackRange: 0,
    attackCooldown: 1,
    isRanged: false,
    knockback: 0,
    isStationary: true,
    placeable: true,
    isSupport: true,
    isBarrier: true,
    description:
      'Muro de sacos de arena que instalas donde quieras: los zombis de tierra deben romperlo para pasar. Tus unidades lo cruzan y disparan por encima.',
    quotes: [],
    hotkey: 'B',
  },
  watchtower: {
    id: 'watchtower',
    name: 'Torre de Vigilancia',
    roleTitle: 'Puesto de Tirador',
    unlockLevel: 2,
    cost: 20,
    prepTime: 12.0,
    baseHp: 210,
    baseDamage: 0,
    fortune: 0,
    speed: 0,
    attackRange: 0,
    attackCooldown: 1,
    isRanged: false,
    knockback: 0,
    meleeResist: 0.2,
    isStationary: true,
    placeable: true,
    isSupport: true,
    isTower: true,
    description:
      'Torre que instalas donde quieras. Aparece vacía: la unidad a distancia más cercana sube y dispara desde arriba con +35% de alcance, a salvo de los golpes.',
    quotes: [],
    hotkey: 'V',
  },
};

/** Damage a unit deals per attack at a given upgrade level (shotgun pellets count together). */
export function getUnitDamagePerAttack(type: SurvivorType, level = 1): number {
  const cfg = SURVIVOR_CONFIGS[type];
  return Math.round(cfg.baseDamage * (cfg.pellets ?? 1) * (1 + (Math.max(1, level) - 1) * 0.14));
}

/**
 * Display order everywhere (map squad panel + battle bar): melee first, then ranged,
 * then support structures; each group from highest to lowest damage per attack
 * (structures by toughness) at the player's current levels.
 */
export function sortUnitsByRoleAndDamage(
  units: SurvivorType[],
  unitLevels: Partial<Record<SurvivorType, number>> = {}
): SurvivorType[] {
  return [...units].sort((a, b) => {
    const role = (t: SurvivorType) =>
      SURVIVOR_CONFIGS[t].isSupport ? 2 : SURVIVOR_CONFIGS[t].isRanged ? 1 : 0;
    const ra = role(a);
    const rb = role(b);
    if (ra !== rb) return ra - rb;
    const da = getUnitDamagePerAttack(a, unitLevels[a]);
    const db = getUnitDamagePerAttack(b, unitLevels[b]);
    if (db !== da) return db - da;
    return SURVIVOR_ORDER.indexOf(a) - SURVIVOR_ORDER.indexOf(b);
  });
}

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
  zombie_dog: {
    id: 'zombie_dog',
    name: 'Perro Zombi',
    baseHp: 40,
    baseDamage: 8,
    speed: 64,
    attackRange: 20,
    attackCooldown: 0.6,
    rageReward: 4,
    courageDropChance: 0.18,
    critChance: 0.14,
    critMultiplier: 1.5,
    packSize: 2,
    description: 'Caza en jauría de tres: rápido y frágil. Una barricada o una escopeta los frena en seco.',
  },
  flyer: {
    id: 'flyer',
    name: 'Zombi Alado',
    baseHp: 62,
    baseDamage: 11,
    speed: 34,
    attackRange: 24,
    attackCooldown: 1.0,
    rageReward: 8,
    courageDropChance: 0.35,
    critChance: 0.15,
    critMultiplier: 1.6,
    isFlying: true,
    description: 'Vuela sobre barricadas y barriles. Solo las unidades a distancia, las torres y Bill pueden derribarlo; también caza drones.',
  },
  acid_spitter: {
    id: 'acid_spitter',
    name: 'Escupidor de Ácido',
    baseHp: 95,
    baseDamage: 14,
    speed: 15,
    attackRange: 135,
    attackCooldown: 2.7,
    rageReward: 9,
    courageDropChance: 0.4,
    critChance: 0.1,
    critMultiplier: 1.4,
    bulletResist: 0.1,
    spitsAcid: true,
    description: 'Lanza bolas de ácido desde lejos que dejan charcos corrosivos. Ataca primero o aléjate del charco.',
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
    connectedTo: [25],
    waveInterval: 4.45,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El reactor nuclear de Omega custodia la frontera oriental. Superarlo abre el paso al desierto del Sector 5.',
  },

  // =========================================================================
  // SECTOR 5 (MISIONES 25..30): DESIERTO, CAÑÓN ROJO Y CAMPO NUCLEAR
  // =========================================================================
  {
    id: 25,
    campaignTier: 12,
    name: 'Misión 25: Gasolinera del Desierto',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 3975,
    fuelCost: 5,
    coinsReward: 1045,
    supplyReward: 'Bidones de Nitro',
    mapX: 99.8,
    mapY: 20,
    connectedTo: [26],
    waveInterval: 4.43,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'walker'],
    skeletonAmbush: false,
    description: 'Más allá de Omega empieza el desierto. Infectados deshidratados saquean la última gasolinera.',
  },
  {
    id: 26,
    campaignTier: 12,
    name: 'Misión 26: Cañón Rojo',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 4100,
    fuelCost: 5,
    coinsReward: 1090,
    supplyReward: 'Cuerda de Rapel',
    mapX: 103.8,
    mapY: 50,
    connectedTo: [27],
    waveInterval: 4.41,
    zombiePool: ['runner', 'runner', 'crit_zombie', 'bloated'],
    skeletonAmbush: false,
    description: 'Desfiladero estrecho de roca roja: las hordas veloces bajan en avalancha por las paredes.',
  },
  {
    id: 27,
    campaignTier: 13,
    name: 'Misión 27: Base Aérea Abandonada',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 4225,
    fuelCost: 5,
    coinsReward: 1135,
    supplyReward: 'Motor de Turbina',
    mapX: 107.8,
    mapY: 80,
    connectedTo: [28],
    waveInterval: 4.39,
    zombiePool: ['armored', 'crit_zombie', 'runner', 'bloated'],
    skeletonAmbush: true,
    description: 'Hangares oxidados repletos de pilotos acorazados. Mantén la línea entre los cazas varados.',
  },
  {
    id: 28,
    campaignTier: 13,
    name: 'Misión 28: Pueblo Fantasma',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 4350,
    fuelCost: 5,
    coinsReward: 1180,
    supplyReward: 'Revólver del Sheriff',
    mapX: 111.8,
    mapY: 50,
    connectedTo: [29],
    waveInterval: 4.37,
    zombiePool: ['skeleton', 'runner', 'crit_zombie', 'walker'],
    skeletonAmbush: true,
    description: 'Saloon y capilla en ruinas donde los esqueletos brotan bajo la arena al caer la noche.',
  },
  {
    id: 29,
    campaignTier: 13,
    name: 'Misión 29: Campo de Pruebas Nucleares',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 4475,
    fuelCost: 5,
    coinsReward: 1225,
    supplyReward: 'Traje Antirradiación',
    mapX: 115.8,
    mapY: 20,
    connectedTo: [30],
    waveInterval: 4.35,
    zombiePool: ['bloated', 'bloated', 'armored', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Cráteres radiactivos con colosos hinchados de radiación. ¡Detónalos lejos de tu escuadrón!',
  },
  {
    id: 30,
    campaignTier: 14,
    name: 'Misión 30: Presa del Cañón Seco',
    sector: 'Sector 5 — Desierto y Cañón Rojo (M25-M30)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 4600,
    fuelCost: 5,
    coinsReward: 1270,
    supplyReward: 'Turbina Hidráulica',
    mapX: 119.8,
    mapY: 50,
    connectedTo: [31],
    waveInterval: 4.33,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'La presa seca guarda la entrada a la megalópolis. Rompe la barricada del coronamiento.',
  },

  // =========================================================================
  // SECTOR 6 (MISIONES 31..36): MEGALÓPOLIS CAÍDA Y RASCACIELOS ZENITH
  // =========================================================================
  {
    id: 31,
    campaignTier: 14,
    name: 'Misión 31: Autopista Elevada',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 4725,
    fuelCost: 5,
    coinsReward: 1315,
    supplyReward: 'Placas de Asfalto',
    mapX: 123.8,
    mapY: 80,
    connectedTo: [32],
    waveInterval: 4.31,
    zombiePool: ['runner', 'armored', 'crit_zombie', 'bloated'],
    skeletonAmbush: false,
    description: 'Paso elevado colapsado lleno de coches calcinados y oleadas sin pausa.',
  },
  {
    id: 32,
    campaignTier: 14,
    name: 'Misión 32: Estadio Infectado',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 4850,
    fuelCost: 5,
    coinsReward: 1360,
    supplyReward: 'Megáfono Táctico',
    mapX: 127.8,
    mapY: 50,
    connectedTo: [33],
    waveInterval: 4.29,
    zombiePool: ['runner', 'runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: false,
    description: 'Miles de aficionados infectados llenan las gradas. La horda más numerosa hasta ahora.',
  },
  {
    id: 33,
    campaignTier: 15,
    name: 'Misión 33: Centro Comercial',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 4975,
    fuelCost: 5,
    coinsReward: 1405,
    supplyReward: 'Carrito Blindado',
    mapX: 131.8,
    mapY: 20,
    connectedTo: [34],
    waveInterval: 4.27,
    zombiePool: ['bloated', 'crit_zombie', 'runner', 'armored'],
    skeletonAmbush: true,
    description: 'Pasillos de tiendas saqueadas donde los esqueletos acechan entre los maniquíes.',
  },
  {
    id: 34,
    campaignTier: 15,
    name: 'Misión 34: Torre de Comunicaciones',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 5100,
    fuelCost: 5,
    coinsReward: 1450,
    supplyReward: 'Antena de Largo Alcance',
    mapX: 135.8,
    mapY: 50,
    connectedTo: [35],
    waveInterval: 4.25,
    zombiePool: ['armored', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: false,
    description: 'Recupera la torre para guiar al convoy a través del caos urbano.',
  },
  {
    id: 35,
    campaignTier: 15,
    name: 'Misión 35: Distrito Financiero',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 5225,
    fuelCost: 5,
    coinsReward: 1495,
    supplyReward: 'Bóveda de Titanio',
    mapX: 139.8,
    mapY: 80,
    connectedTo: [36],
    waveInterval: 4.23,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Rascacielos de cristal roto y ejecutivos acorazados custodiando la bóveda central.',
  },
  {
    id: 36,
    campaignTier: 16,
    name: 'Misión 36: Rascacielos Zenith',
    sector: 'Sector 6 — Megalópolis Caída (M31-M36)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 5350,
    fuelCost: 5,
    coinsReward: 1540,
    supplyReward: 'Núcleo de Ascensor',
    mapX: 143.8,
    mapY: 50,
    connectedTo: [37],
    waveInterval: 4.21,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'La torre más alta de la ciudad. Superarla abre la ruta hacia la tundra del norte.',
  },

  // =========================================================================
  // SECTOR 7 (MISIONES 37..42): GLACIAR, TUNDRA Y FORTALEZA DE HIELO
  // =========================================================================
  {
    id: 37,
    campaignTier: 16,
    name: 'Misión 37: Estación Polar Kappa',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 5475,
    fuelCost: 6,
    coinsReward: 1585,
    supplyReward: 'Generador Térmico',
    mapX: 147.8,
    mapY: 20,
    connectedTo: [38],
    waveInterval: 4.19,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'walker'],
    skeletonAmbush: false,
    description: 'Investigadores congelados despiertan en la base científica del polo.',
  },
  {
    id: 38,
    campaignTier: 16,
    name: 'Misión 38: Paso del Glaciar',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 5600,
    fuelCost: 6,
    coinsReward: 1630,
    supplyReward: 'Cadenas para Nieve',
    mapX: 151.8,
    mapY: 50,
    connectedTo: [39],
    waveInterval: 4.17,
    zombiePool: ['runner', 'runner', 'armored', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Carretera helada sobre grietas sin fondo con ventiscas y embestidas veloces.',
  },
  {
    id: 39,
    campaignTier: 17,
    name: 'Misión 39: Rompehielos Varado',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 5725,
    fuelCost: 6,
    coinsReward: 1675,
    supplyReward: 'Casco Reforzado',
    mapX: 155.8,
    mapY: 80,
    connectedTo: [40],
    waveInterval: 4.15,
    zombiePool: ['bloated', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: true,
    description: 'Un rompehielos atrapado en el hielo vomita tripulantes infectados por la cubierta.',
  },
  {
    id: 40,
    campaignTier: 17,
    name: 'Misión 40: Silos de Misiles',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 5850,
    fuelCost: 6,
    coinsReward: 1720,
    supplyReward: 'Ojiva Desactivada',
    mapX: 159.8,
    mapY: 50,
    connectedTo: [41],
    waveInterval: 4.13,
    zombiePool: ['armored', 'armored', 'bloated', 'crit_zombie', 'runner'],
    skeletonAmbush: true,
    description: 'Complejo militar subterráneo con escuadrones blindados y emboscadas desde los silos.',
  },
  {
    id: 41,
    campaignTier: 17,
    name: 'Misión 41: Laboratorio Criogénico',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 5975,
    fuelCost: 6,
    coinsReward: 1765,
    supplyReward: 'Cápsula Criogénica',
    mapX: 163.8,
    mapY: 20,
    connectedTo: [42],
    waveInterval: 4.11,
    zombiePool: ['skeleton', 'bloated', 'crit_zombie', 'armored', 'runner'],
    skeletonAmbush: true,
    description: 'Cámaras de congelación rotas liberan especímenes experimentales sin descanso.',
  },
  {
    id: 42,
    campaignTier: 18,
    name: 'Misión 42: Fortaleza de Hielo',
    sector: 'Sector 7 — Glaciar y Tundra (M37-M42)',
    difficulty: 'NIGHTMARE',
    biome: 'forest_highway',
    barricadeHp: 6100,
    fuelCost: 6,
    coinsReward: 1810,
    supplyReward: 'Corazón de Hielo',
    mapX: 167.8,
    mapY: 50,
    connectedTo: [43],
    waveInterval: 4.09,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Bastión helado al final de la tundra. Más allá solo queda la Zona Cero.',
  },

  // =========================================================================
  // SECTOR 8 (MISIONES 43..50): ZONA CERO Y NIDO DE LA REINA
  // =========================================================================
  {
    id: 43,
    campaignTier: 18,
    name: 'Misión 43: Puesto Fronterizo',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'farm_crossing',
    barricadeHp: 6225,
    fuelCost: 6,
    coinsReward: 1855,
    supplyReward: 'Pase de Cuarentena',
    mapX: 171.8,
    mapY: 80,
    connectedTo: [44],
    waveInterval: 4.07,
    zombiePool: ['armored', 'runner', 'crit_zombie', 'bloated'],
    skeletonAmbush: false,
    description: 'La última frontera militar antes del origen de la plaga, invadida por soldados infectados.',
  },
  {
    id: 44,
    campaignTier: 18,
    name: 'Misión 44: Planta Química',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 6350,
    fuelCost: 6,
    coinsReward: 1900,
    supplyReward: 'Neutralizador Tóxico',
    mapX: 175.8,
    mapY: 50,
    connectedTo: [45],
    waveInterval: 4.05,
    zombiePool: ['bloated', 'bloated', 'crit_zombie', 'armored', 'runner'],
    skeletonAmbush: true,
    description: 'Tanques tóxicos y colosos explosivos convierten la planta en un polvorín.',
  },
  {
    id: 45,
    campaignTier: 19,
    name: 'Misión 45: Central Nuclear Delta',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 6475,
    fuelCost: 6,
    coinsReward: 1945,
    supplyReward: 'Barras de Control',
    mapX: 179.8,
    mapY: 20,
    connectedTo: [46],
    waveInterval: 4.03,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El reactor Delta sigue activo. Resiste las oleadas mientras el núcleo ruge.',
  },
  {
    id: 46,
    campaignTier: 19,
    name: 'Misión 46: Cráter de Impacto',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 6600,
    fuelCost: 6,
    coinsReward: 1990,
    supplyReward: 'Fragmento del Meteorito',
    mapX: 183.8,
    mapY: 50,
    connectedTo: [47],
    waveInterval: 4.01,
    zombiePool: ['skeleton', 'skeleton', 'armored', 'crit_zombie', 'runner'],
    skeletonAmbush: true,
    description: 'El cráter donde cayó el meteorito: la tierra misma escupe esqueletos.',
  },
  {
    id: 47,
    campaignTier: 19,
    name: 'Misión 47: Colmena Infectada',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 6725,
    fuelCost: 6,
    coinsReward: 2035,
    supplyReward: 'Feromona Sintética',
    mapX: 187.8,
    mapY: 80,
    connectedTo: [48],
    waveInterval: 3.99,
    zombiePool: ['runner', 'runner', 'bloated', 'crit_zombie', 'armored', 'skeleton'],
    skeletonAmbush: true,
    description: 'Túneles orgánicos palpitantes. La horda se mueve como un solo organismo.',
  },
  {
    id: 48,
    campaignTier: 20,
    name: 'Misión 48: Puerta del Abismo',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 6850,
    fuelCost: 6,
    coinsReward: 2080,
    supplyReward: 'Llave del Abismo',
    mapX: 191.8,
    mapY: 50,
    connectedTo: [49],
    waveInterval: 3.97,
    zombiePool: ['armored', 'armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'Una barricada colosal sella la entrada al nido. Todo tu arsenal será necesario.',
  },
  {
    id: 49,
    campaignTier: 20,
    name: 'Misión 49: Nido de la Reina',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 6975,
    fuelCost: 6,
    coinsReward: 2125,
    supplyReward: 'Glándula de la Reina',
    mapX: 195.8,
    mapY: 20,
    connectedTo: [50],
    waveInterval: 3.95,
    zombiePool: ['armored', 'bloated', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El corazón de la colmena, custodiado por las élites más letales de la plaga.',
  },
  {
    id: 50,
    campaignTier: 20,
    name: 'Misión 50: Zona Cero: Origen',
    sector: 'Sector 8 — Zona Cero (M43-M50)',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 7100,
    fuelCost: 6,
    coinsReward: 2170,
    supplyReward: 'Cura Universal',
    mapX: 199.8,
    mapY: 50,
    connectedTo: [],
    waveInterval: 3.93,
    zombiePool: ['armored', 'armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'El origen de la infección. Gana aquí y la humanidad tendrá una segunda oportunidad.',
  },
];

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
  busLevel: number; // Commander / Bus Level (unlocks new units!)
  commanderXp: number;
  busHpBonus: number;
  billDamageBonus: number;
  spikedBumper: boolean;
  weldedArmor: boolean;
  unitLevels: Record<SurvivorType, number>;
  missionStars: Record<number, number>;
  unlockedMissions: number[];
  discoveredCaches: string[];
}

export const SURVIVOR_CONFIGS: Record<SurvivorType, SurvivorConfig> = {
  redneck: {
    id: 'redneck',
    name: 'Redneck',
    roleTitle: 'Campesino con Pala',
    unlockLevel: 1,
    cost: 15,
    prepTime: 4.0,
    baseHp: 34,
    baseDamage: 12,
    fortune: 25,
    speed: 55,
    attackRange: 22,
    attackCooldown: 0.82,
    isRanged: false,
    knockback: 8,
    infectedZombieType: 'runner',
    description: 'Despliegue rápido. Si muere, se levanta como un Fast Zombie corredor.',
    quotes: ['¡Por mi granja!', '¡Toma pala!', '¡Yee-haw!', '¡Atrás, podridos!'],
    hotkey: '1',
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    roleTitle: 'Granjero Escopetero',
    unlockLevel: 1,
    cost: 20,
    prepTime: 8.0,
    baseHp: 26,
    baseDamage: 7, // x4 perdigones = 28 daño en cono
    fortune: 28,
    speed: 26,
    attackRange: 130,
    attackCooldown: 1.45,
    isRanged: true,
    pellets: 4,
    magSize: 2,
    reloadTime: 2.4,
    knockback: 20,
    infectedZombieType: 'walker',
    description: 'Dispara 4 perdigones en cono con retroceso, pero recarga cada 2 tiros.',
    quotes: ['¡Fuera de mis tierras!', '¡Plomo para todos!', '¡A comer perdigones!'],
    hotkey: '2',
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    roleTitle: 'Demoledor Blindado',
    unlockLevel: 1,
    cost: 25,
    prepTime: 9.5,
    baseHp: 72,
    baseDamage: 16,
    fortune: 32,
    speed: 30,
    attackRange: 24,
    attackCooldown: 1.2,
    isRanged: false,
    knockback: 22,
    bulletResist: 0.5,
    barricadeMultiplier: 2.0,
    infectedZombieType: 'armored',
    description: 'Casco y chaleco resistente. Hace doble daño a la barricada.',
    quotes: ['¡A demoler!', '¡Casco puesto!', '¡Rompiendo chatarra!'],
    hotkey: '3',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic',
    roleTitle: 'Asesino & Reparador',
    unlockLevel: 1,
    cost: 20,
    prepTime: 7.0,
    baseHp: 36,
    baseDamage: 15,
    fortune: 40,
    speed: 58,
    attackRange: 22,
    attackCooldown: 0.85,
    isRanged: false,
    knockback: 26,
    repairsBusOnSpawn: 30,
    firstHitCritMultiplier: 2.8,
    barricadeMultiplier: 1.5,
    infectedZombieType: 'runner',
    description: 'Repara +30 HP del autobús al salir y su primer golpe con mazo hace crítico x2.8.',
    quotes: ['¡Chasis reparado!', '¡Llave inglesa lista!', '¡Primer golpe!'],
    hotkey: '4',
  },
  hound: {
    id: 'hound',
    name: 'Perro K-9 Rex',
    roleTitle: 'Sabueso de Ataque',
    unlockLevel: 2,
    cost: 12,
    prepTime: 3.4,
    baseHp: 30,
    baseDamage: 16,
    fortune: 48,
    speed: 86,
    attackRange: 20,
    attackCooldown: 0.52,
    isRanged: false,
    knockback: 12,
    isDog: true,
    description: 'Desbloquea Nv.2: Perro militar ultrarrápido que salta al cuello de los zombis y no revive como infectado.',
    quotes: ['¡Grrrr! ¡Guau!', '¡K-9 al ataque!'],
    hotkey: '5',
  },
  policeman: {
    id: 'policeman',
    name: 'Policeman Diaz',
    roleTitle: 'Escopetero Pesado',
    unlockLevel: 2,
    cost: 25,
    prepTime: 10.5,
    baseHp: 82,
    baseDamage: 8, // x4 perdigones
    fortune: 35,
    speed: 24,
    attackRange: 120,
    attackCooldown: 1.15,
    isRanged: true,
    pellets: 4,
    magSize: 4,
    reloadTime: 2.1,
    knockback: 18,
    bulletResist: 0.5,
    infectedZombieType: 'armored',
    description: 'Desbloquea Nv.2: Policía blindado con escopeta táctica de 4 cartuchos.',
    quotes: ['¡Alto ahí!', '¡Código 10-99!', '¡Ley y plomo!'],
    hotkey: '6',
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Polina',
    roleTitle: 'Francotiradora Élite',
    unlockLevel: 3,
    cost: 30,
    prepTime: 11.0,
    baseHp: 28,
    baseDamage: 68,
    fortune: 55,
    speed: 24,
    attackRange: 340,
    attackCooldown: 2.1,
    isRanged: true,
    pellets: 1,
    magSize: 5,
    reloadTime: 2.5,
    knockback: 28,
    armorPiercing: 0.75,
    infectedZombieType: 'walker',
    description: 'Desbloquea Nv.3: Dispara desde gran distancia con mira láser y perfora el 75% del blindaje zombi.',
    quotes: ['Un tiro, una baja.', 'Objetivo en la mira.', 'Sin escapatoria.'],
    hotkey: '7',
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Pyro Lanzallamas',
    roleTitle: 'Incinerador Pesado',
    unlockLevel: 4,
    cost: 30,
    prepTime: 11.5,
    baseHp: 64,
    baseDamage: 11,
    fortune: 40,
    speed: 28,
    attackRange: 92,
    attackCooldown: 0.35,
    isRanged: true,
    pellets: 2,
    magSize: 12,
    reloadTime: 2.4,
    knockback: 6,
    bulletResist: 0.4,
    isFlame: true,
    infectedZombieType: 'bloated',
    description: 'Desbloquea Nv.4: Rocia un cono de fuego continuo que quema hordas enteras y calcina cadáveres.',
    quotes: ['¡Fuego purificador!', '¡Que arda todo!', '¡Calor extremo!'],
    hotkey: '8',
  },
  turret: {
    id: 'turret',
    name: 'Torreta Gatling',
    roleTitle: 'Centinela Automática',
    unlockLevel: 5,
    cost: 25,
    prepTime: 12.0,
    baseHp: 95,
    baseDamage: 9,
    fortune: 35,
    speed: 0,
    attackRange: 235,
    attackCooldown: 0.24,
    isRanged: true,
    pellets: 1,
    magSize: 28,
    reloadTime: 2.2,
    knockback: 5,
    bulletResist: 0.7,
    isStationary: true,
    description: 'Desbloquea Nv.5: Torreta trípode con ametralladora rotativa que barre la carretera a alta cadencia.',
    quotes: ['[SISTEMA CENTINELA ACTIVO]', '[RÁFAGA AUTOMÁTICA]'],
    hotkey: '9',
  },
  drone: {
    id: 'drone',
    name: 'Dron MQ-9',
    roleTitle: 'Apoyo Aéreo Táctico',
    unlockLevel: 6,
    cost: 25,
    prepTime: 11.0,
    baseHp: 45,
    baseDamage: 14,
    fortune: 50,
    speed: 44,
    attackRange: 195,
    attackCooldown: 0.42,
    isRanged: true,
    pellets: 1,
    magSize: 18,
    reloadTime: 1.6,
    knockback: 8,
    armorPiercing: 0.4,
    isFlying: true,
    description: 'Desbloquea Nv.6: Dron militar volador inmune a zombis terrestres que ametralla con láser desde el cielo.',
    quotes: ['[DRON EN VUELO]', '[OBJETIVO FIJADO]'],
    hotkey: '0',
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    roleTitle: 'Coloso Spec-Ops',
    unlockLevel: 7,
    cost: 35,
    prepTime: 14.0,
    baseHp: 175,
    baseDamage: 28,
    fortune: 45,
    speed: 22,
    attackRange: 28,
    attackCooldown: 1.0,
    isRanged: false,
    knockback: 38,
    bulletResist: 0.75,
    barricadeMultiplier: 2.5,
    infectedZombieType: 'bloated',
    description: 'Desbloquea Nv.7: Supersoldado acorazado con mazo de choque sísmico y 175 HP.',
    quotes: ['¡Imparable!', '¡Blindaje máximo!', '¡Aplastando cráneos!'],
    hotkey: '-',
  },
};

export const TACTICAL_ITEM_CONFIGS: Record<TacticalItemType, TacticalItemConfig> = {
  blue_barrel: {
    id: 'blue_barrel',
    name: 'Barril Azul',
    rageCost: 6,
    prepTime: 6.0,
    radius: 32,
    impactDamage: 42,
    obstacleHp: 48,
    explodesOnBreak: false,
    description: 'Aplasta al caer (42 daño) y bloquea el paso con 48 HP.',
    hotkey: 'Q',
  },
  red_barrel: {
    id: 'red_barrel',
    name: 'Barril Rojo Explosivo',
    rageCost: 14,
    prepTime: 8.5,
    radius: 44,
    impactDamage: 55,
    obstacleHp: 32,
    explodesOnBreak: true,
    description: 'Explota al romperse incendiando el suelo y calcinando cadáveres infectados.',
    hotkey: 'W',
  },
  medkit: {
    id: 'medkit',
    name: 'Botiquín Táctico',
    rageCost: 18,
    prepTime: 10.0,
    radius: 48,
    impactDamage: 0,
    obstacleHp: 0,
    explodesOnBreak: false,
    healsPerSec: 12,
    duration: 6.5,
    description: 'Despliega un aura médica que cura +12 HP/s a los supervivientes dentro del radio.',
    hotkey: 'E',
  },
};

export const ZOMBIE_CONFIGS: Record<ZombieType, ZombieConfig> = {
  walker: {
    id: 'walker',
    name: 'Zombie Caminante',
    baseHp: 56,
    baseDamage: 14,
    speed: 25,
    attackRange: 19,
    attackCooldown: 0.9,
    rageReward: 4,
    courageDropChance: 0.2,
    critChance: 0.14,
    critMultiplier: 1.6,
    description: 'Infectado voraz que avanza en manada y desgarra a unidades aisladas.',
  },
  runner: {
    id: 'runner',
    name: 'Fast Zombie (Corredor)',
    baseHp: 44,
    baseDamage: 16,
    speed: 62,
    attackRange: 19,
    attackCooldown: 0.6,
    rageReward: 5,
    courageDropChance: 0.22,
    critChance: 0.22,
    critMultiplier: 1.75,
    description: 'Esprinta a toda velocidad directo hacia el autobús de Bill.',
  },
  crit_zombie: {
    id: 'crit_zombie',
    name: 'Feral Berserker (Aura Roja)',
    baseHp: 85,
    baseDamage: 22,
    speed: 38,
    attackRange: 21,
    attackCooldown: 0.85,
    rageReward: 7,
    courageDropChance: 0.3,
    critChance: 0.6,
    critMultiplier: 2.2,
    description: 'Rodeado de un aura carmesí; ejecuta golpes críticos letales de casi 50 de daño.',
  },
  armored: {
    id: 'armored',
    name: 'Armored Zombie',
    baseHp: 155,
    baseDamage: 20,
    speed: 21,
    attackRange: 21,
    attackCooldown: 1.05,
    rageReward: 9,
    courageDropChance: 0.35,
    critChance: 0.18,
    critMultiplier: 1.6,
    bulletResist: 0.7,
    description: 'Blindado con casco y chaleco; ignora el 70% del daño de escopetas normales.',
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton (Subterráneo)',
    baseHp: 38,
    baseDamage: 15,
    speed: 44,
    attackRange: 18,
    attackCooldown: 0.7,
    rageReward: 4,
    courageDropChance: 0.15,
    critChance: 0.15,
    critMultiplier: 1.5,
    emergesFromGround: true,
    description: 'Brota bajo tierra detrás de tus tiradores para emboscar tu retaguardia.',
  },
  bloated: {
    id: 'bloated',
    name: 'Fat Paramedic Explosivo',
    baseHp: 210,
    baseDamage: 28,
    speed: 17,
    attackRange: 23,
    attackCooldown: 1.2,
    rageReward: 12,
    courageDropChance: 0.5,
    critChance: 0.25,
    critMultiplier: 1.8,
    explodesOnDeath: true,
    description: 'Coloso infectado que al morir detona en una onda expansiva letal.',
  },
};

export const MISSION_NODES: MissionNode[] = [
  // SECTOR 1: CONDADO BOSQUE SUR
  {
    id: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'NORMAL',
    biome: 'forest_highway',
    barricadeHp: 560,
    fuelCost: 2,
    coinsReward: 75,
    supplyReward: 'Chatarra Militar',
    mapX: 7,
    mapY: 64,
    waveInterval: 2.3,
    zombiePool: ['walker', 'walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Bloqueo en la carretera forestal custodiado por caminantes, corredores y un coloso explosivo.',
  },
  {
    id: 2,
    name: 'Misión 2: Granja de los Miller',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'NORMAL',
    biome: 'farm_crossing',
    barricadeHp: 740,
    fuelCost: 2,
    coinsReward: 105,
    supplyReward: 'Caja de Herramientas',
    mapX: 15,
    mapY: 42,
    waveInterval: 2.1,
    zombiePool: ['walker', 'runner', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Corredores infectados y Berserkers con aura roja defienden el granero.',
  },
  {
    id: 3,
    name: 'Misión 3: Cementerio Blackwater',
    sector: 'Sector 1 — Bosque Sur',
    difficulty: 'HARD',
    biome: 'graveyard',
    barricadeHp: 920,
    fuelCost: 3,
    coinsReward: 140,
    supplyReward: 'Mira Telescópica',
    mapX: 24,
    mapY: 68,
    waveInterval: 1.9,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'skeleton'],
    skeletonAmbush: true,
    description: 'Esqueletos brotan bajo tierra detrás de tus tiradores mientras la horda presiona al frente.',
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
    coinsReward: 175,
    supplyReward: 'Placas de Kevlar',
    mapX: 34,
    mapY: 36,
    waveInterval: 1.8,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'walker'],
    skeletonAmbush: true,
    description: 'Policías infectados blindados (70% resistencia a balas) custodian el desguace.',
  },
  {
    id: 5,
    name: 'Misión 5: Refinería Texaco',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 1320,
    fuelCost: 3,
    coinsReward: 210,
    supplyReward: 'Combustible Purificado',
    mapX: 43,
    mapY: 62,
    waveInterval: 1.75,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: false,
    description: 'Paramédicos explosivos y zombis blindados avanzan entre pozos petroleros en llamas.',
  },
  {
    id: 6,
    name: 'Misión 6: Puente en Cuarentena',
    sector: 'Sector 2 — Autopista 66',
    difficulty: 'HARD',
    biome: 'forest_highway',
    barricadeHp: 1500,
    fuelCost: 4,
    coinsReward: 250,
    supplyReward: 'Trípode Gatling',
    mapX: 52,
    mapY: 44,
    waveInterval: 1.65,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'El cordón militar del puente colapsó. Usa francotiradores y torretas para sostener la línea.',
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
    coinsReward: 290,
    supplyReward: 'Suero Experimental',
    mapX: 61,
    mapY: 70,
    waveInterval: 1.55,
    zombiePool: ['runner', 'bloated', 'bloated', 'crit_zombie', 'armored'],
    skeletonAmbush: true,
    description: 'Epicentro de paramédicos explosivos. Mantén distancia con drones y francotiradoras.',
  },
  {
    id: 8,
    name: 'Misión 8: Comisaría Central',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 1950,
    fuelCost: 4,
    coinsReward: 340,
    supplyReward: 'Munición Perforante',
    mapX: 70,
    mapY: 34,
    waveInterval: 1.5,
    zombiePool: ['armored', 'armored', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Escuadrones SWAT infectados con blindaje pesado bloquean la avenida principal.',
  },
  {
    id: 9,
    name: 'Misión 9: Estación de Metro',
    sector: 'Sector 3 — Ciudad Muerta',
    difficulty: 'NIGHTMARE',
    biome: 'graveyard',
    barricadeHp: 2150,
    fuelCost: 4,
    coinsReward: 390,
    supplyReward: 'Batería de Litio MQ-9',
    mapX: 77,
    mapY: 64,
    waveInterval: 1.45,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'bloated', 'armored'],
    skeletonAmbush: true,
    description: 'Incesantes emboscadas subterráneas mientras oleadas de corredores atacan el autobús.',
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
    coinsReward: 450,
    supplyReward: 'Armadura Juggernaut',
    mapX: 84,
    mapY: 32,
    waveInterval: 1.38,
    zombiePool: ['armored', 'crit_zombie', 'bloated', 'runner'],
    skeletonAmbush: true,
    description: 'Fortificación militar de acero reforzado. Requiere artillería pesada y unidades de nivel alto.',
  },
  {
    id: 11,
    name: 'Misión 11: Aeródromo Infectado',
    sector: 'Sector 4 — Zona Militar',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 2800,
    fuelCost: 5,
    coinsReward: 520,
    supplyReward: 'Núcleo de Titanio',
    mapX: 90,
    mapY: 68,
    waveInterval: 1.3,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Pista de aterrizaje invadida por hordas veloces y colosos explosivos.',
  },
  {
    id: 12,
    name: 'Misión 12: Laboratorio Cero',
    sector: 'Sector 4 — Zona Militar',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 3300,
    fuelCost: 5,
    coinsReward: 700,
    supplyReward: 'Vacuna Omega',
    mapX: 95,
    mapY: 42,
    waveInterval: 1.2,
    zombiePool: ['armored', 'bloated', 'crit_zombie', 'runner', 'skeleton'],
    skeletonAmbush: true,
    description: 'La barricada final del Apocalipsis. Despliega todas tus unidades desbloqueadas para triunfar.',
  },
];

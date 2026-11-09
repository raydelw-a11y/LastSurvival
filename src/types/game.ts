export type SurvivorType = 'redneck' | 'farmer' | 'builder' | 'policeman' | 'mechanic';
export type TacticalItemType = 'blue_barrel' | 'red_barrel' | 'medkit';
export type ZombieType = 'walker' | 'runner' | 'crit_zombie' | 'armored' | 'skeleton' | 'bloated';
export type BiomeType = 'forest_highway' | 'farm_crossing' | 'graveyard' | 'junkyard_city';

export interface SurvivorConfig {
  id: SurvivorType;
  name: string;
  roleTitle: string;
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
  barricadeMultiplier?: number;
  repairsBusOnSpawn?: number;
  firstHitCritMultiplier?: number;
  infectedZombieType: ZombieType;
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
  mapX: number;
  mapY: number;
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
  busLevel: number;
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
    cost: 15,
    prepTime: 4.2,
    baseHp: 32,
    baseDamage: 11,
    fortune: 25,
    speed: 54,
    attackRange: 22,
    attackCooldown: 0.85,
    isRanged: false,
    knockback: 8,
    infectedZombieType: 'runner',
    description: 'Despliegue rápido pero frágil. Si muere, se levanta como un Fast Zombie corredor.',
    quotes: ['¡Por mi granja!', '¡Toma pala!', '¡Yee-haw!', '¡Atrás, podridos!'],
    hotkey: '1',
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    roleTitle: 'Granjero Escopetero',
    cost: 20,
    prepTime: 8.5,
    baseHp: 24,
    baseDamage: 7, // x4 perdigones = 28 daño en cono
    fortune: 28,
    speed: 26,
    attackRange: 125,
    attackCooldown: 1.5,
    isRanged: true,
    pellets: 4,
    magSize: 2,
    reloadTime: 2.6,
    knockback: 20,
    infectedZombieType: 'walker',
    description: 'Dispara 4 perdigones en cono con retroceso, pero es muy vulnerable mientras recarga sus 2 cartuchos.',
    quotes: ['¡Fuera de mis tierras!', '¡Plomo para todos!', '¡A comer perdigones!', 'Oh heck...'],
    hotkey: '2',
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    roleTitle: 'Demoledor Blindado',
    cost: 25,
    prepTime: 10.5,
    baseHp: 68,
    baseDamage: 15,
    fortune: 32,
    speed: 30,
    attackRange: 24,
    attackCooldown: 1.25,
    isRanged: false,
    knockback: 22,
    bulletResist: 0.5,
    barricadeMultiplier: 1.9,
    infectedZombieType: 'armored',
    description: 'Casco y chaleco resistente. Si muere se transforma en un peligroso Armored Zombie blindado.',
    quotes: ['¡A demoler!', '¡Casco puesto!', '¡Rompiendo chatarra!', '¡Fuerza bruta!'],
    hotkey: '3',
  },
  policeman: {
    id: 'policeman',
    name: 'Policeman Diaz',
    roleTitle: 'Escopetero Pesado',
    cost: 30,
    prepTime: 12.5,
    baseHp: 78,
    baseDamage: 8, // x4 perdigones
    fortune: 35,
    speed: 23,
    attackRange: 115,
    attackCooldown: 1.2,
    isRanged: true,
    pellets: 4,
    magSize: 4,
    reloadTime: 2.3,
    knockback: 18,
    bulletResist: 0.5,
    infectedZombieType: 'armored',
    description: 'Unidad pesada con escopeta táctica capaz de resistir embestidas mientras recarga.',
    quotes: ['¡Alto ahí!', '¡Código 10-99!', '¡A cubierto!', '¡Ley y plomo!'],
    hotkey: '4',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic',
    roleTitle: 'Asesino & Reparador',
    cost: 20,
    prepTime: 7.5,
    baseHp: 34,
    baseDamage: 14,
    fortune: 40,
    speed: 58,
    attackRange: 22,
    attackCooldown: 0.85,
    isRanged: false,
    knockback: 26,
    repairsBusOnSpawn: 30,
    firstHitCritMultiplier: 2.6,
    barricadeMultiplier: 1.4,
    infectedZombieType: 'runner',
    description: 'Repara +30 HP del autobús al salir y su primer golpe con mazo asesta daño crítico x2.6.',
    quotes: ['¡Chasis reparado!', '¡Llave inglesa lista!', '¡Abrid paso!', '¡Primer golpe!'],
    hotkey: '5',
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
    description: 'Aplasta al caer (42 daño, ¡fuego amigo activo!) y bloquea el paso con 48 HP.',
    hotkey: 'Q',
  },
  red_barrel: {
    id: 'red_barrel',
    name: 'Barril Rojo Explosivo',
    rageCost: 14,
    prepTime: 8.5,
    radius: 44,
    impactDamage: 50,
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
    healsPerSec: 10,
    duration: 6.5,
    description: 'Despliega un aura médica que cura +10 HP/s a los supervivientes dentro del radio.',
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
    description: 'Blindado con casco y chaleco; ignora el 70% del daño de escopetas y rifles.',
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
    description: 'Coloso infectado que al morir detona en una onda expansiva letal para tus tropas cuerpo a cuerpo.',
  },
};

export const MISSION_NODES: MissionNode[] = [
  {
    id: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque Muertos',
    difficulty: 'NORMAL',
    biome: 'forest_highway',
    barricadeHp: 560,
    fuelCost: 2,
    coinsReward: 65,
    supplyReward: 'Raciones + Herramientas',
    mapX: 16,
    mapY: 68,
    waveInterval: 2.7,
    zombiePool: ['walker', 'walker', 'runner', 'crit_zombie', 'bloated'],
    skeletonAmbush: true,
    description: 'Hordas de caminantes, corredores y un Fat Zombie custodian la barricada. ¡Protege a tus tiradores!',
  },
  {
    id: 2,
    name: 'Misión 2: Granja Infestada',
    sector: 'Sector 1 — Bosque Muertos',
    difficulty: 'HARD',
    biome: 'farm_crossing',
    barricadeHp: 780,
    fuelCost: 2,
    coinsReward: 95,
    supplyReward: 'Cartuchos 12G + Botiquín',
    mapX: 32,
    mapY: 46,
    waveInterval: 2.3,
    zombiePool: ['walker', 'runner', 'crit_zombie', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Berserkers de aura roja y zombis blindados cargan en manada contra el autobús.',
  },
  {
    id: 3,
    name: 'Misión 3: Cementerio de St. Mary',
    sector: 'Sector 2 — Valle de Ceniza',
    difficulty: 'HARD',
    biome: 'graveyard',
    barricadeHp: 980,
    fuelCost: 3,
    coinsReward: 135,
    supplyReward: 'Casco de Obra + Radio',
    mapX: 50,
    mapY: 64,
    waveInterval: 2.1,
    zombiePool: ['runner', 'crit_zombie', 'skeleton', 'armored', 'bloated'],
    skeletonAmbush: true,
    description: 'Emboscadas continuas bajo tierra a mitad de la carretera mientras la horda presiona.',
  },
  {
    id: 4,
    name: 'Misión 4: Desguace Interestatal 95',
    sector: 'Sector 2 — Valle de Ceniza',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 1250,
    fuelCost: 3,
    coinsReward: 185,
    supplyReward: 'Blindaje Soldado + Suministros',
    mapX: 68,
    mapY: 38,
    waveInterval: 1.9,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated', 'skeleton'],
    skeletonAmbush: true,
    description: 'Escuadrones de zombis blindados y corredores hiper-agresivos.',
  },
  {
    id: 5,
    name: 'Misión 5: Puente de Cuarentena (Boss)',
    sector: 'Sector 3 — Zona Cero',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 1650,
    fuelCost: 4,
    coinsReward: 280,
    supplyReward: 'Caja Militar Épica',
    mapX: 85,
    mapY: 54,
    waveInterval: 1.65,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated', 'bloated', 'skeleton'],
    skeletonAmbush: true,
    description: 'El bloqueo militar definitivo: oleadas masivas de Fat Zombies explosivos y Berserkers.',
  },
];

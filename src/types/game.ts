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
  fortune: number; // % chance to spawn with Golden Lucky Halo & crit rate
  speed: number; // Pixels per second in 640x360 logical space
  attackRange: number;
  attackCooldown: number;
  isRanged: boolean;
  pellets?: number;
  reloadTime?: number;
  magSize?: number;
  knockback: number;
  bulletResist?: number; // 0 to 1
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
  rageCost: number; // Rage (red)
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
  mapX: number; // Percentage 0-100 on Road Map
  mapY: number; // Percentage 0-100 on Road Map
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
  missionStars: Record<number, number>; // missionId -> 0..3 stars
  unlockedMissions: number[];
  discoveredCaches: string[];
}

export const SURVIVOR_CONFIGS: Record<SurvivorType, SurvivorConfig> = {
  redneck: {
    id: 'redneck',
    name: 'Redneck',
    roleTitle: 'Campesino con Pala',
    cost: 15,
    prepTime: 3.0,
    baseHp: 38,
    baseDamage: 14,
    fortune: 28,
    speed: 58,
    attackRange: 22,
    attackCooldown: 0.75,
    isRanged: false,
    knockback: 10,
    infectedZombieType: 'runner',
    description: 'Despliegue ultrarrápido y veloz. Ideal para frenar corredores y golpear la barricada en grupo.',
    quotes: ['¡Por mi granja!', '¡Toma pala!', '¡Yee-haw!', '¡Atrás, podridos!'],
    hotkey: '1',
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    roleTitle: 'Granjero Escopetero',
    cost: 20,
    prepTime: 7.5,
    baseHp: 28,
    baseDamage: 9, // x5 perdigones = 45 daño en cono
    fortune: 32,
    speed: 28,
    attackRange: 135,
    attackCooldown: 1.35,
    isRanged: true,
    pellets: 5,
    magSize: 2,
    reloadTime: 2.2,
    knockback: 24,
    infectedZombieType: 'walker',
    description: 'Dispara 5 perdigones en cono con alto poder de parada y retroceso. Recarga 2 cartuchos.',
    quotes: ['¡Fuera de mis tierras!', '¡Plomo para todos!', '¡A comer perdigones!', 'Oh heck...'],
    hotkey: '2',
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    roleTitle: 'Demoledor Blindado',
    cost: 30,
    prepTime: 9.0,
    baseHp: 78,
    baseDamage: 26,
    fortune: 35,
    speed: 32,
    attackRange: 24,
    attackCooldown: 1.15,
    isRanged: false,
    knockback: 26,
    bulletResist: 0.5,
    barricadeMultiplier: 2.2,
    infectedZombieType: 'armored',
    description: 'Casco y chaleco resistente a impactos. Causa x2.2 de daño a la barricada y decapita en críticos.',
    quotes: ['¡A demoler!', '¡Casco puesto!', '¡Rompiendo chatarra!', '¡Fuerza bruta!'],
    hotkey: '3',
  },
  policeman: {
    id: 'policeman',
    name: 'Policeman Diaz',
    roleTitle: 'Escopetero Pesado',
    cost: 30,
    prepTime: 11.0,
    baseHp: 90,
    baseDamage: 10, // x4 perdigones
    fortune: 40,
    speed: 25,
    attackRange: 120,
    attackCooldown: 1.1,
    isRanged: true,
    pellets: 4,
    magSize: 4,
    reloadTime: 2.0,
    knockback: 20,
    bulletResist: 0.5,
    infectedZombieType: 'armored',
    description: 'Única unidad con resistencia cuerpo a cuerpo capaz de aguantar mordiscos mientras recarga su escopeta.',
    quotes: ['¡Alto ahí!', '¡Código 10-99!', '¡A cubierto!', '¡Ley y plomo!'],
    hotkey: '4',
  },
  mechanic: {
    id: 'mechanic',
    name: 'Mechanic',
    roleTitle: 'Asesino & Reparador',
    cost: 20,
    prepTime: 6.5,
    baseHp: 42,
    baseDamage: 18,
    fortune: 45,
    speed: 62,
    attackRange: 22,
    attackCooldown: 0.8,
    isRanged: false,
    knockback: 30,
    repairsBusOnSpawn: 45,
    firstHitCritMultiplier: 3.0,
    barricadeMultiplier: 1.5,
    infectedZombieType: 'runner',
    description: 'Al salir suelda +45 HP al chasis del Autobús y su primer golpe con mazo hace x3 de daño crítico.',
    quotes: ['¡Chasis reparado!', '¡Llave inglesa lista!', '¡Abrid paso!', '¡Primer golpe gratis!'],
    hotkey: '5',
  },
};

export const TACTICAL_ITEM_CONFIGS: Record<TacticalItemType, TacticalItemConfig> = {
  blue_barrel: {
    id: 'blue_barrel',
    name: 'Barril Azul',
    rageCost: 12,
    prepTime: 5.0,
    radius: 34,
    impactDamage: 48,
    obstacleHp: 55,
    explodesOnBreak: false,
    description: 'Arrastra a la carretera: aplasta al caer (48 daño, ¡cuidado con el fuego amigo!) y bloquea el paso con 55 HP.',
    hotkey: 'Q',
  },
  red_barrel: {
    id: 'red_barrel',
    name: 'Barril Rojo Explosivo',
    rageCost: 22,
    prepTime: 8.0,
    radius: 46,
    impactDamage: 55,
    obstacleHp: 35,
    explodesOnBreak: true,
    description: 'Aplasta al caer y al ser golpeado o destruido explota en una llamarada que quema a toda la horda e incinera cadáveres.',
    hotkey: 'W',
  },
  medkit: {
    id: 'medkit',
    name: 'Botiquín Táctico',
    rageCost: 25,
    prepTime: 10.0,
    radius: 52,
    impactDamage: 0,
    obstacleHp: 0,
    explodesOnBreak: false,
    healsPerSec: 12,
    duration: 7.0,
    description: 'Despliega un aura médica en la carretera que cura +12 HP/s a todos los supervivientes dentro del radio.',
    hotkey: 'E',
  },
};

export const ZOMBIE_CONFIGS: Record<ZombieType, ZombieConfig> = {
  walker: {
    id: 'walker',
    name: 'Zombie Caminante',
    baseHp: 36,
    baseDamage: 9,
    speed: 20,
    attackRange: 18,
    attackCooldown: 1.0,
    rageReward: 7,
    courageDropChance: 0.22,
    critChance: 0.08,
    critMultiplier: 1.5,
    description: 'Infectado común lento pero implacable en grupo.',
  },
  runner: {
    id: 'runner',
    name: 'Fast Zombie (Corredor)',
    baseHp: 28,
    baseDamage: 11,
    speed: 56,
    attackRange: 18,
    attackCooldown: 0.65,
    rageReward: 9,
    courageDropChance: 0.25,
    critChance: 0.15,
    critMultiplier: 1.6,
    description: 'Corre a toda velocidad hacia el autobús de Bill apenas huele sangre.',
  },
  crit_zombie: {
    id: 'crit_zombie',
    name: 'Feral Berserker (Aura Roja)',
    baseHp: 58,
    baseDamage: 16,
    speed: 32,
    attackRange: 20,
    attackCooldown: 0.95,
    rageReward: 14,
    courageDropChance: 0.38,
    critChance: 0.55,
    critMultiplier: 2.5,
    description: 'Rodeado de un aura carmesí; ejecuta golpes críticos brutales de 40+ de daño con fuerte retroceso.',
  },
  armored: {
    id: 'armored',
    name: 'Armored Zombie',
    baseHp: 115,
    baseDamage: 15,
    speed: 17,
    attackRange: 20,
    attackCooldown: 1.15,
    rageReward: 16,
    courageDropChance: 0.42,
    critChance: 0.12,
    critMultiplier: 1.5,
    bulletResist: 0.65,
    description: 'Protegido con casco y chaleco; resiste el 65% del daño de balas.',
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton (Subterráneo)',
    baseHp: 22,
    baseDamage: 10,
    speed: 38,
    attackRange: 17,
    attackCooldown: 0.75,
    rageReward: 6,
    courageDropChance: 0.18,
    critChance: 0.1,
    critMultiplier: 1.4,
    emergesFromGround: true,
    description: 'Emerge directamente bajo el asfalto a mitad de la carretera para emboscar a tus escopeteros.',
  },
  bloated: {
    id: 'bloated',
    name: 'Fat Zombie Explosivo',
    baseHp: 155,
    baseDamage: 22,
    speed: 14,
    attackRange: 22,
    attackCooldown: 1.3,
    rageReward: 22,
    courageDropChance: 0.65,
    critChance: 0.2,
    critMultiplier: 1.8,
    explodesOnDeath: true,
    description: 'Coloso infectado que al morir revienta en una onda expansiva tóxica si tus tropas están pegadas.',
  },
};

export const MISSION_NODES: MissionNode[] = [
  {
    id: 1,
    name: 'Misión 1: Cruce del Condado',
    sector: 'Sector 1 — Bosque Muertos',
    difficulty: 'EASY',
    biome: 'forest_highway',
    barricadeHp: 260,
    fuelCost: 2,
    coinsReward: 65,
    supplyReward: 'Raciones + Herramientas',
    mapX: 16,
    mapY: 68,
    waveInterval: 4.2,
    zombiePool: ['walker', 'walker', 'runner'],
    skeletonAmbush: false,
    description: 'Un tractor oxidado bloquea la autopista. Despliega a los Rednecks y al Granjero para despejar el paso.',
  },
  {
    id: 2,
    name: 'Misión 2: Granja Abandonada',
    sector: 'Sector 1 — Bosque Muertos',
    difficulty: 'NORMAL',
    biome: 'farm_crossing',
    barricadeHp: 380,
    fuelCost: 2,
    coinsReward: 95,
    supplyReward: 'Cartuchos 12G + Botiquín',
    mapX: 32,
    mapY: 46,
    waveInterval: 3.6,
    zombiePool: ['walker', 'runner', 'crit_zombie'],
    skeletonAmbush: false,
    description: 'Zombis con aura roja crítica custodian la barricada agrícola. Usa barriles azules para cortar su avance.',
  },
  {
    id: 3,
    name: 'Misión 3: Cementerio de St. Mary',
    sector: 'Sector 2 — Valle de Ceniza',
    difficulty: 'NORMAL',
    biome: 'graveyard',
    barricadeHp: 480,
    fuelCost: 3,
    coinsReward: 135,
    supplyReward: 'Casco de Obra + Radio',
    mapX: 50,
    mapY: 64,
    waveInterval: 3.3,
    zombiePool: ['walker', 'runner', 'skeleton', 'crit_zombie'],
    skeletonAmbush: true,
    description: '¡Peligro bajo el asfalto! Esqueletos emergen detrás de tus tiradores mientras la horda presiona.',
  },
  {
    id: 4,
    name: 'Misión 4: Desguace Interestatal 95',
    sector: 'Sector 2 — Valle de Ceniza',
    difficulty: 'HARD',
    biome: 'junkyard_city',
    barricadeHp: 640,
    fuelCost: 3,
    coinsReward: 185,
    supplyReward: 'Blindaje Soldado + Suministros',
    mapX: 68,
    mapY: 38,
    waveInterval: 2.9,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'skeleton'],
    skeletonAmbush: true,
    description: 'Zombis blindados resisten los perdigones. Necesitarás al Builder y barriles explosivos para abrir brecha.',
  },
  {
    id: 5,
    name: 'Misión 5: Puente de Cuarentena (Boss)',
    sector: 'Sector 3 — Zona Cero',
    difficulty: 'NIGHTMARE',
    biome: 'junkyard_city',
    barricadeHp: 850,
    fuelCost: 4,
    coinsReward: 280,
    supplyReward: 'Caja Militar Épica',
    mapX: 85,
    mapY: 54,
    waveInterval: 2.5,
    zombiePool: ['runner', 'crit_zombie', 'armored', 'bloated', 'skeleton'],
    skeletonAmbush: true,
    description: 'Bloqueo militar reforzado con Fat Zombies explosivos, corredores y emboscadas subterráneas.',
  },
];

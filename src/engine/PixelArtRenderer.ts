import { BiomeType, SurvivorType, TacticalItemType, ZombieType } from '../types/game';

// 2.14:1 Ultrawide Landscape logical resolution matching modern smartphones & reference screenshot
export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 336;
export const ROAD_Y_MIN = 180;
export const ROAD_Y_MAX = 278;

export interface RenderUnit {
  id: string;
  team: 'survivor' | 'zombie';
  subType: SurvivorType | ZombieType;
  level: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  state: 'spawning' | 'emerging' | 'march' | 'windup' | 'attack' | 'reload' | 'hurt' | 'corpse';
  animTime: number;
  attackProgress: number;
  reloadProgress: number;
  whiteFlashTimer: number;
  isLucky: boolean;
  isPlayerControlled: boolean;
  facing: 1 | -1;
  corpseTimer?: number;
  corpseMaxTimer?: number;
  quoteText?: string;
  quoteTimer?: number;
  firstHitReady?: boolean;
}

export interface RenderObstacle {
  id: string;
  type: TacticalItemType;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  whiteFlashTimer: number;
  healDuration?: number;
}

export interface RenderPickup {
  id: string;
  kind: 'courage' | 'rage';
  amount: number;
  x: number;
  y: number;
  z: number;
  life: number;
}

export interface RenderCrow {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  flying: boolean;
  animOffset: number;
}

export interface RenderParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  LeavesDecal?: boolean;
}

export interface RenderFloatingText {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  z: number;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  isComic?: boolean;
}

export interface RenderFireZone {
  x: number;
  y: number;
  radius: number;
  duration: number;
}

function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pxOutlinedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = '#14110f'
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = outline;
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
}

// Render a 2D pixel art character matrix with horizontal flip & white hit-flash support
function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  centerX: number,
  bottomY: number,
  facing: 1 | -1 = 1,
  flashWhite = false
) {
  const h = rows.length;
  const w = rows[0]?.length || 0;
  const startX = Math.round(centerX - w / 2);
  const startY = Math.round(bottomY - h);

  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const color = flashWhite ? '#ffffff' : palette[ch];
      if (!color) continue;
      const drawCol = facing === 1 ? c : w - 1 - c;
      ctx.fillStyle = color;
      ctx.fillRect(startX + drawCol, startY + r, 1, 1);
    }
  }
}

// ============================================================================
// TALL, SLENDER, HIGH-DETAIL PIXEL ART MATRICES (26–30 rows + 7px Animated Legs)
// Total character height ~34–38px by 14px wide (Authentic Dead Ahead 1:2.5 ratio!)
// ============================================================================

const REDNECK_MATRIX = [
  '....OOOOOO......',
  '...ObbbbbbO.....',
  '..ObbWWWWbbO....',
  '..ObbbbbbbbOOO..',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssshO...',
  '...OssssssmmO...',
  '....OOssssOO....',
  '...OssOOOOssO...',
  '..OssBssssBssO..',
  '..OssBssssBssO..',
  '..OssByssyBssO..',
  '..OssBBBBBBssO..',
  '..OshBBBBBBhsO..',
  '..OshBBBBBBhsO..',
  '...OOddddddOO...',
  '....OBBBBBB0....',
  '....OBBbbBBO....',
  '....OBBbbBBO....',
  '....OBBOObbO....',
  '....OBB..bbO....',
  '....OBB..bbO....',
  '....OhB..bhO....',
  '....OOO..OOO....',
];

const FARMER_MATRIX = [
  '....OOOOOO......',
  '...OyyyyyyO.....',
  '.OOyYYYYYYyOO...',
  'OddddddddddddO..',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssshO...',
  '...OssWWWWWWo...',
  '...OssWWWWWWo...',
  '....OOWWWWOO....',
  '...OccccccccO...',
  '..OcccBssBcccO..',
  '..OcccByyBcccO..',
  '..OcccBBBBcccO..',
  '..OsshBBBBhssO..',
  '..OsshBBBBhssO..',
  '...OOddddddOO...',
  '....ObbbbbbO....',
  '....ObbBBBB0....',
  '....ObbBBObO....',
  '....ObbO.ObO....',
  '....ObbO.ObO....',
  '....ObbO.ObO....',
  '....ObbO.ObO....',
  '....OOO..OOO....',
];

const BUILDER_MATRIX = [
  '....OOOOOO......',
  '...OYYYYYYO.....',
  '..OYYWWWWYYO....',
  '..OYYYYYYYYO....',
  '.OddddddddddO...',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssshO...',
  '...OssssssmmO...',
  '....OOssssOO....',
  '..OOggggggggOO..',
  '.OggggggggggggO.',
  '.OggYYYYYYYYggO.',
  '.OggddddddddggO.',
  '.OggggggggggggO.',
  '.OsshgggggghssO.',
  '..OOddddddddOO..',
  '...OggggggggO...',
  '...OggddddggO...',
  '...OggOOOOggO...',
  '...OggO..OggO...',
  '...OggO..OggO...',
  '...OggO..OggO...',
  '...OggO..OggO...',
  '...OOO....OOO...',
];

const POLICEMAN_MATRIX = [
  '....OOOOOO......',
  '..OOuuuuuuOO....',
  '.OuuuuYYuuuuOO..',
  '..OOIIIIIIIIOO..',
  '...OssssKKssO...',
  '...OssssssshO...',
  '...OssssssmmO...',
  '....OOssssOO....',
  '..OOuuuuuuuuOO..',
  '.OuuKKKKKKKKuuO.',
  '.OuuKKKKYKKKuuO.',
  '.OuuKKKKKKKKuuO.',
  '.OuuKKKKKKKKuuO.',
  '.OsshKKKKKKhssO.',
  '..OOIIIIIIIIOO..',
  '...OuuuuuuuuO...',
  '...OuuUUUUuuO...',
  '...OuuOOOOuuO...',
  '...OuuO..OuuO...',
  '...OuuO..OuuO...',
  '...OuuO..OuuO...',
  '...OuuO..OuuO...',
  '...OOO....OOO...',
];

const MECHANIC_MATRIX = [
  '....OOOOOO......',
  '...OkkkkkkO.....',
  '..OOkkkkkkOO....',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssshO...',
  '...OssssmmmmO...',
  '....OOssssOO....',
  '..OOccccccccOO..',
  '.OccccccccccccO.',
  '.OccRcccccccccO.',
  '.OccRRccccccccO.',
  '.OccccccccccccO.',
  '.OsshccccccchsO.',
  '..OOddddddddOO..',
  '...OccccccccO...',
  '...OcckkkkccO...',
  '...OccOOOOccO...',
  '...OccO..OccO...',
  '...OccO..OccO...',
  '...OccO..OccO...',
  '...OccO..OccO...',
  '...OOO....OOO...',
];

const HOUND_MATRIX = [
  '..........OO..OO.',
  '.........OmO.OmO.',
  '........OmmmmmmO.',
  '........OmmKmmmOO',
  '.OO....OOmmmmWWWW',
  'OmmOOOORRmmmmRRRR',
  '.OmmmmmmmmmmmmOO.',
  '..OmmmmddmmmmO...',
  '..OmmmmddddddO...',
  '..OmmOO....OOmmO.',
  '..OmmO......OmmO.',
  '..OOO........OOO.',
];

const SNIPER_MATRIX = [
  '....OOOOOO......',
  '...OrrrrrrO.....',
  '..OrrrrrrrrOO...',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssshO...',
  '...OOrrrrrrOO...',
  '....OrrrrrrO....',
  '..OOggggggggOO..',
  '.OggddddddddddO.',
  '.OggddYYYYddggO.',
  '.OggddddddddddO.',
  '.OsshddddddhssO.',
  '..OOIIIIIIIIOO..',
  '...OkkkkkkkkO...',
  '...OkkOOOOkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OOO....OOO...',
];

const FLAMETHROWER_MATRIX = [
  '....OOOOOO......',
  '...OooooooO.....',
  '..OooooooooO....',
  '..OOkkkkkkkkO...',
  '..OkkWWWWWWkkO..',
  '..OkkKKKKKKkkO..',
  '...OOkkkkkkOO...',
  '.OOORROOOOOOO...',
  'ORRRRROooooooooO',
  'ORRRRROooYYYYooO',
  'ORRRRROooooooooO',
  'ORRRRROooYYYYooO',
  '.OOORROooooooooO',
  '..OOddddddddOO..',
  '...OkkkkkkkkO...',
  '...OkkOOOOkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OkkO..OkkO...',
  '...OOO....OOO...',
];

const TURRET_MATRIX = [
  '....OOOOOOOO....',
  '...OkkkkkkkkO...',
  '..OkkYYYYYYkkO..',
  '.OkkkkRRRRkkkkO.',
  '.OkkkkkkkkkkkkO.',
  '..OOddddddddddOO',
  '....OkkkkkkkkO..',
  '...OkkkkkkkkkkO.',
  '..OkkkOOOOOkkkO.',
  '.OkkkO....OkkkO.',
  'OkkkO......OkkkO',
  'OOOO........OOOO',
];

const DRONE_MATRIX = [
  'OOOOO......OOOOO',
  '..O..........O..',
  '.OkkkkkkkkkkkkO.',
  'OkkWWWWccRRRRkkO',
  'OkkkkkkkkkkkkkkO',
  '.OOddddRRRRddOO.',
  '...OkkO..OkkO...',
  '..OO........OO..',
];

const JUGGERNAUT_MATRIX = [
  '....OOOOOOOO....',
  '...OkkkkkkkkO...',
  '..OkkYYYYYYkkO..',
  '..OkkKKKKKKkkO..',
  '..OkkkkkkkkkkO..',
  '.OOkkkkkkkkkkOO.',
  'OkkkkkkkkkkkkkkO',
  'OkkKKKKKKKKKKkkO',
  'OkkKKYYYYYYKKkkO',
  'OkkKKKKKKKKKKkkO',
  'OkkKKccccccKKkkO',
  'OkkkkkkkkkkkkkkO',
  '.OOddddddddddOO.',
  '..OkkkkkkkkkkO..',
  '..OkkkkkkkkkkO..',
  '..OkkkkOOOOkkO..',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OOOO......OOOO',
];

const ZOMBIE_WALKER_MATRIX = [
  '....OOOOOO......',
  '...OzzzzzzO.....',
  '..OzzZZZZzzO....',
  '..OzzRzzzKzO....',
  '..OzzzzzzzzO....',
  '..OzzRRRRzzO....',
  '...OzzRRRRzO....',
  '....OOzzzzOO....',
  '..OOttttttttOO..',
  '.OzzzzttttRRttO.',
  '.OzzzztttRRRttO.',
  '..OOOOttttttttO.',
  '....OttRRttttO..',
  '....OttttttttO..',
  '....OOddddddOO..',
  '....OdkkkkkkdO..',
  '....OdkkkkkkdO..',
  '....OdkOOOOdkO..',
  '....OdkO..OdkO..',
  '....OdkO..OdkO..',
  '....OdkO..OdkO..',
  '....OdkO..OdkO..',
  '....OOO....OOO..',
];

const ZOMBIE_RUNNER_MATRIX = [
  '...OOOOOO.......',
  '..OzzzzzzO......',
  '.OzzRzzzKzO.....',
  '.OzzRRRRzzO.....',
  '..OzzRRRRzO.....',
  '...OOzzzzOO.....',
  '.OOrrrrrrrrOO...',
  'OzzzzrrrrWWrrO..',
  'OzzzzrrrRRRrrO..',
  '.OOOOrrrrrrrrO..',
  '...OrrrrrrrrO...',
  '...OOddddddOO...',
  '....OkkkkkkO....',
  '....OkkOOkkO....',
  '....Okk..kkO....',
  '....Okk..kkO....',
  '....Okk..kkO....',
  '....Okk..kkO....',
  '....OOO..OOO....',
];

const ZOMBIE_CRIT_MATRIX = [
  '....OOOOOO......',
  '...OggggggO.....',
  '..OggddddggO....',
  '.OddddddddddO...',
  '..OzzRRRRzzO....',
  '..OzzRzzzRzO....',
  '..OzzRRRRRRzO...',
  '...OOzzzzRRzO...',
  '..OOggggggggOO..',
  '.OzzzzggRRRRggO.',
  '.OzzzzgRRRRRggO.',
  '..OOOOggggggggO.',
  '...OggggRRRRggO.',
  '...OOddddddddOO.',
  '....OggggggggO..',
  '....OggOOOOggO..',
  '....OggO..OggO..',
  '....OggO..OggO..',
  '....OggO..OggO..',
  '....OggO..OggO..',
  '....OOO....OOO..',
];

const ZOMBIE_ARMORED_MATRIX = [
  '....OOOOOOOO....',
  '...OkkkkkkkkO...',
  '..OkkWWWWWWkkO..',
  '..OkkKKKKKKkkO..',
  '..OOzzzzRRRRzO..',
  '...OzzzzRRRRzO..',
  '.OOkkkkkkkkkkOO.',
  'OkkkkkkkkkkkkkkO',
  'OkkKKKKKKKKKKkkO',
  'OkkKKccccccKKkkO',
  'OkkKKKKKKKKKKkkO',
  'OzzKKKKKKKKKKzzO',
  '.OOkkkkkkkkkkOO.',
  '..OkkkkkkkkkkO..',
  '..OkkkkOOOOkkO..',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OkkkO....OkkO.',
  '..OOOO......OOOO',
];

const ZOMBIE_SKELETON_MATRIX = [
  '....OOOOOO......',
  '...OWWWWWWO.....',
  '..OWWKKKKWWO....',
  '..OWWWWWWWWO....',
  '...OWKKKKWO.....',
  '....OOWWOO......',
  '..OOcWWWWcOO....',
  '.OWWccWWccWWO...',
  '..OOcWWWWcOO....',
  '...OcWWWWcO.....',
  '....OOWWOO......',
  '...OWWWWWWO.....',
  '...OWWOOwWO.....',
  '...OWO..OWO.....',
  '...OWO..OWO.....',
  '...OWO..OWO.....',
  '...OWO..OWO.....',
  '...OOO..OOO.....',
];

const ZOMBIE_BLOATED_MATRIX = [
  '.....OOOOOO.....',
  '....OzzzzzzO....',
  '...OzzZZZZzzO...',
  '...OzzRzzzKzO...',
  '...OzzRRRRzzO...',
  '....OzzRRRRzO...',
  '..OOooooooooOO..',
  '.OooooooooooooO.',
  'OooYYYYYYYYYYooO',
  'OooooooooooooooO',
  'OooooRRRRRRooooO',
  'OooYYYYYYYYYYooO',
  'OoooRRRRRRRRoooO',
  'OooooRRRRRRooooO',
  'OooooooooooooooO',
  'OooooooooooooooO',
  '.OooooooooooooO.',
  '..OOddddddddOO..',
  '..OddddddddddO..',
  '..OdddddddddddO.',
  '..OddOOOOOOdddO.',
  '..OddO....OdddO.',
  '..OddO....OdddO.',
  '..OddO....OdddO.',
  '..OOOO....OOOO..',
];

const BASE_PALETTE: Record<string, string> = {
  O: '#14110f',
  '0': '#14110f',
  s: '#f5b882',
  h: '#d99b66',
  m: '#9a5b3e',
  K: '#18181b',
  W: '#f8fafc',
  w: '#cbd5e1',
  b: '#0284c7',
  B: '#1d4ed8',
  y: '#eab308',
  Y: '#facc15',
  d: '#57534e',
  c: '#94a3b8',
  g: '#5c5836',
  u: '#1e3a8a',
  U: '#172554',
  I: '#09090b',
  k: '#334155',
  z: '#7fa655',
  Z: '#5f823c',
  R: '#b91c1c',
  r: '#991b1b',
  t: '#475569',
  o: '#c2410c',
};

function renderOilDrum(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyColor = '#3f4739',
  topColor = '#58634f',
  highlightColor = '#6b7860'
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(rx - 2, ry + 19, 22, 5);

  pxOutlinedRect(ctx, rx, ry, 18, 21, bodyColor);
  // Cylindrical shading highlight & shadow
  pxRect(ctx, rx + 2, ry, 4, 21, highlightColor);
  pxRect(ctx, rx + 13, ry, 4, 21, '#232920');
  // Top rim
  pxOutlinedRect(ctx, rx, ry - 2, 18, 4, topColor);
  pxRect(ctx, rx + 3, ry - 1, 8, 2, highlightColor);
  // Cap bung hole on top
  pxRect(ctx, rx + 12, ry - 1, 2, 2, '#14110f');
  // Horizontal ribs
  pxRect(ctx, rx - 1, ry + 6, 20, 2, '#1c2019');
  pxRect(ctx, rx - 1, ry + 14, 20, 2, '#1c2019');
  // "OIL" stencil mark + rust drip
  pxRect(ctx, rx + 4, ry + 9, 8, 3, '#b59a4f');
  pxRect(ctx, rx + 5, ry + 10, 2, 1, '#232920');
  pxRect(ctx, rx + 9, ry + 10, 2, 1, '#232920');
}

export function renderBiomeBackground(
  ctx: CanvasRenderingContext2D,
  _biome: BiomeType,
  time: number
) {
  // 1. Multi-Banded Apocalyptic Yellow-Olive Sky with Dithered Horizon
  pxRect(ctx, 0, 0, LOGICAL_WIDTH, 20, '#c8d162');
  pxRect(ctx, 0, 20, LOGICAL_WIDTH, 18, '#d7df71');
  pxRect(ctx, 0, 38, LOGICAL_WIDTH, 20, '#e4eb82');
  pxRect(ctx, 0, 58, LOGICAL_WIDTH, 32, '#eff496');

  // Atmospheric cloud streaks
  ctx.fillStyle = 'rgba(250, 253, 182, 0.65)';
  ctx.fillRect(45, 14, 185, 5);
  ctx.fillRect(72, 11, 115, 3);
  ctx.fillRect(360, 24, 230, 6);
  ctx.fillRect(390, 20, 155, 4);
  ctx.fillRect(175, 42, 250, 4);

  // 2. Distant Hazy Mountain / Treeline Silhouette
  pxRect(ctx, 0, 82, LOGICAL_WIDTH, 26, '#3b4530');
  for (let i = 0; i < 72; i++) {
    const mx = i * 10;
    const mh = 12 + ((i * 13) % 16);
    pxRect(ctx, mx, 86 - mh, 10, mh, '#465239');
  }

  // 3. Detailed 2-Layer Pine Forest (Y: 48 to 108)
  for (let i = 0; i < 50; i++) {
    const tx = i * 14.5 - 4;
    const th = 26 + ((i * 23) % 24);
    const ty = 102 - th;
    const baseCol = i % 3 === 0 ? '#2f3827' : i % 2 === 0 ? '#262e20' : '#1f261a';
    const lightCol = '#3d4933';

    // Tree trunk
    pxRect(ctx, tx + 6, ty + 5, 3, th, '#1b1f17');
    // 5 tiers of notched pine boughs
    for (let tier = 0; tier < 5; tier++) {
      const bw = 4 + tier * 3.4;
      const by = ty + tier * 4.8;
      pxRect(ctx, tx + 7 - bw / 2, by, bw, 4, baseCol);
      pxRect(ctx, tx + 7 - bw / 2, by, bw * 0.45, 2, lightCol);
    }
  }

  // Dead Snag Trees sticking above canopy
  [92, 212, 420, 560].forEach((bx) => {
    pxRect(ctx, bx, 50, 3, 52, '#21261c');
    pxRect(ctx, bx - 6, 60, 6, 2, '#21261c');
    pxRect(ctx, bx + 3, 66, 6, 2, '#21261c');
    pxRect(ctx, bx - 4, 74, 4, 2, '#21261c');
  });

  // 4. Upper Olive Meadow, Fence Posts & Tall Grass Clumps (Y: 104 to 172)
  pxRect(ctx, 0, 104, LOGICAL_WIDTH, 68, '#575233');
  pxRect(ctx, 0, 104, LOGICAL_WIDTH, 6, '#3f3d26');
  pxRect(ctx, 0, 110, LOGICAL_WIDTH, 6, '#4b472c');

  for (let gx = 6; gx < LOGICAL_WIDTH; gx += 15) {
    const gy = 118 + ((gx * 7) % 44);
    pxRect(ctx, gx, gy, 9, 2, '#454128');
    pxRect(ctx, gx + 2, gy - 2, 5, 2, '#69633d');
    if (gx % 45 === 6) {
      pxRect(ctx, gx + 4, gy - 4, 2, 3, '#3b3721');
    }
  }

  // Utility / Telegraph Poles on the Right + Sagging Power Line
  pxOutlinedRect(ctx, 480, 68, 5, 74, '#2d251b');
  pxRect(ctx, 481, 68, 2, 74, '#423728');
  pxOutlinedRect(ctx, 475, 74, 15, 3, '#2d251b');

  pxOutlinedRect(ctx, 646, 0, 12, 182, '#261f17');
  pxRect(ctx, 648, 0, 4, 182, '#3b3024');
  pxRect(ctx, 654, 0, 2, 182, '#17130e');

  // 5. Detailed Wrecked Silver/White SUV above the Road (X: 256, Y: 108)
  renderWreckedSUV(ctx, 256, 108);

  // 6. Upper Grass-to-Dirt Overhang Border (Y: 170 to 182)
  pxRect(ctx, 0, 170, LOGICAL_WIDTH, 10, '#69623b');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 7) {
    const h = 3 + ((gx * 3) % 4);
    pxRect(ctx, gx, 177, 5, h, '#524d2e');
    pxRect(ctx, gx + 2, 175, 4, 3, '#787045');
  }

  // 7. Textured Dirt & Gravel Country Road (Y: 180 to 280)
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 100, '#9c7146');
  // Upper & lower darker road wheel ruts + tire tracks
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 6, '#825b35');
  pxRect(ctx, 0, 198, LOGICAL_WIDTH, 8, '#91673e');
  pxRect(ctx, 0, 226, LOGICAL_WIDTH, 4, '#a6794d');
  pxRect(ctx, 0, 252, LOGICAL_WIDTH, 9, '#91673e');
  pxRect(ctx, 0, 272, LOGICAL_WIDTH, 8, '#805933');

  // Detailed gravel stones, cracks, pebbles & dust patches
  for (let rx = 10; rx < LOGICAL_WIDTH; rx += 22) {
    const ry = 188 + ((rx * 17) % 72);
    pxRect(ctx, rx, ry, 14, 3, '#8a6038');
    pxRect(ctx, rx + 3, ry + 1, 8, 2, '#ad8054');
    pxRect(ctx, rx + 13, 196 + ((rx * 11) % 60), 3, 2, '#5c3f24');
    pxRect(ctx, rx + 7, 220 + ((rx * 19) % 44), 2, 2, '#b88b5e');
    pxRect(ctx, rx + 2, 245 + ((rx * 23) % 24), 4, 1, '#6e4c2b');
  }

  // 8. Bottom Grass Verge & Foreground Trench (Y: 278 to 336)
  pxRect(ctx, 0, 278, LOGICAL_WIDTH, 13, '#595334');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 8) {
    const sway = Math.round(Math.sin(time * 2 + gx) * 0.6);
    pxRect(ctx, gx + sway, 275, 6, 4, '#6e6741');
    pxRect(ctx, gx + 3, 279, 5, 5, '#454128');
  }
  pxRect(ctx, 0, 291, LOGICAL_WIDTH, 45, '#3a3628');
  pxRect(ctx, 0, 305, LOGICAL_WIDTH, 31, '#2d2a1f');
}

function renderWreckedSUV(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx + 50, cy + 48, 56, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rear & side chassis
  pxOutlinedRect(ctx, cx, cy + 16, 98, 28, '#949ca8');
  pxRect(ctx, cx + 2, cy + 17, 94, 5, '#cbd5e1'); // Upper door crease highlight
  pxRect(ctx, cx + 2, cy + 22, 94, 2, '#475569'); // Body trim line
  pxRect(ctx, cx + 2, cy + 28, 94, 15, '#646b75'); // Lower door shadow
  pxRect(ctx, cx + 6, cy + 38, 86, 5, '#474c54'); // Rusted rocker panel
  // Rust & blood stains on doors
  pxRect(ctx, cx + 28, cy + 26, 8, 9, '#7c2d12');
  pxRect(ctx, cx + 52, cy + 30, 11, 7, '#7f1d1d');

  // Roof & Pillars
  pxOutlinedRect(ctx, cx + 6, cy, 68, 18, '#b8c1ce');
  pxRect(ctx, cx + 8, cy + 1, 62, 4, '#e2e8f0');

  // Smashed Windows with jagged glass shards
  pxOutlinedRect(ctx, cx + 10, cy + 5, 22, 12, '#18181b');
  pxRect(ctx, cx + 11, cy + 6, 5, 3, '#64748b');
  pxRect(ctx, cx + 26, cy + 12, 4, 4, '#475569');
  pxOutlinedRect(ctx, cx + 36, cy + 5, 30, 12, '#18181b');
  pxRect(ctx, cx + 58, cy + 6, 6, 4, '#64748b');
  pxRect(ctx, cx + 38, cy + 13, 5, 3, '#475569');

  // Door seams & handles
  pxRect(ctx, cx + 34, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 66, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 26, cy + 24, 5, 2, '#1e293b');
  pxRect(ctx, cx + 56, cy + 24, 5, 2, '#1e293b');

  // Crumbled Front Hood & Exposed Engine Block
  pxOutlinedRect(ctx, cx + 72, cy + 13, 30, 26, '#525861');
  pxRect(ctx, cx + 75, cy + 16, 22, 11, '#18181b');
  pxRect(ctx, cx + 78, cy + 18, 7, 6, '#52525b');
  pxRect(ctx, cx + 88, cy + 19, 5, 5, '#78350f');

  // Empty Dark Wheel Wells + Cinder Blocks
  pxOutlinedRect(ctx, cx + 8, cy + 33, 20, 14, '#141417');
  pxRect(ctx, cx + 13, cy + 40, 10, 6, '#57534e');
  pxOutlinedRect(ctx, cx + 68, cy + 33, 20, 14, '#141417');
  pxRect(ctx, cx + 73, cy + 40, 10, 6, '#57534e');
}

export function renderForegroundLeftProps(ctx: CanvasRenderingContext2D) {
  const tx = -4;
  const ty = 208;

  // Military Truck Cab in bottom-left foreground
  pxOutlinedRect(ctx, tx, ty, 56, 44, '#484a36');
  pxOutlinedRect(ctx, tx + 2, ty + 2, 50, 7, '#5c5f46');
  pxOutlinedRect(ctx, tx + 8, ty + 13, 38, 23, '#171a14');
  pxRect(ctx, tx + 10, ty + 15, 12, 6, '#2c3025'); // Glass reflection
  pxRect(ctx, tx + 26, ty + 13, 2, 23, '#363829'); // Split windshield bar

  // Truck Hood & Heavy Radiator Grille
  pxOutlinedRect(ctx, tx, ty + 40, 72, 46, '#3d402e');
  pxRect(ctx, tx + 2, ty + 42, 66, 7, '#52563e');
  pxOutlinedRect(ctx, tx + 44, ty + 51, 24, 26, '#22241a');
  for (let gx = tx + 47; gx <= tx + 64; gx += 4) {
    pxRect(ctx, gx, ty + 54, 2, 20, '#3d402e');
  }
  // Truck Wheel Arch & Tire
  pxOutlinedRect(ctx, tx + 8, ty + 70, 28, 26, '#181a14');
  pxOutlinedRect(ctx, tx + 14, ty + 76, 16, 14, '#36382c');

  // Clustered Olive Oil Drums in front of truck
  renderOilDrum(ctx, 56, 282, '#3f4534', '#555c47');
  renderOilDrum(ctx, 76, 278, '#464d3b', '#5d664e');
  renderOilDrum(ctx, 66, 294, '#363b2d', '#4b523f');
  renderOilDrum(ctx, 97, 290, '#3f4534', '#555c47');
}

export function renderArmoredBus(
  ctx: CanvasRenderingContext2D,
  busX: number,
  busY: number,
  hp: number,
  maxHp: number,
  time: number,
  _billCooldown: number,
  billFiringTimer: number,
  spikedBumper: boolean,
  weldedArmor: boolean,
  doorOpenTimer: number
) {
  const x = Math.round(busX);
  const y = Math.round(busY);
  const engineBob = Math.round(Math.sin(time * 16) * 0.5);

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
  ctx.beginPath();
  ctx.ellipse(x + 76, y + 76, 86, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main School Bus Body
  pxOutlinedRect(ctx, x, y + engineBob, 128, 68, '#d9ab2b');
  // Rounded Roof Cap with specular highlight & warning lights
  pxOutlinedRect(ctx, x + 2, y - 6 + engineBob, 120, 9, '#ecc342');
  pxRect(ctx, x + 4, y - 5 + engineBob, 114, 3, '#f7d969');
  pxOutlinedRect(ctx, x + 114, y - 8 + engineBob, 5, 4, '#dc2626'); // Roof flasher

  // Vertical rivet seams along bus panels
  for (let rx = x + 22; rx <= x + 88; rx += 22) {
    pxRect(ctx, rx, y + 4 + engineBob, 1, 60, '#9c7818');
  }

  // Lower Shaded Body Panel + Mud/Weathering
  pxRect(ctx, x + 1, y + 36 + engineBob, 126, 31, '#b88b1e');
  pxRect(ctx, x + 1, y + 57 + engineBob, 126, 10, '#7c5d1c');

  // Roof Luggage Rack on left + Red Barrel strapped on top
  renderOilDrum(ctx, x + 4, y - 29 + engineBob, '#b91c1c', '#dc2626', '#ef4444');
  pxRect(ctx, x, y - 12 + engineBob, 60, 2, '#1c1917');
  for (let rx = x + 4; rx <= x + 56; rx += 12) {
    pxRect(ctx, rx, y - 12 + engineBob, 2, 6, '#1c1917');
  }

  // Protruding Front Engine Hood
  pxOutlinedRect(ctx, x + 124, y + 26 + engineBob, 32, 42, '#d9ab2b');
  pxRect(ctx, x + 124, y + 27 + engineBob, 30, 7, '#ecc342');
  pxRect(ctx, x + 128, y + 38 + engineBob, 14, 2, '#7c5d1c'); // Hood louver
  pxRect(ctx, x + 128, y + 42 + engineBob, 14, 2, '#7c5d1c');

  // Heavy Blood splatter on front nose of the bus
  pxRect(ctx, x + 140, y + 32 + engineBob, 14, 20, '#991b1b');
  pxRect(ctx, x + 134, y + 39 + engineBob, 10, 15, '#7f1d1d');
  pxRect(ctx, x + 129, y + 46 + engineBob, 6, 8, '#991b1b');

  // Front Grille, Heavy Bumper & Glowing Headlight
  pxOutlinedRect(ctx, x + 150, y + 34 + engineBob, 6, 22, '#27272a');
  pxOutlinedRect(ctx, x + 149, y + 54 + engineBob, 7, 6, '#fef08a');
  pxOutlinedRect(ctx, x + 146, y + 60 + engineBob, 12, 7, '#27272a');

  // Black Side Trim Rub-Rails & "BOARD OF EDUCATION" Stencil
  pxRect(ctx, x, y + 33 + engineBob, 96, 2, '#1c1917');
  pxRect(ctx, x, y + 48 + engineBob, 96, 3, '#1c1917');
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOARD OF EDUCATION', x + 4, y + 43 + engineBob);

  // Bus Windows with glass reflection & frames
  for (let wx = x + 6; wx <= x + 76; wx += 17) {
    pxOutlinedRect(ctx, wx, y + 8 + engineBob, 14, 20, '#2e2d24');
    pxRect(ctx, wx + 2, y + 10 + engineBob, 10, 7, '#4a483b');
    pxRect(ctx, wx + 3, y + 11 + engineBob, 4, 3, '#6b6857');
    pxRect(ctx, wx, y + 17 + engineBob, 14, 2, '#1c1917'); // Window divider bar
    if (weldedArmor) {
      pxRect(ctx, wx - 1, y + 13 + engineBob, 16, 3, '#71717a');
      pxRect(ctx, wx - 1, y + 21 + engineBob, 16, 3, '#71717a');
    }
  }

  // Folding Accordion Passenger Door
  const doorOpen = doorOpenTimer > 0;
  pxOutlinedRect(
    ctx,
    x + 96,
    y + 8 + engineBob,
    20,
    56,
    doorOpen ? '#0c0a09' : '#85681a'
  );
  if (!doorOpen) {
    pxOutlinedRect(ctx, x + 99, y + 12 + engineBob, 5, 22, '#2e2d24');
    pxOutlinedRect(ctx, x + 107, y + 12 + engineBob, 5, 22, '#2e2d24');
    pxOutlinedRect(ctx, x + 99, y + 38 + engineBob, 5, 20, '#6b5314');
    pxOutlinedRect(ctx, x + 107, y + 38 + engineBob, 5, 20, '#6b5314');
  }

  // Detailed Front Wheel, Fender Arch & Tire Tread
  pxOutlinedRect(ctx, x + 120, y + 49, 28, 12, '#18181b'); // Wheel well arch
  pxOutlinedRect(ctx, x + 122, y + 52, 24, 24, '#18181b');
  pxOutlinedRect(ctx, x + 126, y + 56, 16, 16, '#3f3f46');
  pxOutlinedRect(ctx, x + 130, y + 60, 8, 8, '#9ca3af');
  pxRect(ctx, x + 133, y + 63, 2, 2, '#18181b');

  if (spikedBumper) {
    pxOutlinedRect(ctx, x + 155, y + 50 + engineBob, 10, 4, '#dc2626');
    pxOutlinedRect(ctx, x + 157, y + 56 + engineBob, 12, 4, '#e4e4e7');
    pxOutlinedRect(ctx, x + 155, y + 62 + engineBob, 10, 4, '#dc2626');
  }

  // Rising Dark Smoke Plume behind hood
  const smokePhase = (time * 16) % 24;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.48)';
  ctx.beginPath();
  ctx.arc(x + 136, y + 10 - smokePhase, 13, 0, Math.PI * 2);
  ctx.arc(x + 128, y - 8 - smokePhase * 1.1, 17, 0, Math.PI * 2);
  ctx.fill();

  // =======================================================
  // SHERIFF BILL IN THE OPEN ROOF HATCH (Taller & Clearer)
  // =======================================================
  const bx = x + 84;
  const by = y - 20 + engineBob;

  pxOutlinedRect(ctx, bx - 6, by + 12, 22, 4, '#ecc342'); // Hatch lid
  pxOutlinedRect(ctx, bx, by + 2, 12, 11, '#57534e'); // Sheriff vest
  pxRect(ctx, bx + 2, by + 3, 10, 5, '#f5b882'); // Arms aiming
  pxOutlinedRect(ctx, bx + 1, by - 7, 10, 9, '#f5b882'); // Head
  pxRect(ctx, bx + 8, by - 4, 2, 2, '#18181b'); // Eye
  pxRect(ctx, bx + 3, by - 2, 8, 3, '#451a03'); // Beard/Mustache

  // White Cowboy Hat
  pxOutlinedRect(ctx, bx - 4, by - 10, 20, 4, '#e7e5e4');
  pxOutlinedRect(ctx, bx, by - 15, 12, 6, '#f5f5f4');
  pxRect(ctx, bx, by - 10, 12, 2, '#78350f');

  // Long Hunting Rifle
  pxOutlinedRect(ctx, bx + 6, by + 3, 26, 3, '#1c1917');
  pxRect(ctx, bx + 2, by + 4, 8, 3, '#78350f');
  if (billFiringTimer > 0) {
    pxRect(ctx, bx + 32, by + 1, 12, 7, '#fde047');
    pxRect(ctx, bx + 34, by + 3, 16, 3, '#ffffff');
  }

  // Bus Health Bar right in front of Bill
  const barW = 50;
  const barX = bx + 26;
  const barY = by + 16;
  const ratio = Math.max(0, hp / maxHp);
  pxOutlinedRect(ctx, barX, barY, barW, 5, '#09090b');
  pxRect(ctx, barX + 1, barY + 1, Math.round((barW - 2) * ratio), 3, '#dc2626');
}

export function renderBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  hp: number,
  maxHp: number,
  shakeTimer: number
) {
  const ratio = Math.max(0, hp / maxHp);
  const shakeX = shakeTimer > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
  const bx = Math.round(x + shakeX);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(bx - 46, ROAD_Y_MIN - 4, 94, ROAD_Y_MAX - ROAD_Y_MIN + 26);

  // Metal Racks & Striped Hazard Barriers
  pxOutlinedRect(ctx, bx - 6, 142, 24, 42, '#27272a');
  for (let ry = 148; ry <= 178; ry += 6) {
    pxRect(ctx, bx - 4, ry, 20, 2, '#52525b');
  }

  pxOutlinedRect(ctx, bx + 4, 174, 30, 18, '#eab308');
  pxRect(ctx, bx + 8, 174, 5, 18, '#18181b');
  pxRect(ctx, bx + 18, 174, 5, 18, '#18181b');
  pxRect(ctx, bx + 28, 174, 4, 18, '#18181b');

  if (ratio > 0.25) {
    renderOilDrum(ctx, bx - 18, 188, '#294257', '#3b5d7a', '#4d779c');
    renderOilDrum(ctx, bx + 2, 198, '#574c35', '#736548', '#8a7957');
  }

  // Red Overturned Car Hood / Wrecked Door
  if (ratio > 0.15) {
    pxOutlinedRect(ctx, bx - 24, 218, 36, 46, '#b91c1c');
    pxRect(ctx, bx - 21, 221, 30, 16, '#dc2626');
    pxRect(ctx, bx - 18, 224, 14, 6, '#ef4444');
    pxRect(ctx, bx - 16, 242, 24, 18, '#7f1d1d');
  }

  pxOutlinedRect(ctx, bx - 46, 238, 26, 26, '#ca8a04');
  pxRect(ctx, bx - 46, 248, 26, 14, '#27272a');
  renderOilDrum(ctx, bx - 56, 260, '#333b42', '#49545e', '#5d6b78');

  // Stacked Rubber Tires
  pxOutlinedRect(ctx, bx - 36, 264, 22, 10, '#18181b');
  pxOutlinedRect(ctx, bx - 34, 272, 22, 10, '#27272a');

  // Coils of Barbed Wire
  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1.5;
  for (let wx = bx - 8; wx <= bx + 20; wx += 8) {
    ctx.beginPath();
    ctx.arc(wx, 264, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  pxOutlinedRect(ctx, bx + 22, 234, 24, 48, '#27272a');
}

function renderUnitLevelAndHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  level: number,
  hp: number,
  maxHp: number,
  isSurvivor: boolean
) {
  const ratio = Math.max(0, hp / maxHp);
  const bx = Math.round(x - 14);
  const by = Math.round(topY);

  const badgeCol = isSurvivor ? '#2563eb' : '#b91c1c';
  pxOutlinedRect(ctx, bx, by - 2, 9, 9, badgeCol, '#14110f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(level), bx + 4.5, by + 5);

  const barW = 19;
  pxOutlinedRect(ctx, bx + 10, by, barW, 4, '#14110f', '#14110f');
  pxRect(
    ctx,
    bx + 10,
    by,
    Math.round(barW * ratio),
    4,
    isSurvivor ? '#22c55e' : '#ef4444'
  );
}

function renderGoldenDottedHalo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number
) {
  const dots = 12;
  const radius = 10;
  for (let i = 0; i < dots; i++) {
    const ang = (i / dots) * Math.PI * 2 + time * 2.5;
    const dx = Math.round(cx + Math.cos(ang) * radius);
    const dy = Math.round(cy + Math.sin(ang) * (radius * 0.7));
    pxRect(ctx, dx - 1, dy - 1, 2, 2, i % 2 === 0 ? '#fde047' : '#eab308');
  }
}

export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  unit: RenderUnit,
  time: number
) {
  const x = Math.round(unit.x);
  const y = Math.round(unit.y);
  const z = Math.round(unit.z);

  if (unit.isPlayerControlled && unit.state !== 'corpse') {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, unit.subType === 'bloated' ? 11 : 7.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Infected Corpse Lying on Road
  if (unit.state === 'corpse') {
    const twitchX = Math.sin(time * 35) * 1.2;
    const cx = Math.round(x + twitchX);
    pxRect(ctx, cx - 16, y - 3, 32, 6, '#991b1b');
    pxOutlinedRect(ctx, cx - 13, y - 7, 17, 6, '#3f422e');
    pxOutlinedRect(ctx, cx + 4, y - 8, 8, 7, '#7fa655');
    const sporeY = Math.round((time * 22) % 14);
    pxRect(ctx, cx - 4, y - 10 - sporeY, 2, 2, '#a3e635');
    pxRect(ctx, cx + 4, y - 6 - ((sporeY + 6) % 14), 2, 2, '#bef264');
    return;
  }

  // Skeleton / Reanimated Zombie Emerging
  if (unit.state === 'emerging') {
    pxOutlinedRect(ctx, x - 10, y - 3, 20, 5, '#5c4028');
    const emergeH = Math.min(28, Math.round(unit.animTime * 24));
    pxOutlinedRect(ctx, x - 4, y - emergeH, 8, emergeH, '#e7e5e4');
    return;
  }

  const isMoving = unit.state === 'march' || unit.state === 'spawning';
  const walkCycle = isMoving ? Math.sin(unit.animTime * 14) : 0;
  const bobY = isMoving ? Math.abs(Math.round(walkCycle * 1.6)) : 0;
  const drawY = y - z - bobY;
  const flash = unit.whiteFlashTimer > 0;
  const dir = unit.facing;
  const legStride = Math.round(walkCycle * 3);

  // =======================================================
  // TALL, SLENDER, HIGH-DETAIL SURVIVORS & TACTICAL UNITS
  // =======================================================
  if (unit.team === 'survivor') {
    // 1. FLYING COMBAT DRONE MQ-9 (Hovers in the air at Z ~ 36)
    if (unit.subType === 'drone') {
      const hoverZ = 34 + Math.round(Math.sin(time * 7 + unit.animTime) * 2.5);
      const droneY = y - hoverZ;

      // Spinning Rotor Blades
      const bladeW = Math.sin(time * 45) > 0 ? 7 : 3;
      pxRect(ctx, x - 6 - Math.floor(bladeW / 2), droneY - 12, bladeW, 1, '#e2e8f0');
      pxRect(ctx, x + 6 - Math.floor(bladeW / 2), droneY - 12, bladeW, 1, '#e2e8f0');

      drawPixelMatrix(ctx, DRONE_MATRIX, BASE_PALETTE, x, droneY - 2, dir, flash);

      // Red Laser Target Scanner + Aerial Machine Gun Burst
      ctx.strokeStyle =
        unit.state === 'attack' ? 'rgba(250, 204, 21, 0.9)' : 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = unit.state === 'attack' ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * 4, droneY - 3);
      ctx.lineTo(x + dir * 75, y - 4);
      ctx.stroke();

      if (unit.state === 'attack' && unit.attackProgress < 0.5) {
        pxRect(ctx, x + dir * 6, droneY - 4, 6 * dir, 4, '#fde047');
      }

      renderUnitLevelAndHealthBar(ctx, x, droneY - 18, unit.level, unit.hp, unit.maxHp, true);
      return;
    }

    // 2. AUTOMATED GATLING TURRET (Stationary Tripod Sentry)
    if (unit.subType === 'turret') {
      drawPixelMatrix(ctx, TURRET_MATRIX, BASE_PALETTE, x, y - z, dir, flash);
      const recoilX = unit.state === 'attack' ? -1 * dir : 0;
      // Multi-barrel rotary Gatling gun
      pxOutlinedRect(ctx, x + dir * 3 + recoilX, y - z - 11, 15 * dir, 4, flash ? '#fff' : '#27272a');
      pxRect(ctx, x + dir * 5 + recoilX, y - z - 10, 12 * dir, 1, '#94a3b8');
      if (unit.state === 'attack') {
        pxRect(ctx, x + dir * 18, y - z - 13, 9 * dir, 7, '#fde047');
        pxRect(ctx, x + dir * 20, y - z - 11, 11 * dir, 3, '#ffffff');
      }
      renderUnitLevelAndHealthBar(ctx, x, y - z - 20, unit.level, unit.hp, unit.maxHp, true);
      return;
    }

    // 3. K-9 ATTACK DOG "REX" (Fast 4-legged lunge & bite)
    if (unit.subType === 'hound') {
      const lungeX = unit.state === 'attack' ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 7) * dir : 0;
      const leapZ = unit.state === 'attack' ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 5) : 0;
      // 4 animated paws
      pxOutlinedRect(ctx, x - 5 + legStride, y - z - leapZ - 4, 2, 4, flash ? '#fff' : '#451a03');
      pxOutlinedRect(ctx, x + 3 - legStride, y - z - leapZ - 4, 2, 4, flash ? '#fff' : '#451a03');
      drawPixelMatrix(ctx, HOUND_MATRIX, BASE_PALETTE, x + lungeX, drawY - leapZ - 3, dir, flash);
      renderUnitLevelAndHealthBar(ctx, x, drawY - leapZ - 21, unit.level, unit.hp, unit.maxHp, true);
      return;
    }

    // 4. HUMAN SURVIVORS (Tall 36–38px bodies + Articulated Lower Boots)
    pxOutlinedRect(ctx, x - 4 + legStride, y - z - 6, 3, 6, flash ? '#fff' : '#1c1917');
    pxOutlinedRect(ctx, x + 1 - legStride, y - z - 6, 3, 6, flash ? '#fff' : '#1c1917');

    const matrix =
      unit.subType === 'redneck'
        ? REDNECK_MATRIX
        : unit.subType === 'farmer'
        ? FARMER_MATRIX
        : unit.subType === 'builder'
        ? BUILDER_MATRIX
        : unit.subType === 'policeman'
        ? POLICEMAN_MATRIX
        : unit.subType === 'sniper'
        ? SNIPER_MATRIX
        : unit.subType === 'flamethrower'
        ? FLAMETHROWER_MATRIX
        : unit.subType === 'juggernaut'
        ? JUGGERNAUT_MATRIX
        : MECHANIC_MATRIX;

    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 5, dir, flash);

    // Weapon & Attack Animation (Positioned at chest/shoulder height on tall body)
    const swing = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) : 0;
    if (unit.subType === 'sniper') {
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      // Long Precision Sniper Rifle + Scope
      pxOutlinedRect(
        ctx,
        x + dir * 2 + recoilX,
        drawY - 19,
        19 * dir,
        3,
        flash ? '#fff' : '#18181b'
      );
      pxOutlinedRect(ctx, x + dir * 6 + recoilX, drawY - 22, 6 * dir, 2, '#334155');
      // Red Laser Sight Beam
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * 21, drawY - 18);
      ctx.lineTo(x + dir * 180, drawY - 18);
      ctx.stroke();

      if (unit.state === 'attack' && unit.attackProgress < 0.35) {
        pxRect(ctx, x + dir * 21, drawY - 22, 10 * dir, 7, '#fde047');
        pxRect(ctx, x + dir * 23, drawY - 20, 14 * dir, 3, '#ffffff');
      }
    } else if (unit.subType === 'flamethrower') {
      pxOutlinedRect(ctx, x + dir * 2, drawY - 18, 13 * dir, 4, flash ? '#fff' : '#27272a');
      if (unit.state === 'attack') {
        // Blazing Multi-Layered Flame Cone
        pxRect(ctx, x + dir * 15, drawY - 21, 18 * dir, 8, '#dc2626');
        pxRect(ctx, x + dir * 15, drawY - 19, 14 * dir, 5, '#f97316');
        pxRect(ctx, x + dir * 15, drawY - 18, 9 * dir, 3, '#fde047');
      }
    } else if (unit.subType === 'farmer' || unit.subType === 'policeman') {
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      const reloadTilt = unit.state === 'reload' ? 3 : 0;
      pxOutlinedRect(
        ctx,
        x + dir * 2 + recoilX,
        drawY - 19 + reloadTilt,
        14 * dir,
        3,
        flash ? '#fff' : '#27272a'
      );
      pxRect(
        ctx,
        x + recoilX,
        drawY - 18 + reloadTilt,
        5 * dir,
        3,
        flash ? '#fff' : '#78350f'
      );
      if (unit.state === 'attack' && unit.attackProgress < 0.35) {
        pxRect(ctx, x + dir * 16, drawY - 22, 8 * dir, 8, '#fde047');
        pxRect(ctx, x + dir * 18, drawY - 20, 10 * dir, 4, '#ffffff');
      }
    } else {
      const reachX = Math.round(swing * 10) * dir;
      const reachY = Math.round(swing * 6);
      const handleColor =
        unit.subType === 'mechanic' || unit.subType === 'juggernaut' ? '#64748b' : '#78350f';
      const headColor =
        unit.subType === 'builder'
          ? '#dc2626'
          : unit.subType === 'juggernaut'
          ? '#facc15'
          : '#cbd5e1';

      pxOutlinedRect(
        ctx,
        x + dir * 3 + reachX,
        drawY - 20 + reachY,
        10 * dir,
        2,
        flash ? '#fff' : handleColor
      );
      pxOutlinedRect(
        ctx,
        x + dir * 11 + reachX,
        drawY - 24 + reachY,
        (unit.subType === 'juggernaut' ? 6 : 4) * dir,
        unit.subType === 'juggernaut' ? 9 : 7,
        flash ? '#fff' : headColor
      );
    }

    if (unit.isLucky) {
      renderGoldenDottedHalo(ctx, x, drawY - 41, time);
    }

    renderUnitLevelAndHealthBar(ctx, x, drawY - 35, unit.level, unit.hp, unit.maxHp, true);
  } else {
    // =======================================================
    // TALL, DISTINCT, HIGH-DETAIL ZOMBIES (All 6 Subtypes!)
    // =======================================================
    const isBloated = unit.subType === 'bloated';
    const footW = isBloated ? 4 : 3;
    pxOutlinedRect(ctx, x - 4 + legStride, y - z - 6, footW, 6, flash ? '#fff' : '#1c1917');
    pxOutlinedRect(ctx, x + 1 - legStride, y - z - 6, footW, 6, flash ? '#fff' : '#1c1917');

    // Red Fury Aura on Crit Berserker Zombie
    if (unit.subType === 'crit_zombie') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.beginPath();
      ctx.ellipse(x, drawY - 18, 9, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const matrix =
      unit.subType === 'bloated'
        ? ZOMBIE_BLOATED_MATRIX
        : unit.subType === 'armored'
        ? ZOMBIE_ARMORED_MATRIX
        : unit.subType === 'crit_zombie'
        ? ZOMBIE_CRIT_MATRIX
        : unit.subType === 'runner'
        ? ZOMBIE_RUNNER_MATRIX
        : unit.subType === 'skeleton'
        ? ZOMBIE_SKELETON_MATRIX
        : ZOMBIE_WALKER_MATRIX;

    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 5, dir, flash);

    // Outstretched Zombie Claw Attack Swipe
    if (unit.state === 'attack') {
      const swipeX = Math.round(Math.sin(unit.attackProgress * Math.PI) * 7) * dir;
      pxOutlinedRect(ctx, x + dir * 4 + swipeX, drawY - 20, 6 * dir, 3, flash ? '#fff' : '#7fa655');
      pxRect(ctx, x + dir * 9 + swipeX, drawY - 20, 2 * dir, 3, '#dc2626');
    }

    const topOffset = isBloated ? 36 : 33;
    renderUnitLevelAndHealthBar(ctx, x, drawY - topOffset, unit.level, unit.hp, unit.maxHp, false);
  }
}

export function renderTacticalObstacle(
  ctx: CanvasRenderingContext2D,
  obs: RenderObstacle,
  time: number
) {
  const x = Math.round(obs.x);
  const y = Math.round(obs.y);
  const z = Math.round(obs.z);

  if (obs.type === 'medkit') {
    const pulse = Math.sin(time * 6) * 3;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 46 + pulse, 20 + pulse * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    pxOutlinedRect(ctx, x - 8, y - z - 11, 16, 11, '#f8fafc');
    pxRect(ctx, x - 2, y - z - 9, 4, 7, '#ef4444');
    pxRect(ctx, x - 4, y - z - 7, 8, 3, '#ef4444');
    return;
  }

  const isRed = obs.type === 'red_barrel';
  renderOilDrum(
    ctx,
    x - 9,
    y - z - 21,
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#b91c1c' : '#294257',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#dc2626' : '#3b5d7a',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#ef4444' : '#527da3'
  );
}

export function renderDropPickup(
  ctx: CanvasRenderingContext2D,
  pickup: RenderPickup,
  time: number
) {
  const x = Math.round(pickup.x);
  const y = Math.round(pickup.y);
  const floatZ = Math.round(pickup.z + Math.abs(Math.sin(time * 5)) * 3);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const isCourage = pickup.kind === 'courage';
  const col = isCourage ? '#0284c7' : '#dc2626';
  const hi = isCourage ? '#7dd3fc' : '#fca5a5';

  pxOutlinedRect(ctx, x - 5, y - floatZ - 12, 10, 11, col);
  pxOutlinedRect(ctx, x - 2, y - floatZ - 15, 4, 3, '#e2e8f0');
  pxRect(ctx, x - 3, y - floatZ - 10, 3, 6, hi);

  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`+${pickup.amount}`, x, y - floatZ - 17);
}

export function renderCrow(ctx: CanvasRenderingContext2D, crow: RenderCrow, time: number) {
  const x = Math.round(crow.x);
  const y = Math.round(crow.y);
  const z = Math.round(crow.z);

  if (!crow.flying) {
    const peck = Math.sin(time * 9 + crow.animOffset) > 0.5 ? 2 : 0;
    pxOutlinedRect(ctx, x - 3, y - 5 + peck, 6, 4, '#18181b');
    pxRect(ctx, x + 3, y - 4 + peck, 3, 2, '#f59e0b');
  } else {
    const flap = Math.sin(time * 24 + crow.animOffset) > 0 ? -4 : 3;
    pxOutlinedRect(ctx, x - 4, y - z - 4, 8, 4, '#18181b');
    pxRect(ctx, x - 2, y - z - 4 + flap, 5, 4, '#27272a');
  }
}

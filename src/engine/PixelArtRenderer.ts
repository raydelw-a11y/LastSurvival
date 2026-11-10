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
  critTelegraphTimer?: number;
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

export interface RenderTracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  coreColor: string;
  width: number;
  life: number;
  maxLife: number;
  isSniper?: boolean;
}

export interface RenderShell {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  bounces: number;
  color: string;
  w: number;
  h: number;
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
  maxDuration?: number;
}

// Fast deterministic integer hash for procedural pixel-art road/terrain textures
function hash32(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function drawDitheredSky(
  ctx: CanvasRenderingContext2D,
  bands: string[],
  heights: number[]
) {
  let curY = 0;
  for (let b = 0; b < bands.length; b++) {
    const h = heights[b];
    ctx.fillStyle = bands[b];
    ctx.fillRect(0, curY, LOGICAL_WIDTH, h);

    // Bayer 4x4 pixel-art dither transition at bottom of band
    if (b < bands.length - 1) {
      const nextCol = bands[b + 1];
      const ditherH = 6;
      const startY = curY + h - ditherH;
      ctx.fillStyle = nextCol;
      for (let py = 0; py < ditherH; py++) {
        const threshold = ((py + 1) / (ditherH + 1)) * 16;
        for (let px = 0; px < LOGICAL_WIDTH; px += 2) {
          if (BAYER_4X4[py & 3][(px >> 1) & 3] < threshold) {
            ctx.fillRect(px, startY + py, 2, 1);
          }
        }
      }
    }
    curY += h;
  }
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

// Crisp 2-ring pixel-art ground shadow (ZERO expensive shadowBlur!)
function drawCrispShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.fillStyle = 'rgba(10, 8, 14, 0.24)';
  ctx.fillRect(x - rx - 1, y - ry, (rx + 1) * 2, ry * 2 + 1);
  ctx.fillStyle = 'rgba(10, 8, 14, 0.46)';
  ctx.fillRect(x - rx + 1, y - ry + 1, Math.max(2, (rx - 1) * 2), Math.max(2, ry * 2 - 1));
}

// Render a 2D pixel-art character matrix with 1px zenith/back Rim Light, flip & telegraph tint
function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  centerX: number,
  bottomY: number,
  facing: 1 | -1 = 1,
  flashWhite = false,
  rimColor?: string,
  tintOverlay?: string
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
      const isOutline = ch === 'O' || ch === '0';
      let color = flashWhite ? '#fff8e7' : tintOverlay && !isOutline ? tintOverlay : palette[ch];
      if (!color) continue;

      // Apply 1px top/shoulder rim light on non-outline upper interior pixels for crisp silhouette pop!
      if (!flashWhite && !tintOverlay && rimColor && !isOutline && r > 0 && r < 14) {
        const above = rows[r - 1]?.[c];
        if (above === 'O' && (r <= 4 || r === 9 || r === 10)) {
          color = rimColor;
        }
      }

      const drawCol = facing === 1 ? c : w - 1 - c;
      ctx.fillStyle = color;
      ctx.fillRect(startX + drawCol, startY + r, 1, 1);
    }
  }
}

// ============================================================================
// TALL, SLENDER, HIGH-DETAIL PIXEL ART MATRICES (Authentic Dead Ahead 1:2.5 ratio)
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
  R: '#dc2626',
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
  highlightColor = '#6b7860',
  damageState: 0 | 1 | 2 = 0,
  isHazardRed = false
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  drawCrispShadow(ctx, rx + 9, ry + 20, 10, 3);

  const dentOffset = damageState >= 1 ? 1 : 0;
  pxOutlinedRect(ctx, rx + dentOffset, ry, 18 - dentOffset, 21, bodyColor);
  pxRect(ctx, rx + 2 + dentOffset, ry, 4, 21, highlightColor);
  pxRect(ctx, rx + 13, ry, 4, 21, '#1d221b');
  pxOutlinedRect(ctx, rx, ry - 2, 18, 4, topColor);
  pxRect(ctx, rx + 3, ry - 1, 8, 2, highlightColor);
  pxRect(ctx, rx + 12, ry - 1, 2, 2, '#14110f');
  pxRect(ctx, rx - 1 + dentOffset, ry + 6, 20 - dentOffset, 2, '#1c2019');
  pxRect(ctx, rx - 1, ry + 14, 20, 2, '#1c2019');

  if (isHazardRed) {
    // Yellow-black explosive hazard stripe + flame diamond
    pxRect(ctx, rx + 3, ry + 8, 12, 5, '#facc15');
    pxRect(ctx, rx + 7, ry + 9, 4, 3, '#dc2626');
    pxRect(ctx, rx + 8, ry + 10, 2, 1, '#ffffff');
  } else {
    pxRect(ctx, rx + 4, ry + 9, 8, 3, '#b59a4f');
    pxRect(ctx, rx + 5, ry + 10, 2, 1, '#232920');
    pxRect(ctx, rx + 9, ry + 10, 2, 1, '#232920');
  }

  // Damage dents & leaking fluid
  if (damageState >= 1) {
    pxRect(ctx, rx + 6, ry + 4, 4, 2, '#14110f');
    pxRect(ctx, rx + 7, ry + 6, 2, 6, isHazardRed ? '#f97316' : '#0f172a');
  }
  if (damageState === 2) {
    pxRect(ctx, rx + 5, ry - 4, 5, 3, '#fde047');
    pxRect(ctx, rx + 7, ry - 6, 3, 2, '#ffffff');
  }
}

function renderWreckedSUV(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  drawCrispShadow(ctx, cx + 50, cy + 47, 52, 9);

  pxOutlinedRect(ctx, cx, cy + 16, 98, 28, '#949ca8');
  pxRect(ctx, cx + 2, cy + 17, 94, 5, '#e2e8f0');
  pxRect(ctx, cx + 2, cy + 22, 94, 2, '#475569');
  pxRect(ctx, cx + 2, cy + 28, 94, 15, '#646b75');
  pxRect(ctx, cx + 6, cy + 38, 86, 5, '#3f444d');
  pxRect(ctx, cx + 28, cy + 26, 8, 9, '#7c2d12');
  pxRect(ctx, cx + 52, cy + 30, 11, 7, '#7f1d1d');

  pxOutlinedRect(ctx, cx + 6, cy, 68, 18, '#b8c1ce');
  pxRect(ctx, cx + 8, cy + 1, 62, 4, '#f1f5f9');

  pxOutlinedRect(ctx, cx + 10, cy + 5, 22, 12, '#18181b');
  pxRect(ctx, cx + 11, cy + 6, 5, 3, '#94a3b8');
  pxRect(ctx, cx + 26, cy + 12, 4, 4, '#475569');
  pxOutlinedRect(ctx, cx + 36, cy + 5, 30, 12, '#18181b');
  pxRect(ctx, cx + 58, cy + 6, 6, 4, '#94a3b8');
  pxRect(ctx, cx + 38, cy + 13, 5, 3, '#475569');

  pxRect(ctx, cx + 34, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 66, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 26, cy + 24, 5, 2, '#1e293b');
  pxRect(ctx, cx + 56, cy + 24, 5, 2, '#1e293b');

  pxOutlinedRect(ctx, cx + 72, cy + 13, 30, 26, '#525861');
  pxRect(ctx, cx + 75, cy + 16, 22, 11, '#18181b');
  pxRect(ctx, cx + 78, cy + 18, 7, 6, '#64748b');
  pxRect(ctx, cx + 88, cy + 19, 5, 5, '#78350f');

  pxOutlinedRect(ctx, cx + 8, cy + 33, 20, 14, '#141417');
  pxRect(ctx, cx + 13, cy + 40, 10, 6, '#57534e');
  pxOutlinedRect(ctx, cx + 68, cy + 33, 20, 14, '#141417');
  pxRect(ctx, cx + 73, cy + 40, 10, 6, '#57534e');
}

// ============================================================================
// OFFSCREEN BAKED 4-BIOME STATIC BACKGROUND CACHE (< 0.15ms drawImage per frame!)
// ============================================================================
const bakedBiomeCache = new Map<string, HTMLCanvasElement>();

function buildProceduralRoad(
  ctx: CanvasRenderingContext2D,
  biome: BiomeType,
  seed: number
) {
  const isAsphalt = biome === 'junkyard_city' || biome === 'graveyard';
  const baseRoad =
    biome === 'junkyard_city'
      ? '#34373f'
      : biome === 'graveyard'
      ? '#2d3038'
      : biome === 'farm_crossing'
      ? '#8f653e'
      : '#916a43';
  const darkRut =
    biome === 'junkyard_city'
      ? '#272a30'
      : biome === 'graveyard'
      ? '#22242b'
      : '#785432';
  const lightGrain =
    biome === 'junkyard_city'
      ? '#454954'
      : biome === 'graveyard'
      ? '#3d414d'
      : '#a87d52';

  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 100, baseRoad);
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 6, darkRut);
  pxRect(ctx, 0, 198, LOGICAL_WIDTH, 7, darkRut);
  pxRect(ctx, 0, 253, LOGICAL_WIDTH, 8, darkRut);
  pxRect(ctx, 0, 272, LOGICAL_WIDTH, 8, darkRut);

  // Broken weathered center highway markings on asphalt or faded lane strip on rural highway
  if (isAsphalt || biome === 'forest_highway') {
    const lineCol = biome === 'graveyard' ? '#94a3b8' : '#d99b26';
    for (let lx = 18; lx < LOGICAL_WIDTH; lx += 42) {
      const wear = hash32(lx, 228, seed) % 7;
      pxRect(ctx, lx, 227, 22 - wear, 2, lineCol);
      if (biome === 'junkyard_city') {
        pxRect(ctx, lx + 2, 231, 18 - wear, 2, lineCol);
      }
    }
  }

  // Deterministic micro-grain, tar patches, tire skid marks & 1px highlighted cracks
  for (let y = 182; y < 276; y += 2) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 3) {
      const h = hash32(x, y, seed) % 100;
      if (h < 11) {
        pxRect(ctx, x, y, 2, 1, darkRut);
      } else if (h >= 11 && h < 17) {
        pxRect(ctx, x, y, 2, 1, lightGrain);
      }
    }
  }

  // Branched cracks + oil stains + tire skid streaks
  for (let i = 0; i < 18; i++) {
    const cx = 24 + ((hash32(i, 11, seed) % 660) | 0);
    const cy = 188 + ((hash32(i, 29, seed) % 78) | 0);
    // Jagged crack with 1px lit lower lip
    pxRect(ctx, cx, cy, 12, 1, '#18181b');
    pxRect(ctx, cx + 1, cy + 1, 10, 1, lightGrain);
    pxRect(ctx, cx + 6, cy - 3, 5, 1, '#18181b');
    if (i % 3 === 0) {
      // Dark oil/tar patch
      pxRect(ctx, cx - 8, cy + 4, 14, 4, 'rgba(15, 15, 18, 0.38)');
    }
    if (i % 4 === 0) {
      // Tire skid marks
      pxRect(ctx, cx + 10, cy + 2, 28, 2, 'rgba(20, 18, 16, 0.34)');
      pxRect(ctx, cx + 12, cy + 6, 24, 2, 'rgba(20, 18, 16, 0.28)');
    }
  }
}

function getBakedBiomeCanvas(biome: BiomeType, seed: number): HTMLCanvasElement {
  const key = `${biome}_${seed}`;
  const existing = bakedBiomeCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  if (biome === 'forest_highway') {
    drawDitheredSky(ctx, ['#b6c254', '#cad463', '#dce478', '#edf394'], [22, 20, 22, 30]);

    // Soft clouds
    ctx.fillStyle = 'rgba(254, 252, 202, 0.6)';
    ctx.fillRect(42, 14, 175, 5);
    ctx.fillRect(68, 10, 110, 4);
    ctx.fillRect(355, 22, 220, 6);
    ctx.fillRect(185, 42, 230, 4);

    // Distant ridge
    pxRect(ctx, 0, 82, LOGICAL_WIDTH, 26, '#39452e');
    for (let i = 0; i < 72; i++) {
      const mh = 10 + (hash32(i, 1, seed) % 16);
      pxRect(ctx, i * 10, 86 - mh, 10, mh, '#465438');
    }

    // 2-Layer Pine Forest
    for (let i = 0; i < 52; i++) {
      const tx = i * 14 - 4;
      const th = 26 + (hash32(i, 2, seed) % 24);
      const ty = 103 - th;
      const baseCol = i % 3 === 0 ? '#2f3a27' : i % 2 === 0 ? '#252e1f' : '#1d2418';
      pxRect(ctx, tx + 6, ty + 5, 3, th, '#181c14');
      for (let tier = 0; tier < 5; tier++) {
        const bw = 4 + tier * 3.4;
        const by = ty + tier * 4.8;
        pxRect(ctx, tx + 7 - bw / 2, by, bw, 4, baseCol);
        pxRect(ctx, tx + 7 - bw / 2, by, bw * 0.45, 2, '#415035');
      }
    }

    // Diagonal sun god-rays filtering between pines
    ctx.fillStyle = 'rgba(254, 249, 195, 0.09)';
    [80, 210, 380, 520].forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 36, 0);
      ctx.lineTo(rx + 88, 172);
      ctx.lineTo(rx + 42, 172);
      ctx.closePath();
      ctx.fill();
    });

    // Meadow & Highway Route 14 Sign
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 68, '#575233');
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 7, '#3f3d26');
    for (let gx = 6; gx < LOGICAL_WIDTH; gx += 14) {
      const gy = 116 + (hash32(gx, 3, seed) % 46);
      pxRect(ctx, gx, gy, 8, 2, '#454128');
      pxRect(ctx, gx + 2, gy - 2, 5, 2, '#6d673f');
    }

    // Bullet-riddled "ROUTE 14" highway shield sign
    pxOutlinedRect(ctx, 186, 134, 3, 36, '#52525b');
    pxOutlinedRect(ctx, 177, 122, 21, 15, '#15803d');
    pxRect(ctx, 179, 124, 17, 11, '#166534');
    pxRect(ctx, 181, 126, 13, 2, '#f8fafc');
    pxRect(ctx, 183, 130, 9, 3, '#f8fafc');

    // Utility poles + sagging cable
    pxOutlinedRect(ctx, 480, 68, 5, 76, '#2d251b');
    pxOutlinedRect(ctx, 474, 74, 17, 3, '#2d251b');
    pxOutlinedRect(ctx, 646, 0, 12, 182, '#261f17');
    pxRect(ctx, 648, 0, 4, 182, '#3b3024');
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.quadraticCurveTo(240, 88, 482, 75);
    ctx.quadraticCurveTo(564, 86, 650, 58);
    ctx.stroke();

    renderWreckedSUV(ctx, 256, 108);
  } else if (biome === 'farm_crossing') {
    // Copper-crimson sunset sky
    drawDitheredSky(ctx, ['#7c2d12', '#b45309', '#d97706', '#f59e0b', '#fde047'], [18, 20, 22, 18, 18]);

    // Sunset clouds
    ctx.fillStyle = 'rgba(254, 215, 170, 0.45)';
    ctx.fillRect(60, 18, 190, 5);
    ctx.fillRect(380, 28, 210, 5);

    // Distant rolling hills
    pxRect(ctx, 0, 84, LOGICAL_WIDTH, 24, '#5c3a21');
    for (let x = 0; x < LOGICAL_WIDTH; x += 16) {
      const hh = 6 + (hash32(x, 4, seed) % 10);
      pxRect(ctx, x, 86 - hh, 18, hh, '#704628');
    }

    // Golden-brown pasture
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 68, '#785c32');
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 8, '#5e4726');

    // Iconic Red Wooden Barn + Metallic Grain Silo
    pxOutlinedRect(ctx, 146, 56, 26, 62, '#94a3b8'); // Silo
    pxRect(ctx, 149, 56, 7, 62, '#cbd5e1');
    pxOutlinedRect(ctx, 145, 48, 28, 10, '#64748b'); // Silo dome
    for (let sy = 64; sy <= 110; sy += 10) {
      pxRect(ctx, 146, sy, 26, 1, '#475569');
    }

    // Red Barn
    pxOutlinedRect(ctx, 74, 72, 76, 48, '#991b1b');
    pxRect(ctx, 76, 74, 72, 44, '#b91c1c');
    // Gambrel barn roof
    pxOutlinedRect(ctx, 68, 56, 88, 18, '#3f2e21');
    pxRect(ctx, 72, 58, 80, 6, '#57402e');
    // White X-braced barn doors & hayloft window
    pxOutlinedRect(ctx, 96, 92, 32, 28, '#7f1d1d', '#f8fafc');
    pxRect(ctx, 111, 92, 2, 28, '#f8fafc');
    pxOutlinedRect(ctx, 104, 76, 16, 11, '#1c1917', '#f8fafc');

    // Windmill tower base (blades animate live in renderBiomeBackground!)
    pxOutlinedRect(ctx, 434, 54, 12, 68, '#57534e');
    pxRect(ctx, 437, 56, 6, 64, '#78716c');

    // Splintered wooden ranch fence along upper road
    for (let fx = 16; fx < 610; fx += 26) {
      if (fx > 250 && fx < 355) continue;
      pxOutlinedRect(ctx, fx, 148, 4, 20, '#5c4028');
      pxRect(ctx, fx, 152, 26, 3, '#785536');
      pxRect(ctx, fx, 160, 26, 3, '#63452b');
    }

    // Rolled Golden Hay Bales
    [204, 378, 512].forEach((hx, idx) => {
      const hy = 132 + (idx % 2) * 10;
      drawCrispShadow(ctx, hx + 13, hy + 20, 14, 4);
      pxOutlinedRect(ctx, hx, hy, 26, 20, '#ca8a04');
      pxRect(ctx, hx + 2, hy + 2, 22, 6, '#eab308');
      pxRect(ctx, hx + 6, hy + 8, 14, 8, '#a16207');
    });

    renderWreckedSUV(ctx, 258, 110);
  } else if (biome === 'graveyard') {
    // Eerie slate-indigo moonlit night sky
    drawDitheredSky(ctx, ['#0f172a', '#1e293b', '#273549', '#334155'], [24, 24, 24, 28]);

    // Stars & Huge Cratered Full Moon
    for (let s = 0; s < 36; s++) {
      const sx = hash32(s, 7, seed) % LOGICAL_WIDTH;
      const sy = hash32(s, 13, seed) % 62;
      pxRect(ctx, sx, sy, 1, 1, s % 3 === 0 ? '#fef08a' : '#cbd5e1');
    }
    pxOutlinedRect(ctx, 536, 14, 28, 28, '#fef9c3', '#475569');
    pxRect(ctx, 540, 18, 20, 20, '#fef08a');
    pxRect(ctx, 544, 22, 5, 5, '#eab308');
    pxRect(ctx, 553, 29, 4, 4, '#eab308');

    // Distant dead treeline & gothic hills
    pxRect(ctx, 0, 86, LOGICAL_WIDTH, 22, '#1a202c');
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 68, '#262f38');

    // Gothic Stone Mausoleum
    pxOutlinedRect(ctx, 92, 68, 64, 52, '#475569');
    pxRect(ctx, 95, 71, 58, 46, '#64748b');
    pxOutlinedRect(ctx, 86, 58, 76, 12, '#334155');
    pxOutlinedRect(ctx, 119, 46, 10, 12, '#475569'); // Stone cross top
    pxOutlinedRect(ctx, 115, 49, 18, 4, '#475569');
    pxOutlinedRect(ctx, 112, 86, 24, 34, '#0f172a'); // Dark crypt doorway

    // Twisted Gnarled Dead Oaks
    [42, 224, 468, 590].forEach((tx) => {
      pxOutlinedRect(ctx, tx, 56, 6, 62, '#1e1b18');
      pxRect(ctx, tx - 10, 64, 12, 3, '#1e1b18');
      pxRect(ctx, tx + 5, 70, 14, 3, '#1e1b18');
      pxRect(ctx, tx - 6, 78, 8, 2, '#1e1b18');
    });

    // Wrought-iron spiked cemetery fence + mossy tombstones
    for (let fx = 12; fx < 620; fx += 10) {
      if (fx > 250 && fx < 355) continue;
      pxRect(ctx, fx, 134, 2, 26, '#0f172a');
      pxRect(ctx, fx, 132, 2, 2, '#94a3b8');
    }
    pxRect(ctx, 10, 140, 610, 2, '#0f172a');
    pxRect(ctx, 10, 154, 610, 2, '#0f172a');

    for (let gx = 36; gx < 590; gx += 46) {
      if (gx > 245 && gx < 360) continue;
      const gy = 142 + (hash32(gx, 9, seed) % 16);
      pxOutlinedRect(ctx, gx, gy, 13, 18, '#64748b');
      pxRect(ctx, gx + 2, gy + 2, 9, 4, '#94a3b8');
      pxRect(ctx, gx + 1, gy + 12, 6, 5, '#3f6212'); // Moss
    }

    // Wrought-iron streetlamps
    [198, 442].forEach((lx) => {
      pxOutlinedRect(ctx, lx, 92, 4, 78, '#18181b');
      pxOutlinedRect(ctx, lx - 3, 84, 10, 9, '#fef08a');
    });

    renderWreckedSUV(ctx, 256, 108);
  } else {
    // junkyard_city: Industrial apocalyptic city & refinery skyline
    drawDitheredSky(ctx, ['#573b26', '#7c4d2b', '#a1622f', '#c27d38'], [22, 22, 24, 28]);

    // Ruined City Skyscrapers on horizon
    const buildings = [
      { x: 18, w: 38, h: 52 },
      { x: 64, w: 46, h: 66 },
      { x: 122, w: 34, h: 44 },
      { x: 180, w: 52, h: 60 },
      { x: 368, w: 44, h: 58 },
      { x: 422, w: 54, h: 70 },
      { x: 548, w: 42, h: 54 },
    ];
    buildings.forEach((b) => {
      const by = 104 - b.h;
      pxOutlinedRect(ctx, b.x, by, b.w, b.h, '#27272a');
      pxRect(ctx, b.x + 2, by + 2, b.w - 4, b.h - 4, '#3f3f46');
      for (let wy = by + 6; wy < 98; wy += 8) {
        for (let wx = b.x + 5; wx < b.x + b.w - 7; wx += 7) {
          const lit = hash32(wx, wy, seed) % 7 === 0;
          pxRect(ctx, wx, wy, 4, 5, lit ? '#f59e0b' : '#18181b');
        }
      }
    });

    // Refinery Smokestacks (flares & smoke animate live!)
    [298, 326, 508].forEach((sx) => {
      pxOutlinedRect(ctx, sx, 38, 10, 68, '#334155');
      pxRect(ctx, sx + 2, 38, 3, 68, '#64748b');
      pxRect(ctx, sx, 46, 10, 3, '#dc2626');
      pxRect(ctx, sx, 54, 10, 3, '#f8fafc');
    });

    // Cracked urban lot & crushed car stacks
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 68, '#3f3c38');
    pxRect(ctx, 0, 104, LOGICAL_WIDTH, 7, '#292724');

    // Concrete Jersey Barriers with Bayer hazard stripes along road shoulder
    for (let bx = 22; bx < 600; bx += 68) {
      if (bx > 240 && bx < 365) continue;
      pxOutlinedRect(ctx, bx, 154, 48, 16, '#71717a');
      pxRect(ctx, bx + 2, 155, 44, 4, '#a1a1aa');
      for (let hx = bx + 4; hx < bx + 42; hx += 10) {
        pxRect(ctx, hx, 162, 5, 6, '#eab308');
        pxRect(ctx, hx + 5, 162, 5, 6, '#18181b');
      }
    }

    renderWreckedSUV(ctx, 256, 108);
  }

  // Upper road curb / grass overhang
  const vergeCol =
    biome === 'junkyard_city'
      ? '#52525b'
      : biome === 'graveyard'
      ? '#334155'
      : '#69623b';
  pxRect(ctx, 0, 170, LOGICAL_WIDTH, 10, vergeCol);
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 7) {
    const h = 3 + (hash32(gx, 19, seed) % 4);
    pxRect(ctx, gx, 177, 5, h, '#27272a');
  }

  buildProceduralRoad(ctx, biome, seed);

  // Bottom foreground trench
  pxRect(ctx, 0, 278, LOGICAL_WIDTH, 13, vergeCol);
  pxRect(ctx, 0, 291, LOGICAL_WIDTH, 45, '#2b2820');
  pxRect(ctx, 0, 305, LOGICAL_WIDTH, 31, '#1f1d17');

  bakedBiomeCache.set(key, canvas);
  return canvas;
}

export function renderBiomeBackground(
  ctx: CanvasRenderingContext2D,
  biome: BiomeType,
  time: number,
  seed = 1
) {
  const baked = getBakedBiomeCanvas(biome, seed);
  ctx.drawImage(baked, 0, 0);

  // Live lightweight biome animations for atmospheric life!
  if (biome === 'farm_crossing') {
    // Spinning windmill blades at (440, 56) + smoldering hay smoke
    const hubX = 440;
    const hubY = 56;
    ctx.save();
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 2;
    for (let b = 0; b < 4; b++) {
      const ang = time * 1.4 + (b * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(hubX, hubY);
      ctx.lineTo(hubX + Math.cos(ang) * 20, hubY + Math.sin(ang) * 20);
      ctx.stroke();
    }
    pxOutlinedRect(ctx, hubX - 2, hubY - 2, 4, 4, '#dc2626');
    ctx.restore();
  } else if (biome === 'graveyard') {
    // Drifting parallax ectoplasmic ground fog + flickering streetlamp halos
    const fogShift1 = (time * 14) % LOGICAL_WIDTH;
    const fogShift2 = (time * 8) % LOGICAL_WIDTH;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.13)';
    for (let i = -1; i <= 2; i++) {
      ctx.fillRect(i * 260 + fogShift1 * 0.4, 156, 170, 12);
      ctx.fillRect(i * 290 - fogShift2 * 0.3, 266, 195, 10);
    }
  } else if (biome === 'junkyard_city') {
    // Flickering refinery gas flares & rising industrial smoke puffs
    [303, 331, 513].forEach((sx, idx) => {
      const flicker = Math.round(Math.sin(time * 18 + idx * 2) * 2);
      pxRect(ctx, sx - 3, 30 - flicker, 6, 8 + flicker, '#f97316');
      pxRect(ctx, sx - 1, 32 - flicker, 3, 5, '#fde047');
      const puffY = (time * 18 + idx * 9) % 26;
      ctx.fillStyle = 'rgba(24, 24, 27, 0.38)';
      ctx.fillRect(sx - 5, 18 - puffY, 12, 8);
    });
  }

  // Drifting atmospheric dust motes across all biomes
  ctx.fillStyle =
    biome === 'graveyard' ? 'rgba(186, 230, 253, 0.35)' : 'rgba(254, 240, 138, 0.32)';
  for (let m = 0; m < 10; m++) {
    const mx = Math.round((m * 79 + time * (10 + (m % 4) * 3)) % LOGICAL_WIDTH);
    const my = Math.round(90 + ((m * 37) % 175) + Math.sin(time * 2 + m) * 4);
    ctx.fillRect(mx, my, 2, 1);
  }
}

export function renderForegroundLeftProps(ctx: CanvasRenderingContext2D) {
  const tx = -4;
  const ty = 208;

  // Military Truck Cab in bottom-left foreground
  pxOutlinedRect(ctx, tx, ty, 56, 44, '#484a36');
  pxOutlinedRect(ctx, tx + 2, ty + 2, 50, 7, '#5c5f46');
  pxOutlinedRect(ctx, tx + 8, ty + 13, 38, 23, '#171a14');
  pxRect(ctx, tx + 10, ty + 15, 12, 6, '#33382b');
  pxRect(ctx, tx + 26, ty + 13, 2, 23, '#363829');

  pxOutlinedRect(ctx, tx, ty + 40, 72, 46, '#3d402e');
  pxRect(ctx, tx + 2, ty + 42, 66, 7, '#52563e');
  pxOutlinedRect(ctx, tx + 44, ty + 51, 24, 26, '#22241a');
  for (let gx = tx + 47; gx <= tx + 64; gx += 4) {
    pxRect(ctx, gx, ty + 54, 2, 20, '#3d402e');
  }
  pxOutlinedRect(ctx, tx + 8, ty + 70, 28, 26, '#181a14');
  pxOutlinedRect(ctx, tx + 14, ty + 76, 16, 14, '#36382c');

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
  const engineBob = Math.round(Math.sin(time * 15) * 0.6);
  const ratio = Math.max(0, hp / maxHp);

  // Ground Shadow
  drawCrispShadow(ctx, x + 78, y + 75, 84, 9);

  // Warm Conical Headlight Beam projecting onto the road!
  ctx.save();
  const beamGrad = ctx.createLinearGradient(x + 154, y + 56, x + 265, y + 72);
  beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
  beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(x + 154, y + 54 + engineBob);
  ctx.lineTo(x + 268, y + 40);
  ctx.lineTo(x + 268, y + 88);
  ctx.lineTo(x + 154, y + 61 + engineBob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Main School Bus Body (4 tonal bands + rivets)
  pxOutlinedRect(ctx, x, y + engineBob, 128, 68, '#d99b1e');
  pxRect(ctx, x + 1, y + 1 + engineBob, 126, 12, '#f2b830');
  pxOutlinedRect(ctx, x + 2, y - 6 + engineBob, 120, 9, '#f5c842');
  pxRect(ctx, x + 4, y - 5 + engineBob, 114, 3, '#fde68a');
  pxOutlinedRect(ctx, x + 114, y - 8 + engineBob, 5, 4, '#dc2626');

  // Panel seams & 1x1 steel rivets
  for (let rx = x + 22; rx <= x + 88; rx += 22) {
    pxRect(ctx, rx, y + 4 + engineBob, 1, 60, '#926512');
    pxRect(ctx, rx + 2, y + 36 + engineBob, 1, 1, '#fef08a');
    pxRect(ctx, rx + 2, y + 52 + engineBob, 1, 1, '#fef08a');
  }

  // Lower Shaded Body Panel + Mud/Weathering
  pxRect(ctx, x + 1, y + 36 + engineBob, 126, 31, '#b87f16');
  pxRect(ctx, x + 1, y + 56 + engineBob, 126, 11, '#785214');

  // Welded hull armor plates if upgraded
  if (weldedArmor) {
    pxOutlinedRect(ctx, x + 8, y + 49 + engineBob, 82, 12, '#52525b');
    pxRect(ctx, x + 10, y + 51 + engineBob, 78, 3, '#94a3b8');
    for (let rx = x + 12; rx <= x + 84; rx += 12) {
      pxRect(ctx, rx, y + 56 + engineBob, 2, 2, '#27272a');
    }
  }

  // Roof Luggage Rack on left + Red Barrel strapped on top
  renderOilDrum(ctx, x + 4, y - 29 + engineBob, '#b91c1c', '#dc2626', '#ef4444', 0, true);
  pxOutlinedRect(ctx, x + 26, y - 20 + engineBob, 18, 9, '#4d573c'); // Ammo crate on roof
  pxRect(ctx, x + 28, y - 18 + engineBob, 14, 2, '#738259');
  pxRect(ctx, x, y - 12 + engineBob, 60, 2, '#1c1917');
  for (let rx = x + 4; rx <= x + 56; rx += 12) {
    pxRect(ctx, rx, y - 12 + engineBob, 2, 6, '#1c1917');
  }

  // Protruding Front Engine Hood
  pxOutlinedRect(ctx, x + 124, y + 26 + engineBob, 32, 42, '#d99b1e');
  pxRect(ctx, x + 124, y + 27 + engineBob, 30, 7, '#f5c842');
  pxRect(ctx, x + 128, y + 38 + engineBob, 14, 2, '#6b4710');
  pxRect(ctx, x + 128, y + 42 + engineBob, 14, 2, '#6b4710');

  // Heavy Blood splatter on front nose of the bus
  pxRect(ctx, x + 140, y + 32 + engineBob, 14, 20, '#991b1b');
  pxRect(ctx, x + 134, y + 39 + engineBob, 10, 15, '#7f1d1d');
  pxRect(ctx, x + 129, y + 46 + engineBob, 6, 8, '#991b1b');

  // Front Grille, Heavy Bumper & Glowing Headlight
  pxOutlinedRect(ctx, x + 150, y + 34 + engineBob, 6, 22, '#27272a');
  pxOutlinedRect(ctx, x + 149, y + 54 + engineBob, 7, 6, '#fef08a');
  pxRect(ctx, x + 151, y + 55 + engineBob, 4, 4, '#ffffff');
  pxOutlinedRect(ctx, x + 146, y + 60 + engineBob, 12, 7, '#3f3f46');

  // Black Side Trim Rub-Rails & "BOARD OF EDUCATION" Stencil
  pxRect(ctx, x, y + 33 + engineBob, 96, 2, '#1c1917');
  pxRect(ctx, x, y + 47 + engineBob, 96, 2, '#1c1917');
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOARD OF EDUCATION', x + 4, y + 43 + engineBob);

  // Bus Windows with glass reflection & reinforced bars
  for (let wx = x + 6; wx <= x + 76; wx += 17) {
    pxOutlinedRect(ctx, wx, y + 8 + engineBob, 14, 20, '#1e293b');
    pxRect(ctx, wx + 2, y + 10 + engineBob, 10, 7, '#334155');
    pxRect(ctx, wx + 3, y + 11 + engineBob, 4, 3, '#94a3b8');
    pxRect(ctx, wx, y + 17 + engineBob, 14, 2, '#14110f');
    if (weldedArmor) {
      pxRect(ctx, wx - 1, y + 12 + engineBob, 16, 3, '#94a3b8');
      pxRect(ctx, wx - 1, y + 21 + engineBob, 16, 3, '#64748b');
    }
  }

  // Folding Accordion Passenger Door (glows warmly inside when deploying unit!)
  const doorOpen = doorOpenTimer > 0;
  pxOutlinedRect(
    ctx,
    x + 96,
    y + 8 + engineBob,
    20,
    56,
    doorOpen ? '#451a03' : '#855f16'
  );
  if (doorOpen) {
    pxRect(ctx, x + 100, y + 12 + engineBob, 12, 48, '#f59e0b');
    pxRect(ctx, x + 103, y + 16 + engineBob, 6, 40, '#fde68a');
  } else {
    pxOutlinedRect(ctx, x + 99, y + 12 + engineBob, 5, 22, '#1e293b');
    pxOutlinedRect(ctx, x + 107, y + 12 + engineBob, 5, 22, '#1e293b');
    pxOutlinedRect(ctx, x + 99, y + 38 + engineBob, 5, 20, '#6b4c12');
    pxOutlinedRect(ctx, x + 107, y + 38 + engineBob, 5, 20, '#6b4c12');
  }

  // Detailed Front & Rear Wheel Wells
  pxOutlinedRect(ctx, x + 120, y + 49, 28, 12, '#18181b');
  pxOutlinedRect(ctx, x + 122, y + 52, 24, 24, '#18181b');
  pxOutlinedRect(ctx, x + 126, y + 56, 16, 16, '#3f3f46');
  pxOutlinedRect(ctx, x + 130, y + 60, 8, 8, '#cbd5e1');
  pxRect(ctx, x + 133, y + 63, 2, 2, '#18181b');

  // Heavy Spiked Cowcatcher Plow
  if (spikedBumper) {
    pxOutlinedRect(ctx, x + 154, y + 46 + engineBob, 7, 22, '#52525b');
    pxOutlinedRect(ctx, x + 158, y + 48 + engineBob, 10, 4, '#dc2626');
    pxOutlinedRect(ctx, x + 160, y + 54 + engineBob, 13, 4, '#e2e8f0');
    pxOutlinedRect(ctx, x + 158, y + 60 + engineBob, 10, 4, '#dc2626');
  }

  // Exhaust & Engine Damage Smoke / Sparks when HP < 45%
  const smokePhase = (time * 18) % 24;
  ctx.fillStyle = ratio < 0.45 ? 'rgba(15, 15, 15, 0.68)' : 'rgba(40, 36, 32, 0.38)';
  ctx.fillRect(x + 130, y + 4 - smokePhase, 12, 9);
  ctx.fillRect(x + 124, y - 10 - smokePhase * 1.1, 15, 10);
  if (ratio < 0.45 && Math.sin(time * 32) > 0.2) {
    pxRect(ctx, x + 136, y + 22, 3, 3, '#fde047');
    pxRect(ctx, x + 140, y + 19, 2, 2, '#f97316');
  }

  // =======================================================
  // SHERIFF BILL IN THE OPEN ROOF HATCH (Recoil & Flash)
  // =======================================================
  const recoil = billFiringTimer > 0 ? -2 : 0;
  const bx = x + 84 + recoil;
  const by = y - 20 + engineBob;

  pxOutlinedRect(ctx, x + 78, by + 12, 22, 4, '#f2b830');
  pxOutlinedRect(ctx, bx, by + 2, 12, 11, '#57534e');
  pxRect(ctx, bx + 2, by + 3, 10, 5, '#f5b882');
  pxOutlinedRect(ctx, bx + 1, by - 7, 10, 9, '#f5b882');
  pxRect(ctx, bx + 8, by - 4, 2, 2, '#18181b');
  pxRect(ctx, bx + 3, by - 2, 8, 3, '#451a03');

  // White Sheriff Hat
  pxOutlinedRect(ctx, bx - 4, by - 10, 20, 4, '#e7e5e4');
  pxOutlinedRect(ctx, bx, by - 15, 12, 6, '#f8fafc');
  pxRect(ctx, bx, by - 10, 12, 2, '#78350f');

  // Long Hunting Rifle
  pxOutlinedRect(ctx, bx + 6, by + 3, 26, 3, '#1c1917');
  pxRect(ctx, bx + 8, by + 3, 20, 1, '#94a3b8');
  pxRect(ctx, bx + 2, by + 4, 8, 3, '#78350f');
  if (billFiringTimer > 0) {
    pxRect(ctx, bx + 32, by, 14, 8, '#f97316');
    pxRect(ctx, bx + 34, by + 2, 18, 4, '#fef08a');
    pxRect(ctx, bx + 36, by + 3, 14, 2, '#ffffff');
  }

  // Segmented Bus Health Bar above hood
  const barW = 54;
  const barX = x + 108;
  const barY = by + 15;
  pxOutlinedRect(ctx, barX, barY, barW, 6, '#09090b');
  const hpCol = ratio >= 0.85 ? '#22c55e' : ratio >= 0.45 ? '#eab308' : '#ef4444';
  const fillW = Math.round((barW - 2) * ratio);
  pxRect(ctx, barX + 1, barY + 1, fillW, 4, hpCol);
  pxRect(ctx, barX + 1, barY + 1, fillW, 1, '#ffffff');
}

export function renderBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  hp: number,
  maxHp: number,
  shakeTimer: number,
  time = 0
) {
  const ratio = Math.max(0, hp / maxHp);
  const shakeX = shakeTimer > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
  const bx = Math.round(x + shakeX);

  // Ground fortification shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(bx - 46, ROAD_Y_MIN - 4, 94, ROAD_Y_MAX - ROAD_Y_MIN + 26);

  // Stage 1..4 progressive destruction geometry
  pxOutlinedRect(ctx, bx - 6, 144, 24, ratio > 0.5 ? 40 : 26, '#27272a');
  for (let ry = 150; ry <= (ratio > 0.5 ? 178 : 166); ry += 6) {
    pxRect(ctx, bx - 4, ry, 20, 2, '#71717a');
  }

  if (ratio > 0.35) {
    pxOutlinedRect(ctx, bx + 4, 174, 30, 18, '#eab308');
    pxRect(ctx, bx + 8, 174, 5, 18, '#18181b');
    pxRect(ctx, bx + 18, 174, 5, 18, '#18181b');
    pxRect(ctx, bx + 28, 174, 4, 18, '#18181b');
  }

  if (ratio > 0.25) {
    const drumDmg = ratio < 0.6 ? 1 : 0;
    renderOilDrum(ctx, bx - 18, 188, '#294257', '#3b5d7a', '#4d779c', drumDmg);
    if (ratio > 0.55) {
      renderOilDrum(ctx, bx + 2, 198, '#574c35', '#736548', '#8a7957', drumDmg);
    }
  }

  // Red Overturned Car Hood / Wrecked Door
  if (ratio > 0.15) {
    const hoodH = ratio > 0.45 ? 46 : 30;
    pxOutlinedRect(ctx, bx - 24, 218 + (46 - hoodH), 36, hoodH, '#b91c1c');
    pxRect(ctx, bx - 21, 221 + (46 - hoodH), 30, 12, '#dc2626');
    pxRect(ctx, bx - 18, 224 + (46 - hoodH), 14, 5, '#fca5a5');
  }

  pxOutlinedRect(ctx, bx - 46, 242, 26, 22, '#ca8a04');
  pxRect(ctx, bx - 46, 250, 26, 12, '#27272a');
  renderOilDrum(ctx, bx - 56, 260, '#333b42', '#49545e', '#5d6b78', ratio < 0.5 ? 1 : 0);

  // Stacked Rubber Tires & Barbed Wire
  pxOutlinedRect(ctx, bx - 36, 264, 22, 10, '#18181b');
  pxOutlinedRect(ctx, bx - 34, 272, 22, 10, '#27272a');

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  for (let wx = bx - 8; wx <= bx + 20; wx += 8) {
    ctx.beginPath();
    ctx.arc(wx, 264, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  pxOutlinedRect(ctx, bx + 22, 234, 24, 48, '#27272a');

  // Rising black smoke & sparks when barricade < 55% HP
  if (ratio < 0.55) {
    const puff = (time * 20) % 22;
    ctx.fillStyle = 'rgba(20, 20, 22, 0.52)';
    ctx.fillRect(bx - 16, 206 - puff, 14, 10);
    if (ratio < 0.3 && Math.sin(time * 28) > 0) {
      pxRect(ctx, bx - 10, 214, 4, 4, '#f97316');
      pxRect(ctx, bx - 8, 212, 2, 2, '#fde047');
    }
  }

  // Structural Integrity Bar above Barricade
  const barW = 58;
  const barX = bx - 34;
  const barY = 132;
  pxOutlinedRect(ctx, barX, barY, barW, 6, '#09090b');
  const fillW = Math.round((barW - 2) * ratio);
  pxRect(ctx, barX + 1, barY + 1, fillW, 4, '#f59e0b');
  pxRect(ctx, barX + 1, barY + 1, fillW, 1, '#fef08a');
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
  const fillW = Math.round(barW * ratio);
  pxRect(ctx, bx + 10, by, fillW, 4, isSurvivor ? '#22c55e' : '#ef4444');
  if (fillW > 1) {
    pxRect(ctx, bx + 10, by, fillW, 1, isSurvivor ? '#86efac' : '#fca5a5');
  }
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
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.92)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crisp Pixel Ground Shadow (compresses when airborne!)
  const shadowScale = Math.max(0.55, 1 - z * 0.012);
  drawCrispShadow(
    ctx,
    x,
    y,
    Math.round((unit.subType === 'bloated' ? 11 : 7) * shadowScale),
    Math.max(2, Math.round(3 * shadowScale))
  );

  // Infected Corpse Lying on Road (with clear green bubbling in final 1.8s so player can burn it!)
  if (unit.state === 'corpse') {
    const rem = unit.corpseTimer ?? 6.0;
    const maxT = unit.corpseMaxTimer ?? 6.0;
    const isUrgent = rem <= 1.8;
    const twitchX = isUrgent ? Math.sin(time * 55) * 2.2 : Math.sin(time * 18) * 0.6;
    const cx = Math.round(x + twitchX);

    pxRect(ctx, cx - 16, y - 3, 32, 6, '#7f1d1d');
    pxOutlinedRect(ctx, cx - 13, y - 7, 17, 6, '#3f422e');
    pxOutlinedRect(ctx, cx + 4, y - 8, 8, 7, isUrgent ? '#84cc16' : '#658544');

    const sporeY = Math.round((time * (isUrgent ? 36 : 18)) % 15);
    pxRect(ctx, cx - 5, y - 10 - sporeY, 2, 2, '#a3e635');
    pxRect(ctx, cx + 4, y - 6 - ((sporeY + 6) % 15), 2, 2, '#bef264');
    if (isUrgent) {
      pxRect(ctx, cx, y - 12 - ((sporeY + 3) % 12), 3, 3, '#4ade80');
      // Small warning bar above corpse
      const prog = Math.max(0, 1 - rem / maxT);
      pxOutlinedRect(ctx, cx - 10, y - 18, 20, 3, '#14110f');
      pxRect(ctx, cx - 9, y - 17, Math.round(18 * prog), 1, '#a3e635');
    }
    return;
  }

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
  const telegraphTint =
    (unit.critTelegraphTimer ?? 0) > 0 && Math.floor(time * 30) % 2 === 0
      ? '#fb923c'
      : undefined;
  const dir = unit.facing;
  const legStride = Math.round(walkCycle * 3);

  if (unit.team === 'survivor') {
    if (unit.subType === 'drone') {
      const hoverZ = 34 + Math.round(Math.sin(time * 7 + unit.animTime) * 2.5);
      const droneY = y - hoverZ;

      const bladeW = Math.sin(time * 48) > 0 ? 8 : 3;
      pxRect(ctx, x - 6 - Math.floor(bladeW / 2), droneY - 12, bladeW, 1, '#f8fafc');
      pxRect(ctx, x + 6 - Math.floor(bladeW / 2), droneY - 12, bladeW, 1, '#f8fafc');

      drawPixelMatrix(ctx, DRONE_MATRIX, BASE_PALETTE, x, droneY - 2, dir, flash, '#bae6fd');

      // Tactical searchlight cone + laser scanner
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, droneY - 2);
      ctx.lineTo(x + dir * 58, y + 4);
      ctx.lineTo(x + dir * 82, y - 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle =
        unit.state === 'attack' ? 'rgba(250, 204, 21, 0.92)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = unit.state === 'attack' ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * 4, droneY - 3);
      ctx.lineTo(x + dir * 75, y - 4);
      ctx.stroke();

      if (unit.state === 'attack' && unit.attackProgress < 0.5) {
        pxRect(ctx, x + dir * 6, droneY - 4, 7 * dir, 4, '#fde047');
      }

      renderUnitLevelAndHealthBar(ctx, x, droneY - 18, unit.level, unit.hp, unit.maxHp, true);
      return;
    }

    if (unit.subType === 'turret') {
      drawPixelMatrix(ctx, TURRET_MATRIX, BASE_PALETTE, x, y - z, dir, flash, '#cbd5e1');
      const recoilX = unit.state === 'attack' ? -1 * dir : 0;
      pxOutlinedRect(
        ctx,
        x + dir * 3 + recoilX,
        y - z - 11,
        15 * dir,
        4,
        flash ? '#fff' : '#27272a'
      );
      pxRect(ctx, x + dir * 5 + recoilX, y - z - 10, 12 * dir, 1, '#cbd5e1');
      if (unit.state === 'attack') {
        pxRect(ctx, x + dir * 18, y - z - 14, 10 * dir, 8, '#f97316');
        pxRect(ctx, x + dir * 20, y - z - 12, 12 * dir, 4, '#fef08a');
      }
      renderUnitLevelAndHealthBar(ctx, x, y - z - 20, unit.level, unit.hp, unit.maxHp, true);
      return;
    }

    if (unit.subType === 'hound') {
      const lungeX =
        unit.state === 'attack'
          ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 7) * dir
          : 0;
      const leapZ =
        unit.state === 'attack' ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 5) : 0;
      pxOutlinedRect(ctx, x - 5 + legStride, y - z - leapZ - 4, 2, 4, flash ? '#fff' : '#451a03');
      pxOutlinedRect(ctx, x + 3 - legStride, y - z - leapZ - 4, 2, 4, flash ? '#fff' : '#451a03');
      drawPixelMatrix(
        ctx,
        HOUND_MATRIX,
        BASE_PALETTE,
        x + lungeX,
        drawY - leapZ - 3,
        dir,
        flash,
        '#fed7aa'
      );
      renderUnitLevelAndHealthBar(
        ctx,
        x,
        drawY - leapZ - 21,
        unit.level,
        unit.hp,
        unit.maxHp,
        true
      );
      return;
    }

    // Human Survivors with 1px Rim Light & Reload Indicator
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

    const rimCol =
      unit.subType === 'policeman' || unit.subType === 'juggernaut'
        ? '#93c5fd'
        : '#fef3c7';

    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 5, dir, flash, rimCol, telegraphTint);

    const swing = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) : 0;
    if (unit.subType === 'sniper') {
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      pxOutlinedRect(
        ctx,
        x + dir * 2 + recoilX,
        drawY - 19,
        20 * dir,
        3,
        flash ? '#fff' : '#18181b'
      );
      pxOutlinedRect(ctx, x + dir * 6 + recoilX, drawY - 22, 6 * dir, 2, '#64748b');
      // Red Laser Sight Beam
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.58)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + dir * 22, drawY - 18);
      ctx.lineTo(x + dir * 210, drawY - 18);
      ctx.stroke();

      if (unit.state === 'attack' && unit.attackProgress < 0.38) {
        pxRect(ctx, x + dir * 22, drawY - 22, 12 * dir, 7, '#fde047');
        pxRect(ctx, x + dir * 24, drawY - 20, 16 * dir, 3, '#ffffff');
      }
    } else if (unit.subType === 'flamethrower') {
      pxOutlinedRect(ctx, x + dir * 2, drawY - 18, 13 * dir, 4, flash ? '#fff' : '#27272a');
      pxRect(ctx, x + dir * 14, drawY - 17, 2 * dir, 2, '#f97316'); // Pilot flame
      if (unit.state === 'attack') {
        const wave = Math.round(Math.sin(time * 40) * 2);
        pxRect(ctx, x + dir * 15, drawY - 23 + wave, 34 * dir, 11, 'rgba(220, 38, 38, 0.85)');
        pxRect(ctx, x + dir * 15, drawY - 21 + wave, 26 * dir, 7, '#f97316');
        pxRect(ctx, x + dir * 15, drawY - 19, 16 * dir, 4, '#fde047');
        pxRect(ctx, x + dir * 15, drawY - 18, 8 * dir, 2, '#ffffff');
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
        pxRect(ctx, x + dir * 16, drawY - 23, 9 * dir, 9, '#f97316');
        pxRect(ctx, x + dir * 18, drawY - 21, 11 * dir, 5, '#fef08a');
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
          : unit.firstHitReady
          ? '#fde047'
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

    // Subtle reload progress bar when reloading
    if (unit.state === 'reload') {
      pxOutlinedRect(ctx, x - 8, drawY - 40, 16, 2, '#09090b');
      pxRect(ctx, x - 7, drawY - 40, Math.round(14 * unit.reloadProgress), 2, '#38bdf8');
    }

    if (unit.isLucky) {
      renderGoldenDottedHalo(ctx, x, drawY - 41, time);
    }

    renderUnitLevelAndHealthBar(ctx, x, drawY - 35, unit.level, unit.hp, unit.maxHp, true);
  } else {
    // Zombies with 1px Rim Light & Critical Strike Telegraph
    const isBloated = unit.subType === 'bloated';
    const footW = isBloated ? 4 : 3;
    pxOutlinedRect(ctx, x - 4 + legStride, y - z - 6, footW, 6, flash ? '#fff' : '#1c1917');
    pxOutlinedRect(ctx, x + 1 - legStride, y - z - 6, footW, 6, flash ? '#fff' : '#1c1917');

    if (unit.subType === 'crit_zombie') {
      const pulse = (unit.critTelegraphTimer ?? 0) > 0 ? 0.52 : 0.24;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.beginPath();
      ctx.ellipse(x, drawY - 18, 10, 16, 0, 0, Math.PI * 2);
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

    const zRim =
      unit.subType === 'armored'
        ? '#cbd5e1'
        : unit.subType === 'crit_zombie'
        ? '#fca5a5'
        : '#d9f99d';

    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 5, dir, flash, zRim, telegraphTint);

    if (unit.state === 'attack') {
      const swipeX = Math.round(Math.sin(unit.attackProgress * Math.PI) * 7) * dir;
      pxOutlinedRect(
        ctx,
        x + dir * 4 + swipeX,
        drawY - 20,
        6 * dir,
        3,
        flash ? '#fff' : '#7fa655'
      );
      pxRect(ctx, x + dir * 9 + swipeX, drawY - 20, 2 * dir, 3, '#ef4444');
    }

    const topOffset = isBloated ? 36 : 33;
    renderUnitLevelAndHealthBar(ctx, x, drawY - topOffset, unit.level, unit.hp, unit.maxHp, false);
  }
}

export function renderFireZone(
  ctx: CanvasRenderingContext2D,
  fz: RenderFireZone,
  time: number
) {
  const x = Math.round(fz.x);
  const y = Math.round(fz.y);
  const r = fz.radius;
  const alpha = Math.min(1, fz.duration / 1.2);

  ctx.save();
  ctx.globalAlpha = alpha;
  // Scorched asphalt base
  ctx.fillStyle = 'rgba(24, 16, 12, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dancing pixel-art flame tongues
  const tongues = 9;
  for (let i = 0; i < tongues; i++) {
    const ang = (i / tongues) * Math.PI * 2 + time * 1.6;
    const dist = (i % 3) * 0.28 * r;
    const fx = Math.round(x + Math.cos(ang) * dist * 0.9);
    const fy = Math.round(y + Math.sin(ang) * dist * 0.38);
    const fh = 7 + Math.round(Math.abs(Math.sin(time * 16 + i * 2.1)) * 9);
    pxRect(ctx, fx - 4, fy - fh, 8, fh, '#dc2626');
    pxRect(ctx, fx - 3, fy - Math.round(fh * 0.72), 6, Math.round(fh * 0.72), '#f97316');
    pxRect(ctx, fx - 2, fy - Math.round(fh * 0.4), 4, Math.round(fh * 0.4), '#fde047');
  }
  ctx.restore();
}

export function renderTracersAndShells(
  ctx: CanvasRenderingContext2D,
  tracers: RenderTracer[],
  shells: RenderShell[]
) {
  // 1. Flying 2.5D Brass & Shotgun Shells
  for (let i = 0; i < shells.length; i++) {
    const s = shells[i];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.w, 1);
    ctx.fillStyle = s.color;
    ctx.fillRect(Math.round(s.x), Math.round(s.y - s.z), s.w, s.h);
  }

  // 2. Crisp Ballistic Tracers & Supersonic Sniper Trails
  for (let i = 0; i < tracers.length; i++) {
    const t = tracers[i];
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = t.width + 1.2;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    ctx.strokeStyle = t.coreColor;
    ctx.lineWidth = Math.max(1, t.width - 0.5);
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    if (t.isSniper) {
      // Shockwave ring midway along supersonic shot
      const mx = (t.x1 + t.x2) * 0.5;
      const my = (t.y1 + t.y2) * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(mx, my, 3, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================================
// 1/4-RESOLUTION DYNAMIC LIGHTMAP (180x84 -> 720x336, ~0.22ms on mobile!)
// ============================================================================
let lightmapCanvas: HTMLCanvasElement | null = null;
const LM_W = 180;
const LM_H = 84;

function drawLightHalo(
  lctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  radius: number,
  innerCol: string
) {
  const grad = lctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
  grad.addColorStop(0, innerCol);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = grad;
  lctx.beginPath();
  lctx.arc(lx, ly, radius, 0, Math.PI * 2);
  lctx.fill();
}

export function renderDynamicLightmap(
  ctx: CanvasRenderingContext2D,
  biome: BiomeType,
  time: number,
  busX: number,
  busY: number,
  units: RenderUnit[],
  fireZones: RenderFireZone[],
  obstacles: RenderObstacle[],
  tracers: RenderTracer[]
) {
  if (!lightmapCanvas && typeof document !== 'undefined') {
    lightmapCanvas = document.createElement('canvas');
    lightmapCanvas.width = LM_W;
    lightmapCanvas.height = LM_H;
  }
  const lctx = lightmapCanvas?.getContext('2d');
  if (!lctx || !lightmapCanvas) return;

  lctx.clearRect(0, 0, LM_W, LM_H);
  lctx.globalCompositeOperation = 'lighter';

  // 1. Bus headlight glow
  drawLightHalo(lctx, (busX + 185) / 4, (busY + 60) / 4, 22, 'rgba(254, 240, 138, 0.22)');

  // 2. Graveyard streetlamps or Junkyard gas flares
  if (biome === 'graveyard') {
    const flk = 0.22 + Math.sin(time * 9) * 0.04;
    drawLightHalo(lctx, 200 / 4, 118 / 4, 18, `rgba(254, 240, 138, ${flk})`);
    drawLightHalo(lctx, 444 / 4, 118 / 4, 18, `rgba(254, 240, 138, ${flk})`);
  } else if (biome === 'junkyard_city') {
    drawLightHalo(lctx, 303 / 4, 34 / 4, 14, 'rgba(249, 115, 22, 0.25)');
    drawLightHalo(lctx, 513 / 4, 34 / 4, 14, 'rgba(249, 115, 22, 0.25)');
  }

  // 3. FireZones thermal orange glow
  for (let i = 0; i < fireZones.length; i++) {
    const fz = fireZones[i];
    const osc = 1 + Math.sin(time * 16 + i) * 0.1;
    drawLightHalo(
      lctx,
      fz.x / 4,
      fz.y / 4,
      (fz.radius / 4) * 1.45 * osc,
      'rgba(249, 115, 22, 0.36)'
    );
  }

  // 4. Medkit emerald aura & critical red barrels
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'medkit') {
      drawLightHalo(lctx, o.x / 4, o.y / 4, 14, 'rgba(34, 197, 94, 0.28)');
    } else if (o.type === 'red_barrel' && o.hp < o.maxHp * 0.4) {
      drawLightHalo(lctx, o.x / 4, o.y / 4, 9, 'rgba(239, 68, 68, 0.3)');
    }
  }

  // 5. Flamethrowers, muzzle flashes, Berserker auras & Corpse spores
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.state === 'corpse' && (u.corpseTimer ?? 6) <= 1.8) {
      drawLightHalo(lctx, u.x / 4, u.y / 4, 8, 'rgba(132, 204, 22, 0.32)');
    } else if (u.subType === 'flamethrower' && u.state === 'attack') {
      drawLightHalo(
        lctx,
        (u.x + u.facing * 26) / 4,
        (u.y - 16) / 4,
        14,
        'rgba(251, 146, 60, 0.42)'
      );
    } else if (u.subType === 'crit_zombie') {
      drawLightHalo(lctx, u.x / 4, (u.y - 16) / 4, 7, 'rgba(239, 68, 68, 0.22)');
    }
  }

  // 6. Active tracer flashes
  for (let i = 0; i < tracers.length; i++) {
    const t = tracers[i];
    drawLightHalo(lctx, t.x1 / 4, t.y1 / 4, 7, 'rgba(254, 240, 138, 0.3)');
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lightmapCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Subtle cinematic top/bottom vignette for depth
  ctx.globalCompositeOperation = 'source-over';
  const vigTop = ctx.createLinearGradient(0, 0, 0, 26);
  vigTop.addColorStop(0, 'rgba(10, 10, 14, 0.26)');
  vigTop.addColorStop(1, 'rgba(10, 10, 14, 0)');
  ctx.fillStyle = vigTop;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 26);
  ctx.restore();
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
    ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
    ctx.beginPath();
    ctx.ellipse(x, y, 48 + pulse, 21 + pulse * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 48 + pulse, 21 + pulse * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating emerald medical crosses inside field
    for (let c = 0; c < 4; c++) {
      const ang = time * 1.8 + (c * Math.PI) / 2;
      const cx = Math.round(x + Math.cos(ang) * 26);
      const cy = Math.round(y + Math.sin(ang) * 10 - ((time * 16 + c * 4) % 12));
      pxRect(ctx, cx - 1, cy - 3, 2, 6, '#4ade80');
      pxRect(ctx, cx - 3, cy - 1, 6, 2, '#4ade80');
    }

    drawCrispShadow(ctx, x, y + 1, 9, 3);
    pxOutlinedRect(ctx, x - 8, y - z - 11, 16, 11, '#f8fafc');
    pxRect(ctx, x - 6, y - z - 13, 12, 2, '#64748b'); // Handle
    pxRect(ctx, x - 2, y - z - 9, 4, 7, '#ef4444');
    pxRect(ctx, x - 4, y - z - 7, 8, 3, '#ef4444');
    return;
  }

  const isRed = obs.type === 'red_barrel';
  const hpRatio = obs.maxHp > 0 ? obs.hp / obs.maxHp : 1;
  const dmgState: 0 | 1 | 2 = hpRatio < 0.35 ? 2 : hpRatio < 0.7 ? 1 : 0;

  renderOilDrum(
    ctx,
    x - 9,
    y - z - 21,
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#b91c1c' : '#294257',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#dc2626' : '#3b5d7a',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#ef4444' : '#527da3',
    dmgState,
    isRed
  );

  // Small HP bar above damaged barrel
  if (obs.hp < obs.maxHp) {
    pxOutlinedRect(ctx, x - 9, y - z - 27, 18, 3, '#09090b');
    pxRect(
      ctx,
      x - 8,
      y - z - 26,
      Math.round(16 * Math.max(0, hpRatio)),
      1,
      isRed ? '#f97316' : '#38bdf8'
    );
  }
}

export function renderDropPickup(
  ctx: CanvasRenderingContext2D,
  pickup: RenderPickup,
  time: number
) {
  const x = Math.round(pickup.x);
  const y = Math.round(pickup.y);
  const floatZ = Math.round(pickup.z + Math.abs(Math.sin(time * 5)) * 3);

  drawCrispShadow(ctx, x, y, 7, 2);

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

// Standalone Sprite Preview Renderer for Arsenal, Zombiepedia & Garage Cards!
export function renderCharacterPreview(
  ctx: CanvasRenderingContext2D,
  subType: SurvivorType | ZombieType,
  isZombie: boolean,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const cx = Math.round(w / 2);
  const by = Math.round(h - 4);

  const matrix = isZombie
    ? subType === 'bloated'
      ? ZOMBIE_BLOATED_MATRIX
      : subType === 'armored'
      ? ZOMBIE_ARMORED_MATRIX
      : subType === 'crit_zombie'
      ? ZOMBIE_CRIT_MATRIX
      : subType === 'runner'
      ? ZOMBIE_RUNNER_MATRIX
      : subType === 'skeleton'
      ? ZOMBIE_SKELETON_MATRIX
      : ZOMBIE_WALKER_MATRIX
    : subType === 'redneck'
    ? REDNECK_MATRIX
    : subType === 'farmer'
    ? FARMER_MATRIX
    : subType === 'builder'
    ? BUILDER_MATRIX
    : subType === 'policeman'
    ? POLICEMAN_MATRIX
    : subType === 'sniper'
    ? SNIPER_MATRIX
    : subType === 'flamethrower'
    ? FLAMETHROWER_MATRIX
    : subType === 'turret'
    ? TURRET_MATRIX
    : subType === 'drone'
    ? DRONE_MATRIX
    : subType === 'hound'
    ? HOUND_MATRIX
    : subType === 'juggernaut'
    ? JUGGERNAUT_MATRIX
    : MECHANIC_MATRIX;

  drawCrispShadow(ctx, cx, by, 7, 2);
  if (subType !== 'drone' && subType !== 'turret' && subType !== 'hound') {
    pxOutlinedRect(ctx, cx - 4, by - 5, 3, 5, '#1c1917');
    pxOutlinedRect(ctx, cx + 1, by - 5, 3, 5, '#1c1917');
    drawPixelMatrix(
      ctx,
      matrix,
      BASE_PALETTE,
      cx,
      by - 4,
      isZombie ? -1 : 1,
      false,
      isZombie ? '#d9f99d' : '#fef3c7'
    );
  } else {
    drawPixelMatrix(
      ctx,
      matrix,
      BASE_PALETTE,
      cx,
      subType === 'drone' ? by - 10 : by - 2,
      1,
      false,
      '#bae6fd'
    );
  }
}

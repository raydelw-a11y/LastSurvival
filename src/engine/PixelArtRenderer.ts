import { BiomeType, SurvivorType, TacticalItemType, ZombieType } from '../types/game';

export const LOGICAL_WIDTH = 640;
export const LOGICAL_HEIGHT = 360;
export const ROAD_Y_MIN = 192;
export const ROAD_Y_MAX = 294;

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
// HIGH-DETAIL PIXEL ART MATRICES (16x24 Head+Torso Sprites with 1px Outlines)
// ============================================================================

const REDNECK_MATRIX = [
  '....OOOOOO......',
  '...ObbbbbbO.....',
  '..ObbWWWWbbOOO..',
  '..ObbbbbbbbbbO..',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssmmO...',
  '....OOssssOO....',
  '...OssOOOOssO...',
  '..OssBssssBssO..',
  '..OssBssssBssO..',
  '..OssBBBBBBssO..',
  '..OshBBBBBBhsO..',
  '...OObbbbbbOO...',
  '....ObbbbbbO....',
  '....ObbOObbO....',
];

const FARMER_MATRIX = [
  '....OOOOOO......',
  '...OyyyyyyO.....',
  '.OOyyyyyyyyOO...',
  'OddddddddddddO..',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssWWWWWWo...',
  '...OssWWWWWWo...',
  '...OccccccccO...',
  '..OcccBssBcccO..',
  '..OcccBBBBcccO..',
  '..OsshBBBBhssO..',
  '...OObbbbbbOO...',
  '....ObbbbbbO....',
  '....ObbOObbO....',
];

const BUILDER_MATRIX = [
  '....OOOOOO......',
  '...OYYYYYYO.....',
  '..OYYWWWWYYO....',
  '.OddddddddddO...',
  '..OOssssssssO...',
  '...OssssKsssO...',
  '...OssssssmmO...',
  '..OOggggggggOO..',
  '.OggggggggggggO.',
  '.OggYYYYYYYYggO.',
  '.OggggggggggggO.',
  '.OsshgggggghssO.',
  '..OOddddddddOO..',
  '...OddddddddO...',
  '...OddOOOOddO...',
];

const POLICEMAN_MATRIX = [
  '....OOOOOO......',
  '..OOuuuuuuOO....',
  '.OuuuuuuuuuuOO..',
  '..OOOIYIOOOO....',
  '...OssssKKssO...',
  '...OssssssmmO...',
  '..OOuuuuuuuuOO..',
  '.OuuKKKKKKKKuuO.',
  '.OuuKKKKYKKKuuO.',
  '.OuuKKKKKKKKuuO.',
  '.OsshKKKKKKhssO.',
  '..OOuuuuuuuuOO..',
  '...OuuuuuuuuO...',
  '...OuuOOOOuuO...',
];

const MECHANIC_MATRIX = [
  '....OOOOOO......',
  '...OkkkkkkO.....',
  '..OOkkkkkkOO....',
  '...OssssssssO...',
  '...OssssKsssO...',
  '...OssssmmmmO...',
  '..OOccccccccOO..',
  '.OccccccccccccO.',
  '.Occcccccccccco.',
  '.OsshccccccchsO.',
  '..OOccccccccOO..',
  '...OccccccccO...',
  '...OccOOOOccO...',
];

const ZOMBIE_WALKER_MATRIX = [
  '....OOOOOO......',
  '...OzzzzzzO.....',
  '..OzzhhhhzzO....',
  '..OzzRzzzKzO....',
  '..OzzRRRRzzO....',
  '...OzzRRRRzO....',
  '..OOttttttttOO..',
  '.OzzzzttttRRttO.',
  '.OzzzztttRRRttO.',
  '..OOOOttttttttO.',
  '....OttttttttO..',
  '....OdkkkkkkdO..',
  '....OdkkkkkkdO..',
  '....OdkOOOOdkO..',
];

const ZOMBIE_BLOATED_MATRIX = [
  '.....OOOOOO.....',
  '....OzzzzzzO....',
  '...OzzRzzzKzO...',
  '...OzzRRRRzzO...',
  '..OOooooooooOO..',
  '.OooooooooooooO.',
  'OooYYYYYYYYYYooO',
  'OooooRRRRRRooooO',
  'OooYYYYYYYYYYooO',
  'OooooRRRRRRooooO',
  'OooooooooooooooO',
  '.OooooooooooooO.',
  '..OOddddddddOO..',
  '...OddOOOOddO...',
];

const BASE_PALETTE: Record<string, string> = {
  O: '#14110f',
  s: '#f5b882',
  h: '#d99b66',
  m: '#9a5b3e',
  K: '#18181b',
  W: '#f8fafc',
  b: '#0284c7',
  B: '#1d4ed8',
  y: '#eab308',
  Y: '#facc15',
  d: '#57534e',
  c: '#cbd5e1',
  g: '#6b653b',
  u: '#1e3a8a',
  I: '#09090b',
  k: '#334155',
  z: '#7fa655',
  R: '#b91c1c',
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
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(rx - 2, ry + 20, 22, 5);

  pxOutlinedRect(ctx, rx, ry, 18, 22, bodyColor);
  // Cylindrical shading highlight & shadow
  pxRect(ctx, rx + 2, ry, 4, 22, highlightColor);
  pxRect(ctx, rx + 14, ry, 3, 22, '#232920');
  // Top rim
  pxOutlinedRect(ctx, rx, ry - 2, 18, 4, topColor);
  pxRect(ctx, rx + 3, ry - 1, 8, 2, highlightColor);
  // Horizontal ribs
  pxRect(ctx, rx - 1, ry + 7, 20, 2, '#1c2019');
  pxRect(ctx, rx - 1, ry + 15, 20, 2, '#1c2019');
  // "OIL" stencil mark
  pxRect(ctx, rx + 4, ry + 10, 8, 3, '#b59a4f');
}

export function renderBiomeBackground(
  ctx: CanvasRenderingContext2D,
  _biome: BiomeType,
  time: number
) {
  // 1. Multi-Banded Apocalyptic Yellow-Olive Sky with Dithered Horizon
  pxRect(ctx, 0, 0, LOGICAL_WIDTH, 22, '#c8d162');
  pxRect(ctx, 0, 22, LOGICAL_WIDTH, 20, '#d7df71');
  pxRect(ctx, 0, 42, LOGICAL_WIDTH, 22, '#e4eb82');
  pxRect(ctx, 0, 64, LOGICAL_WIDTH, 34, '#eff496');

  // Soft layered clouds
  ctx.fillStyle = 'rgba(250, 253, 182, 0.65)';
  ctx.fillRect(45, 16, 175, 5);
  ctx.fillRect(70, 13, 110, 3);
  ctx.fillRect(340, 28, 210, 6);
  ctx.fillRect(370, 24, 140, 4);
  ctx.fillRect(160, 48, 240, 4);

  // 2. Distant Hazy Mountain / Treeline Silhouette
  pxRect(ctx, 0, 88, LOGICAL_WIDTH, 28, '#3b4530');
  for (let i = 0; i < 64; i++) {
    const mx = i * 10;
    const mh = 14 + ((i * 13) % 16);
    pxRect(ctx, mx, 92 - mh, 10, mh, '#465239');
  }

  // 3. Detailed Layered Pine Forest (Y: 54 to 118)
  for (let i = 0; i < 42; i++) {
    const tx = i * 15 - 4;
    const th = 28 + ((i * 23) % 24);
    const ty = 108 - th;
    const baseCol = i % 3 === 0 ? '#2f3827' : i % 2 === 0 ? '#262e20' : '#1f261a';
    const lightCol = '#3d4933';

    // Tree trunk
    pxRect(ctx, tx + 6, ty + 6, 3, th, '#1b1f17');
    // 5 tiers of notched pine boughs
    for (let tier = 0; tier < 5; tier++) {
      const bw = 4 + tier * 3.5;
      const by = ty + tier * 5;
      pxRect(ctx, tx + 7 - bw / 2, by, bw, 4, baseCol);
      pxRect(ctx, tx + 7 - bw / 2, by, bw * 0.45, 2, lightCol);
    }
  }

  // Dead Snag Trees sticking above canopy
  [92, 206, 392, 512].forEach((bx) => {
    pxRect(ctx, bx, 56, 3, 52, '#21261c');
    pxRect(ctx, bx - 6, 66, 6, 2, '#21261c');
    pxRect(ctx, bx + 3, 72, 6, 2, '#21261c');
    pxRect(ctx, bx - 4, 80, 4, 2, '#21261c');
  });

  // 4. Upper Olive Meadow & Tall Grass Clumps (Y: 112 to 184)
  pxRect(ctx, 0, 112, LOGICAL_WIDTH, 72, '#575233');
  pxRect(ctx, 0, 112, LOGICAL_WIDTH, 7, '#3f3d26');
  pxRect(ctx, 0, 119, LOGICAL_WIDTH, 6, '#4b472c');

  for (let gx = 6; gx < LOGICAL_WIDTH; gx += 16) {
    const gy = 126 + ((gx * 7) % 46);
    pxRect(ctx, gx, gy, 9, 2, '#454128');
    pxRect(ctx, gx + 2, gy - 2, 5, 2, '#69633d');
  }

  // Utility / Telegraph Poles on the Right
  pxOutlinedRect(ctx, 430, 74, 5, 76, '#2d251b');
  pxRect(ctx, 431, 74, 2, 76, '#423728');
  pxOutlinedRect(ctx, 574, 0, 12, 192, '#261f17');
  pxRect(ctx, 576, 0, 4, 192, '#3b3024');
  pxRect(ctx, 582, 0, 2, 192, '#17130e');

  // 5. Detailed Wrecked Silver/White SUV above the Road (X: 230, Y: 122)
  renderWreckedSUV(ctx, 232, 120);

  // 6. Upper Grass-to-Dirt Overhang Border (Y: 182 to 194)
  pxRect(ctx, 0, 182, LOGICAL_WIDTH, 10, '#69623b');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 8) {
    const h = 3 + ((gx * 3) % 4);
    pxRect(ctx, gx, 189, 5, h, '#524d2e');
    pxRect(ctx, gx + 2, 187, 4, 3, '#787045');
  }

  // 7. Textured Dirt & Gravel Country Road (Y: 192 to 296)
  pxRect(ctx, 0, 192, LOGICAL_WIDTH, 104, '#9c7146');
  // Upper & lower darker road wheel ruts
  pxRect(ctx, 0, 192, LOGICAL_WIDTH, 7, '#825b35');
  pxRect(ctx, 0, 212, LOGICAL_WIDTH, 8, '#91673e');
  pxRect(ctx, 0, 266, LOGICAL_WIDTH, 9, '#91673e');
  pxRect(ctx, 0, 287, LOGICAL_WIDTH, 9, '#805933');

  // Detailed gravel stones, cracks & dust patches
  for (let rx = 12; rx < LOGICAL_WIDTH; rx += 26) {
    const ry = 202 + ((rx * 17) % 74);
    pxRect(ctx, rx, ry, 14, 3, '#8a6038');
    pxRect(ctx, rx + 3, ry + 1, 8, 2, '#ad8054');
    pxRect(ctx, rx + 15, 210 + ((rx * 11) % 62), 3, 2, '#5c3f24');
    pxRect(ctx, rx + 8, 235 + ((rx * 19) % 44), 2, 2, '#b88b5e');
  }

  // 8. Bottom Grass Verge & Foreground Trench (Y: 294 to 360)
  pxRect(ctx, 0, 294, LOGICAL_WIDTH, 14, '#595334');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 9) {
    const sway = Math.round(Math.sin(time * 2 + gx) * 0.6);
    pxRect(ctx, gx + sway, 291, 6, 4, '#6e6741');
    pxRect(ctx, gx + 3, 295, 5, 5, '#454128');
  }
  pxRect(ctx, 0, 308, LOGICAL_WIDTH, 52, '#3a3628');
  pxRect(ctx, 0, 322, LOGICAL_WIDTH, 38, '#2d2a1f');
}

function renderWreckedSUV(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(cx + 48, cy + 48, 54, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rear & side chassis (tilted slightly)
  pxOutlinedRect(ctx, cx, cy + 16, 94, 28, '#949ca8');
  pxRect(ctx, cx + 2, cy + 17, 90, 5, '#cbd5e1'); // Upper door crease highlight
  pxRect(ctx, cx + 2, cy + 28, 90, 15, '#646b75'); // Lower door shadow
  pxRect(ctx, cx + 6, cy + 38, 82, 5, '#474c54'); // Rusted rocker panel

  // Roof & Pillars
  pxOutlinedRect(ctx, cx + 6, cy, 66, 18, '#b8c1ce');
  pxRect(ctx, cx + 8, cy + 1, 60, 4, '#e2e8f0');

  // Smashed Windows with jagged glass shards
  pxOutlinedRect(ctx, cx + 10, cy + 5, 22, 12, '#18181b');
  pxRect(ctx, cx + 11, cy + 6, 5, 3, '#64748b');
  pxOutlinedRect(ctx, cx + 36, cy + 5, 28, 12, '#18181b');
  pxRect(ctx, cx + 56, cy + 6, 6, 4, '#64748b');

  // Door handles & panel lines
  pxRect(ctx, cx + 33, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 64, cy + 16, 1, 26, '#1e293b');
  pxRect(ctx, cx + 26, cy + 22, 4, 2, '#1e293b');
  pxRect(ctx, cx + 56, cy + 22, 4, 2, '#1e293b');

  // Crumbled Front Hood & Exposed Engine Block
  pxOutlinedRect(ctx, cx + 70, cy + 13, 28, 26, '#525861');
  pxRect(ctx, cx + 73, cy + 16, 20, 10, '#18181b');
  pxRect(ctx, cx + 76, cy + 18, 6, 6, '#3f3f46');

  // Empty Dark Wheel Wells
  pxOutlinedRect(ctx, cx + 8, cy + 33, 20, 14, '#141417');
  pxOutlinedRect(ctx, cx + 66, cy + 33, 20, 14, '#141417');
}

export function renderForegroundLeftProps(ctx: CanvasRenderingContext2D) {
  const tx = -4;
  const ty = 224;

  // Military Truck Cab in bottom-left foreground
  pxOutlinedRect(ctx, tx, ty, 54, 44, '#484a36');
  pxOutlinedRect(ctx, tx + 2, ty + 2, 48, 7, '#5c5f46');
  pxOutlinedRect(ctx, tx + 8, ty + 13, 36, 23, '#171a14');
  pxRect(ctx, tx + 10, ty + 15, 10, 6, '#2c3025'); // Glass reflection

  // Truck Hood & Heavy Radiator Grille
  pxOutlinedRect(ctx, tx, ty + 40, 70, 46, '#3d402e');
  pxRect(ctx, tx + 2, ty + 42, 64, 7, '#52563e');
  pxOutlinedRect(ctx, tx + 42, ty + 51, 24, 26, '#22241a');
  for (let gx = tx + 45; gx <= tx + 62; gx += 4) {
    pxRect(ctx, gx, ty + 54, 2, 20, '#3d402e');
  }
  // Truck Wheel Arch & Tire
  pxOutlinedRect(ctx, tx + 8, ty + 70, 28, 26, '#181a14');
  pxOutlinedRect(ctx, tx + 14, ty + 76, 16, 14, '#36382c');

  // Clustered Olive Oil Drums in front of truck
  renderOilDrum(ctx, 54, 298, '#3f4534', '#555c47');
  renderOilDrum(ctx, 74, 294, '#464d3b', '#5d664e');
  renderOilDrum(ctx, 64, 310, '#363b2d', '#4b523f');
  renderOilDrum(ctx, 95, 306, '#3f4534', '#555c47');
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.beginPath();
  ctx.ellipse(x + 74, y + 76, 82, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main School Bus Body
  pxOutlinedRect(ctx, x, y + engineBob, 124, 68, '#d9ab2b');
  // Rounded Roof Cap with specular highlight
  pxOutlinedRect(ctx, x + 2, y - 6 + engineBob, 116, 9, '#ecc342');
  pxRect(ctx, x + 4, y - 5 + engineBob, 110, 3, '#f7d969');

  // Lower Shaded Body Panel + Mud/Weathering
  pxRect(ctx, x + 1, y + 36 + engineBob, 122, 31, '#b88b1e');
  pxRect(ctx, x + 1, y + 57 + engineBob, 122, 10, '#7c5d1c');

  // Roof Luggage Rack on left + Red Barrel strapped on top
  renderOilDrum(ctx, x + 4, y - 30 + engineBob, '#b91c1c', '#dc2626', '#ef4444');
  pxRect(ctx, x, y - 12 + engineBob, 58, 2, '#1c1917');
  for (let rx = x + 4; rx <= x + 54; rx += 12) {
    pxRect(ctx, rx, y - 12 + engineBob, 2, 6, '#1c1917');
  }

  // Protruding Front Engine Hood
  pxOutlinedRect(ctx, x + 120, y + 26 + engineBob, 30, 42, '#d9ab2b');
  pxRect(ctx, x + 120, y + 27 + engineBob, 28, 7, '#ecc342');
  // Blood splatter on front nose of the bus
  pxRect(ctx, x + 136, y + 33 + engineBob, 12, 19, '#991b1b');
  pxRect(ctx, x + 130, y + 40 + engineBob, 9, 14, '#7f1d1d');

  // Front Grille & Glowing Headlight
  pxOutlinedRect(ctx, x + 145, y + 34 + engineBob, 5, 22, '#27272a');
  pxOutlinedRect(ctx, x + 144, y + 54 + engineBob, 6, 6, '#fef08a');

  // Black Side Trim Stripes & "BOARD OF EDUCATION" Stencil
  pxRect(ctx, x, y + 33 + engineBob, 94, 2, '#1c1917');
  pxRect(ctx, x, y + 48 + engineBob, 94, 3, '#1c1917');
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOARD OF EDUCATION', x + 4, y + 43 + engineBob);

  // Bus Windows with glass reflection & frames
  for (let wx = x + 6; wx <= x + 74; wx += 17) {
    pxOutlinedRect(ctx, wx, y + 8 + engineBob, 14, 20, '#2e2d24');
    pxRect(ctx, wx + 2, y + 10 + engineBob, 10, 7, '#4a483b');
    pxRect(ctx, wx + 3, y + 11 + engineBob, 4, 3, '#6b6857');
    if (weldedArmor) {
      pxRect(ctx, wx, y + 14 + engineBob, 14, 3, '#71717a');
      pxRect(ctx, wx, y + 21 + engineBob, 14, 3, '#71717a');
    }
  }

  // Folding Accordion Passenger Door
  const doorOpen = doorOpenTimer > 0;
  pxOutlinedRect(
    ctx,
    x + 94,
    y + 8 + engineBob,
    20,
    56,
    doorOpen ? '#0c0a09' : '#85681a'
  );
  if (!doorOpen) {
    pxOutlinedRect(ctx, x + 97, y + 12 + engineBob, 5, 22, '#2e2d24');
    pxOutlinedRect(ctx, x + 105, y + 12 + engineBob, 5, 22, '#2e2d24');
    pxOutlinedRect(ctx, x + 97, y + 38 + engineBob, 5, 20, '#6b5314');
    pxOutlinedRect(ctx, x + 105, y + 38 + engineBob, 5, 20, '#6b5314');
  }

  // Detailed Front Wheel & Tire Tread
  pxOutlinedRect(ctx, x + 118, y + 52, 24, 24, '#18181b');
  pxOutlinedRect(ctx, x + 122, y + 56, 16, 16, '#3f3f46');
  pxOutlinedRect(ctx, x + 126, y + 60, 8, 8, '#71717a');

  if (spikedBumper) {
    pxOutlinedRect(ctx, x + 149, y + 52 + engineBob, 9, 4, '#dc2626');
    pxOutlinedRect(ctx, x + 151, y + 58 + engineBob, 11, 4, '#e4e4e7');
    pxOutlinedRect(ctx, x + 149, y + 64 + engineBob, 9, 4, '#dc2626');
  }

  // Rising Dark Smoke Plume behind hood
  const smokePhase = (time * 16) % 24;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.5)';
  ctx.beginPath();
  ctx.arc(x + 132, y + 10 - smokePhase, 13, 0, Math.PI * 2);
  ctx.arc(x + 124, y - 8 - smokePhase * 1.1, 17, 0, Math.PI * 2);
  ctx.fill();

  // =======================================================
  // SHERIFF BILL IN THE OPEN ROOF HATCH
  // =======================================================
  const bx = x + 82;
  const by = y - 18 + engineBob;

  pxOutlinedRect(ctx, bx - 6, by + 10, 22, 4, '#ecc342');
  pxOutlinedRect(ctx, bx, by + 2, 12, 10, '#57534e');
  pxRect(ctx, bx + 2, by + 3, 10, 5, '#f5b882');
  pxOutlinedRect(ctx, bx + 1, by - 6, 9, 8, '#f5b882');
  pxRect(ctx, bx + 3, by - 2, 7, 3, '#451a03');

  // White Cowboy Hat
  pxOutlinedRect(ctx, bx - 4, by - 9, 18, 4, '#e7e5e4');
  pxOutlinedRect(ctx, bx, by - 13, 10, 5, '#f5f5f4');
  pxRect(ctx, bx, by - 9, 10, 2, '#78350f');

  // Hunting Rifle
  pxOutlinedRect(ctx, bx + 6, by + 3, 24, 3, '#1c1917');
  pxRect(ctx, bx + 2, by + 4, 7, 3, '#78350f');
  if (billFiringTimer > 0) {
    pxRect(ctx, bx + 30, by + 1, 12, 7, '#fde047');
    pxRect(ctx, bx + 32, by + 3, 16, 3, '#ffffff');
  }

  // Bus Health Bar right in front of Bill
  const barW = 48;
  const barX = bx + 24;
  const barY = by + 15;
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bx - 42, ROAD_Y_MIN - 4, 88, ROAD_Y_MAX - ROAD_Y_MIN + 26);

  // Metal Racks & Striped Hazard Barriers
  pxOutlinedRect(ctx, bx - 6, 152, 22, 42, '#27272a');
  for (let ry = 158; ry <= 188; ry += 6) {
    pxRect(ctx, bx - 4, ry, 18, 2, '#52525b');
  }

  pxOutlinedRect(ctx, bx + 4, 184, 28, 18, '#eab308');
  pxRect(ctx, bx + 8, 184, 5, 18, '#18181b');
  pxRect(ctx, bx + 18, 184, 5, 18, '#18181b');

  if (ratio > 0.25) {
    renderOilDrum(ctx, bx - 18, 198, '#294257', '#3b5d7a', '#4d779c');
    renderOilDrum(ctx, bx + 2, 210, '#574c35', '#736548', '#8a7957');
  }

  // Red Overturned Car Hood / Wrecked Door
  if (ratio > 0.15) {
    pxOutlinedRect(ctx, bx - 22, 232, 34, 44, '#b91c1c');
    pxRect(ctx, bx - 19, 235, 28, 16, '#dc2626');
    pxRect(ctx, bx - 16, 238, 12, 6, '#ef4444');
    pxRect(ctx, bx - 14, 256, 22, 16, '#7f1d1d');
  }

  pxOutlinedRect(ctx, bx - 44, 252, 24, 26, '#ca8a04');
  pxRect(ctx, bx - 44, 262, 24, 14, '#27272a');
  renderOilDrum(ctx, bx - 54, 276, '#333b42', '#49545e', '#5d6b78');

  pxOutlinedRect(ctx, bx - 34, 278, 20, 10, '#18181b');
  pxOutlinedRect(ctx, bx - 32, 286, 20, 10, '#27272a');

  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1.5;
  for (let wx = bx - 8; wx <= bx + 18; wx += 8) {
    ctx.beginPath();
    ctx.arc(wx, 278, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  pxOutlinedRect(ctx, bx + 22, 248, 22, 46, '#27272a');
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

  const badgeCol = isSurvivor ? '#dc2626' : '#b91c1c';
  pxOutlinedRect(ctx, bx, by - 2, 9, 9, badgeCol, '#14110f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(level), bx + 4.5, by + 5);

  const barW = 19;
  pxOutlinedRect(ctx, bx + 10, by, barW, 4, '#14110f', '#14110f');
  pxRect(ctx, bx + 10, by, Math.round(barW * ratio), 4, '#ef4444');
}

function renderGoldenDottedHalo(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  const dots = 12;
  const radius = 11;
  for (let i = 0; i < dots; i++) {
    const ang = (i / dots) * Math.PI * 2 + time * 2.5;
    const dx = Math.round(cx + Math.cos(ang) * radius);
    const dy = Math.round(cy + Math.sin(ang) * (radius * 0.75));
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
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Infected Corpse Lying on Road
  if (unit.state === 'corpse') {
    const twitchX = Math.sin(time * 35) * 1.2;
    const cx = Math.round(x + twitchX);
    pxRect(ctx, cx - 16, y - 3, 30, 6, '#991b1b');
    pxOutlinedRect(ctx, cx - 12, y - 7, 16, 6, '#3f422e');
    pxOutlinedRect(ctx, cx + 3, y - 8, 8, 7, '#7fa655');
    const sporeY = Math.round((time * 22) % 14);
    pxRect(ctx, cx - 4, y - 10 - sporeY, 2, 2, '#a3e635');
    pxRect(ctx, cx + 4, y - 6 - ((sporeY + 6) % 14), 2, 2, '#bef264');
    return;
  }

  // Skeleton Emerging
  if (unit.state === 'emerging') {
    pxOutlinedRect(ctx, x - 10, y - 3, 20, 5, '#5c4028');
    const emergeH = Math.min(24, Math.round(unit.animTime * 18));
    pxOutlinedRect(ctx, x - 4, y - emergeH, 8, emergeH, '#e7e5e4');
    return;
  }

  const isMoving = unit.state === 'march' || unit.state === 'spawning';
  const walkCycle = isMoving ? Math.sin(unit.animTime * 14) : 0;
  const bobY = isMoving ? Math.abs(Math.round(walkCycle * 1.8)) : 0;
  const drawY = y - z - bobY;
  const flash = unit.whiteFlashTimer > 0;
  const dir = unit.facing;
  const legOffset = Math.round(walkCycle * 3);

  // =======================================================
  // DETAILED PIXEL-ART SURVIVORS
  // =======================================================
  if (unit.team === 'survivor') {
    // Animated Boots/Feet
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 5, 4, 5, flash ? '#fff' : '#1c1917');
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 5, 4, 5, flash ? '#fff' : '#1c1917');

    // Detailed Pixel Matrix Body + Head
    const matrix =
      unit.subType === 'redneck'
        ? REDNECK_MATRIX
        : unit.subType === 'farmer'
        ? FARMER_MATRIX
        : unit.subType === 'builder'
        ? BUILDER_MATRIX
        : unit.subType === 'policeman'
        ? POLICEMAN_MATRIX
        : MECHANIC_MATRIX;

    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 4, dir, flash);

    // Weapon & Attack Animation
    const swing = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) : 0;
    if (unit.subType === 'farmer' || unit.subType === 'policeman') {
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      const reloadTilt = unit.state === 'reload' ? 3 : 0;
      pxOutlinedRect(ctx, x + dir * 2 + recoilX, drawY - 12 + reloadTilt, 13 * dir, 3, flash ? '#fff' : '#27272a');
      pxRect(ctx, x + recoilX, drawY - 11 + reloadTilt, 5 * dir, 3, flash ? '#fff' : '#78350f');
      if (unit.state === 'attack' && unit.attackProgress < 0.35) {
        pxRect(ctx, x + dir * 15, drawY - 15, 8 * dir, 8, '#fde047');
        pxRect(ctx, x + dir * 17, drawY - 13, 10 * dir, 4, '#ffffff');
      }
    } else {
      const reachX = Math.round(swing * 10) * dir;
      const reachY = Math.round(swing * 5);
      const handleColor = unit.subType === 'mechanic' ? '#64748b' : '#78350f';
      const headColor = unit.subType === 'builder' ? '#dc2626' : '#cbd5e1';

      pxOutlinedRect(ctx, x + dir * 3 + reachX, drawY - 13 + reachY, 9 * dir, 2, flash ? '#fff' : handleColor);
      pxOutlinedRect(ctx, x + dir * 10 + reachX, drawY - 16 + reachY, 4 * dir, 6, flash ? '#fff' : headColor);
    }

    if (unit.isLucky) {
      renderGoldenDottedHalo(ctx, x, drawY - 34, time);
    }

    renderUnitLevelAndHealthBar(ctx, x, drawY - 26, unit.level, unit.hp, unit.maxHp, true);
  } else {
    // =======================================================
    // DETAILED PIXEL-ART ZOMBIES
    // =======================================================
    const isBloated = unit.subType === 'bloated';
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 5, 4, 5, flash ? '#fff' : '#1c1917');
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 5, 4, 5, flash ? '#fff' : '#1c1917');

    const matrix = isBloated ? ZOMBIE_BLOATED_MATRIX : ZOMBIE_WALKER_MATRIX;
    drawPixelMatrix(ctx, matrix, BASE_PALETTE, x, drawY - 4, dir, flash);

    const topOffset = isBloated ? 28 : 26;
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
    y - z - 22,
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

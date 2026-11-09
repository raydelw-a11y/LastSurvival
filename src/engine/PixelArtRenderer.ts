import { BiomeType, SurvivorType, TacticalItemType, ZombieType } from '../types/game';

export const LOGICAL_WIDTH = 640;
export const LOGICAL_HEIGHT = 360;
export const ROAD_Y_MIN = 186;
export const ROAD_Y_MAX = 312;

export interface RenderUnit {
  id: string;
  team: 'survivor' | 'zombie';
  subType: SurvivorType | ZombieType;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  state: 'spawning' | 'emerging' | 'march' | 'windup' | 'attack' | 'reload' | 'hurt' | 'corpse';
  animTime: number;
  attackProgress: number; // 0..1
  reloadProgress: number; // 0..1
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
  isGib?: boolean;
  gibType?: 'head_zombie' | 'helmet' | 'shell' | 'wood';
  LeavesDecal?: boolean;
}

export interface RenderFloatingText {
  id: string;
  text: string;
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

// Helper for crisp integer pixel rects
function pxRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
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
  outline = '#14101c'
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

export function renderBiomeBackground(
  ctx: CanvasRenderingContext2D,
  biome: BiomeType,
  time: number
) {
  // 1. Apocalyptic Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 165);
  if (biome === 'forest_highway') {
    skyGrad.addColorStop(0, '#1f2924');
    skyGrad.addColorStop(0.6, '#3b4d3f');
    skyGrad.addColorStop(1, '#687559');
  } else if (biome === 'farm_crossing') {
    skyGrad.addColorStop(0, '#2d231e');
    skyGrad.addColorStop(0.6, '#594132');
    skyGrad.addColorStop(1, '#8c694a');
  } else if (biome === 'graveyard') {
    skyGrad.addColorStop(0, '#151324');
    skyGrad.addColorStop(0.6, '#2a2442');
    skyGrad.addColorStop(1, '#493f66');
  } else {
    skyGrad.addColorStop(0, '#261c1c');
    skyGrad.addColorStop(0.6, '#4a332d');
    skyGrad.addColorStop(1, '#755343');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 165);

  // Distant sun / moon glow
  ctx.fillStyle = biome === 'graveyard' ? 'rgba(210, 220, 255, 0.18)' : 'rgba(255, 210, 140, 0.16)';
  ctx.beginPath();
  ctx.arc(490, 56, 34, 0, Math.PI * 2);
  ctx.fill();

  // 2. Distant Silhouette Horizon (Trees / Buildings / Graves)
  ctx.fillStyle = '#181c19';
  for (let i = 0; i < 32; i++) {
    const bx = i * 22;
    const h = 28 + ((i * 17) % 34);
    if (biome === 'junkyard_city') {
      // Ruined city skyscrapers
      pxRect(ctx, bx, 142 - h, 18, h, '#1a181b');
      if (i % 2 === 0) {
        pxRect(ctx, bx + 3, 146 - h, 3, 3, '#42392c');
        pxRect(ctx, bx + 10, 152 - h, 3, 3, '#42392c');
      }
    } else {
      // Dead jagged pine trees
      pxRect(ctx, bx + 8, 142 - h, 4, h, '#171a16');
      pxRect(ctx, bx + 2, 142 - h + 6, 16, 6, '#1f261d');
      pxRect(ctx, bx + 4, 142 - h, 12, 6, '#273024');
    }
  }

  // 3. Midground Props per Biome
  // Upper dirt shoulder
  pxRect(ctx, 0, 138, LOGICAL_WIDTH, 44, biome === 'graveyard' ? '#2c2836' : '#4a4333');
  pxRect(ctx, 0, 172, LOGICAL_WIDTH, 10, '#383327');

  if (biome === 'farm_crossing') {
    // Collapsed wooden barn & silo in background
    pxOutlinedRect(ctx, 250, 92, 74, 48, '#6e3229');
    pxOutlinedRect(ctx, 246, 82, 82, 14, '#3d231e');
    pxOutlinedRect(ctx, 276, 112, 22, 28, '#241512');
    // Silo
    pxOutlinedRect(ctx, 330, 74, 24, 66, '#7a7d82');
    pxOutlinedRect(ctx, 328, 68, 28, 8, '#55585c');
  } else if (biome === 'graveyard') {
    // Iron cemetery fence & tombstones
    for (let x = 40; x < 580; x += 28) {
      pxRect(ctx, x, 118, 2, 24, '#16141c');
      pxRect(ctx, x - 1, 116, 4, 3, '#2d2938');
      if (x % 56 === 0) {
        pxOutlinedRect(ctx, x + 8, 124, 12, 16, '#5c586b');
        pxRect(ctx, x + 12, 127, 4, 8, '#3a3745');
      }
    }
    pxRect(ctx, 40, 124, 540, 2, '#16141c');
    pxRect(ctx, 40, 136, 540, 2, '#16141c');
  } else if (biome === 'junkyard_city') {
    // Burned-out cars & highway sign in background
    pxOutlinedRect(ctx, 210, 104, 68, 22, '#21543d');
    pxRect(ctx, 218, 109, 44, 3, '#d1fae5');
    pxRect(ctx, 218, 116, 30, 3, '#d1fae5');
    pxRect(ctx, 224, 126, 4, 18, '#3f3f46');
    pxRect(ctx, 260, 126, 4, 18, '#3f3f46');
  }

  // Telephone poles & sagging wires across all biomes
  for (let px = 95; px < 600; px += 175) {
    pxOutlinedRect(ctx, px, 68, 5, 76, '#3b281e');
    pxOutlinedRect(ctx, px - 12, 76, 29, 4, '#4d3529');
    pxRect(ctx, px - 10, 73, 3, 3, '#78716c');
    pxRect(ctx, px + 12, 73, 3, 3, '#78716c');
  }

  // Guardrail along top of highway
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 32) {
    pxRect(ctx, gx + 12, 168, 5, 14, '#27272a');
  }
  pxOutlinedRect(ctx, 0, 169, LOGICAL_WIDTH, 7, '#71717a');
  pxRect(ctx, 0, 171, LOGICAL_WIDTH, 2, '#a1a1aa');

  // 4. Main Asphalt Highway (Y: 180 to 322)
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 142, '#2d2f36');
  // Subtle asphalt texture bands
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 8, '#24262b');
  pxRect(ctx, 0, 314, LOGICAL_WIDTH, 8, '#23252a');

  // Top & Bottom White Edge Road Lines (worn & broken)
  for (let rx = 0; rx < LOGICAL_WIDTH; rx += 18) {
    if ((rx * 7) % 5 !== 0) {
      pxRect(ctx, rx, 186, 14, 2, '#71717a');
      pxRect(ctx, rx, 310, 14, 2, '#71717a');
    }
  }

  // Center Dashed Yellow Highway Lines
  for (let cx = 20; cx < LOGICAL_WIDTH; cx += 42) {
    pxRect(ctx, cx, 246, 24, 3, '#ca8a04');
    pxRect(ctx, cx, 251, 24, 3, '#a16207');
  }

  // 5. Bottom Foreground Dirt Shoulder & Grass Tufts
  pxRect(ctx, 0, 322, LOGICAL_WIDTH, 38, '#332d22');
  pxRect(ctx, 0, 322, LOGICAL_WIDTH, 4, '#241f17');
  for (let fx = 15; fx < LOGICAL_WIDTH; fx += 45) {
    const sway = Math.round(Math.sin(time * 2 + fx) * 1);
    pxRect(ctx, fx + sway, 326, 6, 4, '#3f4f29');
    pxRect(ctx, fx + 18, 332, 8, 3, '#4a4031');
  }
}

export function renderArmoredBus(
  ctx: CanvasRenderingContext2D,
  busX: number,
  busY: number,
  hp: number,
  maxHp: number,
  time: number,
  billCooldown: number,
  billFiringTimer: number,
  spikedBumper: boolean,
  weldedArmor: boolean,
  doorOpenTimer: number
) {
  const x = Math.round(busX);
  const y = Math.round(busY);
  const engineBob = Math.round(Math.sin(time * 18) * 0.7);

  // Ground shadow under bus
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x - 6, y + 66, 134, 14);

  // Exhaust Pipe & Smoke Hint at back
  pxOutlinedRect(ctx, x - 6, y + 54 + engineBob, 8, 5, '#52525b');

  // Main Bus Body (Classic Dead Ahead Yellow School Bus)
  pxOutlinedRect(ctx, x, y + engineBob, 112, 62, '#eab308');
  // Roof highlight & rounded top
  pxOutlinedRect(ctx, x + 4, y - 5 + engineBob, 96, 7, '#facc15');
  // Lower darker yellow panel
  pxRect(ctx, x + 1, y + 36 + engineBob, 110, 25, '#ca8a04');

  // Hood / Nose protruding right
  pxOutlinedRect(ctx, x + 108, y + 24 + engineBob, 24, 38, '#eab308');
  pxRect(ctx, x + 108, y + 25 + engineBob, 23, 6, '#facc15');
  // Radiator Grille
  pxOutlinedRect(ctx, x + 126, y + 30 + engineBob, 6, 22, '#27272a');
  pxRect(ctx, x + 128, y + 33 + engineBob, 2, 16, '#52525b');
  // Headlight
  pxOutlinedRect(ctx, x + 127, y + 52 + engineBob, 5, 5, '#fef08a');

  // Black Hazard Stripes along the side
  pxRect(ctx, x + 2, y + 32 + engineBob, 108, 4, '#18181b');
  pxRect(ctx, x + 2, y + 48 + engineBob, 106, 3, '#18181b');

  // Armored Windows with metal bars
  for (let wx = x + 10; wx <= x + 66; wx += 18) {
    pxOutlinedRect(ctx, wx, y + 8 + engineBob, 14, 18, '#1e293b');
    // Armored horizontal slats
    pxRect(ctx, wx, y + 12 + engineBob, 14, 2, '#64748b');
    pxRect(ctx, wx, y + 18 + engineBob, 14, 2, '#64748b');
  }

  // Welded Steel Armor Plates upgrade visual
  if (weldedArmor) {
    pxOutlinedRect(ctx, x + 8, y + 35 + engineBob, 42, 14, '#71717a');
    pxOutlinedRect(ctx, x + 54, y + 35 + engineBob, 28, 14, '#52525b');
    // Rivets
    pxRect(ctx, x + 10, y + 37 + engineBob, 2, 2, '#d4d4d8');
    pxRect(ctx, x + 46, y + 37 + engineBob, 2, 2, '#d4d4d8');
  }

  // Passenger Spawn Door (opens when survivor deploys)
  const doorOpen = doorOpenTimer > 0;
  pxOutlinedRect(
    ctx,
    x + 86,
    y + 10 + engineBob,
    16,
    48,
    doorOpen ? '#09090b' : '#475569'
  );
  if (!doorOpen) {
    pxRect(ctx, x + 89, y + 14 + engineBob, 4, 16, '#94a3b8');
    pxRect(ctx, x + 95, y + 14 + engineBob, 4, 16, '#94a3b8');
  } else {
    // Interior step light
    pxRect(ctx, x + 88, y + 52 + engineBob, 12, 4, '#f59e0b');
  }

  // Spiked Heavy Bumper on front
  pxOutlinedRect(ctx, x + 128, y + 52 + engineBob, 9, 12, '#3f3f46');
  if (spikedBumper) {
    pxOutlinedRect(ctx, x + 136, y + 48 + engineBob, 8, 4, '#dc2626');
    pxOutlinedRect(ctx, x + 138, y + 54 + engineBob, 10, 4, '#e4e4e7');
    pxOutlinedRect(ctx, x + 136, y + 60 + engineBob, 8, 4, '#dc2626');
  }

  // Wheels (Rear Dual + Front)
  const drawWheel = (wx: number, wy: number) => {
    pxOutlinedRect(ctx, wx, wy, 20, 20, '#18181b');
    pxRect(ctx, wx + 4, wy + 4, 12, 12, '#52525b');
    pxRect(ctx, wx + 7, wy + 7, 6, 6, '#a1a1aa');
  };
  drawWheel(x + 16, y + 50);
  drawWheel(x + 102, y + 50);

  // =======================================================
  // SHERIFF BILL ON THE ROOF / CABIN HATCH
  // =======================================================
  const bx = x + 68;
  const by = y - 22 + engineBob;

  // Sandbags on roof hatch
  pxOutlinedRect(ctx, bx - 8, by + 12, 14, 6, '#a16207');
  pxOutlinedRect(ctx, bx + 4, by + 13, 14, 5, '#854d0e');

  // Bill Torso (Sheriff Vest & Blue Shirt)
  pxOutlinedRect(ctx, bx, by + 4, 12, 12, '#1d4ed8');
  pxRect(ctx, bx + 2, by + 4, 8, 10, '#78350f'); // Leather vest
  pxRect(ctx, bx + 8, by + 6, 2, 2, '#facc15'); // Gold Sheriff Star

  // Bill Head & Cowboy Hat
  pxOutlinedRect(ctx, bx + 2, by - 4, 9, 8, '#fDBA74');
  pxRect(ctx, bx + 4, by, 7, 4, '#451a03'); // Beard
  pxRect(ctx, bx + 8, by - 2, 2, 2, '#18181b'); // Eye
  // Cowboy Hat
  pxOutlinedRect(ctx, bx - 2, by - 7, 16, 3, '#78350f');
  pxOutlinedRect(ctx, bx + 1, by - 11, 10, 4, '#92400e');

  // Bill's Rifle + Muzzle Flash
  pxOutlinedRect(ctx, bx + 6, by + 5, 18, 3, '#27272a');
  pxRect(ctx, bx + 4, by + 6, 6, 3, '#78350f'); // Wooden stock
  if (billFiringTimer > 0) {
    pxRect(ctx, bx + 25, by + 2, 10, 9, '#fde047');
    pxRect(ctx, bx + 27, by + 4, 14, 5, '#ffffff');
  }

  // Damage Smoke if Bus HP < 60%
  if (hp < maxHp * 0.6) {
    const smokeY = Math.round((time * 24) % 18);
    ctx.fillStyle = 'rgba(39, 39, 42, 0.7)';
    ctx.fillRect(x + 112, y + 10 - smokeY, 12, 10);
  }
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

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(bx - 12, ROAD_Y_MIN - 6, 56, ROAD_Y_MAX - ROAD_Y_MIN + 20);

  // Stacked Junk across the vertical span of the road
  // 1. Rusted Tractor / Wrecked Pickup Hulk
  if (ratio > 0.15) {
    pxOutlinedRect(ctx, bx + 4, 195, 36, 58, '#991b1b');
    pxOutlinedRect(ctx, bx + 8, 204, 20, 22, '#1e293b'); // Broken windshield
    pxOutlinedRect(ctx, bx - 2, 238, 18, 18, '#18181b'); // Giant tractor tire
    pxRect(ctx, bx + 2, 242, 10, 10, '#52525b');
  }

  // 2. Steel I-Beams & Concrete Barriers
  pxOutlinedRect(ctx, bx - 6, 182, 16, 134, '#52525b');
  pxRect(ctx, bx - 2, 184, 8, 130, '#71717a');

  // 3. Wooden Planks & Sandbags
  const plankCount = Math.ceil(ratio * 6);
  for (let i = 0; i < plankCount; i++) {
    const py = 188 + i * 20;
    pxOutlinedRect(ctx, bx - 10 + (i % 2) * 4, py, 28, 8, '#854d0e');
    pxRect(ctx, bx - 8 + (i % 2) * 4, py + 2, 24, 2, '#a16207');
    // Nails
    pxRect(ctx, bx - 6, py + 3, 2, 2, '#18181b');
    pxRect(ctx, bx + 12, py + 3, 2, 2, '#18181b');
  }

  // 4. Stacked Tires & Hazard Drums at bottom
  if (ratio > 0.3) {
    pxOutlinedRect(ctx, bx + 2, 266, 22, 28, '#ca8a04');
    pxRect(ctx, bx + 2, 276, 22, 4, '#18181b');
    pxOutlinedRect(ctx, bx - 8, 286, 20, 12, '#18181b');
    pxOutlinedRect(ctx, bx - 6, 296, 20, 12, '#27272a');
  }

  // Barricade World Health Bar above it
  const barW = 54;
  const barX = bx - 10;
  const barY = 166;
  pxOutlinedRect(ctx, barX, barY, barW, 7, '#18181b');
  pxRect(ctx, barX + 1, barY + 1, Math.max(0, Math.round((barW - 2) * ratio)), 5, '#ef4444');
}

export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  unit: RenderUnit,
  time: number
) {
  const x = Math.round(unit.x);
  const y = Math.round(unit.y);
  const z = Math.round(unit.z);

  // 1. Direct WASD Control Tactical Ring on Ground
  if (unit.isPlayerControlled && unit.state !== 'corpse') {
    const pulse = Math.sin(time * 8) * 2;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 14 + pulse, 7 + pulse * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Handle Infected Corpse Lying on Road
  if (unit.state === 'corpse') {
    const twitchX = Math.sin(time * 35) * 1.5;
    const cx = Math.round(x + twitchX);
    // Lying body
    pxOutlinedRect(ctx, cx - 12, y - 6, 18, 7, '#1e3a8a');
    pxOutlinedRect(ctx, cx + 5, y - 7, 7, 7, '#84cc16'); // Mutating greenish head
    // Rising green infection spores
    const sporeY = Math.round((time * 22) % 14);
    pxRect(ctx, cx - 4, y - 10 - sporeY, 3, 3, '#4ade80');
    pxRect(ctx, cx + 4, y - 6 - ((sporeY + 6) % 14), 2, 2, '#a3e635');

    // Infection progress bar
    if (unit.corpseTimer !== undefined && unit.corpseMaxTimer) {
      const ratio = 1 - Math.max(0, unit.corpseTimer / unit.corpseMaxTimer);
      pxOutlinedRect(ctx, x - 12, y - 18, 24, 4, '#18181b');
      pxRect(ctx, x - 11, y - 17, Math.round(22 * ratio), 2, '#84cc16');
    }
    return;
  }

  // 4. Skeleton Emerging from Ground animation
  if (unit.state === 'emerging') {
    pxOutlinedRect(ctx, x - 10, y - 3, 20, 5, '#44403c');
    const emergeH = Math.min(24, Math.round(unit.animTime * 18));
    pxOutlinedRect(ctx, x - 4, y - emergeH, 8, emergeH, '#e7e5e4');
    return;
  }

  // Walking / Idle bobbing
  const isMoving = unit.state === 'march' || unit.state === 'spawning';
  const walkCycle = isMoving ? Math.sin(unit.animTime * 14) : 0;
  const bobY = isMoving ? Math.abs(Math.round(walkCycle * 2)) : 0;
  const drawY = y - z - bobY;
  const flash = unit.whiteFlashTimer > 0;

  // Red Crit Aura for Feral Berserker Zombie
  if (unit.team === 'zombie' && unit.subType === 'crit_zombie') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.beginPath();
    ctx.arc(x, drawY - 14, 15 + Math.sin(time * 12) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const c = (normal: string) => (flash ? '#ffffff' : normal);
  const dir = unit.facing;

  // =======================================================
  // SURVIVOR SPRITES
  // =======================================================
  if (unit.team === 'survivor') {
    const legOffset = Math.round(walkCycle * 3);

    // Legs / Boots
    const pantsColor =
      unit.subType === 'policeman'
        ? '#172554'
        : unit.subType === 'builder'
        ? '#3f3f46'
        : '#1e3a8a';
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 8, 4, 8, c(pantsColor));
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 8, 4, 8, c(pantsColor));

    // Torso by Class
    if (unit.subType === 'redneck') {
      // Red plaid shirt + blue overalls strap
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#b91c1c'));
      pxRect(ctx, x - 4, drawY - 20, 8, 12, c('#1d4ed8'));
    } else if (unit.subType === 'farmer') {
      // Beige work shirt + overalls
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#d6d3d1'));
      pxRect(ctx, x - 4, drawY - 16, 8, 8, c('#1e40af'));
    } else if (unit.subType === 'builder') {
      // Bulky Hi-Vis Orange Vest with yellow reflective stripes
      pxOutlinedRect(ctx, x - 7, drawY - 21, 14, 13, c('#ea580c'));
      pxRect(ctx, x - 6, drawY - 16, 12, 2, c('#fde047'));
    } else if (unit.subType === 'policeman') {
      // Heavy Police Tactical Vest
      pxOutlinedRect(ctx, x - 7, drawY - 21, 14, 13, c('#1e3a8a'));
      pxOutlinedRect(ctx, x - 5, drawY - 19, 10, 9, c('#18181b'));
      pxRect(ctx, x + 2, drawY - 18, 2, 2, c('#facc15')); // Badge
    } else {
      // Mechanic jumpsuit
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#0369a1'));
      pxRect(ctx, x - 3, drawY - 18, 6, 8, c('#38bdf8'));
    }

    // Head + Hat/Helmet
    pxOutlinedRect(ctx, x - 4, drawY - 29, 9, 9, c('#fdba74'));
    pxRect(ctx, x + (dir > 0 ? 2 : -2), drawY - 26, 2, 2, c('#18181b')); // Eye

    if (unit.subType === 'redneck') {
      // Red Baseball Cap
      pxOutlinedRect(ctx, x - 5, drawY - 32, 12, 4, c('#dc2626'));
    } else if (unit.subType === 'farmer') {
      // Wide Straw Hat + White beard
      pxOutlinedRect(ctx, x - 7, drawY - 31, 15, 3, c('#eab308'));
      pxOutlinedRect(ctx, x - 4, drawY - 34, 9, 3, c('#ca8a04'));
      pxRect(ctx, x - 2, drawY - 23, 6, 3, c('#e5e7eb'));
    } else if (unit.subType === 'builder') {
      // Yellow Hard Hat
      pxOutlinedRect(ctx, x - 6, drawY - 33, 13, 5, c('#facc15'));
      pxRect(ctx, x - 3, drawY - 32, 6, 2, c('#fef08a'));
    } else if (unit.subType === 'policeman') {
      // Police Cap
      pxOutlinedRect(ctx, x - 6, drawY - 33, 13, 4, c('#172554'));
      pxRect(ctx, x + 2, drawY - 32, 2, 2, c('#facc15'));
    } else {
      // Mechanic Welder Cap
      pxOutlinedRect(ctx, x - 5, drawY - 32, 10, 4, c('#334155'));
    }

    // Weapon & Attack Animation
    const swing = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) : 0;
    if (unit.subType === 'farmer' || unit.subType === 'policeman') {
      // Shotgun
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      const reloadTilt = unit.state === 'reload' ? 4 : 0;
      pxOutlinedRect(ctx, x + dir * 2 + recoilX, drawY - 16 + reloadTilt, 14 * dir, 4, c('#27272a'));
      pxRect(ctx, x + recoilX, drawY - 15 + reloadTilt, 6 * dir, 4, c('#78350f'));
      if (unit.state === 'attack' && unit.attackProgress < 0.35) {
        // Muzzle blast cone
        pxRect(ctx, x + dir * 16, drawY - 19, 8 * dir, 9, '#fde047');
        pxRect(ctx, x + dir * 18, drawY - 17, 10 * dir, 5, '#ffffff');
      }
    } else {
      // Melee weapon (Shovel / Sledgehammer / Wrench)
      const reachX = Math.round(swing * 12) * dir;
      const reachY = Math.round(swing * 6);
      const handleColor = unit.subType === 'mechanic' ? '#64748b' : '#92400e';
      const headColor = unit.subType === 'builder' ? '#27272a' : '#94a3b8';

      pxOutlinedRect(ctx, x + dir * 3 + reachX, drawY - 18 + reachY, 11 * dir, 3, c(handleColor));
      pxOutlinedRect(ctx, x + dir * 12 + reachX, drawY - 21 + reachY, 5 * dir, 8, c(headColor));

      // White Slash Arc on swing
      if (swing > 0.3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(x + dir * 15, drawY - 24, 4 * dir, 14);
      }
    }

    // Golden Lucky Halo (Fortune Buff from Video [00:06:05])
    if (unit.isLucky) {
      pxOutlinedRect(ctx, x - 6, drawY - 39, 12, 3, '#facc15');
      pxRect(ctx, x - 4, drawY - 39, 8, 1, '#fef08a');
    }

    // Reload Indicator Bar
    if (unit.state === 'reload') {
      pxOutlinedRect(ctx, x - 9, drawY - 43, 18, 3, '#18181b');
      pxRect(ctx, x - 8, drawY - 42, Math.round(16 * unit.reloadProgress), 1, '#f59e0b');
    }

    // WASD Controlled Badge
    if (unit.isPlayerControlled) {
      pxOutlinedRect(ctx, x - 11, drawY - 48, 22, 7, '#15803d');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WASD', x, drawY - 43);
    }
  } else {
    // =======================================================
    // ZOMBIE SPRITES
    // =======================================================
    const legOffset = Math.round(walkCycle * 3);
    const isBloated = unit.subType === 'bloated';
    const isSkeleton = unit.subType === 'skeleton';
    const isArmored = unit.subType === 'armored';

    const skinColor = isSkeleton ? '#e7e5e4' : isBloated ? '#65a30d' : '#84cc16';

    // Legs
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 8, 4, 8, c('#27272a'));
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 8, 4, 8, c('#27272a'));

    // Torso
    const bodyW = isBloated ? 18 : 12;
    const bodyH = isBloated ? 16 : 12;
    const shirtColor =
      unit.subType === 'runner'
        ? '#7f1d1d'
        : isArmored
        ? '#ea580c'
        : isBloated
        ? '#4d7c0f'
        : '#3f3f46';
    pxOutlinedRect(ctx, x - bodyW / 2, drawY - 8 - bodyH, bodyW, bodyH, c(shirtColor));

    // Toxic Pustules on Bloated Zombie
    if (isBloated) {
      pxRect(ctx, x - 5, drawY - 19, 4, 4, c('#bef264'));
      pxRect(ctx, x + 2, drawY - 14, 5, 4, c('#a3e635'));
    }

    // Bloodstain on zombie chest
    pxRect(ctx, x - 3, drawY - 17, 4, 5, c('#991b1b'));

    // Head
    pxOutlinedRect(ctx, x - 5, drawY - 9 - bodyH - 8, 9, 9, c(skinColor));
    // Glowing Red Zombie Eyes
    pxRect(ctx, x - 4, drawY - 6 - bodyH - 8, 2, 2, c('#ef4444'));

    // Armored Zombie Helmet
    if (isArmored) {
      pxOutlinedRect(ctx, x - 6, drawY - 12 - bodyH - 8, 12, 5, c('#facc15'));
    }

    // Zombie Outstretched Clawing Arms
    const clawSwing = unit.state === 'attack' ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 7) : 0;
    pxOutlinedRect(ctx, x - 11 - clawSwing, drawY - 18, 9, 4, c(skinColor));
  }

  // Health Bar above damaged unit
  if (unit.hp < unit.maxHp) {
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    const barW = 20;
    pxOutlinedRect(ctx, x - 10, drawY - 37, barW, 4, '#18181b');
    pxRect(
      ctx,
      x - 9,
      drawY - 36,
      Math.round((barW - 2) * ratio),
      2,
      unit.team === 'survivor' ? '#22c55e' : '#ef4444'
    );
  }

  // Speech Bubble Quote (Video [00:18:40])
  if (unit.quoteText && unit.quoteTimer && unit.quoteTimer > 0) {
    ctx.font = 'bold 6px "Chakra Petch", sans-serif';
    const textW = Math.max(36, ctx.measureText(unit.quoteText).width + 8);
    const bx = Math.round(x - textW / 2);
    const by = Math.round(drawY - 52);
    pxOutlinedRect(ctx, bx, by, textW, 10, '#ffffff', '#18181b');
    ctx.fillStyle = '#09090b';
    ctx.textAlign = 'center';
    ctx.fillText(unit.quoteText, x, by + 7);
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
    // Healing zone aura
    const pulse = Math.sin(time * 6) * 3;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 50 + pulse, 24 + pulse * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
    ctx.beginPath();
    ctx.ellipse(x, y, 50, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Medkit Box in center
    pxOutlinedRect(ctx, x - 8, y - z - 11, 16, 11, '#f8fafc');
    pxRect(ctx, x - 2, y - z - 9, 4, 7, '#ef4444');
    pxRect(ctx, x - 4, y - z - 7, 8, 3, '#ef4444');
    return;
  }

  // Shadow on road (scales with Z drop height)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const flash = obs.whiteFlashTimer > 0;
  const isRed = obs.type === 'red_barrel';
  const mainCol = flash ? '#ffffff' : isRed ? '#dc2626' : '#2563eb';
  const rimCol = flash ? '#ffffff' : isRed ? '#991b1b' : '#1d4ed8';

  const by = y - z;
  pxOutlinedRect(ctx, x - 8, by - 22, 16, 22, mainCol);
  pxRect(ctx, x - 8, by - 20, 16, 2, rimCol);
  pxRect(ctx, x - 8, by - 12, 16, 2, rimCol);
  pxRect(ctx, x - 8, by - 4, 16, 2, rimCol);

  if (isRed && !flash) {
    // Yellow hazard diamond
    pxRect(ctx, x - 3, by - 15, 6, 6, '#facc15');
    pxRect(ctx, x - 1, by - 14, 2, 4, '#dc2626');
  }

  if (obs.hp < obs.maxHp && z <= 1) {
    const ratio = Math.max(0, obs.hp / obs.maxHp);
    pxOutlinedRect(ctx, x - 9, by - 28, 18, 4, '#18181b');
    pxRect(ctx, x - 8, by - 27, Math.round(16 * ratio), 2, '#facc15');
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const isCourage = pickup.kind === 'courage';
  const col = isCourage ? '#0ea5e9' : '#ef4444';
  const hi = isCourage ? '#7dd3fc' : '#fca5a5';

  // Glowing aura ring
  ctx.fillStyle = isCourage ? 'rgba(14, 165, 233, 0.28)' : 'rgba(239, 68, 68, 0.28)';
  ctx.beginPath();
  ctx.arc(x, y - floatZ - 7, 11, 0, Math.PI * 2);
  ctx.fill();

  // Bottle / Orb icon
  pxOutlinedRect(ctx, x - 5, y - floatZ - 12, 10, 11, col);
  pxOutlinedRect(ctx, x - 2, y - floatZ - 15, 4, 3, '#e2e8f0');
  pxRect(ctx, x - 3, y - floatZ - 10, 3, 6, hi);

  // "+25" label
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
    // Pecking on asphalt
    const peck = Math.sin(time * 9 + crow.animOffset) > 0.5 ? 2 : 0;
    pxOutlinedRect(ctx, x - 3, y - 5 + peck, 6, 4, '#18181b');
    pxRect(ctx, x + 3, y - 4 + peck, 3, 2, '#f59e0b'); // Beak
  } else {
    // Flying away flapping wings
    const flap = Math.sin(time * 24 + crow.animOffset) > 0 ? -4 : 3;
    pxOutlinedRect(ctx, x - 4, y - z - 4, 8, 4, '#18181b');
    pxRect(ctx, x - 2, y - z - 4 + flap, 5, 4, '#27272a');
  }
}

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
  outline = '#181410'
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

// Draw an authentic Dead Ahead style Oil Drum ("OIL")
function renderOilDrum(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyColor = '#3f4739',
  topColor = '#525c4b'
) {
  pxOutlinedRect(ctx, x, y, 18, 24, bodyColor);
  pxOutlinedRect(ctx, x, y - 2, 18, 4, topColor);
  pxRect(ctx, x, y + 7, 18, 2, '#242920');
  pxRect(ctx, x, y + 16, 18, 2, '#242920');
  // Small golden "OIL" mark
  pxRect(ctx, x + 4, y + 11, 8, 3, '#a18a49');
}

export function renderBiomeBackground(
  ctx: CanvasRenderingContext2D,
  _biome: BiomeType,
  _time: number
) {
  // 1. Iconic Dead Ahead Yellow-Green Apocalyptic Sky (exact match to screenshot)
  pxRect(ctx, 0, 0, LOGICAL_WIDTH, 26, '#cfd66b');
  pxRect(ctx, 0, 26, LOGICAL_WIDTH, 22, '#dce378');
  pxRect(ctx, 0, 48, LOGICAL_WIDTH, 24, '#e6ec87');
  pxRect(ctx, 0, 72, LOGICAL_WIDTH, 32, '#d2da71');

  // Subtle horizontal cloud streaks in sky
  pxRect(ctx, 60, 20, 190, 4, '#eaef96');
  pxRect(ctx, 360, 32, 220, 5, '#eaef96');
  pxRect(ctx, 140, 54, 280, 4, '#f1f5a6');

  // 2. Dense Dark Pine Forest Horizon Line (Y: 56 to 118)
  pxRect(ctx, 0, 96, LOGICAL_WIDTH, 24, '#2b3324');
  for (let i = 0; i < 46; i++) {
    const tx = i * 14 - 4;
    const th = 26 + ((i * 19) % 24);
    const ty = 104 - th;
    const treeCol = i % 3 === 0 ? '#3e4a35' : i % 2 === 0 ? '#333d2b' : '#283022';

    // Trunk
    pxRect(ctx, tx + 6, ty + 6, 3, th, '#22261e');
    // Layered pine branches
    for (let b = 0; b < 4; b++) {
      const bw = 6 + b * 4;
      const by = ty + b * 6;
      pxRect(ctx, tx + 7 - bw / 2, by, bw, 5, treeCol);
    }
  }

  // Dead bare tree trunks protruding in forest
  const bareTrees = [96, 210, 395, 515];
  bareTrees.forEach((bx) => {
    pxRect(ctx, bx, 60, 3, 48, '#262b21');
    pxRect(ctx, bx - 5, 68, 5, 2, '#262b21');
    pxRect(ctx, bx + 3, 74, 5, 2, '#262b21');
  });

  // 3. Upper Olive-Brown Grassy Field (Y: 114 to 184)
  pxRect(ctx, 0, 114, LOGICAL_WIDTH, 70, '#575233');
  pxRect(ctx, 0, 114, LOGICAL_WIDTH, 8, '#46442b');
  // Grass texture strokes
  for (let gx = 8; gx < LOGICAL_WIDTH; gx += 22) {
    pxRect(ctx, gx, 128 + ((gx * 3) % 38), 8, 2, '#444127');
    pxRect(ctx, gx + 9, 142 + ((gx * 7) % 28), 6, 3, '#68623d');
  }

  // Tall Wooden Tree / Utility Posts on Right (matching screenshot right side)
  pxOutlinedRect(ctx, 430, 78, 5, 72, '#30291e');
  pxOutlinedRect(ctx, 574, 0, 12, 192, '#2b241b');
  pxRect(ctx, 576, 0, 4, 192, '#3d3326');

  // 4. Transition Grass Edge Above Dirt Road (Y: 180 to 192)
  pxRect(ctx, 0, 180, LOGICAL_WIDTH, 12, '#6c653e');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 12) {
    pxRect(ctx, gx, 186, 7, 6, '#575233');
    pxRect(ctx, gx + 4, 190, 5, 4, '#7d603b');
  }

  // 5. Main Dusty Dirt / Country Road (Y: 192 to 296 - warm ochre brown like screenshot)
  pxRect(ctx, 0, 192, LOGICAL_WIDTH, 104, '#9e7247');
  pxRect(ctx, 0, 192, LOGICAL_WIDTH, 8, '#8c6239');
  pxRect(ctx, 0, 286, LOGICAL_WIDTH, 10, '#855c34');

  // Road dirt patches, pebbles & ruts
  for (let rx = 20; rx < LOGICAL_WIDTH; rx += 34) {
    pxRect(ctx, rx, 208 + ((rx * 13) % 64), 16, 4, '#8f643b');
    pxRect(ctx, rx + 12, 225 + ((rx * 7) % 48), 10, 3, '#ab7e52');
    pxRect(ctx, rx + 5, 240 + ((rx * 11) % 36), 3, 2, '#5c4028');
  }

  // 6. Wrecked White/Silver SUV in Upper-Middle Roadside (exact match to screenshot!)
  const cx = 232;
  const cy = 122;
  // Ground shadow under wrecked SUV
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(cx - 4, cy + 44, 104, 16);
  // Tilted SUV Body
  pxOutlinedRect(ctx, cx, cy + 16, 92, 30, '#8d949e');
  pxRect(ctx, cx + 2, cy + 28, 88, 16, '#686e78'); // Darker lower door panel
  // SUV Cabin Roof
  pxOutlinedRect(ctx, cx + 6, cy, 64, 20, '#b8c0cc');
  pxRect(ctx, cx + 8, cy + 2, 58, 4, '#d8dee8');
  // Smashed Dark Windows
  pxOutlinedRect(ctx, cx + 10, cy + 5, 22, 13, '#1e2024');
  pxOutlinedRect(ctx, cx + 36, cy + 5, 26, 13, '#1e2024');
  // Crumbled Front Hood & Engine Bay on right
  pxOutlinedRect(ctx, cx + 70, cy + 14, 26, 26, '#4b4e54');
  pxRect(ctx, cx + 74, cy + 18, 18, 10, '#27272a');
  // Missing wheel arches (resting on bricks/axles)
  pxOutlinedRect(ctx, cx + 10, cy + 36, 18, 12, '#18181b');
  pxOutlinedRect(ctx, cx + 64, cy + 36, 18, 12, '#18181b');

  // 7. Bottom Olive Grass Shoulder & Dark Foreground Trench (Y: 294 to 360)
  pxRect(ctx, 0, 294, LOGICAL_WIDTH, 16, '#575233');
  for (let gx = 0; gx < LOGICAL_WIDTH; gx += 14) {
    pxRect(ctx, gx, 291, 8, 5, '#68623d');
    pxRect(ctx, gx + 6, 295, 6, 6, '#46442b');
  }
  pxRect(ctx, 0, 308, LOGICAL_WIDTH, 52, '#3d392b');
  pxRect(ctx, 0, 324, LOGICAL_WIDTH, 36, '#322f24');
}

// Foreground Left Military Truck & Oil Drums (drawn after entities for depth, matching screenshot!)
export function renderForegroundLeftProps(ctx: CanvasRenderingContext2D) {
  const tx = -4;
  const ty = 224;

  // Military Truck Cab
  pxOutlinedRect(ctx, tx, ty, 52, 42, '#4b4d38');
  pxOutlinedRect(ctx, tx + 4, ty + 4, 46, 8, '#5c5e44'); // Roof visor
  // Dark Windshield & Cabin Interior
  pxOutlinedRect(ctx, tx + 8, ty + 14, 36, 24, '#1b1d17');
  // Truck Hood & Heavy Grille
  pxOutlinedRect(ctx, tx, ty + 40, 68, 46, '#3f4230');
  pxRect(ctx, tx + 2, ty + 42, 62, 8, '#52553e');
  pxOutlinedRect(ctx, tx + 42, ty + 52, 22, 26, '#26281e');
  // Vertical radiator bars
  for (let gx = tx + 45; gx <= tx + 60; gx += 4) {
    pxRect(ctx, gx, ty + 55, 2, 20, '#3f4230');
  }
  // Truck Wheel
  pxOutlinedRect(ctx, tx + 10, ty + 72, 26, 24, '#1c1d18');
  pxRect(ctx, tx + 16, ty + 78, 14, 12, '#383a30');

  // Clustered Olive Oil Drums in front of truck (matching bottom-left of screenshot)
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
  const engineBob = Math.round(Math.sin(time * 16) * 0.6);

  // Ground shadow under bus
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(x - 10, y + 72, 162, 14);

  // Main School Bus Body (extending from left edge like screenshot)
  pxOutlinedRect(ctx, x, y + engineBob, 122, 68, '#d4a72c');
  // Upper bright yellow roof curve
  pxOutlinedRect(ctx, x + 2, y - 6 + engineBob, 114, 9, '#e8be3b');
  // Lower weathered yellow panel with mud splatter
  pxRect(ctx, x + 1, y + 38 + engineBob, 120, 29, '#b88c21');
  pxRect(ctx, x + 4, y + 58 + engineBob, 114, 8, '#785c26'); // Muddy lower skirt

  // Roof Luggage Rack on left + Red Barrel strapped on top (exact match to screenshot!)
  pxOutlinedRect(ctx, x + 2, y - 34 + engineBob, 20, 26, '#b91c1c');
  pxRect(ctx, x + 2, y - 26 + engineBob, 20, 2, '#7f1d1d');
  pxRect(ctx, x + 2, y - 16 + engineBob, 20, 2, '#7f1d1d');
  pxRect(ctx, x + 8, y - 22 + engineBob, 5, 5, '#facc15'); // Hazard label on roof barrel
  // Black metal roof rack bars
  pxRect(ctx, x, y - 12 + engineBob, 56, 2, '#1c1917');
  for (let rx = x + 4; rx <= x + 52; rx += 12) {
    pxRect(ctx, rx, y - 12 + engineBob, 2, 6, '#1c1917');
  }

  // Nose / Hood protruding right
  pxOutlinedRect(ctx, x + 118, y + 26 + engineBob, 30, 42, '#d4a72c');
  pxRect(ctx, x + 118, y + 27 + engineBob, 28, 8, '#e8be3b');
  // Blood splatter on front nose of the yellow bus (like screenshot)
  pxRect(ctx, x + 136, y + 34 + engineBob, 10, 18, '#991b1b');
  pxRect(ctx, x + 130, y + 42 + engineBob, 8, 12, '#7f1d1d');
  // Front Grille & Headlight
  pxOutlinedRect(ctx, x + 144, y + 34 + engineBob, 5, 22, '#27272a');
  pxOutlinedRect(ctx, x + 143, y + 54 + engineBob, 6, 6, '#fef08a');

  // Black Side Trim Stripes & "BOARD OF EDUCATION" Stencil
  pxRect(ctx, x, y + 34 + engineBob, 92, 2, '#1c1917');
  pxRect(ctx, x, y + 48 + engineBob, 92, 3, '#1c1917');
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOARD OF EDUCATION', x + 4, y + 43 + engineBob);

  // Bus Windows with vertical frames
  for (let wx = x + 6; wx <= x + 74; wx += 17) {
    pxOutlinedRect(ctx, wx, y + 8 + engineBob, 14, 20, '#3f3d32');
    pxRect(ctx, wx + 2, y + 10 + engineBob, 10, 8, '#575446');
    if (weldedArmor) {
      pxRect(ctx, wx, y + 14 + engineBob, 14, 3, '#71717a');
      pxRect(ctx, wx, y + 21 + engineBob, 14, 3, '#71717a');
    }
  }

  // Folding Passenger Door (Right side of cabin)
  const doorOpen = doorOpenTimer > 0;
  pxOutlinedRect(
    ctx,
    x + 94,
    y + 8 + engineBob,
    20,
    56,
    doorOpen ? '#14120e' : '#85681a'
  );
  if (!doorOpen) {
    // Twin vertical glass panes in folding door
    pxOutlinedRect(ctx, x + 97, y + 12 + engineBob, 5, 22, '#3f3d32');
    pxOutlinedRect(ctx, x + 105, y + 12 + engineBob, 5, 22, '#3f3d32');
    pxOutlinedRect(ctx, x + 97, y + 38 + engineBob, 5, 20, '#6b5314');
    pxOutlinedRect(ctx, x + 105, y + 38 + engineBob, 5, 20, '#6b5314');
  }

  // Front Heavy Tire
  pxOutlinedRect(ctx, x + 118, y + 52, 24, 24, '#1c1917');
  pxOutlinedRect(ctx, x + 123, y + 57, 14, 14, '#44403c');
  pxRect(ctx, x + 127, y + 61, 6, 6, '#78716c');

  if (spikedBumper) {
    pxOutlinedRect(ctx, x + 147, y + 52 + engineBob, 9, 4, '#dc2626');
    pxOutlinedRect(ctx, x + 149, y + 58 + engineBob, 11, 4, '#e4e4e7');
    pxOutlinedRect(ctx, x + 147, y + 64 + engineBob, 9, 4, '#dc2626');
  }

  // Dark Smoke Rising Behind Bus Hood (like screenshot)
  const smokePhase = (time * 18) % 24;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.55)';
  ctx.beginPath();
  ctx.arc(x + 132, y + 12 - smokePhase, 14, 0, Math.PI * 2);
  ctx.arc(x + 124, y - 6 - smokePhase * 1.1, 18, 0, Math.PI * 2);
  ctx.fill();

  // =======================================================
  // SHERIFF BILL IN THE OPEN ROOF HATCH (White Cowboy Hat + Long Rifle)
  // =======================================================
  const bx = x + 82;
  const by = y - 18 + engineBob;

  // Open Hatch Cover folded back
  pxOutlinedRect(ctx, bx - 6, by + 10, 22, 4, '#e8be3b');

  // Bill Torso & Arms aiming rifle
  pxOutlinedRect(ctx, bx, by + 2, 12, 10, '#57534e');
  pxRect(ctx, bx + 2, by + 3, 10, 5, '#fed7aa'); // Forearm holding rifle

  // Bill Head
  pxOutlinedRect(ctx, bx + 1, by - 6, 9, 8, '#fdba74');
  pxRect(ctx, bx + 3, by - 2, 7, 3, '#451a03'); // Beard

  // Iconic White/Cream Cowboy Hat (exact match to screenshot)
  pxOutlinedRect(ctx, bx - 4, by - 9, 18, 4, '#e7e5e4');
  pxOutlinedRect(ctx, bx, by - 13, 10, 5, '#f5f5f4');
  pxRect(ctx, bx, by - 9, 10, 2, '#78350f'); // Hat band

  // Long Hunting Rifle angled slightly down toward road
  pxOutlinedRect(ctx, bx + 6, by + 3, 24, 3, '#1c1917');
  pxRect(ctx, bx + 2, by + 4, 7, 3, '#78350f');
  if (billFiringTimer > 0) {
    pxRect(ctx, bx + 30, by + 1, 12, 7, '#fde047');
    pxRect(ctx, bx + 32, by + 3, 16, 3, '#ffffff');
  }

  // Floating Bus Health Bar right in front of Bill (matching screenshot `[red | black]` bar!)
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

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bx - 42, ROAD_Y_MIN - 4, 88, ROAD_Y_MAX - ROAD_Y_MIN + 26);

  // 1. Metal Bed Frames / Racks & Yellow/Black Striped Hazard Barriers
  pxOutlinedRect(ctx, bx - 6, 152, 22, 42, '#27272a');
  for (let ry = 158; ry <= 188; ry += 6) {
    pxRect(ctx, bx - 4, ry, 18, 2, '#52525b');
  }

  // Yellow & Black Hazard Concrete Barrier
  pxOutlinedRect(ctx, bx + 4, 184, 28, 18, '#eab308');
  pxRect(ctx, bx + 8, 184, 5, 18, '#18181b');
  pxRect(ctx, bx + 18, 184, 5, 18, '#18181b');

  // 2. Blue & Olive Oil Drums in Upper Barricade
  if (ratio > 0.25) {
    renderOilDrum(ctx, bx - 18, 198, '#294257', '#3b5d7a');
    renderOilDrum(ctx, bx + 2, 210, '#574c35', '#736548');
  }

  // 3. Iconic Red Overturned Car Hood / Door & Stacked Tires (matching screenshot right side!)
  if (ratio > 0.15) {
    pxOutlinedRect(ctx, bx - 22, 232, 34, 44, '#b91c1c');
    pxRect(ctx, bx - 18, 236, 26, 16, '#dc2626');
    pxRect(ctx, bx - 14, 256, 22, 16, '#7f1d1d');
  }

  // Yellow & Black Crate + Wooden Boxes + Oil Drum at bottom right
  pxOutlinedRect(ctx, bx - 44, 252, 24, 26, '#ca8a04');
  pxRect(ctx, bx - 44, 262, 24, 14, '#27272a');
  renderOilDrum(ctx, bx - 54, 276, '#333b42', '#49545e');

  // Stacked Rubber Tires
  pxOutlinedRect(ctx, bx - 34, 278, 20, 10, '#18181b');
  pxOutlinedRect(ctx, bx - 32, 286, 20, 10, '#27272a');

  // Barbed Wire Coils & Lower Metal Rack
  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1.5;
  for (let wx = bx - 8; wx <= bx + 18; wx += 8) {
    ctx.beginPath();
    ctx.arc(wx, 278, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  pxOutlinedRect(ctx, bx + 22, 248, 22, 46, '#27272a');
}

// Draw the iconic Dead Ahead Red Level Badge "[7]" + Red Health Bar above units & zombies!
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

  // Red square badge with white level number (exact match to `[7]` in screenshot)
  const badgeCol = isSurvivor ? '#dc2626' : '#b91c1c';
  pxOutlinedRect(ctx, bx, by - 2, 9, 9, badgeCol, '#181410');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(level), bx + 4.5, by + 5);

  // Health Bar attached to the right of the badge
  const barW = 19;
  pxOutlinedRect(ctx, bx + 10, by, barW, 4, '#181410', '#181410');
  pxRect(ctx, bx + 10, by, Math.round(barW * ratio), 4, '#ef4444');
}

// Draw the Dotted Golden Inspiration / Lucky Halo Circle (matching screenshot above Builder!)
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

  // 1. Subtle WASD Selection Indicator under controlled survivor
  if (unit.isPlayerControlled && unit.state !== 'corpse') {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Handle Infected Corpse Lying on Road (matching corpse in screenshot!)
  if (unit.state === 'corpse') {
    const twitchX = Math.sin(time * 35) * 1.2;
    const cx = Math.round(x + twitchX);
    // Pool of blood under corpse
    pxRect(ctx, cx - 16, y - 3, 30, 6, '#991b1b');
    // Lying body & helmet/head
    pxOutlinedRect(ctx, cx - 12, y - 7, 16, 6, '#3f422e');
    pxOutlinedRect(ctx, cx + 3, y - 8, 8, 7, '#84a955');
    // Rising green infection spores
    const sporeY = Math.round((time * 22) % 14);
    pxRect(ctx, cx - 4, y - 10 - sporeY, 2, 2, '#a3e635');
    pxRect(ctx, cx + 4, y - 6 - ((sporeY + 6) % 14), 2, 2, '#bef264');
    return;
  }

  // 4. Skeleton Emerging from Ground
  if (unit.state === 'emerging') {
    pxOutlinedRect(ctx, x - 10, y - 3, 20, 5, '#5c4028');
    const emergeH = Math.min(24, Math.round(unit.animTime * 18));
    pxOutlinedRect(ctx, x - 4, y - emergeH, 8, emergeH, '#e7e5e4');
    return;
  }

  const isMoving = unit.state === 'march' || unit.state === 'spawning';
  const walkCycle = isMoving ? Math.sin(unit.animTime * 14) : 0;
  const bobY = isMoving ? Math.abs(Math.round(walkCycle * 2)) : 0;
  const drawY = y - z - bobY;
  const flash = unit.whiteFlashTimer > 0;
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
        ? '#1e293b'
        : unit.subType === 'builder'
        ? '#6b633b'
        : '#293b4a';
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 8, 4, 8, c(pantsColor));
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 8, 4, 8, c(pantsColor));

    // Torso by Class
    if (unit.subType === 'redneck') {
      // Bare chest / overalls like iconic Redneck portrait in screenshot!
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#f5b882'));
      pxRect(ctx, x - 5, drawY - 14, 10, 6, c('#2563eb')); // Blue denim overalls bottom
      pxRect(ctx, x - 4, drawY - 20, 2, 6, c('#2563eb')); // Strap
      pxRect(ctx, x + 2, drawY - 20, 2, 6, c('#2563eb')); // Strap
    } else if (unit.subType === 'farmer') {
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#d6d3d1'));
      pxRect(ctx, x - 4, drawY - 16, 8, 8, c('#1e40af'));
    } else if (unit.subType === 'builder') {
      // Olive-khaki armored vest like the Builder in the screenshot
      pxOutlinedRect(ctx, x - 7, drawY - 21, 14, 13, c('#787143'));
      pxRect(ctx, x - 5, drawY - 19, 10, 6, c('#3f3d24'));
    } else if (unit.subType === 'policeman') {
      pxOutlinedRect(ctx, x - 7, drawY - 21, 14, 13, c('#1e3a8a'));
      pxOutlinedRect(ctx, x - 5, drawY - 19, 10, 9, c('#18181b'));
      pxRect(ctx, x + 2, drawY - 18, 2, 2, c('#facc15'));
    } else {
      pxOutlinedRect(ctx, x - 6, drawY - 20, 12, 12, c('#0369a1'));
      pxRect(ctx, x - 3, drawY - 18, 6, 8, c('#38bdf8'));
    }

    // Head + Hat/Helmet
    pxOutlinedRect(ctx, x - 4, drawY - 29, 9, 9, c('#f5b882'));
    pxRect(ctx, x + (dir > 0 ? 2 : -2), drawY - 26, 2, 2, c('#18181b'));

    if (unit.subType === 'redneck') {
      // Blue Trucker Cap (matching slot 1 Redneck in screenshot!)
      pxOutlinedRect(ctx, x - 5, drawY - 33, 12, 4, c('#0284c7'));
      pxRect(ctx, x - 2, drawY - 32, 4, 2, c('#f8fafc'));
    } else if (unit.subType === 'farmer') {
      pxOutlinedRect(ctx, x - 7, drawY - 31, 15, 3, c('#eab308'));
      pxOutlinedRect(ctx, x - 4, drawY - 34, 9, 3, c('#ca8a04'));
    } else if (unit.subType === 'builder') {
      // Iconic Yellow Hard Hat with ridge
      pxOutlinedRect(ctx, x - 6, drawY - 33, 13, 5, c('#eab308'));
      pxRect(ctx, x - 4, drawY - 32, 8, 2, c('#fef08a'));
    } else if (unit.subType === 'policeman') {
      pxOutlinedRect(ctx, x - 6, drawY - 33, 13, 4, c('#172554'));
      pxRect(ctx, x + 2, drawY - 32, 2, 2, c('#facc15'));
    } else {
      pxOutlinedRect(ctx, x - 5, drawY - 32, 10, 4, c('#334155'));
    }

    // Weapon & Attack Animation
    const swing = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) : 0;
    if (unit.subType === 'farmer' || unit.subType === 'policeman') {
      const recoilX = unit.state === 'attack' ? -3 * dir : 0;
      const reloadTilt = unit.state === 'reload' ? 4 : 0;
      pxOutlinedRect(ctx, x + dir * 2 + recoilX, drawY - 16 + reloadTilt, 14 * dir, 4, c('#27272a'));
      pxRect(ctx, x + recoilX, drawY - 15 + reloadTilt, 6 * dir, 4, c('#78350f'));
      if (unit.state === 'attack' && unit.attackProgress < 0.35) {
        pxRect(ctx, x + dir * 16, drawY - 19, 8 * dir, 9, '#fde047');
        pxRect(ctx, x + dir * 18, drawY - 17, 10 * dir, 5, '#ffffff');
      }
    } else {
      const reachX = Math.round(swing * 12) * dir;
      const reachY = Math.round(swing * 6);
      const handleColor = unit.subType === 'mechanic' ? '#64748b' : '#78350f';
      const headColor = unit.subType === 'builder' ? '#991b1b' : '#cbd5e1';

      pxOutlinedRect(ctx, x + dir * 3 + reachX, drawY - 18 + reachY, 10 * dir, 3, c(handleColor));
      pxOutlinedRect(ctx, x + dir * 11 + reachX, drawY - 21 + reachY, 5 * dir, 7, c(headColor));
    }

    // Dotted Golden Halo Circle above Lucky Units (exact match to screenshot!)
    if (unit.isLucky) {
      renderGoldenDottedHalo(ctx, x, drawY - 49, time);
    }

    // Level Badge [7] + Health Bar
    renderUnitLevelAndHealthBar(ctx, x, drawY - 41, unit.level, unit.hp, unit.maxHp, true);
  } else {
    // =======================================================
    // ZOMBIE SPRITES (Matching green heads, red bloody mouths & Giant Red Bloated Paramedic/Fat Zombie)
    // =======================================================
    const legOffset = Math.round(walkCycle * 3);
    const isBloated = unit.subType === 'bloated';
    const isSkeleton = unit.subType === 'skeleton';
    const isArmored = unit.subType === 'armored';

    const skinColor = isSkeleton ? '#e7e5e4' : '#7fa655';

    // Legs
    pxOutlinedRect(ctx, x - 5 + legOffset, y - z - 8, 4, 8, c('#2b303a'));
    pxOutlinedRect(ctx, x + 1 - legOffset, y - z - 8, 4, 8, c('#2b303a'));

    // Torso
    const bodyW = isBloated ? 20 : 12;
    const bodyH = isBloated ? 20 : 12;
    const shirtColor = isBloated
      ? '#c2410c' // Giant Red-Orange Hazmat/Paramedic Fat Zombie on right of screenshot!
      : unit.subType === 'runner'
      ? '#475569'
      : isArmored
      ? '#334155'
      : '#64748b';
    pxOutlinedRect(ctx, x - bodyW / 2, drawY - 8 - bodyH, bodyW, bodyH, c(shirtColor));

    if (isBloated) {
      // Yellow hazard stripes on the Giant Red Fat Zombie (matching screenshot right side!)
      pxRect(ctx, x - 8, drawY - 22, 16, 3, c('#eab308'));
      pxRect(ctx, x - 8, drawY - 14, 16, 3, c('#eab308'));
      pxRect(ctx, x - 4, drawY - 26, 8, 14, c('#991b1b'));
    } else {
      // Bloody ribs/chest stain on regular zombies
      pxRect(ctx, x - 4, drawY - 18, 6, 7, c('#b91c1c'));
    }

    // Zombie Round Green Head with bloody jaw & yellow-red eyes (matching screenshot!)
    const headY = drawY - 9 - bodyH - 9;
    pxOutlinedRect(ctx, x - 5, headY, 10, 10, c(skinColor));
    pxRect(ctx, x - 4, headY + 3, 2, 2, c('#fde047')); // Left eye
    pxRect(ctx, x - 5, headY + 6, 6, 3, c('#b91c1c')); // Bloody mouth/chin

    if (isArmored) {
      pxOutlinedRect(ctx, x - 6, headY - 3, 12, 5, c('#3f3f46'));
      pxRect(ctx, x - 4, headY - 1, 4, 2, c('#ef4444'));
    }

    // Outstretched Zombie Arms
    const clawSwing = unit.state === 'attack' ? Math.round(Math.sin(unit.attackProgress * Math.PI) * 6) : 0;
    pxOutlinedRect(ctx, x - 10 - clawSwing, drawY - 18, 8, 4, c(skinColor));

    // Level Badge [7] + Red Health Bar above Zombie
    renderUnitLevelAndHealthBar(ctx, x, headY - 9, unit.level, unit.hp, unit.maxHp, false);
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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const flash = obs.whiteFlashTimer > 0;
  const isRed = obs.type === 'red_barrel';
  const mainCol = flash ? '#ffffff' : isRed ? '#b91c1c' : '#294257';
  const rimCol = flash ? '#ffffff' : isRed ? '#7f1d1d' : '#1e3040';

  const by = y - z;
  pxOutlinedRect(ctx, x - 8, by - 22, 16, 22, mainCol);
  pxRect(ctx, x - 8, by - 20, 16, 2, rimCol);
  pxRect(ctx, x - 8, by - 12, 16, 2, rimCol);
  pxRect(ctx, x - 8, by - 4, 16, 2, rimCol);

  if (isRed && !flash) {
    pxRect(ctx, x - 3, by - 15, 6, 6, '#facc15');
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

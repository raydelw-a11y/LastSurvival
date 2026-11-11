import { BiomeType } from '../types/game';
import { INK, inkedCircle, inkedRoundRect } from './hdAtlas';

export const LOGICAL_WIDTH = 720;
export const LOGICAL_HEIGHT = 336;
export const ROAD_Y_MIN = 180;
export const ROAD_Y_MAX = 278;

const BIOME_BAKE_SCALE = 2.5; // 1800x840 crisp offscreen cache
const bakedBiomeCache = new Map<string, HTMLCanvasElement>();

export function syncCanvasHiDPI(
  canvas: HTMLCanvasElement,
  logicalW: number,
  logicalH: number,
  maxDpr = 2.75
): CanvasRenderingContext2D | null {
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const dpr = Math.min(maxDpr, Math.max(1.5, rawDpr));
  const targetW = Math.round(logicalW * dpr);
  const targetH = Math.round(logicalH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

function hash32(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function drawSoftShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.34
) {
  ctx.save();
  ctx.fillStyle = `rgba(10, 10, 14, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(0.8, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderOilDrumHD(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dark: string,
  mid: string,
  hi = '#94a3b8',
  dmgState: 0 | 1 | 2 = 0,
  isExplosive = false
) {
  drawSoftShadow(ctx, x + 9, y + 21, 9.5, 3.2, 0.36);
  ctx.save();
  if (dmgState >= 2) {
    ctx.translate(x + 9, y + 11);
    ctx.rotate(0.08);
    ctx.translate(-(x + 9), -(y + 11));
  }
  inkedRoundRect(ctx, x, y + 2, 18, 19, 3, mid, hi, dark, 1.4);
  // Top oval rim
  ctx.beginPath();
  ctx.ellipse(x + 9, y + 3.2, 8.6, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = hi;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Horizontal steel ribs
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  for (const ry of [y + 8.5, y + 14.5]) {
    ctx.beginPath();
    ctx.moveTo(x + 0.8, ry);
    ctx.lineTo(x + 17.2, ry);
    ctx.stroke();
  }

  if (isExplosive) {
    // Yellow hazard diamond
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 9);
    ctx.lineTo(x + 12.5, y + 12.2);
    ctx.lineTo(x + 9, y + 15.4);
    ctx.lineTo(x + 5.5, y + 12.2);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  if (dmgState >= 1) {
    ctx.fillStyle = isExplosive ? '#18181b' : '#0f172a';
    ctx.beginPath();
    ctx.arc(x + 6, y + 11, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPineTreeHD(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, tint: string, dark: string) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  inkedRoundRect(ctx, -3, -14, 6, 15, 1.2, '#451a03', '#78350f', '#270e02', 1.1);
  for (let tier = 0; tier < 3; tier++) {
    const w = 28 - tier * 5.5;
    const yTop = -48 - tier * 12;
    const yBot = -12 - tier * 13;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(w * 0.5, yBot);
    ctx.lineTo(-w * 0.5, yBot);
    ctx.closePath();
    ctx.fillStyle = tier % 2 === 0 ? tint : dark;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.restore();
}

function drawWreckedSedanHD(ctx: CanvasRenderingContext2D, x: number, y: number, bodyCol: string, roofCol: string) {
  drawSoftShadow(ctx, x + 31, y + 23, 33, 5.5, 0.4);
  inkedRoundRect(ctx, x, y + 8, 62, 14, 4, bodyCol, roofCol, '#18181b', 1.4);
  inkedRoundRect(ctx, x + 12, y, 34, 11, 4, roofCol, '#f8fafc', bodyCol, 1.3);
  inkedRoundRect(ctx, x + 15, y + 2, 12, 6.5, 1.5, '#1e293b', '#64748b');
  inkedRoundRect(ctx, x + 29, y + 2, 13, 6.5, 1.5, '#0f172a', '#475569');
  inkedCircle(ctx, x + 13, y + 21, 5.8, '#18181b', '#52525b');
  inkedCircle(ctx, x + 48, y + 21, 5.8, '#18181b', '#52525b');
}

function getBakedBiomeCanvas(biome: BiomeType, seed: number): HTMLCanvasElement {
  const key = `${biome}_${seed}`;
  const existing = bakedBiomeCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(LOGICAL_WIDTH * BIOME_BAKE_SCALE);
  canvas.height = Math.round(LOGICAL_HEIGHT * BIOME_BAKE_SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(BIOME_BAKE_SCALE, BIOME_BAKE_SCALE);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Atmospheric Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 152);
  if (biome === 'forest_highway') {
    skyGrad.addColorStop(0, '#1e3a4c');
    skyGrad.addColorStop(0.55, '#49747a');
    skyGrad.addColorStop(1, '#9ab59e');
  } else if (biome === 'farm_crossing') {
    skyGrad.addColorStop(0, '#4a2c40');
    skyGrad.addColorStop(0.5, '#b4533c');
    skyGrad.addColorStop(1, '#f59e56');
  } else if (biome === 'graveyard') {
    skyGrad.addColorStop(0, '#090d1c');
    skyGrad.addColorStop(0.55, '#1b2845');
    skyGrad.addColorStop(1, '#364968');
  } else {
    skyGrad.addColorStop(0, '#231f28');
    skyGrad.addColorStop(0.55, '#594238');
    skyGrad.addColorStop(1, '#9e6b49');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 155);

  // Sun / Moon disc with soft atmospheric halo
  const sunX = biome === 'graveyard' ? 560 : 510;
  const sunY = biome === 'farm_crossing' ? 76 : 48;
  const halo = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 75);
  halo.addColorStop(0, biome === 'graveyard' ? 'rgba(224,242,254,0.65)' : 'rgba(254,240,138,0.55)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 75, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = biome === 'graveyard' ? '#f0f9ff' : '#fef9c3';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 15, 0, Math.PI * 2);
  ctx.fill();

  // 2. Distant Parallax Ridges / Skyline
  ctx.fillStyle =
    biome === 'forest_highway'
      ? '#2b4743'
      : biome === 'farm_crossing'
      ? '#5c3435'
      : biome === 'graveyard'
      ? '#141e33'
      : '#2d262c';
  ctx.beginPath();
  ctx.moveTo(0, 152);
  for (let x = 0; x <= LOGICAL_WIDTH; x += 45) {
    const h = 34 + (hash32(x, 1, seed) % 34);
    ctx.lineTo(x, 146 - h);
  }
  ctx.lineTo(LOGICAL_WIDTH, 152);
  ctx.closePath();
  ctx.fill();

  // 3. Midground Biome Landmarks
  if (biome === 'forest_highway') {
    // Distant steel truss bridge + dense layered conifers
    ctx.strokeStyle = 'rgba(30,41,59,0.55)';
    ctx.lineWidth = 2;
    for (let bx = 260; bx < 520; bx += 26) {
      ctx.strokeRect(bx, 98, 26, 26);
    }
    for (let i = 0; i < 19; i++) {
      const tx = 18 + i * 38 + ((hash32(i, 3, seed) % 14) - 7);
      const sc = 0.72 + (hash32(i, 4, seed) % 35) / 100;
      drawPineTreeHD(ctx, tx, 154, sc, '#244735', '#173023');
    }
  } else if (biome === 'farm_crossing') {
    // Classic Red Barn, Grain Silo & Windmill Tower at x=440
    inkedRoundRect(ctx, 250, 94, 24, 58, 8, '#cbd5e1', '#f8fafc', '#64748b');
    inkedRoundRect(ctx, 270, 104, 72, 48, 3, '#991b1b', '#dc2626', '#450a0a');
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(292, 122, 26, 28);
    // Windmill tower centered at 440, hub at (440,56)
    ctx.strokeStyle = '#3f2e26';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(430, 150);
    ctx.lineTo(440, 56);
    ctx.lineTo(450, 150);
    ctx.stroke();
    for (let fx = 10; fx < LOGICAL_WIDTH; fx += 24) {
      inkedRoundRect(ctx, fx, 142, 4, 12, 1, '#573b26');
    }
    ctx.fillStyle = '#573b26';
    ctx.fillRect(0, 146, LOGICAL_WIDTH, 2.2);
  } else if (biome === 'graveyard') {
    // Gothic stone chapel, wrought-iron fence, streetlamps & tombstones
    inkedRoundRect(ctx, 286, 84, 68, 66, 3, '#1e293b', '#334155', '#0f172a');
    for (let gx = 16; gx < LOGICAL_WIDTH; gx += 14) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gx, 132, 2.2, 22);
    }
    for (let tx = 45; tx < 680; tx += 52) {
      inkedRoundRect(ctx, tx, 136, 13, 17, 4, '#475569', '#94a3b8', '#1e293b', 1.1);
    }
    for (const lx of [200, 444]) {
      inkedRoundRect(ctx, lx - 2, 112, 4, 40, 1, '#0f172a');
      inkedCircle(ctx, lx, 112, 4.5, '#fef08a', '#ffffff');
    }
  } else {
    // Ruined city skyscrapers & refinery flare towers at [303, 331, 513]
    const bldgs = [
      [30, 62, 54],
      [96, 78, 48],
      [165, 54, 58],
      [365, 68, 62],
      [555, 58, 56],
      [626, 74, 52],
    ];
    for (const [bx, topY, bw] of bldgs) {
      inkedRoundRect(ctx, bx, topY, bw, 152 - topY, 2, '#27272a', '#3f3f46', '#18181b');
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      for (let wy = topY + 8; wy < 142; wy += 11) {
        for (let wx = bx + 6; wx < bx + bw - 8; wx += 10) {
          if ((hash32(wx, wy, seed) & 3) === 0) ctx.fillRect(wx, wy, 5, 6);
        }
      }
    }
    for (const sx of [303, 331, 513]) {
      inkedRoundRect(ctx, sx - 4, 38, 8, 114, 1.5, '#3f3f46', '#71717a', '#18181b');
    }
  }

  // 4. Upper & Lower Shoulders + Steel Guardrail
  const dirtCol =
    biome === 'graveyard' ? '#1e2631' : biome === 'forest_highway' ? '#3d4a35' : '#4a3b2f';
  ctx.fillStyle = dirtCol;
  ctx.fillRect(0, 148, LOGICAL_WIDTH, 34);
  ctx.fillRect(0, ROAD_Y_MAX - 2, LOGICAL_WIDTH, LOGICAL_HEIGHT - ROAD_Y_MAX + 4);

  // Highway W-beam Steel Guardrail along top edge of road
  for (let gx = 8; gx < LOGICAL_WIDTH; gx += 36) {
    inkedRoundRect(ctx, gx, 166, 4.5, 13, 1, '#334155');
  }
  inkedRoundRect(ctx, -4, 168, LOGICAL_WIDTH + 8, 6.5, 1.5, '#94a3b8', '#e2e8f0', '#475569', 1.2);

  // Background abandoned vehicles behind guardrail
  drawWreckedSedanHD(ctx, 168, 150, '#3b5d7a', '#64748b');
  drawWreckedSedanHD(ctx, 476, 149, '#7f1d1d', '#991b1b');

  // 5. Rich Multi-Layered Asphalt Roadway (180..278)
  const roadGrad = ctx.createLinearGradient(0, ROAD_Y_MIN, 0, ROAD_Y_MAX);
  roadGrad.addColorStop(0, '#2c3038');
  roadGrad.addColorStop(0.5, '#363b44');
  roadGrad.addColorStop(1, '#262a31');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, ROAD_Y_MIN, LOGICAL_WIDTH, ROAD_Y_MAX - ROAD_Y_MIN);

  // Subtle shoulder curb lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
  ctx.fillRect(0, ROAD_Y_MIN + 2, LOGICAL_WIDTH, 2);
  ctx.fillRect(0, ROAD_Y_MAX - 4, LOGICAL_WIDTH, 2);

  // Weathered center yellow dashed highway divider
  const midY = (ROAD_Y_MIN + ROAD_Y_MAX) * 0.5;
  for (let lx = 14; lx < LOGICAL_WIDTH; lx += 44) {
    inkedRoundRect(ctx, lx, midY - 2, 24, 4, 1, '#eab308', '#fef08a', '#a16207', 0.8);
  }

  // Deterministic asphalt aggregate, oil stains, skid marks & branching cracks
  for (let i = 0; i < 48; i++) {
    const ox = hash32(i, 11, seed) % LOGICAL_WIDTH;
    const oy = ROAD_Y_MIN + 8 + (hash32(i, 12, seed) % (ROAD_Y_MAX - ROAD_Y_MIN - 16));
    ctx.fillStyle = i % 3 === 0 ? 'rgba(15, 17, 21, 0.34)' : 'rgba(148, 163, 184, 0.12)';
    ctx.beginPath();
    ctx.ellipse(ox, oy, 6 + (i % 9), 2 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(15, 17, 22, 0.55)';
  ctx.lineWidth = 1.1;
  for (let c = 0; c < 18; c++) {
    let cx = (c * 41 + (hash32(c, 21, seed) % 25)) % LOGICAL_WIDTH;
    let cy = ROAD_Y_MIN + 6 + (hash32(c, 22, seed) % (ROAD_Y_MAX - ROAD_Y_MIN - 14));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 4; s++) {
      cx += 5 + ((hash32(c, s + 30, seed) % 9) - 3);
      cy += (hash32(c, s + 40, seed) % 9) - 4;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Tire skid tracks near bus & barricade zones
  ctx.strokeStyle = 'rgba(12, 12, 15, 0.32)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(95, 238);
  ctx.bezierCurveTo(180, 236, 250, 244, 330, 241);
  ctx.stroke();

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
  ctx.drawImage(baked, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (biome === 'farm_crossing') {
    const hubX = 440;
    const hubY = 56;
    ctx.save();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2.2;
    for (let b = 0; b < 4; b++) {
      const ang = time * 1.3 + (b * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(hubX, hubY);
      ctx.lineTo(hubX + Math.cos(ang) * 21, hubY + Math.sin(ang) * 21);
      ctx.stroke();
    }
    inkedCircle(ctx, hubX, hubY, 3, '#dc2626');
    ctx.restore();
  } else if (biome === 'graveyard') {
    ctx.save();
    const shift = (time * 14) % LOGICAL_WIDTH;
    const mistGrad = ctx.createLinearGradient(0, 150, 0, 282);
    mistGrad.addColorStop(0, 'rgba(148, 163, 184, 0.14)');
    mistGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.04)');
    mistGrad.addColorStop(1, 'rgba(148, 163, 184, 0.16)');
    ctx.fillStyle = mistGrad;
    for (let i = -1; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 250 + shift * 0.45, 164, 110, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(i * 270 - shift * 0.35, 272, 125, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (biome === 'junkyard_city') {
    [303, 331, 513].forEach((sx, idx) => {
      const flk = Math.sin(time * 16 + idx * 2.1) * 2.4;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.beginPath();
      ctx.ellipse(sx, 33 - flk * 0.5, 4.2, 6.5 + flk, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(sx, 34 - flk * 0.3, 2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Smooth drifting atmospheric dust motes
  ctx.fillStyle =
    biome === 'graveyard' ? 'rgba(186, 230, 253, 0.34)' : 'rgba(254, 240, 138, 0.30)';
  for (let m = 0; m < 12; m++) {
    const mx = (m * 67 + time * (9 + (m % 4) * 2.5)) % LOGICAL_WIDTH;
    const my = 84 + ((m * 37) % 180) + Math.sin(time * 2 + m) * 4.5;
    ctx.beginPath();
    ctx.arc(mx, my, 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderForegroundLeftProps(ctx: CanvasRenderingContext2D) {
  const tx = -6;
  const ty = 212;
  drawSoftShadow(ctx, tx + 42, ty + 84, 48, 10, 0.42);
  inkedRoundRect(ctx, tx, ty, 56, 44, 5, '#4b533b', '#657050', '#313726', 1.6);
  inkedRoundRect(ctx, tx + 9, ty + 11, 36, 22, 3, '#18201c', '#334155', '#090d0b', 1.3);
  inkedRoundRect(ctx, tx, ty + 38, 72, 46, 5, '#3f4632', '#586246', '#262b1e', 1.6);
  inkedRoundRect(ctx, tx + 44, ty + 49, 23, 25, 3, '#1f2419', '#3f4632');
  inkedCircle(ctx, tx + 22, ty + 82, 13, '#18181b', '#475569', 1.6);

  renderOilDrumHD(ctx, 56, 282, '#2d3325', '#464f39', '#6b7857');
  renderOilDrumHD(ctx, 76, 278, '#363d2c', '#525c43', '#788762');
  renderOilDrumHD(ctx, 66, 294, '#272c20', '#3d4532', '#5f6b4e');
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
  const x = busX;
  const y = busY;
  const engineBob = Math.sin(time * 16) * 0.65;
  const ratio = Math.max(0, hp / Math.max(1, maxHp));

  drawSoftShadow(ctx, x + 80, y + 74, 88, 11, 0.48);

  // Volumetric Warm Headlight Beam
  ctx.save();
  const beamGrad = ctx.createLinearGradient(x + 154, y + 56, x + 280, y + 66);
  beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
  beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(x + 154, y + 52 + engineBob);
  ctx.lineTo(x + 282, y + 36);
  ctx.lineTo(x + 282, y + 90);
  ctx.lineTo(x + 154, y + 62 + engineBob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Roof Luggage Rack + Explosive Red Drum & Military Crate
  renderOilDrumHD(ctx, x + 6, y - 28 + engineBob, '#991b1b', '#dc2626', '#f87171', 0, true);
  inkedRoundRect(ctx, x + 28, y - 19 + engineBob, 20, 10, 2, '#4d5c3b', '#748a59', '#2e3823', 1.3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x + 2, y - 12 + engineBob, 56, 5);

  // Crowned Yellow Bus Roof & Main Chassis
  inkedRoundRect(ctx, x + 2, y - 7 + engineBob, 120, 12, 5, '#facc15', '#fef08a', '#eab308', 1.5);
  inkedRoundRect(ctx, x, y + engineBob, 128, 67, 5, '#eab308', '#fde047', '#b45309', 1.7);

  // Protruding Front Engine Hood
  inkedRoundRect(ctx, x + 122, y + 26 + engineBob, 35, 41, 5, '#eab308', '#fde047', '#a16207', 1.7);
  // Apocalypse blood splatter on nose
  ctx.fillStyle = 'rgba(153, 27, 27, 0.78)';
  ctx.beginPath();
  ctx.ellipse(x + 144, y + 46 + engineBob, 11, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Grille, Bumper & Bright Halogen Headlight
  inkedRoundRect(ctx, x + 150, y + 33 + engineBob, 7, 21, 2, '#27272a', '#52525b');
  inkedCircle(ctx, x + 154, y + 56 + engineBob, 3.8, '#fef08a', '#ffffff', 1.3);
  inkedRoundRect(ctx, x + 146, y + 60 + engineBob, 14, 7.5, 2, '#52525b', '#94a3b8', '#18181b');

  // Black Rub-Rails & Crisp Stencil Typography
  ctx.fillStyle = '#18181b';
  ctx.fillRect(x + 2, y + 33 + engineBob, 94, 2.2);
  ctx.fillRect(x + 2, y + 46 + engineBob, 94, 2.2);
  ctx.fillStyle = '#18181b';
  ctx.font = '800 6.2px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BOARD OF EDUCATION', x + 5, y + 42 + engineBob);

  // Welded Steel Hull Armor
  if (weldedArmor) {
    inkedRoundRect(ctx, x + 6, y + 49 + engineBob, 86, 12, 2.5, '#64748b', '#cbd5e1', '#334155', 1.3);
  }

  // Reinforced Tinted Windows with Diagonal Specular Glass Reflections
  for (let wx = x + 6; wx <= x + 74; wx += 17) {
    inkedRoundRect(ctx, wx, y + 8 + engineBob, 14, 20, 2.5, '#1e293b', '#334155', '#0f172a', 1.3);
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + 3, y + 24 + engineBob);
    ctx.lineTo(wx + 11, y + 11 + engineBob);
    ctx.stroke();
    ctx.restore();
    if (weldedArmor) {
      inkedRoundRect(ctx, wx - 1, y + 13 + engineBob, 16, 3, 1, '#94a3b8', '#e2e8f0');
      inkedRoundRect(ctx, wx - 1, y + 20 + engineBob, 16, 3, 1, '#64748b', '#cbd5e1');
    }
  }

  // Accordion Deployment Door
  const doorOpen = doorOpenTimer > 0;
  inkedRoundRect(
    ctx,
    x + 96,
    y + 8 + engineBob,
    20,
    55,
    2.5,
    doorOpen ? '#451a03' : '#92400e',
    doorOpen ? '#fbbf24' : '#d97706',
    '#270e02',
    1.4
  );
  if (doorOpen) {
    const glow = ctx.createLinearGradient(x + 98, y + 10, x + 114, y + 60);
    glow.addColorStop(0, '#fef08a');
    glow.addColorStop(1, '#f59e0b');
    ctx.fillStyle = glow;
    ctx.fillRect(x + 99, y + 11 + engineBob, 14, 49);
  }

  // Heavy Round Rubber Tires & Steel Alloy Rims
  for (const wx of [x + 30, x + 134]) {
    inkedCircle(ctx, wx, y + 65, 13, '#18181b', '#3f3f46', 1.7);
    inkedCircle(ctx, wx, y + 65, 7.2, '#64748b', '#cbd5e1', 1.3);
    inkedCircle(ctx, wx, y + 65, 2.6, '#1e293b');
  }

  // Spiked Steel Cowcatcher Plow
  if (spikedBumper) {
    inkedRoundRect(ctx, x + 156, y + 45 + engineBob, 8, 23, 2, '#475569', '#94a3b8', '#1e293b');
    for (const sy of [48, 54, 60]) {
      ctx.beginPath();
      ctx.moveTo(x + 162, y + sy + engineBob);
      ctx.lineTo(x + 174, y + sy + 2.2 + engineBob);
      ctx.lineTo(x + 162, y + sy + 4.4 + engineBob);
      ctx.closePath();
      ctx.fillStyle = sy === 54 ? '#e2e8f0' : '#dc2626';
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }

  // Exhaust & Low-HP Engine Smoke
  const smokePhase = (time * 18) % 24;
  ctx.fillStyle = ratio < 0.45 ? 'rgba(15, 15, 18, 0.62)' : 'rgba(51, 65, 85, 0.30)';
  ctx.beginPath();
  ctx.arc(x + 132, y + 4 - smokePhase, 6.5, 0, Math.PI * 2);
  ctx.arc(x + 126, y - 8 - smokePhase * 1.1, 8.2, 0, Math.PI * 2);
  ctx.fill();

  // Sheriff Bill HD in Roof Hatch
  const recoil = billFiringTimer > 0 ? -2.8 : 0;
  const bx = x + 84 + recoil;
  const by = y - 19 + engineBob;
  inkedRoundRect(ctx, x + 77, by + 11, 24, 4.5, 1.5, '#eab308', '#fef08a');
  inkedRoundRect(ctx, bx, by + 1, 12, 11, 3, '#57534e', '#a8a29e', '#292524');
  inkedRoundRect(ctx, bx + 1, by - 8, 10, 9.5, 4, '#f2b888', '#fed7aa');
  // Sheriff Stetson Hat
  inkedRoundRect(ctx, bx - 4, by - 10, 19, 3.2, 1.5, '#e7e5e4', '#ffffff');
  inkedRoundRect(ctx, bx, by - 15, 11.5, 6, 2.5, '#f8fafc', '#ffffff', '#cbd5e1');
  // Hunting Rifle + Muzzle Flash
  inkedRoundRect(ctx, bx + 5, by + 2.2, 26, 3.2, 1, '#334155', '#94a3b8');
  if (billFiringTimer > 0) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(bx + 38, by + 3.8, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(bx + 36, by + 3.8, 5.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp Bus Integrity Bar above hood
  const barW = 56;
  const barX = x + 106;
  const barY = by + 14;
  inkedRoundRect(ctx, barX, barY, barW, 6.5, 2.5, '#09090b');
  const hpCol = ratio >= 0.85 ? '#22c55e' : ratio >= 0.45 ? '#eab308' : '#ef4444';
  if (ratio > 0) {
    inkedRoundRect(ctx, barX + 1, barY + 1, Math.max(3, (barW - 2) * ratio), 4.5, 1.8, hpCol, '#ffffff');
  }
}

export function renderBarricade(
  ctx: CanvasRenderingContext2D,
  x: number,
  hp: number,
  maxHp: number,
  shakeTimer: number,
  time = 0
) {
  const ratio = Math.max(0, hp / Math.max(1, maxHp));
  const shakeX = shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
  const bx = x + shakeX;

  drawSoftShadow(ctx, bx - 6, (ROAD_Y_MIN + ROAD_Y_MAX) * 0.5 + 8, 48, 56, 0.48);

  // Angled Steel I-Beam Spikes
  const beamH = ratio > 0.65 ? 42 : ratio > 0.3 ? 30 : 18;
  inkedRoundRect(ctx, bx - 6, 184 - beamH, 22, beamH, 2.5, '#3f3f46', '#71717a', '#18181b');

  // Concrete Hazard Barrier (Stage 1 & 2)
  if (ratio > 0.3) {
    inkedRoundRect(ctx, bx + 2, 174, 30, 19, 3, '#eab308', '#fef08a', '#a16207');
    ctx.fillStyle = INK;
    for (const sx of [bx + 7, bx + 16, bx + 25]) {
      ctx.fillRect(sx, 175, 4, 17);
    }
  }

  // Stacked Oil Drums
  if (ratio > 0.2) {
    const dmg: 0 | 1 | 2 = ratio < 0.35 ? 2 : ratio < 0.65 ? 1 : 0;
    renderOilDrumHD(ctx, bx - 18, 188, '#1e3a5f', '#2563eb', '#60a5fa', dmg);
    if (ratio > 0.55) {
      renderOilDrumHD(ctx, bx + 2, 198, '#574c35', '#786847', '#a38f65', dmg);
    }
  }

  // Overturned Red Car Door / Scrap Plate
  if (ratio > 0.12) {
    const h = ratio > 0.65 ? 46 : ratio > 0.3 ? 34 : 20;
    inkedRoundRect(ctx, bx - 25, 264 - h, 36, h, 4, '#b91c1c', '#ef4444', '#7f1d1d');
  }

  inkedRoundRect(ctx, bx - 46, 244, 28, 22, 3, '#ca8a04', '#facc15', '#713f12');
  renderOilDrumHD(ctx, bx - 56, 260, '#27272a', '#3f3f46', '#71717a', ratio < 0.5 ? 1 : 0);

  // Coiled Razor Wire
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.4;
  for (let wx = bx - 10; wx <= bx + 20; wx += 7.5) {
    ctx.beginPath();
    ctx.arc(wx, 265, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  inkedRoundRect(ctx, bx + 20, 234, 24, 48, 3, '#27272a', '#52525b', '#09090b');

  // Heavy Damage Smoke & Sparks
  if (ratio < 0.65) {
    const puff = (time * 20) % 24;
    ctx.fillStyle = 'rgba(15, 15, 20, 0.50)';
    ctx.beginPath();
    ctx.arc(bx - 10, 208 - puff, 9, 0, Math.PI * 2);
    ctx.fill();
    if (ratio < 0.32 && Math.sin(time * 28) > 0) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(bx - 8, 214, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Barricade Structural Integrity Bar
  const barW = 60;
  const barX = bx - 34;
  const barY = 132;
  inkedRoundRect(ctx, barX, barY, barW, 6.5, 2.5, '#09090b');
  if (ratio > 0) {
    inkedRoundRect(ctx, barX + 1, barY + 1, Math.max(3, (barW - 2) * ratio), 4.5, 1.8, '#f59e0b', '#fef08a');
  }
}

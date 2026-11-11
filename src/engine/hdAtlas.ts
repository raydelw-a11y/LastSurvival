import { SurvivorType, ZombieType } from '../types/game';

export const INK = '#121014';
export const ATLAS_SCALE = 4; // 4x supersampled vector baking for razor-sharp Retina sprites

export interface UnitPartAtlas {
  head: HTMLCanvasElement;
  headFlash: HTMLCanvasElement;
  torso: HTMLCanvasElement;
  torsoFlash: HTMLCanvasElement;
  weapon: HTMLCanvasElement;
  weaponFlash: HTMLCanvasElement;
  skinColor: string;
  shirtColor: string;
  pantColor: string;
  bootColor: string;
  scale: number;
  widthFactor: number;
}

const atlasCache = new Map<string, UnitPartAtlas>();

export function inkedRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  highlight?: string,
  shadow?: string,
  lineW = 1.55
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();

  if (shadow) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y + h * 0.62, w, h * 0.42);
    ctx.restore();
  }
  if (highlight) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = highlight;
    ctx.fillRect(x, y, w, Math.max(1.5, h * 0.26));
    ctx.restore();
  }

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.lineWidth = lineW;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

export function inkedCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  highlight?: string,
  lineW = 1.5
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (highlight) {
    ctx.beginPath();
    ctx.arc(cx - r * 0.24, cy - r * 0.26, r * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = highlight;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = lineW;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function makeCanvas(logicalW: number, logicalH: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.round(logicalW * ATLAS_SCALE);
  c.height = Math.round(logicalH * ATLAS_SCALE);
  const ctx = c.getContext('2d')!;
  ctx.scale(ATLAS_SCALE, ATLAS_SCALE);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

function makeWhiteFlashClone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawHumanEyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angry = false,
  visorColor?: string
) {
  if (visorColor) {
    inkedRoundRect(ctx, cx - 1, cy - 2.2, 8.2, 4.2, 1.6, visorColor, '#ffffff', undefined, 1.2);
    return;
  }
  // Whites + pupils + determined brow
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx + 0.5, cy - 1.5, 2.5, 2.4);
  ctx.fillRect(cx + 4.3, cy - 1.5, 2.4, 2.4);
  ctx.fillStyle = INK;
  ctx.fillRect(cx + 1.6, cy - 1.1, 1.4, 1.8);
  ctx.fillRect(cx + 5.2, cy - 1.1, 1.4, 1.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, angry ? cy - 2.4 : cy - 2.0);
  ctx.lineTo(cx + 7.2, angry ? cy - 1.3 : cy - 2.0);
  ctx.stroke();
}

function drawZombieEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, glow: string) {
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(cx + 1.6, cy - 0.5, 1.9, 0, Math.PI * 2);
  ctx.arc(cx + 5.4, cy - 0.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx + 1.8, cy - 0.5, 1.05, 0, Math.PI * 2);
  ctx.arc(cx + 5.5, cy - 0.5, 0.95, 0, Math.PI * 2);
  ctx.fill();
}

export function getUnitAtlas(subType: SurvivorType | ZombieType): UnitPartAtlas {
  const cached = atlasCache.get(subType);
  if (cached) return cached;

  // Head canvas: 24x24 logical (origin center at 12,13)
  const [head, hctx] = makeCanvas(24, 24);
  // Torso canvas: 24x24 logical (origin center at 12,12)
  const [torso, tctx] = makeCanvas(24, 24);
  // Weapon canvas: 34x20 logical (grip at 8,10)
  const [weapon, wctx] = makeCanvas(34, 20);

  let skinColor = '#f1b88a';
  let shirtColor = '#3b82f6';
  let pantColor = '#1e3a5f';
  let bootColor = '#27272a';
  let scale = 1.0;
  let widthFactor = 1.0;

  switch (subType) {
    case 'redneck': {
      skinColor = '#f2b888';
      shirtColor = '#c2410c';
      pantColor = '#1d4ed8';
      // Head + iconic blue trucker cap
      inkedRoundRect(hctx, 7, 7.5, 10.5, 10.5, 4.2, skinColor, '#fed7aa', '#d99564');
      drawHumanEyes(hctx, 10, 12.2, true);
      // Stubble jaw
      hctx.fillStyle = 'rgba(87, 65, 47, 0.35)';
      hctx.fillRect(8.5, 14.5, 8, 2.8);
      // Blue cap + white front patch + curved brim
      inkedRoundRect(hctx, 6.2, 4.2, 11.2, 5.2, 2.6, '#1d4ed8', '#60a5fa', '#1e3a8a');
      inkedRoundRect(hctx, 11.5, 4.8, 4.8, 3.2, 1, '#f8fafc');
      inkedRoundRect(hctx, 13.5, 7.6, 7.2, 2.2, 1, '#1e40af');
      // Torso: plaid work shirt + denim overalls with brass buttons
      inkedRoundRect(tctx, 6.5, 4.5, 11, 13.5, 3.2, '#dc2626', '#f87171', '#991b1b');
      inkedRoundRect(tctx, 7, 10.5, 10, 7.5, 2.2, '#1d4ed8', '#3b82f6', '#1e3a8a');
      tctx.fillStyle = '#1d4ed8';
      tctx.fillRect(8.2, 5, 2, 6);
      tctx.fillRect(13.8, 5, 2, 6);
      tctx.fillStyle = '#fbbf24';
      tctx.fillRect(8.6, 10.2, 1.4, 1.4);
      tctx.fillRect(14.0, 10.2, 1.4, 1.4);
      // Weapon: steel combat shovel
      inkedRoundRect(wctx, 3, 8.8, 18, 2.5, 1, '#92400e', '#d97706');
      inkedRoundRect(wctx, 20, 5.8, 9.5, 8.4, 2, '#94a3b8', '#e2e8f0', '#475569');
      break;
    }

    case 'farmer': {
      skinColor = '#ebb082';
      shirtColor = '#dc2626';
      pantColor = '#334155';
      inkedRoundRect(hctx, 7, 7.5, 10.5, 10.5, 4.2, skinColor, '#fed7aa', '#c98a5b');
      drawHumanEyes(hctx, 10, 12.2, false);
      // White bushy mustache & beard
      inkedRoundRect(hctx, 9.5, 14.0, 7.5, 3.8, 1.6, '#e2e8f0', '#ffffff', '#94a3b8', 1.1);
      // Golden straw hat
      inkedRoundRect(hctx, 3.2, 7.0, 17.8, 2.6, 1.2, '#eab308', '#fef08a', '#a16207');
      inkedRoundRect(hctx, 7.0, 3.4, 10.2, 4.4, 2, '#facc15', '#fef08a', '#ca8a04');
      hctx.fillStyle = '#991b1b';
      hctx.fillRect(7.4, 6.4, 9.4, 1.3);
      // Torso: flannel + suspenders
      inkedRoundRect(tctx, 6.5, 4.5, 11, 13.5, 3.2, '#b91c1c', '#ef4444', '#7f1d1d');
      inkedRoundRect(tctx, 6.8, 11.5, 10.4, 6.5, 2, '#334155', '#64748b', '#1e293b');
      // Double-barrel coach shotgun
      inkedRoundRect(wctx, 3, 9.2, 10, 4.2, 1.4, '#78350f', '#b45309');
      inkedRoundRect(wctx, 12, 7.8, 17, 3.4, 1, '#475569', '#cbd5e1', '#1e293b');
      break;
    }

    case 'gunslinger': {
      skinColor = '#f6c29d';
      shirtColor = '#1d4ed8';
      pantColor = '#0f172a';
      bootColor = '#09090b';
      scale = 0.99;
      widthFactor = 0.9;
      // Flowing dark-chestnut ponytail behind neck
      inkedRoundRect(hctx, 2.8, 8.6, 5.2, 7.2, 2.4, '#3b1d14', '#6b3423', '#1c0d08');
      // Female face + tactical police visor shades
      inkedRoundRect(hctx, 7.2, 7.4, 10.2, 10.2, 4.3, skinColor, '#ffedd5', '#d49a73');
      drawHumanEyes(hctx, 10.3, 12.1, true, '#0f172a');
      // Navy police peaked officer cap + gold star badge + dark visor
      inkedRoundRect(hctx, 6.2, 3.6, 12.2, 5.0, 2.2, '#1e3a8a', '#3b82f6', '#172554');
      inkedRoundRect(hctx, 13.4, 7.2, 6.6, 2.0, 1.0, '#09090b', '#334155');
      inkedCircle(hctx, 13.2, 5.6, 1.35, '#fbbf24', '#fef08a');
      // Fitted navy police shirt + dark tie + gold badge + dual-holster tactical belt
      inkedRoundRect(tctx, 6.8, 4.6, 10.4, 13.4, 3.3, '#1e40af', '#3b82f6', '#172554');
      tctx.fillStyle = '#0f172a';
      tctx.fillRect(11.3, 5.6, 1.8, 7.6);
      inkedCircle(tctx, 14.3, 8.0, 1.4, '#fbbf24', '#fef08a');
      inkedRoundRect(tctx, 6.3, 13.8, 11.4, 3.2, 1.1, '#09090b', '#334155');
      tctx.fillStyle = '#fbbf24';
      tctx.fillRect(11.0, 14.3, 2.3, 2.1);
      // Sleek semi-auto 9mm tactical police pistol (silver slide + black grip)
      inkedRoundRect(wctx, 7.2, 9.6, 4.4, 6.2, 1.3, '#18181b', '#3f3f46');
      inkedRoundRect(wctx, 7.0, 6.8, 13.2, 4.0, 1.2, '#64748b', '#e2e8f0', '#1e293b');
      wctx.fillStyle = '#38bdf8';
      wctx.fillRect(17.8, 7.3, 1.5, 1.1);
      break;
    }

    case 'builder': {
      skinColor = '#eab084';
      shirtColor = '#f97316';
      pantColor = '#374151';
      scale = 1.05;
      widthFactor = 1.08;
      inkedRoundRect(hctx, 6.8, 7.5, 11, 10.5, 4.2, skinColor, '#fed7aa', '#c6885c');
      drawHumanEyes(hctx, 10, 12.4, true, '#38bdf8'); // Safety goggles
      // Yellow construction hard-hat with ridge
      inkedRoundRect(hctx, 5.2, 3.6, 14.2, 5.8, 2.8, '#facc15', '#fef08a', '#ca8a04');
      inkedRoundRect(hctx, 8.5, 2.4, 7.2, 2.2, 1, '#fde047');
      // Torso: Kevlar vest + high-vis reflective stripes
      inkedRoundRect(tctx, 5.8, 4.2, 12.4, 14, 3.4, '#ea580c', '#fb923c', '#9a3412');
      tctx.fillStyle = '#fde047';
      tctx.fillRect(6.5, 12.5, 11, 2.2);
      tctx.fillRect(8.2, 5, 2.1, 8);
      tctx.fillRect(13.7, 5, 2.1, 8);
      // Heavy sledgehammer / rebar club
      inkedRoundRect(wctx, 4, 8.8, 17, 2.6, 1, '#78350f', '#b45309');
      inkedRoundRect(wctx, 19.5, 4.8, 8.5, 10.4, 1.8, '#52525b', '#a1a1aa', '#27272a');
      break;
    }

    case 'mechanic': {
      skinColor = '#edb489';
      shirtColor = '#1e40af';
      pantColor = '#1e293b';
      inkedRoundRect(hctx, 7, 7.5, 10.5, 10.5, 4.2, skinColor, '#fed7aa', '#c98a5b');
      drawHumanEyes(hctx, 10, 12.4, true);
      // Grease smudge + backwards red welder cap
      inkedRoundRect(hctx, 6.4, 4.2, 11, 5.0, 2.4, '#dc2626', '#f87171', '#991b1b');
      inkedRoundRect(hctx, 3.6, 7.4, 5.5, 2.2, 1, '#991b1b');
      // Blue mechanic jumpsuit + toolbelt
      inkedRoundRect(tctx, 6.5, 4.5, 11, 13.5, 3.2, '#2563eb', '#60a5fa', '#1e3a8a');
      inkedRoundRect(tctx, 6.2, 13.8, 11.6, 3.2, 1, '#78350f', '#b45309');
      tctx.fillStyle = '#fbbf24';
      tctx.fillRect(11, 14.2, 2.5, 2.2);
      // Heavy steel pipe wrench
      inkedRoundRect(wctx, 4, 8.5, 17, 3.0, 1.2, '#dc2626', '#f87171');
      inkedRoundRect(wctx, 19.5, 5.5, 8.2, 8.8, 2, '#cbd5e1', '#ffffff', '#64748b');
      wctx.fillStyle = INK;
      wctx.fillRect(23.5, 8.2, 4.5, 3.2);
      break;
    }

    case 'policeman': {
      skinColor = '#e8ac7e';
      shirtColor = '#1e3a8a';
      pantColor = '#0f172a';
      scale = 1.07;
      widthFactor = 1.15;
      inkedRoundRect(hctx, 6.4, 7.2, 11.6, 11, 4.5, skinColor, '#fed7aa', '#c08256');
      drawHumanEyes(hctx, 10.2, 12.2, true, '#0f172a'); // Police aviators
      // Police peaked cap + gold badge
      inkedRoundRect(hctx, 5.5, 3.5, 13, 5.2, 2.2, '#1e3a8a', '#3b82f6', '#172554');
      inkedRoundRect(hctx, 13.5, 7.2, 6.8, 2.2, 1, '#0f172a');
      inkedCircle(hctx, 13.2, 5.6, 1.5, '#fbbf24');
      // Heavy tactical armor vest + sheriff star
      inkedRoundRect(tctx, 5.4, 4.0, 13.2, 14.4, 3.6, '#1e3a8a', '#3b82f6', '#0f172a');
      inkedRoundRect(tctx, 6.4, 5.5, 11.2, 9.5, 2.4, '#1e293b', '#475569', '#09090b');
      inkedCircle(tctx, 14.5, 8.2, 1.6, '#fbbf24');
      // Tactical pump riot shotgun with flashlight
      inkedRoundRect(wctx, 3, 8.8, 9, 4.4, 1.4, '#1e293b', '#475569');
      inkedRoundRect(wctx, 11, 7.5, 18, 3.6, 1.2, '#334155', '#94a3b8', '#0f172a');
      inkedRoundRect(wctx, 15, 10.8, 8, 2.6, 1, '#f97316');
      break;
    }

    case 'sniper': {
      skinColor = '#f7c8a4';
      shirtColor = '#3f6212';
      pantColor = '#1e293b';
      scale = 0.98;
      widthFactor = 0.92;
      // Ponytail + hood/cap + precision optics
      inkedRoundRect(hctx, 3.4, 9.2, 4.5, 6.5, 2.2, '#78350f', '#b45309');
      inkedRoundRect(hctx, 7.2, 7.5, 10, 10.2, 4.2, skinColor, '#ffedd5', '#d69e76');
      drawHumanEyes(hctx, 10.2, 12.2, true);
      inkedRoundRect(hctx, 6.6, 4.2, 11, 4.8, 2.4, '#365314', '#65a30d', '#1a2e05');
      inkedRoundRect(hctx, 13.5, 7.4, 6.5, 2, 1, '#1a2e05');
      // Ranger cloak & chest rig
      inkedRoundRect(tctx, 6.8, 4.6, 10.4, 13.4, 3.2, '#3f6212', '#65a30d', '#1a2e05');
      inkedRoundRect(tctx, 7.5, 6.5, 9, 6.5, 1.8, '#451a03', '#78350f');
      // Long .50-caliber sniper rifle with telescopic scope & muzzle brake
      inkedRoundRect(wctx, 1, 8.8, 10, 4.2, 1.4, '#451a03', '#92400e');
      inkedRoundRect(wctx, 10, 8.0, 22.5, 2.8, 1, '#334155', '#cbd5e1', '#0f172a');
      inkedRoundRect(wctx, 12, 4.8, 10.5, 2.8, 1.2, '#0f172a', '#38bdf8');
      break;
    }

    case 'flamethrower': {
      skinColor = '#52525b';
      shirtColor = '#991b1b';
      pantColor = '#27272a';
      scale = 1.05;
      widthFactor = 1.12;
      // Full NBC Pyro Gas Mask + Amber Reflective Visor
      inkedRoundRect(hctx, 6.5, 6.2, 11.2, 11.8, 5, '#27272a', '#52525b', '#09090b');
      drawHumanEyes(hctx, 10, 11.5, true, '#f59e0b');
      inkedCircle(hctx, 16.5, 15.2, 3.0, '#52525b', '#94a3b8');
      // Pressurized dorsal fuel tanks + fireproof suit
      inkedRoundRect(tctx, 2.5, 4.0, 5.5, 12.5, 2.4, '#ef4444', '#fca5a5', '#991b1b');
      inkedRoundRect(tctx, 6.4, 4.5, 11.6, 13.8, 3.4, '#7f1d1d', '#dc2626', '#450a0a');
      // Heavy flamethrower nozzle with pilot flame tip
      inkedRoundRect(wctx, 4, 7.8, 21, 4.4, 1.6, '#3f3f46', '#a1a1aa', '#18181b');
      inkedRoundRect(wctx, 24, 7.0, 5.5, 5.8, 1.4, '#f97316', '#fde047');
      break;
    }

    case 'juggernaut': {
      skinColor = '#27272a';
      shirtColor = '#1e293b';
      pantColor = '#0f172a';
      scale = 1.18;
      widthFactor = 1.24;
      // Heavy EOD Spec-Ops Helmet with glowing cyan/red slit
      inkedRoundRect(hctx, 5.5, 5.2, 13.2, 12.8, 4.5, '#334155', '#64748b', '#0f172a');
      inkedRoundRect(hctx, 9.2, 9.6, 8.8, 4.2, 1.5, '#09090b');
      inkedRoundRect(hctx, 10.2, 10.6, 7.0, 2.0, 0.8, '#38bdf8', '#e0f2fe');
      // Massive ceramic-titanium chest & pauldrons
      inkedRoundRect(tctx, 4.5, 3.5, 15, 15, 4, '#1e293b', '#475569', '#09090b');
      inkedRoundRect(tctx, 6.8, 5.8, 10.4, 8.5, 2.2, '#334155', '#94a3b8');
      tctx.fillStyle = '#eab308';
      tctx.fillRect(8.5, 8.5, 7, 1.8);
      // Seismic kinetic warhammer
      inkedRoundRect(wctx, 2, 8.5, 18, 3.2, 1.2, '#475569', '#94a3b8');
      inkedRoundRect(wctx, 18.5, 3.2, 12.5, 13.6, 2.4, '#1e293b', '#64748b', '#09090b');
      inkedRoundRect(wctx, 28, 4.5, 3.2, 11, 1, '#38bdf8', '#bae6fd');
      break;
    }

    case 'hound':
    case 'turret':
    case 'drone': {
      // Custom non-humanoid rigs rendered directly in PixelArtRenderer, bake fallback badge
      inkedCircle(hctx, 12, 12, 6, '#475569', '#94a3b8');
      inkedRoundRect(tctx, 6, 6, 12, 12, 3, '#334155', '#64748b');
      inkedRoundRect(wctx, 6, 7, 18, 5, 2, '#64748b', '#cbd5e1');
      break;
    }

    // ==================== ZOMBIES ====================
    case 'walker': {
      skinColor = '#7c9a6d';
      shirtColor = '#64748b';
      pantColor = '#334155';
      inkedRoundRect(hctx, 7, 7.2, 10.5, 10.8, 4.4, skinColor, '#a3be8c', '#4d6643');
      drawZombieEyes(hctx, 10, 12.2, '#ef4444');
      // Bloodied jaw
      hctx.fillStyle = '#991b1b';
      hctx.fillRect(11.5, 14.8, 5.2, 2.6);
      // Torn bloody civilian shirt exposing ribs
      inkedRoundRect(tctx, 6.5, 4.6, 11, 13.4, 3.2, '#64748b', '#94a3b8', '#334155');
      tctx.fillStyle = '#991b1b';
      tctx.beginPath();
      tctx.arc(13, 11, 3.2, 0, Math.PI * 2);
      tctx.fill();
      break;
    }

    case 'runner': {
      skinColor = '#84a976';
      shirtColor = '#b91c1c';
      pantColor = '#1e293b';
      scale = 0.97;
      inkedRoundRect(hctx, 7.2, 7.4, 10.2, 10.4, 4.2, skinColor, '#b5d6a7', '#4f6d44');
      drawZombieEyes(hctx, 10.4, 12.0, '#fbbf24');
      hctx.fillStyle = '#dc2626';
      hctx.fillRect(11.5, 14.4, 5.5, 3);
      // Shredded crimson track jacket
      inkedRoundRect(tctx, 6.8, 4.8, 10.4, 13, 3.2, '#dc2626', '#f87171', '#7f1d1d');
      tctx.fillStyle = '#fef08a';
      tctx.fillRect(10.5, 5.5, 2, 11);
      break;
    }

    case 'crit_zombie': {
      skinColor = '#6d8764';
      shirtColor = '#581c87';
      pantColor = '#18181b';
      scale = 1.06;
      widthFactor = 1.08;
      inkedRoundRect(hctx, 6.8, 7.0, 11, 11, 4.4, skinColor, '#95b08b', '#3f5239');
      drawZombieEyes(hctx, 10.2, 12.0, '#ff2a55');
      // Glowing crimson veins & feral fangs
      hctx.fillStyle = '#ef4444';
      hctx.fillRect(11, 14.5, 6, 3.2);
      inkedRoundRect(tctx, 6.0, 4.4, 12, 13.8, 3.4, '#4c1d95', '#7c3aed', '#2e1065');
      tctx.fillStyle = '#ef4444';
      tctx.fillRect(9, 7.5, 6, 4.5);
      break;
    }

    case 'armored': {
      skinColor = '#6b8763';
      shirtColor = '#1e293b';
      pantColor = '#0f172a';
      scale = 1.1;
      widthFactor = 1.16;
      inkedRoundRect(hctx, 6.4, 7.0, 11.4, 11, 4.4, skinColor, '#93ad8b', '#44593e');
      // Cracked SWAT riot helmet + ballistic visor
      inkedRoundRect(hctx, 5.4, 4.0, 13.2, 7.2, 3.4, '#1e293b', '#475569', '#09090b');
      inkedRoundRect(hctx, 10.5, 8.2, 8.5, 4.6, 1.4, 'rgba(56, 189, 248, 0.65)', '#e0f2fe');
      drawZombieEyes(hctx, 10.5, 12.0, '#ef4444');
      // Heavy SWAT armor torso
      inkedRoundRect(tctx, 5.2, 4.0, 13.6, 14.4, 3.6, '#1e293b', '#475569', '#09090b');
      tctx.fillStyle = '#94a3b8';
      tctx.fillRect(7.5, 7.2, 9, 2.2);
      break;
    }

    case 'skeleton': {
      skinColor = '#e2e8f0';
      shirtColor = '#cbd5e1';
      pantColor = '#64748b';
      scale = 0.94;
      widthFactor = 0.86;
      // Crisp bone skull
      inkedRoundRect(hctx, 7.4, 7.0, 9.6, 10.2, 4.4, '#e2e8f0', '#ffffff', '#94a3b8');
      drawZombieEyes(hctx, 10.2, 11.8, '#ef4444');
      hctx.fillStyle = INK;
      hctx.fillRect(11, 14.8, 5, 1.4);
      // Ribcage torso
      inkedRoundRect(tctx, 7.8, 5.0, 8.4, 12.5, 2.6, '#cbd5e1', '#f8fafc', '#64748b');
      tctx.fillStyle = INK;
      for (let ry = 7; ry <= 14; ry += 2.6) {
        tctx.fillRect(8.8, ry, 6.4, 1.1);
      }
      break;
    }

    case 'bloated': {
      skinColor = '#84a370';
      shirtColor = '#0284c7';
      pantColor = '#1e293b';
      scale = 1.22;
      widthFactor = 1.38;
      inkedRoundRect(hctx, 5.8, 6.8, 12.4, 11.4, 5.2, skinColor, '#b5d49c', '#526b42');
      drawZombieEyes(hctx, 10.5, 11.8, '#84cc16');
      // Massive swollen paramedic belly with glowing volatile pustules
      inkedRoundRect(tctx, 3.4, 3.6, 17.2, 15.8, 6.5, '#0369a1', '#38bdf8', '#0c4a6e');
      inkedCircle(tctx, 13.5, 12.5, 4.8, '#84cc16', '#d9f99d');
      inkedCircle(tctx, 9.2, 9.2, 2.4, '#a3e635', '#ecfccb');
      break;
    }
  }

  const entry: UnitPartAtlas = {
    head,
    headFlash: makeWhiteFlashClone(head),
    torso,
    torsoFlash: makeWhiteFlashClone(torso),
    weapon,
    weaponFlash: makeWhiteFlashClone(weapon),
    skinColor,
    shirtColor,
    pantColor,
    bootColor,
    scale,
    widthFactor,
  };
  atlasCache.set(subType, entry);
  return entry;
}

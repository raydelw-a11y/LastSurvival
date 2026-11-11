import { BiomeType, SurvivorType, TacticalItemType, ZombieType } from '../types/game';
import { getUnitAtlas, INK, inkedCircle, inkedRoundRect } from './hdAtlas';
import {
  drawSoftShadow,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  renderArmoredBus,
  renderBarricade,
  renderBiomeBackground,
  renderForegroundLeftProps,
  renderOilDrumHD,
  ROAD_Y_MAX,
  ROAD_Y_MIN,
  syncCanvasHiDPI,
} from './hdEnvironment';

export {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  ROAD_Y_MIN,
  ROAD_Y_MAX,
  syncCanvasHiDPI,
  renderBiomeBackground,
  renderForegroundLeftProps,
  renderArmoredBus,
  renderBarricade,
};

export interface RenderUnit {
  id: string;
  team: 'survivor' | 'zombie';
  subType: SurvivorType | ZombieType;
  level: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  ghostHp?: number;
  maxHp: number;
  state:
    | 'spawning'
    | 'emerging'
    | 'march'
    | 'windup'
    | 'attack'
    | 'reload'
    | 'hurt'
    | 'dying'
    | 'corpse';
  animTime: number;
  attackProgress: number;
  reloadProgress: number;
  whiteFlashTimer: number;
  critTelegraphTimer?: number;
  deathProgress?: number;
  levelUpGlowTimer?: number;
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

const RANGED_SURVIVORS = new Set<string>([
  'farmer',
  'gunslinger',
  'policeman',
  'sniper',
  'flamethrower',
  'turret',
  'drone',
]);

function renderUnitGhostHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  level: number,
  hp: number,
  ghostHp: number,
  maxHp: number,
  isSurvivor: boolean
) {
  const safeMax = Math.max(1, maxHp);
  const ratio = Math.max(0, Math.min(1, hp / safeMax));
  const ghostRatio = Math.max(ratio, Math.min(1, ghostHp / safeMax));

  const bx = x - 15;
  const by = topY;

  // Shield Level Badge
  const badgeCol = isSurvivor ? '#2563eb' : '#dc2626';
  const badgeHi = isSurvivor ? '#60a5fa' : '#f87171';
  inkedRoundRect(ctx, bx, by - 2.5, 9.5, 9.5, 2.5, badgeCol, badgeHi, undefined, 1.2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 6px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(level), bx + 4.75, by + 4.5);

  // Health Bar Container + Ghost Damage Trail + Main Fill
  const barW = 20;
  const barX = bx + 10.5;
  inkedRoundRect(ctx, barX, by - 0.5, barW, 5.2, 2.2, '#09090b', undefined, undefined, 1.2);

  if (ghostRatio > ratio + 0.01) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(barX + 0.8, by + 0.3, Math.max(1, (barW - 1.6) * ghostRatio), 3.6, 1.4);
    ctx.fill();
  }

  if (ratio > 0) {
    const fillCol = isSurvivor ? '#22c55e' : '#ef4444';
    const hiCol = isSurvivor ? '#86efac' : '#fca5a5';
    const w = Math.max(1.8, (barW - 1.6) * ratio);
    ctx.fillStyle = fillCol;
    ctx.beginPath();
    ctx.roundRect(barX + 0.8, by + 0.3, w, 3.6, 1.4);
    ctx.fill();
    ctx.fillStyle = hiCol;
    ctx.fillRect(barX + 1.2, by + 0.5, Math.max(0.8, w - 0.8), 1.1);
  }
}

function renderHoundRig(ctx: CanvasRenderingContext2D, unit: RenderUnit, flash: boolean) {
  const stride = unit.state === 'march' ? Math.sin(unit.animTime * 18) : 0;
  const lunge = unit.state === 'attack' ? Math.sin(unit.attackProgress * Math.PI) * 5 : 0;
  const bodyCol = flash ? '#ffffff' : '#92400e';
  const darkCol = flash ? '#f8fafc' : '#451a03';
  const vestCol = flash ? '#ffffff' : '#365314';

  ctx.save();
  ctx.translate(lunge, -Math.abs(stride) * 1.8);

  // 4 Galloping Legs
  for (const [lx, phase] of [
    [-6, stride],
    [-3, -stride],
    [5, -stride],
    [8, stride],
  ]) {
    ctx.save();
    ctx.translate(lx, -7);
    ctx.rotate(phase * 0.55);
    inkedRoundRect(ctx, -1.6, 0, 3.2, 7.5, 1.2, darkCol, bodyCol, undefined, 1.2);
    ctx.restore();
  }

  // Tail
  ctx.save();
  ctx.translate(-9, -11);
  ctx.rotate(-0.5 + stride * 0.25);
  inkedRoundRect(ctx, -6, -1.4, 6.5, 2.8, 1.2, darkCol, undefined, undefined, 1.1);
  ctx.restore();

  // Muscular K-9 Body + Tactical Kevlar Saddle
  inkedRoundRect(ctx, -9.5, -14.5, 19, 8.5, 4, bodyCol, '#d97706', darkCol, 1.5);
  inkedRoundRect(ctx, -5, -15, 9.5, 6.5, 2, vestCol, '#65a30d', undefined, 1.2);

  // Wolf/Shepherd Head + Pointed Ears + Snapping Jaw
  inkedRoundRect(ctx, 6.5, -19.5, 9.5, 8, 3.2, bodyCol, '#d97706', darkCol, 1.4);
  // Pointed ears
  ctx.beginPath();
  ctx.moveTo(7.5, -19);
  ctx.lineTo(9.5, -24);
  ctx.lineTo(11.8, -19);
  ctx.closePath();
  ctx.fillStyle = darkCol;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Snout + Fangs
  inkedRoundRect(ctx, 13, -16.5, 6.2, 4.2, 1.6, darkCol);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(12.2, -17.8, 1.8, 1.5);
  if (unit.state === 'attack') {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(19, -14, 7, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

function renderTurretRig(ctx: CanvasRenderingContext2D, unit: RenderUnit, time: number, flash: boolean) {
  const firing = unit.state === 'attack';
  const recoil = firing ? (Math.sin(time * 45) * 1.6 - 1.2) : 0;

  // Armored Steel Tripod Legs
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(0, -11);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.strokeStyle = flash ? '#ffffff' : '#64748b';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Ammo Box + Rotating Turret Receiver
  inkedRoundRect(
    ctx,
    -9.5 + recoil * 0.4,
    -21,
    15,
    10.5,
    2.5,
    flash ? '#ffffff' : '#365314',
    '#65a30d',
    '#1a2e05',
    1.5
  );
  inkedRoundRect(ctx, -6, -14, 8, 6.5, 1.5, '#eab308', '#fef08a');

  // Spinning Multi-Barrel Gatling Assembly
  const bx = 4 + recoil;
  inkedRoundRect(ctx, bx, -19.5, 15, 6.2, 1.8, flash ? '#ffffff' : '#334155', '#cbd5e1', '#0f172a', 1.4);
  const spinY = firing ? Math.sin(time * 50) * 1.4 : 0;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(bx + 2, -16.5 + spinY);
  ctx.lineTo(bx + 14, -16.5 + spinY);
  ctx.stroke();

  // Targeting Laser Sensor
  inkedCircle(ctx, 2, -22.5, 2.4, '#ef4444', '#fca5a5');

  if (firing) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(bx + 20, -16.4, 7.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(bx + 18.5, -16.4, 4.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderDroneRig(ctx: CanvasRenderingContext2D, unit: RenderUnit, time: number, flash: boolean) {
  const bob = Math.sin(time * 7 + unit.animTime) * 2.2;
  const firing = unit.state === 'attack';

  ctx.save();
  ctx.translate(0, bob);

  // Downward Volumetric Tactical Searchlight Cone
  const cone = ctx.createLinearGradient(4, -6, 18, 34);
  cone.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
  cone.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(1, -6);
  ctx.lineTo(24, 34);
  ctx.lineTo(-8, 34);
  ctx.closePath();
  ctx.fill();

  // Rotor Arms & High-Speed Blurred Rotor Discs
  inkedRoundRect(ctx, -14, -15, 28, 3.2, 1.5, flash ? '#ffffff' : '#475569', '#94a3b8');
  const rotorW = 9 + Math.sin(time * 60) * 2;
  for (const rx of [-11, 11]) {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.68)';
    ctx.beginPath();
    ctx.ellipse(rx, -16.8, rotorW, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    inkedCircle(ctx, rx, -16, 1.8, '#1e293b');
  }

  // Central Armored Fuselage + Cyan Optical Gimbal + Underslung Autocannon
  inkedRoundRect(
    ctx,
    -8.5,
    -14.5,
    17,
    8.5,
    3.8,
    flash ? '#ffffff' : '#1e293b',
    '#64748b',
    '#09090b',
    1.5
  );
  inkedCircle(ctx, 5.2, -10.2, 2.6, '#38bdf8', '#e0f2fe');
  inkedRoundRect(ctx, 0, -6.5, 13, 3.2, 1, '#334155', '#94a3b8');

  // Strobe Nav Light
  if (Math.sin(time * 10) > 0) {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(-6, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (firing) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(16, -4.8, 6, 2.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  unit: RenderUnit,
  time: number
) {
  const x = unit.x;
  const y = unit.y;
  const z = unit.z;
  const isSurvivor = unit.team === 'survivor';
  const flash = unit.whiteFlashTimer > 0;
  const atlas = getUnitAtlas(unit.subType);

  // Player Direct Control Ring
  if (unit.isPlayerControlled && unit.state !== 'corpse' && unit.state !== 'dying') {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.92)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(x, y, 11.5, 4.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Ground Shadow
  const shadowScale = Math.max(0.45, 1 - z / 90) * atlas.widthFactor;
  drawSoftShadow(ctx, x, y + 1, 9.5 * shadowScale, 3.4 * shadowScale, 0.38);

  // Live Commander Level-Up Golden Morale Glow!
  if ((unit.levelUpGlowTimer ?? 0) > 0 && unit.state !== 'corpse' && unit.state !== 'dying') {
    const gAlpha = Math.min(1, (unit.levelUpGlowTimer ?? 0) * 1.2) * 0.55;
    ctx.save();
    const grad = ctx.createRadialGradient(x, y - z - 14, 2, x, y - z - 14, 22);
    grad.addColorStop(0, `rgba(254, 240, 138, ${gAlpha})`);
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y - z - 14, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Fallen Infectable Corpse State
  if (unit.state === 'corpse') {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(127, 29, 29, 0.62)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twisting warning when about to reanimate!
    const rem = unit.corpseTimer ?? 5;
    const twitch = rem < 1.8 ? Math.sin(time * 34) * 1.5 : 0;
    ctx.translate(twitch, -2);
    ctx.rotate(Math.PI * 0.48);
    ctx.scale(atlas.scale * 0.92, atlas.scale * 0.92);
    ctx.drawImage(flash ? atlas.torsoFlash : atlas.torso, -12, -12, 24, 24);
    ctx.drawImage(flash ? atlas.headFlash : atlas.head, -12, -21, 24, 24);
    ctx.restore();

    if (rem < 2.2) {
      for (let s = 0; s < 3; s++) {
        const sy = y - 4 - ((time * 16 + s * 6) % 14);
        const sx = x - 6 + s * 6 + Math.sin(time * 8 + s) * 2;
        inkedCircle(ctx, sx, sy, 2.0, '#84cc16', '#d9f99d', 0.8);
      }
    }
    return;
  }

  // Smooth Dying Collapse State (0.40s -> zero abrupt 0ms pop-out!)
  const isDying = unit.state === 'dying';
  const deathT = isDying ? Math.min(1, unit.deathProgress ?? 0) : 0;

  ctx.save();
  ctx.translate(x, y - z);
  if (isDying) {
    ctx.globalAlpha = Math.max(0.12, 1 - deathT * 0.88);
    const fallDir = -unit.facing;
    ctx.translate(fallDir * deathT * 8, -Math.sin(deathT * Math.PI) * 4);
    ctx.rotate(fallDir * deathT * 1.48); // Smooth 0deg -> 85deg fall
  }

  // Underground Skeleton Emergence Clipping
  if (unit.state === 'emerging') {
    ctx.beginPath();
    ctx.rect(-28, -48, 56, 49);
    ctx.clip();
    const rise = Math.max(0, 1 - unit.animTime * 1.5) * 22;
    ctx.translate(0, rise);
  }

  ctx.scale(unit.facing * atlas.scale, atlas.scale);

  // Dedicated Non-Humanoid HD Rigs
  if (unit.subType === 'hound') {
    renderHoundRig(ctx, unit, flash);
  } else if (unit.subType === 'turret') {
    renderTurretRig(ctx, unit, time, flash);
  } else if (unit.subType === 'drone') {
    renderDroneRig(ctx, unit, time, flash);
  } else {
    // ===============================================================
    // 7-NODE ARTICULATED HUMANOID / ZOMBIE RIG (4x Supersampled Parts)
    // ===============================================================
    const isMoving = unit.state === 'march' || unit.state === 'spawning';
    const walkFreq = unit.subType === 'runner' ? 16 : isSurvivor ? 12 : 8.5;
    const stride = isMoving ? Math.sin(unit.animTime * walkFreq) : 0;
    const bob = isMoving ? Math.abs(Math.cos(unit.animTime * walkFreq)) * 1.6 : Math.sin(time * 3.5 + unit.x) * 0.5;
    const isRanged = isSurvivor && RANGED_SURVIVORS.has(unit.subType);

    let torsoLean = isMoving ? (isSurvivor ? 0.06 : 0.16) : 0;
    let armAngle = 0;
    let recoilX = 0;

    if (unit.state === 'windup') {
      torsoLean = -0.14;
      armAngle = isRanged ? -0.08 : -1.15;
    } else if (unit.state === 'attack') {
      const p = unit.attackProgress;
      if (isRanged) {
        recoilX = unit.subType === 'flamethrower' ? -0.8 : -2.6 * (1 - p);
        armAngle = -0.12 * (1 - p);
      } else {
        torsoLean = 0.22 * Math.sin(p * Math.PI);
        armAngle = -1.1 + p * 2.05;
      }
    } else if (unit.state === 'reload') {
      armAngle = 0.45;
    } else if (!isSurvivor) {
      // Zombie outstretched shambling arms
      armAngle = -0.45 + Math.sin(time * 5 + unit.y) * 0.12;
    }

    const legW = 4.2 * atlas.widthFactor;

    // 1. Back Leg & Boot
    ctx.save();
    ctx.translate(-1.8, -9);
    ctx.rotate(-stride * 0.52);
    inkedRoundRect(ctx, -legW * 0.5, 0, legW, 8.2, 1.6, flash ? '#ffffff' : atlas.pantColor, undefined, '#09090b', 1.25);
    inkedRoundRect(ctx, -legW * 0.5, 6.2, legW + 1.4, 3.0, 1.2, flash ? '#ffffff' : atlas.bootColor, '#52525b', undefined, 1.2);
    ctx.restore();

    // 2. Back Arm (Dual-Wield Off-Hand Pistol for Gunslinger!)
    const isGunslinger = unit.subType === 'gunslinger';
    const akimboLeftActive = isGunslinger && Math.floor(unit.animTime * 9) % 2 === 1;
    ctx.save();
    if (isGunslinger) {
      const offHandRecoil =
        unit.state === 'attack' && akimboLeftActive ? -2.4 * (1 - unit.attackProgress) : 0;
      const offHandAngle =
        unit.state === 'reload'
          ? 0.38
          : unit.state === 'attack' && akimboLeftActive
          ? -0.16 * (1 - unit.attackProgress)
          : -0.06 + stride * 0.08;
      ctx.translate(4.8 + offHandRecoil, -20.2 - bob);
      ctx.rotate(offHandAngle);
      ctx.drawImage(flash ? atlas.weaponFlash : atlas.weapon, -5, -10, 32, 19);
      inkedRoundRect(
        ctx,
        -2.2,
        -1.8,
        5.0,
        3.9,
        1.4,
        flash ? '#ffffff' : atlas.shirtColor,
        undefined,
        undefined,
        1.2
      );
      if (unit.state === 'attack' && akimboLeftActive && unit.attackProgress < 0.45) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(17.5, -1.2, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.translate(-2.5, -18 + bob);
      ctx.rotate(isSurvivor ? stride * 0.35 : armAngle * 0.85);
      inkedRoundRect(
        ctx,
        -1.8,
        0,
        3.6,
        8.2,
        1.5,
        flash ? '#ffffff' : atlas.shirtColor,
        undefined,
        undefined,
        1.2
      );
    }
    ctx.restore();

    // 3. Articulated Torso (4x Atlas)
    ctx.save();
    ctx.translate(recoilX * 0.4, -15.5 - bob);
    ctx.rotate(torsoLean);
    ctx.drawImage(flash ? atlas.torsoFlash : atlas.torso, -12, -11, 24, 24);

    // 4. Expressive Head (4x Atlas)
    ctx.save();
    ctx.translate(0.5, -9.5);
    ctx.rotate(torsoLean * 0.4);
    ctx.drawImage(flash ? atlas.headFlash : atlas.head, -12, -13, 24, 24);
    ctx.restore();

    // Berserker Critical Aura Ring
    if (unit.subType === 'crit_zombie' && (unit.critTelegraphTimer ?? 0) > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -2, 13 + Math.sin(time * 24) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Front Arm + Weapon + Combat FX
    ctx.save();
    ctx.translate(1.5 + recoilX, -3.5);
    ctx.rotate(armAngle);

    if (isSurvivor) {
      // Sniper Precision Laser Sight during Windup
      if (unit.subType === 'sniper' && unit.state === 'windup') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(22, -1);
        ctx.lineTo(240, -1);
        ctx.stroke();
      }

      ctx.drawImage(flash ? atlas.weaponFlash : atlas.weapon, -6, -10, 34, 20);
      inkedRoundRect(ctx, -2, -2, 5.2, 4.2, 1.5, flash ? '#ffffff' : atlas.shirtColor, undefined, undefined, 1.2);

      // Dual-Pistol Main-Hand Muzzle Flash on alternating shots
      if (isGunslinger && unit.state === 'attack' && !akimboLeftActive && unit.attackProgress < 0.45) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(17.5, -1.2, 3.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flamethrower Continuous Multi-Layer Jet!
      if (unit.subType === 'flamethrower' && unit.state === 'attack') {
        for (let f = 0; f < 6; f++) {
          const dist = 24 + f * 12 + ((time * 90 + f * 7) % 10);
          const spread = 3.2 + f * 2.1;
          const jitter = Math.sin(time * 28 + f * 1.7) * 2.5;
          ctx.fillStyle = f < 2 ? '#fef08a' : f < 4 ? '#f97316' : 'rgba(220, 38, 38, 0.78)';
          ctx.beginPath();
          ctx.arc(dist, jitter, spread, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (!isRanged && unit.state === 'attack' && unit.attackProgress > 0.2 && unit.attackProgress < 0.85) {
        // Crisp Illustrated Melee Slash Arc!
        ctx.strokeStyle = unit.subType === 'juggernaut' ? '#38bdf8' : '#fef08a';
        ctx.lineWidth = unit.subType === 'juggernaut' ? 3.2 : 2.2;
        ctx.beginPath();
        ctx.arc(14, 2, 15, -0.95, 0.85);
        ctx.stroke();
      }
    } else {
      // Zombie Front Claw Arm + Slash Arc
      inkedRoundRect(ctx, -1.8, -1.8, 9.5, 3.8, 1.6, flash ? '#ffffff' : atlas.skinColor, undefined, undefined, 1.25);
      if (unit.state === 'attack' && unit.attackProgress > 0.25) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.88)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(8, 2, 11, -0.8, 0.8);
        ctx.stroke();
      }
    }
    ctx.restore(); // end Front Arm
    ctx.restore(); // end Torso

    // 6. Front Leg & Boot
    ctx.save();
    ctx.translate(1.8, -9);
    ctx.rotate(stride * 0.52);
    inkedRoundRect(ctx, -legW * 0.5, 0, legW, 8.4, 1.6, flash ? '#ffffff' : atlas.pantColor, undefined, '#09090b', 1.25);
    inkedRoundRect(ctx, -legW * 0.5, 6.4, legW + 1.5, 3.0, 1.2, flash ? '#ffffff' : atlas.bootColor, '#52525b', undefined, 1.2);
    ctx.restore();
  }

  ctx.restore(); // End unit coordinate transform

  if (isDying) return;

  const topOffset =
    unit.subType === 'juggernaut' || unit.subType === 'bloated'
      ? 42
      : unit.subType === 'hound'
      ? 29
      : unit.subType === 'turret'
      ? 31
      : 36;

  // Golden Inspiration Halo (Fortune Proc)
  if (unit.isLucky && isSurvivor) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2.5, 2.5]);
    ctx.beginPath();
    ctx.ellipse(x, y - z - topOffset + 4, 8, 2.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Reload Progress Indicator Bar
  if (unit.state === 'reload') {
    const rw = 18;
    inkedRoundRect(ctx, x - 9, y - z - topOffset - 5, rw, 3.2, 1.2, '#09090b', undefined, undefined, 1);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 8, y - z - topOffset - 4, (rw - 2) * Math.min(1, unit.reloadProgress), 1.4);
  }

  // Ghost Health Bar (shown when damaged or player-controlled or special heavy unit)
  if (unit.hp < unit.maxHp || (unit.ghostHp ?? unit.hp) > unit.hp + 0.5 || unit.isPlayerControlled) {
    renderUnitGhostHealthBar(
      ctx,
      x,
      y - z - topOffset - 10,
      unit.level,
      unit.hp,
      unit.ghostHp ?? unit.hp,
      unit.maxHp,
      isSurvivor
    );
  }

  // Tactical Speech Bubble
  if (unit.quoteText && (unit.quoteTimer ?? 0) > 0) {
    ctx.save();
    ctx.font = '700 6.5px "Chakra Petch", sans-serif';
    const tw = ctx.measureText(unit.quoteText).width + 8;
    const bx = x - tw * 0.5;
    const by = y - z - topOffset - 22;
    inkedRoundRect(ctx, bx, by, tw, 11, 3, '#f8fafc', '#ffffff', '#e2e8f0', 1.1);
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(unit.quoteText, x, by + 7.8);
    ctx.restore();
  }
}

export function renderFireZone(
  ctx: CanvasRenderingContext2D,
  fz: RenderFireZone,
  time: number
) {
  const alpha = Math.min(1, fz.duration / 1.2);
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(20, 14, 12, 0.58)';
  ctx.beginPath();
  ctx.ellipse(fz.x, fz.y, fz.radius, fz.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  const tongues = 10;
  for (let i = 0; i < tongues; i++) {
    const ang = (i / tongues) * Math.PI * 2 + time * 1.7;
    const dist = (i % 3) * 0.28 * fz.radius;
    const fx = fz.x + Math.cos(ang) * dist * 0.9;
    const fy = fz.y + Math.sin(ang) * dist * 0.38;
    const fh = 7 + Math.abs(Math.sin(time * 15 + i * 2.1)) * 9.5;

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(fx, fy - fh * 0.45, 4.5, fh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(fx, fy - fh * 0.35, 3.1, fh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(fx, fy - fh * 0.22, 1.8, fh * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderTracersAndShells(
  ctx: CanvasRenderingContext2D,
  tracers: RenderTracer[],
  shells: RenderShell[]
) {
  for (let i = 0; i < shells.length; i++) {
    const s = shells[i];
    drawSoftShadow(ctx, s.x, s.y, s.w * 0.6, 0.9, 0.3);
    ctx.save();
    ctx.translate(s.x, s.y - s.z);
    ctx.rotate(s.vx * 0.03 + s.z * 0.15);
    ctx.fillStyle = s.color;
    ctx.fillRect(-s.w * 0.5, -s.h * 0.5, s.w, s.h);
    ctx.restore();
  }

  for (let i = 0; i < tracers.length; i++) {
    const t = tracers[i];
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';

    ctx.strokeStyle = t.color;
    ctx.lineWidth = t.width + 1.8;
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    ctx.strokeStyle = t.coreColor;
    ctx.lineWidth = Math.max(1, t.width * 0.75);
    ctx.beginPath();
    ctx.moveTo(t.x1, t.y1);
    ctx.lineTo(t.x2, t.y2);
    ctx.stroke();

    if (t.isSniper) {
      const mx = (t.x1 + t.x2) * 0.5;
      const my = (t.y1 + t.y2) * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(mx, my, 3.5, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

let lightmapCanvas: HTMLCanvasElement | null = null;
const LM_W = 360;
const LM_H = 168;

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

  drawLightHalo(lctx, (busX + 188) * 0.5, (busY + 60) * 0.5, 44, 'rgba(254, 240, 138, 0.22)');

  if (biome === 'graveyard') {
    const flk = 0.22 + Math.sin(time * 9) * 0.04;
    drawLightHalo(lctx, 100, 59, 36, `rgba(254, 240, 138, ${flk})`);
    drawLightHalo(lctx, 222, 59, 36, `rgba(254, 240, 138, ${flk})`);
  } else if (biome === 'junkyard_city') {
    drawLightHalo(lctx, 151, 17, 28, 'rgba(249, 115, 22, 0.24)');
    drawLightHalo(lctx, 256, 17, 28, 'rgba(249, 115, 22, 0.24)');
  }

  for (let i = 0; i < fireZones.length; i++) {
    const fz = fireZones[i];
    const osc = 1 + Math.sin(time * 16 + i) * 0.1;
    drawLightHalo(lctx, fz.x * 0.5, fz.y * 0.5, fz.radius * 0.75 * osc, 'rgba(249, 115, 22, 0.34)');
  }

  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type === 'medkit') {
      drawLightHalo(lctx, o.x * 0.5, o.y * 0.5, 28, 'rgba(34, 197, 94, 0.26)');
    } else if (o.type === 'red_barrel' && o.hp < o.maxHp * 0.4) {
      drawLightHalo(lctx, o.x * 0.5, o.y * 0.5, 18, 'rgba(239, 68, 68, 0.28)');
    }
  }

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.state === 'corpse' && (u.corpseTimer ?? 6) <= 1.8) {
      drawLightHalo(lctx, u.x * 0.5, u.y * 0.5, 16, 'rgba(132, 204, 22, 0.30)');
    } else if (u.subType === 'flamethrower' && u.state === 'attack') {
      drawLightHalo(lctx, (u.x + u.facing * 28) * 0.5, (u.y - 16) * 0.5, 28, 'rgba(251, 146, 60, 0.42)');
    } else if (u.subType === 'crit_zombie') {
      drawLightHalo(lctx, u.x * 0.5, (u.y - 16) * 0.5, 14, 'rgba(239, 68, 68, 0.20)');
    }
  }

  for (let i = 0; i < tracers.length; i++) {
    const t = tracers[i];
    drawLightHalo(lctx, t.x1 * 0.5, t.y1 * 0.5, 14, 'rgba(254, 240, 138, 0.28)');
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(lightmapCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.globalCompositeOperation = 'source-over';
  const vigTop = ctx.createLinearGradient(0, 0, 0, 26);
  vigTop.addColorStop(0, 'rgba(10, 10, 14, 0.25)');
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
  const x = obs.x;
  const y = obs.y;
  const z = obs.z;

  if (obs.type === 'medkit') {
    const pulse = Math.sin(time * 6) * 3;
    ctx.save();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y, 48 + pulse, 21 + pulse * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.88)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    for (let c = 0; c < 4; c++) {
      const ang = time * 1.8 + (c * Math.PI) / 2;
      const cx = x + Math.cos(ang) * 26;
      const cy = y + Math.sin(ang) * 10 - ((time * 16 + c * 4) % 12);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(cx - 1, cy - 3, 2, 6);
      ctx.fillRect(cx - 3, cy - 1, 6, 2);
    }

    drawSoftShadow(ctx, x, y + 1, 10, 3.2, 0.36);
    inkedRoundRect(ctx, x - 8.5, y - z - 12, 17, 12, 3, '#f8fafc', '#ffffff', '#cbd5e1', 1.4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 1.8, y - z - 9.5, 3.6, 7);
    ctx.fillRect(x - 3.5, y - z - 7.8, 7, 3.6);
    ctx.restore();
    return;
  }

  const isRed = obs.type === 'red_barrel';
  const hpRatio = obs.maxHp > 0 ? obs.hp / obs.maxHp : 1;
  const dmgState: 0 | 1 | 2 = hpRatio < 0.35 ? 2 : hpRatio < 0.7 ? 1 : 0;

  renderOilDrumHD(
    ctx,
    x - 9,
    y - z - 21,
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#7f1d1d' : '#1e3a5f',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#dc2626' : '#2563eb',
    obs.whiteFlashTimer > 0 ? '#ffffff' : isRed ? '#f87171' : '#60a5fa',
    dmgState,
    isRed
  );

  if (obs.hp < obs.maxHp) {
    inkedRoundRect(ctx, x - 9, y - z - 27, 18, 3.5, 1.5, '#09090b', undefined, undefined, 1);
    ctx.fillStyle = isRed ? '#f97316' : '#38bdf8';
    ctx.fillRect(x - 8, y - z - 26, Math.max(1, 16 * Math.max(0, hpRatio)), 1.6);
  }
}

export function renderDropPickup(
  ctx: CanvasRenderingContext2D,
  pickup: RenderPickup,
  time: number
) {
  const floatZ = pickup.z + Math.abs(Math.sin(time * 5)) * 3.2;
  drawSoftShadow(ctx, pickup.x, pickup.y, 7.5, 2.4, 0.34);

  const isCourage = pickup.kind === 'courage';
  const col = isCourage ? '#0284c7' : '#dc2626';
  const hi = isCourage ? '#7dd3fc' : '#fca5a5';

  inkedRoundRect(ctx, pickup.x - 5.5, pickup.y - floatZ - 12.5, 11, 11.5, 3, col, hi, undefined, 1.3);
  inkedRoundRect(ctx, pickup.x - 2.2, pickup.y - floatZ - 15.2, 4.4, 3, 1, '#e2e8f0');

  ctx.font = '800 6.5px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`+${pickup.amount}`, pickup.x, pickup.y - floatZ - 17);
}

export function renderCrow(ctx: CanvasRenderingContext2D, crow: RenderCrow, time: number) {
  const x = crow.x;
  const y = crow.y - crow.z;
  ctx.save();
  if (!crow.flying) {
    const peck = Math.sin(time * 9 + crow.animOffset) > 0.5 ? 1.8 : 0;
    inkedRoundRect(ctx, x - 3.5, y - 5 + peck, 7, 4.5, 2, '#18181b', '#3f3f46', undefined, 1.1);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 3, y - 4 + peck, 2.8, 1.8);
  } else {
    const flap = Math.sin(time * 24 + crow.animOffset) * 4.5;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 3 + flap);
    ctx.quadraticCurveTo(x, y - 5, x + 6, y - 3 + flap);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderCharacterPreview(
  ctx: CanvasRenderingContext2D,
  subType: SurvivorType | ZombieType,
  isZombie: boolean,
  w: number,
  h: number
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const fitScale = Math.min(w / 38, h / 42);
  ctx.translate(w * 0.5 - (isZombie ? -2 : 2), h - 5);
  ctx.scale(fitScale, fitScale);

  const previewUnit: RenderUnit = {
    id: 'preview',
    team: isZombie ? 'zombie' : 'survivor',
    subType,
    level: 1,
    x: 0,
    y: 0,
    z: subType === 'drone' ? 8 : 0,
    hp: 100,
    maxHp: 100,
    state: 'march',
    animTime: 0.22,
    attackProgress: 0,
    reloadProgress: 0,
    whiteFlashTimer: 0,
    isLucky: false,
    isPlayerControlled: false,
    facing: isZombie ? -1 : 1,
  };
  renderUnitSprite(ctx, previewUnit, 0.5);
  ctx.restore();
}

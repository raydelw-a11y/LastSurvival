// Shared by the game client AND the Cloudflare sync Worker (cloud-sync/).
// Keep this file dependency-free (type-only imports) so the Worker bundle stays tiny.
import type { PlayerProgress } from '../types/game';

export interface SyncEnvelope {
  progress: PlayerProgress;
  /** Epoch ms of the last real local change to this save. */
  savedAt: number;
  /** Bumped on "Reiniciar": a higher generation fully replaces older saves. */
  generation: number;
}

const maxRecord = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = Math.max(Number(out[k]) || 0, Number(v) || 0);
  }
  return out;
};

const union = <T extends string | number>(a: T[] = [], b: T[] = []): T[] =>
  Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]));

/**
 * Merges two saves without losing progress:
 * - Achievements only ever go up (stars, unlocked missions, caches, unit/commander levels, garage).
 * - Spendable/volatile state (coins, fuel, supplies, squad) comes from the most recently played save.
 * - A newer generation (after a deliberate reset) wins outright.
 */
export function mergeEnvelopes(local: SyncEnvelope, remote: SyncEnvelope): SyncEnvelope {
  const lg = local.generation || 0;
  const rg = remote.generation || 0;
  if (lg !== rg) return lg > rg ? local : remote;

  const a = local.progress;
  const b = remote.progress;
  const newer = (local.savedAt || 0) > (remote.savedAt || 0) ? a : b;

  const aLvl = a.busLevel || 1;
  const bLvl = b.busLevel || 1;
  const busLevel = Math.max(aLvl, bLvl);
  const commanderXp =
    aLvl === bLvl
      ? Math.max(a.commanderXp || 0, b.commanderXp || 0)
      : aLvl > bLvl
      ? a.commanderXp || 0
      : b.commanderXp || 0;

  const progress: PlayerProgress = {
    ...b,
    ...a,
    coins: newer.coins,
    fuel: newer.fuel,
    supplies: newer.supplies,
    equippedDeck: newer.equippedDeck,
    maxFuel: Math.max(a.maxFuel || 0, b.maxFuel || 0),
    busLevel,
    commanderXp,
    busHpBonus: Math.max(a.busHpBonus || 0, b.busHpBonus || 0),
    billDamageBonus: Math.max(a.billDamageBonus || 0, b.billDamageBonus || 0),
    spikedBumper: !!(a.spikedBumper || b.spikedBumper),
    weldedArmor: !!(a.weldedArmor || b.weldedArmor),
    unitLevels: maxRecord(a.unitLevels, b.unitLevels) as PlayerProgress['unitLevels'],
    missionStars: maxRecord(
      a.missionStars as unknown as Record<string, number>,
      b.missionStars as unknown as Record<string, number>
    ) as unknown as PlayerProgress['missionStars'],
    unlockedMissions: union(a.unlockedMissions, b.unlockedMissions).sort((x, y) => x - y),
    discoveredCaches: union(a.discoveredCaches, b.discoveredCaches),
  };

  return {
    progress,
    savedAt: Math.max(local.savedAt || 0, remote.savedAt || 0),
    generation: lg,
  };
}

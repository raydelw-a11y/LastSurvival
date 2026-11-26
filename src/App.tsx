import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getMaxBusUpgrades,
  getMaxUnitUpgrades,
  isUnitUnlocked,
  MAX_COMMANDER_LEVEL,
  MAX_EQUIPPED_DECK,
  HERO_OUTFITS,
  HeroOutfitType,
  MISSION_NODES,
  MissionNode,
  PlayerProgress,
  SURVIVOR_ORDER,
  SurvivorType,
} from './types/game';
import { PrivateAccess } from './components/PrivateAccess';
import { RoadMapHub } from './components/RoadMapHub';
import { BattleArena } from './components/BattleArena';
import { soundFX } from './engine/SoundFX';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ContinuePrompt } from './components/ContinuePrompt';
import { useCloudSync } from './sync/useCloudSync';
import { Smartphone } from 'lucide-react';

const FALLBACK_TIMESTAMP = '1:30 PM - 11/26/2026';
export const BUILD_TS =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : FALLBACK_TIMESTAMP;
const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';

const STORAGE_KEY = 'last_survival_dead_ahead_v4';
const LEGACY_STORAGE_KEYS = [
  'last_survival_dead_ahead_v1',
  'last_survival_dead_ahead_v2',
  'last_survival_dead_ahead_v3',
];

const INITIAL_PROGRESS: PlayerProgress = {
  coins: 120,
  fuel: 20,
  maxFuel: 20,
  supplies: 3,
  busLevel: 1,
  commanderXp: 0,
  equippedDeck: ['redneck'],
  busHpBonus: 0,
  billDamageBonus: 0,
  spikedBumper: false,
  weldedArmor: false,
  unitLevels: {
    redneck: 1,
    farmer: 1,
    gunslinger: 1,
    builder: 1,
    mechanic: 1,
    hound: 1,
    policeman: 1,
    sniper: 1,
    flamethrower: 1,
    turret: 1,
    drone: 1,
    juggernaut: 1,
    tesla: 1,
    barricade: 1,
    watchtower: 1,
    hero: 1,
  },
  missionStars: {},
  ultraStars: {},
  fortressBest: {},
  heroOutfits: ['commander'],
  heroOutfit: 'commander',
  unlockedMissions: [1],
  discoveredCaches: [],
};

/** Where the map bus parks: next mission after a win, the same mission after a loss. */
function nextMissionAfterLastPlayed(p: PlayerProgress): number | null {
  const last = p.lastPlayedMission;
  if (!last) {
    const anyStars = Object.values(p.missionStars).some((s) => s > 0);
    if (!anyStars) return null;
    const firstOpen = p.unlockedMissions.find((m) => !(p.missionStars[m] > 0));
    return firstOpen ?? p.unlockedMissions[p.unlockedMissions.length - 1] ?? 1;
  }
  // lastPlayedMission is the mission launched (stays there after a loss / retreat)
  // and moves to the next mission after a win (normal or ULTRA)
  return p.unlockedMissions.includes(last) ? last : p.unlockedMissions[p.unlockedMissions.length - 1] || 1;
}

function sanitizeProgress(rawObj: Partial<PlayerProgress>): PlayerProgress {
  const lvl = Math.max(1, Math.min(MAX_COMMANDER_LEVEL, Math.floor(rawObj.busLevel ?? 1)));
  const rawDeck = Array.isArray(rawObj.equippedDeck) ? rawObj.equippedDeck : [];
  const validDeck: SurvivorType[] = [];
  for (const u of rawDeck) {
    if (
      SURVIVOR_ORDER.includes(u) &&
      isUnitUnlocked(u, lvl) &&
      !validDeck.includes(u) &&
      validDeck.length < MAX_EQUIPPED_DECK
    ) {
      validDeck.push(u);
    }
  }
  if (validDeck.length === 0) {
    validDeck.push('redneck');
  }
  // If an existing player is already Level 3+ and hasn't seen 'gunslinger' yet, auto-equip if room!
  const hadSavedGunslinger = !!(rawObj.unitLevels && 'gunslinger' in rawObj.unitLevels);
  if (
    !hadSavedGunslinger &&
    lvl >= 3 &&
    !validDeck.includes('gunslinger') &&
    validDeck.length < MAX_EQUIPPED_DECK
  ) {
    validDeck.push('gunslinger');
  }
  // Saves from before a unit existed: auto-equip it once if it is already unlocked
  for (const newUnit of ['tesla', 'barricade', 'watchtower'] as SurvivorType[]) {
    const knownBefore = !!(rawObj.unitLevels && newUnit in rawObj.unitLevels);
    if (!knownBefore && isUnitUnlocked(newUnit, lvl) && !validDeck.includes(newUnit)) {
      validDeck.push(newUnit);
    }
  }
  return {
    ...INITIAL_PROGRESS,
    ...rawObj,
    busLevel: lvl,
    commanderXp: Math.max(0, Math.floor(rawObj.commanderXp ?? 0)),
    equippedDeck: validDeck,
    unitLevels: {
      ...INITIAL_PROGRESS.unitLevels,
      ...(rawObj.unitLevels || {}),
    },
    heroOutfits: Array.from(
      new Set<HeroOutfitType>([
        'commander',
        ...(Array.isArray(rawObj.heroOutfits) ? rawObj.heroOutfits : []).filter((o) => o in HERO_OUTFITS),
      ])
    ),
    heroOutfit:
      rawObj.heroOutfit && rawObj.heroOutfit in HERO_OUTFITS &&
      (rawObj.heroOutfit === 'commander' || (rawObj.heroOutfits || []).includes(rawObj.heroOutfit))
        ? rawObj.heroOutfit
        : 'commander',
    ultraStars:
      rawObj.ultraStars && typeof rawObj.ultraStars === 'object' && !Array.isArray(rawObj.ultraStars)
        ? rawObj.ultraStars
        : {},
    fortressBest:
      rawObj.fortressBest && typeof rawObj.fortressBest === 'object' && !Array.isArray(rawObj.fortressBest)
        ? rawObj.fortressBest
        : {},
    unlockedMissions: (() => {
      const savedStars = rawObj.missionStars || {};
      let highestBeaten = 0;
      for (let id = 1; id <= MISSION_NODES.length; id++) {
        if ((savedStars[id] || 0) > 0) {
          highestBeaten = id;
        }
      }
      // Also respect contiguous sequential unlocks starting at 1 (ignores any out-of-order branch IDs)
      const rawSet = new Set<number>(Array.isArray(rawObj.unlockedMissions) ? rawObj.unlockedMissions : [1]);
      let contiguousUnlocked = 1;
      while (contiguousUnlocked + 1 <= MISSION_NODES.length && rawSet.has(contiguousUnlocked + 1)) {
        contiguousUnlocked++;
      }
      const targetFrontier = Math.min(
        MISSION_NODES.length,
        Math.max(1, highestBeaten + 1, contiguousUnlocked)
      );
      const sequential: number[] = [];
      for (let id = 1; id <= targetFrontier; id++) {
        sequential.push(id);
      }
      return sequential;
    })(),
  };
}

export function App() {
  const [unlockedApp, setUnlockedApp] = useState<boolean>(() => {
    try {
      if (sessionStorage.getItem('ls_auto_update_unlocked') === '1') {
        sessionStorage.removeItem('ls_auto_update_unlocked');
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  });
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState<boolean>(false);
  const [pendingRemoteBuildId, setPendingRemoteBuildId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    try {
      for (const oldKey of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(oldKey);
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return sanitizeProgress(JSON.parse(raw));
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_PROGRESS;
  });

  const [selectedMissionId, setSelectedMissionId] = useState<number>(() => {
    const resume = nextMissionAfterLastPlayed(progress);
    if (resume) return resume;
    for (let id = 1; id <= MISSION_NODES.length; id++) {
      if (progress.unlockedMissions.includes(id) && !(progress.missionStars[id] > 0)) {
        return id;
      }
    }
    return progress.unlockedMissions[progress.unlockedMissions.length - 1] || 1;
  });
  // Always start on the campaign map; the "Continuar" prompt offers to jump back into the last mission.
  const [activeBattleMission, setActiveBattleMission] = useState<MissionNode | null>(null);
  // ULTRA mode for the battle in progress (much stronger enemies, separate stars)
  const [activeUltra, setActiveUltra] = useState<boolean>(false);
  const activeUltraRef = useRef(false);
  // FORTRESS mode for the battle in progress (endless hordes until the player leaves)
  const [activeFortress, setActiveFortress] = useState<boolean>(false);
  // After a silent auto-update reload from the map, don't nag with the continue prompt again.
  const [continueDismissed, setContinueDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ls_auto_update_hub') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem('ls_auto_update_hub');
    } catch {
      // Ignore
    }
  }, []);

  const [showCloudPanel, setShowCloudPanel] = useState<boolean>(false);
  const applyCloudProgress = useCallback((p: PlayerProgress) => {
    const clean = sanitizeProgress(p);
    setProgress(clean);
    return clean;
  }, []);
  // Sync also runs on the access screen so the cloud save is pulled before the first battle starts
  const cloud = useCloudSync(progress, applyCloudProgress, unlockedApp && !!activeBattleMission);

  const stateSnapshotRef = useRef({ unlockedApp, activeBattleMission });
  stateSnapshotRef.current = { unlockedApp, activeBattleMission };

  const applyHardMobileUpdate = useCallback((remoteBuildId: string) => {
    try {
      if (sessionStorage.getItem('ls_reloaded_build_id') === remoteBuildId) return;
      sessionStorage.setItem('ls_reloaded_build_id', remoteBuildId);
      if (stateSnapshotRef.current.unlockedApp) {
        sessionStorage.setItem('ls_auto_update_unlocked', '1');
        if (!stateSnapshotRef.current.activeBattleMission) {
          sessionStorage.setItem('ls_auto_update_hub', '1');
        }
      }
    } catch {
      // Ignore storage error
    }

    setIsUpdatingApp(true);

    const finishReload = () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('_v', remoteBuildId);
      window.location.replace(nextUrl.toString());
    };

    // Purge CacheStorage & stale Service Workers before navigating with cache-busting query
    const cleanupPromises: Promise<unknown>[] = [];
    if ('caches' in window) {
      cleanupPromises.push(
        window.caches
          .keys()
          .then((names) => Promise.all(names.map((n) => window.caches.delete(n))))
          .catch(() => {})
      );
    }
    if ('serviceWorker' in navigator) {
      cleanupPromises.push(
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {})
      );
    }

    Promise.all(cleanupPromises).finally(() => {
      setTimeout(finishReload, 220);
    });
  }, []);

  const checkRemoteUpdate = useCallback(
    async (trigger: 'mount' | 'resume' | 'poll' | 'manual') => {
      if (!CURRENT_BUILD_ID || import.meta.env.DEV) return;
      try {
        const res = await fetch(`./version.json?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string; timestamp?: string };
        if (!data?.buildId || data.buildId === CURRENT_BUILD_ID) {
          // Clean up ?_v= query param once confirmed running latest build
          if (window.location.search.includes('_v=')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          return;
        }

        const { unlockedApp: isUnlocked, activeBattleMission: inBattle } =
          stateSnapshotRef.current;

        // Auto-apply immediately if on PrivateAccess, on World Map, on app resume, or manual tap!
        if (!isUnlocked || !inBattle || trigger === 'resume' || trigger === 'manual') {
          applyHardMobileUpdate(data.buildId);
        } else {
          // Player is mid-combat during background poll: queue until battle ends or badge is tapped
          setPendingRemoteBuildId(data.buildId);
        }
      } catch {
        // Offline or transient network error — ignore silently
      }
    },
    [applyHardMobileUpdate]
  );

  // If an update arrived mid-combat, apply automatically as soon as player returns to Map Hub
  useEffect(() => {
    if (pendingRemoteBuildId && !activeBattleMission) {
      applyHardMobileUpdate(pendingRemoteBuildId);
    }
  }, [activeBattleMission, applyHardMobileUpdate, pendingRemoteBuildId]);

  useEffect(() => {
    checkRemoteUpdate('mount');

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRemoteUpdate('resume');
      }
    };
    const onFocusOrResume = () => checkRemoteUpdate('resume');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocusOrResume);
    window.addEventListener('online', onFocusOrResume);
    window.addEventListener('app-resumed-check-update', onFocusOrResume);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkRemoteUpdate('poll');
      }
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocusOrResume);
      window.removeEventListener('online', onFocusOrResume);
      window.removeEventListener('app-resumed-check-update', onFocusOrResume);
      window.clearInterval(intervalId);
    };
  }, [checkRemoteUpdate]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage error
    }
  }, [progress]);

  // Where "Continuar" resumes: last mission played on ANY synced device (falls back to the frontier for old saves)
  const continueMission = useMemo<MissionNode | null>(() => {
    const id = nextMissionAfterLastPlayed(progress);
    return id ? MISSION_NODES.find((m) => m.id === id) ?? null : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.lastPlayedMission, progress.missionStars, progress.unlockedMissions]);

  // Back on the map after any battle (win, loss, retreat, ULTRA) or a cloud sync:
  // park the bus on the mission after the last one played
  useEffect(() => {
    if (activeBattleMission) return;
    const id = nextMissionAfterLastPlayed(progress);
    if (id) setSelectedMissionId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBattleMission, progress.lastPlayedMission, progress.lastPlayedAt, progress.missionStars]);

  const showContinuePrompt =
    unlockedApp && !activeBattleMission && !continueDismissed && !showCloudPanel && !!continueMission;

  // Keep the map focused on the mission being offered (also when a cloud sync updates it)
  useEffect(() => {
    if (showContinuePrompt && continueMission) setSelectedMissionId(continueMission.id);
  }, [showContinuePrompt, continueMission]);

  const handleUnlock = useCallback(() => {
    setUnlockedApp(true);
    try {
      const orient = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orient && orient.lock) {
        orient.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleLaunchMission = useCallback((mission: MissionNode, ultra = false, fortress = false) => {
    activeUltraRef.current = ultra && !fortress;
    setActiveUltra(ultra && !fortress);
    setActiveFortress(fortress);
    soundFX.resumeFromBackground();
    soundFX.playUnitSpawn();
    setContinueDismissed(true);
    setProgress((prev) => ({
      ...prev,
      fuel: prev.fuel >= mission.fuelCost ? prev.fuel - mission.fuelCost : prev.maxFuel,
      lastPlayedMission: mission.id,
      lastPlayedAt: Date.now(),
    }));
    setActiveBattleMission(mission);
  }, []);

  const handleRetreat = useCallback(() => {
    setActiveBattleMission(null);
  }, []);

  // FORTRESS run finished (the player left or the bus fell): bank the loot and the horde record.
  // It never grants campaign stars nor unlocks missions.
  const handleFortressEnd = useCallback((coinsEarned: number, hordes: number) => {
    setActiveBattleMission((currentMission) => {
      if (!currentMission) return null;
      const mId = currentMission.id;
      setProgress((prev) => ({
        ...prev,
        coins: prev.coins + Math.max(0, Math.round(coinsEarned)),
        fortressBest: {
          ...(prev.fortressBest || {}),
          [mId]: Math.max((prev.fortressBest || {})[mId] || 0, hordes),
        },
        lastPlayedAt: Date.now(),
      }));
      return null;
    });
  }, []);

  const handleVictory = useCallback(
    (stars: number, coinsEarned: number) => {
      setActiveBattleMission((currentMission) => {
        if (!currentMission) return null;
        const mId = currentMission.id;
        const nextId = mId + 1;

        if (activeUltraRef.current) {
          // ULTRA win: separate best-star record, the normal campaign path is untouched
          setProgress((prev) => ({
            ...prev,
            coins: prev.coins + coinsEarned,
            ultraStars: {
              ...(prev.ultraStars || {}),
              [mId]: Math.max((prev.ultraStars || {})[mId] || 0, stars),
            },
            lastPlayedMission: Math.min(MISSION_NODES.length, nextId),
            lastPlayedAt: Date.now(),
          }));
          return null;
        }

        setProgress((prev) => {
          const currentStars = prev.missionStars[mId] || 0;
          const unlockedSet = new Set<number>(prev.unlockedMissions);
          for (let id = 1; id <= Math.min(MISSION_NODES.length, nextId); id++) {
            unlockedSet.add(id);
          }

          return {
            ...prev,
            coins: prev.coins + coinsEarned,
            missionStars: {
              ...prev.missionStars,
              [mId]: Math.max(currentStars, stars),
            },
            unlockedMissions: Array.from(unlockedSet).sort((a, b) => a - b),
            // Resume point moves on to the next mission after a win
            lastPlayedMission: Math.min(MISSION_NODES.length, nextId),
            lastPlayedAt: Date.now(),
          };
        });

        if (nextId <= MISSION_NODES.length) {
          setSelectedMissionId(nextId);
        }
        return null;
      });
    },
    []
  );

  const handleUpgradeSurvivor = useCallback((type: SurvivorType, cost: number) => {
    setProgress((prev) => {
      if (prev.coins < cost || !isUnitUnlocked(type, prev.busLevel)) return prev;
      soundFX.playCouragePickup();
      return {
        ...prev,
        coins: prev.coins - cost,
        unitLevels: {
          ...prev.unitLevels,
          [type]: (prev.unitLevels[type] || 1) + 1,
        },
      };
    });
  }, []);

  // "Mejorar máx": spend all affordable coins on one unit (rising cost per level)
  const handleUpgradeSurvivorMax = useCallback((type: SurvivorType) => {
    setProgress((prev) => {
      if (!isUnitUnlocked(type, prev.busLevel)) return prev;
      const lvl = prev.unitLevels[type] || 1;
      const { levels, total } = getMaxUnitUpgrades(lvl, prev.coins);
      if (levels <= 0) return prev;
      soundFX.playCouragePickup();
      return {
        ...prev,
        coins: prev.coins - total,
        unitLevels: { ...prev.unitLevels, [type]: lvl + levels },
      };
    });
  }, []);

  // "Mejorar máx" for the repeatable bus upgrades (chassis HP / Bill's rifle)
  const handleUpgradeBusStatMax = useCallback((kind: 'hp' | 'bill') => {
    setProgress((prev) => {
      const { times, total } = getMaxBusUpgrades(kind, prev.coins);
      if (times <= 0) return prev;
      soundFX.playCouragePickup();
      return kind === 'hp'
        ? { ...prev, coins: prev.coins - total, busHpBonus: prev.busHpBonus + 50 * times }
        : { ...prev, coins: prev.coins - total, billDamageBonus: prev.billDamageBonus + 8 * times };
    });
  }, []);

  // HERO OUTFITS: buy once with coins, then equip any owned outfit
  const handleBuyHeroOutfit = useCallback((id: HeroOutfitType) => {
    setProgress((prev) => {
      const cfg = HERO_OUTFITS[id];
      const owned = prev.heroOutfits || ['commander'];
      if (owned.includes(id) || prev.coins < cfg.cost) return prev;
      soundFX.playCouragePickup();
      return { ...prev, coins: prev.coins - cfg.cost, heroOutfits: [...owned, id], heroOutfit: id };
    });
  }, []);

  const handleEquipHeroOutfit = useCallback((id: HeroOutfitType) => {
    setProgress((prev) => {
      const owned = prev.heroOutfits || ['commander'];
      if (!owned.includes(id) || prev.heroOutfit === id) return prev;
      soundFX.playUnitSpawn();
      return { ...prev, heroOutfit: id };
    });
  }, []);

  const handleUpgradeBusStat = useCallback(
    (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => {
      setProgress((prev) => {
        if (prev.coins < cost) return prev;
        soundFX.playCouragePickup();
        if (kind === 'hp') {
          return { ...prev, coins: prev.coins - cost, busHpBonus: prev.busHpBonus + 50 };
        }
        if (kind === 'bill') {
          return { ...prev, coins: prev.coins - cost, billDamageBonus: prev.billDamageBonus + 8 };
        }
        if (kind === 'bumper') {
          return { ...prev, coins: prev.coins - cost, spikedBumper: true };
        }
        return {
          ...prev,
          coins: prev.coins - cost,
          weldedArmor: true,
          busHpBonus: prev.busHpBonus + 80,
        };
      });
    },
    []
  );

  const handleLevelUpCommanderLive = useCallback((newLevel: number, newXp: number) => {
    setProgress((prev) => {
      const clampedLevel = Math.min(MAX_COMMANDER_LEVEL, Math.max(prev.busLevel || 1, newLevel));
      const nextDeck = [...prev.equippedDeck];

      // Auto-equip any newly unlocked units if the active 6-slot squad has space!
      if (clampedLevel > prev.busLevel) {
        for (const id of SURVIVOR_ORDER) {
          if (
            isUnitUnlocked(id, clampedLevel) &&
            !isUnitUnlocked(id, prev.busLevel) &&
            !nextDeck.includes(id) &&
            nextDeck.length < MAX_EQUIPPED_DECK
          ) {
            nextDeck.push(id);
          }
        }
      }

      return {
        ...prev,
        busLevel: clampedLevel,
        commanderXp: Math.max(0, Math.floor(newXp)),
        equippedDeck: nextDeck,
      };
    });
  }, []);

  const handleToggleDeckUnit = useCallback((type: SurvivorType) => {
    setProgress((prev) => {
      if (!isUnitUnlocked(type, prev.busLevel)) return prev;
      const exists = prev.equippedDeck.includes(type);
      if (exists) {
        if (prev.equippedDeck.length <= 1) return prev; // Keep at least 1 unit equipped
        soundFX.playCouragePickup();
        return {
          ...prev,
          equippedDeck: prev.equippedDeck.filter((u) => u !== type),
        };
      }
      soundFX.playUnitSpawn();
      // No squad size cap: any number of unlocked units can be equipped
      return {
        ...prev,
        equippedDeck: [...prev.equippedDeck, type],
      };
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    soundFX.playExplosion();
    // New save generation so the cloud copy is replaced instead of merged back in
    cloud.markReset();
    setProgress(INITIAL_PROGRESS);
    setSelectedMissionId(1);
    setActiveBattleMission(null);
  }, [cloud]);

  const handleCollectCache = useCallback((cacheId: string, coins: number, fuel: number) => {
    setProgress((prev) => {
      if (prev.discoveredCaches.includes(cacheId)) return prev;
      return {
        ...prev,
        coins: prev.coins + coins,
        fuel: Math.min(prev.maxFuel, prev.fuel + fuel),
        discoveredCaches: [...prev.discoveredCaches, cacheId],
      };
    });
  }, []);

  const handleRefillFuel = useCallback(() => {
    soundFX.playCouragePickup();
    setProgress((prev) => ({ ...prev, fuel: prev.maxFuel }));
  }, []);

  if (!unlockedApp) {
    return (
      <PrivateAccess
        onUnlock={handleUnlock}
        buildTimestamp={BUILD_TS}
        isUpdating={isUpdatingApp}
        onCheckUpdate={() => checkRemoteUpdate('manual')}
      />
    );
  }

  return (
    <div className="relative w-screen h-[100dvh] bg-[#18191c] overflow-hidden">
      {/* Keep BattleArena / RoadMapHub mounted even if phone rotates so zero units are ever lost! */}
      {activeBattleMission ? (
        <BattleArena
          mission={activeBattleMission}
          ultra={activeUltra}
          fortress={activeFortress}
          progress={progress}
          isPortrait={isPortrait}
          onVictory={handleVictory}
          onRetreat={handleRetreat}
          onFortressEnd={handleFortressEnd}
          onLevelUpCommander={handleLevelUpCommanderLive}
        />
      ) : (
        <RoadMapHub
          progress={progress}
          selectedMissionId={selectedMissionId}
          onSelectMission={setSelectedMissionId}
          onLaunchMission={handleLaunchMission}
          onUpgradeSurvivor={handleUpgradeSurvivor}
          onUpgradeBusStat={handleUpgradeBusStat}
          onBuyHeroOutfit={handleBuyHeroOutfit}
          onEquipHeroOutfit={handleEquipHeroOutfit}
          onUpgradeSurvivorMax={handleUpgradeSurvivorMax}
          onUpgradeBusStatMax={handleUpgradeBusStatMax}
          onToggleDeckUnit={handleToggleDeckUnit}
          onResetProgress={handleResetProgress}
          onCollectCache={handleCollectCache}
          onRefillFuel={handleRefillFuel}
          cloudStatus={cloud.status}
          onOpenCloudSync={() => setShowCloudPanel(true)}
          hotkeysDisabled={showContinuePrompt || showCloudPanel}
        />
      )}

      {showContinuePrompt && continueMission && (
        <ContinuePrompt
          mission={continueMission}
          stars={progress.missionStars[continueMission.id] || 0}
          lastPlayedAt={progress.lastPlayedAt}
          onContinue={() => handleLaunchMission(continueMission)}
          onDismiss={() => setContinueDismissed(true)}
        />
      )}

      {showCloudPanel && !activeBattleMission && (
        <CloudSyncPanel sync={cloud} onClose={() => setShowCloudPanel(false)} />
      )}

      {/* Strictly Horizontal Enforcement Overlay (never unmounts BattleArena!) */}
      {isPortrait && (
        <div className="fixed inset-0 z-[9998] bg-zinc-950/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-yellow-400 -rotate-90 animate-pulse" />
          </div>
          <h2 className="font-pixel text-base sm:text-lg text-yellow-400 mb-2">
            MODO ESTRICTAMENTE HORIZONTAL
          </h2>
          <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
            La batalla está <strong className="text-emerald-400">pausada de forma segura</strong>.{' '}
            <strong className="text-white">Gira tu móvil en posición horizontal</strong> para continuar sin perder tus unidades.
          </p>
        </div>
      )}

      {/* Non-intrusive Pending Update Pill if detected mid-combat */}
      {pendingRemoteBuildId && !isUpdatingApp && (
        <button
          type="button"
          onClick={() => applyHardMobileUpdate(pendingRemoteBuildId)}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-yellow-300 text-[10px] font-extrabold text-white shadow-xl animate-bounce cursor-pointer"
        >
          🔄 Nueva versión disponible — Toca o termina misión para actualizar
        </button>
      )}

      {/* Global Verification Timestamp in Bottom-Right Corner (Tap to force instant update check) */}
      <button
        type="button"
        onClick={() => checkRemoteUpdate('manual')}
        className={`fixed z-[9999] text-[10px] sm:text-[11px] text-yellow-300 font-mono font-semibold bg-black/85 hover:bg-zinc-900 px-2.5 py-0.5 rounded border border-yellow-500/60 shadow-lg cursor-pointer ${
          // In battle the full-width unit bar owns the bottom edge: sit in the top-right sky instead
          activeBattleMission ? 'top-9 right-2 safe-r' : 'bottom-2 right-3 safe-r'
        }`}
        title="Toca para comprobar actualizaciones ahora"
      >
        {isUpdatingApp ? '⚡ Actualizando nueva versión...' : `Actualizado: ${BUILD_TS}`}
      </button>
    </div>
  );
}

export default App;

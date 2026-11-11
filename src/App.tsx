import React, { useCallback, useEffect, useState } from 'react';
import {
  isUnitUnlocked,
  MAX_COMMANDER_LEVEL,
  MAX_EQUIPPED_DECK,
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
import { Smartphone } from 'lucide-react';

const FALLBACK_TIMESTAMP = '10:38 PM - 11/10/2026';
export const BUILD_TS =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : FALLBACK_TIMESTAMP;

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
    builder: 1,
    mechanic: 1,
    hound: 1,
    policeman: 1,
    sniper: 1,
    flamethrower: 1,
    turret: 1,
    drone: 1,
    juggernaut: 1,
  },
  missionStars: {},
  unlockedMissions: [1],
  discoveredCaches: [],
};

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
    unlockedMissions:
      Array.isArray(rawObj.unlockedMissions) && rawObj.unlockedMissions.length > 0
        ? rawObj.unlockedMissions
        : [1],
  };
}

export function App() {
  const [unlockedApp, setUnlockedApp] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
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

  const [selectedMissionId, setSelectedMissionId] = useState<number>(1);
  const [activeBattleMission, setActiveBattleMission] = useState<MissionNode | null>(
    MISSION_NODES[0]
  );

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

  const handleLaunchMission = useCallback((mission: MissionNode) => {
    soundFX.resumeFromBackground();
    soundFX.playUnitSpawn();
    setProgress((prev) => ({
      ...prev,
      fuel: prev.fuel >= mission.fuelCost ? prev.fuel - mission.fuelCost : prev.maxFuel,
    }));
    setActiveBattleMission(mission);
  }, []);

  const handleRetreat = useCallback(() => {
    setActiveBattleMission(null);
  }, []);

  const handleVictory = useCallback(
    (stars: number, coinsEarned: number) => {
      setActiveBattleMission((currentMission) => {
        if (!currentMission) return null;
        const mId = currentMission.id;
        const nextId = mId + 1;

        setProgress((prev) => {
          const currentStars = prev.missionStars[mId] || 0;
          const unlocked = prev.unlockedMissions.includes(nextId)
            ? prev.unlockedMissions
            : nextId <= MISSION_NODES.length
            ? [...prev.unlockedMissions, nextId]
            : prev.unlockedMissions;

          return {
            ...prev,
            coins: prev.coins + coinsEarned,
            missionStars: {
              ...prev.missionStars,
              [mId]: Math.max(currentStars, stars),
            },
            unlockedMissions: unlocked,
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
      if (prev.equippedDeck.length < MAX_EQUIPPED_DECK) {
        return {
          ...prev,
          equippedDeck: [...prev.equippedDeck, type],
        };
      }
      // Replace the oldest slot except keep 5 newest + new selection
      return {
        ...prev,
        equippedDeck: [...prev.equippedDeck.slice(1), type],
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
    setProgress(INITIAL_PROGRESS);
    setSelectedMissionId(1);
    setActiveBattleMission(null);
  }, []);

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
    return <PrivateAccess onUnlock={handleUnlock} buildTimestamp={BUILD_TS} />;
  }

  return (
    <div className="relative w-screen h-[100dvh] bg-[#18191c] overflow-hidden">
      {/* Keep BattleArena / RoadMapHub mounted even if phone rotates so zero units are ever lost! */}
      {activeBattleMission ? (
        <BattleArena
          mission={activeBattleMission}
          progress={progress}
          isPortrait={isPortrait}
          onVictory={handleVictory}
          onRetreat={handleRetreat}
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
          onToggleDeckUnit={handleToggleDeckUnit}
          onResetProgress={handleResetProgress}
          onCollectCache={handleCollectCache}
          onRefillFuel={handleRefillFuel}
        />
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

      {/* Global Verification Timestamp in Bottom-Right Corner */}
      <div className="fixed bottom-2 right-3 z-[9999] text-[10px] sm:text-[11px] text-yellow-300 font-mono font-semibold bg-black/85 px-2.5 py-0.5 rounded border border-yellow-500/60 shadow-lg pointer-events-none">
        Actualizado: {BUILD_TS}
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import { MISSION_NODES, MissionNode, PlayerProgress, SurvivorType } from './types/game';
import { PrivateAccess } from './components/PrivateAccess';
import { RoadMapHub } from './components/RoadMapHub';
import { BattleArena } from './components/BattleArena';
import { soundFX } from './engine/SoundFX';
import { Smartphone } from 'lucide-react';

const FALLBACK_TIMESTAMP = '6:41 PM - 11/10/2026';
export const BUILD_TS =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : FALLBACK_TIMESTAMP;

const STORAGE_KEY = 'last_survival_dead_ahead_v3';

const INITIAL_PROGRESS: PlayerProgress = {
  coins: 195,
  fuel: 20,
  maxFuel: 20,
  supplies: 3,
  busLevel: 1,
  commanderXp: 0,
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
  unlockedMissions: [1, 2, 3],
  discoveredCaches: [],
};

export function App() {
  const [unlockedApp, setUnlockedApp] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...INITIAL_PROGRESS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_PROGRESS;
  });

  const [selectedMissionId, setSelectedMissionId] = useState<number>(1);
  // Start directly in Mission 1 Battle Arena upon unlocking so the screen matches the gameplay screenshot!
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

  const handleUnlock = () => {
    setUnlockedApp(true);
    // Attempt native landscape lock on supported mobile browsers
    try {
      const orient = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orient && orient.lock) {
        orient.lock('landscape').catch(() => {});
      }
    } catch {
      // Ignore
    }
  };

  if (!unlockedApp) {
    return <PrivateAccess onUnlock={handleUnlock} buildTimestamp={BUILD_TS} />;
  }

  // Strictly Horizontal (Landscape Only) Enforcement Screen when device is held vertically
  if (isPortrait) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 flex items-center justify-center mb-4">
          <Smartphone className="w-10 h-10 text-yellow-400 -rotate-90 animate-pulse" />
        </div>
        <h2 className="font-pixel text-sm sm:text-base text-yellow-400 mb-2">
          MODO ESTRICTAMENTE HORIZONTAL
        </h2>
        <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
          Por favor, <strong className="text-white">gira tu móvil en posición horizontal</strong> para jugar a <em>Dead Ahead: Last Survival</em> a pantalla completa.
        </p>
        <div className="fixed bottom-2 right-3 text-[10px] text-zinc-400/90 font-mono bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
          Actualizado: {BUILD_TS}
        </div>
      </div>
    );
  }

  const handleLaunchMission = (mission: MissionNode) => {
    soundFX.resumeFromBackground();
    soundFX.playUnitSpawn();
    setProgress((prev) => ({
      ...prev,
      fuel: prev.fuel >= mission.fuelCost ? prev.fuel - mission.fuelCost : prev.maxFuel,
    }));
    setActiveBattleMission(mission);
  };

  const handleVictory = (stars: number, coinsEarned: number) => {
    if (!activeBattleMission) return;
    const mId = activeBattleMission.id;
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
    setActiveBattleMission(null);
  };

  const handleUpgradeSurvivor = (type: SurvivorType, cost: number) => {
    if (progress.coins < cost) return;
    soundFX.playCouragePickup();
    setProgress((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      unitLevels: {
        ...prev.unitLevels,
        [type]: (prev.unitLevels[type] || 1) + 1,
      },
    }));
  };

  const handleUpgradeBusStat = (
    kind: 'hp' | 'bill' | 'bumper' | 'armor' | 'commander_level',
    cost: number
  ) => {
    if (progress.coins < cost) return;
    soundFX.playCouragePickup();
    setProgress((prev) => {
      if (kind === 'commander_level') {
        return {
          ...prev,
          coins: prev.coins - cost,
          busLevel: Math.min(10, (prev.busLevel || 1) + 1),
          commanderXp: 0,
        };
      }
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
  };

  const handleLevelUpCommanderLive = (newLevel: number, newXp: number) => {
    setProgress((prev) => ({
      ...prev,
      busLevel: Math.max(prev.busLevel || 1, newLevel),
      commanderXp: newXp,
    }));
  };

  const handleCollectCache = (cacheId: string, coins: number, fuel: number) => {
    setProgress((prev) => {
      if (prev.discoveredCaches.includes(cacheId)) return prev;
      return {
        ...prev,
        coins: prev.coins + coins,
        fuel: Math.min(prev.maxFuel, prev.fuel + fuel),
        discoveredCaches: [...prev.discoveredCaches, cacheId],
      };
    });
  };

  const handleRefillFuel = () => {
    soundFX.playCouragePickup();
    setProgress((prev) => ({ ...prev, fuel: prev.maxFuel }));
  };

  return (
    <div className="relative w-screen h-[100dvh] bg-[#322f24] overflow-hidden">
      {activeBattleMission ? (
        <BattleArena
          mission={activeBattleMission}
          progress={progress}
          onVictory={handleVictory}
          onRetreat={() => setActiveBattleMission(null)}
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
          onCollectCache={handleCollectCache}
          onRefillFuel={handleRefillFuel}
        />
      )}

      {/* Global Verification Timestamp in Bottom-Right Corner (Safe from iOS landscape corners) */}
      <div className="fixed bottom-2 right-3 z-[9999] text-[10px] sm:text-[11px] text-yellow-300 font-mono font-semibold bg-black/85 px-2.5 py-0.5 rounded border border-yellow-500/60 shadow-lg pointer-events-none">
        Actualizado: {BUILD_TS}
      </div>
    </div>
  );
}

export default App;

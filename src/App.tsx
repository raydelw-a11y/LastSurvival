import React, { useEffect, useState } from 'react';
import { MISSION_NODES, MissionNode, PlayerProgress, SurvivorType } from './types/game';
import { PrivateAccess } from './components/PrivateAccess';
import { RoadMapHub } from './components/RoadMapHub';
import { BattleArena } from './components/BattleArena';
import { soundFX } from './engine/SoundFX';

const FALLBACK_TIMESTAMP = '1:48 AM - 11/09/2026';
const BUILD_TS =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : FALLBACK_TIMESTAMP;

const STORAGE_KEY = 'last_survival_dead_ahead_v1';

const INITIAL_PROGRESS: PlayerProgress = {
  coins: 120,
  fuel: 20,
  maxFuel: 20,
  supplies: 3,
  busLevel: 1,
  busHpBonus: 0,
  billDamageBonus: 0,
  spikedBumper: false,
  weldedArmor: false,
  unitLevels: {
    redneck: 1,
    farmer: 1,
    builder: 1,
    policeman: 1,
    mechanic: 1,
  },
  missionStars: {},
  unlockedMissions: [1, 2],
  discoveredCaches: [],
};

export function App() {
  const [unlockedApp, setUnlockedApp] = useState<boolean>(false);
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
  const [activeBattleMission, setActiveBattleMission] = useState<MissionNode | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage error
    }
  }, [progress]);

  if (!unlockedApp) {
    return <PrivateAccess onUnlock={() => setUnlockedApp(true)} buildTimestamp={BUILD_TS} />;
  }

  const handleLaunchMission = (mission: MissionNode) => {
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

  const handleUpgradeBusStat = (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => {
    if (progress.coins < cost) return;
    soundFX.playCouragePickup();
    setProgress((prev) => {
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
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden">
      {activeBattleMission ? (
        <BattleArena
          mission={activeBattleMission}
          progress={progress}
          onVictory={handleVictory}
          onRetreat={() => setActiveBattleMission(null)}
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

      {/* Global Verification Timestamp in Corner (Main Screen & Battle Screen) */}
      <div className="fixed bottom-1 right-2 z-50 text-[10px] text-zinc-400/90 font-mono bg-zinc-950/85 px-2 py-0.5 rounded border border-zinc-800 pointer-events-none">
        Actualizado: {BUILD_TS}
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import {
  MISSION_NODES,
  MissionNode,
  PlayerProgress,
  SURVIVOR_CONFIGS,
  SurvivorType,
  ZOMBIE_CONFIGS,
  ZombieType,
} from '../types/game';
import {
  BookOpen,
  Coins,
  Compass,
  Flame,
  Fuel,
  Hammer,
  Play,
  Shield,
  Skull,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { soundFX } from '../engine/SoundFX';

interface RoadMapHubProps {
  progress: PlayerProgress;
  selectedMissionId: number;
  onSelectMission: (id: number) => void;
  onLaunchMission: (mission: MissionNode) => void;
  onUpgradeSurvivor: (type: SurvivorType, cost: number) => void;
  onUpgradeBusStat: (kind: 'hp' | 'bill' | 'bumper' | 'armor', cost: number) => void;
  onCollectCache: (cacheId: string, coins: number, fuel: number) => void;
  onRefillFuel: () => void;
}

const ROAD_CACHES = [
  { id: 'cache_1', name: 'Gasolinera Texaco', x: 24, y: 58, coins: 40, fuel: 3 },
  { id: 'cache_2', name: 'Camión Militar Volcado', x: 42, y: 55, coins: 65, fuel: 2 },
  { id: 'cache_3', name: 'Ferretería Abandonada', x: 60, y: 49, coins: 80, fuel: 3 },
  { id: 'cache_4', name: 'Convoy de Suministros', x: 77, y: 46, coins: 110, fuel: 4 },
];

export const RoadMapHub: React.FC<RoadMapHubProps> = ({
  progress,
  selectedMissionId,
  onSelectMission,
  onLaunchMission,
  onUpgradeSurvivor,
  onUpgradeBusStat,
  onCollectCache,
  onRefillFuel,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'deck' | 'garage' | 'zombiepedia'>('map');
  const selectedMission =
    MISSION_NODES.find((m) => m.id === selectedMissionId) || MISSION_NODES[0];

  // Interactive Bus Scout Position on the Road Map controllable via WASD!
  const [busMapPos, setBusMapPos] = useState<{ x: number; y: number }>({
    x: selectedMission.mapX,
    y: selectedMission.mapY,
  });

  useEffect(() => {
    setBusMapPos({ x: selectedMission.mapX, y: selectedMission.mapY });
  }, [selectedMission.mapX, selectedMission.mapY]);

  // WASD movement on the Road Map to drive the Bus across nodes & supply caches
  useEffect(() => {
    if (activeTab !== 'map') return;
    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === 'enter') {
        onLaunchMission(selectedMission);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = setInterval(() => {
      const dx =
        (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const dy =
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
        (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        setBusMapPos((prev) => {
          const nx = Math.max(8, Math.min(92, prev.x + dx * 1.35));
          const ny = Math.max(18, Math.min(84, prev.y + dy * 1.35));

          // Snap-select any Mission Node we drive over
          MISSION_NODES.forEach((node) => {
            if (
              progress.unlockedMissions.includes(node.id) &&
              Math.hypot(node.mapX - nx, node.mapY - ny) < 6.5
            ) {
              onSelectMission(node.id);
            }
          });

          // Automatically collect any Supply Cache we drive over!
          ROAD_CACHES.forEach((cache) => {
            if (
              !progress.discoveredCaches.includes(cache.id) &&
              Math.hypot(cache.x - nx, cache.y - ny) < 6
            ) {
              soundFX.playCouragePickup();
              onCollectCache(cache.id, cache.coins, cache.fuel);
            }
          });

          return { x: nx, y: ny };
        });
      }
    }, 30);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, [
    activeTab,
    onCollectCache,
    onLaunchMission,
    onSelectMission,
    progress.discoveredCaches,
    progress.unlockedMissions,
    selectedMission,
  ]);

  const totalStars = Object.values(progress.missionStars).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* TOP BAR: Title, Resources (Coins, Fuel, Stars) & Navigation Tabs */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900 border-b-2 border-zinc-800 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-zinc-950 font-pixel text-sm shadow">
            🚌
          </div>
          <div>
            <h1 className="font-pixel text-xs sm:text-sm text-yellow-400 tracking-wide">
              DEAD AHEAD: LAST SURVIVAL
            </h1>
            <p className="text-xs text-zinc-400">
              Escuadrón de Supervivencia del Sheriff Bill — Ruta Interestatal
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'map'
                ? 'bg-yellow-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mapa de Carretera</span>
          </button>
          <button
            onClick={() => setActiveTab('deck')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'deck'
                ? 'bg-yellow-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mazo de Tropas</span>
          </button>
          <button
            onClick={() => setActiveTab('garage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'garage'
                ? 'bg-yellow-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Garaje del Autobús</span>
          </button>
          <button
            onClick={() => setActiveTab('zombiepedia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'zombiepedia'
                ? 'bg-yellow-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Zombiepedia</span>
          </button>
        </div>

        {/* Economy Counters */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-yellow-600/60 px-3 py-1.5 rounded-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-pixel text-xs text-yellow-300">{progress.coins}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 border border-red-600/60 px-3 py-1.5 rounded-lg">
            <Fuel className="w-4 h-4 text-red-400" />
            <span className="font-pixel text-xs text-white">
              {progress.fuel}/{progress.maxFuel}
            </span>
            {progress.fuel < progress.maxFuel && (
              <button
                onClick={onRefillFuel}
                className="ml-1 text-[10px] bg-red-600 hover:bg-red-500 text-white px-1.5 py-0.5 rounded font-bold"
                title="Recargar Gasolina Gratis"
              >
                +Llenar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 border border-amber-500/50 px-3 py-1.5 rounded-lg">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-pixel text-xs text-amber-300">{totalStars}/15</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ============================================================ */}
        {/* TAB 1: INTERACTIVE ROAD TRIP MAP (with WASD Bus Driving)      */}
        {/* ============================================================ */}
        {activeTab === 'map' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Left 2 Columns: Highway Map Canvas */}
            <div className="lg:col-span-2 relative min-h-[380px] rounded-2xl border-2 border-zinc-800 bg-[#1c221e] overflow-hidden shadow-2xl">
              {/* Topographic Grid Lines */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #3f4f3e 1px, transparent 1px), linear-gradient(to bottom, #3f4f3e 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
              />

              {/* WASD Driving Banner */}
              <div className="absolute top-3 left-3 z-20 bg-zinc-950/90 border border-emerald-500/60 px-3 py-1.5 rounded-lg text-xs text-emerald-300 flex items-center gap-2 shadow">
                <Truck className="w-4 h-4 text-yellow-400" />
                <span>
                  Usa <strong className="text-white">WASD</strong> para conducir el autobús por el mapa o haz clic en un nodo de misión
                </span>
              </div>

              {/* SVG Winding Highway Path Connecting Mission Nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polyline
                  points={MISSION_NODES.map((m) => `${m.mapX}%,${m.mapY}%`).join(' ')}
                  fill="none"
                  stroke="#27272a"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={MISSION_NODES.map((m) => `${m.mapX}%,${m.mapY}%`).join(' ')}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                />
              </svg>

              {/* Collectible Supply Caches on the Road */}
              {ROAD_CACHES.map((cache) => {
                const collected = progress.discoveredCaches.includes(cache.id);
                if (collected) return null;
                return (
                  <button
                    key={cache.id}
                    onClick={() => {
                      soundFX.playCouragePickup();
                      onCollectCache(cache.id, cache.coins, cache.fuel);
                    }}
                    style={{ left: `${cache.x}%`, top: `${cache.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded-lg bg-amber-950/95 border border-amber-400 text-[10px] font-bold text-amber-200 hover:scale-110 transition shadow-lg flex items-center gap-1 animate-bounce"
                    title="Haz clic o pasa con el autobús (WASD) para saquear suministros"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    <span>📦 +{cache.coins}🪙</span>
                  </button>
                );
              })}

              {/* Mission Nodes */}
              {MISSION_NODES.map((node) => {
                const unlocked = progress.unlockedMissions.includes(node.id);
                const stars = progress.missionStars[node.id] || 0;
                const isSelected = selectedMission.id === node.id;

                return (
                  <button
                    key={node.id}
                    onClick={() => unlocked && onSelectMission(node.id)}
                    style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center transition ${
                      unlocked ? 'cursor-pointer hover:scale-110' : 'opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center font-pixel text-xs shadow-xl ${
                        isSelected
                          ? 'bg-yellow-400 text-zinc-950 border-white ring-4 ring-yellow-500/40'
                          : unlocked
                          ? 'bg-zinc-900 text-white border-yellow-500'
                          : 'bg-zinc-950 text-zinc-600 border-zinc-700'
                      }`}
                    >
                      {node.id}
                    </div>
                    <div className="flex items-center gap-0.5 mt-1 bg-zinc-950/90 px-1.5 py-0.5 rounded border border-zinc-800">
                      {[1, 2, 3].map((s) => (
                        <span
                          key={s}
                          className={`text-[10px] ${
                            s <= stars ? 'text-yellow-400' : 'text-zinc-700'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-200 bg-zinc-950/90 px-1.5 rounded mt-0.5 whitespace-nowrap">
                      {node.name.replace(`Misión ${node.id}: `, '')}
                    </span>
                  </button>
                );
              })}

              {/* Player's WASD-Driven Yellow School Bus Marker */}
              <div
                style={{ left: `${busMapPos.x}%`, top: `${busMapPos.y}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-30 transition-all duration-75"
              >
                <div className="px-2 py-1 rounded bg-yellow-400 border-2 border-zinc-950 text-zinc-950 font-pixel text-[10px] shadow-xl flex items-center gap-1">
                  <span>🚌</span>
                  <span>BILL</span>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Mission Briefing & Launch Button */}
            <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                    {selectedMission.sector}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      selectedMission.difficulty === 'EASY'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : selectedMission.difficulty === 'NORMAL'
                        ? 'bg-sky-950 text-sky-300 border border-sky-600'
                        : selectedMission.difficulty === 'HARD'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : 'bg-red-950 text-red-300 border border-red-600'
                    }`}
                  >
                    {selectedMission.difficulty}
                  </span>
                </div>

                <h2 className="font-pixel text-base text-white mb-2">{selectedMission.name}</h2>
                <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                  {selectedMission.description}
                </p>

                <div className="space-y-2.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Resistencia de Barricada:</span>
                    <span className="font-bold text-red-400">
                      🚧 {selectedMission.barricadeHp} HP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Recompensa Base:</span>
                    <span className="font-bold text-yellow-400">
                      +{selectedMission.coinsReward} Monedas 🪙
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Botín de Barricada:</span>
                    <span className="font-bold text-sky-300">{selectedMission.supplyReward}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Amenazas Detectadas:</span>
                    <span className="font-bold text-zinc-200">
                      {Array.from(new Set(selectedMission.zombiePool))
                        .map((z) => ZOMBIE_CONFIGS[z].name.split(' ')[0])
                        .join(', ')}
                    </span>
                  </div>
                </div>

                {/* Quick Controls Guide */}
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-300 space-y-1">
                  <div className="font-bold text-yellow-400 mb-1">🎮 Controles en Batalla:</div>
                  <div>
                    • <strong>Ratón / Táctil:</strong> Clic en cartas para invocar tropas; arrastra los barriles azules/rojos a la carretera; pasa el cursor o haz clic sobre botellas azules (<strong>+25 Valor</strong>).
                  </div>
                  <div>
                    • <strong>Teclado WASD:</strong> Mueve libremente al superviviente seleccionado (pulsa <strong>Tab</strong> o haz clic sobre otro superviviente para cambiar).
                  </div>
                  <div>
                    • <strong>Atajos:</strong> Teclas <strong>1–5</strong> (Unidades), <strong>Q / Shift+W / E</strong> (Barriles y Botiquín), <strong>Espacio</strong> (Ráfaga de Bill).
                  </div>
                </div>
              </div>

              <button
                onClick={() => onLaunchMission(selectedMission)}
                className="mt-5 w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-extrabold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-zinc-950" />
                <span>¡ASALTAR BARRICADA! (-{selectedMission.fuelCost} Gasolina)</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SURVIVOR BATTLE DECK & LEVEL UPGRADES                 */}
        {/* ============================================================ */}
        {activeTab === 'deck' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-4">
              <h2 className="font-pixel text-sm sm:text-base text-yellow-400">
                MAZO DE SUPERVIVIENTES — ENTRENAMIENTO Y SUMINISTROS
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Invierte monedas ganadas al demoler barricadas para mejorar un +18% la Salud y el Daño de cada clase por nivel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(SURVIVOR_CONFIGS) as SurvivorType[]).map((sType) => {
                const cfg = SURVIVOR_CONFIGS[sType];
                const lvl = progress.unitLevels[sType] || 1;
                const upgradeCost = lvl * 55;
                const canAfford = progress.coins >= upgradeCost;
                const mult = 1 + (lvl - 1) * 0.18;

                return (
                  <div
                    key={sType}
                    className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-sky-500 text-sky-950 font-pixel text-[10px] px-2 py-0.5 rounded font-bold">
                          💧 {cfg.cost} Valor
                        </span>
                        <span className="font-pixel text-xs text-yellow-400">Nivel {lvl}</span>
                      </div>

                      <h3 className="text-base font-extrabold text-white">{cfg.name}</h3>
                      <div className="text-xs font-bold text-sky-400 mb-2">{cfg.roleTitle}</div>
                      <p className="text-xs text-zinc-400 mb-4">{cfg.description}</p>

                      <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs mb-4">
                        <div>
                          <span className="text-zinc-400">❤️ Salud:</span>{' '}
                          <strong className="text-emerald-400">
                            {Math.round(cfg.baseHp * mult)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-zinc-400">⚔️ Daño:</span>{' '}
                          <strong className="text-amber-400">
                            {Math.round(cfg.baseDamage * mult)}
                            {cfg.pellets ? ` x${cfg.pellets}` : ''}
                          </strong>
                        </div>
                        <div>
                          <span className="text-zinc-400">★ Fortuna:</span>{' '}
                          <strong className="text-yellow-300">{cfg.fortune}%</strong>
                        </div>
                        <div>
                          <span className="text-zinc-400">⏱️ Prep:</span>{' '}
                          <strong className="text-zinc-200">{cfg.prepTime}s</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpgradeSurvivor(sType, upgradeCost)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition ${
                        canAfford
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      Mejorar a Nivel {lvl + 1} ({upgradeCost} 🪙)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: BILL'S ARMORED BUS GARAGE                             */}
        {/* ============================================================ */}
        {activeTab === 'garage' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="font-pixel text-sm sm:text-base text-yellow-400">
                GARAJE DE BILL — BLINDAJE Y ARTILLERÍA DEL AUTOBÚS
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Refuerza el autobús escolar amarillo para conseguir las 3 estrellas en cada misión y potenciar el rifle de Bill.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-1">
                    <Shield className="w-5 h-5" />
                    <span>Refuerzo de Chasis (+50 HP)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Incrementa la integridad estructural del autobús (Actual:{' '}
                    <strong className="text-white">{200 + progress.busHpBonus} HP</strong>).
                  </p>
                </div>
                <button
                  onClick={() => onUpgradeBusStat('hp', 75)}
                  disabled={progress.coins < 75}
                  className={`py-2.5 rounded-xl font-extrabold text-xs uppercase ${
                    progress.coins >= 75
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Soldar Chasis (75 🪙)
                </button>
              </div>

              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                    <Flame className="w-5 h-5" />
                    <span>Rifle de Caza de Bill (+8 Daño)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Aumenta el daño de cada disparo de cabina y de su Ráfaga Especial (Bono actual:{' '}
                    <strong className="text-white">+{progress.billDamageBonus}</strong>).
                  </p>
                </div>
                <button
                  onClick={() => onUpgradeBusStat('bill', 80)}
                  disabled={progress.coins < 80}
                  className={`py-2.5 rounded-xl font-extrabold text-xs uppercase ${
                    progress.coins >= 80
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Mejorar Calibre (80 🪙)
                </button>
              </div>

              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-1">
                    <Hammer className="w-5 h-5" />
                    <span>Parachoques con Púas (Daño de Retorno)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Instala cuchillas frontales en el autobús que devuelven 12 de daño a cualquier zombi que golpee el parachoques.
                  </p>
                </div>
                <button
                  onClick={() => onUpgradeBusStat('bumper', 110)}
                  disabled={progress.spikedBumper || progress.coins < 110}
                  className={`py-2.5 rounded-xl font-extrabold text-xs uppercase ${
                    progress.spikedBumper
                      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-600 cursor-default'
                      : progress.coins >= 110
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {progress.spikedBumper ? '✓ INSTALADO' : 'Instalar Púas (110 🪙)'}
                </button>
              </div>

              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-1">
                    <Wrench className="w-5 h-5" />
                    <span>Placas de Acero Soldadas (+80 HP)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Recubre los laterales del autobús escolar con chapas remachadas visibles en combate y +80 HP extra.
                  </p>
                </div>
                <button
                  onClick={() => onUpgradeBusStat('armor', 130)}
                  disabled={progress.weldedArmor || progress.coins < 130}
                  className={`py-2.5 rounded-xl font-extrabold text-xs uppercase ${
                    progress.weldedArmor
                      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-600 cursor-default'
                      : progress.coins >= 130
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {progress.weldedArmor ? '✓ INSTALADO' : 'Soldar Placas (130 🪙)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: ZOMBIEPEDIA ENCYCLOPEDIA                              */}
        {/* ============================================================ */}
        {activeTab === 'zombiepedia' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-4">
              <h2 className="font-pixel text-sm sm:text-base text-red-400">
                ZOMBIEPEDIA — REGISTRO DE AMENAZAS E INFECCIÓN POST-MORTEM
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Conoce las debilidades de cada infectado. Recuerda: ¡tus propias unidades muertas se levantan como zombis si no incineras o aplastas sus cadáveres!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(ZOMBIE_CONFIGS) as ZombieType[]).map((zType) => {
                const z = ZOMBIE_CONFIGS[zType];
                return (
                  <div
                    key={zType}
                    className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        <Skull className="w-4 h-4 text-red-500" />
                        {z.name}
                      </span>
                      <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold">
                        +{z.rageReward} Furia
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{z.description}</p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
                      <div>
                        <span className="text-zinc-500">HP:</span>{' '}
                        <strong className="text-red-300">{z.baseHp}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Daño:</span>{' '}
                        <strong className="text-amber-300">{z.baseDamage}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Vel:</span>{' '}
                        <strong className="text-zinc-200">{z.speed}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

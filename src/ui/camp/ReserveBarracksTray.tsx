import { useState, useMemo } from 'react';
import { Unit } from '../../core/types/unit';
import { HeroMiniCard } from './HeroMiniCard';
import { checkHeroLevelReady } from './heroUtils';
import './ReserveBarracksTray.css';

export interface ReserveBarracksTrayProps {
  readonly reserveHeroes: readonly Unit[];
  readonly onInspectHero: (unit: Unit) => void;
  readonly onDeployHero: (unitId: string) => void;
  readonly onSelectForSwap: (unitId: string) => void;
  readonly onRecruitNovice: () => void;
  readonly onCancelSwap?: () => void;
  readonly canDeploy?: boolean;
  readonly swappingHeroName?: string | null;
}

export function ReserveBarracksTray({
  reserveHeroes,
  onInspectHero,
  onDeployHero,
  onSelectForSwap,
  onRecruitNovice,
  onCancelSwap,
  canDeploy = true,
  swappingHeroName = null
}: ReserveBarracksTrayProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Discover all distinct classes currently present in reserve
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    for (const h of reserveHeroes) {
      set.add(h.loadout.activeClassId);
    }
    return Array.from(set).sort();
  }, [reserveHeroes]);

  // Filter heroes based on selected category
  const filteredHeroes = useMemo(() => {
    return reserveHeroes.filter((h) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'level_ready') return checkHeroLevelReady(h).isReady;
      return h.loadout.activeClassId === activeFilter;
    });
  }, [reserveHeroes, activeFilter]);

  const levelReadyCount = useMemo(() => {
    return reserveHeroes.filter((h) => checkHeroLevelReady(h).isReady).length;
  }, [reserveHeroes]);

  return (
    <section className="reserve-barracks-tray" data-testid="reserve-barracks-tray">
      {/* Header and Controls */}
      <div className="reserve-tray-header">
        <div className="reserve-tray-title-group">
          <h3 className="reserve-tray-title font-display">Reserve Barracks</h3>
          <span className="reserve-count-badge font-mono">
            {reserveHeroes.length} {reserveHeroes.length === 1 ? 'Hero' : 'Heroes'}
          </span>
        </div>

        {/* Filter Chips */}
        <div className="reserve-filter-bar">
          <button
            type="button"
            className={`reserve-filter-chip font-ui ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
            data-testid="filter-all-btn"
          >
            All ({reserveHeroes.length})
          </button>

          {levelReadyCount > 0 && (
            <button
              type="button"
              className={`reserve-filter-chip font-ui ${activeFilter === 'level_ready' ? 'active' : ''}`}
              onClick={() => setActiveFilter('level_ready')}
              data-testid="filter-level-ready-btn"
            >
              ✦ Level Ready ({levelReadyCount})
            </button>
          )}

          {distinctClasses.map((cls) => (
            <button
              key={cls}
              type="button"
              className={`reserve-filter-chip font-ui ${activeFilter === cls ? 'active' : ''}`}
              onClick={() => setActiveFilter(cls)}
            >
              {cls.charAt(0).toUpperCase() + cls.slice(1)}
            </button>
          ))}
        </div>

        {/* Recruit Action */}
        <button
          type="button"
          className="btn-recruit-novice font-ui"
          onClick={onRecruitNovice}
          data-testid="recruit-novice-btn"
        >
          + Recruit Novice
        </button>
      </div>

      {/* Guidance Banner when swapping */}
      {swappingHeroName && (
        <div className="reserve-swap-banner font-ui" data-testid="reserve-swap-banner">
          <span>
            🔄 Select a reserve hero below to replace <strong>{swappingHeroName}</strong> in the active vanguard:
          </span>
          {onCancelSwap && (
            <button
              type="button"
              className="reserve-swap-cancel-btn"
              onClick={onCancelSwap}
              data-testid="cancel-swap-btn"
            >
              Cancel Swap
            </button>
          )}
        </div>
      )}

      {/* Cards Scroll Container */}
      <div className="reserve-cards-scroll-container">
        {filteredHeroes.length === 0 ? (
          <div className="reserve-empty-state font-ui">
            {reserveHeroes.length === 0
              ? 'No heroes in reserve. Recruit a Novice to expand your roster!'
              : 'No reserve heroes match the selected filter.'}
          </div>
        ) : (
          filteredHeroes.map((unit) => (
            <HeroMiniCard
              key={unit.id}
              unit={unit}
              onInspect={onInspectHero}
              onDeploy={onDeployHero}
              onSelectForSwap={onSelectForSwap}
              canDeploy={canDeploy}
              isSwapTarget={Boolean(swappingHeroName)}
            />
          ))
        )}
      </div>
    </section>
  );
}

import { Unit } from '../../core/types/unit';
import { HeroCard } from './HeroCard';
import './ActiveSquadDock.css';

export interface ActiveSquadDockProps {
  readonly activeSquad: readonly Unit[];
  readonly maxSquadSize?: number;
  readonly onInspectHero: (unit: Unit) => void;
  readonly onBenchHero: (unitId: string) => void;
  readonly onSwapHero: (unitId: string) => void;
  readonly swappingHeroId?: string | null;
}

export function ActiveSquadDock({
  activeSquad,
  maxSquadSize = 3,
  onInspectHero,
  onBenchHero,
  onSwapHero,
  swappingHeroId = null
}: ActiveSquadDockProps) {
  const canBench = activeSquad.length > 1;

  // Build an array of length maxSquadSize (e.g. 3 slots)
  const slots: (Unit | null)[] = Array.from({ length: maxSquadSize }, (_, index) => {
    return activeSquad[index] ?? null;
  });

  return (
    <section className="active-squad-dock" data-testid="active-squad-dock">
      <header className="squad-dock-header">
        <h2 className="squad-dock-title font-display">
          <span>✦ The Vanguard</span>
          <span className="squad-count-badge font-mono">
            {activeSquad.length} / {maxSquadSize}
          </span>
        </h2>
      </header>

      <div className="squad-dock-grid">
        {slots.map((unit, index) => {
          if (unit) {
            return (
              <HeroCard
                key={unit.id}
                unit={unit}
                onInspect={onInspectHero}
                onBench={onBenchHero}
                onSwap={onSwapHero}
                canBench={canBench}
                isSwapping={swappingHeroId === unit.id}
              />
            );
          }

          return (
            <div
              key={`empty-slot-${index}`}
              className="empty-squad-slot"
              data-testid={`empty-squad-slot-${index}`}
            >
              <div className="empty-slot-plus">+</div>
              <span className="empty-slot-label font-ui">Vacant Conduit</span>
              <span className="empty-slot-hint font-ui">
                Attune a reserve wayfarer to this conduit
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

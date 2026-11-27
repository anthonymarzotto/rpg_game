import { Unit } from '../../core/types/unit';
import { HeroCard } from './HeroCard';
import { computeSquadThreat, getStageDeploymentBudget } from '../../core/campaign/threatBudget';
import './ActiveSquadDock.css';

export interface ActiveSquadDockProps {
  readonly activeSquad: readonly Unit[];
  readonly stage?: number;
  readonly deploymentBudget?: number;
  readonly maxSquadSize?: number;
  readonly onInspectHero: (unit: Unit) => void;
  readonly onBenchHero: (unitId: string) => void;
  readonly onSwapHero: (unitId: string) => void;
  readonly swappingHeroId?: string | null;
}

export function ActiveSquadDock({
  activeSquad,
  stage,
  deploymentBudget,
  maxSquadSize,
  onInspectHero,
  onBenchHero,
  onSwapHero,
  swappingHeroId = null
}: ActiveSquadDockProps) {
  const canBench = activeSquad.length > 1;
  const deployedThreat = computeSquadThreat(activeSquad);
  const effectiveBudget = deploymentBudget ?? (stage != null ? getStageDeploymentBudget(stage) : undefined);

  // If fixed slot count is provided without points budget (legacy mode)
  const legacyMode = effectiveBudget == null && maxSquadSize != null;
  const slots: (Unit | null)[] = legacyMode
    ? Array.from({ length: maxSquadSize }, (_, index) => activeSquad[index] ?? null)
    : [...activeSquad];

  const hasRemainingBudget = effectiveBudget != null ? deployedThreat < effectiveBudget : false;

  return (
    <section className="active-squad-dock" data-testid="active-squad-dock">
      <header className="squad-dock-header">
        <h2 className="squad-dock-title font-display">
          <span>✦ The Staging Dais</span>
          <span className="squad-count-badge font-mono" data-testid="vanguard-points-badge">
            {effectiveBudget != null
              ? `${deployedThreat} / ${effectiveBudget} Pts (${activeSquad.length} Staged)`
              : `${activeSquad.length} / ${maxSquadSize ?? 3}`}
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
              <span className="empty-slot-label font-ui">Open Dais Spot</span>
              <span className="empty-slot-hint font-ui">
                Stage a wayfarer from Campfire Commons to take the field
              </span>
            </div>
          );
        })}

        {!legacyMode && hasRemainingBudget && (
          <div
            className="empty-squad-slot"
            data-testid="vacant-budget-slot"
          >
            <div className="empty-slot-plus">+</div>
            <span className="empty-slot-label font-ui">Room on the Dais</span>
            <span className="empty-slot-hint font-ui">
              {effectiveBudget! - deployedThreat} pts remaining in Trial Budget
            </span>
          </div>
        )}
      </div>
    </section>
  );
}


import { Unit } from '../../core/types/unit';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { checkHeroLevelReady } from './heroUtils';
import './HeroMiniCard.css';

export interface HeroMiniCardProps {
  readonly unit: Unit;
  readonly onInspect: (unit: Unit) => void;
  readonly onDeploy?: (unitId: string) => void;
  readonly onSelectForSwap?: (unitId: string) => void;
  readonly canDeploy?: boolean;
  readonly isSwapTarget?: boolean;
}

export function HeroMiniCard({
  unit,
  onInspect,
  onDeploy,
  onSelectForSwap,
  canDeploy = true,
  isSwapTarget = false
}: HeroMiniCardProps) {
  const tokenSrc = resolveTokenAssetPath(unit);
  const levelStatus = checkHeroLevelReady(unit);

  return (
    <div
      className={`hero-mini-card ${levelStatus.isReady ? 'level-ready' : ''} ${isSwapTarget ? 'swap-target' : ''}`}
      data-testid={`reserve-mini-card-${unit.id}`}
    >
      <div className="mini-card-top">
        <div className="mini-card-avatar">
          {tokenSrc ? (
            <img src={tokenSrc} alt={unit.name} className="mini-card-token pixel-art" />
          ) : (
            <span className="mini-card-fallback">{unit.name.charAt(0)}</span>
          )}
        </div>
        <div className="mini-card-info">
          <h4 className="mini-card-name font-ui">{unit.name}</h4>
          <span className="mini-card-class font-mono">
            Lv {unit.progression.currentLevel} {unit.loadout.activeClassId}
          </span>
        </div>
      </div>

      {levelStatus.isReady && (
        <span className="mini-card-level-badge font-ui">✦ LEVEL READY</span>
      )}

      <div className="mini-card-actions">
        <button
          type="button"
          className="mini-action-btn inspect font-ui"
          onClick={() => onInspect(unit)}
          data-testid="reserve-inspect-btn"
        >
          Inspect
        </button>

        {isSwapTarget && onSelectForSwap ? (
          <button
            type="button"
            className="mini-action-btn swap-select font-ui"
            onClick={() => onSelectForSwap(unit.id)}
            data-testid="reserve-slot-in-btn"
          >
            Slot In
          </button>
        ) : onDeploy ? (
          <button
            type="button"
            className="mini-action-btn deploy font-ui"
            onClick={() => onDeploy(unit.id)}
            disabled={!canDeploy}
            title={canDeploy ? 'Deploy to active squad' : 'Squad full (3/3) - bench a hero first or click Swap'}
            data-testid="reserve-deploy-btn"
          >
            Deploy
          </button>
        ) : null}
      </div>
    </div>
  );
}

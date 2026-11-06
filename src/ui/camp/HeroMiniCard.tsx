import { Unit } from '../../core/types/unit';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { checkHeroLevelReady, getHeroDisplayTitle } from './heroUtils';
import { computeUnitThreat } from '../../core/campaign/threatBudget';
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
  const unitThreat = computeUnitThreat(unit);

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
          <div className="mini-card-title-row">
            <h4 className="mini-card-name font-ui">{unit.name}</h4>
            <span
              className="mini-threat-pill font-mono"
              title={`Threat Value: ${unitThreat} Pts`}
              data-testid={`reserve-threat-${unit.id}`}
            >
              {unitThreat} Pts
            </span>
          </div>
          <span className="mini-card-class font-mono">
            Lv {unit.progression.currentLevel} {getHeroDisplayTitle(unit)}
          </span>
        </div>
      </div>

      {levelStatus.isReady && (
        <span className="mini-card-level-badge font-ui">✦ ASCENSION READY</span>
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
            title={canDeploy ? 'Deploy to active vanguard' : 'Cannot deploy wayfarer'}
            data-testid="reserve-deploy-btn"
          >
            Deploy
          </button>
        ) : null}
      </div>
    </div>
  );
}

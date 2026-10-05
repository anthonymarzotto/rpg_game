import { Unit } from '../../core/types/unit';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { checkHeroLevelReady, getArchetypeProgress, getHeroDisplayTitle } from './heroUtils';
import './HeroCard.css';

export interface HeroCardProps {
  readonly unit: Unit;
  readonly onInspect: (unit: Unit) => void;
  readonly onBench?: (unitId: string) => void;
  readonly onSwap?: (unitId: string) => void;
  readonly canBench?: boolean;
  readonly isSwapping?: boolean;
}

export function HeroCard({
  unit,
  onInspect,
  onBench,
  onSwap,
  canBench = true,
  isSwapping = false
}: HeroCardProps) {
  const tokenSrc = resolveTokenAssetPath(unit);
  const levelStatus = checkHeroLevelReady(unit);
  const xp = unit.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
  const threshold = levelStatus.threshold;

  const maxHp = unit.effectiveVitals.maxHp;

  return (
    <div
      className={`hero-card ${levelStatus.isReady ? 'level-ready' : ''} ${isSwapping ? 'swapping-active' : ''}`}
      data-testid={`hero-card-${unit.id}`}
    >
      {/* Header with Avatar and Names */}
      <div className="hero-card-header">
        <div className="hero-card-avatar-wrap">
          {tokenSrc ? (
            <img src={tokenSrc} alt={unit.name} className="hero-card-token pixel-art" />
          ) : (
            <span className="hero-card-avatar-fallback">{unit.name.charAt(0)}</span>
          )}
        </div>
        <div className="hero-card-identity">
          <h3 className="hero-card-name font-display">{unit.name}</h3>
          <span className="hero-card-class-tag font-ui">
            Lv {unit.progression.currentLevel} {getHeroDisplayTitle(unit)}
          </span>
        </div>
      </div>

      {/* HP Vitals */}
      <div className="hero-card-vitals">
        <div className="hero-card-hp-label font-mono">
          <span>HP</span>
          <span>{maxHp} / {maxHp}</span>
        </div>
        <div className="hero-card-hp-bar">
          <div className="hero-card-hp-fill" />
        </div>
      </div>

      {/* Attributes: Force / Finesse / Focus */}
      <div className="hero-card-attributes font-mono">
        <span className="attr-item force" title="Force">
          ⚔️ FRC: {unit.baseAttributes.force}
        </span>
        <span className="attr-item finesse" title="Finesse">
          🗡️ FIN: {unit.baseAttributes.finesse}
        </span>
        <span className="attr-item focus" title="Focus">
          🔮 FOC: {unit.baseAttributes.focus}
        </span>
      </div>

      {/* Level Ready Alert */}
      {levelStatus.isReady && (
        <div className="hero-level-ready-banner font-ui" data-testid="level-ready-banner">
          ✦ ASCENSION READY!
        </div>
      )}

      {/* Archetype XP Progress Bars */}
      <div className="hero-card-xp-section font-mono">
        <div className="xp-bar-row">
          <span className="xp-bar-label fighter">Fighter</span>
          <div className="xp-bar-track">
            <div
              className="xp-bar-fill fighter"
              style={{ width: `${getArchetypeProgress(xp.fighter, threshold)}%` }}
            />
          </div>
          <span className="xp-bar-val">{xp.fighter}/{threshold}</span>
        </div>

        <div className="xp-bar-row">
          <span className="xp-bar-label rogue">Rogue</span>
          <div className="xp-bar-track">
            <div
              className="xp-bar-fill rogue"
              style={{ width: `${getArchetypeProgress(xp.rogue, threshold)}%` }}
            />
          </div>
          <span className="xp-bar-val">{xp.rogue}/{threshold}</span>
        </div>

        <div className="xp-bar-row">
          <span className="xp-bar-label mage">Mage</span>
          <div className="xp-bar-track">
            <div
              className="xp-bar-fill mage"
              style={{ width: `${getArchetypeProgress(xp.mage, threshold)}%` }}
            />
          </div>
          <span className="xp-bar-val">{xp.mage}/{threshold}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="hero-card-actions">
        <button
          type="button"
          className="hero-action-btn primary font-ui"
          onClick={() => onInspect(unit)}
          data-testid="hero-inspect-btn"
        >
          {levelStatus.isReady ? '✦ Ascend' : 'Inspect'}
        </button>

        {onSwap && (
          <button
            type="button"
            className={`hero-action-btn secondary ${isSwapping ? 'swapping' : ''} font-ui`}
            onClick={() => onSwap(unit.id)}
            data-testid="hero-swap-btn"
          >
            {isSwapping ? 'Cancel' : 'Swap'}
          </button>
        )}

        {onBench && (
          <button
            type="button"
            className="hero-action-btn secondary font-ui"
            onClick={() => onBench(unit.id)}
            disabled={!canBench}
            title={canBench ? 'Return to The Enclave' : 'Cannot withdraw the only wayfarer in The Vanguard'}
            data-testid="hero-bench-btn"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

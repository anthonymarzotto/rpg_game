import { useMemo } from 'react';
import { CombatState } from '../../core/combat/types';
import { predictTurnOrder } from '../../core/combat/turnClock';
import { resolveTokenAssetPath } from './tokenAssets';
import './InitiativeRibbon.css';

export interface InitiativeRibbonProps {
  readonly state: CombatState;
  readonly highlightedUnitId?: string | null;
  readonly pinnedUnitId?: string | null;
  readonly onHoverUnit?: (unitId: string | null) => void;
  readonly onPinUnit?: (unitId: string) => void;
}

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function InitiativeRibbon({
  state,
  highlightedUnitId,
  pinnedUnitId,
  onHoverUnit,
  onPinUnit
}: InitiativeRibbonProps) {
  const projectedTurns = useMemo(() => {
    return predictTurnOrder(state, 8);
  }, [state]);

  if (projectedTurns.length === 0) {
    return null;
  }

  return (
    <div className="initiative-ribbon-container">
      <div className="initiative-label-box" title="Initiative Queue">
        <span className="initiative-icon" aria-label="Initiative Queue">⏳</span>
      </div>

      <div className="initiative-track">
        {projectedTurns.map((turn, index) => {
          const cu = state.units.get(turn.unitId);
          const unit = cu?.unit;
          const tokenSrc = unit ? resolveTokenAssetPath(unit) : null;
          const isPlayer = turn.faction === 'PLAYER';
          const isHighlighted = highlightedUnitId != null && turn.unitId === highlightedUnitId;
          const isPinned = pinnedUnitId != null && turn.unitId === pinnedUnitId;
          const level = unit?.progression?.currentLevel ?? 0;
          const classId = unit?.loadout?.activeClassId ?? 'novice';
          const className = classId.charAt(0).toUpperCase() + classId.slice(1);
          const maxHp = unit?.effectiveVitals.maxHp ?? cu?.currentHp ?? 0;
          const tooltip = cu
            ? `${turn.name} • Level ${level} ${className} • HP: ${cu.currentHp}/${maxHp}`
            : turn.name;

          const isFirstOccurrence =
            projectedTurns.findIndex((t) => t.unitId === turn.unitId) === index;
          const currentGauge = turn.isCurrentActive
            ? 100
            : isFirstOccurrence
            ? (cu?.initiativeGauge ?? 0)
            : 0;
          const gaugePercent = Math.min(100, Math.max(0, currentGauge)) / 100;
          const strokeDashoffset = Number(
            (RING_CIRCUMFERENCE * (1 - gaugePercent)).toFixed(2)
          );

          return (
            <div
              key={`${turn.unitId}-${index}`}
              className={`initiative-chip ${
                turn.isCurrentActive ? 'chip-active' : ''
              } ${isPlayer ? 'chip-player' : 'chip-enemy'} ${
                isHighlighted ? 'chip-highlighted' : ''
              } ${isPinned ? 'chip-pinned' : ''}`}
              onMouseEnter={() => onHoverUnit?.(turn.unitId)}
              onMouseLeave={() => onHoverUnit?.(null)}
              onClick={() => onPinUnit?.(turn.unitId)}
              data-testid={`initiative-chip-${turn.unitId}-${index}`}
              title={tooltip}
            >
              <div className="chip-avatar-wrap">
                <svg
                  className="chip-gauge-ring"
                  viewBox="0 0 42 42"
                  width="42"
                  height="42"
                  aria-hidden="true"
                  data-testid={`chip-gauge-ring-${turn.unitId}-${index}`}
                >
                  <circle
                    className="chip-gauge-track"
                    cx="21"
                    cy="21"
                    r={RING_RADIUS}
                  />
                  <circle
                    className={`chip-gauge-fill ${isPlayer ? 'player' : 'enemy'}`}
                    cx="21"
                    cy="21"
                    r={RING_RADIUS}
                    strokeDasharray={Number(RING_CIRCUMFERENCE.toFixed(2))}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 21 21)"
                  />
                </svg>
                {tokenSrc ? (
                  <img
                    src={tokenSrc}
                    alt={turn.name}
                    className="chip-avatar-img pixel-art"
                  />
                ) : (
                  <div className={`chip-avatar-fallback ${isPlayer ? 'player' : 'enemy'}`}>
                    {turn.name.charAt(0)}
                  </div>
                )}
                {turn.isCurrentActive && (
                  <span className="chip-active-badge">NOW</span>
                )}
                <span className="chip-turn-index">{index + 1}</span>
              </div>
              <span className="chip-name">{turn.name}</span>
            </div>
          );
        })}
      </div>

      {/* Compact Shared Party XP Pool Badge */}
      {state.partyXpPool && (
        <div
          className="ribbon-party-xp"
          data-testid="ribbon-party-xp"
          title={`Squad Combat XP Pool: ${state.partyXpPool.fighter} Force, ${state.partyXpPool.rogue} Finesse, ${state.partyXpPool.mage} Focus`}
        >
          <span className="party-xp-icon" aria-label="Party XP Pool">⚡</span>
          <span className="party-xp-tag">XP:</span>
          <span className="xp-pill xp-frc" data-testid="ribbon-xp-frc">{state.partyXpPool.fighter}</span>
          <span className="xp-pill xp-fin" data-testid="ribbon-xp-fin">{state.partyXpPool.rogue}</span>
          <span className="xp-pill xp-foc" data-testid="ribbon-xp-foc">{state.partyXpPool.mage}</span>
        </div>
      )}
    </div>
  );
}

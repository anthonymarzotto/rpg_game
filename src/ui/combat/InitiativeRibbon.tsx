import { useMemo } from 'react';
import { CombatState } from '../../core/combat/types';
import { predictTurnOrder } from '../../core/combat/turnClock';
import { resolveTokenAssetPath } from './tokenAssets';
import './InitiativeRibbon.css';

export interface InitiativeRibbonProps {
  readonly state: CombatState;
  readonly highlightedUnitId?: string | null;
  readonly onHoverUnit?: (unitId: string | null) => void;
}

export function InitiativeRibbon({
  state,
  highlightedUnitId,
  onHoverUnit
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
          const level = unit?.progression?.currentLevel ?? 0;
          const classId = unit?.loadout?.activeClassId ?? 'novice';
          const className = classId.charAt(0).toUpperCase() + classId.slice(1);
          const maxHp = unit?.effectiveVitals.maxHp ?? cu?.currentHp ?? 0;
          const tooltip = cu
            ? `${turn.name} • Level ${level} ${className} • HP: ${cu.currentHp}/${maxHp}`
            : turn.name;

          return (
            <div
              key={`${turn.unitId}-${index}`}
              className={`initiative-chip ${
                turn.isCurrentActive ? 'chip-active' : ''
              } ${isPlayer ? 'chip-player' : 'chip-enemy'} ${
                isHighlighted ? 'chip-highlighted' : ''
              }`}
              onMouseEnter={() => onHoverUnit?.(turn.unitId)}
              onMouseLeave={() => onHoverUnit?.(null)}
              data-testid={`initiative-chip-${turn.unitId}-${index}`}
              title={tooltip}
            >
              <div className="chip-avatar-wrap">
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

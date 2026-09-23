import { useMemo } from 'react';
import { CombatState } from '../../core/combat/types';
import { predictTurnOrder } from '../../core/combat/turnClock';
import { TokenAesthetic, resolveTokenAssetPath } from './tokenAssets';
import './InitiativeRibbon.css';

export interface InitiativeRibbonProps {
  readonly state: CombatState;
  readonly tokenAesthetic?: TokenAesthetic;
}

export function InitiativeRibbon({
  state,
  tokenAesthetic = 'stained-glass'
}: InitiativeRibbonProps) {
  const projectedTurns = useMemo(() => {
    return predictTurnOrder(state, 8);
  }, [state]);

  if (projectedTurns.length === 0) {
    return null;
  }

  return (
    <div className="initiative-ribbon-container">
      <div className="initiative-label-box">
        <span className="initiative-icon">⏳</span>
        <span className="initiative-text">CTB QUEUE</span>
      </div>

      <div className="initiative-track">
        {projectedTurns.map((turn, index) => {
          const cu = state.units.get(turn.unitId);
          const unit = cu?.unit;
          const tokenSrc = unit ? resolveTokenAssetPath(unit, tokenAesthetic) : null;
          const isPlayer = turn.faction === 'PLAYER';

          return (
            <div
              key={`${turn.unitId}-${index}`}
              className={`initiative-chip ${
                turn.isCurrentActive ? 'chip-active' : ''
              } ${isPlayer ? 'chip-player' : 'chip-enemy'}`}
              title={`${turn.name} • ${turn.faction} (CTB: ${Math.round(turn.projectedGauge)})`}
            >
              <div className="chip-avatar-wrap">
                {tokenSrc ? (
                  <img
                    src={tokenSrc}
                    alt={turn.name}
                    className="chip-avatar-img"
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
              <span className="chip-name">{turn.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

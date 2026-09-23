import { Ability } from '../../core/types/ability';
import { CombatUnit } from '../../core/combat/types';
import { ActionMode } from './useCombatSimulation';

export interface ActionBarProps {
  readonly activeCu: CombatUnit | undefined;
  readonly actionMode: ActionMode;
  readonly selectedAbility: Ability | null;
  readonly onSelectAction: (action: Ability | 'MOVE' | null) => void;
  readonly onEndTurn: () => void;
}

export function ActionBar({
  activeCu,
  actionMode,
  selectedAbility,
  onSelectAction,
  onEndTurn
}: ActionBarProps) {
  if (!activeCu) return null;

  const currentAp = activeCu.currentAp;
  const abilities = activeCu.abilities;
  const wildcardIds = new Set(activeCu.unit.loadout?.wildcardAbilityIds ?? []);

  const coreAbilities = abilities.filter((a) => !wildcardIds.has(a.id));
  const wildcardAbilities = abilities.filter((a) => wildcardIds.has(a.id));

  const renderAbilityButton = (ability: Ability, isWildcard = false) => {
    const isSelected =
      actionMode === 'ABILITY' && selectedAbility?.id === ability.id;
    const hasAp = currentAp >= ability.apCost;
    const archetypeClass =
      ability.archetypeTag === 'FIGHTER'
        ? 'fighter-action'
        : ability.archetypeTag === 'ROGUE'
        ? 'rogue-action'
        : 'mage-action';

    const icon =
      ability.archetypeTag === 'FIGHTER'
        ? '⚔️'
        : ability.archetypeTag === 'ROGUE'
        ? '🗡️'
        : '🔮';

    return (
      <div key={ability.id} className="ability-btn-wrapper">
        <button
          className={`btn-action ability-btn ${archetypeClass} ${isWildcard ? 'wildcard-ability-btn' : ''} ${isSelected ? 'active' : ''}`}
          disabled={!hasAp}
          onClick={() => onSelectAction(isSelected ? null : ability)}
        >
          {isWildcard && <span className="wildcard-ribbon">Wildcard</span>}
          <span className="action-icon">{icon}</span>
          <div className="action-text-block">
            <span className="action-name">{ability.name}</span>
            <span className="action-cost">{ability.apCost} AP</span>
          </div>
        </button>

        {/* Hover Ability Tooltip */}
        <div className="ability-hover-tooltip">
          <div className="tooltip-title-row">
            <span className="tooltip-name">{ability.name}</span>
            <span className="tooltip-tag">
              {isWildcard ? 'Wildcard • ' : ''}
              {ability.archetypeTag ?? 'Universal'}
            </span>
          </div>
          <div className="tooltip-desc">{ability.description}</div>
          <div className="tooltip-stats-grid">
            <span>Range: <b>{ability.range} hex</b></span>
            <span>Target: <b>{ability.targetType}</b></span>
            <span>Defense: <b>{ability.defenseTarget}</b></span>
            {ability.attackModifierAttribute && (
              <span>Hit Roll: <b>+{ability.attackModifierAttribute}</b></span>
            )}
            {ability.damageProfile && (
              <span>
                Dice: <b>{ability.damageProfile.count}d{ability.damageProfile.sides} + {ability.damageProfile.modifierAttribute}</b>
              </span>
            )}
            {ability.effect && (
              <span style={{ gridColumn: 'span 2', color: '#f59e0b' }}>
                Effect: <b>{ability.effect.type}</b> (Mag: {ability.effect.magnitude})
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="combat-action-bar-container">
      {/* AP Counter Indicator */}
      <div className="ap-counter-pill" title={`Action Points: ${currentAp} / 3`}>
        <span className="ap-label">AP</span>
        <div className="ap-dots">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`ap-dot ${i < currentAp ? 'filled' : 'spent'}`}
            />
          ))}
        </div>
      </div>

      {/* Active Passives Tray */}
      {activeCu.passives && activeCu.passives.length > 0 && (
        <div className="passives-tray">
          {activeCu.passives.map((passive) => {
            const isMomentum = passive.id === 'momentum';
            const isMomentumReady = isMomentum && (activeCu.hexesMovedThisTurn ?? 0) >= 2;
            const icon =
              passive.id === 'momentum'
                ? '⚡'
                : passive.id === 'unyielding'
                ? '🛡️'
                : passive.id === 'quickstep'
                ? '👟'
                : passive.id === 'arcane_aegis'
                ? '🔮'
                : '✦';

            return (
              <div
                key={passive.id}
                className={`passive-chip ${isMomentumReady ? 'ready glow' : ''}`}
              >
                <span className="passive-icon">{icon}</span>
                <span className="passive-name">{passive.name}</span>
                {isMomentum && (
                  <span className={`passive-counter ${isMomentumReady ? 'counter-ready' : ''}`}>
                    {Math.min(activeCu.hexesMovedThisTurn ?? 0, 2)}/2
                  </span>
                )}

                {/* Hover Tooltip */}
                <div className="passive-hover-tooltip">
                  <div className="tooltip-title-row">
                    <span className="tooltip-name">{passive.name}</span>
                    {isMomentumReady && <span className="tooltip-tag ready-tag">ADVANTAGE READY</span>}
                  </div>
                  <div className="tooltip-desc">{passive.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons Group */}
      <div className="action-buttons-group">
        {/* Universal Move Action */}
        <button
          className={`btn-action move-btn ${actionMode === 'MOVE' ? 'active' : ''}`}
          disabled={currentAp < 1}
          onClick={() => onSelectAction(actionMode === 'MOVE' ? null : 'MOVE')}
          title="Move up to your Move distance (costs 1 AP)"
        >
          <span className="action-icon">🏃</span>
          <div className="action-text-block">
            <span className="action-name">Move</span>
            <span className="action-cost">1 AP</span>
          </div>
        </button>

        {/* Core Class Abilities */}
        {coreAbilities.map((ability) => renderAbilityButton(ability, false))}

        {/* Wildcard Abilities Divider & Deck */}
        {wildcardAbilities.length > 0 && (
          <>
            <div className="action-deck-divider" title="Wildcard Deck" />
            {wildcardAbilities.map((ability) => renderAbilityButton(ability, true))}
          </>
        )}

        {/* End Turn / Wait Action */}
        <button className="btn-action end-turn-btn" onClick={onEndTurn}>
          <span className="action-icon">⏳</span>
          <div className="action-text-block">
            <span className="action-name">End Turn</span>
            <span className="action-cost">+{currentAp * 20} CTB</span>
          </div>
        </button>
      </div>
    </div>
  );
}

import { Ability } from '../../core/types/ability';
import { CombatState, CombatUnit } from '../../core/combat/types';
import { ActionMode } from './useCombatSimulation';
import { getEffectiveAbility, resolvePropertyTier } from '../../core/combat/modifiers';
import { getAbilityCastLockoutReason } from '../../core/combat/validator';
import { getPassiveIcon, getPassiveChipState, PassiveTooltipContent } from './UnitStatusCard';
import { AbilityHoverTooltipBody } from '../common/AbilityDescriptionBlock';

export interface ActionBarProps {
  readonly state?: CombatState;
  readonly activeCu: CombatUnit | undefined;
  readonly actionMode: ActionMode;
  readonly selectedAbility: Ability | null;
  readonly onSelectAction: (action: Ability | 'MOVE' | null) => void;
  readonly onEndTurn: () => void;
}

export function ActionBar({
  state,
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
    const effectiveAbility = getEffectiveAbility(ability, activeCu.abilityModifiers);
    const isModified = effectiveAbility.attributions.length > 0;
    const isApDiscounted = effectiveAbility.apCost < ability.apCost;
    const isSelected =
      actionMode === 'ABILITY' && selectedAbility?.id === ability.id;
    const disabledReason = getAbilityCastLockoutReason(state, activeCu, ability);
    const isDisabled = Boolean(disabledReason);
    const archetypeClass =
      effectiveAbility.archetypeTag === 'FIGHTER'
        ? 'fighter-action'
        : effectiveAbility.archetypeTag === 'ROGUE'
        ? 'rogue-action'
        : 'mage-action';

    const icon =
      effectiveAbility.archetypeTag === 'FIGHTER'
        ? '⚔️'
        : effectiveAbility.archetypeTag === 'ROGUE'
        ? '🗡️'
        : '🔮';

    const apTier = resolvePropertyTier(effectiveAbility.attributions, 'apCost');
    const hpTier = resolvePropertyTier(effectiveAbility.attributions, 'hpCost');
    const apTierClass = apTier === 'TRIAL' ? 'cost-tier-trial' : apTier === 'SHARD' ? 'cost-tier-shard' : '';
    const hpTierClass = hpTier === 'TRIAL' ? 'cost-tier-trial' : hpTier === 'SHARD' ? 'cost-tier-shard' : '';

    return (
      <div key={ability.id} className="ability-btn-wrapper">
        <button
          className={`btn-action ability-btn ${archetypeClass} ${isWildcard ? 'wildcard-ability-btn' : ''} ${isSelected ? 'active' : ''} ${isModified ? 'augmented' : ''}`}
          disabled={isDisabled}
          onClick={() => onSelectAction(isSelected ? null : ability)}
        >
          {isWildcard && <span className="wildcard-ribbon">Resonant</span>}
          {isModified && (
            <span className="augment-indicator" title="Active Augment" data-testid="augment-indicator">
              ✦
            </span>
          )}
          <span className="action-icon">{icon}</span>
          <div className="action-text-block">
            <span className="action-name">{effectiveAbility.name}</span>
            <span className={`action-cost ${isApDiscounted ? 'cost-discounted' : ''} ${apTierClass}`.trim()}>
              {effectiveAbility.apCost} AP
              {effectiveAbility.hpCost && effectiveAbility.hpCost > 0 ? (
                <span className={`action-cost-hp ${activeCu.currentHp <= effectiveAbility.hpCost ? 'cost-lethal' : hpTierClass}`.trim()}>
                  {' '}+ {effectiveAbility.hpCost} HP{activeCu.currentHp <= effectiveAbility.hpCost ? ' ⚠️' : ''}
                </span>
              ) : null}
            </span>
          </div>
        </button>

        {/* Hover Ability Tooltip */}
        <div className="ability-hover-tooltip">
          <AbilityHoverTooltipBody
            ability={effectiveAbility}
            isWildcard={isWildcard}
            currentHp={activeCu.currentHp}
            disabledReason={disabledReason}
          />
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
            const { isReady, compactCounter, readyTag } = getPassiveChipState(activeCu, passive);
            const icon = getPassiveIcon(passive.id);

            return (
              <div
                key={passive.id}
                className={`passive-chip ${isReady ? 'ready glow' : ''}`}
                data-testid={`action-bar-passive-${passive.id}`}
              >
                <span className="passive-icon">{icon}</span>
                <span className="passive-name">{passive.name}</span>
                {compactCounter && (
                  <span className={`passive-counter ${isReady ? 'counter-ready' : ''}`}>
                    {compactCounter}
                  </span>
                )}

                {/* Hover Tooltip */}
                <PassiveTooltipContent passive={passive} isReady={isReady} readyTag={readyTag} />
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
          title="Traverse the astral grid (costs 1 AP)"
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
            <div className="action-deck-divider" title="Resonant Deck" />
            {wildcardAbilities.map((ability) => renderAbilityButton(ability, true))}
          </>
        )}

        {/* End Turn / Wait Action */}
        <button className="btn-action end-turn-btn" onClick={onEndTurn}>
          <span className="action-icon">⏳</span>
          <div className="action-text-block">
            <span className="action-name">End Turn</span>
            <span className="action-cost">+{currentAp * 20} Initiative</span>
          </div>
        </button>
      </div>
    </div>
  );
}

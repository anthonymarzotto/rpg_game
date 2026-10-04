import { Ability } from '../../core/types/ability';
import { CombatUnit } from '../../core/combat/types';
import { ActionMode } from './useCombatSimulation';
import { getEffectiveAbility } from '../../core/combat/modifiers';

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
    const effectiveAbility = getEffectiveAbility(ability, activeCu.abilityModifiers);
    const isModified = effectiveAbility.attributions.length > 0;
    const isApDiscounted = effectiveAbility.apCost < ability.apCost;
    const isSelected =
      actionMode === 'ABILITY' && selectedAbility?.id === ability.id;
    const hasAp = currentAp >= effectiveAbility.apCost;
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

    const renderBadges = (predicate: (a: (typeof effectiveAbility.attributions)[number]) => boolean) =>
      effectiveAbility.attributions
        .filter(predicate)
        .map((a, i) => (
          <span key={i} className="inline-attribution-badge">
            [✦ {a.changeLabel} from {a.sourceName}]
          </span>
        ));
    const renderPropBadges = (prop: string) => renderBadges((a) => a.property === prop);

    const hasAoe = (effectiveAbility.aoeRadius ?? 0) > 0 || effectiveAbility.attributions.some((a) => a.property === 'aoeRadius');
    const hasApDiscount = effectiveAbility.attributions.some((a) => a.property === 'apCost');

    return (
      <div key={ability.id} className="ability-btn-wrapper">
        <button
          className={`btn-action ability-btn ${archetypeClass} ${isWildcard ? 'wildcard-ability-btn' : ''} ${isSelected ? 'active' : ''} ${isModified ? 'augmented' : ''}`}
          disabled={!hasAp}
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
            <span className={`action-cost ${isApDiscounted ? 'cost-discounted' : ''}`}>
              {effectiveAbility.apCost} AP
            </span>
          </div>
        </button>

        {/* Hover Ability Tooltip */}
        <div className="ability-hover-tooltip">
          <div className="tooltip-title-row">
            <span className="tooltip-name">
              {effectiveAbility.name}
              {isModified && <span className="tooltip-augment-glyph"> ✦</span>}
            </span>
            <span className="tooltip-tag">
              {isWildcard ? 'Resonant • ' : ''}
              {effectiveAbility.archetypeTag ?? 'Universal'}
            </span>
          </div>
          <div className="tooltip-desc">{effectiveAbility.description}</div>
          <div className="tooltip-stats-grid">
            <span>
              Range: <b>{effectiveAbility.range} hex</b>
              {renderPropBadges('range')}
            </span>
            {hasAoe && (
              <span>
                AOE: <b>{effectiveAbility.aoeRadius ?? 0} hex</b>
                {renderPropBadges('aoeRadius')}
              </span>
            )}
            <span>
              Target: <b>{effectiveAbility.targetType}</b>
              {renderPropBadges('targetType')}
            </span>
            <span>
              Defense: <b>{effectiveAbility.defenseTarget}</b>
              {renderPropBadges('defenseTarget')}
            </span>
            {effectiveAbility.attackModifierAttribute && (
              <span>
                Hit Roll: <b>+{effectiveAbility.attackModifierAttribute}</b>
                {renderPropBadges('attackModifierAttribute')}
              </span>
            )}
            {hasApDiscount && (
              <span>
                Cost: <b>{effectiveAbility.apCost} AP</b>
                {renderPropBadges('apCost')}
              </span>
            )}
            {effectiveAbility.effects.map((eff, idx) => {
              if (eff.type === 'DAMAGE') {
                const dp = eff.damageProfile;
                const flat = eff.flatDamage ? ` + ${eff.flatDamage}` : '';
                const modAttr = dp?.modifierAttribute ? ` + ${dp.modifierAttribute}` : '';
                return (
                  <span key={idx} className="tooltip-damage-span">
                    Dice: <b>{dp ? `${dp.count}d${dp.sides}${modAttr}${flat}` : `${eff.flatDamage ?? 0}`}</b>
                    {renderBadges(
                      (a) =>
                        a.property === 'effects' ||
                        a.property === 'damageProfile' ||
                        a.property.startsWith(`effects[${idx}]`)
                    )}
                  </span>
                );
              }
              return (
                <span key={idx} className="tooltip-effect-span text-gold">
                  Effect: <b>{eff.type}</b>
                  {eff.magnitude !== undefined && ` (Mag: ${eff.magnitude})`}
                  {eff.conditionType && ` (${eff.conditionType})`}
                  {eff.condition && ` (${eff.condition})`}
                  {renderBadges((a) => a.property === 'effects' || a.property.startsWith(`effects[${idx}]`))}
                </span>
              );
            })}
          </div>

          {/* Active Augments Summary Footer */}
          {effectiveAbility.attributions.length > 0 && (
            <div className="tooltip-augments-footer">
              <div className="tooltip-augments-title">✦ Active Augments</div>
              <div className="tooltip-augments-list">
                {effectiveAbility.attributions.map((attr, idx) => (
                  <div key={idx} className="tooltip-augment-row">
                    <span className="augment-source">{attr.sourceName}</span>
                    <span className="augment-label">{attr.changeLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

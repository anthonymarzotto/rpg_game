import { Fragment } from 'react';
import { Ability } from '../../core/types/ability';
import { EffectiveAbility, ModifierProvenanceTier, PropertyAttribution } from '../../core/types/modifier';
import { formatAbilityDescription } from '../../core/combat/abilityFormatter';
import { resolvePropertyTier } from '../../core/combat/modifiers';
import { formatDisciplineName } from '../combat/combatXpUtils';
import './AbilityDescriptionBlock.css';

export function getTierClass(tier: ModifierProvenanceTier): string {
  if (tier === 'TRIAL') return 'tier-trial';
  if (tier === 'SHARD') return 'tier-shard';
  return 'tier-normal';
}

export interface AbilityHybridBodyProps {
  readonly ability: Ability | EffectiveAbility;
  readonly showFlavor?: boolean;
  readonly className?: string;
}

export function AbilityHybridBody({
  ability,
  showFlavor = true,
  className = ''
}: AbilityHybridBodyProps) {
  const formatted = formatAbilityDescription(ability);

  return (
    <div className={`ability-hybrid-body ${className}`.trim()}>
      {showFlavor && formatted.flavorText && (
        <p className="ability-hybrid-flavor">{formatted.flavorText}</p>
      )}
      {formatted.statPills.length > 0 && (
        <div className="ability-stat-strip">
          {formatted.statPills.map((pill) => (
            <span
              key={pill.id}
              className={`ability-stat-pill ${getTierClass(pill.tier)}`}
              data-tier={pill.tier}
            >
              {pill.label}
            </span>
          ))}
        </div>
      )}
      {formatted.effectClauses.length > 0 && (
        <ul className="ability-effect-clauses">
          {formatted.effectClauses.map((clause, idx) => (
            <li
              key={idx}
              className={`ability-effect-clause ${getTierClass(clause.tier)}`}
              data-tier={clause.tier}
            >
              {clause.triggerLabel && (
                <strong className="effect-trigger-label">{clause.triggerLabel}:</strong>
              )}
              <span>{clause.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface AbilityCompactSummaryProps {
  readonly ability: Ability | EffectiveAbility;
  readonly className?: string;
}

export function AbilityCompactSummary({
  ability,
  className = ''
}: AbilityCompactSummaryProps) {
  const formatted = formatAbilityDescription(ability);

  return (
    <div className={`ability-compact-summary ${className}`.trim()}>
      {formatted.compactSegments.map((seg, idx) => (
        <Fragment key={idx}>
          {idx > 0 && <span className="compact-sep">•</span>}
          <span className={`compact-seg ${getTierClass(seg.tier)}`} data-tier={seg.tier}>
            {seg.text}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export interface AbilityHoverTooltipBodyProps {
  readonly ability: EffectiveAbility;
  readonly isWildcard?: boolean;
  readonly currentHp?: number;
}

export function AbilityHoverTooltipBody({
  ability,
  isWildcard = false,
  currentHp
}: AbilityHoverTooltipBodyProps) {
  const attributions: readonly PropertyAttribution[] = ability.attributions ?? [];
  const isModified = attributions.length > 0;
  const apTier = resolvePropertyTier(attributions, 'apCost');
  const hpTier = resolvePropertyTier(attributions, 'hpCost');
  const isLethalHp = currentHp !== undefined && ability.hpCost !== undefined && currentHp <= ability.hpCost;

  return (
    <>
      <div className="tooltip-title-row">
        <span className="tooltip-name">
          {ability.name}
          {isModified && <span className="tooltip-augment-glyph"> ✦</span>}
        </span>
        <span className="tooltip-tag">
          {isWildcard ? 'Resonant • ' : ''}
          {formatDisciplineName(ability.archetypeTag)}
          {' • '}
          <span className={apTier === 'TRIAL' ? 'cost-tier-trial' : apTier === 'SHARD' ? 'cost-tier-shard' : ''}>
            {ability.apCost} AP
          </span>
          {ability.hpCost && ability.hpCost > 0 ? (
            <span
              className={
                isLethalHp
                  ? 'cost-lethal'
                  : hpTier === 'TRIAL'
                  ? 'cost-tier-trial'
                  : hpTier === 'SHARD'
                  ? 'cost-tier-shard'
                  : ''
              }
            >
              {' + '}
              {ability.hpCost} HP{isLethalHp ? ' ⚠️' : ''}
            </span>
          ) : null}
        </span>
      </div>

      <AbilityHybridBody ability={ability} showFlavor={true} />

      {attributions.length > 0 && (
        <div className="tooltip-augments-footer">
          <div className="tooltip-augments-title">✦ Active Augments</div>
          <div className="tooltip-augments-list">
            {attributions.map((attr, idx) => {
              const tier = attr.tier ?? 'TRIAL';
              return (
                <div key={idx} className={`tooltip-augment-row ${getTierClass(tier)}`}>
                  <span className="augment-source">{attr.sourceName}</span>
                  <span className="augment-label">{attr.changeLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

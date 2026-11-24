import {
  Ability,
  AbilityEffect,
  AbilityEffectType,
  DiceProfile
} from '../types/ability';
import {
  EffectiveAbility,
  ModifierProvenanceTier,
  PropertyAttribution
} from '../types/modifier';
import { TriadAttributes } from '../types/stats';
import { maxProvenanceTier, resolvePropertyTier } from './modifiers';

export interface FormattedAbilityPill {
  readonly id: 'reach' | 'area' | 'contest' | 'damage' | 'splashDamage' | 'cost';
  readonly label: string;
  readonly tier: ModifierProvenanceTier;
}

export interface FormattedEffectClause {
  readonly triggerLabel?: string;
  readonly text: string;
  readonly tier: ModifierProvenanceTier;
  readonly sourceName?: string;
}

export interface CompactSummarySegment {
  readonly text: string;
  readonly tier: ModifierProvenanceTier;
}

export interface FormattedAbilityDescription {
  readonly flavorText: string;
  readonly statPills: readonly FormattedAbilityPill[];
  readonly effectClauses: readonly FormattedEffectClause[];
  readonly compactSummary: string;
  readonly compactSegments: readonly CompactSummarySegment[];
  readonly highestTier: ModifierProvenanceTier;
}

const ATTR_ABBR: Record<keyof TriadAttributes, string> = {
  force: 'FRC',
  finesse: 'FIN',
  focus: 'FOC'
};

const STAT_LABELS: Record<string, string> = {
  armor: 'Armor',
  ward: 'Ward',
  speed: 'Speed',
  move: 'Move',
  evasion: 'Evasion',
  resolve: 'Resolve',
  attackRoll: 'Attack Roll',
  displacementImmunity: 'Displacement Immunity'
};

const DEFENSE_LABELS: Record<string, string> = {
  EVASION: 'EVA',
  RESOLVE: 'RES',
  LOWER_DEFENSE: 'Lower (EVA/RES)',
  NONE: ''
};

function formatDiceProfile(
  dp: DiceProfile,
  flatDamage?: number
): string {
  const attr = dp.modifierAttribute ? ` + ${ATTR_ABBR[dp.modifierAttribute]}` : '';
  const flat = flatDamage && flatDamage !== 0
    ? (flatDamage > 0 ? ` + ${flatDamage}` : ` - ${Math.abs(flatDamage)}`)
    : '';
  return `${dp.count}d${dp.sides}${attr}${flat}`;
}

function getEffectTriggerLabel(
  effect: AbilityEffect,
  ability: Ability
): string | undefined {
  if (effect.condition === 'FLANK_OR_REAR') return 'Flank/Rear';
  if (effect.condition === 'TARGET_CHALLENGED') return 'Vs Challenged';

  const applyOn = effect.applyOn ?? (
    effect.type === 'DAMAGE' ? 'HIT_OR_CRIT' :
    effect.targetScope === 'SELF' ? 'ALWAYS' :
    ability.targetType === 'SELF' || ability.targetType === 'ALLY' || ability.defenseTarget === 'NONE'
      ? 'ALWAYS'
      : 'HIT_OR_CRIT'
  );

  if (applyOn === 'CRIT_ONLY') return 'On Crit';
  if (applyOn === 'HIT_ONLY') return 'On Hit';
  if (applyOn === 'GRAZE_ONLY') return 'On Graze';
  if (applyOn === 'HIT_OR_CRIT' && ability.defenseTarget !== 'NONE') return 'On Hit';
  return undefined;
}

function getScopeTargetPhrase(effect: AbilityEffect, ability: Ability): string {
  if (effect.targetScope === 'SELF') return 'self';
  if (effect.targetScope === 'ALLIES') return 'allies';
  if (ability.targetType === 'ALLY') return 'target ally';
  if (ability.targetType === 'SELF') {
    return (ability.aoeRadius ?? 0) > 0 ? 'self and allies' : 'self';
  }
  return 'target';
}

function formatTurns(turns: number | undefined): string {
  const dur = turns ?? 1;
  return `${dur} turn${dur === 1 ? '' : 's'}`;
}

function formatStatModifierList(
  statModifiers: NonNullable<AbilityEffect['statModifiers']>,
  hasBastionStance: boolean
): string[] {
  const parts: string[] = [];
  for (const [stat, val] of Object.entries(statModifiers)) {
    if (typeof val !== 'number' || val === 0) continue;
    if (stat === 'move' && val <= -90 && hasBastionStance) {
      // Bastion Stance clause already states Move is locked to 0
      continue;
    }
    if (stat === 'displacementImmunity') {
      parts.push('Displacement Immunity');
      continue;
    }
    const label = STAT_LABELS[stat] ?? stat;
    const sign = val > 0 ? `+${val}` : `${val}`;
    parts.push(`${sign} ${label}`);
  }
  return parts;
}

/**
 * Formats a single AbilityEffect into a human-readable clause.
 * Returns null if the effect is the primary damage effect already shown in the Stat Strip
 * or a redundant sub-effect (e.g. move lock when paired with BASTION_STANCE).
 */
export function formatAbilityEffectClause(
  effect: AbilityEffect,
  ability: Ability,
  attributions?: readonly PropertyAttribution[]
): FormattedEffectClause | null {
  const hasBastionStance = (ability.effects ?? []).some((e) => e.type === 'BASTION_STANCE');
  const triggerLabel = getEffectTriggerLabel(effect, ability);
  const scopePhrase = getScopeTargetPhrase(effect, ability);
  const tier: ModifierProvenanceTier = effect.sourceTier ?? 'NORMAL';
  const sourceName = effect.sourceName;

  const buildClause = (text: string, customTrigger?: string | undefined, overrideTier?: ModifierProvenanceTier): FormattedEffectClause => ({
    ...(customTrigger !== undefined ? { triggerLabel: customTrigger } : {}),
    text,
    tier: overrideTier ?? tier,
    ...(sourceName ? { sourceName } : {})
  });

  const type: AbilityEffectType = effect.type;
  switch (type) {
    case 'DAMAGE': {
      // Primary damage (without tactical condition) is represented by the Stat Strip pill
      if (!effect.condition) {
        return null;
      }
      const parts: string[] = [];
      if (effect.attackRollBonus) {
        parts.push(`+${effect.attackRollBonus} Attack Roll`);
      }
      if (effect.attackRollPenalty) {
        parts.push(`-${effect.attackRollPenalty} Attack Roll`);
      }
      if (effect.bonusDamage) {
        parts.push(`+${formatDiceProfile(effect.bonusDamage)} bonus damage`);
      } else if (effect.damageProfile) {
        parts.push(`${formatDiceProfile(effect.damageProfile, effect.flatDamage)} damage`);
      }
      if (effect.grantsAdvantage) {
        parts.push('grants Advantage');
      }
      if (effect.grantsDisadvantage) {
        parts.push('imposes Disadvantage');
      }
      if (parts.length === 0) return null;
      const dmgTier = maxProvenanceTier(tier, resolvePropertyTier(attributions, 'damageProfile'));
      return buildClause(parts.join(' and '), triggerLabel, dmgTier);
    }

    case 'KNOCKBACK': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Pushes target ${mag} hex${mag === 1 ? '' : 'es'}`, triggerLabel);
    }

    case 'PULL': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Pulls target ${mag} hex${mag === 1 ? '' : 'es'} toward caster`, triggerLabel);
    }

    case 'RETREAT_STEP': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Steps back ${mag} hex${mag === 1 ? '' : 'es'} freely`, triggerLabel);
    }

    case 'PENETRATE_STEP':
      return buildClause('Advances through target to the rear hex if open', triggerLabel);

    case 'RUSH_CHARGE': {
      const maxDist = Math.max(ability.range, effect.magnitude ?? ability.range);
      return buildClause(`Rushes in a straight line (2–${maxDist} hexes) into melee contact`, undefined);
    }

    case 'AERIAL_VAULT':
      return buildClause(
        `Leaps over obstacles and units (2–${ability.range} hexes) to land in target's rear arc`,
        undefined
      );

    case 'TELEPORT':
      return buildClause(
        `Teleports to an unoccupied hex within ${ability.range} hexes${ability.sameElevationOnly ? ' at the same elevation' : ''}`,
        undefined
      );

    case 'POSITION_SWAP':
      return buildClause(`Swaps hex positions with ${scopePhrase}`, triggerLabel);

    case 'CLEAVE': {
      const mag = effect.magnitude ?? 1;
      return buildClause(
        `Sweeps ${mag} adjacent frontal ${mag === 1 ? 'foe' : 'foes'} for collateral damage`,
        triggerLabel
      );
    }

    case 'LINE_PIERCE':
      return buildClause(
        'Impales aligned enemy directly behind target for 1d4 + FRC physical damage',
        triggerLabel
      );

    case 'CTB_DELAY': {
      const mag = effect.magnitude ?? 15;
      return buildClause(`Delays target CTB initiative by ${mag} ticks`, triggerLabel);
    }

    case 'INITIATIVE_BOOST': {
      const mag = effect.magnitude ?? 10;
      const targetText = effect.targetScope === 'SELF' ? 'self' : scopePhrase;
      return buildClause(`Boosts ${targetText} CTB initiative by +${mag} ticks`, triggerLabel);
    }

    case 'FORCE_FACING':
      return buildClause('Forces target to face caster', triggerLabel);

    case 'FORCE_FACING_AWAY':
      return buildClause('Forces target to face 180° away', triggerLabel);

    case 'CONDITION': {
      const cond = effect.conditionType;
      const dur = formatTurns(effect.durationTurns);
      if (cond === 'POISON') {
        const dmg = effect.magnitude ?? 2;
        return buildClause(`Inflicts Poison (${dmg} dmg/turn, ${dur})`, triggerLabel);
      }
      if (cond === 'BURN') {
        const dmg = effect.magnitude ?? 2;
        return buildClause(`Inflicts Burn (${dmg} dmg/turn, ${dur})`, triggerLabel);
      }
      if (cond === 'CHALLENGED') {
        return buildClause(`Inflicts Challenged (${dur})`, triggerLabel);
      }
      if (cond === 'STEALTH') {
        const verb = effect.targetScope === 'SELF' || ability.targetType === 'SELF' ? 'Grants Stealth to self' : `Grants Stealth to ${scopePhrase}`;
        return buildClause(`${verb} (${dur})`, triggerLabel);
      }
      if (cond === 'EXPOSED') {
        return buildClause(`Inflicts Exposed (${dur})`, triggerLabel);
      }
      if (cond === 'CHARMED') {
        return buildClause(`Inflicts Charmed (switches target to your faction, ${dur})`, triggerLabel);
      }
      if (cond === 'BLINDED') {
        return buildClause(`Inflicts Blinded (outgoing Disadvantage and max Range 1, ${dur})`, triggerLabel);
      }
      if (cond === 'TELEMETRY') {
        return buildClause(`Marks with Quadrant Telemetry (+2 allied ranged/spell Range, ignores elevation & cover, ${dur})`, triggerLabel);
      }
      if (cond === 'HENOSIS') {
        return buildClause(
          `Bestows Henosis (+2 Attack Roll, +2 Armor, +2 Ward, +1 Move, +1 Speed, ${dur}; max 1 active vessel, followed by 1 turn of Mortal Ebb)`,
          triggerLabel
        );
      }
      if (cond === 'MORTAL_EBB') {
        return buildClause(
          `Inflicts Mortal Ebb (-1 Attack Roll, -1 Armor, -1 Ward, -1 Move, -1 Speed, ${dur})`,
          triggerLabel
        );
      }
      return buildClause(`Applies ${cond ?? 'Condition'} (${dur})`, triggerLabel);
    }

    case 'CLEANSE':
      return buildClause(
        `Purges all active negative status conditions from ${scopePhrase}`,
        triggerLabel
      );

    case 'ARMOR_BUFF': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Grants +${mag} Armor to ${scopePhrase} (${formatTurns(effect.durationTurns)})`, triggerLabel);
    }

    case 'WARD_BUFF': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Grants +${mag} Ward to ${scopePhrase} (${formatTurns(effect.durationTurns)})`, triggerLabel);
    }

    case 'SLOW': {
      const mag = effect.magnitude ?? 1;
      return buildClause(`Inflicts -${mag} Move (${formatTurns(effect.durationTurns)})`, triggerLabel);
    }

    case 'STAT_MODIFIER': {
      if (!effect.statModifiers) return null;
      const parts = formatStatModifierList(effect.statModifiers, hasBastionStance);
      if (parts.length === 0) return null;
      const isBuff = Object.values(effect.statModifiers).every((v) => typeof v === 'number' && v >= 0);
      const verb = isBuff ? 'Grants' : 'Inflicts';
      const prep = effect.targetScope === 'SELF' || ability.targetType === 'SELF' ? 'to self' : `on ${scopePhrase}`;
      return buildClause(`${verb} ${parts.join(', ')} ${prep} (${formatTurns(effect.durationTurns)})`, triggerLabel);
    }

    case 'BASTION_STANCE':
      return buildClause(
        `Plants Phalanx Front: locks Move to 0, halts frontal enemy advance, and grants 50% rear ranged cover (${formatTurns(effect.durationTurns)})`,
        triggerLabel
      );

    case 'CRIT_BOOST':
      return buildClause('Scores critical hits on natural 19–20', undefined);

    case 'SPELL_SCULPT': {
      const mag = effect.magnitude ?? 1;
      return buildClause(
        `Primes next Focus spell this turn: +${mag} Range and +1 Blast radius`,
        undefined
      );
    }

    case 'BLOOD_FRENZY':
      return buildClause(
        'Primes next physical attack this turn: +1 Die Step and +2 Attack Roll',
        undefined
      );

    case 'WILD_SURGE':
      return buildClause(
        'Triggers spontaneous Wild Surge on crit (1d3: +1 AP, +25 CTB, or 2 magic dmg)',
        undefined
      );

    case 'DELAYED_BOMBARDMENT': {
      const dmgStr = effect.damageProfile ? formatDiceProfile(effect.damageProfile, effect.flatDamage) : '2d8 + FRC';
      return buildClause(
        `Marks blast zone; crashes down at start of next turn for ${dmgStr} physical damage vs Evasion`,
        undefined
      );
    }

    case 'SHRAPNEL_RUBBLE': {
      const extraCost = effect.magnitude ?? 2;
      const dur = formatTurns(effect.durationTurns ?? 2);
      return buildClause(
        `Strips Stealth in blast zone and creates Shrapnel Rubble rough terrain (+${extraCost} MP to enter, ${dur})`,
        undefined
      );
    }

    case 'ALLY_REFRACTION': {
      const dmgStr = effect.damageProfile
        ? formatDiceProfile(effect.damageProfile, effect.flatDamage)
        : '1d4 + FOC';
      return buildClause(
        `Spares allies in blast; each spared ally redirects a ${dmgStr} magical strike onto lowest-HP enemies in blast (spreading round-robin)`,
        undefined
      );
    }

    case 'DISTRIBUTIVE_PROOF': {
      const splashStr = effect.damageProfile ? formatDiceProfile(effect.damageProfile) : '1d4';
      const dur = formatTurns(effect.durationTurns ?? 1);
      const isoClause = effect.bonusDamage
        ? `+${formatDiceProfile(effect.bonusDamage)} bonus damage and inflicts Exposed (${dur}) on hit`
        : `inflicts Exposed (${dur}) on hit`;
      return buildClause(
        `Isolated (0 adj. allies): ${isoClause}. Clustered (1+ adj. allies): splashes ${splashStr} magical damage to adjacent units`,
        undefined
      );
    }
  }
}

function formatCompactEffectTag(effect: AbilityEffect): string | null {
  switch (effect.type) {
    case 'DAMAGE':
      if (effect.condition === 'FLANK_OR_REAR' && effect.bonusDamage) {
        return `+${formatDiceProfile(effect.bonusDamage)} Flank/Rear`;
      }
      if (effect.condition === 'TARGET_CHALLENGED' && effect.bonusDamage) {
        return `+${formatDiceProfile(effect.bonusDamage)} vs Challenged`;
      }
      return null;
    case 'KNOCKBACK':
      return `Push ${effect.magnitude ?? 1}`;
    case 'PULL':
      return `Pull ${effect.magnitude ?? 1}`;
    case 'RETREAT_STEP':
      return `Retreat ${effect.magnitude ?? 1}`;
    case 'PENETRATE_STEP':
      return 'Penetrate';
    case 'RUSH_CHARGE':
      return 'Charge';
    case 'AERIAL_VAULT':
      return 'Vault';
    case 'TELEPORT':
      return 'Teleport';
    case 'POSITION_SWAP':
      return 'Swap';
    case 'CLEAVE':
      return `Cleave ${effect.magnitude ?? 1}`;
    case 'LINE_PIERCE':
      return 'Pierce 1d4+FRC';
    case 'CTB_DELAY':
      return `-${effect.magnitude ?? 15} CTB`;
    case 'INITIATIVE_BOOST':
      return `+${effect.magnitude ?? 10} CTB`;
    case 'FORCE_FACING':
      return 'Force Face';
    case 'FORCE_FACING_AWAY':
      return 'Turn 180°';
    case 'CONDITION':
      if (effect.conditionType === 'MORTAL_EBB') {
        return `Mortal Ebb ${effect.durationTurns ?? 1}t`;
      }
      return effect.conditionType
        ? `${effect.conditionType.charAt(0)}${effect.conditionType.slice(1).toLowerCase()} ${effect.durationTurns ?? 1}t`
        : null;
    case 'CLEANSE':
      return 'Cleanse';
    case 'ARMOR_BUFF':
      return `+${effect.magnitude ?? 1} ARM ${effect.durationTurns ?? 1}t`;
    case 'WARD_BUFF':
      return `+${effect.magnitude ?? 1} WRD ${effect.durationTurns ?? 1}t`;
    case 'SLOW':
      return `-${effect.magnitude ?? 1} MOV ${effect.durationTurns ?? 1}t`;
    case 'STAT_MODIFIER': {
      if (!effect.statModifiers) return null;
      const entries = Object.entries(effect.statModifiers)
        .filter(([, v]) => typeof v === 'number' && v !== 0 && v > -90)
        .map(([k, v]) => {
          if (k === 'displacementImmunity') return 'No Push';
          const short = k === 'armor' ? 'ARM'
            : k === 'ward' ? 'WRD'
            : k === 'evasion' ? 'EVA'
            : k === 'resolve' ? 'RES'
            : k === 'speed' ? 'SPD'
            : k === 'move' ? 'MOV'
            : k === 'attackRoll' ? 'Hit'
            : k;
          return `${(v as number) > 0 ? `+${v}` : v} ${short}`;
        });
      return entries.length > 0 ? entries.join(', ') : null;
    }
    case 'BASTION_STANCE':
      return 'Phalanx ZOC';
    case 'CRIT_BOOST':
      return 'Crit 19–20';
    case 'SPELL_SCULPT':
      return '+1 Range/+1 Blast';
    case 'BLOOD_FRENZY':
      return '+1 Die/+2 Hit';
    case 'WILD_SURGE':
      return 'Wild Surge';
    case 'DELAYED_BOMBARDMENT':
      return 'Delayed Barrage';
    case 'SHRAPNEL_RUBBLE':
      return 'Reveal + Rubble';
    case 'ALLY_REFRACTION':
      return 'Ally Refract';
    case 'DISTRIBUTIVE_PROOF':
      return 'Isolated/Clustered';
  }
}

/**
 * Generates the unified Hybrid Ability Description (flavor, Stat Strip pills,
 * human-readable Effect Clauses, and Compact Mechanical 1-Liner) for any Ability or EffectiveAbility.
 */
export function formatAbilityDescription(
  ability: Ability | EffectiveAbility
): FormattedAbilityDescription {
  const attributions: readonly PropertyAttribution[] =
    'attributions' in ability && Array.isArray(ability.attributions)
      ? ability.attributions
      : [];
  const attackRollBonus: number =
    'attackRollBonus' in ability && typeof ability.attackRollBonus === 'number'
      ? ability.attackRollBonus
      : 0;

  const statPills: FormattedAbilityPill[] = [];
  const compactSegments: CompactSummarySegment[] = [];

  // 1. Reach & Area Pills
  const rangeTier = resolvePropertyTier(attributions, 'range');
  const aoeTier = resolvePropertyTier(attributions, 'aoeRadius');
  const targetTier = resolvePropertyTier(attributions, 'targetType');

  const rangeText =
    ability.minRange !== undefined && ability.minRange > 0
      ? `${ability.minRange}–${ability.range}`
      : `${ability.range}`;

  let reachLabel: string;
  if (ability.targetType === 'SELF') {
    reachLabel = 'Self';
  } else if (ability.coneTemplate) {
    reachLabel = `Cone ${ability.range}`;
  } else if (ability.targetType === 'ALLY') {
    reachLabel = `Ally • Range ${rangeText}`;
  } else if (ability.range === 1 && rangeTier === 'NORMAL' && !ability.minRange) {
    reachLabel = 'Melee 1';
  } else {
    reachLabel = `Range ${rangeText}`;
  }

  const reachPillTier = maxProvenanceTier(rangeTier, targetTier);
  statPills.push({ id: 'reach', label: reachLabel, tier: reachPillTier });
  compactSegments.push({ text: reachLabel, tier: reachPillTier });

  if ((ability.aoeRadius ?? 0) > 0) {
    const areaLabel = ability.targetType === 'SELF'
      ? `Aura ${ability.aoeRadius}`
      : `Blast ${ability.aoeRadius}`;
    statPills.push({ id: 'area', label: areaLabel, tier: aoeTier });
    compactSegments.push({ text: areaLabel, tier: aoeTier });
  }

  // 2. Primary Damage Pill
  const effectsList = ability.effects ?? [];
  const primaryDamageEffect = effectsList.find(
    (e) => (e.type === 'DAMAGE' || e.type === 'DELAYED_BOMBARDMENT') && !e.condition
  );
  const damageTier = maxProvenanceTier(
    resolvePropertyTier(attributions, 'damageProfile', 'damageType'),
    primaryDamageEffect?.sourceTier ?? 'NORMAL'
  );

  if (primaryDamageEffect && (primaryDamageEffect.damageProfile || primaryDamageEffect.flatDamage)) {
    const dmgStr = primaryDamageEffect.damageProfile
      ? formatDiceProfile(primaryDamageEffect.damageProfile, primaryDamageEffect.flatDamage)
      : `${primaryDamageEffect.flatDamage ?? 0}`;
    const dmgTypeLabel = ability.damageType === 'PHYSICAL'
      ? 'Physical'
      : ability.damageType === 'MAGICAL'
      ? 'Magical'
      : '';
    const label = dmgTypeLabel ? `${dmgStr} ${dmgTypeLabel}` : dmgStr;
    statPills.push({ id: 'damage', label, tier: damageTier });
    compactSegments.push({ text: label, tier: damageTier });
  }

  // 3. Splash Damage Pill (for AoE abilities)
  if ((ability.aoeRadius ?? 0) > 0 && ability.damageType !== 'NONE') {
    const splashProfile = ability.splashDamageProfile ?? primaryDamageEffect?.damageProfile;
    if (splashProfile) {
      const splashDice = ability.splashDamageProfile
        ? formatDiceProfile(ability.splashDamageProfile)
        : `${splashProfile.count}d${splashProfile.sides}`;
      const splashName = ability.splashLabel
        ? `${ability.splashLabel.charAt(0)}${ability.splashLabel.slice(1).toLowerCase()}`
        : 'Splash';
      const splashLabel = `${splashDice} ${splashName}`;
      statPills.push({ id: 'splashDamage', label: splashLabel, tier: aoeTier });
    }
  }

  // 4. Contest Pill (Attack Attribute vs Defense Target)
  const defenseTarget = ability.defenseTarget ?? 'NONE';
  if (defenseTarget !== 'NONE') {
    const defLabel = DEFENSE_LABELS[defenseTarget] ?? defenseTarget;
    const attrLabel = ability.attackModifierAttribute
      ? `+${ATTR_ABBR[ability.attackModifierAttribute]}`
      : '';
    const bonusStr = attackRollBonus !== 0
      ? (attackRollBonus > 0 ? ` + ${attackRollBonus}` : ` - ${Math.abs(attackRollBonus)}`)
      : '';
    const contestLabel = attrLabel
      ? `${attrLabel}${bonusStr} vs ${defLabel}`
      : `vs ${defLabel}`;
    const contestTier = resolvePropertyTier(
      attributions,
      'attackModifierAttribute',
      'defenseTarget',
      'attackRoll'
    );
    statPills.push({ id: 'contest', label: contestLabel, tier: contestTier });
    compactSegments.push({ text: contestLabel, tier: contestTier });
  }

  // 5. HP Cost Pill (when present or added via shard)
  if (ability.hpCost && ability.hpCost > 0) {
    const hpTier = resolvePropertyTier(attributions, 'hpCost');
    statPills.push({
      id: 'cost',
      label: `${ability.hpCost} HP Cost`,
      tier: hpTier
    });
  }

  // 6. Effect Clauses & Compact Effect Tags
  const effectClauses: FormattedEffectClause[] = [];
  for (const eff of effectsList) {
    const clause = formatAbilityEffectClause(eff, ability, attributions);
    if (clause) {
      effectClauses.push(clause);
    }
    const compactTag = formatCompactEffectTag(eff);
    if (compactTag) {
      const effTier: ModifierProvenanceTier = eff.sourceTier ?? 'NORMAL';
      compactSegments.push({ text: compactTag, tier: effTier });
    }
  }

  // 7. Compute Highest Tier across all attributions
  let highestTier: ModifierProvenanceTier = 'NORMAL';
  for (const pill of statPills) {
    highestTier = maxProvenanceTier(highestTier, pill.tier);
  }
  for (const clause of effectClauses) {
    highestTier = maxProvenanceTier(highestTier, clause.tier);
  }
  const apTier = resolvePropertyTier(attributions, 'apCost');
  highestTier = maxProvenanceTier(highestTier, apTier);

  return {
    flavorText: ability.description,
    statPills,
    effectClauses,
    compactSummary: compactSegments.map((s) => s.text).join(' • '),
    compactSegments,
    highestTier
  };
}

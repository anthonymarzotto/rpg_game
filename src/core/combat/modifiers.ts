import { Ability } from '../types/ability';
import {
  AbilityModifier,
  ActiveModifierTier,
  EffectiveAbility,
  ModifiableAbilityProperty,
  ModifierProvenanceTier,
  PropertyAttribution
} from '../types/modifier';

/**
 * Standard polyhedral die progression ladder for die-tier stepped modifiers.
 */
export const STANDARD_DICE_STEPS: readonly number[] = [4, 6, 8, 10, 12];

/**
 * Upgrades or downgrades a die's sides along the canonical tabletop ladder [4, 6, 8, 10, 12].
 * Clamps at boundaries (min 4, max 12).
 */
export function upgradeDieSides(currentSides: number, steps: number = 1): number {
  if (steps === 0) return currentSides;

  // Find matching index or closest higher index
  let idx = STANDARD_DICE_STEPS.indexOf(currentSides);
  if (idx === -1) {
    idx = STANDARD_DICE_STEPS.findIndex((s) => s >= currentSides);
    if (idx === -1) idx = STANDARD_DICE_STEPS.length - 1;
  }

  const targetIdx = Math.max(0, Math.min(STANDARD_DICE_STEPS.length - 1, idx + steps));
  return STANDARD_DICE_STEPS[targetIdx];
}

/**
 * Checks whether an AbilityModifier applies to a given Ability.
 */
export function isModifierApplicable(modifier: AbilityModifier, ability: Ability): boolean {
  if (modifier.targetAbilityIds && modifier.targetAbilityIds.length > 0) {
    if (!modifier.targetAbilityIds.includes(ability.id)) {
      return false;
    }
  }

  if (modifier.targetArchetypes && modifier.targetArchetypes.length > 0) {
    if (!ability.archetypeTag || !modifier.targetArchetypes.includes(ability.archetypeTag)) {
      return false;
    }
  }

  if (modifier.targetDamageTypes && modifier.targetDamageTypes.length > 0) {
    if (!modifier.targetDamageTypes.includes(ability.damageType)) {
      return false;
    }
  }

  if (modifier.minBaseRange !== undefined && ability.range < modifier.minBaseRange) {
    return false;
  }

  if (modifier.minBaseAoeRadius !== undefined && (ability.aoeRadius ?? 0) < modifier.minBaseAoeRadius) {
    return false;
  }

  return true;
}

/**
 * Resolves the provenance tier of an AbilityModifier.
 */
export function resolveModifierTier(mod: AbilityModifier): ActiveModifierTier {
  return mod.tier ?? (mod.isPermanent ? 'SHARD' : 'TRIAL');
}

/**
 * Picks the higher-precedence provenance tier according to Normal -> Shard -> In-Trial.
 */
export function maxProvenanceTier(
  a: ModifierProvenanceTier,
  b: ModifierProvenanceTier
): ModifierProvenanceTier {
  if (a === 'TRIAL' || b === 'TRIAL') return 'TRIAL';
  if (a === 'SHARD' || b === 'SHARD') return 'SHARD';
  return 'NORMAL';
}

/**
 * Resolves the highest provenance tier affecting any of the specified properties.
 */
export function resolvePropertyTier(
  attributions: readonly PropertyAttribution[] | undefined,
  ...properties: ModifiableAbilityProperty[]
): ModifierProvenanceTier {
  if (!attributions || attributions.length === 0) return 'NORMAL';
  let highest: ModifierProvenanceTier = 'NORMAL';
  for (const attr of attributions) {
    if (properties.length === 0 || properties.includes(attr.property)) {
      const tier = attr.tier ?? 'TRIAL';
      highest = maxProvenanceTier(highest, tier);
      if (highest === 'TRIAL') return 'TRIAL';
    }
  }
  return highest;
}

/**
 * Pure evaluation function that calculates effective ability stats and generates
 * structured provenance attributions for all altered properties.
 * Preserves existing attributions/modifiers when chaining on top of an EffectiveAbility.
 *
 * Evaluation order:
 * 1. Overrides
 * 2. Deltas
 * 3. Effect Patches & Injections
 */
export function getEffectiveAbility(
  baseAbility: Ability | EffectiveAbility,
  modifiers?: readonly AbilityModifier[]
): EffectiveAbility {
  const existingAttributions: readonly PropertyAttribution[] =
    'attributions' in baseAbility && Array.isArray(baseAbility.attributions)
      ? baseAbility.attributions
      : [];
  const existingAppliedIds: readonly string[] =
    'appliedModifierIds' in baseAbility && Array.isArray(baseAbility.appliedModifierIds)
      ? baseAbility.appliedModifierIds
      : [];
  const existingAttackRollBonus: number | undefined =
    'attackRollBonus' in baseAbility ? baseAbility.attackRollBonus : undefined;

  const applicable = modifiers?.filter((m) => isModifierApplicable(m, baseAbility)) ?? [];
  if (applicable.length === 0) {
    return {
      ...baseAbility,
      attributions: [...existingAttributions],
      appliedModifierIds: [...existingAppliedIds],
      ...(existingAttackRollBonus !== undefined ? { attackRollBonus: existingAttackRollBonus } : {})
    };
  }

  let apCost = baseAbility.apCost;
  let hpCost = baseAbility.hpCost;
  let range = baseAbility.range;
  let aoeRadius = baseAbility.aoeRadius ?? 0;
  let archetypeTag = baseAbility.archetypeTag;
  let defenseTarget = baseAbility.defenseTarget;
  let attackModifierAttribute = baseAbility.attackModifierAttribute;
  let targetType = baseAbility.targetType;
  let damageType = baseAbility.damageType;
  let effects = [...baseAbility.effects];
  let attackRollBonus = existingAttackRollBonus ?? 0;

  const attributions: PropertyAttribution[] = [...existingAttributions];
  const appliedModifierIds: string[] = [...existingAppliedIds];

  for (const mod of applicable) {
    appliedModifierIds.push(mod.id);
    const tier = resolveModifierTier(mod);

    // 1. Overrides
    if (mod.overrides) {
      if (mod.overrides.archetypeTag !== undefined && mod.overrides.archetypeTag !== archetypeTag) {
        archetypeTag = mod.overrides.archetypeTag;
        attributions.push({
          property: 'archetypeTag',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Archetype: ${archetypeTag}`,
          tier
        });
      }

      if (mod.overrides.defenseTarget !== undefined && mod.overrides.defenseTarget !== defenseTarget) {
        defenseTarget = mod.overrides.defenseTarget;
        attributions.push({
          property: 'defenseTarget',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Target: ${defenseTarget}`,
          tier
        });
      }

      if (
        mod.overrides.attackModifierAttribute !== undefined &&
        mod.overrides.attackModifierAttribute !== attackModifierAttribute
      ) {
        attackModifierAttribute = mod.overrides.attackModifierAttribute;
        attributions.push({
          property: 'attackModifierAttribute',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Attack Attr: ${attackModifierAttribute}`,
          tier
        });
      }

      if (mod.overrides.targetType !== undefined && mod.overrides.targetType !== targetType) {
        targetType = mod.overrides.targetType;
        attributions.push({
          property: 'targetType',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Target Type: ${targetType}`,
          tier
        });
      }

      if (mod.overrides.damageType !== undefined && mod.overrides.damageType !== damageType) {
        damageType = mod.overrides.damageType;
        attributions.push({
          property: 'damageType',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Damage Type: ${damageType}`,
          tier
        });
      }
    }

    // 2. Deltas
    if (mod.deltas) {
      if (mod.deltas.apCost !== undefined && mod.deltas.apCost !== 0) {
        const delta = mod.deltas.apCost;
        apCost = Math.max(0, apCost + delta);
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        attributions.push({
          property: 'apCost',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `${sign} AP`,
          tier
        });
      }

      if (mod.deltas.hpCost !== undefined && mod.deltas.hpCost !== 0) {
        const delta = mod.deltas.hpCost;
        hpCost = Math.max(0, (hpCost ?? 0) + delta);
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        attributions.push({
          property: 'hpCost',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `${sign} HP Cost`,
          tier
        });
      }

      if (mod.deltas.range !== undefined && mod.deltas.range !== 0) {
        const delta = mod.deltas.range;
        range = Math.max(0, range + delta);
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        attributions.push({
          property: 'range',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `${sign} Range`,
          tier
        });
      }

      if (mod.deltas.aoeRadius !== undefined && mod.deltas.aoeRadius !== 0) {
        const delta = mod.deltas.aoeRadius;
        aoeRadius = Math.max(0, aoeRadius + delta);
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        attributions.push({
          property: 'aoeRadius',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `${sign} AoE Radius`,
          tier
        });
      }

      if (mod.deltas.attackRoll !== undefined && mod.deltas.attackRoll !== 0) {
        const delta = mod.deltas.attackRoll;
        attackRollBonus += delta;
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        attributions.push({
          property: 'attackRoll',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `${sign} Attack Roll`,
          tier
        });
      }
    }

    // 3. Effect Patches
    if (mod.effectPatches) {
      const patch = mod.effectPatches;
      let patchedAny = false;
      const patchLabels: string[] = [];

      effects = effects.map((eff) => {
        if (eff.type !== 'DAMAGE') return eff;
        let updatedEff = { ...eff };
        let effPatched = false;

        if (patch.diceStep && updatedEff.damageProfile) {
          const oldSides = updatedEff.damageProfile.sides;
          const newSides = upgradeDieSides(oldSides, patch.diceStep);
          if (newSides !== oldSides) {
            updatedEff = {
              ...updatedEff,
              damageProfile: {
                ...updatedEff.damageProfile,
                sides: newSides
              }
            };
            patchLabels.push(`${updatedEff.damageProfile!.count}d${oldSides} -> ${updatedEff.damageProfile!.count}d${newSides}`);
            patchedAny = true;
            effPatched = true;
          }
        }

        if (patch.diceCount && updatedEff.damageProfile) {
          const newCount = Math.max(1, updatedEff.damageProfile.count + patch.diceCount);
          updatedEff = {
            ...updatedEff,
            damageProfile: {
              ...updatedEff.damageProfile,
              count: newCount
            }
          };
          const sign = patch.diceCount > 0 ? `+${patch.diceCount}` : `${patch.diceCount}`;
          patchLabels.push(`${sign}d${updatedEff.damageProfile!.sides}`);
          patchedAny = true;
          effPatched = true;
        }

        if (patch.flatDamage) {
          const currentFlat = updatedEff.flatDamage ?? 0;
          const newFlat = currentFlat + patch.flatDamage;
          updatedEff = {
            ...updatedEff,
            flatDamage: newFlat
          };
          const sign = patch.flatDamage > 0 ? `+${patch.flatDamage}` : `${patch.flatDamage}`;
          patchLabels.push(`${sign} Dmg`);
          patchedAny = true;
          effPatched = true;
        }

        if (effPatched) {
          const nextTier = maxProvenanceTier(updatedEff.sourceTier ?? 'NORMAL', tier) as ActiveModifierTier;
          updatedEff = {
            ...updatedEff,
            sourceTier: nextTier,
            sourceName: mod.name
          };
        }

        return updatedEff;
      });

      if (patchedAny) {
        attributions.push({
          property: 'damageProfile',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: patchLabels.join(', '),
          tier
        });
      }
    }

    // 4. Effect Injections
    if (mod.appendEffects && mod.appendEffects.length > 0) {
      const taggedAppends = mod.appendEffects.map((eff) => ({
        ...eff,
        sourceTier: tier,
        sourceName: mod.name
      }));
      effects = [...effects, ...taggedAppends];
      attributions.push({
        property: 'effects',
        sourceName: mod.name,
        sourceId: mod.id,
        changeLabel: `+${mod.appendEffects.length} Effect(s)`,
        tier
      });
    }
  }

  return {
    ...baseAbility,
    apCost,
    hpCost: hpCost !== undefined && hpCost > 0 ? hpCost : undefined,
    range,
    aoeRadius: aoeRadius > 0 ? aoeRadius : undefined,
    archetypeTag,
    defenseTarget,
    attackModifierAttribute,
    targetType,
    damageType,
    effects,
    attributions,
    appliedModifierIds,
    attackRollBonus: attackRollBonus !== 0 ? attackRollBonus : undefined
  };
}

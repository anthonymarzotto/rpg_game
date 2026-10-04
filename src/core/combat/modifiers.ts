import { Ability } from '../types/ability';
import { AbilityModifier, EffectiveAbility, PropertyAttribution } from '../types/modifier';

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

  return true;
}

/**
 * Pure evaluation function that calculates effective ability stats and generates
 * structured provenance attributions for all altered properties.
 *
 * Evaluation order:
 * 1. Overrides
 * 2. Deltas
 * 3. Effect Patches & Injections
 */
export function getEffectiveAbility(
  baseAbility: Ability,
  modifiers?: readonly AbilityModifier[]
): EffectiveAbility {
  const applicable = modifiers?.filter((m) => isModifierApplicable(m, baseAbility)) ?? [];
  if (applicable.length === 0) {
    return {
      ...baseAbility,
      attributions: [],
      appliedModifierIds: []
    };
  }

  let apCost = baseAbility.apCost;
  let range = baseAbility.range;
  let aoeRadius = baseAbility.aoeRadius ?? 0;
  let archetypeTag = baseAbility.archetypeTag;
  let defenseTarget = baseAbility.defenseTarget;
  let attackModifierAttribute = baseAbility.attackModifierAttribute;
  let targetType = baseAbility.targetType;
  let damageType = baseAbility.damageType;
  let effects = [...baseAbility.effects];

  const attributions: PropertyAttribution[] = [];
  const appliedModifierIds: string[] = [];

  for (const mod of applicable) {
    appliedModifierIds.push(mod.id);

    // 1. Overrides
    if (mod.overrides) {
      if (mod.overrides.archetypeTag !== undefined && mod.overrides.archetypeTag !== archetypeTag) {
        archetypeTag = mod.overrides.archetypeTag;
        attributions.push({
          property: 'archetypeTag',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Archetype: ${archetypeTag}`
        });
      }

      if (mod.overrides.defenseTarget !== undefined && mod.overrides.defenseTarget !== defenseTarget) {
        defenseTarget = mod.overrides.defenseTarget;
        attributions.push({
          property: 'defenseTarget',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Target: ${defenseTarget}`
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
          changeLabel: `Attack Attr: ${attackModifierAttribute}`
        });
      }

      if (mod.overrides.targetType !== undefined && mod.overrides.targetType !== targetType) {
        targetType = mod.overrides.targetType;
        attributions.push({
          property: 'targetType',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Target Type: ${targetType}`
        });
      }

      if (mod.overrides.damageType !== undefined && mod.overrides.damageType !== damageType) {
        damageType = mod.overrides.damageType;
        attributions.push({
          property: 'damageType',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: `Damage Type: ${damageType}`
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
          changeLabel: `${sign} AP`
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
          changeLabel: `${sign} Range`
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
          changeLabel: `${sign} AoE Radius`
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
        }

        return updatedEff;
      });

      if (patchedAny) {
        attributions.push({
          property: 'damageProfile',
          sourceName: mod.name,
          sourceId: mod.id,
          changeLabel: patchLabels.join(', ')
        });
      }
    }

    // 4. Effect Injections
    if (mod.appendEffects && mod.appendEffects.length > 0) {
      effects = [...effects, ...mod.appendEffects];
      attributions.push({
        property: 'effects',
        sourceName: mod.name,
        sourceId: mod.id,
        changeLabel: `+${mod.appendEffects.length} Effect(s)`
      });
    }
  }

  return {
    ...baseAbility,
    apCost,
    range,
    aoeRadius: aoeRadius > 0 ? aoeRadius : undefined,
    archetypeTag,
    defenseTarget,
    attackModifierAttribute,
    targetType,
    damageType,
    effects,
    attributions,
    appliedModifierIds
  };
}

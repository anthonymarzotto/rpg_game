import { Unit } from '../types/unit';
import { Ability } from '../types/ability';
import { PassiveTrait } from '../types/passive';
import { ClassPackage } from '../types/classPackage';
import { UnitLoadout, ResolvedUnitLoadout } from '../types/loadout';
import { AbilityModifier } from '../types/modifier';
import { getEffectiveAbility } from '../combat/modifiers';
import { getShardById } from '../progression/harmonization';

export const MAX_WILDCARD_ABILITIES = 2;
export const MAX_WILDCARD_PASSIVES = 1;
export const NOVICE_CLASS_ID = 'novice';
export const NOVICE_PASSIVE_ID = 'momentum';

export interface LoadoutLookupProviders {
  readonly getPackage: (classId: string) => ClassPackage | undefined;
  readonly getAbility: (abilityId: string) => Ability | undefined;
  readonly getPassive: (passiveId: string) => PassiveTrait | undefined;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Resolves a unit's loadout configuration into concrete, hydrated combat abilities and passives.
 */
export function resolveUnitLoadout(
  unit: Unit,
  providers: LoadoutLookupProviders
): ResolvedUnitLoadout {
  const { getPackage, getAbility, getPassive } = providers;
  const loadout = unit.loadout;

  let coreAbilities: readonly Ability[] = [];
  let innatePassive: PassiveTrait;

  if (loadout.activeClassId === NOVICE_CLASS_ID) {
    // Novice core abilities are the unit's rolled starter abilities
    coreAbilities = unit.starterAbilityIds
      .map((id) => getAbility(id))
      .filter((a): a is Ability => a !== undefined);

    const novicePassive = getPassive(NOVICE_PASSIVE_ID);
    if (!novicePassive) {
      throw new Error(`Cannot resolve loadout: Novice passive '${NOVICE_PASSIVE_ID}' not found.`);
    }
    innatePassive = novicePassive;
  } else {
    const pkg = getPackage(loadout.activeClassId);
    if (!pkg) {
      throw new Error(`Cannot resolve loadout: class package '${loadout.activeClassId}' not found.`);
    }
    coreAbilities = [pkg.signatureAbility, ...pkg.domainAbilities];
    innatePassive = pkg.passive;
  }

  // Resolve wildcard abilities
  let wildcardAbilities = loadout.wildcardAbilityIds
    .map((id) => getAbility(id))
    .filter((a): a is Ability => a !== undefined);

  // Apply slot augments if present (slots 0..2 = core, slots 3..4 = wildcard)
  if (loadout.slotAugments) {
    coreAbilities = coreAbilities.map((ability, idx) => {
      const shardIds = loadout.slotAugments?.[idx] ?? [];
      const mods = shardIds
        .map((id) => getShardById(id)?.modifier)
        .filter((m): m is AbilityModifier => m !== undefined);
      return mods.length > 0 ? getEffectiveAbility(ability, mods) : ability;
    });

    wildcardAbilities = wildcardAbilities.map((ability, idx) => {
      const slotIdx = 3 + idx;
      const shardIds = loadout.slotAugments?.[slotIdx] ?? [];
      const mods = shardIds
        .map((id) => getShardById(id)?.modifier)
        .filter((m): m is AbilityModifier => m !== undefined);
      return mods.length > 0 ? getEffectiveAbility(ability, mods) : ability;
    });
  }

  // Resolve wildcard passives
  const wildcardPassives = loadout.wildcardPassiveIds
    .map((id) => getPassive(id))
    .filter((p): p is PassiveTrait => p !== undefined);

  return {
    coreAbilities,
    wildcardAbilities,
    combatAbilities: [...coreAbilities, ...wildcardAbilities],
    innatePassive,
    wildcardPassives,
    activePassives: [innatePassive, ...wildcardPassives]
  };
}

/**
 * Validates a proposed loadout against a unit's progression and unlocked history.
 */
export function validateUnitLoadout(
  unit: Unit,
  newLoadout: UnitLoadout,
  providers: Pick<LoadoutLookupProviders, 'getPackage'>
): ValidationResult {
  const { getPackage } = providers;

  // 1. Active class must be 'novice' or in unit's unlocked constellation
  if (
    newLoadout.activeClassId !== NOVICE_CLASS_ID &&
    !unit.progression.constellation.includes(newLoadout.activeClassId)
  ) {
    return {
      valid: false,
      reason: `Active class '${newLoadout.activeClassId}' has not been unlocked in the constellation.`
    };
  }

  // 2. Wildcard capacity limits
  if (newLoadout.wildcardAbilityIds.length > MAX_WILDCARD_ABILITIES) {
    return {
      valid: false,
      reason: `Cannot equip more than ${MAX_WILDCARD_ABILITIES} wildcard abilities.`
    };
  }

  if (newLoadout.wildcardPassiveIds.length > MAX_WILDCARD_PASSIVES) {
    return {
      valid: false,
      reason: `Cannot equip more than ${MAX_WILDCARD_PASSIVES} wildcard passive.`
    };
  }

  // 3. No duplicates within wildcards
  const uniqueAbilityIds = new Set(newLoadout.wildcardAbilityIds);
  if (uniqueAbilityIds.size !== newLoadout.wildcardAbilityIds.length) {
    return {
      valid: false,
      reason: 'Cannot equip duplicate wildcard abilities.'
    };
  }

  const uniquePassiveIds = new Set(newLoadout.wildcardPassiveIds);
  if (uniquePassiveIds.size !== newLoadout.wildcardPassiveIds.length) {
    return {
      valid: false,
      reason: 'Cannot equip duplicate wildcard passives.'
    };
  }

  // 4. If active class is not novice, cannot equip its core abilities/passive as wildcards
  if (newLoadout.activeClassId !== NOVICE_CLASS_ID) {
    const activePkg = getPackage(newLoadout.activeClassId);
    if (activePkg) {
      const coreIds = new Set([
        activePkg.signatureAbility.id,
        ...activePkg.domainAbilities.map((a) => a.id)
      ]);
      for (const wildcardId of newLoadout.wildcardAbilityIds) {
        if (coreIds.has(wildcardId)) {
          return {
            valid: false,
            reason: `Cannot equip core ability '${wildcardId}' of active class '${newLoadout.activeClassId}' as a wildcard.`
          };
        }
      }

      if (newLoadout.wildcardPassiveIds.includes(activePkg.passive.id)) {
        return {
          valid: false,
          reason: `Cannot equip innate passive '${activePkg.passive.id}' of active class '${newLoadout.activeClassId}' as a wildcard.`
        };
      }
    }
  }

  // 5. Verify that all wildcard abilities come from unlocked sources (starter abilities or unlocked classes)
  const allowedAbilityIds = new Set<string>(unit.starterAbilityIds);
  const allowedPassiveIds = new Set<string>([NOVICE_PASSIVE_ID]);

  if (unit.progression.unlockedAbilityIds) {
    for (const unlockedId of unit.progression.unlockedAbilityIds) {
      allowedAbilityIds.add(unlockedId);
    }
  }

  for (const unlockedClassId of unit.progression.constellation) {
    const pkg = getPackage(unlockedClassId);
    if (pkg) {
      allowedAbilityIds.add(pkg.signatureAbility.id);
      for (const domainAbility of pkg.domainAbilities) {
        allowedAbilityIds.add(domainAbility.id);
      }
      allowedPassiveIds.add(pkg.passive.id);
    }
  }

  for (const abilityId of newLoadout.wildcardAbilityIds) {
    if (!allowedAbilityIds.has(abilityId)) {
      return {
        valid: false,
        reason: `Ability '${abilityId}' has not been unlocked by this unit.`
      };
    }
  }

  for (const passiveId of newLoadout.wildcardPassiveIds) {
    if (!allowedPassiveIds.has(passiveId)) {
      return {
        valid: false,
        reason: `Passive '${passiveId}' has not been unlocked by this unit.`
      };
    }
  }

  // 6. Validate slot augments (sockets)
  if (newLoadout.slotAugments) {
    const earnedSet = new Set(newLoadout.earnedShards ?? []);
    const socketedShards = new Set<string>();

    for (const [slotKey, shardIds] of Object.entries(newLoadout.slotAugments)) {
      const slotNum = Number(slotKey);
      if (isNaN(slotNum) || slotNum < 0 || slotNum > 4) {
        return {
          valid: false,
          reason: `Invalid slot index '${slotKey}'. Must be an integer between 0 and 4.`
        };
      }
      if (shardIds.length > 2) {
        return {
          valid: false,
          reason: `Slot ${slotKey} cannot hold more than 2 augment shards.`
        };
      }
      for (const shardId of shardIds) {
        if (!earnedSet.has(shardId)) {
          return {
            valid: false,
            reason: `Shard '${shardId}' in slot ${slotKey} has not been earned by this unit.`
          };
        }
        if (socketedShards.has(shardId)) {
          return {
            valid: false,
            reason: `Shard '${shardId}' is socketed in multiple slots.`
          };
        }
        socketedShards.add(shardId);
      }
    }
  }

  return { valid: true };
}

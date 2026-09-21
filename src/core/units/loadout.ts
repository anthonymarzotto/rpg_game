import { Unit } from '../types/unit';
import { Ability } from '../types/ability';
import { PassiveTrait } from '../types/passive';
import { ClassPackage } from '../types/classPackage';
import { UnitLoadout, ResolvedUnitLoadout } from '../types/loadout';

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
  const wildcardAbilities = loadout.wildcardAbilityIds
    .map((id) => getAbility(id))
    .filter((a): a is Ability => a !== undefined);

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

  return { valid: true };
}

import { Unit } from '../types/unit';
import { Ability } from '../types/ability';
import { PassiveTrait } from '../types/passive';
import { ClassPackage } from '../types/classPackage';
import { UnitLoadout, ResolvedUnitLoadout } from '../types/loadout';
import { AbilityModifier } from '../types/modifier';
import { getEffectiveAbility } from '../combat/modifiers';
import { getShardById, evaluateShardCompatibility } from '../progression/harmonization';
import { getAbilityById } from '../../data/packages';

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

interface ResolvedBaseSlots {
  readonly coreAbilities: readonly Ability[];
  readonly wildcardAbilities: readonly Ability[];
  readonly slotAbilities: readonly (Ability | undefined)[];
}

function resolveBaseAbilitySlots(
  unit: Unit,
  loadout: UnitLoadout,
  providers: Pick<LoadoutLookupProviders, 'getPackage'> & Partial<Pick<LoadoutLookupProviders, 'getAbility'>>,
  strictClassLookup = false
): ResolvedBaseSlots {
  const { getPackage } = providers;
  const lookupAbility = providers.getAbility ?? getAbilityById;

  let coreRaw: readonly (Ability | undefined)[] = [];
  if (loadout.activeClassId === NOVICE_CLASS_ID) {
    coreRaw = unit.starterAbilityIds.map((id) => lookupAbility(id));
  } else {
    const pkg = getPackage(loadout.activeClassId);
    if (!pkg) {
      if (strictClassLookup) {
        throw new Error(`Cannot resolve loadout: class package '${loadout.activeClassId}' not found.`);
      }
    } else {
      coreRaw = [pkg.signatureAbility, ...pkg.domainAbilities];
    }
  }

  const wildcardRaw: readonly (Ability | undefined)[] = [
    loadout.wildcardAbilityIds[0] ? lookupAbility(loadout.wildcardAbilityIds[0]) : undefined,
    loadout.wildcardAbilityIds[1] ? lookupAbility(loadout.wildcardAbilityIds[1]) : undefined
  ];

  const coreAbilities = coreRaw.filter((a): a is Ability => a !== undefined);
  const wildcardAbilities = loadout.wildcardAbilityIds
    .map((id) => lookupAbility(id))
    .filter((a): a is Ability => a !== undefined);

  return {
    coreAbilities,
    wildcardAbilities,
    slotAbilities: [coreRaw[0], coreRaw[1], coreRaw[2], wildcardRaw[0], wildcardRaw[1]]
  };
}

function applyCompatibleSlotShards(ability: Ability, shardIds: readonly string[]): Ability {
  if (shardIds.length === 0) {
    return ability;
  }
  const mods: AbilityModifier[] = [];
  for (const id of shardIds) {
    const shard = getShardById(id);
    if (shard && evaluateShardCompatibility(shard, ability).compatible) {
      mods.push(shard.modifier);
    }
  }
  return mods.length > 0 ? getEffectiveAbility(ability, mods) : ability;
}

/**
 * Resolves a unit's loadout configuration into concrete, hydrated combat abilities and passives.
 * Defensively skips any socketed shard that fails compatibility evaluation against the slot's
 * base ability (e.g. legacy or externally modified saves).
 */
export function resolveUnitLoadout(
  unit: Unit,
  providers: LoadoutLookupProviders
): ResolvedUnitLoadout {
  const { getPackage, getPassive } = providers;
  const loadout = unit.loadout;

  const baseSlots = resolveBaseAbilitySlots(unit, loadout, providers, true);
  let coreAbilities: readonly Ability[] = baseSlots.coreAbilities;
  let wildcardAbilities: readonly Ability[] = baseSlots.wildcardAbilities;
  let innatePassive: PassiveTrait;

  if (loadout.activeClassId === NOVICE_CLASS_ID) {
    const novicePassive = getPassive(NOVICE_PASSIVE_ID);
    if (!novicePassive) {
      throw new Error(`Cannot resolve loadout: Novice passive '${NOVICE_PASSIVE_ID}' not found.`);
    }
    innatePassive = novicePassive;
  } else {
    const pkg = getPackage(loadout.activeClassId)!;
    innatePassive = pkg.passive;
  }

  // Apply compatible slot augments if present (slots 0..2 = core, slots 3..4 = wildcard)
  if (loadout.slotAugments) {
    coreAbilities = coreAbilities.map((ability, idx) =>
      applyCompatibleSlotShards(ability, loadout.slotAugments?.[idx] ?? [])
    );

    wildcardAbilities = wildcardAbilities.map((ability, idx) =>
      applyCompatibleSlotShards(ability, loadout.slotAugments?.[3 + idx] ?? [])
    );
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
 * Resolves the base (unaugmented) Ability occupying each loadout slot (0..2 core, 3..4 wildcard).
 */
export function getSlotBaseAbilities(
  unit: Unit,
  loadout: UnitLoadout,
  providers: Pick<LoadoutLookupProviders, 'getPackage'> & Partial<Pick<LoadoutLookupProviders, 'getAbility'>>
): readonly (Ability | undefined)[] {
  return resolveBaseAbilitySlots(unit, loadout, providers, false).slotAbilities;
}

/**
 * Removes any socketed shards that are incompatible with the base ability currently occupying
 * their slot (or left on an empty slot), returning the cleaned slotAugments map and removed IDs.
 */
export function pruneIncompatibleSlotAugments(
  unit: Unit,
  loadout: UnitLoadout,
  providers: Pick<LoadoutLookupProviders, 'getPackage'> & Partial<Pick<LoadoutLookupProviders, 'getAbility'>>
): {
  readonly slotAugments: Record<number, readonly string[]>;
  readonly removedShardIds: readonly string[];
} {
  const slotAbilities = getSlotBaseAbilities(unit, loadout, providers);
  const cleaned: Record<number, readonly string[]> = {};
  const removedShardIds: string[] = [];

  for (const [slotKey, shardIds] of Object.entries(loadout.slotAugments ?? {})) {
    const slotNum = Number(slotKey);
    const slotAbility = slotAbilities[slotNum];
    const kept: string[] = [];

    for (const shardId of shardIds) {
      const shard = getShardById(shardId);
      if (slotAbility && shard && evaluateShardCompatibility(shard, slotAbility).compatible) {
        kept.push(shardId);
      } else {
        removedShardIds.push(shardId);
      }
    }

    if (kept.length > 0) {
      cleaned[slotNum] = kept;
    }
  }

  return { slotAugments: cleaned, removedShardIds };
}

/**
 * Validates a proposed loadout against a unit's progression and unlocked history.
 */
export function validateUnitLoadout(
  unit: Unit,
  newLoadout: UnitLoadout,
  providers: Pick<LoadoutLookupProviders, 'getPackage'> & Partial<Pick<LoadoutLookupProviders, 'getAbility'>>
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

  // 4b. Signature abilities of any class cannot be equipped as wildcards
  for (const unlockedClassId of unit.progression.constellation) {
    const pkg = getPackage(unlockedClassId);
    if (pkg && newLoadout.wildcardAbilityIds.includes(pkg.signatureAbility.id)) {
      return {
        valid: false,
        reason: `Cannot equip signature ability '${pkg.signatureAbility.id}' of class '${pkg.className}' as a wildcard.`
      };
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
    const slotAbilities = getSlotBaseAbilities(unit, newLoadout, providers);

    for (const [slotKey, shardIds] of Object.entries(newLoadout.slotAugments)) {
      if (shardIds.length === 0) {
        continue;
      }
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
      const slotAbility = slotAbilities[slotNum];
      if (!slotAbility) {
        return {
          valid: false,
          reason: `Slot ${slotKey} has no equipped ability to augment.`
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
        const shard = getShardById(shardId);
        if (!shard) {
          return {
            valid: false,
            reason: `Unknown augment shard '${shardId}' in slot ${slotKey}.`
          };
        }
        const compat = evaluateShardCompatibility(shard, slotAbility);
        if (!compat.compatible) {
          return {
            valid: false,
            reason: `Shard '${shard.name}' is incompatible with '${slotAbility.name}' (${compat.reason ?? 'incompatible ability'}).`
          };
        }
        socketedShards.add(shardId);
      }
    }
  }

  return { valid: true };
}

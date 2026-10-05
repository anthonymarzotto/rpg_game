import { Ability } from './ability';
import { PassiveTrait } from './passive';
import { AbilityModifier } from './modifier';

export interface UnitLoadout {
  /** The currently designated active class (e.g. 'novice', 'warrior', 'thief') */
  readonly activeClassId: string;
  /** Ability IDs equipped into the wildcard slots (max 2) */
  readonly wildcardAbilityIds: readonly string[];
  /** Passive trait IDs equipped into the wildcard passive slots (max 1) */
  readonly wildcardPassiveIds: readonly string[];
  /** Permanent ability modifiers (e.g. unlocked via progression or overclocks) */
  readonly abilityModifiers?: readonly AbilityModifier[];
  /** Shard IDs earned and available in the hero's loadout inventory */
  readonly earnedShards?: readonly string[];
  /** Sockets per ability slot (0..4), up to 2 shard IDs per slot */
  readonly slotAugments?: Readonly<Record<number, readonly string[]>>;
}

export interface ResolvedUnitLoadout {
  /** 3 Core abilities from active class (or unit's starter Novice abilities) */
  readonly coreAbilities: readonly Ability[];
  /** Wildcard abilities equipped from unlocked constellation classes */
  readonly wildcardAbilities: readonly Ability[];
  /** All combat abilities (Core + Wildcards). Move & Wait are NOT included. */
  readonly combatAbilities: readonly Ability[];
  /** Innate passive from the active class package */
  readonly innatePassive: PassiveTrait;
  /** Wildcard passives equipped from unlocked constellation classes */
  readonly wildcardPassives: readonly PassiveTrait[];
  /** All active passives (Innate + Wildcards) */
  readonly activePassives: readonly PassiveTrait[];
}

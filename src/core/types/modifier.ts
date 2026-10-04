import { Ability, AbilityEffect, AbilityTargetType, DamageType, DefenseTarget } from './ability';
import { Archetype } from './class';
import { TriadAttributes } from './stats';

/**
 * Supported properties for attribution tracking when an ability is modified.
 */
export type ModifiableAbilityProperty =
  | 'apCost'
  | 'range'
  | 'aoeRadius'
  | 'archetypeTag'
  | 'defenseTarget'
  | 'attackModifierAttribute'
  | 'targetType'
  | 'damageType'
  | 'damageProfile'
  | 'effects';

/**
 * Provenance record documenting a single property change applied to an ability.
 */
export interface PropertyAttribution {
  readonly property: ModifiableAbilityProperty;
  readonly sourceName: string;
  readonly sourceId: string;
  readonly changeLabel: string;
}

/**
 * Damage effect patch options (e.g. upgrading dice tier, adding flat damage).
 */
export interface EffectPatch {
  /** Steps up the die sides along standard polyhedral ladder (e.g. 1 step: 1d4 -> 1d6) */
  readonly diceStep?: number;
  /** Adds or subtracts dice count (e.g. +1 -> 1d6 becomes 2d6) */
  readonly diceCount?: number;
  /** Adds flat bonus damage to damage effects */
  readonly flatDamage?: number;
}

/**
 * Declarative patch specification for modifying abilities.
 */
export interface AbilityModifierPatches {
  /** Explicit property overrides */
  readonly overrides?: Partial<{
    archetypeTag: Archetype;
    defenseTarget: DefenseTarget;
    attackModifierAttribute: keyof TriadAttributes;
    targetType: AbilityTargetType;
    damageType: DamageType;
  }>;
  /** Additive/subtractive numeric deltas */
  readonly deltas?: {
    apCost?: number;
    range?: number;
    aoeRadius?: number;
  };
  /** Additional atomic effects appended to the ability's effect list */
  readonly appendEffects?: readonly AbilityEffect[];
  /** Modifications applied to matching DAMAGE effects */
  readonly effectPatches?: EffectPatch;
}

/**
 * Applicability filter criteria for a modifier.
 */
export interface ModifierApplicabilityFilter {
  /** Specific ability IDs this modifier affects. If omitted/empty, matches any ability */
  readonly targetAbilityIds?: readonly string[];
  /** Archetypes this modifier affects. If omitted/empty, matches any archetype */
  readonly targetArchetypes?: readonly Archetype[];
  /** Damage types this modifier affects (e.g. MAGICAL for spell enhancements) */
  readonly targetDamageTypes?: readonly DamageType[];
}

/**
 * Universal declarative modifier contract for abilities.
 * Can represent permanent overclocks, stance passes, or ephemeral combat primers.
 */
export interface AbilityModifier extends AbilityModifierPatches, ModifierApplicabilityFilter {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** If true, this modifier is permanent (e.g. unlocked in progression) */
  readonly isPermanent?: boolean;
  /** If specified, duration in turns until expiration (for combat buffs) */
  durationTurns?: number;
  /** If true, this modifier is consumed upon the first ability execution it affects */
  readonly consumesOnUse?: boolean;
  /** If true, expires at the end of the current turn even if not consumed */
  readonly expiresAtTurnEnd?: boolean;
}

/**
 * Hydrated ability containing active modifications and detailed provenance attributions.
 */
export interface EffectiveAbility extends Ability {
  readonly attributions: readonly PropertyAttribution[];
  readonly appliedModifierIds: readonly string[];
}

import { Archetype } from './class';
import { TriadAttributes } from './stats';
import { AIProfile } from './ai';

export type AbilityTargetType = 'SINGLE_TARGET' | 'SELF' | 'ALLY' | 'HEX';
export type DefenseTarget = 'EVASION' | 'RESOLVE' | 'NONE';
export type DamageType = 'PHYSICAL' | 'MAGICAL' | 'NONE';

/**
 * Dice profile for attacks (e.g. 1d6 + Force, 1d4 + Finesse).
 */
export interface DiceProfile {
  readonly count: number;
  readonly sides: number;
  readonly modifierAttribute: keyof TriadAttributes;
}

export type ConditionType = 'POISON' | 'BURN' | 'CHALLENGED' | 'STEALTH';

export type AbilityEffectType =
  | 'DAMAGE'           // Deals physical or magical damage via dice profile and/or flat damage
  | 'KNOCKBACK'        // Push target 1 hex
  | 'RETREAT_STEP'     // User steps back 1 hex freely
  | 'ARMOR_BUFF'       // Grants temporary armor boost
  | 'WARD_BUFF'        // Grants temporary ward boost
  | 'SLOW'             // Reduces target movement range
  | 'CRIT_BOOST'       // Lowers critical hit threshold (e.g., crits on 19-20)
  | 'TELEPORT'         // Shadow Step phase teleport to target hex
  | 'CLEAVE'           // Sweeps to adjacent frontal enemy
  | 'CTB_DELAY'        // Delays target CTB initiative gauge
  | 'INITIATIVE_BOOST' // Boosts target CTB initiative gauge (e.g. Tactical Vanguard)
  | 'FORCE_FACING'     // Forces target to face actor
  | 'FORCE_FACING_AWAY'// Forces target to face 180 degrees away from actor
  | 'CONDITION'        // Applies a status condition (Poison, Burn, Challenged, Stealth)
  | 'SPELL_SCULPT'     // Primes pending ability modifier for next Mage spell
  | 'WILD_SURGE'       // Spontaneous arcane surges on critical hits
  | 'STAT_MODIFIER'    // Applies stat modifier (e.g. Expose Weakness -2 Armor & -2 Evasion)
  | 'RUSH_CHARGE'      // Rushes along straight line into melee contact with target
  | 'PENETRATE_STEP'   // Advances through target to the rear hex if open
  | 'BLOOD_FRENZY';    // Primes pending ability modifier for next physical attack (+1 die step, +2 attack roll)

export type EffectTargetScope = 'TARGET' | 'SELF' | 'ALLIES';
export type EffectApplyCondition = 'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY';
export type AbilityCondition = 'FLANK_OR_REAR';

export interface AbilityEffect {
  readonly type: AbilityEffectType;
  /** Delivery target for this individual effect (defaults to TARGET) */
  readonly targetScope?: EffectTargetScope;
  /** Trigger condition determining when effect executes (defaults to HIT_OR_CRIT for attacks/secondary, ALWAYS for self-buffs) */
  readonly applyOn?: EffectApplyCondition;
  readonly magnitude?: number;
  /** Optional dice profile for damage or variable effects */
  readonly damageProfile?: DiceProfile;
  /** Optional flat damage component added to attack rolls */
  readonly flatDamage?: number;
  readonly durationTurns?: number;
  readonly conditionType?: ConditionType;
  readonly statModifiers?: Partial<Record<'armor' | 'ward' | 'speed' | 'move' | 'evasion' | 'resolve' | 'attackRoll', number>>;
  /** Tactical condition required for this effect to apply (e.g. FLANK_OR_REAR for Sneak Attack) */
  readonly condition?: AbilityCondition;
  /** Optional bonus damage dice applied when condition is satisfied */
  readonly bonusDamage?: DiceProfile;
  /** Whether satisfying condition grants advantage on attack roll */
  readonly grantsAdvantage?: boolean;
}

export type AIRole = 'PRIMER' | 'FINISHER' | 'DEFENSIVE' | 'DISRUPTION' | 'UTILITY' | 'MELEE_CONTINGENCY';

export type FollowUpCategory = 'PHYSICAL_ATTACK' | 'SPELL' | 'FLANK_ATTACK' | 'ANY_ATTACK';

export interface AIPrimerHint {
  /** Follow-up action required to justify casting this primer */
  readonly requiresFollowUp: FollowUpCategory;
  /** Minimum combined AP required (cost of primer + minimum cost of follow-up) */
  readonly minTotalAp: number;
  /** Tactical bonus score added when primer prerequisites are satisfied */
  readonly bonusScore: number;
  /** Whether the primer bonus scales with the projected expected damage of the follow-up attack */
  readonly scaleWithFollowUpDamage?: boolean;
  /** Tactical reason string emitted in decision explanation */
  readonly reason?: string;
  /** Profiles that specifically prioritize this primer */
  readonly preferredProfiles?: readonly AIProfile[];
}

export interface AIMeleeContingencyHint {
  /** Minimum target armor required to trigger the melee contingency */
  readonly minTargetArmor?: number;
  /** Tactical bonus score added when contingency conditions are met */
  readonly bonusScore: number;
  /** Profiles that specifically prioritize this contingency (e.g. SNIPER) */
  readonly preferredProfiles?: readonly AIProfile[];
  /** Tactical reason string emitted in decision explanation */
  readonly reason?: string;
}

export interface AbilityAIHint {
  readonly role?: AIRole;
  readonly primer?: AIPrimerHint;
  readonly meleeContingency?: AIMeleeContingencyHint;
}

/**
 * Combat action contract.
 */
export interface Ability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Archetype tag earning XP upon execution */
  readonly archetypeTag?: Archetype;
  readonly apCost: number;
  /** Optional HP cost deducted from user upon execution (self-sacrifice) */
  readonly hpCost?: number;
  /** Maximum targeting distance in hexes */
  readonly range: number;
  readonly targetType: AbilityTargetType;
  readonly defenseTarget: DefenseTarget;
  /** Triad attribute contributing to the d20 attack roll (e.g. 'finesse' for physical, 'focus' for spells) */
  readonly attackModifierAttribute?: keyof TriadAttributes;
  readonly damageType: DamageType;
  /** Atomic effects array composed on the ability */
  readonly effects: readonly AbilityEffect[];
  /** Blast AoE radius in hexes (undefined or 0 = single target hex, 1 = target + adjacent ring) */
  readonly aoeRadius?: number;
  /** Whether the ability can only be executed at most once per turn */
  readonly oncePerTurn?: boolean;
  /** Whether the ability ignores upward low-ground attack roll penalties and disadvantage */
  readonly ignoresElevationPenalty?: boolean;
  /** Maximum vertical elevation delta allowed for melee reach (defaults to 1) */
  readonly reachElevationDelta?: number;
  /** Optional declarative AI behavioral and combo sequencing hints */
  readonly aiHint?: AbilityAIHint;
}

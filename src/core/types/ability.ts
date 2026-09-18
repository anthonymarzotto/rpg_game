import { Archetype } from './class';
import { TriadAttributes } from './stats';

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


export type AbilityEffectType =
  | 'KNOCKBACK'     // Push target 1 hex
  | 'RETREAT_STEP'  // User steps back 1 hex freely
  | 'ARMOR_BUFF'    // Grants temporary armor boost
  | 'WARD_BUFF'     // Grants temporary ward boost
  | 'SLOW'          // Reduces target movement range
  | 'CRIT_BOOST';   // Lowers critical hit threshold (e.g., crits on 19-20)

export interface AbilityEffect {
  readonly type: AbilityEffectType;
  readonly magnitude: number;
  readonly durationTurns?: number;
}

export type AbilityCondition = 'FLANK_OR_REAR';

export interface ConditionalBonus {
  readonly condition: AbilityCondition;
  readonly bonusDamage?: DiceProfile;
  readonly grantsAdvantage?: boolean;
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
  /** Maximum targeting distance in hexes */
  readonly range: number;
  readonly targetType: AbilityTargetType;
  readonly defenseTarget: DefenseTarget;
  /** Triad attribute contributing to the d20 attack roll (e.g. 'finesse' for physical, 'focus' for spells) */
  readonly attackModifierAttribute?: keyof TriadAttributes;
  readonly damageType: DamageType;
  readonly damageProfile?: DiceProfile;
  readonly effect?: AbilityEffect;
  /** Blast AoE radius in hexes (undefined or 0 = single target hex, 1 = target + adjacent ring) */
  readonly aoeRadius?: number;
  /** Conditional bonuses applied when tactical conditions are met (e.g. Sneak Attack) */
  readonly conditionalBonus?: ConditionalBonus;
}


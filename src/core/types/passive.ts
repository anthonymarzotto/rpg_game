import { DerivedCombatVitals } from './stats';
import { AbilityEffect, ConditionType, DamageType } from './ability';

/**
 * Trigger hook for passive traits. Kept minimal with 'ALWAYS' for now.
 * Can be expanded with conditional hooks (e.g. 'ON_HIT', 'ON_KILL') in future phases.
 */
export type PassiveTriggerHook = 'ALWAYS' | 'BATTLE_START' | 'ON_MOVE' | 'ON_CRIT' | 'ON_HIT';

/**
 * Tactical conditions that can trigger passive roll modifiers during combat.
 */
export type PassiveCondition =
  | { readonly type: 'MOVED_MIN_DISTANCE'; readonly minHexes: number };

/**
 * Modifications applied to d20 attack rolls when a passive condition is met.
 */
export interface PassiveRollEffect {
  readonly grantsAdvantage?: boolean;
  /** Whether the effect is consumed on the first attack roll or persists */
  readonly consumeOnTrigger?: boolean;
}

export interface PassiveRollModifier {
  readonly condition: PassiveCondition;
  readonly effect: PassiveRollEffect;
}

export interface HealthThresholdEffect {
  /** Maximum HP percentage (0..1) below which this threshold is active (e.g. 0.5 for <= 50% max HP) */
  readonly maxPercent: number;
  /** Flat bonus damage added to attacks when threshold is active */
  readonly flatDamageBonus?: number;
  /** Natural d20 critical hit threshold when active (e.g. 19 for crits on 19-20) */
  readonly critThreshold?: number;
  /** Optional filter constraint for damage type (e.g. only PHYSICAL attacks) */
  readonly damageTypeFilter?: DamageType;
}

export interface TargetArmorBonusEffect {
  /** Minimum target effective armor required to activate the bonus (e.g. 1) */
  readonly minArmor: number;
  /** Flat bonus damage added to attacks when target meets armor threshold */
  readonly flatDamageBonus: number;
  /** Optional filter constraint for damage type (e.g. only PHYSICAL attacks) */
  readonly damageTypeFilter?: DamageType;
}

export interface TargetForceBonusEffect {
  /** If true, requires target base Force attribute to be strictly greater than actor base Force */
  readonly requireTargetForceExceedsActor?: boolean;
  /** Minimum target base Force required (e.g. 2) if requireTargetForceExceedsActor is not specified */
  readonly minForce?: number;
  /** Flat bonus damage added to attacks when target meets force condition */
  readonly flatDamageBonus: number;
  /** Optional filter constraint for damage type (e.g. only PHYSICAL attacks) */
  readonly damageTypeFilter?: DamageType;
}

export interface PassiveAuraEffect {
  /** Effective radius in hexes for the aura */
  readonly radius: number;
  /** Whether the aura protects allies (and self) or affects enemies */
  readonly targetScope: 'ALLIES' | 'ENEMIES';
  /** Optional directional combat arc restriction relative to the aura emitter's facing (e.g. 'FRONT') */
  readonly arc?: 'FRONT';
  /** Flat penalty applied to attack rolls made against units protected by this aura (or made by enemies inside this aura) */
  readonly attackRollPenalty?: number;
}

export interface PassiveConduitPulseEffect {
  /** Active condition type applied by this unit that designates the pulse conduit vessel (e.g. 'HENOSIS') */
  readonly linkedCondition: ConditionType;
  /** Whether to fall back to pulsing from the bearer themselves when no living linked conduit exists */
  readonly fallbackToSelf: boolean;
  /** Radius in hexes around the conduit unit to emit the pulse (e.g. 1 for adjacent ring) */
  readonly radius: number;
  /** Flat unmitigated damage dealt to each hostile unit within radius */
  readonly damage: number;
  /** Damage type of the pulse ('PHYSICAL' | 'MAGICAL') */
  readonly damageType: 'PHYSICAL' | 'MAGICAL';
  /** Floating combat text label emitted on struck enemies (e.g. 'SYNERGY') */
  readonly label: string;
}

export interface PassiveTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hook: PassiveTriggerHook;
  /** Flat modifications to derived combat vitals */
  readonly statModifiers?: Partial<DerivedCombatVitals>;
  /** Conditional roll modifiers (e.g. Momentum granting Advantage) */
  readonly rollModifier?: PassiveRollModifier;
  /** Flat collision and wall-slam damage bonus applied when this unit causes a collision */
  readonly collisionDamageBonus?: number;
  /** Whether the unit is immune to unmitigated fall impact damage (e.g. Feline Grace) */
  readonly immuneToFallDamage?: boolean;
  /** Whether the unit is immune to wall-slam and collision damage */
  readonly immuneToCollisionDamage?: boolean;
  /** Whether the unit is immune to forced displacement (knockback, pull, slide) */
  readonly immuneToDisplacement?: boolean;
  /** Whether the unit vaults onto cliffs or over obstacles when displaced by knockback */
  readonly canVaultOnKnockback?: boolean;
  /** Whether the unit vaults onto cliffs or over obstacles when displaced by retreat */
  readonly canVaultOnRetreat?: boolean;
  /** Whether the unit ignores upward low-ground attack roll penalties and disadvantage */
  readonly ignoresElevationPenalty?: boolean;
  /** Pluggable effect payload executed when the trigger hook fires */
  readonly effect?: AbilityEffect;
  /** Conditional modifiers active when unit HP is at or below a certain threshold */
  readonly healthThreshold?: HealthThresholdEffect;
  /** Conditional damage bonus active when target effective armor meets threshold */
  readonly targetArmorBonus?: TargetArmorBonusEffect;
  /** Conditional damage bonus active when target Force meets threshold or exceeds actor Force */
  readonly targetForceBonus?: TargetForceBonusEffect;
  /** Target-centric or proximity-based aura active on the battlefield */
  readonly aura?: PassiveAuraEffect;
  /** Optional filter constraint for trigger (e.g. only on MAGICAL Solid Hit / Critical Hit) */
  readonly triggerFilter?: {
    readonly damageType?: DamageType;
    readonly requireSolidHitOrCrit?: boolean;
  };
  /** Optional conduit-projected AoE damage pulse emitted when the passive hook triggers (e.g. Theurgic Synergy) */
  readonly conduitPulse?: PassiveConduitPulseEffect;
  /** If true, grants +1 Virtual Height per unspent AP on turn end (max +2) */
  readonly unspentApVirtualHeight?: boolean;
  /** Flat bonus damage when attacking a target at lower elevation (dh >= 1 or Virtual Height) */
  readonly lowerElevationDamageBonus?: number;
  /** If true, accumulates Zeroed In stacks on stationary turn end (+1 Range, +1 Attack Roll, -1 Evasion per stack, max 3; +1 AoE Radius at 3 stacks) */
  readonly stationaryCalibration?: boolean;
  /** If true, hostile AoEs, splashes, cones, and delayed bombardments never harm or debuff friendly units */
  readonly excludeFriendlyAoE?: boolean;
  /** If true, friendly units never obstruct Line of Sight for magical abilities */
  readonly ignoresAllyLoS?: boolean;
}

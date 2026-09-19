import { Unit, Faction } from '../types/unit';
import { Archetype } from '../types/class';
import { AbilityEffect, Ability } from '../types/ability';
import { PassiveTrait } from '../types/passive';
import { HexCoord } from '../grid/hex';
import { Arena, KnockbackResult } from '../grid/arena';

export type HitOutcome = 'CRITICAL_HIT' | 'SOLID_HIT' | 'GRAZE' | 'MISS';

export type CombatDamageReason =
  | 'ATTACK'
  | 'COLLISION'
  | 'COLLATERAL'
  | 'STATUS_TICK'
  | 'ENVIRONMENT';

export type DisplacementKind = 'KNOCKBACK' | 'RETREAT' | 'PULL' | 'TELEPORT';

export type CollisionKind = 'WALL' | 'UNIT' | 'CLIFF' | 'VOID';

/**
 * Atomic combat events produced during action resolution.
 */
export type CombatEvent =
  | {
      readonly type: 'DAMAGE';
      readonly targetUnitId: string;
      readonly amount: number;
      readonly damageType: 'PHYSICAL' | 'MAGICAL' | 'TRUE';
      readonly reason: CombatDamageReason;
      readonly sourceUnitId?: string;
      readonly isCrit?: boolean;
    }
  | {
      readonly type: 'DISPLACEMENT';
      readonly unitId: string;
      readonly fromCoord: HexCoord;
      readonly toCoord: HexCoord;
      readonly kind: DisplacementKind;
    }
  | {
      readonly type: 'COLLISION';
      readonly unitId: string;
      readonly collisionType: CollisionKind;
      readonly collidingUnitId?: string;
    }
  | {
      readonly type: 'STATUS_APPLIED';
      readonly targetUnitId: string;
      readonly modifier: ActiveModifier;
    };

/**
 * Detailed result of an attack roll and damage resolution.
 */
export interface AttackResolution {
  readonly hitOutcome: HitOutcome;
  readonly d20Roll: number;
  readonly modifier: number;
  readonly totalAttackScore: number;
  readonly defenseTargetScore: number;
  readonly rawDamage: number;
  readonly mitigation: number;
  readonly damageDealt: number;
  readonly damageBreakdown?: string;
  readonly effectsApplied: readonly AbilityEffect[];
  readonly knockbackResult?: KnockbackResult;
  readonly wallSlamDamage?: number;
  readonly events: readonly CombatEvent[];
}

/**
 * Archetype XP accumulated by a unit during the current battle.
 */
export interface InBattleXp {
  fighter: number;
  rogue: number;
  mage: number;
}

export type ModifiableCombatStat =
  | 'armor'
  | 'ward'
  | 'speed'
  | 'move'
  | 'evasion'
  | 'resolve';

/**
 * Active stat modifier (positive for buffs, negative for penalties)
 * tracking its remaining duration in turns.
 */
export interface ActiveModifier {
  readonly stat: ModifiableCombatStat;
  readonly value: number;
  durationTurns: number;
}

/**
 * Unified validation result for player actions (movement, abilities).
 */
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

/**
 * Tagged union representing the outcome of an executed ability.
 */
export type AbilityResolution =
  | { readonly type: 'ATTACK'; readonly details: AttackResolution }
  | {
      readonly type: 'BUFF';
      readonly targetUnitId: string;
      readonly modifierApplied: ActiveModifier;
      readonly events?: readonly CombatEvent[];
    };

/**
 * Combat wrapper managing a unit's dynamic in-battle state.
 */
export interface CombatUnit {
  readonly unit: Unit;
  faction?: Faction;
  currentHp: number;
  currentAp: number;
  initiativeGauge: number;
  isDefeated: boolean;
  inBattleXp: InBattleXp;
  activeModifiers: ActiveModifier[];
  /** Active combat abilities (Core + Wildcards) resolved from unit loadout */
  readonly abilities: readonly Ability[];
  /** Active passives (Innate + Wildcards) resolved from unit loadout */
  readonly passives: readonly PassiveTrait[];
}


/**
 * Structured entry in the transparent combat log.
 */
export interface CombatLogEntry {
  readonly turnNumber: number;
  readonly actorUnitId: string;
  readonly actionId: string;
  readonly message: string;
}

/**
 * Atomic conditions evaluated against a combat state.
 */
export type AtomicObjective =
  | { readonly kind: 'UNITS_DEFEATED'; readonly unitIds: readonly string[] }
  | { readonly kind: 'FACTION_DEFEATED'; readonly faction: Faction }
  | { readonly kind: 'ARCHETYPE_XP_EARNED'; readonly unitId: string; readonly archetype: Archetype; readonly amount: number }
  | { readonly kind: 'TURNS_ELAPSED'; readonly count: number };

/**
 * Composable condition tree supporting allOf and anyOf boolean logic.
 */
export type ObjectiveCondition =
  | AtomicObjective
  | { readonly allOf: readonly ObjectiveCondition[] }
  | { readonly anyOf: readonly ObjectiveCondition[] };

/**
 * Declarative encounter victory objective.
 */
export interface EncounterObjective {
  readonly id: string;
  readonly description: string;
  readonly condition: ObjectiveCondition;
}

/**
 * High-level lifecycle status of a combat encounter.
 */
export type CombatOutcome = 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';

/**
 * Complete state container for an active combat encounter.
 */
export interface CombatState {
  readonly arena: Arena;
  readonly units: Map<string, CombatUnit>;
  activeUnitId: string;
  turnNumber: number;
  readonly combatLog: CombatLogEntry[];
  outcome: CombatOutcome;
  readonly objectives?: readonly EncounterObjective[];
}


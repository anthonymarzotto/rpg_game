import { Unit } from '../types/unit';
import { AbilityEffect } from '../types/ability';
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
  currentHp: number;
  currentAp: number;
  initiativeGauge: number;
  isDefeated: boolean;
  inBattleXp: InBattleXp;
  activeModifiers: ActiveModifier[];
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
 * Complete state container for an active combat encounter.
 */
export interface CombatState {
  readonly arena: Arena;
  readonly units: Map<string, CombatUnit>;
  activeUnitId: string;
  turnNumber: number;
  readonly combatLog: CombatLogEntry[];
}

// -----------------------------------------------------------------------------
// Effective Combat Vitals Getters
// -----------------------------------------------------------------------------

export function getEffectiveStat(cu: CombatUnit, stat: ModifiableCombatStat): number {
  const base = cu.unit.effectiveVitals[stat];
  const modSum = cu.activeModifiers
    .filter((m) => m.stat === stat)
    .reduce((sum, m) => sum + m.value, 0);

  // Speed and Move have a minimum floor of 1
  if (stat === 'move' || stat === 'speed') {
    return Math.max(1, base + modSum);
  }
  return Math.max(0, base + modSum);
}

export function getEffectiveSpeed(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'speed');
}

export function getEffectiveMove(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'move');
}

export function getEffectiveArmor(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'armor');
}

export function getEffectiveWard(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'ward');
}

export function getEffectiveEvasion(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'evasion');
}

export function getEffectiveResolve(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'resolve');
}

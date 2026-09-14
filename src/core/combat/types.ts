import { Unit } from '../types/unit';
import { AbilityEffect } from '../types/ability';
import { Arena, KnockbackResult } from '../grid/arena';

export type HitOutcome = 'CRITICAL_HIT' | 'SOLID_HIT' | 'GRAZE' | 'MISS';

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
  readonly effectsApplied: readonly AbilityEffect[];
  readonly knockbackResult?: KnockbackResult;
  readonly wallSlamDamage?: number;
}

/**
 * Archetype XP accumulated by a unit during the current battle.
 */
export interface InBattleXp {
  fighter: number;
  rogue: number;
  mage: number;
}

/**
 * Temporary combat buffs active on a unit.
 */
export interface TemporaryBuffs {
  armor: number;
  ward: number;
  movePenalty: number;
}

/**
 * Combat wrapper for an active unit in the arena.
 */
export interface CombatUnit {
  unit: Unit;
  inBattleXp: InBattleXp;
  tempBuffs: TemporaryBuffs;
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

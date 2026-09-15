import { CombatState, CombatUnit, HitOutcome, CombatEvent } from '../types';
import { Ability, AbilityEffect } from '../../types/ability';
import { HexCoord } from '../../grid/hex';
import { DiceRoller } from '../dice';
import { KnockbackResult } from '../../grid/arena';

export interface EffectContext {
  readonly state: CombatState;
  readonly actorCu: CombatUnit;
  readonly targetCu?: CombatUnit;
  readonly targetCoord?: HexCoord;
  readonly ability: Ability;
  readonly hitOutcome: HitOutcome;
  readonly diceRoller: DiceRoller;
}

export interface EffectExecutionResult {
  readonly events: readonly CombatEvent[];
  readonly logDetail?: string;
  readonly knockbackResult?: KnockbackResult;
  readonly wallSlamDamage?: number;
}

export interface EffectHandler<T extends AbilityEffect = AbilityEffect> {
  apply(effect: T, ctx: EffectContext): EffectExecutionResult;
}

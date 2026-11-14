import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, ConditionType } from '../../types/ability';
import { ActiveCondition, CombatEvent, CombatUnit, EffectOutcome } from '../types';
import { getConditionDefinition } from '../conditions';
import { getDirectionBetween, hexEquals } from '../../grid/hex';

export function applyConditionToUnit(
  targetUnit: CombatUnit,
  conditionType: ConditionType,
  durationTurns: number,
  sourceUnitId: string,
  damagePerTurn?: number
): { condition: ActiveCondition; event: CombatEvent } {
  const def = getConditionDefinition(conditionType);
  const policy = def?.stackingPolicy ?? 'REFRESH_DURATION';
  const existing = targetUnit.activeConditions.find((c) => c.type === conditionType);

  let conditionToEmit: ActiveCondition;

  if (!existing) {
    conditionToEmit = {
      type: conditionType,
      durationTurns,
      sourceUnitId,
      ...(damagePerTurn !== undefined ? { damagePerTurn } : {})
    };
    targetUnit.activeConditions.push(conditionToEmit);
  } else {
    switch (policy) {
      case 'OVERRIDE_SOURCE': {
        existing.sourceUnitId = sourceUnitId;
        existing.durationTurns = durationTurns;
        conditionToEmit = existing;
        break;
      }
      case 'STACK_INTENSITY': {
        const incomingDmg = damagePerTurn ?? def?.defaultIntensity ?? 2;
        const currentDmg = existing.damagePerTurn ?? def?.defaultIntensity ?? 2;
        const maxDmg = def?.maxIntensity ?? 8;
        existing.damagePerTurn = Math.min(maxDmg, currentDmg + incomingDmg);
        existing.durationTurns = Math.max(existing.durationTurns, durationTurns);
        existing.sourceUnitId = sourceUnitId;
        conditionToEmit = existing;
        break;
      }
      case 'REFRESH_DURATION': {
        existing.durationTurns = Math.max(existing.durationTurns, durationTurns);
        existing.sourceUnitId = sourceUnitId;
        conditionToEmit = existing;
        break;
      }
      case 'IGNORE': {
        conditionToEmit = existing;
        break;
      }
    }
  }

  const event: CombatEvent = {
    type: 'STATUS_APPLIED',
    targetUnitId: targetUnit.unit.id,
    condition: conditionToEmit
  };

  return { condition: conditionToEmit, event };
}

export const conditionHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu, targetCu, ability, state } = ctx;

    // Resolve target unit: self-targeting or stealth defaults to actor; otherwise targetCu
    let targetUnit = targetCu;
    if (ability.targetType === 'SELF' || effect.conditionType === 'STEALTH') {
      targetUnit = actorCu;
    }

    if (!targetUnit) {
      return { events: [] };
    }

    // Determine condition type
    const conditionType: ConditionType | undefined = effect.conditionType;

    const events: CombatEvent[] = [];
    const effects: EffectOutcome[] = [];

    // If conditionType is present, apply ActiveCondition using its stacking policy
    if (conditionType) {
      const durationTurns = effect.durationTurns ?? 1;
      const damagePerTurn =
        conditionType === 'POISON' || conditionType === 'BURN'
          ? (effect.magnitude !== undefined && effect.magnitude > 0 ? effect.magnitude : 2)
          : undefined;

      const { condition: conditionToEmit, event } = applyConditionToUnit(
        targetUnit,
        conditionType,
        durationTurns,
        actorCu.unit.id,
        damagePerTurn
      );
      events.push(event);

      const resolvedDpt = conditionToEmit.damagePerTurn ?? damagePerTurn;
      effects.push({
        kind: 'CONDITION',
        condition: conditionType,
        durationTurns: conditionToEmit.durationTurns,
        ...(resolvedDpt !== undefined ? { damagePerTurn: resolvedDpt } : {}),
        ...(conditionType === 'CHALLENGED' ? { sourceName: actorCu.unit.name } : {}),
        ...(targetUnit.unit.id !== actorCu.unit.id ? { targetName: targetUnit.unit.name } : {})
      });
    }

    // Force facing: if explicit FORCE_FACING, turn target to face actor
    if (effect.type === 'FORCE_FACING') {
      const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
      const targetPos = state.arena.getUnitPosition(targetUnit.unit.id);
      if (actorPos && targetPos && targetUnit.unit.id !== actorCu.unit.id) {
        targetUnit.facing = getDirectionBetween(targetPos, actorPos);
        effects.push({
          kind: 'FORCED_FACING',
          direction: 'TOWARDS',
          originName: actorCu.unit.name
        });
      }
    } else if (effect.type === 'FORCE_FACING_AWAY') {
      const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
      const targetPos = state.arena.getUnitPosition(targetUnit.unit.id);
      if (targetPos) {
        const originPos =
          ctx.targetCoord && !hexEquals(targetPos, ctx.targetCoord)
            ? ctx.targetCoord
            : actorPos;
        if (originPos && !hexEquals(targetPos, originPos)) {
          const dirToOrigin = getDirectionBetween(targetPos, originPos);
          targetUnit.facing = ((dirToOrigin + 3) % 6) as any;
          effects.push({
            kind: 'FORCED_FACING',
            direction: 'AWAY',
            originName: originPos === ctx.targetCoord ? 'blast center' : actorCu.unit.name
          });
        }
      }
    }

    return {
      events,
      ...(effects.length > 0 ? { effects } : {})
    };
  }
};

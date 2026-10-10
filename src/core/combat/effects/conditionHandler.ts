import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, ConditionType } from '../../types/ability';
import { ActiveCondition, CombatEvent } from '../types';
import { getDirectionBetween, hexEquals } from '../../grid/hex';

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
    let logDetail = '';

    // If conditionType is present, apply ActiveCondition
    if (conditionType) {
      const durationTurns = effect.durationTurns ?? 1;
      const damagePerTurn =
        conditionType === 'POISON' || conditionType === 'BURN'
          ? (effect.magnitude !== undefined && effect.magnitude > 0 ? effect.magnitude : 2)
          : undefined;

      const condition: ActiveCondition = {
        type: conditionType,
        durationTurns,
        sourceUnitId: actorCu.unit.id,
        ...(damagePerTurn !== undefined ? { damagePerTurn } : {})
      };

      targetUnit.activeConditions.push(condition);

      events.push({
        type: 'STATUS_APPLIED',
        targetUnitId: targetUnit.unit.id,
        condition
      });

      switch (conditionType) {
        case 'POISON':
          logDetail += ` 🧪 [Poisoned: ${damagePerTurn} dmg/turn for ${durationTurns} turns]`;
          break;
        case 'BURN':
          logDetail += ` 🔥 [Burned: ${damagePerTurn} dmg/turn for ${durationTurns} turns]`;
          break;
        case 'CHALLENGED':
          logDetail += ` ⚔️ [Challenged by ${actorCu.unit.name} for ${durationTurns} turns]`;
          break;
        case 'STEALTH':
          logDetail += ` 👤 [Stealthed for ${durationTurns} turn(s)]`;
          break;
      }
    }

    // Force facing: if CHALLENGED or explicit FORCE_FACING, turn target to face actor
    if (conditionType === 'CHALLENGED' || effect.type === 'FORCE_FACING') {
      const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
      const targetPos = state.arena.getUnitPosition(targetUnit.unit.id);
      if (actorPos && targetPos && targetUnit.unit.id !== actorCu.unit.id) {
        targetUnit.facing = getDirectionBetween(targetPos, actorPos);
        logDetail += ` 🔄 [Forced facing towards ${actorCu.unit.name}]`;
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
          logDetail += ` 🔄 [Forced facing away from ${originPos === ctx.targetCoord ? 'blast center' : actorCu.unit.name}]`;
        }
      }
    }

    return {
      events,
      logDetail
    };
  }
};

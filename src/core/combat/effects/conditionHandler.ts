import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, ConditionType } from '../../types/ability';
import { ActiveCondition, CombatEvent } from '../types';
import { getConditionDefinition } from '../conditions';
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

    // If conditionType is present, apply ActiveCondition using its stacking policy
    if (conditionType) {
      const durationTurns = effect.durationTurns ?? 1;
      const damagePerTurn =
        conditionType === 'POISON' || conditionType === 'BURN'
          ? (effect.magnitude !== undefined && effect.magnitude > 0 ? effect.magnitude : 2)
          : undefined;

      const def = getConditionDefinition(conditionType);
      const policy = def?.stackingPolicy ?? 'REFRESH_DURATION';
      const existing = targetUnit.activeConditions.find((c) => c.type === conditionType);

      let conditionToEmit: ActiveCondition;

      if (!existing) {
        conditionToEmit = {
          type: conditionType,
          durationTurns,
          sourceUnitId: actorCu.unit.id,
          ...(damagePerTurn !== undefined ? { damagePerTurn } : {})
        };
        targetUnit.activeConditions.push(conditionToEmit);
      } else {
        switch (policy) {
          case 'OVERRIDE_SOURCE': {
            // Taunt Steal: overwrite challenger, refresh duration
            existing.sourceUnitId = actorCu.unit.id;
            existing.durationTurns = durationTurns;
            conditionToEmit = existing;
            break;
          }
          case 'STACK_INTENSITY': {
            // DoT intensity stacking: increment damagePerTurn up to maxIntensity (cap 8), refresh duration
            const incomingDmg = damagePerTurn ?? def?.defaultIntensity ?? 2;
            const currentDmg = existing.damagePerTurn ?? def?.defaultIntensity ?? 2;
            const maxDmg = def?.maxIntensity ?? 8;
            existing.damagePerTurn = Math.min(maxDmg, currentDmg + incomingDmg);
            existing.durationTurns = Math.max(existing.durationTurns, durationTurns);
            existing.sourceUnitId = actorCu.unit.id;
            conditionToEmit = existing;
            break;
          }
          case 'REFRESH_DURATION': {
            existing.durationTurns = Math.max(existing.durationTurns, durationTurns);
            existing.sourceUnitId = actorCu.unit.id;
            conditionToEmit = existing;
            break;
          }
          case 'IGNORE': {
            conditionToEmit = existing;
            break;
          }
        }
      }

      events.push({
        type: 'STATUS_APPLIED',
        targetUnitId: targetUnit.unit.id,
        condition: conditionToEmit
      });

      switch (conditionType) {
        case 'POISON':
          logDetail += ` 🧪 [Poisoned: ${conditionToEmit.damagePerTurn ?? damagePerTurn} dmg/turn for ${conditionToEmit.durationTurns} turns]`;
          break;
        case 'BURN':
          logDetail += ` 🔥 [Burned: ${conditionToEmit.damagePerTurn ?? damagePerTurn} dmg/turn for ${conditionToEmit.durationTurns} turns]`;
          break;
        case 'CHALLENGED':
          logDetail += ` ⚔️ [Challenged by ${actorCu.unit.name} for ${conditionToEmit.durationTurns} turns]`;
          break;
        case 'STEALTH':
          logDetail += ` 👤 [Stealthed for ${conditionToEmit.durationTurns} turn(s)]`;
          break;
      }
    }

    // Force facing: if explicit FORCE_FACING, turn target to face actor
    if (effect.type === 'FORCE_FACING') {
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

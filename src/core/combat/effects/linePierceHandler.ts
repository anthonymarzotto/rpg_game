import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { getDirectionBetween, getHexNeighbor } from '../../grid/hex';
import { resolveDamage } from '../damageEngine';
import { CombatEvent } from '../types';

export const linePierceHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu, ability, diceRoller, hitOutcome } = ctx;
    if (hitOutcome === 'MISS') {
      return { events: [] };
    }
    const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
    const targetPos = targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : undefined;

    if (!actorPos || !targetPos || !targetCu) {
      return { events: [] };
    }

    const dir = getDirectionBetween(actorPos, targetPos);
    const rearHex = getHexNeighbor(targetPos, dir);

    const secondaryUnitId = state.arena.getUnitAt(rearHex);
    if (!secondaryUnitId || secondaryUnitId === actorCu.unit.id || secondaryUnitId === targetCu.unit.id) {
      return { events: [] };
    }

    const secondaryTarget = state.units.get(secondaryUnitId);
    if (!secondaryTarget || secondaryTarget.isDefeated || secondaryTarget.currentHp <= 0) {
      return { events: [] };
    }

    // Avoid friendly fire
    if (actorCu.faction && secondaryTarget.faction && actorCu.faction === secondaryTarget.faction) {
      return { events: [] };
    }

    const pierceDamageEffect: AbilityEffect = {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'force'
      }
    };

    const damageResult = resolveDamage(
      'SOLID_HIT',
      ability,
      actorCu,
      secondaryTarget,
      diceRoller,
      undefined,
      pierceDamageEffect
    );

    const events: CombatEvent[] = [];
    if (damageResult.damageDealt > 0) {
      events.push({
        type: 'DAMAGE',
        targetUnitId: secondaryTarget.unit.id,
        amount: damageResult.damageDealt,
        damageType: 'PHYSICAL',
        reason: 'COLLATERAL',
        label: 'PIERCING_THRUST',
        sourceUnitId: actorCu.unit.id,
        isCrit: false
      });
    }

    return {
      events,
      logDetail: ` 🗡️ [Piercing Thrust hit ${secondaryTarget.unit.name} for ${damageResult.damageDealt} collateral damage]`
    };
  }
};

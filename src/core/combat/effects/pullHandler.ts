import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { getHexLine, hexDistance } from '../../grid/hex';
import { CombatEvent, EffectOutcome } from '../types';
import { calculateRawFallDamage } from '../../grid/arena';
import { resolveFallDamage } from '../damageEngine';
import { DISPLACEMENT_CONFIG } from '../../config/balance';
import { isDisplacementImmune } from '../displacementImmunity';

export const pullHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    if (!targetCu) {
      return { events: [] };
    }

    const actorCoord = ctx.originCoord ?? state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    if (isDisplacementImmune(targetCu)) {
      return {
        events: [],
        effects: [{ kind: 'DISPLACEMENT', displacement: 'PULL', resisted: true }]
      };
    }

    const dist = hexDistance(targetCoord, actorCoord);
    if (dist <= 1) {
      return { events: [] };
    }

    const targetTile = state.arena.getTile(targetCoord);
    if (!targetTile) {
      return { events: [] };
    }

    const pullSteps = Math.max(1, effect.magnitude ?? 1);
    const line = getHexLine(targetCoord, actorCoord);
    let currentCoord = targetCoord;
    let currentElevation = targetTile.elevation;
    let totalFallDamage = 0;
    let fallOccurred = false;
    let fallNegated = false;

    const maxStepIndex = Math.min(pullSteps, line.length - 2);
    for (let i = 1; i <= maxStepIndex; i++) {
      const nextCoord = line[i];
      const nextTile = state.arena.getTile(nextCoord);
      if (!nextTile || !nextTile.isWalkable || nextTile.occupiedByUnitId) {
        break;
      }

      const dh = nextTile.elevation - currentElevation;
      if (dh > DISPLACEMENT_CONFIG.maxClimbElevation) {
        break;
      }

      const rawFall = calculateRawFallDamage(dh);
      if (rawFall > 0) {
        fallOccurred = true;
        const resolvedFall = resolveFallDamage(targetCu, rawFall);
        if (resolvedFall > 0) {
          totalFallDamage += resolvedFall;
        } else {
          fallNegated = true;
        }
      }

      currentCoord = nextCoord;
      currentElevation = nextTile.elevation;
    }

    if (currentCoord.q === targetCoord.q && currentCoord.r === targetCoord.r) {
      return { events: [] };
    }

    const label = resolveEffectShout(effect.shout, 'target');
    const events: CombatEvent[] = [
      {
        type: 'DISPLACEMENT',
        unitId: targetCu.unit.id,
        fromCoord: targetCoord,
        toCoord: currentCoord,
        kind: 'PULL',
        ...(label !== undefined ? { label } : {})
      }
    ];

    const effects: EffectOutcome[] = [
      {
        kind: 'DISPLACEMENT',
        displacement: 'PULL',
        toCoord: currentCoord
      }
    ];

    if (fallOccurred) {
      if (totalFallDamage > 0) {
        events.push({
          type: 'DAMAGE',
          targetUnitId: targetCu.unit.id,
          amount: totalFallDamage,
          damageType: 'PHYSICAL',
          reason: 'FALL',
          sourceUnitId: actorCu.unit.id
        });
        effects.push({
          kind: 'FALL',
          damage: totalFallDamage
        });
      } else if (fallNegated) {
        effects.push({
          kind: 'FALL',
          damage: 0,
          negated: true
        });
      }
    }

    return {
      events,
      effects,
      ...(totalFallDamage > 0 ? { fallDamage: totalFallDamage } : {})
    };
  }
};

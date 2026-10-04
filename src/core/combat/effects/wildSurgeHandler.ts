import { CombatState, CombatUnit, CombatEvent } from '../types';
import { Ability, AbilityEffect } from '../../types/ability';
import { DiceRoller } from '../dice';
import { hexDistance } from '../../grid/hex';
import { EffectHandler, EffectContext, EffectExecutionResult } from './types';

export interface CriticalHitContext {
  state: CombatState;
  actorCu: CombatUnit;
  targetCu?: CombatUnit;
  ability: Ability;
  diceRoller: DiceRoller;
}

/**
 * Handles spontaneous Wild Surge triggers when a Sorcerer lands a critical hit with a magic spell.
 * Rolls 1d3:
 * 1: +1 AP refund (capped at maxAp)
 * 2: +25 CTB initiative gauge boost
 * 3: 2 magic damage to a random enemy within 3 hexes
 */
export function handleWildSurge(ctx: CriticalHitContext): CombatEvent[] {
  const { state, actorCu, diceRoller } = ctx;
  const events: CombatEvent[] = [];

  const roll = diceRoller.rollDice(1, 3);

  if (roll === 1) {
    const maxAp = actorCu.unit.effectiveVitals.maxAp;
    actorCu.currentAp = Math.min(maxAp, actorCu.currentAp + 1);
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId: actorCu.unit.id,
      actionId: 'wild_surge',
      message: ` 🌀 [Wild Surge: Chrono-Resonance restores +1 AP!] (Current AP: ${actorCu.currentAp})`
    });
  } else if (roll === 2) {
    actorCu.initiativeGauge += 25;
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId: actorCu.unit.id,
      actionId: 'wild_surge',
      message: ` 🌀 [Wild Surge: Aetherial Surge grants +25 CTB Gauge!] (Current Gauge: ${actorCu.initiativeGauge})`
    });
  } else {
    const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
    let targetEnemy: CombatUnit | undefined = undefined;
    if (actorPos) {
      const candidates: CombatUnit[] = [];
      for (const otherCu of state.units.values()) {
        if (
          otherCu.unit.id !== actorCu.unit.id &&
          !otherCu.isDefeated &&
          otherCu.currentHp > 0 &&
          actorCu.faction !== otherCu.faction
        ) {
          const pos = state.arena.getUnitPosition(otherCu.unit.id);
          if (pos && hexDistance(actorPos, pos) <= 3) {
            candidates.push(otherCu);
          }
        }
      }
      if (candidates.length > 0) {
        const rollIdx = diceRoller.rollDice(1, candidates.length) - 1;
        const clampedIdx = Math.max(0, Math.min(candidates.length - 1, rollIdx));
        targetEnemy = candidates[clampedIdx];
      }
    }

    if (targetEnemy) {
      const surgeEvent: CombatEvent = {
        type: 'DAMAGE',
        targetUnitId: targetEnemy.unit.id,
        amount: 2,
        damageType: 'MAGICAL',
        reason: 'COLLATERAL',
        sourceUnitId: actorCu.unit.id,
        isCrit: false
      };
      events.push(surgeEvent);
      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId: actorCu.unit.id,
        actionId: 'wild_surge',
        message: ` 🌀 [Wild Surge: Arcane Discharge strikes ${targetEnemy.unit.name} for 2 magic damage!] (HP: ${Math.max(0, targetEnemy.currentHp - 2)}/${targetEnemy.unit.effectiveVitals.maxHp})`
      });
    }
  }

  return events;
}

export const wildSurgeHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const events = handleWildSurge(ctx as CriticalHitContext);
    return { events };
  }
};

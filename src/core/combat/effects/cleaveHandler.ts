import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { getHexNeighbors, hexEquals } from '../../grid/hex';
import { resolveDamage } from '../damageEngine';
import { CombatEvent, CombatUnit, EffectOutcome } from '../types';

export const cleaveHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu, ability, diceRoller } = ctx;
    const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
    const targetPos = targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : undefined;

    if (!actorPos || !targetPos || !targetCu) {
      return { events: [] };
    }

    // Identify shared adjacent hexes forming the frontal arc between actor and target
    const actorNeighbors = getHexNeighbors(actorPos);
    const targetNeighbors = getHexNeighbors(targetPos);
    const sharedHexes = actorNeighbors.filter((a) =>
      targetNeighbors.some((t) => hexEquals(a, t))
    );

    // Find eligible living enemy candidates occupying the frontal sweep hexes
    const candidates: CombatUnit[] = [];
    for (const hex of sharedHexes) {
      const occupantId = state.arena.getUnitAt(hex);
      if (occupantId && occupantId !== actorCu.unit.id && occupantId !== targetCu.unit.id) {
        const cu = state.units.get(occupantId);
        if (cu && !cu.isDefeated && cu.currentHp > 0) {
          // Avoid friendly fire
          if (!actorCu.faction || !cu.faction || actorCu.faction !== cu.faction) {
            candidates.push(cu);
          }
        }
      }
    }

    if (candidates.length === 0) {
      return { events: [] };
    }

    // Prioritize lowest current HP among frontal candidates
    candidates.sort((a, b) => a.currentHp - b.currentHp);
    const maxTargets = effect.magnitude && effect.magnitude > 0 ? effect.magnitude : 1;
    const secondaryTargets = candidates.slice(0, maxTargets);

    const events: CombatEvent[] = [];
    const effects: EffectOutcome[] = [];
    const damageType: 'PHYSICAL' | 'MAGICAL' =
      ability.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL';

    for (const secondaryTarget of secondaryTargets) {
      // Resolve collateral damage against the secondary target
      const damageResult = resolveDamage(
        'SOLID_HIT',
        ability,
        actorCu,
        secondaryTarget,
        diceRoller
      );

      if (damageResult.damageDealt > 0) {
        events.push({
          type: 'DAMAGE',
          targetUnitId: secondaryTarget.unit.id,
          amount: damageResult.damageDealt,
          damageType,
          reason: 'COLLATERAL',
          label: 'CLEAVE',
          sourceUnitId: actorCu.unit.id,
          isCrit: false
        });
      }
      effects.push({
        kind: 'COLLATERAL_HIT',
        sourceLabel: 'Cleave',
        targetName: secondaryTarget.unit.name,
        damage: damageResult.damageDealt,
        damageType,
        targetHp: Math.max(0, secondaryTarget.currentHp - damageResult.damageDealt),
        targetMaxHp: secondaryTarget.unit.effectiveVitals.maxHp
      });
    }

    return {
      events,
      effects
    };
  }
};

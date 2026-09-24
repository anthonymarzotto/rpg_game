import { CombatState, CombatUnit } from '../combat/types';
import { HexCoord, hexDistance, hexEquals, CombatArc, getCombatArc } from '../grid/hex';
import { getEffectiveMove } from '../combat/effectiveVitals';
import { computeAbilityMetrics, AbilityMetrics } from '../combat/targetPreview';
import { executeMove, executeAbility, isFlankOrRear } from '../combat/resolver';
import { endActiveTurn } from '../combat/turnClock';
import { SeededDiceRoller } from '../combat/dice';
import { AIAction, AIDecisionOptions, MoveAIAction, AbilityAIAction } from './types';
import {
  resolveAIProfile,
  getArchetypeWeights,
  scoreFinishingBlow,
  scoreVulnerability,
  scoreFlankOpportunity,
  scoreStandoffDistance,
  scoreFocusFire
} from './heuristics';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Decides the single next highest-utility action for the active AI combat unit.
 */
export function decideNextAction(
  state: CombatState,
  actorUnitId: string,
  options?: AIDecisionOptions
): AIAction {
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated || cu.currentAp <= 0 || state.activeUnitId !== actorUnitId) {
    return {
      type: 'CONSERVE_AP',
      unspentAp: cu?.currentAp ?? 0,
      score: 0,
      reason: 'No AP remaining or unit not active'
    };
  }

  const currentCoord = state.arena.getUnitPosition(actorUnitId);
  if (!currentCoord) {
    return {
      type: 'CONSERVE_AP',
      unspentAp: cu.currentAp,
      score: 0,
      reason: 'Actor not placed on arena'
    };
  }

  const profile = resolveAIProfile(cu, options?.profileOverride);
  const weights = getArchetypeWeights(profile, options?.weightsOverride);
  const diceRoller = options?.diceRoller ?? defaultDiceRoller;

  const candidateActions: AIAction[] = [];

  // Identify hostile and friendly units
  const hostileUnits = Array.from(state.units.values()).filter(
    (u) => !u.isDefeated && u.faction && u.faction !== cu.faction
  );
  const alliedUnits = Array.from(state.units.values()).filter(
    (u) => !u.isDefeated && u.faction && u.faction === cu.faction
  );

  // 1. Evaluate immediate abilities from current hex
  for (const ability of cu.abilities) {
    if (cu.currentAp < ability.apCost) continue;

    if (ability.targetType === 'SINGLE_TARGET') {
      for (const targetCu of hostileUnits) {
        const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
        if (!targetCoord) continue;

        const metrics = computeAbilityMetrics(
          state,
          actorUnitId,
          ability,
          targetCoord,
          currentCoord
        );
        if (!metrics || !metrics.hasLoS) continue;

        const kill = scoreFinishingBlow(targetCu, metrics.expectedDamage, weights.killBonus);
        const damageScore = metrics.expectedDamage * weights.expectedDamageWeight;
        const vulnScore = scoreVulnerability(metrics, weights.vulnerabilityWeight);
        const flank = scoreFlankOpportunity(metrics.combatArc, metrics.isFlankAdvantage, weights.flankWeight);
        const focusScore = scoreFocusFire(targetCu, weights.focusFireWeight);
        const standoff = scoreStandoffDistance(
          hexDistance(currentCoord, targetCoord),
          weights.preferredStandoffRange,
          weights.standoffWeight
        );

        const totalScore = kill.score + damageScore + vulnScore + flank.score + focusScore + standoff;

        const reasons: string[] = [];
        if (kill.reason) reasons.push(kill.reason);
        if (flank.reason) reasons.push(flank.reason);
        if (reasons.length === 0) {
          reasons.push(`Strike ${targetCu.unit.name} (Exp Dmg: ${metrics.expectedDamage})`);
        }

        candidateActions.push({
          type: 'ABILITY',
          ability,
          target: { coord: targetCoord, targetUnitId: targetCu.unit.id },
          score: Math.round(totalScore * 10) / 10,
          reason: reasons.join('; ')
        });
      }
    } else if (ability.targetType === 'ALLY' || ability.damageType === 'NONE') {
      for (const allyCu of alliedUnits) {
        const allyCoord = state.arena.getUnitPosition(allyCu.unit.id);
        if (!allyCoord) continue;

        const metrics = computeAbilityMetrics(
          state,
          actorUnitId,
          ability,
          allyCoord,
          currentCoord
        );
        if (!metrics || !metrics.hasLoS) continue;

        // Buff value heuristic: prioritize damaged allies or buffing self/frontline
        const maxHp = allyCu.unit.effectiveVitals.maxHp;
        const missingHp = maxHp - allyCu.currentHp;
        const buffScore = 15 + missingHp * 2;

        candidateActions.push({
          type: 'ABILITY',
          ability,
          target: { coord: allyCoord, targetUnitId: allyCu.unit.id },
          score: Math.round(buffScore * 10) / 10,
          reason: `Buff ally ${allyCu.unit.name} with ${ability.name}`
        });
      }
    }
  }

  // 2. Evaluate composite move-and-act options
  if (cu.currentAp >= 1 && cu.unit.effectiveVitals.move > 0) {
    const reachable = state.arena.getReachableHexes(currentCoord, getEffectiveMove(cu));

    for (const candCoord of reachable) {
      if (hexEquals(candCoord, currentCoord)) continue;

      let bestAttackFromCand: { score: number; ability: typeof cu.abilities[0]; targetCu: CombatUnit; reason: string } | null = null;

      // Check if moving here enables a follow-up attack this turn
      const remainingAp = cu.currentAp - 1;
      for (const ability of cu.abilities) {
        if (remainingAp < ability.apCost) continue;
        if (ability.targetType !== 'SINGLE_TARGET') continue;

        for (const targetCu of hostileUnits) {
          const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
          if (!targetCoord) continue;

          const metrics = computeAbilityMetrics(
            state,
            actorUnitId,
            ability,
            targetCoord,
            candCoord
          );
          if (!metrics || !metrics.hasLoS) continue;

          const kill = scoreFinishingBlow(targetCu, metrics.expectedDamage, weights.killBonus);
          const damageScore = metrics.expectedDamage * weights.expectedDamageWeight;
          const vulnScore = scoreVulnerability(metrics, weights.vulnerabilityWeight);
          const flank = scoreFlankOpportunity(metrics.combatArc, metrics.isFlankAdvantage, weights.flankWeight);
          const focusScore = scoreFocusFire(targetCu, weights.focusFireWeight);
          const standoff = scoreStandoffDistance(
            hexDistance(candCoord, targetCoord),
            weights.preferredStandoffRange,
            weights.standoffWeight
          );

          // Deduct 1 AP movement cost from utility
          const moveNetScore = kill.score + damageScore + vulnScore + flank.score + focusScore + standoff - 2;

          if (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score) {
            const reasons: string[] = [];
            if (flank.reason) reasons.push(flank.reason);
            if (kill.reason) reasons.push(kill.reason);
            if (weights.standoffWeight > 0) {
              reasons.push(
                hexDistance(candCoord, targetCoord) === weights.preferredStandoffRange
                  ? `Ideal standoff range (${weights.preferredStandoffRange})`
                  : `Standoff range (${hexDistance(candCoord, targetCoord)}/${weights.preferredStandoffRange})`
              );
            }
            reasons.push(`Enables ${ability.name} on ${targetCu.unit.name}`);

            bestAttackFromCand = {
              score: moveNetScore,
              ability,
              targetCu,
              reason: reasons.join('; ')
            };
          }
        }
      }

      if (bestAttackFromCand) {
        candidateActions.push({
          type: 'MOVE',
          destination: candCoord,
          score: Math.round(bestAttackFromCand.score * 10) / 10,
          reason: `Move to (${candCoord.q}, ${candCoord.r}) — ${bestAttackFromCand.reason}`
        });
      } else {
        // No immediate follow-up attack possible with remaining AP.
        // Evaluate closing distance or repositioning toward preferred standoff distance.
        let bestRepositionScore = -Infinity;
        let repositionReason = '';

        for (const targetCu of hostileUnits) {
          const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
          if (!targetCoord) continue;

          const currentDist = hexDistance(currentCoord, targetCoord);
          const candDist = hexDistance(candCoord, targetCoord);

          if (profile === 'SNIPER') {
            // Sniper evaluates how close candCoord is to preferredStandoffRange
            const currentDev = Math.abs(currentDist - weights.preferredStandoffRange);
            const candDev = Math.abs(candDist - weights.preferredStandoffRange);
            if (candDev < currentDev && state.arena.hasLineOfSight(candCoord, targetCoord)) {
              const score = (currentDev - candDev) * 5;
              if (score > bestRepositionScore) {
                bestRepositionScore = score;
                repositionReason = `Repositioning to standoff distance ${weights.preferredStandoffRange} with LoS to ${targetCu.unit.name}`;
              }
            }
          } else {
            // Melee/Skirmisher evaluates closing distance and moving toward flank/rear
            if (candDist < currentDist) {
              const targetFacing = targetCu.facing;
              const arc = getCombatArc(targetFacing, targetCoord, candCoord);
              const flankBonus = arc === 'REAR' ? 6 : arc === 'FLANK' ? 3 : 0;
              const score = (currentDist - candDist) * 3 + flankBonus;

              if (score > bestRepositionScore) {
                bestRepositionScore = score;
                repositionReason = `Approaching ${targetCu.unit.name} (dist ${currentDist} -> ${candDist})${flankBonus > 0 ? ` [${arc} angle]` : ''}`;
              }
            }
          }
        }

        if (bestRepositionScore > 0) {
          candidateActions.push({
            type: 'MOVE',
            destination: candCoord,
            score: Math.round(bestRepositionScore * 10) / 10,
            reason: `Move to (${candCoord.q}, ${candCoord.r}) — ${repositionReason}`
          });
        }
      }
    }
  }

  // 3. AP Conservation check: Compare best candidate against conservation threshold
  if (candidateActions.length === 0) {
    return {
      type: 'CONSERVE_AP',
      unspentAp: cu.currentAp,
      score: 0,
      reason: `Conserving ${cu.currentAp} AP for +${cu.currentAp * 20} CTB gauge (no legal actions)`
    };
  }

  // Sort descending by score
  candidateActions.sort((a, b) => b.score - a.score);
  const bestCandidate = candidateActions[0];

  if (bestCandidate.score < weights.apConservationThreshold) {
    return {
      type: 'CONSERVE_AP',
      unspentAp: cu.currentAp,
      score: 0,
      reason: `Conserving ${cu.currentAp} AP for +${cu.currentAp * 20} CTB gauge (best action score ${bestCandidate.score} < threshold ${weights.apConservationThreshold})`
    };
  }

  // 4. Seeded dice tie-breaking among candidates with identical top scores (within 0.01)
  const tiedCandidates = candidateActions.filter(
    (c) => Math.abs(c.score - bestCandidate.score) <= 0.01
  );

  if (tiedCandidates.length === 1) {
    return tiedCandidates[0];
  }

  const rollIndex = diceRoller.rollDice(1, tiedCandidates.length) - 1;
  return tiedCandidates[rollIndex];
}

/**
 * Headless turn runner that executes AI decisions iteratively until AP is exhausted
 * or conserved, concluding the turn cleanly with CTB gauge recovery.
 */
export function executeAiTurn(
  state: CombatState,
  actorUnitId: string,
  options?: AIDecisionOptions
): readonly AIAction[] {
  const executedActions: AIAction[] = [];
  let steps = 0;
  const maxSteps = 10; // Safety guard against infinite loops

  while (steps < maxSteps) {
    steps++;
    const cu = state.units.get(actorUnitId);
    if (!cu || cu.isDefeated || cu.currentAp <= 0 || state.activeUnitId !== actorUnitId || state.outcome !== 'IN_PROGRESS') {
      break;
    }

    const action = decideNextAction(state, actorUnitId, options);
    executedActions.push(action);

    if (action.type === 'CONSERVE_AP') {
      break;
    } else if (action.type === 'MOVE') {
      executeMove(state, actorUnitId, action.destination);
    } else if (action.type === 'ABILITY') {
      executeAbility(state, actorUnitId, action.ability, action.target, options?.diceRoller);
    }
  }

  // Conclude the turn and apply CTB recovery for any remaining unspent AP
  endActiveTurn(state);
  return executedActions;
}

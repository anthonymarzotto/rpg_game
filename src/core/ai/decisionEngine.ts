import { CombatState, CombatUnit, AbilityResolution } from '../combat/types';
import { HexCoord, hexDistance, hexEquals, getCombatArc } from '../grid/hex';
import { getEffectiveMove } from '../combat/effectiveVitals';
import { computeAbilityMetrics } from '../combat/targetPreview';
import { canExecuteAbility, getAbilityRangeCoords } from '../combat/validator';
import { getEffectiveAbility } from '../combat/modifiers';
import { executeMove, executeAbility } from '../combat/resolver';
import { endActiveTurn } from '../combat/turnClock';
import { SeededDiceRoller, DiceRoller } from '../combat/dice';
import { Ability } from '../types/ability';
import {
  AIAction,
  AIDecisionOptions,
  AICandidateEvaluation,
  AIDecisionTrace,
  AIDecisionResult
} from './types';
import {
  resolveAIProfile,
  getArchetypeWeights,
  scoreFinishingBlow,
  scoreVulnerability,
  scoreFlankOpportunity,
  scoreStandoffDistance,
  scoreFocusFire,
  scoreBuffAbility,
  scoreDebuffAndUtility
} from './heuristics';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Decides the single next highest-utility action along with diagnostic candidate evaluation telemetry.
 */
export function decideNextActionWithTrace(
  state: CombatState,
  actorUnitId: string,
  options?: AIDecisionOptions
): AIDecisionResult {
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated || cu.currentAp <= 0 || state.activeUnitId !== actorUnitId) {
    const fallbackAction: AIAction = {
      type: 'CONSERVE_AP',
      unspentAp: cu?.currentAp ?? 0,
      score: 0,
      reason: 'No AP remaining or unit not active'
    };
    return {
      action: fallbackAction,
      trace: {
        turnNumber: state.turnNumber,
        actorUnitId,
        actorName: cu?.unit.name ?? actorUnitId,
        profile: cu ? resolveAIProfile(cu, options?.profileOverride) : 'BRAWLER',
        weights: getArchetypeWeights(cu ? resolveAIProfile(cu, options?.profileOverride) : 'BRAWLER', options?.weightsOverride),
        currentAp: cu?.currentAp ?? 0,
        chosenAction: fallbackAction,
        topCandidates: [],
        totalCandidatesEvaluated: 0,
        apConservationThreshold: 0,
        timestamp: Date.now()
      }
    };
  }

  const currentCoord = state.arena.getUnitPosition(actorUnitId);
  if (!currentCoord) {
    const fallbackAction: AIAction = {
      type: 'CONSERVE_AP',
      unspentAp: cu.currentAp,
      score: 0,
      reason: 'Actor not placed on arena'
    };
    const profile = resolveAIProfile(cu, options?.profileOverride);
    const weights = getArchetypeWeights(profile, options?.weightsOverride);
    return {
      action: fallbackAction,
      trace: {
        turnNumber: state.turnNumber,
        actorUnitId,
        actorName: cu.unit.name,
        profile,
        weights,
        currentAp: cu.currentAp,
        chosenAction: fallbackAction,
        topCandidates: [],
        totalCandidatesEvaluated: 0,
        apConservationThreshold: weights.apConservationThreshold,
        timestamp: Date.now()
      }
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
    const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);
    if (cu.currentAp < effectiveAbility.apCost) continue;

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
        const utility = scoreDebuffAndUtility(
          cu,
          targetCu,
          ability,
          currentCoord,
          targetCoord,
          state,
          profile
        );

        const hasPrimaryValue = metrics.expectedDamage > 0 || utility.score > 0;
        const totalScore = hasPrimaryValue
          ? kill.score + damageScore + vulnScore + flank.score + focusScore + standoff + utility.score
          : 0;

        if (totalScore <= 0) continue;

        const reasons: string[] = [];
        if (utility.reason) reasons.push(utility.reason);
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
    } else if (ability.targetType === 'HEX') {
      if ((ability.aoeRadius ?? 0) > 0) {
        // AoE hex ability (e.g. Flash Powder)
        const rangeHexes = getAbilityRangeCoords(state.arena, currentCoord, ability, cu);
        for (const candHex of rangeHexes) {
          const val = canExecuteAbility(state, actorUnitId, ability, { coord: candHex });
          if (!val.valid) continue;

          // Find hostiles within AoE radius
          const affectedHostiles: { cu: CombatUnit; pos: HexCoord }[] = [];
          for (const h of hostileUnits) {
            const hPos = state.arena.getUnitPosition(h.unit.id);
            if (hPos && hexDistance(candHex, hPos) <= ability.aoeRadius!) {
              affectedHostiles.push({ cu: h, pos: hPos });
            }
          }

          if (affectedHostiles.length === 0) continue;

          let totalScore = 0;
          const reasons: string[] = [];

          for (const { cu: targetCu, pos: targetPos } of affectedHostiles) {
            const utility = scoreDebuffAndUtility(
              cu,
              targetCu,
              ability,
              currentCoord,
              targetPos,
              state,
              profile
            );
            if (utility.score > 0) {
              totalScore += utility.score;
              if (utility.reason) reasons.push(utility.reason);
            }
          }

          if (affectedHostiles.length > 1) {
            totalScore += (affectedHostiles.length - 1) * 8.0;
            reasons.push(`Catch ${affectedHostiles.length} targets in blast`);
          }

          if (totalScore > 0) {
            candidateActions.push({
              type: 'ABILITY',
              ability,
              target: { coord: candHex },
              score: Math.round(totalScore * 10) / 10,
              reason: reasons.length > 0 ? reasons.join('; ') : `AoE ${ability.name}`
            });
          }
        }
      } else if (ability.effects?.some((e) => e.type === 'TELEPORT')) {
        // Mobility leap ability (e.g. Rooftop Vault, Shadow Step)
        const rangeHexes = getAbilityRangeCoords(state.arena, currentCoord, ability, cu);
        const remainingAp = cu.currentAp - effectiveAbility.apCost;

        // Identify follow-up single target attacks affordable with remaining AP
        const followUpAttacks = cu.abilities.filter(
          (a) =>
            a.id !== ability.id &&
            getEffectiveAbility(a, cu.abilityModifiers).apCost <= remainingAp &&
            a.targetType === 'SINGLE_TARGET'
        );

        for (const candHex of rangeHexes) {
          if (hexEquals(candHex, currentCoord)) continue;
          const val = canExecuteAbility(state, actorUnitId, ability, { coord: candHex });
          if (!val.valid) continue;

          const candElevation = state.arena.getElevation(candHex);
          const currentElevation = state.arena.getElevation(currentCoord);
          const selfBuff = ability.effects?.find((e) => e.type === 'STAT_MODIFIER' && e.targetScope === 'SELF');
          const selfBuffScore = selfBuff ? 4.0 : 0;

          const isReachableByWalk = state.arena
            .getReachableHexes(currentCoord, getEffectiveMove(cu))
            .some((h) => hexEquals(h, candHex));

          // If destination is already reachable by walk and ability offers no self-buff or elevation climb, prefer standard move
          if (isReachableByWalk && !selfBuff && candElevation <= currentElevation) {
            continue;
          }

          let bestAttackFromCand: { score: number; reason: string } | null = null;

          if (followUpAttacks.length > 0) {
            for (const targetCu of hostileUnits) {
              const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
              if (!targetCoord) continue;

              for (const atk of followUpAttacks) {
                const metrics = computeAbilityMetrics(
                  state,
                  actorUnitId,
                  atk,
                  targetCoord,
                  candHex
                );
                if (!metrics || !metrics.hasLoS) continue;

                const kill = scoreFinishingBlow(targetCu, metrics.expectedDamage, weights.killBonus);
                const damageScore = metrics.expectedDamage * weights.expectedDamageWeight;
                const vulnScore = scoreVulnerability(metrics, weights.vulnerabilityWeight);
                const flank = scoreFlankOpportunity(metrics.combatArc, metrics.isFlankAdvantage, weights.flankWeight);
                const focusScore = scoreFocusFire(targetCu, weights.focusFireWeight);
                const utility = scoreDebuffAndUtility(
                  cu,
                  targetCu,
                  atk,
                  candHex,
                  targetCoord,
                  state,
                  profile
                );

                let leapTacticalBonus = 0;
                const reasons: string[] = [];

                if (metrics.combatArc === 'REAR') {
                  reasons.push('Infiltrate into rear combat arc');
                } else if (metrics.combatArc === 'FLANK' || metrics.isFlankAdvantage) {
                  reasons.push('Infiltrate into flank arc');
                }

                if (candElevation > currentElevation) {
                  leapTacticalBonus += 8.0;
                  reasons.push(`Leap up cliff to high ground (elev ${candElevation})`);
                }
                if (candElevation > state.arena.getElevation(targetCoord)) {
                  leapTacticalBonus += 4.0;
                  reasons.push('High-ground vantage advantage');
                }

                if (selfBuff) {
                  reasons.push('Defensive evasion boost on landing');
                }

                if (utility.reason) reasons.push(utility.reason);
                if (flank.reason) reasons.push(flank.reason);
                reasons.push(`Enables ${atk.name} on ${targetCu.unit.name}`);

                const netScore =
                  kill.score +
                  damageScore +
                  vulnScore +
                  flank.score +
                  focusScore +
                  utility.score +
                  leapTacticalBonus +
                  selfBuffScore;

                if (!bestAttackFromCand || netScore > bestAttackFromCand.score) {
                  bestAttackFromCand = {
                    score: netScore,
                    reason: reasons.join('; ')
                  };
                }
              }
            }
          }

          if (bestAttackFromCand) {
            candidateActions.push({
              type: 'ABILITY',
              ability,
              target: { coord: candHex },
              score: Math.round(bestAttackFromCand.score * 10) / 10,
              reason: `Vault to (${candHex.q}, ${candHex.r}) — ${bestAttackFromCand.reason}`
            });
          } else {
            // Repositioning / High Ground leaping when no attack is immediately followable
            let bestLeapRepositionScore = -Infinity;
            let leapRepositionReason = '';

            for (const targetCu of hostileUnits) {
              const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
              if (!targetCoord) continue;

              const currentDist = hexDistance(currentCoord, targetCoord);
              const candDist = hexDistance(candHex, targetCoord);

              let score = 0;
              const reasons: string[] = [];

              if (candDist < currentDist) {
                score += (currentDist - candDist) * 4.0;
                reasons.push(`Close distance to ${targetCu.unit.name} (${currentDist} -> ${candDist})`);
              }

              if (candElevation > currentElevation) {
                score += 10.0;
                reasons.push(`Leap up cliff to high ground (elev ${candElevation})`);
              }

              score += selfBuffScore;
              if (selfBuff) {
                reasons.push('Defensive evasion boost on landing');
              }

              if (score > bestLeapRepositionScore) {
                bestLeapRepositionScore = score;
                leapRepositionReason = reasons.join('; ');
              }
            }

            if (bestLeapRepositionScore > 0) {
              candidateActions.push({
                type: 'ABILITY',
                ability,
                target: { coord: candHex },
                score: Math.round(bestLeapRepositionScore * 10) / 10,
                reason: `Vault to (${candHex.q}, ${candHex.r}) — ${leapRepositionReason}`
              });
            }
          }
        }
      }
    } else if (ability.targetType === 'ALLY' || ability.targetType === 'SELF' || (ability.damageType === 'NONE' && ability.targetType !== 'HEX')) {
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

        const buff = scoreBuffAbility(
          cu,
          allyCu,
          ability,
          currentCoord,
          allyCoord,
          hostileUnits,
          state,
          profile
        );

        if (buff.score <= 0) continue;

        candidateActions.push({
          type: 'ABILITY',
          ability,
          target: { coord: allyCoord, targetUnitId: allyCu.unit.id },
          score: buff.score,
          reason: buff.reason ?? `Buff ally ${allyCu.unit.name} with ${ability.name}`
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
        const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);
        if (remainingAp < effectiveAbility.apCost) continue;
        if (ability.targetType === 'SINGLE_TARGET') {
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
            const utility = scoreDebuffAndUtility(
              cu,
              targetCu,
              ability,
              candCoord,
              targetCoord,
              state,
              profile
            );

            // Deduct 1 AP movement cost from utility
            const effectiveDamage = kill.score + damageScore + vulnScore;
            const hasPrimaryValue = effectiveDamage > 0 || utility.score > 0;
            const effectiveFlank = effectiveDamage > 0 ? flank.score : 0;
            const effectiveFocus = hasPrimaryValue ? focusScore : 0;
            const effectiveStandoff = hasPrimaryValue ? standoff : 0;

            const moveNetScore = hasPrimaryValue
              ? effectiveDamage + effectiveFlank + effectiveFocus + effectiveStandoff + utility.score - 2
              : 0;

            if (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score) {
              const reasons: string[] = [];
              if (utility.reason) reasons.push(utility.reason);
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
        } else if (ability.targetType === 'HEX' && (ability.aoeRadius ?? 0) > 0) {
          for (const targetCu of hostileUnits) {
            const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
            if (!targetCoord) continue;

            const val = canExecuteAbility(state, actorUnitId, ability, {
              coord: targetCoord,
              originCoord: candCoord
            });
            if (!val.valid) continue;

            const utility = scoreDebuffAndUtility(
              cu,
              targetCu,
              ability,
              candCoord,
              targetCoord,
              state,
              profile
            );
            if (utility.score <= 0) continue;

            const moveNetScore = utility.score - 2;
            if (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score) {
              bestAttackFromCand = {
                score: moveNetScore,
                ability,
                targetCu,
                reason: `Enables ${ability.name} on ${targetCu.unit.name} (${utility.reason})`
              };
            }
          }
        }
      }

      // Check if moving here enables a follow-up buff on an ally this turn
      for (const ability of cu.abilities) {
        const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);
        if (remainingAp < effectiveAbility.apCost) continue;
        if (ability.targetType !== 'ALLY' && ability.damageType !== 'NONE') continue;

        for (const allyCu of alliedUnits) {
          const allyCoord = state.arena.getUnitPosition(allyCu.unit.id);
          if (!allyCoord) continue;

          const metrics = computeAbilityMetrics(
            state,
            actorUnitId,
            ability,
            allyCoord,
            candCoord
          );
          if (!metrics || !metrics.hasLoS) continue;

          const buff = scoreBuffAbility(
            cu,
            allyCu,
            ability,
            candCoord,
            allyCoord,
            hostileUnits,
            state,
            profile
          );

          if (buff.score <= 0) continue;

          // Deduct 1 AP movement cost from utility
          const moveNetScore = buff.score - 2;

          if (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score) {
            bestAttackFromCand = {
              score: moveNetScore,
              ability,
              targetCu: allyCu,
              reason: `Enables ${ability.name} on ally ${allyCu.unit.name} (${buff.reason ?? 'Support'})`
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

          if (profile === 'SNIPER' || profile === 'SUPPORT') {
            // Sniper/Support evaluates how close candCoord is to preferredStandoffRange
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
  candidateActions.sort((a, b) => b.score - a.score);

  const topCandidates: AICandidateEvaluation[] = candidateActions.slice(0, 5).map((cand, idx) => ({
    type: cand.type,
    action: cand,
    score: cand.score,
    reason: cand.reason,
    rank: idx + 1
  }));

  let chosenAction: AIAction;

  if (candidateActions.length === 0) {
    chosenAction = {
      type: 'CONSERVE_AP',
      unspentAp: cu.currentAp,
      score: 0,
      reason: `Conserving ${cu.currentAp} AP for +${cu.currentAp * 20} CTB gauge (no legal actions)`
    };
  } else {
    const bestCandidate = candidateActions[0];

    if (bestCandidate.score < weights.apConservationThreshold) {
      chosenAction = {
        type: 'CONSERVE_AP',
        unspentAp: cu.currentAp,
        score: 0,
        reason: `Conserving ${cu.currentAp} AP for +${cu.currentAp * 20} CTB gauge (best action score ${bestCandidate.score} < threshold ${weights.apConservationThreshold})`
      };
    } else {
      // 4. Seeded dice tie-breaking among candidates with identical top scores (within 0.01)
      const tiedCandidates = candidateActions.filter(
        (c) => Math.abs(c.score - bestCandidate.score) <= 0.01
      );

      if (tiedCandidates.length === 1) {
        chosenAction = tiedCandidates[0];
      } else {
        const rollIndex = diceRoller.rollDice(1, tiedCandidates.length) - 1;
        chosenAction = tiedCandidates[rollIndex];
      }
    }
  }

  const trace: AIDecisionTrace = {
    turnNumber: state.turnNumber,
    actorUnitId,
    actorName: cu.unit.name,
    profile,
    weights,
    currentAp: cu.currentAp,
    chosenAction,
    topCandidates,
    totalCandidatesEvaluated: candidateActions.length,
    apConservationThreshold: weights.apConservationThreshold,
    timestamp: Date.now()
  };

  return { action: chosenAction, trace };
}

/**
 * Decides the single next highest-utility action for the active AI combat unit.
 */
export function decideNextAction(
  state: CombatState,
  actorUnitId: string,
  options?: AIDecisionOptions
): AIAction {
  const result = decideNextActionWithTrace(state, actorUnitId, options);
  if (state.aiDecisionLog) {
    state.aiDecisionLog.push(result.trace);
  }
  return result.action;
}



export type AIActionResult =
  | { readonly type: 'MOVE'; readonly destination: HexCoord }
  | {
      readonly type: 'ABILITY';
      readonly ability: Ability;
      readonly target: { readonly coord?: HexCoord; readonly targetUnitId?: string };
      readonly resolution: AbilityResolution;
    }
  | { readonly type: 'CONSERVE_AP'; readonly unspentAp: number };

/**
 * Pure execution of a single AIAction against the CombatState.
 * Returns structured execution details including AbilityResolution.
 */
export function executeAiAction(
  state: CombatState,
  actorUnitId: string,
  action: AIAction,
  diceRoller?: DiceRoller
): AIActionResult {
  const cu = state.units.get(actorUnitId);
  if (!cu) {
    throw new Error(`Unit ${actorUnitId} not found in combat state.`);
  }

  if (action.type === 'MOVE') {
    executeMove(state, actorUnitId, action.destination);
    return { type: 'MOVE', destination: action.destination };
  }

  if (action.type === 'ABILITY') {
    const resolution = executeAbility(
      state,
      actorUnitId,
      action.ability,
      action.target,
      diceRoller
    );
    return {
      type: 'ABILITY',
      ability: action.ability,
      target: action.target,
      resolution
    };
  }

  return { type: 'CONSERVE_AP', unspentAp: cu.currentAp };
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

  try {
    while (steps < maxSteps) {
      steps++;
      const cu = state.units.get(actorUnitId);
      if (
        !cu ||
        cu.isDefeated ||
        cu.currentAp <= 0 ||
        state.activeUnitId !== actorUnitId ||
        state.outcome !== 'IN_PROGRESS'
      ) {
        break;
      }

      const { action, trace } = decideNextActionWithTrace(state, actorUnitId, options);
      if (state.aiDecisionLog) {
        state.aiDecisionLog.push(trace);
      }
      executedActions.push(action);
      let result: AIActionResult;
      try {
        result = executeAiAction(state, actorUnitId, action, options?.diceRoller);
      } catch (err) {
        console.warn(`[executeAiTurn] Action execution failed for ${actorUnitId}:`, err);
        break;
      }

      if (result.type === 'CONSERVE_AP' || state.outcome !== 'IN_PROGRESS') {
        break;
      }
    }
  } finally {
    // Conclude the turn and apply CTB recovery for any remaining unspent AP
    if (state.activeUnitId === actorUnitId && state.outcome === 'IN_PROGRESS') {
      endActiveTurn(state);
    }
  }
  return executedActions;
}

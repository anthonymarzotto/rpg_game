import { CombatState, CombatUnit, AbilityResolution } from '../combat/types';
import { HexCoord, hexDistance, hexEquals, getCombatArc, getForwardConeHexes, getDirectionBetween, getHexesInRange, getHexNeighbors, toHexKey } from '../grid/hex';
import { getEffectiveMove, hasFriendlyAoEExclusion, isFriendlyUnit, createLoSScreeningPredicate } from '../combat/effectiveVitals';
import { getBastionZocHexKeys } from '../combat/bastionStance';
import { getRoughTerrainHexKeys, getPendingBombardmentHexKeys } from '../combat/battlefieldZones';
import { hasZeroedInPassive } from '../combat/zeroedIn';
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
  scoreDebuffAndUtility,
  scoreTargetThreat,
  scoreChallengeDefiancePenalty
} from './heuristics';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Penalizes ending an action isolated within melee range (<= 2 hexes) of 3+ enemies with no allies within 3 hexes,
 * unless the action secures a finishing blow.
 */
function computeIsolationPenalty(
  state: CombatState,
  actorCu: CombatUnit,
  destCoord: HexCoord,
  hasKill: boolean
): number {
  if (hasKill) return 0;

  let nearbyEnemies = 0;
  let nearbyAllies = 0;
  const actorFaction = actorCu.faction ?? actorCu.unit.faction;

  for (const unit of state.units.values()) {
    if (unit.isDefeated || unit.unit.id === actorCu.unit.id) continue;
    const pos = state.arena.getUnitPosition(unit.unit.id);
    if (!pos) continue;

    const unitFaction = unit.faction ?? unit.unit.faction;
    if (unitFaction !== actorFaction) {
      if (hexDistance(destCoord, pos) <= 2) {
        nearbyEnemies++;
      }
    } else if (hexDistance(destCoord, pos) <= 3) {
      nearbyAllies++;
    }
  }

  return nearbyEnemies >= 3 && nearbyAllies === 0 ? 15.0 * (nearbyEnemies - 1) : 0;
}

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
        const threat = scoreTargetThreat(targetCu, weights.threatWeight ?? 1.0);
        const defiance = scoreChallengeDefiancePenalty(cu, targetCu, kill.score > 0);

        // Distributive Proof tactical bonus (Isolated Exposed setup vs Clustered adjacent splash)
        let distributiveBonus = 0;
        let distributiveReason = '';
        if (effectiveAbility.effects?.some((e) => e.type === 'DISTRIBUTIVE_PROOF')) {
          let adjacentTargetAllies = 0;
          for (const neighbor of getHexNeighbors(targetCoord)) {
            const occId = state.arena.getUnitAt(neighbor);
            if (!occId || occId === targetCu.unit.id) continue;
            const occCu = state.units.get(occId);
            if (occCu && !occCu.isDefeated && occCu.currentHp > 0 && isFriendlyUnit(targetCu, occCu)) {
              adjacentTargetAllies++;
            }
          }
          if (adjacentTargetAllies === 0) {
            if (!targetCu.activeConditions?.some((c) => c.type === 'EXPOSED')) {
              distributiveBonus += 10.0;
              distributiveReason = 'Isolated target (Exposed)';
            }
          } else if (metrics.splashUnits && metrics.splashUnits.length > 0) {
            const hostileSplash = metrics.splashUnits.filter((s) => !s.isAlly);
            const alliedSplash = metrics.splashUnits.filter((s) => s.isAlly);
            const splashVal = hostileSplash.reduce((sum, s) => sum + s.expectedDamage * weights.expectedDamageWeight, 0);
            const allyPen = hasFriendlyAoEExclusion(cu) ? 0 : alliedSplash.length * 25.0;
            distributiveBonus += splashVal - allyPen;
            if (hostileSplash.length > 0) {
              distributiveReason = `Clustered distribute (${hostileSplash.length} adj. foe${hostileSplash.length === 1 ? '' : 's'})`;
            }
          }
        }

        const effectiveDamage = kill.score + damageScore + vulnScore;
        const hasPrimaryValue = effectiveDamage > 0 || utility.score > 0;
        const effectiveFlank = effectiveDamage > 0 ? flank.score : 0;
        const effectiveThreat = hasPrimaryValue ? threat.score : 0;
        const rawScore = effectiveDamage + effectiveFlank + focusScore + standoff + utility.score + effectiveThreat + distributiveBonus - defiance.penalty;
        const totalScore = hasPrimaryValue ? Math.max(0, rawScore) : 0;

        if (totalScore <= 0) continue;

        const reasons: string[] = [];
        if (effectiveThreat > 0 && threat.reason) reasons.push(threat.reason);
        if (utility.reason) reasons.push(utility.reason);
        if (distributiveReason) reasons.push(distributiveReason);
        if (kill.reason) reasons.push(kill.reason);
        if (effectiveFlank > 0 && flank.reason) reasons.push(flank.reason);
        if (defiance.penalty > 0 && defiance.reason) reasons.push(defiance.reason);
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
      if ((effectiveAbility.aoeRadius ?? 0) > 0 || effectiveAbility.coneTemplate) {
        const rangeHexes = getAbilityRangeCoords(state.arena, currentCoord, ability, cu, state);
        const isDelayedBombardment = effectiveAbility.effects?.some((e) => e.type === 'DELAYED_BOMBARDMENT');

        if (isDelayedBombardment) {
          const roughKeys = getRoughTerrainHexKeys(state);
          const blastRadius = effectiveAbility.aoeRadius ?? 1;
          const candHexes = rangeHexes.filter((hex) =>
            hostileUnits.some((h) => {
              const hPos = state.arena.getUnitPosition(h.unit.id);
              return hPos && hexDistance(hex, hPos) <= blastRadius;
            })
          );

          for (const candHex of candHexes) {
            const val = canExecuteAbility(state, actorUnitId, ability, { coord: candHex });
            if (!val.valid) continue;

            const blastHexes = getHexesInRange(candHex, blastRadius);
            let caughtHostiles = 0;
            let caughtAllies = 0;
            let trappedHostiles = 0;
            let paintedHostiles = 0;
            for (const h of blastHexes) {
              const occId = state.arena.getUnitAt(h);
              if (!occId) continue;
              const occCu = state.units.get(occId);
              if (!occCu || occCu.isDefeated) continue;
              if ((occCu.unit.faction ?? occCu.faction) === (cu.unit.faction ?? cu.faction)) {
                caughtAllies++;
              } else {
                caughtHostiles++;
                if (roughKeys.has(toHexKey(h)) || getEffectiveMove(occCu) === 0) {
                  trappedHostiles++;
                }
                if (occCu.activeConditions.some((c) => c.type === 'EXPOSED' || c.type === 'TELEMETRY')) {
                  paintedHostiles++;
                }
              }
            }
            if (caughtHostiles === 0) continue;

            const isHighValueBarrage = caughtHostiles >= 2 || trappedHostiles > 0;
            const expectedUnitDmg = 9 + cu.unit.baseAttributes.force;
            const dmgScale = isHighValueBarrage ? 1.15 : 0.45;
            const barrageFriendlyPenalty = hasFriendlyAoEExclusion(cu) ? 0 : caughtAllies * 25.0;
            const totalScore =
              caughtHostiles * expectedUnitDmg * weights.expectedDamageWeight * dmgScale +
              (caughtHostiles > 1 ? (caughtHostiles - 1) * 16.0 : 0) +
              trappedHostiles * 14.0 +
              (isHighValueBarrage ? paintedHostiles * 10.0 : 0) -
              barrageFriendlyPenalty;

            if (totalScore > 0) {
              candidateActions.push({
                type: 'ABILITY',
                ability,
                target: { coord: candHex },
                score: Math.round(totalScore * 10) / 10,
                reason: `Launch ${ability.name} marking ${caughtHostiles} hostile(s)${trappedHostiles > 0 ? ' (trapped in rubble)' : ''}`
              });
            }
          }
        } else if (ability.damageType !== 'NONE') {
          // Damaging AoE hex ability (e.g. Arcane Blast or Wyrmflame Breath)
          const candHexes = rangeHexes.filter((hex) => {
            if (ability.coneTemplate) {
              const facing = getDirectionBetween(currentCoord, hex);
              const cone = getForwardConeHexes(currentCoord, facing);
              return hostileUnits.some((h) => {
                const hPos = state.arena.getUnitPosition(h.unit.id);
                return hPos && cone.some((c) => hexEquals(c, hPos));
              });
            }
            return hostileUnits.some((h) => {
              const hPos = state.arena.getUnitPosition(h.unit.id);
              return hPos && hexDistance(hex, hPos) <= ability.aoeRadius!;
            });
          });

          for (const candHex of candHexes) {
            const val = canExecuteAbility(state, actorUnitId, ability, { coord: candHex });
            if (!val.valid) continue;

            const metrics = computeAbilityMetrics(state, actorUnitId, ability, candHex, currentCoord);
            if (!metrics || !metrics.hasLoS) continue;

            // Evaluate caught allies for friendly fire penalty (0 when Exclusion Matrix / ALLY_REFRACTION applies)
            const hasAllyRefraction = Boolean(effectiveAbility.effects?.some((e) => e.type === 'ALLY_REFRACTION'));
            const excludeAllies = hasFriendlyAoEExclusion(cu) || hasAllyRefraction;
            const centerCu = metrics.targetUnitId ? state.units.get(metrics.targetUnitId) : undefined;
            const isCenterAlly = centerCu ? isFriendlyUnit(cu, centerCu) : false;
            const alliedSplashCount = (metrics.splashUnits ?? []).filter((s) => s.isAlly).length;
            const totalCaughtAllies = (isCenterAlly ? 1 : 0) + alliedSplashCount;
            const friendlyFirePenalty = excludeAllies ? 0 : totalCaughtAllies * 25.0;

            let sparedAlliesInBlast = 0;
            if (hasAllyRefraction && (effectiveAbility.aoeRadius ?? 0) > 0) {
              for (const bHex of getHexesInRange(candHex, effectiveAbility.aoeRadius!)) {
                const occId = state.arena.getUnitAt(bHex);
                if (!occId || occId === actorUnitId) continue;
                const occCu = state.units.get(occId);
                if (occCu && !occCu.isDefeated && occCu.currentHp > 0 && isFriendlyUnit(cu, occCu)) {
                  sparedAlliesInBlast++;
                }
              }
            }

            const hostileSplash = (metrics.splashUnits ?? []).filter((s) => !s.isAlly);
            const isCenterHostile = centerCu && !isCenterAlly && !centerCu.isDefeated;
            const totalHostiles = (isCenterHostile ? 1 : 0) + hostileSplash.length;
            if (totalHostiles === 0) continue;

            let totalScore = 0;
            const reasons: string[] = [];

            if (isCenterHostile && centerCu) {
              const centerExpDmg = metrics.expectedDamage - hostileSplash.reduce((sum, s) => sum + s.expectedDamage, 0);
              const centerDmgScore = Math.max(0, centerExpDmg) * weights.expectedDamageWeight;
              const centerKill = scoreFinishingBlow(centerCu, centerExpDmg, weights.killBonus);
              const centerFocus = scoreFocusFire(centerCu, weights.focusFireWeight);
              const centerVuln = scoreVulnerability(metrics, weights.vulnerabilityWeight);
              totalScore += centerDmgScore + centerKill.score + centerFocus + centerVuln;
              if (centerKill.reason) reasons.push(centerKill.reason);
            }

            for (const s of hostileSplash) {
              const secCu = state.units.get(s.targetUnitId);
              if (secCu) {
                const secDmgScore = s.expectedDamage * weights.expectedDamageWeight;
                const secKill = scoreFinishingBlow(secCu, s.expectedDamage, weights.killBonus);
                const secFocus = scoreFocusFire(secCu, weights.focusFireWeight);
                let secVuln = 0;
                if (s.toHitChance >= 70) {
                  secVuln += ((s.toHitChance - 50) / 10) * weights.vulnerabilityWeight;
                }
                if (s.mitigation <= 1) {
                  secVuln += (2 - s.mitigation) * weights.vulnerabilityWeight;
                }
                totalScore += secDmgScore + secKill.score + secFocus + secVuln;
                if (secKill.reason) reasons.push(secKill.reason);
              }
            }

            if (hasAllyRefraction && sparedAlliesInBlast > 0) {
              const avgEnemyExpDmg =
                hostileSplash.length > 0
                  ? hostileSplash.reduce((sum, s) => sum + s.expectedDamage, 0) / hostileSplash.length
                  : Math.max(1, (2.5 + cu.unit.baseAttributes.focus) * 0.65);
              totalScore += sparedAlliesInBlast * (avgEnemyExpDmg * weights.expectedDamageWeight + 8.0);
              reasons.push(`Refract ${sparedAlliesInBlast} spared ally strike${sparedAlliesInBlast === 1 ? '' : 's'}`);
            }

            if (totalHostiles > 1) {
              totalScore += (totalHostiles - 1) * 12.0;
              reasons.push(`Catch ${totalHostiles} targets in blast`);
            }

            const standoff = scoreStandoffDistance(
              hexDistance(currentCoord, candHex),
              weights.preferredStandoffRange,
              weights.standoffWeight
            );
            totalScore += standoff;

            totalScore -= friendlyFirePenalty;
            if (friendlyFirePenalty > 0) {
              reasons.push(`Friendly fire penalty (-${friendlyFirePenalty})`);
            }

            if (totalScore > 0) {
              candidateActions.push({
                type: 'ABILITY',
                ability,
                target: { coord: candHex, targetUnitId: isCenterHostile ? centerCu?.unit.id : undefined },
                score: Math.round(totalScore * 10) / 10,
                reason: reasons.length > 0 ? reasons.join('; ') : `AoE Blast (${totalHostiles} targets)`
              });
            }
          }
        } else {
          // Utility / debuff AoE hex ability (e.g. Flash Powder)
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
            let effectiveHostiles = 0;
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
                effectiveHostiles++;
                if (utility.reason) reasons.push(utility.reason);
              }
            }

            if (effectiveHostiles > 1) {
              totalScore += (effectiveHostiles - 1) * 8.0;
              reasons.push(`Catch ${effectiveHostiles} targets in blast`);
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
          if (effectiveAbility.sameElevationOnly && candElevation !== currentElevation) {
            continue;
          }
          const selfBuff = ability.effects?.find((e) => e.type === 'STAT_MODIFIER' && e.targetScope === 'SELF');
          const selfBuffScore = selfBuff ? 4.0 : 0;

          const zocKeys = getBastionZocHexKeys(state, actorUnitId);
          const roughKeys = getRoughTerrainHexKeys(state);
          const isReachableByWalk = state.arena
            .getReachableHexes(currentCoord, getEffectiveMove(cu), {
              terminalHexKeys: zocKeys,
              roughTerrainHexKeys: roughKeys
            })
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
                const threat = scoreTargetThreat(targetCu, weights.threatWeight ?? 1.0);
                const defiance = scoreChallengeDefiancePenalty(cu, targetCu, kill.score > 0);
                const isolationPenalty = computeIsolationPenalty(state, cu, candHex, kill.score > 0);

                let leapTacticalBonus = 0;
                const reasons: string[] = [];

                if (threat.score > 0 && threat.reason) {
                  reasons.push(threat.reason);
                }

                if (metrics.combatArc === 'REAR') {
                  reasons.push('Infiltrate into rear combat arc');
                } else if (metrics.combatArc === 'FLANK' || metrics.isFlankAdvantage) {
                  reasons.push('Infiltrate into flank arc');
                }

                if (candElevation > currentElevation) {
                  leapTacticalBonus += 18.0;
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
                if (defiance.penalty > 0 && defiance.reason) reasons.push(defiance.reason);
                if (isolationPenalty > 0) reasons.push(`Isolation risk (-${isolationPenalty})`);
                reasons.push(`Enables ${atk.name} on ${targetCu.unit.name}`);

                const netScore =
                  kill.score +
                  damageScore +
                  vulnScore +
                  flank.score +
                  focusScore +
                  utility.score +
                  threat.score +
                  leapTacticalBonus +
                  selfBuffScore -
                  defiance.penalty -
                  isolationPenalty;

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
            if (isReachableByWalk && candElevation <= currentElevation) {
              continue;
            }

            // Repositioning / High Ground leaping when no attack is immediately followable
            const isolationPenalty = computeIsolationPenalty(state, cu, candHex, false);
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

              score -= isolationPenalty;
              if (isolationPenalty > 0) {
                reasons.push(`Isolation risk (-${isolationPenalty})`);
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
        const isSelf = allyCu.unit.id === actorUnitId;
        if (ability.targetType === 'SELF' && !isSelf) continue;
        if (
          ability.targetType === 'ALLY' &&
          isSelf &&
          !ability.effects?.some((e) => e.type === 'CLEANSE' || (e.type === 'CONDITION' && e.conditionType === 'HENOSIS'))
        ) {
          continue;
        }

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
          reason: buff.reason ?? (isSelf ? `Buff self with ${ability.name}` : `Buff ally ${allyCu.unit.name} with ${ability.name}`)
        });
      }
    }
  }

  // 2. Evaluate composite move-and-act options
  if (cu.currentAp >= 1 && cu.unit.effectiveVitals.move > 0) {
    const zocKeys = getBastionZocHexKeys(state, actorUnitId);
    const roughKeys = getRoughTerrainHexKeys(state);
    const hostileBombardHexes = getPendingBombardmentHexKeys(state, cu.faction);
    const isCurrentlyInBombardment = hostileBombardHexes.has(toHexKey(currentCoord));
    const isZeroedInUnit = hasZeroedInPassive(cu);
    const hasImmediateOffense = candidateActions.some((c) => c.type === 'ABILITY' && c.score > 5.0);
    const isInMeleeThreat = hostileUnits.some((h) => {
      const hPos = state.arena.getUnitPosition(h.unit.id);
      return hPos ? hexDistance(currentCoord, hPos) === 1 : false;
    });
    const reachable = state.arena.getReachableHexes(currentCoord, getEffectiveMove(cu), {
      terminalHexKeys: zocKeys,
      roughTerrainHexKeys: roughKeys
    });

    for (const candCoord of reachable) {
      if (hexEquals(candCoord, currentCoord)) continue;

      let bestAttackFromCand: { score: number; ability: typeof cu.abilities[0]; targetCu: CombatUnit; reason: string } | null = null;

      // Check if moving here enables a follow-up attack this turn
      const remainingAp = cu.currentAp - 1;
      for (const ability of cu.abilities) {
        const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);
        if (remainingAp < effectiveAbility.apCost) continue;
        // Defensive or melee contingency abilities are emergency responses when engaged, not offensive move-in attacks
        if (ability.aiHint?.role === 'DEFENSIVE' || ability.aiHint?.meleeContingency) {
          continue;
        }
        // Primers require enough remaining AP to cast the primer AND at least one follow-up attack
        if (ability.aiHint?.primer) {
          const minFollowUpAp = ability.aiHint.primer.minTotalAp ?? (effectiveAbility.apCost + 1);
          if (remainingAp < minFollowUpAp) {
            continue;
          }
        }
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
            const threat = scoreTargetThreat(targetCu, weights.threatWeight ?? 1.0);
            const defiance = scoreChallengeDefiancePenalty(cu, targetCu, kill.score > 0);

            // Deduct 1 AP movement cost from utility
            const effectiveDamage = kill.score + damageScore + vulnScore;
            const hasPrimaryValue = effectiveDamage > 0 || utility.score > 0;
            const effectiveFlank = effectiveDamage > 0 ? flank.score : 0;
            const effectiveFocus = hasPrimaryValue ? focusScore : 0;
            const effectiveStandoff = hasPrimaryValue ? standoff : 0;
            const effectiveThreat = hasPrimaryValue ? threat.score : 0;
            const isolationPenalty = computeIsolationPenalty(state, cu, candCoord, kill.score > 0);

            const moveNetScore = hasPrimaryValue
              ? Math.max(0, effectiveDamage + effectiveFlank + effectiveFocus + effectiveStandoff + utility.score + effectiveThreat - defiance.penalty - 2) - isolationPenalty
              : 0;

            if (moveNetScore > 0 && (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score)) {
              const reasons: string[] = [];
              if (effectiveThreat > 0 && threat.reason) reasons.push(threat.reason);
              if (utility.reason) reasons.push(utility.reason);
              if (flank.reason) reasons.push(flank.reason);
              if (kill.reason) reasons.push(kill.reason);
              if (defiance.penalty > 0 && defiance.reason) reasons.push(defiance.reason);
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
          if (ability.damageType !== 'NONE') {
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

              const hasAllyRefraction = Boolean(effectiveAbility.effects?.some((e) => e.type === 'ALLY_REFRACTION'));
              const excludeAllies = hasFriendlyAoEExclusion(cu) || hasAllyRefraction;
              const alliedSplashCount = (metrics.splashUnits ?? []).filter((s) => s.isAlly).length;
              const friendlyFirePenalty = excludeAllies ? 0 : alliedSplashCount * 25.0;

              let refractionLookaheadBonus = 0;
              if (hasAllyRefraction && (effectiveAbility.aoeRadius ?? 0) > 0) {
                for (const bHex of getHexesInRange(targetCoord, effectiveAbility.aoeRadius!)) {
                  const occId = state.arena.getUnitAt(bHex);
                  if (!occId || occId === actorUnitId) continue;
                  const occCu = state.units.get(occId);
                  if (occCu && !occCu.isDefeated && occCu.currentHp > 0 && isFriendlyUnit(cu, occCu)) {
                    refractionLookaheadBonus += (2.5 + cu.unit.baseAttributes.focus) * 0.65 * weights.expectedDamageWeight + 8.0;
                  }
                }
              }

              const damageScore = metrics.expectedDamage * weights.expectedDamageWeight;
              const kill = scoreFinishingBlow(targetCu, metrics.expectedDamage, weights.killBonus);
              const focusScore = scoreFocusFire(targetCu, weights.focusFireWeight);
              const isolationPenalty = computeIsolationPenalty(state, cu, candCoord, kill.score > 0);
              const moveNetScore = damageScore + kill.score + focusScore + refractionLookaheadBonus - friendlyFirePenalty - isolationPenalty - 2;

              if (moveNetScore > 0 && (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score)) {
                bestAttackFromCand = {
                  score: moveNetScore,
                  ability,
                  targetCu,
                  reason: `Enables ${ability.name} on ${targetCu.unit.name} (Exp Dmg: ${metrics.expectedDamage})`
                };
              }
            }
          } else {
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

              const isolationPenalty = computeIsolationPenalty(state, cu, candCoord, false);
              const moveNetScore = utility.score - isolationPenalty - 2;
              if (moveNetScore > 0 && (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score)) {
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
      }

      // Check if moving here enables a follow-up buff on an ally or self this turn
      for (const ability of cu.abilities) {
        const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);
        if (remainingAp < effectiveAbility.apCost) continue;
        if (ability.targetType !== 'ALLY' && ability.targetType !== 'SELF' && ability.damageType !== 'NONE') continue;

        for (const allyCu of alliedUnits) {
          const isSelf = allyCu.unit.id === actorUnitId;
          if (ability.targetType === 'SELF' && !isSelf) continue;
          if (ability.targetType === 'ALLY' && isSelf) continue;

          const allyCoord = isSelf ? candCoord : state.arena.getUnitPosition(allyCu.unit.id);
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
          const isolationPenalty = computeIsolationPenalty(state, cu, candCoord, false);
          const moveNetScore = buff.score - isolationPenalty - 2;

          if (moveNetScore > 0 && (!bestAttackFromCand || moveNetScore > bestAttackFromCand.score)) {
            bestAttackFromCand = {
              score: moveNetScore,
              ability,
              targetCu: allyCu,
              reason: `Enables ${ability.name} on ally ${allyCu.unit.name} (${buff.reason ?? 'Support'})`
            };
          }
        }
      }

      // Compute closing / standoff repositioning utility unconditionally so low-value buffs do not suppress advancing.
      let bestRepositionScore = -Infinity;
      let repositionReason = '';

      const hasRangedAttack = cu.abilities.some(
        (a) =>
          (a.damageType !== 'NONE' || Boolean(a.effects?.some((e) => e.type === 'DAMAGE'))) &&
          getEffectiveAbility(a, cu.abilityModifiers).range >= 2
      );
      const hasMeleeAttack = cu.abilities.some(
        (a) =>
          (a.damageType !== 'NONE' || Boolean(a.effects?.some((e) => e.type === 'DAMAGE'))) &&
          getEffectiveAbility(a, cu.abilityModifiers).range === 1
      );
      let adjacentAllies = 0;
      for (const allyCu of alliedUnits) {
        if (allyCu.unit.id === actorUnitId) continue;
        const allyPos = state.arena.getUnitPosition(allyCu.unit.id);
        if (allyPos && hexDistance(candCoord, allyPos) === 1) {
          adjacentAllies++;
        }
      }
      const repositionIsolationPenalty = computeIsolationPenalty(state, cu, candCoord, false);

      for (const targetCu of hostileUnits) {
        const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
        if (!targetCoord) continue;

        const currentDist = hexDistance(currentCoord, targetCoord);
        const candDist = hexDistance(candCoord, targetCoord);
        const crowdingPenalty = candDist >= 2 ? adjacentAllies * 2.5 : 0;

        if (profile === 'SNIPER' || (profile === 'SUPPORT' && (hasRangedAttack || !hasMeleeAttack))) {
          // Ranged Sniper/Support evaluates how close candCoord is to preferredStandoffRange
          const currentDev = Math.abs(currentDist - weights.preferredStandoffRange);
          const candDev = Math.abs(candDist - weights.preferredStandoffRange);
          const primaryRangedAbility = cu.abilities.find((a) => a.range >= 2 && a.damageType !== 'NONE') ?? cu.abilities[0];
          const hasLoS = state.arena.hasLineOfSight(candCoord, targetCoord, {
            isUnitScreening: primaryRangedAbility
              ? createLoSScreeningPredicate(state, cu, primaryRangedAbility)
              : (unitId) =>
                  !state.units.get(unitId)?.activeConditions?.some((c) => c.type === 'STEALTH')
          });
          if (candDev < currentDev) {
            let rawScore = 0;
            let candidateReason = '';
            if (hasLoS) {
              rawScore = (currentDev - candDev) * 5;
              candidateReason = `Repositioning to standoff distance ${weights.preferredStandoffRange} with LoS to ${targetCu.unit.name}`;
            } else if (currentDist > weights.preferredStandoffRange + 1) {
              rawScore = (currentDev - candDev) * 3.5;
              candidateReason = `Advancing toward standoff distance ${weights.preferredStandoffRange} around terrain blocker toward ${targetCu.unit.name}`;
            }
            if (rawScore > 0) {
              const adjusted = candDist < currentDist
                ? Math.max(0.5, rawScore - crowdingPenalty)
                : rawScore - crowdingPenalty;
              const score = adjusted - repositionIsolationPenalty;
              if (score > bestRepositionScore) {
                bestRepositionScore = score;
                repositionReason = candidateReason;
              }
            }
          }
        } else {
          // Melee/Skirmisher/melee-only Support evaluates closing distance and moving toward flank/rear
          if (candDist < currentDist) {
            const targetFacing = targetCu.facing;
            const arc = getCombatArc(targetFacing, targetCoord, candCoord);
            const flankBonus = arc === 'REAR' ? 6 : arc === 'FLANK' ? 3 : 0;
            const rawScore = (currentDist - candDist) * 3 + flankBonus;
            const score = Math.max(0.5, rawScore - crowdingPenalty) - repositionIsolationPenalty;

            if (score > bestRepositionScore) {
              bestRepositionScore = score;
              repositionReason = `Approaching ${targetCu.unit.name} (dist ${currentDist} -> ${candDist})${flankBonus > 0 ? ` [${arc} angle]` : ''}`;
            }
          }
        }
      }

      // Bombardment avoidance & Zeroed In stationary stack preservation
      const candInBombardment = hostileBombardHexes.has(toHexKey(candCoord));
      let zoneMoveAdjust = 0;
      let zoneMoveNote = '';
      if (isCurrentlyInBombardment && !candInBombardment) {
        zoneMoveAdjust += 30.0;
        zoneMoveNote = ' [Escape Siege Barrage]';
      } else if (candInBombardment) {
        zoneMoveAdjust -= 25.0;
        zoneMoveNote = ' [Inside Siege Barrage]';
      }
      if (isZeroedInUnit && hasImmediateOffense && !isInMeleeThreat && !isCurrentlyInBombardment) {
        zoneMoveAdjust -= 15.0 + (cu.zeroedInStacks ?? 0) * 6.0;
      }

      const finalAttackMoveScore = bestAttackFromCand ? bestAttackFromCand.score + zoneMoveAdjust : -Infinity;
      const finalRepositionScore = bestRepositionScore > -Infinity ? bestRepositionScore + zoneMoveAdjust : zoneMoveAdjust;

      if (bestAttackFromCand && finalAttackMoveScore >= finalRepositionScore && finalAttackMoveScore > 0) {
        candidateActions.push({
          type: 'MOVE',
          destination: candCoord,
          score: Math.round(finalAttackMoveScore * 10) / 10,
          reason: `Move to (${candCoord.q}, ${candCoord.r}) — ${bestAttackFromCand.reason}${zoneMoveNote}`
        });
      } else if (finalRepositionScore > 0) {
        candidateActions.push({
          type: 'MOVE',
          destination: candCoord,
          score: Math.round(finalRepositionScore * 10) / 10,
          reason: `Move to (${candCoord.q}, ${candCoord.r}) — ${repositionReason || 'Reposition'}${zoneMoveNote}`
        });
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

  let effectiveConservationThreshold = weights.apConservationThreshold;
  if (
    cu.currentAp === 1 &&
    (cu.virtualElevation ?? 0) === 0 &&
    cu.passives?.some((p) => p.unspentApVirtualHeight)
  ) {
    const hasCloseThreat = hostileUnits.some((h) => {
      const hCoord = state.arena.getUnitPosition(h.unit.id);
      return hCoord ? hexDistance(currentCoord, hCoord) <= 4 : false;
    });
    if (hasCloseThreat) {
      effectiveConservationThreshold = Math.max(effectiveConservationThreshold, 15.0);
    }
  }

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

    if (bestCandidate.score < effectiveConservationThreshold) {
      chosenAction = {
        type: 'CONSERVE_AP',
        unspentAp: cu.currentAp,
        score: 0,
        reason: `Conserving ${cu.currentAp} AP for +${cu.currentAp * 20} CTB gauge (best action score ${bestCandidate.score} < threshold ${effectiveConservationThreshold})`
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
    apConservationThreshold: effectiveConservationThreshold,
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

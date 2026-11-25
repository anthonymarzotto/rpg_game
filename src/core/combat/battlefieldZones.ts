import { CombatEvent, CombatState, CombatUnit, EffectOutcome, HitOutcome, PendingBombardment } from './types';
import { toHexKey } from '../grid/hex';
import { Faction } from '../types/unit';
import { AbilityEffect, ConditionType } from '../types/ability';
import { EffectiveAbility } from '../types/modifier';
import { DiceRoller, SeededDiceRoller } from './dice';
import { resolveAttackRoll, resolveTargetDefense } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { hasFriendlyAoEExclusion, isFriendlyUnit } from './effectiveVitals';
import {
  executeAbilityEffects,
  defaultEffectRegistry,
  getEffectTiming,
  isSelfScopedEffect,
  isPrimaryTargetOnlyEffect,
  isDispatchableEffect
} from './effects';
import { applyCombatEvents, pickBestHitOutcome } from './eventApplication';
import { createRecruit } from '../units/unitFactory';
import { combatLogger } from './combatLogger';
import { evaluateEncounterOutcome } from './objectives';

/**
 * Collects all hex keys currently covered by active Shrapnel Rubble rough terrain hazards.
 */
export function getRoughTerrainHexKeys(state: CombatState): Set<string> {
  const keys = new Set<string>();
  for (const hazard of state.hexHazards ?? []) {
    if (hazard.type === 'SHRAPNEL_RUBBLE' && hazard.durationTurns > 0) {
      for (const coord of hazard.hexCoords) {
        keys.add(toHexKey(coord));
      }
    }
  }
  return keys;
}

/**
 * Collects all hex keys currently marked by active pending bombardments.
 * If hostileToFaction is provided, returns hexes from bombardments launched by opposing factions (or all if omitted).
 */
export function getPendingBombardmentHexKeys(
  state: CombatState,
  hostileToFaction?: Faction
): Set<string> {
  const keys = new Set<string>();
  for (const b of state.pendingBombardments ?? []) {
    if (hostileToFaction && b.sourceFaction && b.sourceFaction === hostileToFaction) {
      continue;
    }
    for (const coord of b.hexCoords) {
      keys.add(toHexKey(coord));
    }
  }
  return keys;
}

/**
 * Decrements durations on hex hazards owned by activeUnitId (or cleans up hazards owned by defeated units)
 * at turn start.
 */
export function tickHexHazardsOnTurnStart(state: CombatState, activeUnitId: string): void {
  if (!state.hexHazards || state.hexHazards.length === 0) return;
  for (const hazard of state.hexHazards) {
    const owner = state.units.get(hazard.sourceUnitId);
    if (hazard.sourceUnitId === activeUnitId || !owner || owner.isDefeated) {
      hazard.durationTurns -= 1;
    }
  }
  state.hexHazards = state.hexHazards.filter((h) => h.durationTurns > 0);
}

/**
 * Resolves any pending bombardments scheduled to detonate on activeUnitId's turn start
 * (or whose caster was defeated while the volley was airborne).
 */
export function resolvePendingBombardmentsOnTurnStart(
  state: CombatState,
  activeUnitId: string,
  diceRoller?: DiceRoller
): CombatEvent[] {
  const effectiveRoller = diceRoller ?? new SeededDiceRoller((state.seed ?? 1337) + state.turnNumber);
  if (!state.pendingBombardments || state.pendingBombardments.length === 0) {
    return [];
  }

  const livingCount = Array.from(state.units.values()).filter((u) => !u.isDefeated).length;
  const toDetonate: PendingBombardment[] = [];
  const remaining: PendingBombardment[] = [];

  for (const b of state.pendingBombardments) {
    const owner = state.units.get(b.sourceUnitId);
    if (b.sourceUnitId === activeUnitId) {
      toDetonate.push(b);
    } else if (!owner || owner.isDefeated) {
      if (b.defeatedFallbackTurns === undefined) {
        b.defeatedFallbackTurns = Math.max(1, livingCount);
      }
      b.defeatedFallbackTurns -= 1;
      if (b.defeatedFallbackTurns <= 0) {
        toDetonate.push(b);
      } else {
        remaining.push(b);
      }
    } else {
      remaining.push(b);
    }
  }

  state.pendingBombardments = remaining;
  if (toDetonate.length === 0) return [];

  const allEvents: CombatEvent[] = [];

  for (const b of toDetonate) {
    const ownerCu = state.units.get(b.sourceUnitId);
    const fallbackUnit = ownerCu?.unit ?? createRecruit(b.sourceUnitId, b.sourceUnitName, { faction: b.sourceFaction ?? 'PLAYER' });
    const snapshotActor: CombatUnit = {
      ...(ownerCu ?? {
        unit: fallbackUnit,
        faction: b.sourceFaction,
        currentHp: 0,
        currentAp: 0,
        initiativeGauge: 0,
        isDefeated: true,
        inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
        activeModifiers: [],
        activeConditions: [],
        abilityModifiers: [],
        abilities: [],
        passives: [],
        facing: 0
      }),
      unit: {
        ...fallbackUnit,
        baseAttributes: {
          force: b.snapshotForce,
          finesse: b.snapshotFinesse,
          focus: b.snapshotFocus
        }
      },
      zeroedInStacks: b.snapshotZeroedInStacks,
      activeConditions: []
    };

    const damageType: 'PHYSICAL' | 'MAGICAL' = b.damageType ?? 'PHYSICAL';
    const defenseTarget = b.defenseTarget ?? 'EVASION';
    const carriedEffects: readonly AbilityEffect[] = b.onHitEffects ?? [];
    const syntheticAbility: EffectiveAbility = {
      id: b.abilityId,
      name: b.abilityName,
      description: 'Delayed siege bombardment impact.',
      archetypeTag: 'FIGHTER',
      apCost: 2,
      minRange: 2,
      range: 4,
      aoeRadius: 1,
      ignoresElevationPenalty: true,
      targetType: 'HEX',
      defenseTarget,
      attackModifierAttribute: b.attackModifierAttribute,
      damageType,
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: b.damageProfile,
          ...(b.flatDamage !== undefined ? { flatDamage: b.flatDamage } : {})
        },
        ...carriedEffects
      ],
      attributions: [],
      appliedModifierIds: [],
      ...(b.attackRollBonus !== undefined ? { attackRollBonus: b.attackRollBonus } : {})
    };

    const hitOutcomes: EffectOutcome[] = [];
    const extraOutcomes: EffectOutcome[] = [];
    const affectedUnitIds: string[] = [];
    let totalDamage = 0;
    let bestHitOutcome: HitOutcome = 'MISS';

    const excludeAllies = hasFriendlyAoEExclusion(snapshotActor);
    const seenUnitIds = new Set<string>();
    for (const hex of b.hexCoords) {
      const unitId = state.arena.getUnitAt(hex);
      if (!unitId || seenUnitIds.has(unitId)) continue;
      seenUnitIds.add(unitId);
      const targetCu = state.units.get(unitId);
      if (!targetCu || targetCu.isDefeated || targetCu.currentHp <= 0) continue;
      if (excludeAllies && isFriendlyUnit(snapshotActor, targetCu)) continue;

      const rollResult = resolveAttackRoll(snapshotActor, targetCu, syntheticAbility, effectiveRoller, {
        state,
        originCoord: b.centerCoord,
        targetCoord: hex,
        elevationDelta: 0
      });

      // Consume EXPOSED if present on target
      if (targetCu.activeConditions?.some((c) => c.type === 'EXPOSED')) {
        targetCu.activeConditions = targetCu.activeConditions.filter((c) => c.type !== 'EXPOSED');
      }

      affectedUnitIds.push(targetCu.unit.id);
      bestHitOutcome = pickBestHitOutcome([bestHitOutcome, rollResult.hitOutcome]);

      const targetDefenseVal = resolveTargetDefense(targetCu, defenseTarget).value;

      if (rollResult.hitOutcome !== 'MISS') {
        const dmg = resolveDamage(
          rollResult.hitOutcome,
          syntheticAbility,
          snapshotActor,
          targetCu,
          effectiveRoller,
          undefined,
          syntheticAbility.effects[0]
        );
        if (dmg.damageDealt > 0) {
          totalDamage += dmg.damageDealt;
          const dmgEvent: CombatEvent = {
            type: 'DAMAGE',
            targetUnitId: targetCu.unit.id,
            amount: dmg.damageDealt,
            damageType,
            reason: 'SPLASH',
            label: 'BARRAGE',
            sourceUnitId: b.sourceUnitId,
            isCrit: rollResult.hitOutcome === 'CRITICAL_HIT',
            coord: { q: hex.q, r: hex.r }
          };
          applyCombatEvents(state, [dmgEvent], { claimed: true, logDefeats: true });
          allEvents.push(dmgEvent);
        }

        // Dispatch carried hostile target-scoped ON_RESOLVE shard infusions on living hit targets
        const targetConditions: {
          readonly condition: ConditionType;
          readonly durationTurns: number;
          readonly damagePerTurn?: number;
        }[] = [];
        const detonationOriginCoord =
          b.snapshotOriginCoord ?? state.arena.getUnitPosition(b.sourceUnitId);
        if (!targetCu.isDefeated && carriedEffects.length > 0) {
          const infusionRes = executeAbilityEffects(
            syntheticAbility,
            {
              state,
              actorCu: snapshotActor,
              targetCu,
              targetCoord: hex,
              originCoord: detonationOriginCoord,
              ability: syntheticAbility,
              hitOutcome: rollResult.hitOutcome,
              diceRoller: effectiveRoller
            },
            defaultEffectRegistry,
            (e) =>
              getEffectTiming(e) === 'ON_RESOLVE' &&
              isDispatchableEffect(e) &&
              !isSelfScopedEffect(e) &&
              !isPrimaryTargetOnlyEffect(e)
          );
          if (infusionRes.events.length > 0) {
            applyCombatEvents(state, infusionRes.events, { claimed: true, logDefeats: true });
            allEvents.push(...infusionRes.events);
          }
          for (const out of infusionRes.effects ?? []) {
            if (out.kind === 'CONDITION') {
              targetConditions.push({
                condition: out.condition,
                durationTurns: out.durationTurns,
                ...(out.damagePerTurn !== undefined ? { damagePerTurn: out.damagePerTurn } : {})
              });
            } else if (!(out.kind === 'CONTEXT' && out.context === 'GRAZE_NEGATED')) {
              extraOutcomes.push(out);
            }
          }
        }

        hitOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: 'Barrage',
          targetName: targetCu.unit.name,
          damage: dmg.damageDealt,
          damageType,
          hitOutcome: rollResult.hitOutcome,
          defenseTarget: targetDefenseVal,
          targetHp: targetCu.currentHp,
          targetMaxHp: targetCu.unit.effectiveVitals.maxHp,
          ...(targetConditions.length > 0 ? { conditions: targetConditions } : {})
        });
      } else {
        allEvents.push({
          type: 'MISS',
          targetUnitId: targetCu.unit.id,
          reason: `${b.abilityName} missed ${targetCu.unit.name}`,
          coord: { q: hex.q, r: hex.r }
        });

        hitOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: 'Barrage',
          targetName: targetCu.unit.name,
          damage: 0,
          damageType,
          hitOutcome: 'MISS',
          defenseTarget: targetDefenseVal,
          targetHp: targetCu.currentHp,
          targetMaxHp: targetCu.unit.effectiveVitals.maxHp
        });
      }
    }

    // Trigger any carried HIT_OR_CRIT SELF-scoped shard buffs once on the living launcher
    if (
      ownerCu &&
      !ownerCu.isDefeated &&
      carriedEffects.some((e) => getEffectTiming(e) === 'ON_RESOLVE' && isDispatchableEffect(e) && isSelfScopedEffect(e))
    ) {
      const selfRes = executeAbilityEffects(
        syntheticAbility,
        {
          state,
          actorCu: ownerCu,
          targetCu: ownerCu,
          targetCoord: b.centerCoord,
          ability: syntheticAbility,
          hitOutcome: bestHitOutcome,
          diceRoller: effectiveRoller
        },
        defaultEffectRegistry,
        (e) => getEffectTiming(e) === 'ON_RESOLVE' && isDispatchableEffect(e) && isSelfScopedEffect(e)
      );
      if (selfRes.events.length > 0) {
        applyCombatEvents(state, selfRes.events, { claimed: true, logDefeats: true });
        allEvents.push(...selfRes.events);
      }
      if (selfRes.effects) {
        extraOutcomes.push(...selfRes.effects);
      }
    }

    const loggedEffects: EffectOutcome[] =
      hitOutcomes.length > 0
        ? [...hitOutcomes, ...extraOutcomes]
        : [
            {
              kind: 'CONTEXT',
              context: 'ELEVATION',
              label: 'Empty Blast Zone',
              detail: `No targets caught at (${b.centerCoord.q}, ${b.centerCoord.r})`
            }
          ];

    combatLogger.logUtility(state, {
      actorCu: snapshotActor,
      ability: syntheticAbility,
      targetName: `hex (${b.centerCoord.q}, ${b.centerCoord.r})`,
      damageTotal: totalDamage > 0 ? String(totalDamage) : undefined,
      effects: loggedEffects,
      affectedUnitIds: affectedUnitIds.length > 0 ? affectedUnitIds : undefined,
      message:
        totalDamage > 0
          ? `${b.sourceUnitName}'s ${b.abilityName} crashed down on (${b.centerCoord.q}, ${b.centerCoord.r}), dealing ${totalDamage} total damage!`
          : hitOutcomes.length > 0
            ? `${b.sourceUnitName}'s ${b.abilityName} crashed down on (${b.centerCoord.q}, ${b.centerCoord.r}), missing all targets in the blast!`
            : `${b.sourceUnitName}'s ${b.abilityName} crashed down on (${b.centerCoord.q}, ${b.centerCoord.r}) with no targets caught in the blast.`
    });
  }

  state.outcome = evaluateEncounterOutcome(state.objectives, state);
  return allEvents;
}

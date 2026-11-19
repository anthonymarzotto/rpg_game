import { CombatEvent, CombatState, CombatUnit, EffectOutcome, PendingBombardment } from './types';
import { toHexKey } from '../grid/hex';
import { Faction } from '../types/unit';
import { Ability } from '../types/ability';
import { DiceRoller, SeededDiceRoller } from './dice';
import { resolveAttackRoll } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { getEffectiveEvasion } from './effectiveVitals';
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

    const syntheticAbility: Ability = {
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
      defenseTarget: 'EVASION',
      attackModifierAttribute: b.attackModifierAttribute,
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: b.damageProfile
        }
      ]
    };

    const hitOutcomes: EffectOutcome[] = [];
    const affectedUnitIds: string[] = [];
    let totalDamage = 0;

    for (const hex of b.hexCoords) {
      const unitId = state.arena.getUnitAt(hex);
      if (!unitId) continue;
      const targetCu = state.units.get(unitId);
      if (!targetCu || targetCu.isDefeated || targetCu.currentHp <= 0) continue;

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
          targetCu.currentHp = Math.max(0, targetCu.currentHp - dmg.damageDealt);
          totalDamage += dmg.damageDealt;
          affectedUnitIds.push(targetCu.unit.id);
          allEvents.push({
            type: 'DAMAGE',
            targetUnitId: targetCu.unit.id,
            amount: dmg.damageDealt,
            damageType: 'PHYSICAL',
            reason: 'SPLASH',
            label: 'BARRAGE',
            sourceUnitId: b.sourceUnitId,
            isCrit: rollResult.hitOutcome === 'CRITICAL_HIT'
          });

          if (targetCu.currentHp <= 0) {
            targetCu.isDefeated = true;
            state.arena.removeUnit(targetCu.unit.id);
            combatLogger.logDefeat(state, { cu: targetCu });
          }
        }

        hitOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: 'Barrage',
          targetName: targetCu.unit.name,
          damage: dmg.damageDealt,
          damageType: 'PHYSICAL',
          hitOutcome: rollResult.hitOutcome,
          defenseTarget: getEffectiveEvasion(targetCu),
          targetHp: targetCu.currentHp,
          targetMaxHp: targetCu.unit.effectiveVitals.maxHp
        });
      } else {
        allEvents.push({
          type: 'MISS',
          targetUnitId: targetCu.unit.id,
          reason: `${b.abilityName} missed ${targetCu.unit.name}`
        });
      }
    }

    combatLogger.logUtility(state, {
      actorCu: snapshotActor,
      ability: syntheticAbility,
      damageTotal: totalDamage > 0 ? String(totalDamage) : undefined,
      effects: hitOutcomes.length > 0 ? hitOutcomes : undefined,
      affectedUnitIds: affectedUnitIds.length > 0 ? affectedUnitIds : undefined,
      message:
        affectedUnitIds.length > 0
          ? `${b.sourceUnitName}'s ${b.abilityName} crashed down on (${b.centerCoord.q}, ${b.centerCoord.r}), dealing ${totalDamage} total damage!`
          : `${b.sourceUnitName}'s ${b.abilityName} crashed down on (${b.centerCoord.q}, ${b.centerCoord.r}) with no targets caught in the blast.`
    });
  }

  state.outcome = evaluateEncounterOutcome(state.objectives, state);
  return allEvents;
}

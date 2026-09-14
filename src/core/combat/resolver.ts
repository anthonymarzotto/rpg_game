import { Unit } from '../types/unit';
import { HexCoord, hexDistance, hexSubtract, hexAdd } from '../grid/hex';
import { Arena, KnockbackResult } from '../grid/arena';
import { Ability } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  AttackResolution,
  HitOutcome
} from './types';
import { DiceRoller, SeededDiceRoller } from './dice';
import {
  COMBAT_RESOLUTION_CONFIG,
  DISPLACEMENT_CONFIG,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';
import { advanceTurnClock } from './turnClock';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Initializes a new combat state container with living units placed in the arena.
 */
export function createCombatState(
  arena: Arena,
  units: readonly Unit[],
  initialActiveUnitId?: string
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();

  for (const unit of units) {
    combatUnits.set(unit.id, {
      unit,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      tempBuffs: { armor: 0, ward: 0, movePenalty: 0 }
    });
  }

  const state: CombatState = {
    arena,
    units: combatUnits,
    activeUnitId: '',
    turnNumber: 0,
    combatLog: []
  };

  if (initialActiveUnitId && combatUnits.has(initialActiveUnitId)) {
    state.activeUnitId = initialActiveUnitId;
    state.turnNumber = 1;
    const activeCu = combatUnits.get(initialActiveUnitId)!;
    activeCu.unit.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
  } else {
    advanceTurnClock(state);
  }

  return state;
}

/**
 * Checks if the active unit can legally move to destination.
 */
export function canMove(
  state: CombatState,
  unitId: string,
  destination: HexCoord
): boolean {
  if (state.activeUnitId !== unitId) return false;
  const cu = state.units.get(unitId);
  if (!cu || cu.unit.isDefeated || cu.unit.currentAp < 1) return false;

  const currentCoord = state.arena.getUnitPosition(unitId);
  if (!currentCoord) return false;

  const effectiveMove = Math.max(
    1,
    cu.unit.effectiveVitals.move - cu.tempBuffs.movePenalty
  );
  const reachable = state.arena.getReachableHexes(currentCoord, effectiveMove);

  return reachable.some((h) => h.q === destination.q && h.r === destination.r);
}

/**
 * Executes a move action (costs 1 AP).
 */
export function executeMove(
  state: CombatState,
  unitId: string,
  destination: HexCoord
): void {
  if (!canMove(state, unitId, destination)) {
    throw new Error(`Illegal move action to (${destination.q}, ${destination.r}) for unit ${unitId}.`);
  }

  const cu = state.units.get(unitId)!;
  cu.unit.currentAp -= 1;
  state.arena.setUnitPosition(unitId, destination);

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId: unitId,
    actionId: 'move',
    message: `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${cu.unit.currentAp}]`
  });
}

/**
 * Evaluates whether an ability can be cast against a target.
 */
export function canExecuteAbility(
  state: CombatState,
  unitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string }
): { valid: boolean; reason?: string } {
  if (state.activeUnitId !== unitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(unitId);
  if (!cu || cu.unit.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.unit.currentAp < ability.apCost) {
    return { valid: false, reason: `Insufficient AP (requires ${ability.apCost}, has ${cu.unit.currentAp}).` };
  }

  const actorCoord = state.arena.getUnitPosition(unitId);
  if (!actorCoord) {
    return { valid: false, reason: 'Actor not placed on arena.' };
  }

  if (ability.targetType === 'SELF') {
    return { valid: true };
  }

  if (ability.targetType === 'SINGLE_TARGET' || ability.targetType === 'ALLY') {
    if (!target?.targetUnitId) {
      return { valid: false, reason: 'Missing target unit.' };
    }
    const targetCu = state.units.get(target.targetUnitId);
    if (!targetCu || targetCu.unit.isDefeated) {
      return { valid: false, reason: 'Target unit does not exist or is defeated.' };
    }
    const targetCoord = state.arena.getUnitPosition(target.targetUnitId);
    if (!targetCoord) {
      return { valid: false, reason: 'Target unit not placed on arena.' };
    }

    const dist = hexDistance(actorCoord, targetCoord);
    if (dist > ability.range) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${ability.range}).` };
    }

    if (!state.arena.hasLineOfSight(actorCoord, targetCoord)) {
      return { valid: false, reason: 'Line-of-Sight is blocked.' };
    }
  }

  return { valid: true };
}

/**
 * Resolves an ability execution including to-hit roll, damage, mitigation,
 * displacement with wall-slam collision, and in-battle archetype XP award.
 */
export function executeAbility(
  state: CombatState,
  unitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string },
  diceRoller: DiceRoller = defaultDiceRoller
): AttackResolution | undefined {
  const validation = canExecuteAbility(state, unitId, ability, target);
  if (!validation.valid) {
    throw new Error(`Cannot execute ability ${ability.name}: ${validation.reason}`);
  }

  const actorCu = state.units.get(unitId)!;
  actorCu.unit.currentAp -= ability.apCost;

  // 1. Award In-Battle Archetype XP on execution
  if (ability.archetypeTag === 'FIGHTER') {
    actorCu.inBattleXp.fighter += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'ROGUE') {
    actorCu.inBattleXp.rogue += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'MAGE') {
    actorCu.inBattleXp.mage += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  }

  // Handle Self or Ally buffs without attack rolls (e.g. Minor Ward, Brace)
  if (ability.damageType === 'NONE') {
    const targetCu = target?.targetUnitId ? state.units.get(target.targetUnitId) : actorCu;
    if (targetCu && ability.effect?.type === 'WARD_BUFF') {
      targetCu.tempBuffs.ward += ability.effect.magnitude;
    }
    if (ability.effect?.type === 'ARMOR_BUFF') {
      actorCu.tempBuffs.armor += ability.effect.magnitude;
    }

    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId: unitId,
      actionId: ability.id,
      message: `${actorCu.unit.name} used ${ability.name}.`
    });

    return undefined;
  }

  // 2. Attack Roll (To Hit)
  const targetCu = state.units.get(target!.targetUnitId!)!;
  const actorCoord = state.arena.getUnitPosition(unitId)!;
  const targetCoord = state.arena.getUnitPosition(target!.targetUnitId!)!;

  const modifier =
    ability.damageProfile?.modifierAttribute === 'FORCE'
      ? actorCu.unit.baseAttributes.force
      : ability.damageProfile?.modifierAttribute === 'FINESSE'
      ? actorCu.unit.baseAttributes.finesse
      : actorCu.unit.baseAttributes.focus;

  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? targetCu.unit.effectiveVitals.evasion
      : targetCu.unit.effectiveVitals.resolve;

  const d20 = diceRoller.rollD20();
  const totalScore = d20 + modifier;

  let hitOutcome: HitOutcome = 'MISS';
  const critMargin = COMBAT_RESOLUTION_CONFIG.critThresholdMargin;
  const isCritBoosted = ability.effect?.type === 'CRIT_BOOST';
  const naturalCritThreshold = isCritBoosted ? 19 : 20;

  if (d20 >= naturalCritThreshold || totalScore >= targetDefense + critMargin) {
    hitOutcome = 'CRITICAL_HIT';
  } else if (d20 === 1 || totalScore < targetDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
    hitOutcome = 'MISS';
  } else if (totalScore >= targetDefense) {
    hitOutcome = 'SOLID_HIT';
  } else {
    hitOutcome = 'GRAZE';
  }

  // 3. Damage Calculation & Mitigation
  let damageDealt = 0;
  let rawDamage = 0;
  let mitigation = 0;

  if (hitOutcome !== 'MISS' && ability.damageProfile) {
    const { count, sides } = ability.damageProfile;

    if (hitOutcome === 'CRITICAL_HIT') {
      // Maximized Crit: max dice + roll dice + modifier
      rawDamage = count * sides + diceRoller.rollDice(count, sides) + modifier;
    } else {
      rawDamage = diceRoller.rollDice(count, sides) + modifier;
    }

    mitigation =
      ability.damageType === 'PHYSICAL'
        ? targetCu.unit.effectiveVitals.armor + targetCu.tempBuffs.armor
        : targetCu.unit.effectiveVitals.ward + targetCu.tempBuffs.ward;

    let subtotal = rawDamage - mitigation;

    if (hitOutcome === 'GRAZE') {
      subtotal = Math.floor(subtotal * COMBAT_RESOLUTION_CONFIG.grazeDamageMultiplier);
    }

    damageDealt = Math.max(COMBAT_RESOLUTION_CONFIG.minimumDamage, subtotal);
    targetCu.unit.currentHp = Math.max(0, targetCu.unit.currentHp - damageDealt);

    if (targetCu.unit.currentHp === 0) {
      targetCu.unit.isDefeated = true;
      state.arena.removeUnit(targetCu.unit.id);
    }
  }

  // 4. Secondary Effects (Knockback, Retreat Step, Slow, Buffs)
  let knockbackResult: KnockbackResult | undefined;
  let wallSlamDamage: number | undefined;

  // Secondary effects trigger on SOLID_HIT or CRITICAL_HIT, but NOT on GRAZE or MISS
  if (hitOutcome === 'SOLID_HIT' || hitOutcome === 'CRITICAL_HIT') {
    if (ability.effect?.type === 'KNOCKBACK') {
      knockbackResult = state.arena.calculateKnockback(
        actorCoord,
        targetCoord,
        ability.effect.magnitude
      );

      if (knockbackResult.isCollided) {
        // Wall-Slam Damage: 1 + Attacker Force - Target Armour
        const targetArmor = targetCu.unit.effectiveVitals.armor + targetCu.tempBuffs.armor;
        wallSlamDamage = Math.max(
          1,
          DISPLACEMENT_CONFIG.wallSlamBaseDamage + actorCu.unit.baseAttributes.force - targetArmor
        );
        targetCu.unit.currentHp = Math.max(0, targetCu.unit.currentHp - wallSlamDamage);
        if (targetCu.unit.currentHp === 0) {
          targetCu.unit.isDefeated = true;
          state.arena.removeUnit(targetCu.unit.id);
        }

        // Secondary impact if collided into another unit
        if (knockbackResult.collidingUnitId) {
          const bystanderCu = state.units.get(knockbackResult.collidingUnitId);
          if (bystanderCu && !bystanderCu.unit.isDefeated) {
            bystanderCu.unit.currentHp = Math.max(
              0,
              bystanderCu.unit.currentHp - DISPLACEMENT_CONFIG.unitCollisionSecondaryDamage
            );
            if (bystanderCu.unit.currentHp === 0) {
              bystanderCu.unit.isDefeated = true;
              state.arena.removeUnit(bystanderCu.unit.id);
            }
          }
        }
      } else {
        // Clear knockback: move target to final destination
        state.arena.setUnitPosition(targetCu.unit.id, knockbackResult.finalCoord);
      }
    } else if (ability.effect?.type === 'RETREAT_STEP') {
      // Free-step 1 hex backward away from target
      const retreatDir = hexSubtract(actorCoord, targetCoord);
      const retreatDest = hexAdd(actorCoord, retreatDir);
      const destTile = state.arena.getTile(retreatDest);
      if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
        state.arena.setUnitPosition(unitId, retreatDest);
      }
    } else if (ability.effect?.type === 'SLOW') {
      targetCu.tempBuffs.movePenalty += ability.effect.magnitude;
    }
  }

  // 5. Log Entry
  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId: unitId,
    actionId: ability.id,
    message: `${actorCu.unit.name} used ${ability.name} on ${targetCu.unit.name}: [d20: ${d20}+${modifier} vs DC ${targetDefense} -> ${hitOutcome}] Damage: ${damageDealt} (HP: ${targetCu.unit.currentHp}/${targetCu.unit.effectiveVitals.maxHp})`
  });

  return {
    hitOutcome,
    d20Roll: d20,
    modifier,
    totalAttackScore: totalScore,
    defenseTargetScore: targetDefense,
    rawDamage,
    mitigation,
    damageDealt,
    effectsApplied: ability.effect ? [ability.effect] : [],
    knockbackResult,
    wallSlamDamage
  };
}

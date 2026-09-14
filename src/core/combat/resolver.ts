import { Unit } from '../types/unit';
import { HexCoord, hexDistance, hexSubtract, hexAdd } from '../grid/hex';
import { Arena, KnockbackResult } from '../grid/arena';
import { Ability, AbilityEffect } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  AttackResolution,
  HitOutcome,
  getEffectiveMove,
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveEvasion,
  getEffectiveResolve
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
      activeModifiers: []
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

  const effectiveMove = getEffectiveMove(cu);
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

// -----------------------------------------------------------------------------
// Private Combat Resolution Pipeline Helpers
// -----------------------------------------------------------------------------

function getAbilityModifier(actorCu: CombatUnit, ability: Ability): number {
  if (ability.damageProfile?.modifierAttribute === 'FORCE') {
    return actorCu.unit.baseAttributes.force;
  }
  if (ability.damageProfile?.modifierAttribute === 'FINESSE') {
    return actorCu.unit.baseAttributes.finesse;
  }
  if (ability.damageProfile?.modifierAttribute === 'FOCUS') {
    return actorCu.unit.baseAttributes.focus;
  }
  return 0;
}

function resolveAttackRoll(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  diceRoller: DiceRoller
): {
  hitOutcome: HitOutcome;
  d20: number;
  modifier: number;
  totalScore: number;
  targetDefense: number;
} {
  const modifier = getAbilityModifier(actorCu, ability);
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  const d20 = diceRoller.rollD20();
  const totalScore = d20 + modifier;

  const critMargin = COMBAT_RESOLUTION_CONFIG.critThresholdMargin;
  const isCritBoosted = ability.effect?.type === 'CRIT_BOOST';
  const naturalCritThreshold = isCritBoosted ? 19 : 20;

  let hitOutcome: HitOutcome = 'MISS';
  if (d20 >= naturalCritThreshold || totalScore >= targetDefense + critMargin) {
    hitOutcome = 'CRITICAL_HIT';
  } else if (d20 === 1 || totalScore < targetDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
    hitOutcome = 'MISS';
  } else if (totalScore >= targetDefense) {
    hitOutcome = 'SOLID_HIT';
  } else {
    hitOutcome = 'GRAZE';
  }

  return { hitOutcome, d20, modifier, totalScore, targetDefense };
}

function resolveDamage(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  diceRoller: DiceRoller
): { rawDamage: number; mitigation: number; damageDealt: number } {
  if (hitOutcome === 'MISS' || !ability.damageProfile) {
    return { rawDamage: 0, mitigation: 0, damageDealt: 0 };
  }

  const { count, sides } = ability.damageProfile;
  const modifier = getAbilityModifier(actorCu, ability);

  // Maximized Crit: max base dice + rolled dice + modifier
  const rawDamage =
    hitOutcome === 'CRITICAL_HIT'
      ? count * sides + diceRoller.rollDice(count, sides) + modifier
      : diceRoller.rollDice(count, sides) + modifier;

  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  let subtotal = rawDamage - mitigation;
  if (hitOutcome === 'GRAZE') {
    subtotal = Math.floor(subtotal * COMBAT_RESOLUTION_CONFIG.grazeDamageMultiplier);
  }

  const damageDealt = Math.max(COMBAT_RESOLUTION_CONFIG.minimumDamage, subtotal);
  targetCu.unit.currentHp = Math.max(0, targetCu.unit.currentHp - damageDealt);

  return { rawDamage, mitigation, damageDealt };
}

function resolveSecondaryEffects(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  state: CombatState
): {
  effectsApplied: readonly AbilityEffect[];
  knockbackResult?: KnockbackResult;
  wallSlamDamage?: number;
} {
  // Secondary effects only trigger on SOLID_HIT or CRITICAL_HIT
  if (hitOutcome !== 'SOLID_HIT' && hitOutcome !== 'CRITICAL_HIT') {
    return { effectsApplied: [] };
  }
  if (!ability.effect) {
    return { effectsApplied: [] };
  }

  const effect = ability.effect;
  const actorCoord = state.arena.getUnitPosition(actorCu.unit.id)!;
  const targetCoord = state.arena.getUnitPosition(targetCu.unit.id)!;

  let knockbackResult: KnockbackResult | undefined;
  let wallSlamDamage: number | undefined;

  if (effect.type === 'KNOCKBACK') {
    knockbackResult = state.arena.calculateKnockback(
      actorCoord,
      targetCoord,
      effect.magnitude
    );

    if (knockbackResult.isCollided) {
      // Wall-Slam Damage: 1 + Attacker Force - Target Armour
      const targetArmor = getEffectiveArmor(targetCu);
      wallSlamDamage = Math.max(
        1,
        DISPLACEMENT_CONFIG.wallSlamBaseDamage + actorCu.unit.baseAttributes.force - targetArmor
      );
      targetCu.unit.currentHp = Math.max(0, targetCu.unit.currentHp - wallSlamDamage);

      if (knockbackResult.collidingUnitId) {
        const bystander = state.units.get(knockbackResult.collidingUnitId);
        if (bystander && !bystander.unit.isDefeated) {
          bystander.unit.currentHp = Math.max(
            0,
            bystander.unit.currentHp - DISPLACEMENT_CONFIG.unitCollisionSecondaryDamage
          );
          if (bystander.unit.currentHp === 0) {
            bystander.unit.isDefeated = true;
            state.arena.removeUnit(bystander.unit.id);
          }
        }
      }
    } else {
      state.arena.setUnitPosition(targetCu.unit.id, knockbackResult.finalCoord);
    }
  } else if (effect.type === 'RETREAT_STEP') {
    const retreatDir = hexSubtract(actorCoord, targetCoord);
    const retreatDest = hexAdd(actorCoord, retreatDir);
    const destTile = state.arena.getTile(retreatDest);
    if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
      state.arena.setUnitPosition(actorCu.unit.id, retreatDest);
    }
  } else if (effect.type === 'SLOW') {
    targetCu.activeModifiers.push({
      stat: 'move',
      value: -effect.magnitude,
      durationTurns: effect.durationTurns ?? 1
    });
  }

  return {
    effectsApplied: [effect],
    knockbackResult,
    wallSlamDamage
  };
}

// -----------------------------------------------------------------------------
// Public Ability Execution
// -----------------------------------------------------------------------------

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

  // 2. Non-damaging buffs (e.g. Minor Ward, Brace)
  if (ability.damageType === 'NONE') {
    const targetCu = target?.targetUnitId ? state.units.get(target.targetUnitId) : actorCu;
    if (targetCu && ability.effect?.type === 'WARD_BUFF') {
      targetCu.activeModifiers.push({
        stat: 'ward',
        value: ability.effect.magnitude,
        durationTurns: ability.effect.durationTurns ?? 1
      });
    }
    if (ability.effect?.type === 'ARMOR_BUFF') {
      actorCu.activeModifiers.push({
        stat: 'armor',
        value: ability.effect.magnitude,
        durationTurns: ability.effect.durationTurns ?? 1
      });
    }

    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId: unitId,
      actionId: ability.id,
      message: `${actorCu.unit.name} used ${ability.name}.`
    });

    return undefined;
  }

  // 3. Attack Roll & Damage Resolution
  const targetCu = state.units.get(target!.targetUnitId!)!;
  const rollResult = resolveAttackRoll(actorCu, targetCu, ability, diceRoller);
  const damageResult = resolveDamage(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    diceRoller
  );

  // 4. Secondary Effects (Knockback, Retreat Step, Slow)
  const effectResult = resolveSecondaryEffects(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    state
  );

  // 5. Defeat Check
  if (targetCu.unit.currentHp <= 0) {
    targetCu.unit.isDefeated = true;
    state.arena.removeUnit(targetCu.unit.id);
  }

  // 6. Logging
  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId: unitId,
    actionId: ability.id,
    message: `${actorCu.unit.name} used ${ability.name} on ${targetCu.unit.name}: [d20: ${rollResult.d20}+${rollResult.modifier} vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}] Damage: ${damageResult.damageDealt} (HP: ${targetCu.unit.currentHp}/${targetCu.unit.effectiveVitals.maxHp})`
  });

  return {
    hitOutcome: rollResult.hitOutcome,
    d20Roll: rollResult.d20,
    modifier: rollResult.modifier,
    totalAttackScore: rollResult.totalScore,
    defenseTargetScore: rollResult.targetDefense,
    rawDamage: damageResult.rawDamage,
    mitigation: damageResult.mitigation,
    damageDealt: damageResult.damageDealt,
    effectsApplied: effectResult.effectsApplied,
    knockbackResult: effectResult.knockbackResult,
    wallSlamDamage: effectResult.wallSlamDamage
  };
}

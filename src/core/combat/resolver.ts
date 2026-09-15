import { Unit } from '../types/unit';
import { HexCoord, hexDistance } from '../grid/hex';
import { Arena } from '../grid/arena';
import { Ability } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  ValidationResult,
  AbilityResolution,
  CombatEvent,
  getEffectiveMove
} from './types';
import { DiceRoller, SeededDiceRoller } from './dice';
import {
  COMBAT_RESOLUTION_CONFIG,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';
import { advanceTurnClock } from './turnClock';
import { resolveAttackRoll } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { executeAbilityEffects } from './effects';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Retrieves a CombatUnit by ID or throws a descriptive error.
 */
export function requireCombatUnit(state: CombatState, unitId: string): CombatUnit {
  const cu = state.units.get(unitId);
  if (!cu) {
    throw new Error(`Unit ${unitId} not found in combat state.`);
  }
  return cu;
}

/**
 * Retrieves a unit's position in the arena or throws a descriptive error.
 */
export function requireUnitPosition(arena: Arena, unitId: string): HexCoord {
  const pos = arena.getUnitPosition(unitId);
  if (!pos) {
    throw new Error(`Unit ${unitId} is not placed on the arena.`);
  }
  return pos;
}

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
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: 0,
      isDefeated: false,
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
    activeCu.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
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
  actorUnitId: string,
  destination: HexCoord
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < 1) {
    return { valid: false, reason: 'Insufficient AP to move (costs 1 AP).' };
  }

  const currentCoord = state.arena.getUnitPosition(actorUnitId);
  if (!currentCoord) {
    return { valid: false, reason: 'Unit is not placed on the arena.' };
  }

  const effectiveMove = getEffectiveMove(cu);
  const reachable = state.arena.getReachableHexes(currentCoord, effectiveMove);

  if (!reachable.some((h) => h.q === destination.q && h.r === destination.r)) {
    return { valid: false, reason: `Destination (${destination.q}, ${destination.r}) is not reachable.` };
  }

  return { valid: true };
}

/**
 * Executes a move action (costs 1 AP).
 */
export function executeMove(
  state: CombatState,
  actorUnitId: string,
  destination: HexCoord
): void {
  const validation = canMove(state, actorUnitId, destination);
  if (!validation.valid) {
    throw new Error(`Illegal move action to (${destination.q}, ${destination.r}) for unit ${actorUnitId}: ${validation.reason}`);
  }

  const cu = requireCombatUnit(state, actorUnitId);
  cu.currentAp -= 1;
  state.arena.setUnitPosition(actorUnitId, destination);

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: 'move',
    message: `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${cu.currentAp}]`
  });
}

/**
 * Evaluates whether an ability can be cast against a target.
 */
export function canExecuteAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string }
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < ability.apCost) {
    return { valid: false, reason: `Insufficient AP (requires ${ability.apCost}, has ${cu.currentAp}).` };
  }

  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCoord) {
    return { valid: false, reason: 'Actor not placed on arena.' };
  }

  if (ability.targetType === 'SELF') {
    return { valid: true };
  }

  const targetUnitId =
    ability.targetType === 'ALLY' && !target?.targetUnitId
      ? actorUnitId
      : target?.targetUnitId;

  if (ability.targetType === 'SINGLE_TARGET' || ability.targetType === 'ALLY') {
    if (!targetUnitId) {
      return { valid: false, reason: 'Missing target unit.' };
    }
    const targetCu = state.units.get(targetUnitId);
    if (!targetCu || targetCu.isDefeated) {
      return { valid: false, reason: 'Target unit does not exist or is defeated.' };
    }
    const targetCoord = state.arena.getUnitPosition(targetUnitId);
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
 * Applies a stream of atomic combat events to the mutable battle state.
 */
function applyCombatEvents(state: CombatState, events: readonly CombatEvent[]): void {
  for (const event of events) {
    if (event.type === 'DAMAGE') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        cu.currentHp = Math.max(0, cu.currentHp - event.amount);
        if (cu.currentHp === 0) {
          cu.isDefeated = true;
          state.arena.removeUnit(event.targetUnitId);
        }
      }
    } else if (event.type === 'DISPLACEMENT') {
      state.arena.setUnitPosition(event.unitId, event.toCoord);
    } else if (event.type === 'STATUS_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        cu.activeModifiers.push(event.modifier);
      }
    }
  }
}

/**
 * Resolves an ability execution including to-hit roll, damage, mitigation,
 * pluggable effect dispatch, state event application, and in-battle archetype XP award.
 */
export function executeAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string },
  diceRoller: DiceRoller = defaultDiceRoller
): AbilityResolution {
  const validation = canExecuteAbility(state, actorUnitId, ability, target);
  if (!validation.valid) {
    throw new Error(`Cannot execute ability ${ability.name}: ${validation.reason}`);
  }

  const actorCu = requireCombatUnit(state, actorUnitId);
  actorCu.currentAp -= ability.apCost;

  // Award In-Battle Archetype XP on execution
  if (ability.archetypeTag === 'FIGHTER') {
    actorCu.inBattleXp.fighter += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'ROGUE') {
    actorCu.inBattleXp.rogue += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'MAGE') {
    actorCu.inBattleXp.mage += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  }

  // 1. Support / Buff abilities (DamageType === 'NONE')
  if (ability.damageType === 'NONE') {
    const targetId = target?.targetUnitId ?? actorUnitId;
    const targetCu = requireCombatUnit(state, targetId);

    const effectResult = executeAbilityEffects(ability, {
      state,
      actorCu,
      targetCu,
      targetCoord: target?.coord,
      ability,
      hitOutcome: 'SOLID_HIT',
      diceRoller
    });

    applyCombatEvents(state, effectResult.events);

    const statusEvent = effectResult.events.find(
      (e): e is Extract<CombatEvent, { type: 'STATUS_APPLIED' }> => e.type === 'STATUS_APPLIED'
    );
    const appliedModifier = statusEvent?.modifier ?? {
      stat: 'armor',
      value: 0,
      durationTurns: 0
    };

    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: ability.id,
      message: `${actorCu.unit.name} used ${ability.name}.${effectResult.logDetail ?? ''}`
    });

    return {
      type: 'BUFF',
      targetUnitId: targetId,
      modifierApplied: appliedModifier,
      events: effectResult.events
    };
  }

  // 2. Damaging Attack Resolution
  const targetCu = requireCombatUnit(state, target!.targetUnitId!);
  const rollResult = resolveAttackRoll(actorCu, targetCu, ability, diceRoller);
  const damageResult = resolveDamage(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    diceRoller
  );

  const events: CombatEvent[] = [];

  // Primary Damage Event
  if (damageResult.damageDealt > 0) {
    events.push({
      type: 'DAMAGE',
      targetUnitId: targetCu.unit.id,
      amount: damageResult.damageDealt,
      damageType: ability.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
      reason: 'ATTACK',
      sourceUnitId: actorCu.unit.id,
      isCrit: rollResult.hitOutcome === 'CRITICAL_HIT'
    });
  }

  // Dispatch secondary effects via pluggable registry
  const effectResult = executeAbilityEffects(ability, {
    state,
    actorCu,
    targetCu,
    targetCoord: target?.coord,
    ability,
    hitOutcome: rollResult.hitOutcome,
    diceRoller
  });

  events.push(...effectResult.events);

  // Apply all events to state
  applyCombatEvents(state, events);

  // Combat Log
  const secondaryDetail = effectResult.logDetail ?? '';
  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: ability.id,
    message: `${actorCu.unit.name} used ${ability.name} on ${targetCu.unit.name}: [d20: ${rollResult.d20}+${rollResult.modifier} vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}] [Damage: ${damageResult.damageBreakdown}] (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})${secondaryDetail}`
  });

  return {
    type: 'ATTACK',
    details: {
      hitOutcome: rollResult.hitOutcome,
      d20Roll: rollResult.d20,
      modifier: rollResult.modifier,
      totalAttackScore: rollResult.totalScore,
      defenseTargetScore: rollResult.targetDefense,
      rawDamage: damageResult.rawDamage,
      mitigation: damageResult.mitigation,
      damageDealt: damageResult.damageDealt,
      damageBreakdown: damageResult.damageBreakdown,
      effectsApplied: ability.effect ? [ability.effect] : [],
      knockbackResult: effectResult.knockbackResult,
      wallSlamDamage: effectResult.wallSlamDamage,
      events
    }
  };
}

// Re-export subsystems for convenient consumer access
export { resolveAttackRoll, getAbilityModifier } from './attackRoll';
export { resolveDamage } from './damageEngine';
export { executeAbilityEffects, defaultEffectRegistry } from './effects';

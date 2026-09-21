import { Unit } from '../types/unit';
import {
  HexCoord,
  HEX_DIRECTIONS,
  getHexNeighbors,
  getHexesInRange,
  hexEquals,
  hexDistance,
  getDirectionBetween,
  getCombatArc
} from '../grid/hex';
import { Arena } from '../grid/arena';
import { Ability } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  AbilityResolution,
  CombatEvent
} from './types';
import { canMove, canExecuteAbility } from './validator';
import { DiceRoller, SeededDiceRoller, RollAdvantage } from './dice';
import {
  COMBAT_RESOLUTION_CONFIG,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';
import { advanceTurnClock } from './turnClock';
import { resolveAttackRoll } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { executeAbilityEffects } from './effects';
import { evaluateRollPassives } from './passives';
import { evaluateEncounterOutcome } from './objectives';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';

const defaultDiceRoller = new SeededDiceRoller();

const defaultLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

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
  initialActiveUnitId?: string,
  loadoutProviders: LoadoutLookupProviders = defaultLoadoutProviders
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();

  for (const unit of units) {
    const resolved = unit.loadout
      ? resolveUnitLoadout(unit, loadoutProviders)
      : undefined;

    combatUnits.set(unit.id, {
      unit,
      faction: unit.faction,
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: 0,
      isDefeated: false,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      activeModifiers: [],
      abilities: resolved?.combatAbilities ?? [],
      passives: resolved?.activePassives ?? [],
      facing: unit.faction === 'PLAYER' ? HEX_DIRECTIONS.EAST : HEX_DIRECTIONS.WEST
    });
  }

  const state: CombatState = {
    arena,
    units: combatUnits,
    activeUnitId: '',
    turnNumber: 0,
    combatLog: [],
    outcome: 'IN_PROGRESS'
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
  const prevPos = state.arena.getUnitPosition(actorUnitId);
  const dist = prevPos ? hexDistance(prevPos, destination) : 1;
  cu.hexesMovedThisTurn = (cu.hexesMovedThisTurn ?? 0) + dist;
  if (prevPos) {
    cu.facing = getDirectionBetween(prevPos, destination);
  }

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
 * Evaluates whether a target is flanked by the actor.
 * Flanking is achieved if:
 * 1. The attacker is in the target's FLANK or REAR combat arc, OR
 * 2. An ally of the actor is also adjacent to the target (Allied Pincer).
 */
export function isFlankOrRear(
  state: CombatState,
  actorUnitId: string,
  targetUnitId: string
): boolean {
  const actorCu = state.units.get(actorUnitId);
  const targetCu = state.units.get(targetUnitId);
  const targetCoord = state.arena.getUnitPosition(targetUnitId);
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCu || !targetCu || !targetCoord || !actorCoord) return false;

  // 1. Check if attacker is in target's Flank or Rear combat arc
  const arc = getCombatArc(targetCu.facing, targetCoord, actorCoord);
  if (arc === 'FLANK' || arc === 'REAR') {
    return true;
  }

  // 2. Check if any other ally of actor is adjacent to target (Allied Pincer)
  const targetNeighbors = getHexNeighbors(targetCoord);
  const hasAlliedFlanker = targetNeighbors.some((coord) => {
    const occupantId = state.arena.getUnitAt(coord);
    if (!occupantId || occupantId === actorUnitId) return false;
    const cu = state.units.get(occupantId);
    return cu && !cu.isDefeated && cu.currentHp > 0 && cu.faction === actorCu.faction;
  });
  if (hasAlliedFlanker) return true;

  return false;
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

  // Turn actor to face target
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  const targetCoord = target?.coord ?? (target?.targetUnitId ? state.arena.getUnitPosition(target.targetUnitId) : undefined);
  if (actorCoord && targetCoord) {
    actorCu.facing = getDirectionBetween(actorCoord, targetCoord);
  }

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
    state.outcome = evaluateEncounterOutcome(state.objectives, state, 'player');

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

  // Tactical condition evaluation (e.g. Sneak Attack)
  let rollAdvantage: RollAdvantage = 'NORMAL';
  let bonusDamageProfile = undefined;

  if (ability.conditionalBonus?.condition === 'FLANK_OR_REAR') {
    const isFlanked = isFlankOrRear(state, actorUnitId, targetCu.unit.id);
    if (isFlanked) {
      if (ability.conditionalBonus.grantsAdvantage !== false) {
        rollAdvantage = 'ADVANTAGE';
      }
      bonusDamageProfile = ability.conditionalBonus.bonusDamage;
    }
  }

  // Evaluate passive roll modifiers (e.g. Momentum)
  const passiveRoll = evaluateRollPassives(actorCu);
  if (passiveRoll.grantsAdvantage) {
    rollAdvantage = 'ADVANTAGE';
  }

  const rollResult = resolveAttackRoll(actorCu, targetCu, ability, diceRoller, {
    advantage: rollAdvantage
  });

  const damageResult = resolveDamage(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    diceRoller,
    bonusDamageProfile
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

  // Secondary AoE Splash Resolution
  if (ability.aoeRadius && ability.aoeRadius > 0 && rollResult.hitOutcome !== 'MISS') {
    const targetCoord = target?.coord ?? state.arena.getUnitPosition(targetCu.unit.id);
    if (targetCoord) {
      const aoeHexes = getHexesInRange(targetCoord, ability.aoeRadius);
      for (const hex of aoeHexes) {
        if (hexEquals(hex, targetCoord)) continue;
        const secondaryUnitId = state.arena.getUnitAt(hex);
        if (secondaryUnitId && secondaryUnitId !== actorCu.unit.id) {
          const splashCu = state.units.get(secondaryUnitId);
          if (splashCu && !splashCu.isDefeated && splashCu.currentHp > 0) {
            const splashDmg = resolveDamage(
              'SOLID_HIT',
              ability,
              actorCu,
              splashCu,
              diceRoller
            );
            if (splashDmg.damageDealt > 0) {
              events.push({
                type: 'DAMAGE',
                targetUnitId: splashCu.unit.id,
                amount: splashDmg.damageDealt,
                damageType: ability.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
                reason: 'COLLATERAL',
                sourceUnitId: actorCu.unit.id,
                isCrit: false
              });
            }
          }
        }
      }
    }
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

  // Evaluate encounter outcome
  state.outcome = evaluateEncounterOutcome(state.objectives, state, 'player');

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


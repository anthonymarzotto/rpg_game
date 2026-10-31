import { Unit, Faction } from '../types/unit';
import {
  HexCoord,
  HexDirection,
  HEX_DIRECTIONS,
  getHexesInRange,
  hexEquals,
  hexDistance,
  getDirectionBetween,
  getHexLine
} from '../grid/hex';
import { Arena, calculateRawFallDamage } from '../grid/arena';
import { Ability, AbilityEffect, ConditionType } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  ActiveCondition,
  AbilityResolution,
  CombatEvent,
  EncounterObjective,
  HitOutcome,
  DiceRollBreakdown
} from './types';
import { canMove, canExecuteAbility } from './validator';
import { getEffectiveMove, getEffectiveSpeed, getEffectiveEvasion, getEffectiveResolve } from './effectiveVitals';
import { getEffectiveAbility } from './modifiers';
import { isFlankOrRear } from './flanking';
import { DiceRoller, SeededDiceRoller, RollAdvantage } from './dice';
import { ACTION_ECONOMY_CONFIG, COMBAT_RESOLUTION_CONFIG } from '../config/balance';
import { advanceTurnClock, predictTurnOrder } from './turnClock';
import { resolveAttackRoll, calculateElevationAttackModifier, getAttackRollModifier, AttackRollResult } from './attackRoll';
import { resolveDamage, resolveFallDamage, DamageResult } from './damageEngine';
import { executeAbilityEffects, defaultEffectRegistry, EffectContext } from './effects';
import { evaluateRollPassives, onTurnStartPassives } from './passives';
import { evaluateEncounterOutcome } from './objectives';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { PassiveTriggerHook } from '../types/passive';
import { evaluateTargetAuras } from './auras';
import { getConditionDefinition, evaluateFrontArcDetection } from './conditions';
import { applyConditionToUnit } from './effects/conditionHandler';

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

export interface PassiveTriggerContext {
  targetCu?: CombatUnit;
  targetCoord?: HexCoord;
  ability?: Ability;
  diceRoller?: DiceRoller;
  hitOutcome?: HitOutcome;
}

/**
 * Triggers passives registered to a specific hook lifecycle event.
 * Executes their effects generically via the effect registry without inspecting passive IDs.
 */
export function triggerPassiveHook(
  state: CombatState,
  actorCu: CombatUnit,
  hook: PassiveTriggerHook,
  extra?: PassiveTriggerContext
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const diceRoller = extra?.diceRoller ?? defaultDiceRoller;

  for (const passive of actorCu.passives ?? []) {
    if (passive.hook !== hook) continue;

    // Check trigger filters if present (e.g. magic spell crits)
    if (passive.triggerFilter) {
      if (passive.triggerFilter.damageType && extra?.ability?.damageType !== passive.triggerFilter.damageType) {
        continue;
      }
    }

    // Execute effect if defined
    if (passive.effect) {
      const handler = defaultEffectRegistry.get(passive.effect.type);
      if (handler) {
        let effectTargetCu = extra?.targetCu ?? actorCu;
        if (passive.effect.targetScope === 'SELF') {
          effectTargetCu = actorCu;
        }

        const ctx: EffectContext = {
          state,
          actorCu,
          targetCu: effectTargetCu,
          targetCoord: extra?.targetCoord,
          ability: extra?.ability ?? ({
            id: passive.id,
            name: passive.name,
            description: passive.description,
            archetypeTag: 'FIGHTER',
            apCost: 0,
            range: 0,
            targetType: 'SELF',
            defenseTarget: 'NONE',
            damageType: 'NONE'
          } as Ability),
          hitOutcome: extra?.hitOutcome ?? 'SOLID_HIT',
          diceRoller
        };

        const result = handler.apply(passive.effect, ctx);
        if (result.events && result.events.length > 0) {
          events.push(...result.events);
        }
        if (result.logDetail) {
          const detail = result.logDetail.trim();
          state.combatLog.push({
            turnNumber: state.turnNumber,
            actorUnitId: actorCu.unit.id,
            actionId: passive.id,
            message: `${actorCu.unit.name}'s ${passive.name} triggered: ${detail}`,
            metadata: {
              type: 'PASSIVE',
              actor: actorCu.unit.name,
              passiveName: passive.name,
              effectDetail: detail
            }
          });
        }
      }
    }
  }

  return events;
}

/**
 * Pre-encounter initialization pass evaluated across all units before the battle starts.
 * Triggers BATTLE_START passives generically (e.g. Tactical Vanguard).
 */
export function applyPreEncounterSetup(state: CombatState): void {
  for (const cu of state.units.values()) {
    if (cu.isDefeated) continue;
    const events = triggerPassiveHook(state, cu, 'BATTLE_START');
    if (events.length > 0) {
      applyCombatEvents(state, events);
    }
  }
}

/**
 * Applies an anti-alpha-strike guardrail ensuring that no single faction
 * takes more than Math.ceil(squadSize / 2) consecutive opening turns at encounter start.
 */
export function applyInitiativeGuardrail(state: CombatState, maxConsecutive?: number): void {
  const livingUnits = Array.from(state.units.values()).filter((cu) => !cu.isDefeated);
  const playerUnits = livingUnits.filter((cu) => cu.faction === 'PLAYER');
  const enemyUnits = livingUnits.filter((cu) => cu.faction === 'ENEMY');

  if (playerUnits.length === 0 || enemyUnits.length === 0) {
    return;
  }

  const squadSize = Math.max(playerUnits.length, enemyUnits.length);
  const limit = maxConsecutive ?? Math.ceil(squadSize / 2);

  const checkCount = limit + 1;
  const opening = predictTurnOrder(state, checkCount);
  if (opening.length < checkCount) {
    return;
  }

  const streakFaction = opening[0].faction;
  const isStreak = opening.slice(0, checkCount).every((entry) => entry.faction === streakFaction);

  if (isStreak) {
    const opposingFaction: Faction = streakFaction === 'PLAYER' ? 'ENEMY' : 'PLAYER';
    const streakingUnitId = opening[limit].unitId;
    const streakingCu = state.units.get(streakingUnitId);
    if (!streakingCu) return;

    const opposingCandidates = (opposingFaction === 'PLAYER' ? playerUnits : enemyUnits)
      .slice()
      .sort((a, b) => b.initiativeGauge - a.initiativeGauge);

    if (opposingCandidates.length > 0) {
      const bestOpposing = opposingCandidates[0];
      const speedOpp = getEffectiveSpeed(bestOpposing);
      const speedStreak = getEffectiveSpeed(streakingCu);

      const ticks = Math.max(
        1,
        Math.ceil((ACTION_ECONOMY_CONFIG.gaugeTurnThreshold - streakingCu.initiativeGauge) / speedStreak)
      );
      const streakFinalGauge = streakingCu.initiativeGauge + ticks * speedStreak;

      const neededGauge = Math.max(
        bestOpposing.initiativeGauge,
        streakFinalGauge + 1 - ticks * speedOpp
      );

      bestOpposing.initiativeGauge = neededGauge;
      bestOpposing.initialInitiativeRoll = neededGauge;
    }
  }
}

/**
 * Initializes a new combat state container with living units placed in the arena.
 */
export function createCombatState(
  arena: Arena,
  units: readonly Unit[],
  initialActiveUnitId?: string,
  loadoutProviders: LoadoutLookupProviders = defaultLoadoutProviders,
  objectives?: readonly EncounterObjective[],
  diceRoller: DiceRoller = defaultDiceRoller
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();
  const shouldRollInitiative = !initialActiveUnitId;

  for (const unit of units) {
    const resolved = unit.loadout
      ? resolveUnitLoadout(unit, loadoutProviders)
      : undefined;

    const initialRoll = shouldRollInitiative ? diceRoller.rollD20() : undefined;
    const initialGauge = initialRoll ?? 0;

    combatUnits.set(unit.id, {
      unit,
      faction: unit.faction,
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: initialGauge,
      initialInitiativeRoll: initialRoll,
      isDefeated: false,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      activeModifiers: [],
      activeConditions: [],
      abilityModifiers: unit.loadout?.abilityModifiers ? [...unit.loadout.abilityModifiers] : [],
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
    outcome: 'IN_PROGRESS',
    objectives,
    aiDecisionLog: [],
    partyXpPool: { fighter: 0, rogue: 0, mage: 0 }
  };

  // Pre-encounter setup pass: seed initial state (e.g. +25 initiative for Tactical Vanguard)
  applyPreEncounterSetup(state);

  // Apply anti-alpha-strike guardrail if rolling initiative naturally
  if (shouldRollInitiative) {
    applyInitiativeGuardrail(state);
  }

  if (shouldRollInitiative) {
    const rollDetails: Array<{ unitName: string; roll: number; isPlayer: boolean }> = [];
    for (const cu of combatUnits.values()) {
      if (cu.initialInitiativeRoll !== undefined) {
        rollDetails.push({
          unitName: cu.unit.name,
          roll: cu.initialInitiativeRoll,
          isPlayer: (cu.faction ?? cu.unit.faction ?? 'PLAYER') === 'PLAYER'
        });
      }
    }
    // Sort descending so highest initiative (acting first) is listed first
    rollDetails.sort((a, b) => b.roll - a.roll);

    if (rollDetails.length > 0) {
      const rollSummaries = rollDetails.map((r) => `${r.unitName} (${r.roll})`);
      state.combatLog.push({
        turnNumber: 0,
        actorUnitId: '',
        actionId: 'initiative',
        message: `Combat begins! Initiative rolled: ${rollSummaries.join(', ')}`,
        metadata: {
          type: 'INITIATIVE',
          rolls: rollDetails
        }
      });
    }
  }

  if (initialActiveUnitId && combatUnits.has(initialActiveUnitId)) {
    state.activeUnitId = initialActiveUnitId;
    state.turnNumber = 1;
    const activeCu = combatUnits.get(initialActiveUnitId)!;
    activeCu.initiativeGauge = ACTION_ECONOMY_CONFIG.gaugeTurnThreshold;
    activeCu.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
    onTurnStartPassives(activeCu);
  } else {
    advanceTurnClock(state);
  }

  state.outcome = evaluateEncounterOutcome(objectives, state);

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
  const effectiveMove = getEffectiveMove(cu);
  const pathInfo = prevPos ? state.arena.findPath(prevPos, destination, effectiveMove) : undefined;

  const fullPath = pathInfo && pathInfo.path.length > 0
    ? pathInfo.path
    : (prevPos ? [prevPos, destination] : [destination]);

  let currentCoord = prevPos ?? destination;
  let stepsTaken = 0;
  let accumulatedFallDamage = 0;
  let interrupted = false;

  for (let i = 1; i < fullPath.length; i++) {
    const prevStep = fullPath[i - 1];
    const nextStep = fullPath[i];
    cu.facing = getDirectionBetween(prevStep, nextStep);
    const dh = state.arena.getElevation(nextStep) - state.arena.getElevation(prevStep);
    accumulatedFallDamage += calculateRawFallDamage(dh);
    currentCoord = nextStep;
    stepsTaken++;

    const detected = evaluateFrontArcDetection(state, actorUnitId, currentCoord, cu.facing, 'MOVE');
    if (detected.length > 0) {
      interrupted = true;
      break;
    }
  }

  cu.hexesMovedThisTurn = (cu.hexesMovedThisTurn ?? 0) + stepsTaken;
  cu.currentAp -= 1;
  state.arena.setUnitPosition(actorUnitId, currentCoord);

  // If the path included a plunging ledge drop, apply direct unmitigated fall damage
  if (accumulatedFallDamage > 0) {
    const actualFallDamage = resolveFallDamage(cu, accumulatedFallDamage);
    if (actualFallDamage > 0) {
      const fallEvent: CombatEvent = {
        type: 'DAMAGE',
        targetUnitId: actorUnitId,
        amount: actualFallDamage,
        damageType: 'PHYSICAL',
        reason: 'FALL'
      };
      applyCombatEvents(state, [fallEvent]);

      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId,
        actionId: 'move',
        message: `💥 ${cu.unit.name} plunged from a ledge and suffered ${actualFallDamage} direct Fall Impact Damage! (HP: ${cu.currentHp}/${cu.unit.effectiveVitals.maxHp})`,
        metadata: {
          type: 'GENERIC',
          actor: cu.unit.name,
          text: `Plunged from ledge: ${actualFallDamage} Fall Impact Damage`
        }
      });
    } else {
      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId,
        actionId: 'move',
        message: `🐾 ${cu.unit.name} plunged from a ledge safely with Fall Damage Immunity!`,
        metadata: {
          type: 'GENERIC',
          actor: cu.unit.name,
          text: 'Plunged from ledge safely with Fall Damage Immunity'
        }
      });
    }
  }

  // Trigger ON_MOVE passives (e.g. Elusive Stride) generically
  const moveEvents = triggerPassiveHook(state, cu, 'ON_MOVE');
  if (moveEvents.length > 0) {
    applyCombatEvents(state, moveEvents);
  }

  if (interrupted) {
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: 'move_interrupted',
      message: `${cu.unit.name} moved to (${currentCoord.q}, ${currentCoord.r}) and was interrupted by spotting a hidden enemy! [Remaining AP: ${cu.currentAp}]`,
      metadata: {
        type: 'MOVE',
        actor: cu.unit.name,
        coord: { q: currentCoord.q, r: currentCoord.r },
        remainingAp: cu.currentAp
      }
    });
  } else {
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: 'move',
      message: `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${cu.currentAp}]`,
      metadata: {
        type: 'MOVE',
        actor: cu.unit.name,
        coord: { q: destination.q, r: destination.r },
        remainingAp: cu.currentAp
      }
    });
  }
}

/**
 * Sets the active unit's directional facing orientation (costs 0 AP).
 * Must be executed during the actor's active turn.
 */
export function executeSetFacing(
  state: CombatState,
  actorUnitId: string,
  facing: HexDirection
): void {
  if (state.activeUnitId !== actorUnitId) {
    throw new Error(
      `Cannot set facing for unit ${actorUnitId}: not active unit (active: ${state.activeUnitId})`
    );
  }
  if (facing < 0 || facing > 5 || !Number.isInteger(facing)) {
    throw new Error(`Invalid hex facing direction: ${facing}. Must be integer between 0 and 5.`);
  }

  const cu = requireCombatUnit(state, actorUnitId);
  cu.facing = facing;
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

        // Dispatch damage event to active conditions via onTakeDamage
        if (event.amount > 0 && cu.activeConditions && cu.activeConditions.length > 0) {
          cu.activeConditions = cu.activeConditions.filter((cond) => {
            const def = getConditionDefinition(cond.type);
            const reaction = def?.onTakeDamage?.(
              cond,
              cu,
              {
                damageAmount: event.amount,
                damageType: event.damageType,
                reason: event.reason,
                sourceUnitId: event.sourceUnitId
              },
              state
            );
            if (reaction?.removeCondition) {
              state.combatLog.push({
                turnNumber: state.turnNumber,
                actorUnitId: cu.unit.id,
                actionId: 'condition_removed',
                message: `${cu.unit.name}'s ${cond.type} was broken by taking damage!`,
                metadata: {
                  type: 'CONDITION_BROKEN',
                  actor: cu.unit.name,
                  condition: cond.type,
                  reason: 'taking damage',
                  text: `${cond.type} broken by damage`
                }
              });
              return false;
            }
            return true;
          });
        }

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
        if (event.modifier) {
          const existing = cu.activeModifiers.find(
            (m) => m.stat === event.modifier!.stat && m.value === event.modifier!.value
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.modifier.durationTurns);
          } else {
            cu.activeModifiers.push(event.modifier);
          }
        }
        if (event.condition) {
          const existing = cu.activeConditions.find(
            (c) => c === event.condition || (c.type === event.condition!.type && c.sourceUnitId === event.condition!.sourceUnitId)
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
          } else {
            cu.activeConditions.push(event.condition);
          }
        }
      }
    } else if (event.type === 'CONDITION_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        const existing = cu.activeConditions.find(
          (c) => c === event.condition || (c.type === event.condition.type && c.sourceUnitId === event.condition.sourceUnitId)
        );
        if (existing) {
          existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
        } else {
          cu.activeConditions.push(event.condition);
        }
      }
    }
  }
}

export { isFlankOrRear } from './flanking';

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
  const effectiveAbility = getEffectiveAbility(ability, actorCu.abilityModifiers);
  actorCu.currentAp -= effectiveAbility.apCost;

  // Deduct HP cost if specified (e.g. Blood Frenzy self-sacrifice); defeat unit if HP reaches 0
  if (effectiveAbility.hpCost && effectiveAbility.hpCost > 0) {
    actorCu.currentHp = Math.max(0, actorCu.currentHp - effectiveAbility.hpCost);
    if (actorCu.currentHp === 0) {
      actorCu.isDefeated = true;
      state.arena.removeUnit(actorUnitId);
    }
  }

  // Track oncePerTurn
  if (effectiveAbility.oncePerTurn) {
    (actorCu.abilitiesUsedThisTurn ??= []).push(effectiveAbility.id);
  }

  // Consume ephemeral modifiers that applied to this ability
  if (effectiveAbility.appliedModifierIds.length > 0) {
    actorCu.abilityModifiers = (actorCu.abilityModifiers ?? []).filter(
      (m) => !(m.consumesOnUse && effectiveAbility.appliedModifierIds.includes(m.id))
    );
  }

  // Turn actor to face target
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  const targetCoord = target?.coord ?? (target?.targetUnitId ? state.arena.getUnitPosition(target.targetUnitId) : undefined);
  if (actorCoord && targetCoord && !hexEquals(actorCoord, targetCoord)) {
    actorCu.facing = getDirectionBetween(actorCoord, targetCoord);
  }

  // Award In-Battle Archetype XP to shared party pool on player ability execution
  const isPlayer = (actorCu.unit.faction ?? actorCu.faction ?? 'PLAYER') === 'PLAYER';
  if (isPlayer) {
    const xpEarned = Math.max(1, effectiveAbility.apCost ?? 1);
    if (effectiveAbility.archetypeTag === 'FIGHTER') {
      state.partyXpPool = {
        ...state.partyXpPool,
        fighter: state.partyXpPool.fighter + xpEarned
      };
      actorCu.inBattleXp.fighter += xpEarned;
    } else if (effectiveAbility.archetypeTag === 'ROGUE') {
      state.partyXpPool = {
        ...state.partyXpPool,
        rogue: state.partyXpPool.rogue + xpEarned
      };
      actorCu.inBattleXp.rogue += xpEarned;
    } else if (effectiveAbility.archetypeTag === 'MAGE') {
      state.partyXpPool = {
        ...state.partyXpPool,
        mage: state.partyXpPool.mage + xpEarned
      };
      actorCu.inBattleXp.mage += xpEarned;
    }
  }

  // 1. Support / Buff abilities (DamageType === 'NONE' and uncontested/no defense target)
  if (effectiveAbility.damageType === 'NONE' && (effectiveAbility.defenseTarget === 'NONE' || !effectiveAbility.defenseTarget)) {
    // AoE aura / blast resolution (friendly buffs or hostile utility/displacement)
    if (effectiveAbility.aoeRadius && effectiveAbility.aoeRadius > 0) {
      const centerCoord =
        target?.coord ??
        (target?.targetUnitId
          ? state.arena.getUnitPosition(target.targetUnitId)
          : actorCoord);

      const affectedHexes = centerCoord
        ? getHexesInRange(centerCoord, effectiveAbility.aoeRadius)
        : [];

      // Determine target alignment based on targetType and targeted unit
      const primaryTargetId = target?.targetUnitId;
      const primaryTargetCu = primaryTargetId ? state.units.get(primaryTargetId) : undefined;
      const isFriendlyTargeting =
        effectiveAbility.targetType === 'SELF' ||
        effectiveAbility.targetType === 'ALLY' ||
        (primaryTargetCu ? primaryTargetCu.faction === actorCu.faction : false);

      const targetCus: CombatUnit[] = [];

      // If friendly AoE aura centered on self (e.g. Lead the Charge), include actor
      if (effectiveAbility.targetType === 'SELF' && actorCoord) {
        targetCus.push(actorCu);
      }

      for (const hex of affectedHexes) {
        const unitIdAtHex = state.arena.getUnitAt(hex);
        if (unitIdAtHex && (unitIdAtHex !== actorUnitId || isFriendlyTargeting)) {
          const cu = state.units.get(unitIdAtHex);
          if (cu && !cu.isDefeated) {
            const matchesAlignment = isFriendlyTargeting
              ? (!actorCu.faction || !cu.faction || actorCu.faction === cu.faction)
              : (!actorCu.faction || !cu.faction || actorCu.faction !== cu.faction);

            if (matchesAlignment && !targetCus.some((t) => t.unit.id === cu.unit.id)) {
              targetCus.push(cu);
            }
          }
        }
      }

      const allEvents: CombatEvent[] = [];
      let combinedLog = '';
      for (const tCu of targetCus) {
        const effResult = executeAbilityEffects(effectiveAbility, {
          state,
          actorCu,
          targetCu: tCu,
          targetCoord: centerCoord,
          ability: effectiveAbility,
          hitOutcome: 'SOLID_HIT',
          diceRoller
        });
        allEvents.push(...effResult.events);
        if (effResult.logDetail && !combinedLog.includes(effResult.logDetail)) {
          combinedLog += effResult.logDetail;
        }
      }

      applyCombatEvents(state, allEvents);
      state.outcome = evaluateEncounterOutcome(state.objectives, state);

      const externalTargets = targetCus.filter((c) => c.unit.id !== actorCu.unit.id);
      const targetClause =
        externalTargets.length > 0
          ? ` on ${externalTargets.map((c) => c.unit.name).join(', ')}`
          : '';
      const targetMetadata =
        externalTargets.length > 0
          ? externalTargets.map((c) => c.unit.name).join(', ')
          : undefined;

      const aoeDamageEvents = allEvents.filter(
        (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE'
      );
      const totalAoeDamage = aoeDamageEvents.reduce((acc, d) => acc + d.amount, 0);
      const isAoeHostile = !isFriendlyTargeting || totalAoeDamage > 0;

      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId,
        actionId: effectiveAbility.id,
        message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${combinedLog}`,
        metadata: isAoeHostile
          ? {
              type: 'UTILITY',
              actor: actorCu.unit.name,
              ability: effectiveAbility.name,
              target: targetMetadata,
              effectDetail: totalAoeDamage === 0 ? combinedLog.trim() || undefined : undefined,
              damageTotal: totalAoeDamage > 0 ? String(totalAoeDamage) : undefined,
              secondaryDetail: combinedLog.trim() || undefined
            }
          : {
              type: 'BUFF',
              actor: actorCu.unit.name,
              ability: effectiveAbility.name,
              target: targetMetadata,
              effectDetail: combinedLog.trim()
            }
      });

      return {
        type: 'SUPPORT',
        targetUnitIds: targetCus.map((c) => c.unit.id),
        events: allEvents
      };
    }

    // Single-target Buff / Support
    const targetId = target?.targetUnitId ?? actorUnitId;
    const targetCu = requireCombatUnit(state, targetId);

    const effectResult = executeAbilityEffects(effectiveAbility, {
      state,
      actorCu,
      targetCu,
      targetCoord: target?.coord,
      ability: effectiveAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller
    });

    applyCombatEvents(state, effectResult.events);
    state.outcome = evaluateEncounterOutcome(state.objectives, state);

    const statusEvent = effectResult.events.find(
      (e): e is Extract<CombatEvent, { type: 'STATUS_APPLIED' }> => e.type === 'STATUS_APPLIED'
    );
    const appliedModifier = statusEvent?.modifier ?? {
      stat: 'armor',
      value: 0,
      durationTurns: 0
    };

    const isSelfTarget = targetCu.unit.id === actorCu.unit.id;
    const isFriendlyTargeting =
      effectiveAbility.targetType === 'SELF' ||
      effectiveAbility.targetType === 'ALLY' ||
      (isSelfTarget ? true : (actorCu.faction && targetCu.faction ? actorCu.faction === targetCu.faction : false));

    const damageEvents = effectResult.events.filter(
      (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE'
    );
    const totalDamage = damageEvents.reduce((acc, d) => acc + d.amount, 0);
    const isHostile = !isFriendlyTargeting || totalDamage > 0;
    const collisionDetail = effectResult.logDetail?.trim() || undefined;

    const targetClause = isSelfTarget ? '' : ` on ${targetCu.unit.name}`;
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: effectiveAbility.id,
      message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${effectResult.logDetail ?? ''}`,
      metadata: isHostile
        ? {
            type: 'UTILITY',
            actor: actorCu.unit.name,
            ability: effectiveAbility.name,
            target: isSelfTarget ? undefined : targetCu.unit.name,
            effectDetail: totalDamage === 0 ? collisionDetail : undefined,
            damageTotal: totalDamage > 0 ? String(totalDamage) : undefined,
            targetHp: totalDamage > 0 ? targetCu.currentHp : undefined,
            targetMaxHp: totalDamage > 0 ? targetCu.unit.effectiveVitals.maxHp : undefined,
            secondaryDetail: collisionDetail
          }
        : {
            type: 'BUFF',
            actor: actorCu.unit.name,
            ability: effectiveAbility.name,
            target: isSelfTarget ? undefined : targetCu.unit.name,
            effectDetail: effectResult.logDetail?.trim() ?? ''
          }
    });

    return {
      type: 'BUFF',
      targetUnitId: targetId,
      modifierApplied: appliedModifier,
      events: effectResult.events
    };
  }

  // 2. Damaging Attack Resolution
  const targetUnitId = effectiveAbility.targetType === 'HEX'
    ? (targetCoord ? state.arena.getUnitAt(targetCoord) : undefined)
    : target?.targetUnitId;
  const targetCu = targetUnitId ? state.units.get(targetUnitId) : undefined;
  if (!targetCu && effectiveAbility.targetType !== 'HEX') {
    throw new Error(`Target combat unit ${target?.targetUnitId} not found in state.`);
  }

  const events: CombatEvent[] = [];
  let attackOriginCoord = actorCoord;

  // RUSH_CHARGE straight-line dash into contact
  const rushEffect = effectiveAbility.effects?.find((e) => e.type === 'RUSH_CHARGE');
  if (rushEffect && targetCu) {
    const actorPos = state.arena.getUnitPosition(actorUnitId);
    const targetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (actorPos && targetPos) {
      const line = getHexLine(actorPos, targetPos);
      if (line.length >= 3) {
        const destHex = line[line.length - 2];
        state.arena.setUnitPosition(actorUnitId, destHex);
        attackOriginCoord = destHex;
        const chargeDist = hexDistance(actorPos, destHex);
        actorCu.hexesMovedThisTurn = (actorCu.hexesMovedThisTurn ?? 0) + chargeDist;
        actorCu.facing = getDirectionBetween(destHex, targetPos);
        events.push({
          type: 'DISPLACEMENT',
          unitId: actorUnitId,
          fromCoord: actorPos,
          toCoord: destHex,
          kind: 'CHARGE'
        });
      }
    }
  }

  // Tactical condition evaluation (e.g. Sneak Attack)
  let rollAdvantage: RollAdvantage = 'NORMAL';
  let bonusDamageProfile = undefined;

  const flankEffect = effectiveAbility.effects?.find((e) => e.condition === 'FLANK_OR_REAR');
  if (flankEffect && targetCu) {
    const isFlanked = isFlankOrRear(state, actorUnitId, targetCu.unit.id);
    if (isFlanked) {
      if (Boolean(flankEffect.grantsAdvantage)) {
        rollAdvantage = 'ADVANTAGE';
      }
      bonusDamageProfile = flankEffect.bonusDamage;
    }
  }

  const challengedEffect = effectiveAbility.effects?.find((e) => e.condition === 'TARGET_CHALLENGED');
  if (challengedEffect && targetCu) {
    const isTargetChallenged = targetCu.activeConditions?.some((c) => c.type === 'CHALLENGED');
    if (isTargetChallenged) {
      if (Boolean(challengedEffect.grantsAdvantage)) {
        rollAdvantage = 'ADVANTAGE';
      }
      bonusDamageProfile = challengedEffect.bonusDamage;
    }
  }

  // Evaluate passive roll modifiers (e.g. Momentum)
  const passiveRoll = evaluateRollPassives(actorCu);
  if (passiveRoll.grantsAdvantage) {
    rollAdvantage = 'ADVANTAGE';
  }

  // Evaluate target-centric protective auras (e.g. Misfortune Ward)
  const auraEval = targetCu
    ? evaluateTargetAuras(targetCu, actorCu, state)
    : { attackRollPenalty: 0, sourceAuraNames: [] };

  // Evaluate elevation difference between attack origin and target position
  const targetPos = targetCu
    ? state.arena.getUnitPosition(targetCu.unit.id)
    : targetCoord;
  const actorElevation = attackOriginCoord ? state.arena.getElevation(attackOriginCoord) : 0;
  const targetElevation = targetPos ? state.arena.getElevation(targetPos) : 0;
  const elevationDelta = actorElevation - targetElevation;
  const elevMod = calculateElevationAttackModifier(
    actorCu,
    elevationDelta,
    effectiveAbility
  );

  let rollResult: AttackRollResult;
  if (targetCu) {
    rollResult = resolveAttackRoll(actorCu, targetCu, effectiveAbility, diceRoller, {
      advantage: rollAdvantage,
      rollPenalty: auraEval.attackRollPenalty,
      elevationDelta
    });

    // Single-attack consumption of EXPOSED: condition is consumed upon being attacked
    if (targetCu.activeConditions?.some((c) => c.type === 'EXPOSED')) {
      targetCu.activeConditions = targetCu.activeConditions.filter((c) => c.type !== 'EXPOSED');
      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId: targetCu.unit.id,
        actionId: 'condition_removed',
        message: `${targetCu.unit.name}'s EXPOSED condition was consumed!`,
        metadata: {
          type: 'GENERIC',
          actor: targetCu.unit.name,
          text: 'EXPOSED consumed'
        }
      });
    }
  } else {
    // Ground targeting on an unoccupied hex: roll unified spellcast attack roll
    const baseMod = getAttackRollModifier(actorCu, effectiveAbility);
    const totalBonus = elevMod.rollBonus;
    const totalPenalty = elevMod.rollPenalty + auraEval.attackRollPenalty;
    const netModifier = baseMod + totalBonus - totalPenalty;
    let groundAdv: RollAdvantage = rollAdvantage;
    if (elevMod.grantsAdvantage) groundAdv = 'ADVANTAGE';
    if (elevMod.grantsDisadvantage) groundAdv = groundAdv === 'ADVANTAGE' ? 'NORMAL' : 'DISADVANTAGE';
    let d20: number;
    let rawD20Rolls: number[];
    if (diceRoller.rollD20Detailed) {
      const detailed = diceRoller.rollD20Detailed(groundAdv);
      d20 = detailed.kept;
      rawD20Rolls = [...detailed.rolls];
    } else {
      d20 = diceRoller.rollD20(groundAdv);
      rawD20Rolls = [d20];
    }
    const totalScore = d20 + netModifier;
    const isCritBoosted = effectiveAbility.effects?.some((e) => e.type === 'CRIT_BOOST');
    const naturalCritThreshold = isCritBoosted ? 19 : 20;
    const hitOutcome: HitOutcome = d20 >= naturalCritThreshold ? 'CRITICAL_HIT' : 'SOLID_HIT';
    rollResult = {
      hitOutcome,
      d20,
      modifier: netModifier,
      totalScore,
      targetDefense: 0,
      rawD20Rolls,
      advantage: groundAdv,
      defenseType: 'Evasion'
    };
  }

  // Primary Damage Event on center target (if targetCu exists)
  let damageResult: DamageResult = {
    rawDamage: 0,
    mitigation: 0,
    damageDealt: 0,
    damageBreakdown: '',
    damageDice: [],
    damageModifier: 0
  };

  if (targetCu) {
    damageResult = resolveDamage(
      rollResult.hitOutcome,
      effectiveAbility,
      actorCu,
      targetCu,
      diceRoller,
      bonusDamageProfile
    );

    if (damageResult.damageDealt > 0) {
      events.push({
        type: 'DAMAGE',
        targetUnitId: targetCu.unit.id,
        amount: damageResult.damageDealt,
        damageType: effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
        reason: 'ATTACK',
        sourceUnitId: actorCu.unit.id,
        isCrit: rollResult.hitOutcome === 'CRITICAL_HIT'
      });
    }
  }

  // Secondary AoE Splash Resolution
  const splashLogDetails: string[] = [];
  const splashLabel = effectiveAbility.splashLabel ?? 'SPLASH';
  if (effectiveAbility.aoeRadius && effectiveAbility.aoeRadius > 0 && targetCoord) {
    const aoeHexes = getHexesInRange(targetCoord, effectiveAbility.aoeRadius);
    for (const hex of aoeHexes) {
      if (targetCu && hexEquals(hex, targetCoord)) continue;
      const secondaryUnitId = state.arena.getUnitAt(hex);
      if (secondaryUnitId && secondaryUnitId !== actorCu.unit.id) {
        const splashCu = state.units.get(secondaryUnitId);
        if (splashCu && !splashCu.isDefeated && splashCu.currentHp > 0) {
          // Secondary unit contests the spellcast attack roll against their defense
          const splashDefense =
            effectiveAbility.defenseTarget === 'EVASION'
              ? getEffectiveEvasion(splashCu)
              : getEffectiveResolve(splashCu);

          let splashOutcome: HitOutcome = 'MISS';
          if (rollResult.totalScore >= splashDefense) {
            splashOutcome = 'SOLID_HIT';
          } else if (rollResult.totalScore >= splashDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
            splashOutcome = 'GRAZE';
          }

          if (splashOutcome !== 'MISS') {
            const primaryDamageEffect = effectiveAbility.effects?.find((e) => e.type === 'DAMAGE');
            const defaultSplashProfile = primaryDamageEffect?.damageProfile
              ? { count: primaryDamageEffect.damageProfile.count, sides: primaryDamageEffect.damageProfile.sides }
              : undefined;
            const splashProfile = effectiveAbility.splashDamageProfile ?? defaultSplashProfile;
            const splashEffect: AbilityEffect = {
              type: 'DAMAGE',
              damageProfile: splashProfile
            };
            const splashDmg = resolveDamage(
              splashOutcome,
              effectiveAbility,
              actorCu,
              splashCu,
              diceRoller,
              undefined,
              splashEffect
            );
            if (splashDmg.damageDealt > 0) {
              const damageType = effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL';
              events.push({
                type: 'DAMAGE',
                targetUnitId: splashCu.unit.id,
                amount: splashDmg.damageDealt,
                damageType,
                reason: 'SPLASH',
                label: splashLabel,
                sourceUnitId: actorCu.unit.id,
                isCrit: false
              });
              const remainingHp = Math.max(0, splashCu.currentHp - splashDmg.damageDealt);
              splashLogDetails.push(
                `${splashCu.unit.name} for ${splashDmg.damageDealt} ${damageType.toLowerCase()} damage [${splashOutcome === 'GRAZE' ? 'Graze ' : ''}vs DC ${splashDefense}] (HP: ${remainingHp}/${splashCu.unit.effectiveVitals.maxHp})`
              );
            }
          } else {
            splashLogDetails.push(`${splashCu.unit.name} resisted [Miss vs DC ${splashDefense}]`);
            events.push({
              type: 'MISS',
              targetUnitId: splashCu.unit.id,
              reason: 'SPLASH'
            });
          }
        }
      }
    }
  }

  // Dispatch secondary effects via pluggable registry (excluding primary DAMAGE which was resolved above)
  const effectResult = executeAbilityEffects(
    effectiveAbility,
    {
      state,
      actorCu,
      targetCu,
      targetCoord,
      ability: effectiveAbility,
      hitOutcome: rollResult.hitOutcome,
      diceRoller
    },
    defaultEffectRegistry,
    (e) => e.type !== 'DAMAGE'
  );

  events.push(...effectResult.events);

  // Trigger ON_HIT passives (e.g. Soul Carapace) on successful hits
  if (targetCu && rollResult.hitOutcome !== 'MISS') {
    const hitEvents = triggerPassiveHook(state, actorCu, 'ON_HIT', {
      targetCu,
      ability: effectiveAbility,
      diceRoller,
      hitOutcome: rollResult.hitOutcome
    });
    events.push(...hitEvents);
  }

  // Trigger ON_CRIT passives (e.g. Wild Surge) on critical hits
  if (targetCu && rollResult.hitOutcome === 'CRITICAL_HIT') {
    const critEvents = triggerPassiveHook(state, actorCu, 'ON_CRIT', {
      targetCu,
      ability: effectiveAbility,
      diceRoller,
      hitOutcome: rollResult.hitOutcome
    });
    events.push(...critEvents);
  }

  // Apply all events to state
  applyCombatEvents(state, events);

  // When a unit is hit with an attack, their facing direction updates to face the attack (or away if FORCE_FACING_AWAY)
  if (targetCu && rollResult.hitOutcome !== 'MISS' && !targetCu.isDefeated) {
    const finalTargetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (finalTargetPos && attackOriginCoord && !hexEquals(finalTargetPos, attackOriginCoord)) {
      const dirToOrigin = getDirectionBetween(finalTargetPos, attackOriginCoord);
      const forcesFacingAway = effectiveAbility.effects?.some((e) => e.type === 'FORCE_FACING_AWAY');
      targetCu.facing = forcesFacingAway
        ? (((dirToOrigin + 3) % 6) as any)
        : dirToOrigin;
    }
  }

  // Also turn any living secondary splash damage targets to face the attack origin
  for (const event of events) {
    if (event.type === 'DAMAGE' && (!targetCu || event.targetUnitId !== targetCu.unit.id)) {
      const secondaryCu = state.units.get(event.targetUnitId);
      if (secondaryCu && !secondaryCu.isDefeated) {
        const secPos = state.arena.getUnitPosition(secondaryCu.unit.id);
        if (secPos && attackOriginCoord && !hexEquals(secPos, attackOriginCoord)) {
          secondaryCu.facing = getDirectionBetween(secPos, attackOriginCoord);
        }
      }
    }
  }

  // Collect all unit IDs targeted or struck during this attack
  const targetedUnitIds: string[] = [];
  if (targetCu) {
    targetedUnitIds.push(targetCu.unit.id);
  }
  for (const event of events) {
    if (event.type === 'DAMAGE' && !targetedUnitIds.includes(event.targetUnitId)) {
      targetedUnitIds.push(event.targetUnitId);
    }
  }

  // Delegate post-action condition updates (e.g. attacking from stealth breaks stealth, defying challenge inflicts exposed)
  const conditionsToRemove = new Set<ActiveCondition>();
  const conditionsToApply: {
    targetUnitId: string;
    conditionType: ConditionType;
    durationTurns: number;
    sourceUnitId?: string;
  }[] = [];

  for (const c of actorCu.activeConditions) {
    const def = getConditionDefinition(c.type);
    if (def?.onAfterAction) {
      const outcome = def.onAfterAction(c, actorCu, {
        type: 'ATTACK',
        ability,
        target: targetCu,
        targetedUnitIds
      });
      if (outcome?.applyConditions) {
        conditionsToApply.push(...outcome.applyConditions);
      }
      if (outcome?.removeCondition) {
        conditionsToRemove.add(c);
      }
    }
  }

  if (conditionsToRemove.size > 0) {
    actorCu.activeConditions = actorCu.activeConditions.filter((c) => !conditionsToRemove.has(c));
  }

  // Evaluate encounter outcome
  state.outcome = evaluateEncounterOutcome(state.objectives, state);

  // Combat Log
  const splashDetail = splashLogDetails.length > 0
    ? ` 💥 [${splashLabel.charAt(0).toUpperCase() + splashLabel.slice(1).toLowerCase()} hit ${splashLogDetails.join(', ')}]`
    : '';
  const secondaryDetail = [effectResult.logDetail ?? '', splashDetail].filter(Boolean).join('');
  const auraDetail = auraEval.attackRollPenalty > 0 ? ` [Aura Penalty: -${auraEval.attackRollPenalty} (${auraEval.sourceAuraNames.join(', ')})]` : '';
  const elevDetail = elevMod.description ? ` [Elevation: ${elevMod.description}]` : '';
  const damageDetail = targetCu && effectiveAbility.damageType !== 'NONE' ? ` [Damage: ${damageResult.damageBreakdown}]` : '';

  const targetDesc = targetCu ? targetCu.unit.name : `hex (${targetCoord?.q ?? 0}, ${targetCoord?.r ?? 0})`;
  const dcClause = targetCu ? ` vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}` : ` -> score ${rollResult.totalScore}`;
  const hpClause = targetCu ? ` (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})` : '';

  const totalDamageEvents = events.filter((e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE');
  const totalDamageDealt = totalDamageEvents.reduce((acc, d) => acc + d.amount, 0);

  const d20ModFormatted = rollResult.modifier >= 0
    ? `+ ${rollResult.modifier}`
    : `- ${Math.abs(rollResult.modifier)}`;
  const d20Formatted = `${rollResult.d20} ${d20ModFormatted}`;

  const logMessage = targetCu
    ? `${actorCu.unit.name} used ${ability.name} on ${targetDesc}: [d20: ${d20Formatted}${dcClause}]${elevDetail}${auraDetail}${damageDetail}${hpClause}${secondaryDetail}`
    : `${actorCu.unit.name} cast ${ability.name} at ${targetDesc}: [Spellcast roll: ${d20Formatted}${dcClause}]${elevDetail}${auraDetail}${secondaryDetail}`;

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: ability.id,
    message: logMessage,
    metadata: {
      type: 'ATTACK',
      actor: actorCu.unit.name,
      ability: ability.name,
      target: targetCu ? targetCu.unit.name : targetDesc,
      d20: d20Formatted,
      defenseTarget: targetCu ? rollResult.targetDefense : undefined,
      totalScore: rollResult.totalScore,
      isAreaTarget: !targetCu,
      hitOutcome: targetCu ? rollResult.hitOutcome : (totalDamageDealt > 0 ? 'SOLID_HIT' : 'MISS'),
      damageTotal: String(totalDamageDealt),
      damageBreakdown: targetCu ? (damageResult.damageBreakdown || undefined) : undefined,
      targetHp: targetCu?.currentHp,
      targetMaxHp: targetCu?.unit.effectiveVitals.maxHp,
      secondaryDetail: [elevDetail, auraDetail, secondaryDetail].filter(Boolean).join('').trim()
    }
  });

  // Post-action condition triggers (logged after attack so cause precedes effect)
  for (const toApply of conditionsToApply) {
    const unitToApply = state.units.get(toApply.targetUnitId);
    if (unitToApply && !unitToApply.isDefeated) {
      const { event } = applyConditionToUnit(
        unitToApply,
        toApply.conditionType,
        toApply.durationTurns,
        toApply.sourceUnitId ?? actorCu.unit.id
      );
      events.push(event);
      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId: unitToApply.unit.id,
        actionId: 'condition_applied',
        message: `${unitToApply.unit.name} defied the challenge and became EXPOSED!`,
        metadata: {
          type: 'CONDITION_BROKEN',
          actor: unitToApply.unit.name,
          condition: 'CHALLENGED',
          reason: 'defied',
          text: `${unitToApply.unit.name} defied the challenge and became EXPOSED!`
        }
      });
    }
  }

  const finalHitOutcome = targetCu ? rollResult.hitOutcome : (totalDamageDealt > 0 ? 'SOLID_HIT' : 'MISS');
  const diceBreakdown: DiceRollBreakdown = {
    d20Rolls: rollResult.rawD20Rolls ?? [rollResult.d20],
    keptD20: rollResult.d20,
    advantage: rollResult.advantage ?? 'NORMAL',
    netModifier: rollResult.modifier,
    totalScore: rollResult.totalScore,
    targetDefense: rollResult.targetDefense,
    defenseType: rollResult.defenseType ?? (effectiveAbility.defenseTarget === 'RESOLVE' ? 'Resolve' : 'Evasion'),
    hitOutcome: finalHitOutcome,
    damageDice: damageResult.damageDice ?? [],
    damageModifier: damageResult.damageModifier ?? 0,
    totalDamage: totalDamageDealt
  };

  return {
    type: 'ATTACK',
    details: {
      hitOutcome: finalHitOutcome,
      d20Roll: rollResult.d20,
      modifier: rollResult.modifier,
      totalAttackScore: rollResult.totalScore,
      defenseTargetScore: rollResult.targetDefense,
      rawDamage: damageResult.rawDamage,
      mitigation: damageResult.mitigation,
      damageDealt: totalDamageDealt,
      damageBreakdown: damageResult.damageBreakdown,
      effectsApplied: effectiveAbility.effects,
      knockbackResult: effectResult.knockbackResult,
      wallSlamDamage: effectResult.wallSlamDamage,
      fallDamage: effectResult.fallDamage,
      events,
      diceBreakdown
    }
  };
}

